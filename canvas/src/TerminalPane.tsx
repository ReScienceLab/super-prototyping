import { FitAddon } from "@xterm/addon-fit";
import { Terminal } from "@xterm/xterm";
import "@xterm/xterm/css/xterm.css";
import { useEffect, useRef, useState } from "react";
import symbolsNerdFontUrl from "./assets/SymbolsNerdFontMono-Regular.ttf?url";

const symbolsNerdFont = new FontFace(
	"Symbols Nerd Font Mono",
	`url(${symbolsNerdFontUrl}) format('truetype')`,
);
document.fonts.add(symbolsNerdFont);

type ConnectionState = "connecting" | "connected" | "closed";

function socketUrl() {
	const token = document.querySelector<HTMLMetaElement>(
		'meta[name="prototyping-terminal-token"]',
	)?.content;
	if (!token) throw new Error("Terminal token is missing from the page");

	const url = new URL("/__terminal", window.location.href);
	url.protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
	url.searchParams.set("token", token);
	return url;
}

export function TerminalPane({ hidden = false }: { hidden?: boolean }) {
	const containerRef = useRef<HTMLDivElement>(null);
	const [connection, setConnection] = useState<ConnectionState>("connecting");
	const [session, setSession] = useState(0);

	useEffect(() => {
		const container = containerRef.current;
		if (!container) return;

		setConnection("connecting");
		const terminal = new Terminal({
			cursorBlink: true,
			fontFamily:
				'SFMono-Regular, "Symbols Nerd Font Mono", Menlo, Monaco, Consolas, monospace',
			fontSize: 13,
			minimumContrastRatio: 7,
			rescaleOverlappingGlyphs: true,
			scrollback: 5_000,
			theme: {
				background: "#191816",
				foreground: "#dedcd6",
				cursor: "#f4f3ef",
				selectionBackground: "#4a74ff66",
			},
		});
		const fit = new FitAddon();
		terminal.loadAddon(fit);
		terminal.open(container);

		let disposed = false;
		void symbolsNerdFont.load().then(() => {
			if (!disposed) terminal.refresh(0, terminal.rows - 1);
		});

		const socket = new WebSocket(socketUrl());
		const resize = () => {
			fit.fit();
			if (socket.readyState === WebSocket.OPEN) {
				socket.send(
					JSON.stringify({
						type: "resize",
						cols: terminal.cols,
						rows: terminal.rows,
					}),
				);
			}
		};
		const resizeObserver = new ResizeObserver(() =>
			requestAnimationFrame(resize),
		);
		resizeObserver.observe(container);

		socket.addEventListener("open", () => {
			setConnection("connected");
			resize();
			terminal.focus();
		});
		socket.addEventListener("message", (event) =>
			terminal.write(String(event.data)),
		);
		socket.addEventListener("close", () => setConnection("closed"));
		socket.addEventListener("error", () => setConnection("closed"));

		const input = terminal.onData((data) => {
			if (socket.readyState === WebSocket.OPEN) {
				socket.send(JSON.stringify({ type: "input", data }));
			}
		});

		return () => {
			disposed = true;
			input.dispose();
			resizeObserver.disconnect();
			socket.close();
			terminal.dispose();
		};
	}, [session]);

	return (
		<aside
			className={`terminal-panel${hidden ? " terminal-panel--hidden" : ""}`}
			aria-label="Worktree terminal"
			aria-hidden={hidden}
		>
			<header className="terminal-header">
				<div className="terminal-title">
					<span
						className={`terminal-status terminal-status--${connection}`}
						aria-hidden="true"
					/>
					<span>Terminal</span>
					<small>worktree shell</small>
				</div>
				{connection === "closed" ? (
					<button
						type="button"
						onClick={() => setSession((value) => value + 1)}
					>
						Reconnect
					</button>
				) : null}
			</header>
			<div ref={containerRef} className="terminal-surface" />
		</aside>
	);
}
