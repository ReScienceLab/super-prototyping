/**
 * The glyphs this app uses, from Vercel's Geist icon set itself rather than a copy of it.
 * `geist-icons` publishes all 455 of them as one dependency-free ESM module, so nobody here
 * maintains a path string. Everything the canvas draws as a glyph comes through this file, which
 * is what keeps the top bar, the chat panel and the inspector on one set.
 *
 * Two things are added to each, and nothing else. The size, because Geist draws on a 16 grid and
 * the package defaults its components to 20, which is the one number every call site would
 * otherwise repeat. And `aria-hidden`, because every glyph here sits inside a control that
 * already carries its own name.
 */
import type { ComponentProps, ComponentType } from "react";
import {
  Box as GBox,
  Check as GCheck,
  ChevronDownSmall as GChevronDownSmall,
  ChevronRightSmall as GChevronRightSmall,
  ClockRewind as GClockRewind,
  Copy as GCopy,
  Cross as GCross,
  Eye as GEye,
  EyeOff as GEyeOff,
  File as GFile,
  FileText as GFileText,
  FolderPlus as GFolderPlus,
  Fullscreen as GFullscreen,
  Home as GHome,
  Image as GImage,
  Layers as GLayers,
  Layout as GLayout,
  LogoDiscord as GLogoDiscord,
  LogoFigma as GLogoFigma,
  LogoGithub as GLogoGithub,
  Message as GMessage,
  Pen as GPen,
  Plus as GPlus,
  RefreshCounterClockwise as GRefreshCounterClockwise,
  SidebarLeft as GSidebarLeft,
  TextTitle as GTextTitle,
} from "geist-icons";

type IconProps = ComponentProps<typeof GCheck>;

const at16 = (Icon: ComponentType<IconProps>) => (props: IconProps) => (
  <Icon size={16} aria-hidden {...props} />
);

export const Box = at16(GBox);
export const Check = at16(GCheck);
export const ChevronDownSmall = at16(GChevronDownSmall);
export const ChevronRightSmall = at16(GChevronRightSmall);
export const ClockRewind = at16(GClockRewind);
export const Copy = at16(GCopy);
export const Cross = at16(GCross);
export const Eye = at16(GEye);
export const EyeOff = at16(GEyeOff);
export const File = at16(GFile);
export const FileText = at16(GFileText);
export const FolderPlus = at16(GFolderPlus);
export const Fullscreen = at16(GFullscreen);
export const Home = at16(GHome);
export const Image = at16(GImage);
export const Layers = at16(GLayers);
export const Layout = at16(GLayout);
export const LogoDiscord = at16(GLogoDiscord);
/** Figma's mark, in Geist's own transcription of it, still in Figma's five colours. */
export const LogoFigma = at16(GLogoFigma);
export const LogoGithub = at16(GLogoGithub);
export const Message = at16(GMessage);
export const Pen = at16(GPen);
export const Plus = at16(GPlus);
export const RefreshCounterClockwise = at16(GRefreshCounterClockwise);
export const SidebarLeft = at16(GSidebarLeft);
export const TextTitle = at16(GTextTitle);
