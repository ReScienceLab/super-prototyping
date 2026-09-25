#!/usr/bin/env python3
"""Seedance 2.5 on 火山方舟 (Volcengine Ark): submit one take, poll it, download the mp4.

    python3 ark.py --prompt-file prompt.txt [--image ref.png ...] [--video URL] \
        [--res 720p] [--dur 10] [--tag walk] [-o out]

Reference images go inline as base64. A reference *video* does not: Ark rejects
a data: URI on `video_url`, so `--video` takes a URL Ark's servers can fetch
(references/reference-video.md says how to make one, and how to take it down).

The key comes from ARK_API_KEY, or from a key file (default `.ark_key` beside
the current directory, chmod 600). It is never printed, and neither is the
request body unless you ask for --dry.

Writes `<tag>-N.mp4` and `<tag>-N.json` into the output directory, numbered
past the highest N already there, so two takes never overwrite each other. The
JSON carries the prompt and the task's own record: seed, usage, duration. That
is the only account of what produced a clip, and a take is worth real money, so
it is written before anything else is printed.

Stdlib only: a generation runs for minutes and the poll must outlive a flaky
network, not a dependency install.
"""
import argparse, base64, json, mimetypes, os, re, sys, time, urllib.error, urllib.request
from pathlib import Path

BASE = "https://ark.cn-beijing.volces.com/api/v3/contents/generations/tasks"
MODEL = "doubao-seedance-2-5-260628"     # Doubao-Seedance-2.5, 开通 it in 方舟 → 模型广场 first


def data_uri(p: Path) -> str:
    kind = mimetypes.guess_type(p.name)[0] or "image/png"
    return "data:%s;base64,%s" % (kind, base64.b64encode(p.read_bytes()).decode())


def call(method, url, key, body=None):
    req = urllib.request.Request(
        url, method=method, data=json.dumps(body).encode() if body else None,
        headers={"Content-Type": "application/json", "Authorization": "Bearer " + key})
    try:
        with urllib.request.urlopen(req, timeout=120) as r:
            return json.load(r)
    except urllib.error.HTTPError as e:
        # 429 and 5xx are Ark asking to come back, not the request being wrong. HTTPError is a
        # URLError, so raising one lands in the poll loop's retry branch below, where a task that
        # has already been paid for is never given up on. Every other code fails here: it will
        # fail the same way next time.
        if e.code == 429 or e.code >= 500:
            raise
        sys.exit("HTTP %s: %s" % (e.code, e.read().decode()[:800]))


def main():
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--prompt-file", type=Path, help="the prompt, as a file (keep it beside the take)")
    ap.add_argument("--prompt", help="the prompt inline, for a one-liner")
    ap.add_argument("--image", type=Path, action="append", default=[], metavar="PNG",
                    help="reference image, inline; repeat in the order the prompt calls 图片1, 图片2 …")
    ap.add_argument("--video", metavar="URL", help="reference video Ark can fetch; the take is built around it")
    ap.add_argument("--res", default="720p", choices=["480p", "720p", "1080p"])
    ap.add_argument("--ratio", default="16:9")
    ap.add_argument("--dur", type=int, default=10, help="seconds: 5, 10 or 15")
    ap.add_argument("--seed", type=int, help="repeat a take you liked, or vary one you did not")
    ap.add_argument("--no-audio", action="store_true", help="skip the generated ambience")
    ap.add_argument("--model", default=MODEL)
    ap.add_argument("--key-file", type=Path, default=Path(".ark_key"))
    ap.add_argument("--tag", default="take", help="output basename; takes are numbered within it")
    ap.add_argument("-o", "--out", type=Path, default=Path("out"))
    ap.add_argument("--dry", action="store_true", help="print the request, base64 elided, and send nothing")
    a = ap.parse_args()

    if bool(a.prompt_file) == bool(a.prompt):
        sys.exit("give the prompt once: --prompt-file FILE or --prompt TEXT")
    prompt = a.prompt if a.prompt else a.prompt_file.read_text(encoding="utf-8").strip()

    content = [{"type": "text", "text": prompt}]
    for p in a.image:
        content.append({"type": "image_url", "image_url": {"url": data_uri(p)}, "role": "reference_image"})
    if a.video:
        content.append({"type": "video_url", "video_url": {"url": a.video}, "role": "reference_video"})
    body = {"model": a.model, "content": content, "generate_audio": not a.no_audio,
            "ratio": a.ratio, "resolution": a.res, "duration": a.dur, "watermark": False}
    if a.seed is not None:
        body["seed"] = a.seed

    if a.dry:
        elide = lambda c: c if c["type"] == "text" else {
            **c, c["type"]: {"url": "<%s, %d B inline>" % (c[c["type"]]["url"][:20], len(c[c["type"]]["url"]))
                             if c[c["type"]]["url"].startswith("data:") else c[c["type"]]["url"]}}
        print(json.dumps(dict(body, content=[elide(c) for c in content]), ensure_ascii=False, indent=1))
        return

    key = os.environ.get("ARK_API_KEY") or (
        a.key_file.read_text().strip() if a.key_file.is_file() else
        sys.exit("no key: set ARK_API_KEY or put it in %s (chmod 600)" % a.key_file))
    a.out.mkdir(parents=True, exist_ok=True)
    # The highest number already used, not how many there are: a gap in the series, from a take
    # deleted or one that failed after its JSON was written, would otherwise take a number back
    # and overwrite the record of a clip that cost money.
    used = [int(m[1]) for f in a.out.glob(a.tag + "-*")
            if (m := re.fullmatch(re.escape(a.tag) + r"-(\d+)", f.stem))]
    n = 1 + max(used, default=0)

    t0 = time.time()
    try:
        tid = call("POST", BASE, key, body)["id"]
    except urllib.error.HTTPError as e:   # nothing is running yet, so a busy server is just a no
        sys.exit("HTTP %s submitting the take: %s" % (e.code, e.read().decode()[:800]))
    print("task", tid, file=sys.stderr)
    while True:
        time.sleep(10)
        try:
            st = call("GET", BASE + "/" + tid, key)
        except (urllib.error.URLError, TimeoutError, OSError) as e:
            # A dropped poll must never abandon a paid task: the id is the only handle on it. A
            # 429 or a 5xx arrives here too, raised by `call` for this reason.
            print("   poll failed, retrying:", e, file=sys.stderr)
            continue
        print("  ", st.get("status"), round(time.time() - t0), "s", file=sys.stderr)
        if st.get("status") in ("succeeded", "failed", "cancelled", "expired"):
            break
    if st.get("status") != "succeeded":
        sys.exit(json.dumps(st, ensure_ascii=False)[:1500])

    record = {"request": {k: v for k, v in body.items() if k != "content"},
              "prompt": prompt,
              "images": [str(p) for p in a.image], "video": a.video,
              "result": st, "seconds": round(time.time() - t0)}
    (a.out / ("%s-%d.json" % (a.tag, n))).write_text(
        json.dumps(record, ensure_ascii=False, indent=1), encoding="utf-8")
    mp4 = a.out / ("%s-%d.mp4" % (a.tag, n))
    urllib.request.urlretrieve(st["content"]["video_url"], mp4)
    print("wrote", mp4, "seed", st.get("seed"), "usage", st.get("usage"), "in", record["seconds"], "s")


if __name__ == "__main__":
    main()
