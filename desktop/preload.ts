/**
 * The startup page's only channel back to main.ts: open or create a project, which agent was
 * chosen, and a new project's name; "open" with a name is the project of that name under
 * Documents. It resolves to nothing, or to what to say under the name field when a project could
 * not be made. `check` is a click on the page's version: it looks for an update and resolves to
 * what to say beside the version. The window is sandboxed (Electron's default), so the page cannot reach `ipcRenderer`
 * itself. Bundled to CommonJS by package.json's build script, because a sandboxed preload cannot
 * use ESM imports.
 */
import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("startup", {
  choose: (action: "open" | "create", agent: string, name?: string) =>
    ipcRenderer.invoke("startup:choose", action, agent, name),
  check: () => ipcRenderer.invoke("startup:check"),
});
