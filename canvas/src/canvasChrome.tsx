import { createContext, useContext, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  DefaultContextMenu,
  DefaultContextMenuContent,
  TldrawUiButton,
  TldrawUiButtonIcon,
  type Editor,
  type TLComponents,
  type TLUiOverrides,
  TldrawUiMenuGroup,
  TldrawUiMenuItem,
  useDialogs,
  useEditor,
  useEditorPortalHost,
  useValue,
} from "tldraw";
import {
  CanvasComments,
  CommentTool,
  commentToolOverrides,
} from "@tldraw/commenting";
import { CanvasAttachButtons } from "./canvasAttach";
import { CloneCanvasDialog } from "./CloneCanvasDialog";
import { CommentUserDialog } from "./CommentUserDialog";
import {
  linkedBoard,
  readCommentUser,
  resolveAuthor,
  type CommentUser,
} from "./canvasComments";
import { CanvasCta } from "./canvasCta";
import { canvasIndex } from "./canvasIndex";
import type { CanvasFileShape } from "./CanvasFileShapeUtil";
import { HOME_TAB } from "./canvasTabs";
import {
  Copy,
  Cross,
  Message,
  RefreshCounterClockwise,
} from "./geistIcons";
import { WELCOME_PAGE_SLUG, type CanvasTab } from "./canvasUrl";

/** One dialog, whether the comment tool raised it or the inspector's composer did. */
const COMMENT_USER_DIALOG = "comment-user";

/**
 * Ask for the commenter's identity from outside the tldraw UI context. `useDialogs` is only
 * available under `<Tldraw>`, and the inspector panel is a sibling of it, so the panel raises
 * this and the comments layer, which is inside, opens the one dialog there is.
 */
export const ASK_COMMENT_USER = "sp:ask-comment-user";

export const CanvasChromeContext = createContext({
  relayoutLibrary: () => {},
  /** The mounted editor, for the parts of the app that render outside `<Tldraw>`. */
  editor: null as Editor | null,
  /** Who this browser comments as, or null until they have typed a name. */
  commentUser: null as CommentUser | null,
  setCommentUser: (_user: CommentUser) => {},
  /** Open a board in the inspector, for the parts of the canvas that link to one. */
  inspectBoard: (_board: CanvasFileShape) => {},
  /**
   * The board the inspector has open, by path. It is the one board on the canvas that runs the
   * inspect agent and takes the pointer, so picking an element happens on the mockup itself.
   */
  inspectingPath: null as string | null,
  /** Whether the inspector is docked at all, over a board or over a piece of brand material. */
  inspectorOpen: false,
  /**
   * Whether the chat panel is shut, and the switch for it. Held by App, because the button that
   * works it is in the canvas's top bar and the panel it works on is the bar's sibling.
   */
  chatCollapsed: false,
  toggleChat: () => {},
  /**
   * The bar above the canvas (CanvasTabBar.tsx): what is open besides Start here, which of them
   * is in front, and the two things a chip does. Held by App, because a canvas tab is a tldraw
   * page and a brand tab is an overlay over the whole editor, and App owns both.
   */
  tabs: [] as CanvasTab[],
  activeTab: HOME_TAB,
  openTab: (_tab: CanvasTab) => {},
  closeTab: (_tab: CanvasTab) => {},
  /** Hands that board's frame to the panel, which reads its report and posts the selection back. */
  setInspectorFrame: (_frame: HTMLIFrameElement | null) => {},
});

/**
 * The comment tool, plus the one thing this canvas adds to a thread: the link it carries to the
 * mockup it is about. Every comment placed on a board, or in the margin beside one, is anchored
 * to that board's shape, which is what moves the note with the mockup when a layout.json edit
 * moves it. The header shows that link, and follows it: clicking opens the board in the inspector.
 *
 * Everywhere, built canvas included. Where the comment goes differs, a dev server writes it into
 * the board's folder and a hosted canvas keeps it in the browser (canvasComments.ts), but the tool
 * and the thread are the same, so someone trying the hosted canvas sees what commenting is like.
 */
export const canvasCommentTools = [
  CommentTool.configure({
    components: {
      ThreadActions: ({ thread }) => {
        const chrome = useContext(CanvasChromeContext);
        const editor = useEditor();
        const board = useValue(
          "linked board",
          () => linkedBoard(editor, thread.anchor),
          [editor, thread.anchor],
        );
        // A note dropped out in open canvas is linked to nothing, and says so by showing nothing.
        if (!board) return null;
        return (
          <TldrawUiButton
            type="icon"
            title={`Linked to ${board.props.name}. Click to open it`}
            onClick={() => chrome.inspectBoard(board)}
          >
            <TldrawUiButtonIcon icon="link" />
          </TldrawUiButton>
        );
      },
    },
  }),
];

/**
 * The toolbar entry for that tool, and one action fewer. tldraw keeps Cmd+/ bound to
 * `toggle-dark-mode` with its menu gone, and everything drawn here is dark only: the ground remap
 * in index.css is scoped to `.tl-theme__dark`, the welcome board's black art and the panels'
 * tokens are unconditional. A press left a near-white canvas under a black rail, and App.tsx
 * forced dark back on the next reload. One theme, so no switch: App.tsx's write at mount is
 * the theme, and this takes away the one way left of leaving it. Deleting the action is enough
 * because the shortcut table and the shortcuts dialog both draw from this map — the dialog's
 * item renders nothing for an action that is not there — and the colour-scheme menu lives only
 * in tldraw's main menu, which `MenuPanel` below takes away. This tldraw exports no user-preference
 * hook to pin the scheme with; if one arrives, it is the single mechanism to move to.
 */
export const canvasUiOverrides: TLUiOverrides = {
  ...commentToolOverrides,
  actions(_editor, actions) {
    delete actions["toggle-dark-mode"];
    return actions;
  },
};

export const canvasChromeComponents: TLComponents = {
  /**
   * tldraw's whole top-left bar is gone, and CanvasTabBar.tsx is what stands where it stood.
   * `MenuPanel` is the strip itself — the main menu, the page menu, and the quick actions and
   * actions menu beside them — so one null takes all four, and nothing below has to say again
   * that it is not drawn.
   *
   * Each of the four for its own reason. The main menu was either somewhere better already,
   * since cut, copy, paste and undo are on the keyboard and in the context menu, or it was
   * about editing a document nobody here owns: these boards are written from files by a
   * generator, so embedding a video in one, uploading media to one, or picking a language for
   * the app that renders it are eight submenus deep in settings for something that cannot be
   * edited from this side anyway. The page menu named the same folders the bar's chips name
   * now, and the rest of what it offered — rename, duplicate, delete a page — acts on pages a
   * folder generates and the next load would put straight back. Quick actions and the actions
   * menu were shape editing: undo, redo, delete, duplicate and the overflow of aligns,
   * distributes and reorders. The actions stay on the keyboard and the right button; six
   * buttons for nudging a board crowd out the row of tabs the bar is for.
   *
   * What the bar took over with them: the chat panel's switch, which the main menu held, and
   * the two chips that name where a page goes next, Figma and the brand kit, which the actions
   * menu held. They are in CanvasTabBar.tsx unchanged. Commenting, cloning and force-relayout
   * were in this row once too and are on the right button now (ContextMenu below), where the
   * pointer is already on the thing they act on.
   */
  MenuPanel: null,
  /**
   * The two CTAs, pinned to the viewport's top-right corner rather than drawn on the welcome
   * board, so they are there on every page and do not scroll away with the canvas. `SharePanel`
   * is tldraw's own slot for exactly this: it renders in `.tlui-layout__top__right`, above the
   * style panel, which is where a tldraw app puts its share and account controls.
   *
   * The inspector docks into the same row and narrows the canvas under it, which would slide the
   * pair left and clip it. They are an invitation, not a tool, so the one that goes is them.
   */
  SharePanel: () => {
    if (useContext(CanvasChromeContext).inspectorOpen) return null;
    return <CanvasCta />;
  },
  /**
   * The right button carries everything the top bar does not: commenting, the clone and the
   * relayout. The bottom toolbar is gone (Toolbar below) because a canvas of boards is read, not
   * drawn on, and all three of these act on what is under the cursor or on the page it is on,
   * which is what a right-click has already picked out. The bar above keeps the tabs.
   */
  ContextMenu: (props) => {
    const chrome = useContext(CanvasChromeContext);
    const editor = useEditor();
    const { addDialog } = useDialogs();
    const slug = useValue(
      "canvas slug",
      () => editor.getCurrentPage().meta.canvasSlug as string | undefined,
      [editor],
    );

    return (
      <DefaultContextMenu {...props}>
        <TldrawUiMenuGroup id="canvas">
          {/* The tool's own registration (canvasUiOverrides) is what binds the `c` key. This
              is only the row, spelled out rather than taken from it, because a registered tool
              names its icon by id, and the set the rest of this app draws from is components. */}
          <TldrawUiMenuItem
            id="comment"
            label="Comment"
            icon={<Message />}
            kbd="c"
            onSelect={() => {
              editor.setCurrentTool("comment");
            }}
          />
          {/* Nothing to copy on the welcome page, which the app draws and no folder backs, or on
              a page someone added by hand. */}
          {canvasIndex().served && slug && slug !== WELCOME_PAGE_SLUG && (
            <TldrawUiMenuItem
              id="clone"
              label="Clone this canvas"
              icon={<Copy />}
              onSelect={() => {
                addDialog({
                  component: (dialog) => (
                    <CloneCanvasDialog {...dialog} slug={slug} />
                  ),
                });
              }}
            />
          )}
          <TldrawUiMenuItem
            id="relayout"
            label="Force refresh"
            icon={<RefreshCounterClockwise />}
            onSelect={chrome.relayoutLibrary}
          />
        </TldrawUiMenuGroup>
        <DefaultContextMenuContent />
      </DefaultContextMenu>
    );
  },
  /** No drawing tools: the boards are the content, and the tools that are not for drawing are in
   *  the top bar and the right button. Keyboard shortcuts still reach the ones tldraw ships. */
  Toolbar: null,
  /** No zoom readout and no minimap: zooming is the trackpad, ⌘+ and ⌘-, and ⇧1 to fit, none of
   *  which the widget was doing. It sat in the bottom-left corner, which is where the chat panel
   *  ends, so the one thing it did reliably was crowd the composer. */
  NavigationPanel: null,
  /**
   * The comments layer: pins, thread popovers and the composer the comment tool opens. Where they
   * are stored, in the board folder and in Git, and how a pin snaps onto the mockup beside it, is
   * all canvasComments.ts; this is only the UI.
   *
   * And the buttons that hand a board or a picture to the chat panel (canvasAttach.tsx), which
   * live here for the same reason: both are drawn over the canvas in screen pixels.
   */
  InFrontOfTheCanvas: () => {
    const chrome = useContext(CanvasChromeContext);
    const editor = useEditor();
    const { addDialog } = useDialogs();
    const tool = useValue("tool", () => editor.getCurrentToolId(), [editor]);
    const setCommentUser = chrome.setCommentUser;
    const host = useEditorPortalHost();
    const [composer, setComposer] = useState<Element | null>(null);

    // A dismiss for the placement composer, which the toolkit gives no slot on. Picking the
    // comment tool by accident, a stray `c` or a right-click menu misread, leaves a bubble open
    // whose only ways out are Escape and a click into empty canvas, neither of which is on screen.
    // The composer is a direct child of the editor's portal host, so watching that one node's
    // child list finds it, at a querySelector per popover.
    useEffect(() => {
      if (!host) return;
      const find = () =>
        setComposer(host.querySelector(".tlui-cmt-canvas-composer"));
      find();
      const observer = new MutationObserver(find);
      observer.observe(host, { childList: true });
      return () => observer.disconnect();
    }, [host]);

    // An anonymous viewer gets no composer, so picking the comment tool without a name would do
    // nothing at all. Ask for one instead, and drop back to select if they would rather not.
    useEffect(() => {
      if (tool !== "comment" || chrome.commentUser) return;
      addDialog({
        id: COMMENT_USER_DIALOG,
        component: (dialog) => (
          <CommentUserDialog {...dialog} onSave={chrome.setCommentUser} />
        ),
        // Only when they closed it without giving a name, since saving one should leave them in
        // the tool they just picked. Read back rather than trusting the value this effect captured.
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
          component: (dialog) => (
            <CommentUserDialog {...dialog} onSave={setCommentUser} />
          ),
        });
      window.addEventListener(ASK_COMMENT_USER, ask);
      return () => window.removeEventListener(ASK_COMMENT_USER, ask);
    }, [addDialog, setCommentUser]);

    return (
      <>
        <CanvasComments
          // Null until a handle is typed: the toolkit's own read-only mode, which is what an
          // anonymous viewer gets until the dialog above has an answer.
          currentUserId={chrome.commentUser?.id ?? null}
          resolveAuthor={resolveAuthor}
        />
        {/* Dev only, like the panel they hand things to. */}
        {canvasIndex().served && <CanvasAttachButtons />}
        {/* Out of the tool as well as the bubble. Escape closes only the bubble and leaves the
            next click placing another one, which is not what an accidental comment wants. The
            draft is kept either way, so a real comment interrupted here is there next time. */}
        {composer &&
          createPortal(
            <TldrawUiButton
              type="icon"
              title="Close"
              className="canvas-composer-close"
              onClick={() => editor.setCurrentTool("select")}
            >
              <Cross />
            </TldrawUiButton>,
            composer,
          )}
      </>
    );
  },
  StylePanel: null,
};
