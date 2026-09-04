/**
 * Images imported straight from the repo rather than through `staticFile`.
 *
 * `Config.setPublicDir("../mockups")` points staticFile at the artboards, which
 * is right for boards and their art but leaves the figures in `assets/` — the
 * README's own — unreachable. rspack bundles an imported one as an asset and
 * hands back its URL; this declaration is what makes TypeScript agree.
 */
declare module "*.png" {
  const src: string;
  export default src;
}
