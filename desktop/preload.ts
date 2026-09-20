/**
 * The startup window's only channel back to main.ts: open or create a project, and which agents
 * were left checked. The window is sandboxed (Electron's default), so the page cannot reach
 * `ipcRenderer` itself; this is the one door. Bundled to CommonJS by package.json's build
 * script, because a sandboxed preload cannot use ESM imports.
 */
import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("startup", {
  choose: (action: "open" | "create", ids: string[]) => ipcRenderer.send("startup:choose", action, ids),
});
