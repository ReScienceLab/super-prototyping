import {
  createContext,
  forwardRef,
  useContext,
  useEffect,
  useState,
} from "react";
import { createPortal } from "react-dom";
import {
  atom,
  type Atom,
  ConversionsMenuGroup,
  DefaultContextMenu,
  DefaultShapeWrapper,
  SelectAllMenuItem,
  TldrawUiButton,
  TldrawUiButtonIcon,
  type Editor,
  type TLComponents,
  type TLEventInfo,
  type TLShapeId,
  type TLShapeWrapperProps,
  type TLUiOverrides,
  TldrawUiMenuGroup,
  TldrawUiMenuCheckboxItem,
  TldrawUiMenuItem,
  TldrawUiMenuSubmenu,
  useDialogs,
  useEditor,
  useEditorPortalHost,
  useToasts,
  useValue,
} from "tldraw";
import {
  CanvasComments,
  CommentTool,
  commentToolOverrides,
} from "@tldraw/commenting";
import {
  CanvasAttachButtons,
  CanvasSelectionAttachButton,
} from "./canvasAttach";
import { CommentUserDialog } from "./CommentUserDialog";
import { GROUNDS, groundEditable, groundOf, setGround } from "./canvasGround";
import {
  linkedBoard,
  readCommentUser,
  resolveAuthor,
  type CommentUser,
} from "./canvasComments";
import { canvasIndex } from "./canvasIndex";
import {
  CANVAS_FILE_SHAPE_TYPE,
  type CanvasFileShape,
} from "./CanvasFileShapeUtil";
import {
  CANVAS_LINK_SHAPE_TYPE,
  type CanvasLinkShape,
} from "./CanvasLinkShapeUtil";
import {
  canvasBoardRef,
  canvasImageRef,
  readCanvasLibrary,
} from "./canvasLibrary";
import { HOME_TAB, isExample, pageOf, projectUrl } from "./canvasTabs";
import { setProjectCover } from "./contextMenu";
import { pointedElement } from "./cover";
import {
  Copy,
  Cross,
  Image,
  Message,
  RefreshCounterClockwise,
} from "./geistIcons";
import { asCanvasTarget, shapeUnderPointer } from "./inspectorClicks";
import { urlForSlug, windowUrl, type CanvasTab } from "./canvasUrl";

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
   * The view in front and the way to show another of this project's. A view is a canvas, which is
   * a tldraw page, or a kit, which is an overlay over the whole editor. Held by App, which owns
   * both.
   */
  activeTab: HOME_TAB,
  openTab: (_view: CanvasTab) => {},
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
  actions(_editor, actions) {
    delete actions["toggle-dark-mode"];
    return actions;
  },
  /**
   * Select and comment are the only modes left reachable — not just off the toolbar (`Toolbar:
   * null` below), off the keyboard too. `useTools()` is what both the toolbar and
   * `useKeyboardShortcuts` draw their entries from, so a tool missing here has no `kbd` left to
   * fire: this is the one table both paths read, and the boards on this canvas are read, not
   * drawn on, so draw, the geo shapes, arrow, line, frame, text, note, the asset picker, laser and
   * eraser have nothing to be reached for. Before this, a stray keypress on the canvas — "d" or
   * "b" for the draw tool chief among the reports — dropped the user into one of them with no
   * toolbar left to show what had changed or a click back to select from. Comment survives: its
   * own accidental-press case is already handled below (`InFrontOfTheCanvas` drops back to select
   * when its name dialog closes empty), and it is a deliberate feature, not a drawing tool.
   */
  tools(editor, tools, helpers) {
    const { select, comment } =
      commentToolOverrides.tools?.(editor, tools, helpers) ?? tools;
    return { select, comment };
  },
};

/**
 * The address of each selected shape, the one the window shows when it is open: a board or
 * picture by its hash (canvasUrl.ts), a card by where it goes. In the order tldraw reports the
 * selection, which is the order a paste of them attaches in (ChatPanel.tsx). A shape with no
 * address, a heading say, has none to add.
 */
function selectionLinks(editor: Editor) {
  const here = windowUrl(window.location.href);
  return editor.getSelectedShapes().flatMap((shape) => {
    if (shape.type === CANVAS_FILE_SHAPE_TYPE) {
      const file = readCanvasLibrary()
        .flat()
        .find((c) => c.path === (shape as CanvasFileShape).props.path);
      return file ? [urlForSlug(here, file.pageSlug, file.fileName)] : [];
    }
    if (shape.type === CANVAS_LINK_SHAPE_TYPE) {
      const { url, page } = (shape as CanvasLinkShape).props;
      return url ? [url] : page ? [urlForSlug(here, page)] : [];
    }
    const ref = canvasImageRef(shape.id);
    return ref ? [urlForSlug(here, ref.slug, ref.file)] : [];
  });
}

/**
 * Shapes the agent added that the reader has not pointed at yet. Kept in the tab's
 * sessionStorage, because the agent writing its next board reloads the canvas, and one board
 * should not lose its ring to the one after it. Keyed by path: every project is this origin.
 * Read on first use rather than at import, which the tests do with no window.
 */
let freshAtom: Atom<ReadonlySet<TLShapeId>> | undefined;
const freshKey = () => `sp-fresh:${location.pathname}`;
const freshShapes = () =>
  (freshAtom ??= atom(
    "fresh shapes",
    new Set(JSON.parse(sessionStorage.getItem(freshKey()) ?? "[]")),
  ));

function setFresh(fresh: ReadonlySet<TLShapeId>) {
  freshShapes().set(fresh);
  sessionStorage.setItem(freshKey(), JSON.stringify([...fresh]));
}

/** Rings `ids` in blue until the pointer passes over each, so the reader sees what just arrived. */
export function markFresh(ids: TLShapeId[]) {
  if (ids.length) setFresh(new Set([...freshShapes().get(), ...ids]));
}

export const canvasChromeComponents: TLComponents = {
  /**
   * tldraw's own element around each shape, with a class while the shape is fresh. The ring
   * and its fade are CSS (`.sp-fresh` in index.css), so nothing runs per frame. The same
   * wrapper draws the shape's background layer, which is left alone.
   */
  ShapeWrapper: forwardRef<HTMLDivElement, TLShapeWrapperProps>(
    function ShapeWrapper(props, ref) {
      const editor = useEditor();
      const { id } = props.shape;
      const fresh = useValue(
        "fresh shape",
        () => !props.isBackground && freshShapes().get().has(id),
        [props.isBackground, id],
      );
      // tldraw never hovers a locked shape, and every library shape is locked, so the pointer is
      // tested here the way the inspector tests it. Only while this shape is still ringed.
      useEffect(() => {
        if (!fresh) return;
        const seen = (info: TLEventInfo) => {
          if (info.name !== "pointer_move" || shapeUnderPointer(editor)?.id !== id) return;
          setFresh(new Set([...freshShapes().get()].filter((other) => other !== id)));
        };
        editor.on("event", seen);
        return () => void editor.off("event", seen);
      }, [editor, fresh, id]);
      return (
        <DefaultShapeWrapper
          ref={ref}
          {...props}
          className={fresh ? `${props.className ?? ""} sp-fresh` : props.className}
        />
      );
    },
  ),
  /**
   * tldraw's whole top-left bar is gone, and CanvasTabBar.tsx is drawn where it was. `MenuPanel`
   * is the strip itself: the main menu, the page menu, and the quick actions and actions menu
   * beside them. So one null takes all four, and nothing below has to say again that it is not
   * drawn.
   *
   * Each of the four for its own reason. The main menu was either somewhere better already,
   * since cut, copy, paste and undo are on the keyboard and in the context menu, or it was
   * about editing a document nobody here owns. A generator writes these boards from files, so
   * embedding a video in one, uploading media to one, or picking a language for the app that
   * renders it are eight submenus deep in settings for something that cannot be edited from
   * this side anyway. The page menu named the same folders the strip's tabs name now, and the
   * rest of what it offered, rename, duplicate and delete a page, acts on pages a folder
   * generates and the next load would put straight back. Quick actions and the actions menu
   * were shape editing: undo, redo, delete, duplicate and the overflow of aligns, distributes
   * and reorders. The actions stay on the keyboard and the right button; six buttons for
   * nudging a board crowd out the row of tabs the bar is for.
   *
   * Where the rest went: the chat panel's switch, which the main menu held, is the Agent button
   * at the start of the bar (ChatPanel.tsx), and Figma, which the actions menu held, is Export
   * to Figma at the end of the canvas strip (CanvasStrip.tsx). Commenting and
   * force-relayout were in this row once too and are on the right button now (ContextMenu
   * below), where the pointer is already on the thing they act on.
   */
  MenuPanel: null,
  /**
   * The right button carries everything the top bar does not: commenting, a shape's link and the
   * relayout. The bottom toolbar is gone (Toolbar below) because a canvas of boards is read, not
   * drawn on, and all three of these act on what is under the cursor or on the page it is on,
   * which is what a right-click has already picked out. The bar above keeps the tabs.
   */
  ContextMenu: (props) => {
    const chrome = useContext(CanvasChromeContext);
    const editor = useEditor();
    const links = useValue("shape links", () => selectionLinks(editor), [
      editor,
    ]);

    // ⌘C, this row's shortcut, arrives as the document's copy event rather than as a key: tldraw
    // leaves copy to the browser's own event and listens for it on the document, so this listens
    // first, in the capture phase, and keeps it from tldraw only when there is a link to copy.
    // tldraw's copy is its own shapes as JSON, for pasting into another tldraw, which a canvas
    // rebuilt from layout.json has no use for. A focus elsewhere, an input in the inspector say,
    // is that field's copy and not the canvas's.
    useEffect(() => {
      const copy = (event: ClipboardEvent) => {
        if (
          !editor.getInstanceState().isFocused ||
          editor.menus.hasAnyOpenMenus()
        )
          return;
        const links = selectionLinks(editor);
        if (!links.length || !event.clipboardData) return;
        event.clipboardData.setData("text/plain", links.join("\n"));
        event.preventDefault();
        event.stopPropagation();
      };
      document.addEventListener("copy", copy, true);
      return () => document.removeEventListener("copy", copy, true);
    }, [editor]);

    // "Set as cover", over a board, a brand image, or an element on the board the inspector has
    // open, which keeps the element in view and the board around it. The project has one cover,
    // so this replaces the last; its home card's menu puts the default back. Read as the menu
    // opens, so it is what the right-click was over. Not on an example, which is read-only.
    const { addToast } = useToasts();
    const over = asCanvasTarget(shapeUnderPointer(editor));
    const board =
      over?.type === CANVAS_FILE_SHAPE_TYPE
        ? canvasBoardRef((over as CanvasFileShape).props.path)
        : undefined;
    const cover = canvasIndex().project
      ? (board ?? (over && canvasImageRef(over.id)))
      : undefined;
    const element =
      board && pointedElement.current?.path === (over as CanvasFileShape).props.path
        ? pointedElement.current.box
        : undefined;

    // The canvas's ground, the strip's swatch as presets. Custom opens that swatch's picker.
    const page = chrome.activeTab.kind === "canvas" ? pageOf(chrome.activeTab) : undefined;
    const ground = page ? groundOf(page) : undefined;

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
          {links.length > 0 && (
            <TldrawUiMenuItem
              id="copy-link"
              label={links.length > 1 ? `Copy ${links.length} links` : "Copy link"}
              icon={<Copy />}
              kbd="cmd+c,ctrl+c"
              onSelect={() => void navigator.clipboard.writeText(links.join("\n"))}
            />
          )}
          {cover && !isExample(cover.slug) && (
            <TldrawUiMenuItem
              id="set-cover"
              label={element ? "Set element as cover" : "Set as cover"}
              icon={<Image />}
              onSelect={async () => {
                const path = `${cover.slug}/${cover.file}`;
                if (await setProjectCover(projectUrl(), { path, box: element }))
                  addToast({ title: "Project cover set", severity: "success" });
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
        {page && groundEditable(page) && (
          <TldrawUiMenuGroup id="ground">
            <TldrawUiMenuSubmenu id="ground" label="Background">
              {GROUNDS.map(([label, color]) => (
                <TldrawUiMenuCheckboxItem
                  key={color}
                  id={`ground-${color}`}
                  label={label}
                  checked={ground === color}
                  onSelect={() => setGround(editor, page, color)}
                />
              ))}
              <TldrawUiMenuCheckboxItem
                id="ground-custom"
                label="Custom…"
                checked={!GROUNDS.some(([, color]) => color === ground)}
                onSelect={() =>
                  document
                    .querySelector<HTMLInputElement>(".sp-canvas-tabs-ground input")
                    ?.showPicker()
                }
              />
            </TldrawUiMenuSubmenu>
          </TldrawUiMenuGroup>
        )}
        {/* tldraw's items one at a time, not its groups: this canvas is read, and every shape on
            it is locked and rebuilt from layout.json, so only what works on a locked shape is
            here. A group would bring Cut, Delete and Duplicate, greyed out on every shape here,
            and Paste, which drops shapes the next load removes; and whatever tldraw adds to it.
            Its Copy is Copy link above, which ⌘C is. */}
        <ConversionsMenuGroup />
        <TldrawUiMenuGroup id="select-all">
          <SelectAllMenuItem />
        </TldrawUiMenuGroup>
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
        {canvasIndex().served && <CanvasSelectionAttachButton />}
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
