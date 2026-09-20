/**
 * The onboarding picker's only channel back to main.ts: the chosen agent ids. The window it
 * runs in is sandboxed (Electron's default), so the page cannot reach `ipcRenderer` itself;
 * this is the one door. Bundled to CommonJS by package.json's build script, because a sandboxed
 * preload cannot use ESM imports.
 */
import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("onboarding", {
  submit: (ids: string[]) => ipcRenderer.send("skills:submit", ids),
});
