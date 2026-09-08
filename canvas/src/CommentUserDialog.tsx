import { useEffect, useRef, useState } from "react";
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
  GITHUB_PATH,
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
  const input = useRef<HTMLInputElement>(null);

  // A field called "GitHub username" is exactly what a password manager offers to fill, and an
  // offer to sign in is the one thing this dialog is not. Each manager reads its own opt-out
  // attribute, and TldrawUiInput passes none of them through — so set them on the element it
  // hands back. `name` matters too: managers match on it before they read anything else.
  useEffect(() => {
    const el = input.current;
    if (!el) return;
    for (const [key, value] of Object.entries({
      name: "sp-comment-handle",
      autocomplete: "off",
      autocapitalize: "off",
      autocorrect: "off",
      spellcheck: "false",
      "data-1p-ignore": "true",
      "data-lpignore": "true",
      "data-bwignore": "true",
      "data-form-type": "other",
    })) {
      el.setAttribute(key, value);
    }
  }, []);

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
        {/* The mark inside the field, the way a sign-in box wears it: this is the one place the
            canvas asks for an account, and whose account is the whole question. It goes in as the
            input's children, which tldraw lays out inside the field's own flex row, so the border
            moves to that row and the mark sits within it rather than floating over the text. */}
        <div className="canvas-gh-field">
          <TldrawUiInput
            ref={input}
            autoFocus
            placeholder="GitHub username"
            value={handle}
            onValueChange={(value) => {
              setHandle(value);
              setFailed("");
            }}
            onComplete={save}
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fillRule="evenodd" aria-hidden>
              <path d={GITHUB_PATH} />
            </svg>
          </TldrawUiInput>
        </div>
        {/* Where a comment ends up is the thing worth saying before someone writes one, and it
            is not the same in both places. Lead with that, in one sentence. */}
        <div className="canvas-clone-hint">
          {failed ||
            (import.meta.env.DEV ? (
              <>
                <strong>Comments go into Git</strong>, as <code>comments.json</code> in the
                board&rsquo;s folder, signed with your handle and avatar.
              </>
            ) : (
              <>
                <strong>Comments stay in this browser.</strong> Run the canvas on your own project
                to save them into the board&rsquo;s folder instead.
              </>
            ))}
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
