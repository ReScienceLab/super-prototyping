import { randomBytes } from "node:crypto";
import { fileURLToPath } from "node:url";
import type { IncomingMessage } from "node:http";
import type { Socket } from "node:net";
import type { Duplex } from "node:stream";
import * as pty from "node-pty";
import react from "@vitejs/plugin-react";
import { defineConfig, type Plugin } from "vite";
import { WebSocket, WebSocketServer } from "ws";

const terminalToken = randomBytes(24).toString("base64url");
const terminalPath = "/__terminal";
/** Repo root — vite.config.ts sits in canvas/, one level below it. The embedded shell opens here. */
const repoRoot = fileURLToPath(new URL("..", import.meta.url)).replace(/\/$/, "");

function reject(socket: Duplex, status: string) {
  socket.end(`HTTP/1.1 ${status}\r\nConnection: close\r\n\r\n`);
}

function expectedOrigin(request: IncomingMessage) {
  return `http://${request.headers.host}`;
}

function terminalPlugin(): Plugin {
  const webSockets = new WebSocketServer({ noServer: true });

  webSockets.on("connection", (socket) => {
    const terminal = pty.spawn("/bin/zsh", ["-l"], {
      name: "xterm-256color",
      cols: 80,
      rows: 24,
      cwd: repoRoot,
      env: {
        ...process.env,
        COLORTERM: "truecolor",
        TERM: "xterm-256color",
      },
    });

    const output = terminal.onData((data) => {
      if (socket.readyState === WebSocket.OPEN) socket.send(data);
    });

    socket.on("message", (raw) => {
      const data = Array.isArray(raw)
        ? Buffer.concat(raw)
        : raw instanceof ArrayBuffer
          ? Buffer.from(raw)
          : raw;
      if (data.byteLength > 65_536)
        return socket.close(1009, "message too large");

      try {
        const message = JSON.parse(data.toString()) as Record<string, unknown>;
        if (message.type === "input" && typeof message.data === "string") {
          terminal.write(message.data);
        } else if (
          message.type === "resize" &&
          Number.isInteger(message.cols) &&
          Number.isInteger(message.rows)
        ) {
          const cols = Number(message.cols);
          const rows = Number(message.rows);
          if (cols >= 2 && cols <= 500 && rows >= 2 && rows <= 300) {
            terminal.resize(cols, rows);
          }
        }
      } catch {
        socket.close(1003, "invalid terminal message");
      }
    });

    terminal.onExit(() => socket.close(1000, "shell exited"));
    socket.on("close", () => {
      output.dispose();
      terminal.kill();
    });
  });

  return {
    name: "prototyping-local-terminal",
    transformIndexHtml() {
      return [
        {
          tag: "meta",
          attrs: { name: "prototyping-terminal-token", content: terminalToken },
          injectTo: "head",
        },
        {
          tag: "meta",
          attrs: { name: "prototyping-repo-root", content: repoRoot },
          injectTo: "head",
        },
      ];
    },
    configureServer(server) {
      server.httpServer?.on(
        "upgrade",
        (request: IncomingMessage, socket: Socket, head: Buffer) => {
          const url = new URL(request.url ?? "/", expectedOrigin(request));
          if (url.pathname !== terminalPath) return;
          if (
            request.headers.origin !== expectedOrigin(request) ||
            url.searchParams.get("token") !== terminalToken
          ) {
            reject(socket, "403 Forbidden");
            return;
          }
          webSockets.handleUpgrade(request, socket, head, (client) => {
            webSockets.emit("connection", client, request);
          });
        },
      );
    },
  };
}

export default defineConfig({
  plugins: [react(), terminalPlugin()],
});
