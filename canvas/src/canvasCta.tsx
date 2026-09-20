import { Button } from "@/components/ui/button";
import { GITHUB_PATH } from "./canvasComments";
import "./canvasCta.css";

const REPO_URL = "https://github.com/ReScienceLab/super-prototyping";

/**
 * The one thing this whole repo is asking for, as a button. It lives in the top-right corner of
 * every page it serves — the canvas, and the brand pages, which are the same work read a second
 * way and reached from the same toolbar.
 *
 * It is Geist's primary button, the ground and the ink swapped, so the same element comes out
 * white on the canvas and black on the brand page with nothing here to keep in step.
 *
 * `canvas-cta-group` is the hook for the two rules that are not the Button's: brand.css pushes
 * it to the end of its topbar by it, and canvasCta.css sweeps a shimmer across it.
 */
export function CanvasCta() {
  return (
    <div className="canvas-cta-group pointer-events-auto mt-2.5 mr-3 flex max-[720px]:mt-2 max-[720px]:mr-2">
      <Button asChild size="lg" className="max-[720px]:px-3">
        <a
          href={REPO_URL}
          target="_blank"
          rel="noopener noreferrer"
          title="Star super-prototyping on GitHub"
        >
          {/* currentColor, so the mark is the button's ink in either theme. */}
          <svg
            viewBox="0 0 24 24"
            fill="currentColor"
            fillRule="evenodd"
            aria-hidden
          >
            <path d={GITHUB_PATH} />
          </svg>
          <span className="max-[720px]:hidden">Star on GitHub</span>
        </a>
      </Button>
    </div>
  );
}
