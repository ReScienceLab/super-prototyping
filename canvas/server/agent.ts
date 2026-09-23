/**
 * The agent behind the chat panel, mounted once at the server's root under `/__sp/agent` by
 * projects.ts, rather than once per project. A conversation is the app's and not a project's: it
 * can start on the home page with no project open, and one message may be about the project in
 * front and the next about another. So the agent does not run in a project. Each conversation is
 * a session with a folder of its own under `<projects dir>/.workspaces`, which is the agent's
 * working directory on every turn, and a record beside it that says how to resume it. Each
 * message names the project it was sent from, which the agent is given as a folder it may write.
 * docs/2026-09-22-agent-workspace.md has why.
 */
import { execFile, spawn, type ChildProcess } from "node:child_process";
import { randomUUID } from "node:crypto";
import fs from "node:fs";
import type { IncomingMessage, ServerResponse } from "node:http";
import os from "node:os";
import path from "node:path";
import { CANVASES } from "./boards.ts";
import { command, stop } from "./command.ts";
import { AGENT_SKILLS, installSkills } from "./skills.ts";
import { folderOf, sameOrigin } from "./sp.ts";
import { SAFE_NAME } from "../src/boardStatusEdit.ts";
import {
  attach,
  emit,
  ended,
  newRun,
  sseFrame,
  type Run,
  type Session,
} from "../src/agentRun.ts";
import {
  AGENTS,
  IMAGE_TYPES,
  MAX_IMAGE_BYTES,
  MAX_IMAGES,
  type AgentDef,
  type AgentImage,
  type AgentModel,
} from "../src/agents.ts";
import { titleFilter, type ChatEvent } from "../src/claudeStream.ts";

export function createAgentServer(options: {
  /** Canvases shown beside every project's own and never written to: the examples the plugin ships. */
  examplesDir: string;
  /** Every project by the name its address carries, `/p/<name>/`. */
  projects: () => Map<string, string>;
  /** This plugin's checkout, whose skills the sessions are given. */
  repoRoot: string;
  /** `<projects dir>/.workspaces`: a folder per session, a record beside each, and the skills. */
  workspaces: string;
}) {
  const { examplesDir, projects, repoRoot, workspaces } = options;
  // One process per message — Claude Code or Codex, by the panel's choice, looked up in
  // agents.ts — its output kept here and streamed to the page. The runs are held in memory, the
  // newest twenty, for the panel to follow and for the history to say which session is running,
  // and each is written to disk as it goes (`say`, below) for History after a restart.
  //
  // Two steps rather than one streaming response: the agent's work is a board written to
  // disk, and the project's watcher (sp.ts) answers that with a full reload, so a stream bound
  // to the fetch that started the run would die exactly when the run succeeds. The page comes
  // back with the run's id and reads its events from wherever it left off (agentRun.ts).
  const runs = new Map<
    string,
    Run & {
      child: ChildProcess;
      /** The Stop button was pressed. Windows ends a run by exit code 1, which says nothing. */
      stopped: boolean;
    }
  >();

  // Each session's record, read once and then kept, so a run still closing and the next turn
  // started under it change the same record rather than two copies of it. Written whole to a
  // temporary file and renamed into place, so the history never reads half of one.
  const sessions = new Map<string, Session>();
  const recordOf = (id: string) => path.join(workspaces, `${id}.json`);
  const load = (id: string) => {
    let session = sessions.get(id);
    if (!session) {
      session = JSON.parse(fs.readFileSync(recordOf(id), "utf8")) as Session;
      sessions.set(id, session);
    }
    return session;
  };
  const save = (session: Session) => {
    const file = recordOf(session.id);
    fs.writeFileSync(`${file}.tmp`, JSON.stringify(session, null, 2) + "\n");
    fs.renameSync(`${file}.tmp`, file);
  };
  // Every run is also kept on disk as it goes, in `.runs/<run id>/`: its events one JSON line
  // each, appended as they are emitted, and the pictures beside them, `image-<n>.<ext>` for what
  // was attached and `shot-<k>.<ext>` for what its tools drew. That is what History replays once
  // memory no longer has the run: after a restart, which every update is, or after the twenty
  // above have moved on. The panel's own copy, not the agent's transcript: Claude Code's and
  // Codex's files are theirs, change shape between releases, and hold no attachments by number.
  const keptOf = (id: string) => path.join(workspaces, ".runs", id);
  const say = (run: Run, event: string, data: unknown) =>
    fs.appendFileSync(
      path.join(keptOf(run.id), "events.jsonl"),
      JSON.stringify(emit(run, event, data)) + "\n",
    );
  const picture = (id: string, name: string, type: string, data: Buffer) => {
    const file = path.join(keptOf(id), `${name}.${type.slice(6)}`);
    fs.writeFileSync(file, data);
    return file;
  };
  const kept = (id: string) => {
    const dir = keptOf(id);
    if (!fs.existsSync(dir)) return undefined;
    const run = newRun(id);
    run.events = fs
      .readFileSync(path.join(dir, "events.jsonl"), "utf8")
      .split("\n")
      .filter(Boolean)
      .map((line) => JSON.parse(line));
    // The server went down mid-run and took the agent with it.
    if (!ended(run))
      emit(run, "end", {
        kind: "end",
        ok: false,
        message: "The app quit before this turn finished.",
      });
    return run;
  };

  // Which agents are installed: `bin --version` once each, for the server's lifetime, so
  // the menu greys out one that is missing and says what to do, rather than letting the
  // first message find out.
  const probes = new Map<string, Promise<boolean>>();
  const installed = (def: AgentDef) => {
    let probe = probes.get(def.id);
    if (!probe) {
      const c = command(def.bin, ["--version"]);
      probe = new Promise((done) =>
        // From the temp dir: a CLI that reads project config from its cwd on `--version`
        // would otherwise fail the probe over the project's settings, not its absence.
        execFile(
          c.file,
          c.args,
          { ...c.options, timeout: 10_000, cwd: os.tmpdir() },
          (error) => done(!error),
        ),
      );
      probes.set(def.id, probe);
      // A no is not worth keeping: the CLI may be installed a minute later, and a probe that
      // timed out on a busy machine would otherwise grey the agent out until a restart.
      void probe.then((ok) => ok || probes.delete(def.id));
    }
    return probe;
  };
  // The models an agent offers the composer: its own list when it keeps one on disk —
  // codex caches what its server sent, which is the list its own picker draws — and the
  // table's otherwise. Read once for the server's lifetime, like the probe above; a user
  // who installs a new model restarts the canvas, as they would for a new CLI.
  const catalogs = new Map<string, AgentModel[]>();
  const models = (def: AgentDef) => {
    let list = catalogs.get(def.id);
    if (!list) {
      list = def.models;
      if (def.modelsFile) {
        try {
          const file = path.join(os.homedir(), def.modelsFile.path);
          list = def.modelsFile.read(JSON.parse(fs.readFileSync(file, "utf8")));
        } catch {
          // No cache yet, or one this cannot read: the table's list stands, which for an
          // agent that keeps its own is empty, leaving the composer its default alone.
        }
      }
      catalogs.set(def.id, list);
    }
    return list;
  };
  // The slash commands each agent last said it had. Claude Code lists them on the init frame
  // of every run, so they cost nothing to learn and are exactly what a session can run.
  // This map is all there is, and it dies with the server — an edit to this file or anything
  // it imports restarts vite mid-session — so an agent that has not run yet falls through to
  // the probe below rather than to an empty palette. A bad line is a line: the menu must
  // never take a run down with it.
  const commands = new Map<string, string[]>();
  // The same frame, and Codex's first, also say what the agent calls the session, which the next
  // turn resumes it by.
  const harvest = (def: AgentDef, line: string, session: Session) => {
    try {
      const list = def.commands?.(line);
      if (list) commands.set(def.id, list);
      session.resume ??= def.session(line);
    } catch {
      // Not the line that carries them.
    }
  };
  // And what an agent says when asked, for the first palette of a server's life and for one
  // that announces nothing at all. Local, free and slow enough (seconds) to be worth keeping:
  // like the probes above, once for the server's life. From the temp dir, since there may be no
  // session yet, and a GET makes no folder in the user's projects directory.
  const asked = new Map<string, Promise<string[]>>();
  const askFor = (def: AgentDef) => {
    let ask = asked.get(def.id);
    if (!ask) {
      const c = command(def.bin, def.commandsProbe!.args);
      ask = new Promise<string[]>((done) =>
        execFile(
          c.file,
          c.args,
          {
            ...c.options,
            cwd: os.tmpdir(),
            timeout: 30_000,
            maxBuffer: 8 << 20,
          },
          (_error, stdout) => {
            // Whatever the exit code: the frame the palette wants is printed early, and a
            // probe that ends badly after that still has it on stdout.
            try {
              done(def.commandsProbe!.read(stdout));
            } catch {
              // A version whose answer this cannot read: no palette, rather than no panel.
              done([]);
            }
          },
        ),
      );
      asked.set(def.id, ask);
    }
    return ask;
  };
  const handle = (
    req: IncomingMessage,
    res: ServerResponse,
    next: () => void,
  ) => {
    const send = (code: number, message: string) => {
      res.statusCode = code;
      res.end(message);
    };
    // A run holds bypassPermissions over the user's files, so a page of another site does not
    // get to start one (sp.ts).
    if (!sameOrigin(req)) return send(403, "cross-site request");
    // "/__sp/agent" and then "/agents", "/run", "/sessions", "/run/<id>/events?after=N" or
    // "/run/<id>/cancel".
    const url = new URL(req.url!.slice("/__sp/agent".length), "http://sp");
    if (req.method === "GET" && url.pathname === "/commands") {
      res.setHeader("content-type", "application/json");
      const def = AGENTS.find((a) => a.id === url.searchParams.get("agent"));
      const known = commands.get(def?.id ?? "");
      if (known || !def?.commandsProbe) {
        send(200, JSON.stringify(known ?? []));
        return;
      }
      void askFor(def).then((list) => send(200, JSON.stringify(list)));
      return;
    }
    if (req.method === "GET" && url.pathname === "/agents") {
      void Promise.all(
        AGENTS.map(async (def) => ({
          id: def.id,
          name: def.name,
          available: await installed(def),
          models: models(def),
          efforts: def.efforts,
          missing: def.missing,
          site: def.site,
        })),
      ).then((list) => {
        res.setHeader("content-type", "application/json");
        send(200, JSON.stringify(list));
      });
      return;
    }
    if (req.method === "POST" && url.pathname === "/run") {
      // The body is no longer a sentence: attached images ride in it as base64, and it is
      // held whole in memory before anything reads it, so it is capped on the way in. Kept
      // as bytes and decoded once at the end: a character split across two chunks decodes
      // to U+FFFD if each chunk is decoded alone, and the message and the file names sit
      // after megabytes of base64 and hundreds of chunk boundaries.
      const chunks: Buffer[] = [];
      let size = 0;
      req.on("data", (chunk: Buffer) => {
        size += chunk.length;
        if (size > MAX_IMAGE_BYTES * 2) chunks.length = 0;
        else chunks.push(chunk);
      });
      req.on("end", () => {
        if (size > MAX_IMAGE_BYTES * 2)
          return send(
            413,
            `too much attached; keep the images under about ${MAX_IMAGE_BYTES / 1_000_000} MB together`,
          );
        try {
          const {
            message,
            canvas,
            agent = "claude",
            model = "",
            effort = "",
            images = [],
            project,
            session,
          } = JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
          // The raw body is a second copy of every attachment, and the listeners the run
          // leaves on its child close over this scope, so it would live as long as the run
          // does — twenty more runs. What is still needed of it is in `images` below.
          chunks.length = 0;
          if (typeof message !== "string" || !message.trim())
            return send(400, "empty message");
          // A browser sent these, so nothing in them is taken on trust. The number is what
          // the message refers to and what names the file below; the type decides the
          // extension and what the image endpoint says it is serving; the name is a caption
          // in the prompt and a label in the panel, and never any part of a path.
          if (!Array.isArray(images) || images.length > MAX_IMAGES)
            return send(400, "bad images");
          for (const i of images) {
            if (!Number.isInteger(i?.n) || i.n < 1)
              return send(400, "bad image number");
            if (typeof i.name !== "string" || i.name.length > 200)
              return send(400, "bad image name");
            if (!IMAGE_TYPES.includes(i.type))
              return send(400, "bad image type");
            if (
              typeof i.data !== "string" ||
              !/^[A-Za-z0-9+/]*={0,2}$/.test(i.data)
            )
              return send(400, "bad image data");
          }
          // The body cap above is the panel's limit in base64; a client that is not the
          // panel meets the limit itself here, in the bytes the files come out as.
          if (
            images.reduce(
              (n: number, i: { data: string }) =>
                n + Buffer.byteLength(i.data, "base64"),
              0,
            ) > MAX_IMAGE_BYTES
          )
            return send(
              413,
              `too much attached; keep the images under about ${MAX_IMAGE_BYTES / 1_000_000} MB together`,
            );
          // One agent at a time, and only the server can say so: the composer's own guard is
          // React state, which a second tab, a reload, or a cleared view does not share. Two
          // agents in one project overwrite each other's boards, and any session can write to
          // any project, so one at a time is across all of them.
          if ([...runs.values()].some((r) => !ended(r))) {
            return send(409, "an agent is already running. Stop it first.");
          }
          const def = AGENTS.find((a) => a.id === agent);
          if (!def) return send(400, "unknown agent");
          // Both reach a command line, and neither is a name this made up: they are ids out
          // of the list this server just served, or the empty string for the CLI's default.
          const known = models(def);
          if (model && !known.some((m) => m.id === model))
            return send(400, "unknown model");
          const efforts =
            known.find((m) => m.id === model)?.efforts ?? def.efforts;
          if (effort && !efforts.includes(effort))
            return send(400, "unknown effort");
          // The slug lands in a path in the prompt, so it is checked like the others.
          if (canvas !== undefined && !SAFE_NAME.test(canvas))
            return send(400, "bad canvas name");
          // The project it was sent from, by the name its address carries. None from the home page
          // or an example, and then the agent has no project to write to.
          const dir =
            project === undefined ? undefined : projects().get(project);
          if (project !== undefined && dir === undefined)
            return send(404, "no such project");
          // The session the panel is in, or a new one. Its id names a folder and a file, so it has
          // to be an id this server made.
          if (
            session !== undefined &&
            !(
              /^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/.test(session) &&
              fs.existsSync(recordOf(session))
            )
          )
            return send(404, "no such session");
          let record: Session;
          if (session === undefined) {
            const now = Date.now();
            record = {
              id: randomUUID(),
              agent: def.id,
              resume: null,
              // The first line, until the model gives the session a title of its own.
              title: message.trim().split("\n")[0].slice(0, 60),
              created: now,
              updated: now,
              projects: [],
              runs: [],
            };
            sessions.set(record.id, record);
          } else record = load(session);
          // A session is one agent's conversation, which the other cannot resume.
          if (record.agent !== def.id)
            return send(
              409,
              `This session is ${AGENTS.find((a) => a.id === record.agent)!.name}'s. ` +
                `Start a new session to talk to ${def.name}.`,
            );
          if (dir !== undefined && !record.projects.includes(dir))
            record.projects.push(dir);
          // The session's folder, the agent's working directory on every turn: made at its first
          // run, and never removed. The plugin's skills are one copy for every session, brought
          // up to this tree's version on each run. Codex looks for skills only in its working
          // directory and a git repo's root, and there is no repo, so each folder has a link to
          // that copy: a junction on Windows, which needs no privilege to make. Claude Code would
          // find the copy above the folder anyway, and lists it once with the link there too.
          const cwd = path.join(workspaces, record.id);
          const skills = AGENT_SKILLS[def.id];
          installSkills(repoRoot, workspaces, [skills]);
          if (!fs.existsSync(path.join(cwd, skills))) {
            fs.mkdirSync(path.join(cwd, path.dirname(skills)), {
              recursive: true,
            });
            fs.symlinkSync(
              path.join(workspaces, skills),
              path.join(cwd, skills),
              "junction",
            );
          }
          // With no project, the canvas in front can only be an example.
          const boards =
            dir === undefined ? examplesDir : path.join(dir, CANVASES);
          const folder = canvas && folderOf(boards, examplesDir, canvas);
          // ponytail: every project by name and path, one clause each; name only the folder
          // they live in if someone keeps enough projects for this to crowd the prompt.
          const others = [...projects()]
            .filter(([, had]) => had !== dir)
            .map(([name, had]) => `"${name}" at ${had}`);
          const preamble = [
            "You are talking to the user from the chat panel of the super-prototyping canvas " +
              `they have open. Your working directory, ${cwd}, is this conversation's own and ` +
              "no project's: keep your notes and intermediate files there, and nothing the " +
              "user is meant to see.",
            dir === undefined
              ? "No project is open: they are on the home page or looking at an example. A " +
                "board belongs in a project, which they make or open from the home page."
              : `They are in their project at ${dir}. Its boards are the folders under ` +
                `${boards}, one per canvas page, and a board you make goes there.`,
            others.length > 0 &&
              `They may refer to their ${dir === undefined ? "" : "other "}projects, which ` +
                `are ${others.join(", ")}.`,
            `The canvas also shows the examples under ${examplesDir}. Those are the app's and ` +
              (dir === undefined
                ? "read-only."
                : `read-only: to change one, copy its folder into ${boards} first.`),
            canvas &&
              (dir === undefined || folder !== path.join(boards, canvas)
                ? `They are looking at the example canvas "${canvas}", which is read-only at ` +
                  `${folder}. Write nothing under that folder.` +
                  (dir === undefined
                    ? ""
                    : ` If they ask for a change to it, copy it into ${boards} and change ` +
                      "the copy.")
                : `They are looking at the canvas "${canvas}", whose folder is ${folder}.`),
            `Before touching a board folder, read ${repoRoot}/skills/prototype-canvas/SKILL.md, ` +
              "the prototype-canvas skill of the super-prototyping plugin: one folder is one canvas " +
              "page, one .html file in it is one board, layout.json places them, and the open canvas " +
              "reloads by itself when a board is rewritten.",
            // On the turn that starts the session only. A resumed one has its title.
            record.resume === null &&
              "Open your first reply with a title for this conversation on a line of its own, " +
                "as <sp-title>three to six words naming what was asked</sp-title>, then go on " +
                "as usual.",
          ]
            .filter(Boolean)
            // One line: claude takes this as an argument, and through a .cmd shim on Windows an
            // argument cannot hold a newline (command.ts).
            .join(" ");
          // The run's id names the folder, and the image's number and media type name the
          // file in it, so what the browser called the file stays a caption: a slash or a
          // `..` in that name is text in the prompt and reaches no path here.
          // They are kept in the run's folder, which is also where an agent that takes files
          // rather than bytes (agents.ts) is pointed to read them.
          const id = randomUUID();
          fs.mkdirSync(keptOf(id), { recursive: true });
          const imagesDir = images.length ? keptOf(id) : "";
          const held: AgentImage[] = images.map(
            (i: { n: number; name: string; type: string; data: string }) => ({
              ...i,
              path: picture(
                id,
                `image-${i.n}`,
                i.type,
                Buffer.from(i.data, "base64"),
              ),
            }),
          );
          const c = command(
            def.bin,
            def.args({
              preamble,
              project: dir ?? "",
              model,
              effort,
              imagesDir,
              resume: record.resume ?? "",
            }),
          );
          const run = Object.assign(newRun(id), {
            child: spawn(c.file, c.args, {
              ...c.options,
              cwd,
              env: process.env,
            }),
            stopped: false,
          });
          runs.set(run.id, run);
          record.runs.push(run.id);
          record.updated = Date.now();
          save(record);
          // The agent, the prompt, its first line as the title until the model gives one, and
          // the time: the first event, so a replay from zero rebuilds the whole turn with the
          // right mark on it.
          say(run, "start", {
            kind: "start",
            agent: def.id,
            prompt: message,
            title: message.trim().split("\n")[0].slice(0, 60),
            at: Date.now(),
            project,
            // The numbers and the names only: the pictures are a request away, so the reload
            // that a written board causes rebuilds the strip without the bytes coming back
            // down the stream with every other event.
            images: held.map(({ n, name }) => ({ n, name })),
          });
          // ponytail: the newest 20 runs are kept whatever their age; a tab that reattaches
          // to an older one gets a 404 and shows it.
          for (const [oldId, old] of runs) {
            if (runs.size <= 20) break;
            if (ended(old)) {
              runs.delete(oldId);
            }
          }
          const finish = (message: string) => {
            if (!ended(run))
              say(run, "end", { kind: "end", ok: false, message });
          };
          let stderr = "";
          run.child.stderr
            .setEncoding("utf8")
            .on("data", (chunk: string) => (stderr += chunk));
          let pending = "";
          let shots = 0;
          const lift = titleFilter();
          // Codex reports what a turn used but never how much there was; the model list it
          // caches says, and this is the one place that knows which model was picked.
          const contextWindow = known.find((m) => m.id === model)?.window;
          const sized = (e: ChatEvent) =>
            e.kind === "usage" && e.window === undefined && contextWindow
              ? { ...e, window: contextWindow }
              : e;
          const feed = (chunk: string) => {
            const lines = (pending + chunk).split("\n");
            pending = lines.pop()!;
            try {
              for (const line of lines) {
                if (line.trim()) {
                  harvest(def, line, record);
                  // A picture a tool handed back goes in the run's folder and the event keeps
                  // the number to ask for it by, for the reason the composer's attachments
                  // are: every reload rebuilds the transcript from event zero, and a page of
                  // grids would come back down the stream on each one. The media type is the
                  // agent's word, and goes out as a header.
                  for (const e of def.events(line))
                    for (const t of lift(e)) {
                      if (t.kind === "title") record.title = t.title;
                      say(
                        run,
                        t.kind,
                        t.kind === "tool_done" && t.shots
                          ? {
                              ...t,
                              shots: t.shots.map((s) => {
                                if (!("data" in s)) return s;
                                picture(
                                  run.id,
                                  `shot-${++shots}`,
                                  IMAGE_TYPES.includes(s.type)
                                    ? s.type
                                    : "image/png",
                                  Buffer.from(s.data, "base64"),
                                );
                                return { k: shots };
                              }),
                            }
                          : sized(t),
                      );
                    }
                }
              }
            } catch (error) {
              stop(run.child);
              finish(`unreadable output from ${def.bin}: ${error}`);
            }
          };
          run.child.stdout
            .setEncoding("utf8")
            .on("data", feed)
            .on("end", () => feed("\n"));
          // A CLI that exits at once — an older one refusing a flag — closes the pipe before
          // the prompt is written; the exit below reports that, and the write error is noise.
          run.child.stdin.on("error", () => {});
          run.child.stdin.end(def.stdin(message, preamble, held));
          // The record, with what the run said: how to resume it, and the model's title. On both,
          // since a child that could not be spawned never closes.
          const settle = () => {
            record.updated = Date.now();
            save(record);
          };
          run.child.on("error", (error: NodeJS.ErrnoException) => {
            settle();
            finish(error.code === "ENOENT" ? def.missing : String(error));
          });
          run.child.on("close", (code, signal) => {
            settle();
            if (ended(run)) return;
            const tail = stderr.trim().split("\n").slice(-5).join("\n");
            // `claude` is a launcher around the real process: a SIGTERM to it comes back as
            // exit 143, not as a signal. Harmless for codex, which dies by the signal.
            finish(
              signal || code === 143 || run.stopped
                ? "stopped"
                : `${def.bin} exited with code ${code}` +
                    (tail ? `\n${tail}` : "") +
                    (def.id === "claude" && /unknown option/i.test(stderr)
                      ? "\nThe panel needs Claude Code 2.1.275 or newer."
                      : ""),
            );
          });
          res.setHeader("content-type", "application/json");
          send(
            202,
            JSON.stringify({
              runId: run.id,
              session: { id: record.id, title: record.title },
            }),
          );
        } catch (error) {
          send(500, String(error));
        }
      });
      return;
    }
    if (req.method === "GET" && url.pathname === "/sessions") {
      // Every session there is, newest first, off the records, so a restarted server still lists
      // them. Whether one is running is this process's to say.
      const ids = fs.existsSync(workspaces)
        ? fs
            .readdirSync(workspaces)
            .filter((f) => f.endsWith(".json"))
            .map((f) => f.slice(0, -5))
        : [];
      res.setHeader("content-type", "application/json");
      return send(
        200,
        JSON.stringify(
          ids
            .map(load)
            .sort((a, b) => b.updated - a.updated)
            .map((s) => ({
              ...s,
              running: s.runs.some((id) => {
                const run = runs.get(id);
                return run !== undefined && !ended(run);
              }),
            })),
        ),
      );
    }
    const match =
      /^\/run\/([\w-]+)\/(events|cancel|image\/\d+|shot\/\d+)$/.exec(
        url.pathname,
      );
    if (!match) return next();
    // A run this server started, or one it or an earlier server kept on disk. The id names a
    // folder, and the pattern above lets through no separator and no dot.
    const live = runs.get(match[1]);
    const run = live ?? kept(match[1]);
    if (!run) return send(404, "no such run");
    if (
      req.method === "GET" &&
      match[2] !== "events" &&
      match[2] !== "cancel"
    ) {
      // What was attached (`image/<n>`) or what a tool drew (`shot/<k>`), off the run's folder.
      // Served back rather than replayed: the page rebuilds a turn from event zero after
      // every reload, and the strip asks for its pictures again instead of the stream
      // carrying them each time. `send` writes strings, so these go out on their own.
      //
      // The strip also links each one to open in a tab, and the type is the browser's word
      // or the agent's, so an attached SVG would open as a document of this origin — where
      // its script can POST /run and start an agent in the project, asked by no one.
      // `sandbox` opens it in an opaque origin with no script instead, which a PNG or a JPEG
      // in a tab never notices, and `nosniff` keeps a type the browser does not know from
      // being guessed into HTML. Neither touches the same bytes drawn as an <img>.
      const [kind, n] = match[2].split("/");
      const file = fs
        .readdirSync(keptOf(run.id))
        .find((f) => f.startsWith(`${kind}-${Number(n)}.`));
      if (!file) return send(404, `no such ${kind}`);
      res.writeHead(200, {
        "content-type": `image/${path.extname(file).slice(1)}`,
        "content-security-policy": "sandbox",
        "x-content-type-options": "nosniff",
        "cache-control": "no-store",
      });
      return res.end(fs.readFileSync(path.join(keptOf(run.id), file)));
    }
    if (match[2] === "events" && req.method === "GET") {
      const after = Number(url.searchParams.get("after") ?? 0);
      if (!Number.isInteger(after) || after < 0) return send(400, "bad cursor");
      res.writeHead(200, {
        "content-type": "text/event-stream",
        "cache-control": "no-store",
      });
      res.flushHeaders();
      const detach = attach(run, after, (e) => {
        res.write(sseFrame(e));
        if (e.event === "end") res.end();
      });
      const keepalive = setInterval(() => res.write(": keepalive\n\n"), 25_000);
      res.on("close", () => {
        detach();
        clearInterval(keepalive);
      });
      return;
    }
    if (match[2] === "cancel" && req.method === "POST") {
      // A Stop that arrives after the run ended finds a pid Windows may have handed on.
      if (live && !ended(live)) {
        live.stopped = true;
        stop(live.child);
      }
      return send(200, "");
    }
    next();
  };

  return {
    handle,
    close() {
      // The agent is this process's child and no one else's. A SIGTERM to the server alone, which is
      // how the macOS app stops it, would otherwise leave the agent editing the project with nobody
      // watching. This is the same kill the Stop button sends.
      for (const run of runs.values()) if (!ended(run)) stop(run.child);
    },
  };
}
