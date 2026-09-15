import "./canvasCta.css";
import { GITHUB_PATH } from "./canvasComments";

const REPO_URL = "https://github.com/ReScienceLab/super-prototyping";
/** The app the snapaction-ios boards are cloned from: its own site, not the App Store listing. */
const SNAPACTION_URL = "https://snapaction.ai/";

/**
 * The two things this whole repo is asking for, as a pair of pills. They live in the top-right
 * corner of every page it serves — the canvas, and the brand pages, which are the same work read
 * a second way and reached from the same toolbar.
 *
 * The pill itself (size, type, the shimmer, and how it collapses to its mark on a phone) is
 * .canvas-cta in canvasCta.css; what stays here is each one's own colour.
 */
export function CanvasCta() {
  return (
    <div className="canvas-cta-group">
      <a
        href={SNAPACTION_URL}
        target="_blank"
        rel="noopener noreferrer"
        title="Try SnapAction, the app the example boards are cloned from"
        className="canvas-cta"
        style={{
          border: "1px solid #4A4A56",
          background: "linear-gradient(180deg,#2A2A32,#17171C)",
          boxShadow:
            "0 6px 18px rgba(0,0,0,.45), inset 0 1px 0 rgba(255,255,255,.10)",
        }}
      >
        {/* The app's own mark, cut from its symbolset by snapaction-ios/gen.py. */}
        <img src="/snapaction.svg" width={23} height={18} alt="" />
        <span className="canvas-cta__label">Try SnapAction</span>
        <span className="canvas-cta__arrow" style={{ color: "#8A8781" }}>
          &#8599;
        </span>
      </a>
      <a
        href={REPO_URL}
        target="_blank"
        rel="noopener noreferrer"
        title="Star super-prototyping on GitHub"
        className="canvas-cta"
        style={{
          border: "1px solid #6E9BFF",
          background: "linear-gradient(180deg,#4A85FF,#1B47D2)",
          // The glow is the point: this is the one thing on the page asking for something, so
          // it reads as a lit button rather than another piece of grey chrome.
          boxShadow:
            "0 0 0 4px rgba(74,133,255,.20), 0 8px 24px rgba(37,99,235,.55), inset 0 1px 0 rgba(255,255,255,.28)",
        }}
      >
        <svg
          viewBox="0 0 24 24"
          width="19"
          height="19"
          fill="#FFD666"
          aria-hidden
        >
          <path d="M12 2.6l2.9 5.9 6.5.95-4.7 4.6 1.1 6.45L12 17.45 6.2 20.5l1.1-6.45-4.7-4.6 6.5-.95z" />
        </svg>
        <span className="canvas-cta__label">Star on GitHub</span>
        <svg
          viewBox="0 0 24 24"
          width="18"
          height="18"
          fill="#FFFFFF"
          fillRule="evenodd"
          aria-hidden
        >
          <path d={GITHUB_PATH} />
        </svg>
      </a>
    </div>
  );
}
