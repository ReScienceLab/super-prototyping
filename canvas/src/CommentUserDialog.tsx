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
import {
  readCommentUser,
  resolveGithubUser,
  writeCommentUser,
  type CommentUser,
} from "./canvasComments";

/**
 * Asking who is commenting. There is no account here and there is not going to be one — the
 * canvas serves one repo on 127.0.0.1 — but a comment with no name on it is not worth much in a
 * review, so a GitHub handle is asked for once and remembered in this browser. The handle rather
 * than a free-typed name because it is what a pull request will call the same person, and because
 * it comes with a face: GitHub serves the avatar for a login without being asked for a token.
 */
export function CommentUserDialog({
  onClose,
  onSave,
}: TLUiDialogProps & { onSave: (user: CommentUser) => void }) {
  const [handle, setHandle] = useState(readCommentUser()?.name ?? "");
  const [checking, setChecking] = useState(false);
  const [failed, setFailed] = useState("");

  const save = async () => {
    if (checking) return;
    setChecking(true);
    setFailed("");
    const user = await resolveGithubUser(handle);
    setChecking(false);
    if (!user) {
      setFailed(`No GitHub avatar for “${handle.trim()}” — check the spelling.`);
      return;
    }
    writeCommentUser(user);
    onSave(user);
    onClose();
  };

  return (
    <>
      <TldrawUiDialogHeader>
        <TldrawUiDialogTitle>Who is commenting?</TldrawUiDialogTitle>
        <TldrawUiDialogCloseButton />
      </TldrawUiDialogHeader>
      <TldrawUiDialogBody style={{ display: "grid", gap: 8, width: 460 }}>
        <TldrawUiInput
          autoFocus
          className="canvas-clone-name"
          placeholder="GitHub username"
          value={handle}
          onValueChange={(value) => {
            setHandle(value);
            setFailed("");
          }}
          onComplete={save}
        />
        {/* Same warning the clone dialog gives, for the same reason: this writes files someone
            else will read in a pull request, not a document in this browser. */}
        <div className="canvas-clone-hint">
          {failed || (
            <>
              Comments are saved into each board&rsquo;s folder as <code>comments.json</code> and go
              into Git with the boards. Your handle and your GitHub avatar are written next to what
              you post — no account, no sign-in.
            </>
          )}
        </div>
      </TldrawUiDialogBody>
      <TldrawUiDialogFooter className="tlui-dialog__footer__actions">
        <TldrawUiButton type="normal" onClick={onClose}>
          <TldrawUiButtonLabel>Cancel</TldrawUiButtonLabel>
        </TldrawUiButton>
        <TldrawUiButton type="primary" disabled={!handle.trim() || checking} onClick={save}>
          <TldrawUiButtonLabel>{checking ? "Checking…" : "Save"}</TldrawUiButtonLabel>
        </TldrawUiButton>
      </TldrawUiDialogFooter>
    </>
  );
}
