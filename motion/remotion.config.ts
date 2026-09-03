import { Config } from "@remotion/cli/config";

Config.setRspack(true);
Config.setVideoImageFormat("jpeg");
Config.setOverwriteOutput(true);

// The artboards and their assets are the raw material for these videos: a film
// iframes `canvases/luma-ios/*.html`, a template reads
// `canvases/apple-photos/assets/photos/*.jpg`. Pointing the public dir at
// mockups/ is what makes staticFile("canvases/...") resolve, and it is why
// motion/ is a sibling of mockups/ rather than a folder inside it.
Config.setPublicDir("../mockups");
