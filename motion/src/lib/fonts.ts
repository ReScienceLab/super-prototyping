import { loadFont as loadSans } from "@remotion/google-fonts/Inter";
import { loadFont as loadSerif } from "@remotion/google-fonts/InstrumentSerif";

/**
 * Two faces, loaded through @remotion/google-fonts because that is the only
 * loader that holds the render open until the file is in: a bare @font-face
 * lets a worker draw a frame in the fallback face and the render comes out
 * with two different typefaces in it, depending on which worker was warm.
 *
 * The reference film sets its display lines in a licensed face — moderate
 * contrast, single-storey `g` with an open tail, the 2024 brand-film serif,
 * almost certainly PP Editorial New. It is not redistributable and it is not on
 * Google Fonts. Instrument Serif is the closest free face on the same idea, and
 * substituting it is the same call the repo already makes about the clip: the
 * measurements are reproducible, the third-party asset is not shipped.
 *
 * The UI face is a neutral grotesk, which Inter matches closely enough that the
 * distinction is not worth a second substitution note.
 *
 * Both are pinned to the latin subset and the weights the templates actually
 * set. Left unpinned, Inter alone fires 126 requests for every weight and every
 * subset at the head of every render — slow, and a render on a machine that
 * cannot reach fonts.gstatic.com silently comes out in the fallback face.
 */
export const SERIF = loadSerif("normal", {
  weights: ["400"],
  subsets: ["latin"],
}).fontFamily;

export const SANS = loadSans("normal", {
  weights: ["400", "500", "600"],
  subsets: ["latin"],
}).fontFamily;
