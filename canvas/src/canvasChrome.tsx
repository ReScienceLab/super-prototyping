import { createContext, useContext, useEffect } from "react";
import {
  DefaultActionsMenu,
  DefaultStylePanel,
  DefaultToolbar,
  DefaultToolbarContent,
  TldrawUiButton,
  TldrawUiButtonIcon,
  type Editor,
  type TLComponents,
  type TLUiAssetUrlOverrides,
  useDialogs,
  useEditor,
  useValue,
} from "tldraw";
import { CanvasComments, CommentTool } from "@tldraw/commenting";
import { CloneCanvasDialog } from "./CloneCanvasDialog";
import { CommentUserDialog } from "./CommentUserDialog";
import { linkedBoard, readCommentUser, resolveAuthor, type CommentUser } from "./canvasComments";
import type { CanvasFileShape } from "./CanvasFileShapeUtil";
import { WELCOME_PAGE_SLUG } from "./canvasUrl";

const REPO_URL = "https://github.com/ReScienceLab/super-prototyping";
/** The app the snapaction-ios boards are cloned from: its own site, not the App Store listing. */
const SNAPACTION_URL = "https://snapaction.ai/";

/** One dialog, whether it was opened by the button or by picking the tool without a name. */
const COMMENT_USER_DIALOG = "comment-user";

/**
 * Ask for the commenter's identity from outside the tldraw UI context. `useDialogs` is only
 * available under `<Tldraw>`, and the inspector panel is a sibling of it — so the panel raises
 * this and the comments layer, which is inside, opens the one dialog there is.
 */
export const ASK_COMMENT_USER = "sp:ask-comment-user";

const GITHUB_PATH =
  "M12 0c6.63 0 12 5.276 12 11.79-.001 5.067-3.29 9.567-8.175 11.187-.6.118-.825-.25-.825-.56 0-.398.015-1.665.015-3.242 0-1.105-.375-1.813-.81-2.181 2.67-.295 5.475-1.297 5.475-5.822 0-1.297-.465-2.344-1.23-3.169.12-.295.54-1.503-.12-3.125 0 0-1.005-.324-3.3 1.209a11.32 11.32 0 00-3-.398c-1.02 0-2.04.133-3 .398-2.295-1.518-3.3-1.209-3.3-1.209-.66 1.622-.24 2.83-.12 3.125-.765.825-1.23 1.887-1.23 3.169 0 4.51 2.79 5.527 5.46 5.822-.345.294-.66.81-.765 1.577-.69.31-2.415.81-3.495-.973-.225-.354-.9-1.223-1.845-1.209-1.005.015-.405.56.015.781.51.28 1.095 1.327 1.23 1.666.24.663 1.02 1.93 4.035 1.385 0 .988.015 1.916.015 2.196 0 .31-.225.664-.825.56C3.303 21.374-.003 16.867 0 11.791 0 5.276 5.37 0 12 0z";

export const CanvasChromeContext = createContext({
  stylesVisible: false,
  toggleStyles: () => {},
  relayoutLibrary: () => {},
  /** The mounted editor, for the parts of the app that render outside `<Tldraw>`. */
  editor: null as Editor | null,
  /** Who this browser comments as, or null until they have typed a name. */
  commentUser: null as CommentUser | null,
  setCommentUser: (_user: CommentUser) => {},
  /** Open a board in the inspector, for the parts of the canvas that link to one. */
  inspectBoard: (_board: CanvasFileShape) => {},
});

/**
 * The comment tool, plus the one thing this canvas adds to a thread: the link it carries to the
 * mockup it is about. Every comment placed on a board — or in the margin beside one — is anchored
 * to that board's shape, which is what makes the note ride the mockup when a layout.json edit
 * moves it. The header shows that link, and follows it: clicking opens the board in the inspector.
 */
export const canvasCommentTools = [
  CommentTool.configure({
    components: {
      ThreadActions: ({ thread }) => {
        const chrome = useContext(CanvasChromeContext);
        const editor = useEditor();
        const board = useValue("linked board", () => linkedBoard(editor, thread.anchor), [
          editor,
          thread.anchor,
        ]);
        // A note dropped out in open canvas is linked to nothing, and says so by showing nothing.
        if (!board) return null;
        return (
          <TldrawUiButton
            type="icon"
            title={`Linked to ${board.props.name} — open it`}
            onClick={() => chrome.inspectBoard(board)}
          >
            <TldrawUiButtonIcon icon="link" />
          </TldrawUiButton>
        );
      },
    },
  }),
];

export const canvasChromeComponents: TLComponents = {
  /**
   * The two CTAs, pinned to the viewport's top-right corner rather than drawn on the welcome
   * board, so they are there on every page and do not scroll away with the canvas. `SharePanel`
   * is tldraw's own slot for exactly this: it renders in `.tlui-layout__top__right`, above the
   * style panel, which is where a tldraw app puts its share and account controls.
   */
  SharePanel: () => (
    // The pill itself (size, type, the shimmer, and how it collapses to its mark on a phone)
    // is .canvas-cta in index.css; what stays here is each one's own colour.
    <div className="canvas-cta-group">
      <a
        href={SNAPACTION_URL}
        target="_blank"
        rel="noopener noreferrer"
        title="Try SnapAction, the app the example boards are cloned from"
        className="canvas-cta"
        style={{
          border: "1px solid #4A4A56",
          background: "linear-gradient(180deg,#2A2A32,#17171C)",
          boxShadow: "0 6px 18px rgba(0,0,0,.45), inset 0 1px 0 rgba(255,255,255,.10)",
        }}
      >
        {/* The app's own mark, cut from its symbolset by snapaction-ios/gen.py. */}
        <img src="/snapaction.svg" width={23} height={18} alt="" />
        <span className="canvas-cta__label">Try SnapAction</span>
        <span className="canvas-cta__arrow" style={{ color: "#8A8781" }}>
          &#8599;
        </span>
      </a>
      <a
        href={REPO_URL}
        target="_blank"
        rel="noopener noreferrer"
        title="Star super-prototyping on GitHub"
        className="canvas-cta"
        style={{
          border: "1px solid #6E9BFF",
          background: "linear-gradient(180deg,#4A85FF,#1B47D2)",
          // The glow is the point: this is the one thing on the canvas asking for something,
          // so it reads as a lit button rather than another piece of grey chrome.
          boxShadow:
            "0 0 0 4px rgba(74,133,255,.20), 0 8px 24px rgba(37,99,235,.55), inset 0 1px 0 rgba(255,255,255,.28)",
        }}
      >
        <svg viewBox="0 0 24 24" width="19" height="19" fill="#FFD666" aria-hidden>
          <path d="M12 2.6l2.9 5.9 6.5.95-4.7 4.6 1.1 6.45L12 17.45 6.2 20.5l1.1-6.45-4.7-4.6 6.5-.95z" />
        </svg>
        <span className="canvas-cta__label">Star on GitHub</span>
        <svg viewBox="0 0 24 24" width="18" height="18" fill="#FFFFFF" fillRule="evenodd" aria-hidden>
          <path d={GITHUB_PATH} />
        </svg>
      </a>
    </div>
  ),
  /** Clone and force-relayout are document-level actions, so they sit in the top bar with the
   * rest of them rather than with the drawing tools. */
  ActionsMenu: (props) => {
    const chrome = useContext(CanvasChromeContext);
    const editor = useEditor();
    const { addDialog } = useDialogs();
    const slug = useValue(
      "canvas slug",
      () => editor.getCurrentPage().meta.canvasSlug as string | undefined,
      [editor],
    );

    return (
      <>
        <DefaultActionsMenu {...props} />
        {/* Nothing to copy on the welcome page, which the app draws and no folder backs, or on
            a page someone added by hand. */}
        {slug && slug !== WELCOME_PAGE_SLUG && (
          <TldrawUiButton
            type="icon"
            title="Clone this canvas into a new one"
            onClick={() =>
              addDialog({
                component: (dialog) => <CloneCanvasDialog {...dialog} slug={slug} />,
              })
            }
          >
            <TldrawUiButtonIcon icon="clone-icon" />
          </TldrawUiButton>
        )}
        <TldrawUiButton
          type="icon"
          title="Force refresh canvas library (fixes overlapping frames after a layout.json edit)"
          onClick={chrome.relayoutLibrary}
        >
          <TldrawUiButtonIcon icon="refresh-icon" />
        </TldrawUiButton>
        {/* The only account there is: the GitHub handle posted comments are signed with, wearing
            that account's avatar once there is one. Sits here rather than behind the comment tool
            so it can be corrected after the fact. */}
        <TldrawUiButton
          type="icon"
          title={
            chrome.commentUser
              ? `Commenting as ${chrome.commentUser.name} — click to change`
              : "Set the GitHub handle your comments are signed with"
          }
          onClick={() =>
            addDialog({
              id: COMMENT_USER_DIALOG,
              component: (dialog) => (
                <CommentUserDialog {...dialog} onSave={chrome.setCommentUser} />
              ),
            })
          }
        >
          {chrome.commentUser ? (
            <img className="canvas-me" src={chrome.commentUser.image} alt="" />
          ) : (
            <TldrawUiButtonIcon icon="comment" />
          )}
        </TldrawUiButton>
      </>
    );
  },
  Toolbar: (props) => {
    const chrome = useContext(CanvasChromeContext);

    return (
      <DefaultToolbar {...props}>
        <TldrawUiButton
          type="tool"
          isActive={chrome.stylesVisible}
          title={chrome.stylesVisible ? "Hide styles" : "Show styles"}
          aria-pressed={chrome.stylesVisible}
          onClick={chrome.toggleStyles}
        >
          <TldrawUiButtonIcon icon="styles-icon" />
        </TldrawUiButton>
        <DefaultToolbarContent />
      </DefaultToolbar>
    );
  },
  /**
   * The comments layer: pins, thread popovers and the composer the comment tool opens. Everything
   * about where they are stored — the board folder, Git, the pin snapping onto the mockup beside
   * it — is canvasComments.ts; this is only the surface.
   */
  InFrontOfTheCanvas: () => {
    const chrome = useContext(CanvasChromeContext);
    const editor = useEditor();
    const { addDialog } = useDialogs();
    const tool = useValue("tool", () => editor.getCurrentToolId(), [editor]);
    const setCommentUser = chrome.setCommentUser;

    // An anonymous viewer gets no composer, so picking the comment tool without a name would do
    // nothing at all. Ask for one instead, and drop back to select if they would rather not.
    useEffect(() => {
      if (tool !== "comment" || chrome.commentUser) return;
      addDialog({
        id: COMMENT_USER_DIALOG,
        component: (dialog) => <CommentUserDialog {...dialog} onSave={chrome.setCommentUser} />,
        // Only when they closed it without giving a name — saving one should leave them in the
        // tool they just picked. Read back rather than trusting the value this effect captured.
        onClose: () => {
          if (!readCommentUser()) editor.setCurrentTool("select");
        },
      });
    }, [tool, chrome, addDialog, editor]);

    // The same dialog for the inspector panel's composer, which cannot open one itself.
    useEffect(() => {
      const ask = () =>
        addDialog({
          id: COMMENT_USER_DIALOG,
          component: (dialog) => <CommentUserDialog {...dialog} onSave={setCommentUser} />,
        });
      window.addEventListener(ASK_COMMENT_USER, ask);
      return () => window.removeEventListener(ASK_COMMENT_USER, ask);
    }, [addDialog, setCommentUser]);

    return (
      <CanvasComments
        currentUserId={chrome.commentUser?.id ?? null}
        resolveAuthor={resolveAuthor}
      />
    );
  },
  StylePanel: (props) => {
    const chrome = useContext(CanvasChromeContext);
    return chrome.stylesVisible ? <DefaultStylePanel {...props} /> : null;
  },
};

export const canvasChromeAssetUrls: TLUiAssetUrlOverrides = {
  icons: {
    "styles-icon": "/styles.svg",
    "clone-icon": "/clone.svg",
    "refresh-icon": "/refresh.svg",
  },
};
