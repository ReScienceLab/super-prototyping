/**
 * The startup page's and the app window's only channel back to main.ts: open or create a project,
 * which agent was chosen (empty in the app's window, for the one chosen before) and a project's
 * name; "open" with a name is the project of that name under Documents. It resolves to nothing,
 * to what to say under the name field when a project could not be made, or, for the app's
 * window, to the address of the project it opened. `check` is a click on the startup page's
 * version: it looks for an update and resolves to what to say beside the version. The window is
 * sandboxed (Electron's default), so the page cannot reach `ipcRenderer` itself. Bundled to
 * CommonJS by package.json's build script, because a sandboxed preload cannot use ESM imports.
 */
import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("startup", {
  choose: (action: "open" | "create", agent: string, name?: string) =>
    ipcRenderer.invoke("startup:choose", action, agent, name),
  check: () => ipcRenderer.invoke("startup:check"),
});
