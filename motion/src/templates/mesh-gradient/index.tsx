/*
 * Mesh gradient: the warm ground the reference film puts under most of its
 * shots, plus the hard diagonal light band that crosses it.
 *
 * There is no component here because there is nothing to add — the whole effect
 * lives in src/lib/Gradient.tsx, where the other templates import it from. This
 * folder exists so the ground is scrubbable and renderable on its own, which is
 * how you check a change to it without re-rendering nine other templates.
 *
 * See ./README.md for the two measurements (35 degrees, 33% of the width,
 * ease-out cubic over 40 frames) and how to reproduce them.
 */
import { Gradient, type GradientProps, MESH } from "../../lib/Gradient";

export { default as meta } from "./meta.json";
export const Component = Gradient;
// Nothing to override any more. The measured ramp and the empty blob list
// started here, as this folder's correction to `MESH`; once the film showed
// that every shot importing `MESH` wanted them too, they moved into the lib.
export const defaultProps: GradientProps = MESH;
