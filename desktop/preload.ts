/**
 * The app window's only channel back to main.ts, for what is the app's and not the project's.
 * Making a project and opening a folder are the server's, which the page asks itself.
 * `agent` is the onboarding's answer, remembered for the next launch. `check` is a click on the
 * onboarding's version. It looks for an update and resolves to what to say beside the version.
 * The window is sandboxed (Electron's default), so the page cannot reach `ipcRenderer` itself.
 * Bundled to CommonJS by package.json's build script, because a sandboxed preload cannot use ESM
 * imports.
 */
import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("startup", {
  agent: (id: string) => ipcRenderer.invoke("startup:agent", id),
  check: () => ipcRenderer.invoke("startup:check"),
});
