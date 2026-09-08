import { useState } from "react";
import {
  TldrawUiButton,
  TldrawUiButtonLabel,
  TldrawUiDialogBody,
  TldrawUiDialogCloseButton,
  TldrawUiDialogFooter,
  TldrawUiDialogHeader,
  TldrawUiDialogTitle,
  TldrawUiInput,
  type TLUiDialogProps,
} from "tldraw";
import { canvasesDir } from "virtual:canvases";
import { canvasSlug } from "./boardStatusEdit";
import { cloneCanvas } from "./canvasLibrary";
import { urlForSlug } from "./canvasUrl";

/**
 * Asking for the new canvas's name, which is the only thing cloning a folder needs that the
 * canvas cannot work out for itself. The typed name is what the page is called; the server
 * answers with the folder name it turned into, because only the server knows what is free.
 */
export function CloneCanvasDialog({ slug, onClose }: TLUiDialogProps & { slug: string }) {
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [cloning, setCloning] = useState(false);
  const folder = canvasSlug(name);
  // Empty in a production build, which does not ship the build machine's paths, so this falls
  // back to what the no-boards notice uses and the sentence still says where boards live.
  const dir = canvasesDir || "mockups/canvases";

  const clone = () => {
    if (!folder || cloning) return;
    setCloning(true);
    setError("");
    cloneCanvas(slug, name.trim()).then(
      // A new folder is a new page, and a page only exists once the index has been rebuilt, so
      // the clone is opened by navigating to it. That load is the rebuild.
      (created) => window.location.assign(urlForSlug(window.location.href, created)),
      (reason: Error) => {
        setError(reason.message);
        setCloning(false);
      },
    );
  };

  return (
    <>
      <TldrawUiDialogHeader>
        <TldrawUiDialogTitle>Clone this canvas</TldrawUiDialogTitle>
        <TldrawUiDialogCloseButton />
      </TldrawUiDialogHeader>
      <TldrawUiDialogBody style={{ display: "grid", gap: 8, width: 460 }}>
        <TldrawUiInput
          autoFocus
          className="canvas-clone-name"
          placeholder="New canvas name"
          value={name}
          onValueChange={setName}
          onComplete={clone}
        />
        {/* The destination written out as a path, because a clone copies a real folder in the
            project. This is not a page that lives only in the canvas. */}
        <div className="canvas-clone-hint">
          Copies every board of <b>{slug}</b> into a new folder on disk:
          <code className="canvas-clone-path">
            {dir}/<b>{folder || "new-canvas-name"}</b>/
          </code>
          {/* Only once the field says something: an empty one is not yet a mistake, a name with
              no ASCII in it is, and either way this is why the button below is disabled. */}
          {(error || (name.trim() && !folder)) && (
            <div className="canvas-clone-hint__error">
              {error || "A folder name is ASCII: letters, digits, dots and dashes."}
            </div>
          )}
        </div>
      </TldrawUiDialogBody>
      <TldrawUiDialogFooter className="tlui-dialog__footer__actions">
        <TldrawUiButton type="normal" onClick={onClose}>
          <TldrawUiButtonLabel>Cancel</TldrawUiButtonLabel>
        </TldrawUiButton>
        <TldrawUiButton type="primary" disabled={!folder || cloning} onClick={clone}>
          <TldrawUiButtonLabel>{cloning ? "Cloning…" : "Clone"}</TldrawUiButtonLabel>
        </TldrawUiButton>
      </TldrawUiDialogFooter>
    </>
  );
}
