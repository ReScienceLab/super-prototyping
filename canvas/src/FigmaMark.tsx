/**
 * Figma's own mark, on the two places that lead a board into it: the top bar's export button
 * and the sheet that button opens. Their brand geometry — five shapes of one radius on a
 * 38 x 57 grid, in their five colours — drawn here rather than fetched, like every other icon
 * in this app. Its own module because the sheet page must not import the canvas's chrome, and
 * with it tldraw, to show a logo.
 */
export function FigmaMark({ height = 16 }: { height?: number }) {
  return (
    <svg viewBox="0 0 38 57" height={height} width={(height * 2) / 3} aria-hidden>
      <path fill="#1abcfe" d="M19 28.5a9.5 9.5 0 1 1 19 0 9.5 9.5 0 0 1-19 0z" />
      <path fill="#0acf83" d="M0 47.5A9.5 9.5 0 0 1 9.5 38H19v9.5a9.5 9.5 0 1 1-19 0z" />
      <path fill="#ff7262" d="M19 0v19h9.5a9.5 9.5 0 1 0 0-19H19z" />
      <path fill="#f24e1e" d="M0 9.5A9.5 9.5 0 0 0 9.5 19H19V0H9.5A9.5 9.5 0 0 0 0 9.5z" />
      <path fill="#a259ff" d="M0 28.5A9.5 9.5 0 0 0 9.5 38H19V19H9.5A9.5 9.5 0 0 0 0 28.5z" />
    </svg>
  );
}
