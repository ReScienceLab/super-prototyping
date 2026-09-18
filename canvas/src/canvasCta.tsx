import { Button } from "@/components/ui/button";
import { GITHUB_PATH } from "./canvasComments";
import "./canvasCta.css";

const REPO_URL = "https://github.com/ReScienceLab/super-prototyping";
/** The app the snapaction-ios boards are cloned from: its own site, not the App Store listing. */
const SNAPACTION_URL = "https://snapaction.ai/";

/**
 * The two things this whole repo is asking for, as a pair of buttons. They live in the top-right
 * corner of every page it serves — the canvas, and the brand pages, which are the same work read
 * a second way and reached from the same toolbar.
 *
 * Both are Geist's primary button — the ground and the ink swapped — so the same two elements
 * come out white on the canvas and black on the brand page with nothing here to keep in step.
 * The second is not the secondary button: these are the two asks, not an ask and an aside, and
 * a hairline chip beside a solid one reads as the lesser of them.
 *
 * `canvas-cta-group` is the hook for the two rules that are not the Button's: brand.css pushes
 * the pair to the end of its topbar by it, and canvasCta.css sweeps a shimmer across them.
 */
export function CanvasCta() {
  return (
    <div className="canvas-cta-group pointer-events-auto mt-2.5 mr-3 flex gap-2.5 max-[720px]:mt-2 max-[720px]:mr-2 max-[720px]:gap-2">
      <Button asChild size="lg" className="max-[720px]:px-3">
        <a
          href={SNAPACTION_URL}
          target="_blank"
          rel="noopener noreferrer"
          title="Try SnapAction, the app the example boards are cloned from"
        >
          {/* The app's own mark, cut from its symbolset by snapaction-ios/gen.py — as a mask
              rather than a picture, because the file is a fixed near-white and the ink it sits
              in is black here. Masked, it is whatever the button's ink is. */}
          <span
            aria-hidden
            className="shrink-0"
            style={{
              width: 23,
              height: 18,
              background: "currentColor",
              WebkitMask: "url(/snapaction.svg) center / contain no-repeat",
              mask: "url(/snapaction.svg) center / contain no-repeat",
            }}
          />
          <span className="max-[720px]:hidden">Try SnapAction</span>
          <span
            aria-hidden
            className="text-muted-foreground max-[720px]:hidden"
          >
            &#8599;
          </span>
        </a>
      </Button>
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
