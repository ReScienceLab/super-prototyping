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
import { hasBrandMaterial } from "./canvasLibrary";
import type { CanvasFileShape } from "./CanvasFileShapeUtil";
import {
  Copy,
  Cross,
  Layers,
  LogoFigma,
  Message,
  RefreshCounterClockwise,
  SidebarLeft,
} from "./geistIcons";
import { WELCOME_PAGE_SLUG, brandPageUrl, sheetPageUrl } from "./canvasUrl";

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
 * forced dark back on the next reload. One theme, so no switch.
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
   * tldraw's own menu is gone. Everything in it is either somewhere better already, since the
   * app's export controls are in the bar beside it and cut, copy, paste and undo are on the
   * keyboard and in the context menu, or it is about editing a document nobody here owns. These
   * boards are written from files by a generator, so embedding a video in one, uploading media
   * to one, or picking a language for the app that renders it are eight submenus deep in
   * settings for something that cannot be edited from this side anyway.
   *
   * The slot holds the chat panel's switch instead. It is the leftmost thing in the top bar,
   * against the window's left edge, which is where the switch for the panel on that edge belongs.
   * In the panel's own header it would disappear along with the panel and need a second control
   * to undo it. Dev only, like the panel itself.
   */
  MainMenu: import.meta.env.DEV
    ? () => {
        const chrome = useContext(CanvasChromeContext);
        return (
          <TldrawUiButton
            type="icon"
            title={
              chrome.chatCollapsed
                ? "Open the chat panel"
                : "Collapse the chat panel"
            }
            onClick={chrome.toggleChat}
          >
            <TldrawUiButtonIcon icon={<SidebarLeft />} />
          </TldrawUiButton>
        );
      }
    : null,
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
   * Shape editing is gone from the top bar: undo, redo, delete and duplicate (QuickActions
   * below) and the overflow of aligns, distributes and reorders that `DefaultActionsMenu`
   * opens. These shapes are boards written from files, so six buttons for nudging them crowd
   * out the two the bar is for. The actions stay — the keyboard and the context menu have them.
   *
   * What is left is the two places a board goes next, and nothing else. Comment, clone and
   * force-relayout were here too and are on the right button now (ContextMenu below). They act on
   * whatever is under the cursor, or on the whole page, which is where a right-click already
   * points. A top bar of two destinations reads at a glance, and one of five does not.
   */
  ActionsMenu: () => {
    const editor = useEditor();
    const slug = useValue(
      "canvas slug",
      () => editor.getCurrentPage().meta.canvasSlug as string | undefined,
      [editor],
    );
    // Undefined on a page that collected no material — the welcome page, a folder someone has
    // only just started — and the button then opens the index of every page that did.
    const brandSlug = slug && hasBrandMaterial(slug) ? slug : undefined;

    return (
      <>
        {/* An anchor wearing the toolbar's button, not a button: this is a link to another page
            of the app, so ⌘-click, middle click and copy-link all have to work on it.
            Named for where the boards are going rather than for what the click does — an
            external-link arrow is a true description of it that tells nobody it is the way
            into Figma, which is what people are here to do with a mockup. */}
        {slug && (
          <a
            className="tlui-button sp-figma"
            href={sheetPageUrl(slug)}
            target="_blank"
            rel="noopener noreferrer"
            title="Open every board on this page as one web page — the page an importer such as html.to.design reads into Figma"
          >
            <LogoFigma />
            <span className="sp-figma__label">Export to Figma</span>
          </a>
        )}
        {/* The second destination, next to the first: the pictures a product publishes of
            itself. They are collected per page, so a page that collected none — the welcome
            page, a folder someone has only just started — still gets the button and opens the
            index of the ones that did. Every page has somewhere to go. */}
        {slug && (
          <a
            className="tlui-button sp-brand"
            href={brandPageUrl(brandSlug)}
            target="_blank"
            rel="noopener noreferrer"
            title={
              brandSlug
                ? "Open the brand kit collected for this page — the logos, social profiles, store listings and advertising this product publishes"
                : "Open the brand kits — the logos, social profiles, store listings and advertising these products publish, one kit per example"
            }
          >
            {/* A stack of sheets. Under 720px the label goes and the mark is the whole button,
                so it has to carry "brand kit" alone, and Geist's one picture frame says
                "images", which is every other button that ever held one. A kit is the stack. */}
            <Layers />
            <span className="sp-brand__label">Brand kit</span>
          </a>
        )}
      </>
    );
  },
  /** The undo, redo, delete and duplicate cluster, gone with the rest of the shape editing, since
   *  these boards are written from files. The comment button stood here alone for a while, and is
   *  on the right button with the other two now. */
  QuickActions: null,
  /**
   * The right button carries everything the top bar does not: commenting, the clone and the
   * relayout. The bottom toolbar is gone (Toolbar below) because a canvas of boards is read, not
   * drawn on, and all three of these act on what is under the cursor or on the page it is on,
   * which is what a right-click has already picked out. The top bar keeps the two links out.
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
          {import.meta.env.DEV && slug && slug !== WELCOME_PAGE_SLUG && (
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
        {import.meta.env.DEV && <CanvasAttachButtons />}
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
