"""Emit mockups/canvases/notion-ios/ from measurements of ten Mobbin captures.

Ten screens of Notion iOS: the splash, search and the AI chat, a meeting page,
the date and share sheets, and the four-screen flow that adds a data source to
a database. The measurements behind the tokens are in probes.json.

    python3 mockups/canvases/notion-ios/gen.py

The NN-*.html artboards are output. Edit this file, never the HTML.

The captures show no Dynamic Island -- Mobbin shoots on a device that has none
-- but every board in this repo draws one, so the frame keeps it. It is this
repo's framing, not a property of the app.
"""
from pathlib import Path

OUT = Path(__file__).resolve().parent


def page(title, css, body):
    """One board. TOKENS is byte-identical in every file: the canvas renders
    each artboard in <iframe srcDoc sandbox="">, which blocks external CSS."""
    return ('<!DOCTYPE html>\n<html lang="en">\n<head>\n<meta charset="UTF-8">\n'
            "<title>%s</title>\n<style>\n%s\n\n%s%s</style>\n</head>\n<body>\n"
            "%s\n\n</body>\n</html>\n"
            % (title, TOKENS, BASE, css, body.replace("  <!--sb-->\n", SB)))


def write(name, title, css, body):
    (OUT / (name + ".html")).write_text(page(title, css, body))
    print("%-28s %6d B" % (name + ".html", len((OUT / (name + ".html")).read_bytes())))


# ------------------------------------------------------------------ tokens ---
TOKENS = """/* ============================================================================
   NOTION iOS — DESIGN TOKENS  (single source of truth, inlined in every file
   because the canvas renders each mockup in <iframe srcDoc sandbox="">, which
   blocks external stylesheets. Keep this block byte-identical across files.)
   Values sampled from Notion iOS 3x screenshots (393 x 852 pt @3x).
   ========================================================================= */
:root{
  --n-font:-apple-system,BlinkMacSystemFont,"SF Pro Text","SF Pro Display","Helvetica Neue",Helvetica,Arial,sans-serif;

  /* Surface */
  --n-bg:#FFFFFF;          /* document / full-screen page                */
  --n-bg-sheet:#FAF8F6;    /* modal sheet ground (warm off-white)        */
  --n-bg-card:#FFFFFF;     /* grouped card sitting on a sheet            */
  --n-scrim:#E0E0E0;       /* app dimmed behind a light sheet            */
  --n-scrim-strong:#C4C4C4;/* app dimmed behind the AI sheet             */
  --n-fill:#EAE9E7;        /* search field, segmented track, icon tile   */
  --n-fill-neutral:#F0F0F0;/* chip / icon button on a white page         */
  --n-fill-soft:#FDFDFD;   /* raised field on white (search, composer)   */
  --n-hairline:#E9E8E7;    /* row divider                                */
  --n-border:#EFEEEC;      /* card + field outline                       */
  --n-track:#F0EEED;       /* switch track, off                          */

  /* Ink */
  --n-text:#2C2C2C;        /* titles, primary labels                     */
  --n-text-body:#2C2C2C;   /* page body copy                             */
  --n-text-2:#787774;      /* secondary labels, section headers          */
  --n-text-3:#9B9A97;      /* placeholder, values, out-of-month days     */

  /* Accent */
  --n-blue:#2784E0;        /* selection, primary button, Done, switches  */
  --n-red:#E66457;         /* "today" in the date picker                 */
  --n-yellow-bg:#F7F1DE;   /* Guest badge fill                           */
  --n-yellow-ink:#402C1B;  /* Guest badge ink                            */

  /* Radius */
  --n-r-field:10px;  --n-r-card:12px;  --n-r-sheet:14px;
  --n-r-day:8px;     --n-r-tile:8px;   --n-r-pill:999px;

  /* Type — SF Pro. size/line-height/weight */
  --n-t-title:700 34px/40px var(--n-font);   /* page title              */
  --n-t-h2:700 19px/26px var(--n-font);      /* in-page heading         */
  --n-t-nav:600 17px/22px var(--n-font);     /* sheet nav title         */
  --n-t-row:400 17px/22px var(--n-font);     /* list row label          */
  --n-t-rowb:600 17px/22px var(--n-font);    /* list row label, strong  */
  --n-t-body:400 17px/24px var(--n-font);    /* body copy               */
  --n-t-sub:400 15px/20px var(--n-font);     /* row subtitle            */
  --n-t-cap:400 13px/18px var(--n-font);     /* badge / caption         */

  /* Metrics */
  --n-gutter:20px;       /* default screen gutter                       */
  --n-gutter-page:20px;  /* document page gutter                        */
  --n-gutter-card:12px;  /* card inset on a grouped sheet               */
  --n-row-h:44px;        /* settings row                                */
  --n-tap:44px;          /* minimum tap target                          */
  --n-sheet-top:71px;    /* sheet top inset from the device top         */
}"""

# The bezel, the status bar and the home indicator are this repo's framing,
# not a property of the app.
BASE = """*{box-sizing:border-box;margin:0;padding:0}
body{font-family:var(--n-font);background:#fff;-webkit-font-smoothing:antialiased;
  display:flex;justify-content:center;padding:24px}
.phone{width:393px;height:852px;position:relative;border-radius:52px;overflow:hidden;flex:none;
  background:var(--n-bg);outline:1px solid rgba(0,0,0,.10);
  box-shadow:0 0 0 11px #1D191A, 0 0 0 12.5px #3A3735, 0 24px 60px rgba(29,25,26,.28);
  display:flex;flex-direction:column;color:var(--n-text)}
.statusbar{height:54px;position:relative;flex:none;display:flex;align-items:flex-end;
  justify-content:space-between;padding:0 30px 5px}
.statusbar .time{font:600 16px/1 var(--n-font);width:60px;letter-spacing:.2px}
.island{position:absolute;top:11px;left:50%;transform:translateX(-50%);
  width:125px;height:36px;border-radius:20px;background:#000}
.sicons{display:flex;align-items:center;gap:6px}
.sicons svg{display:block}
.homebar{position:absolute;left:50%;bottom:8px;transform:translateX(-50%);
  width:139px;height:5px;border-radius:3px;background:#191918}"""

SB = """  <div class="statusbar">
    <div class="time">9:41</div>
    <div class="island"></div>
    <div class="sicons">
      <svg width="19" height="12" viewBox="0 0 19 12" fill="currentColor"><rect x="0" y="7" width="3" height="4" rx="1"/><rect x="5" y="5" width="3" height="6" rx="1"/><rect x="10" y="2.5" width="3" height="8.5" rx="1"/><rect x="15" y="0" width="3" height="11" rx="1"/></svg>
      <svg width="17" height="12" viewBox="0 0 17 12" fill="currentColor"><path d="M8.5 9.6a2 2 0 0 1 2 1.9l-2 .5-2-.5a2 2 0 0 1 2-1.9Z"/><path d="M8.5 5.6c1.9 0 3.6.7 4.9 1.9l-1.4 1.5a5 5 0 0 0-7 0L3.6 7.5a7 7 0 0 1 4.9-1.9Z"/><path d="M8.5 1.5c3 0 5.7 1.2 7.7 3.1l-1.4 1.5a9 9 0 0 0-12.6 0L.8 4.6a11 11 0 0 1 7.7-3.1Z"/></svg>
      <svg width="25" height="12" viewBox="0 0 25 12"><rect x=".5" y=".5" width="21" height="11" rx="3.5" fill="none" stroke="currentColor" opacity=".4"/><rect x="2" y="2" width="18" height="8" rx="2" fill="currentColor"/><path d="M23 4v4a2.2 2.2 0 0 0 0-4Z" fill="currentColor" opacity=".4"/></svg>
    </div>
  </div>
"""


# ---------------------------------------------------------- 00-design-tokens ---
CSS_00 = """

body{background:#F3F2F0}
.sheetcard{width:430px;height:932px;background:#fff;border-radius:20px;padding:16px 24px 14px;
  border:1px solid var(--n-border);box-shadow:0 18px 44px rgba(29,25,26,.14);overflow:hidden;color:var(--n-text)}
header{display:flex;gap:14px;align-items:flex-start;padding-bottom:8px;border-bottom:1px solid var(--n-hairline)}
.brandmark{width:34px;height:34px;flex:none}
.brandmark .logo{width:34px;height:34px;display:block}
h1{font:700 19px/24px var(--n-font)}
header p{font:400 12px/16px var(--n-font);color:var(--n-text-2);margin-top:3px}
code{font-family:ui-monospace,Menlo,monospace;font-size:11px;background:var(--n-fill);padding:1px 4px;border-radius:4px}
h2{font:600 11px/14px var(--n-font);letter-spacing:.8px;text-transform:uppercase;
  color:var(--n-text-3);margin:7px 0 4px}
.grid{display:grid;grid-template-columns:repeat(4,1fr);gap:6px}
.sw .chip{height:24px;border-radius:6px;border:1px solid rgba(0,0,0,.08)}
.swm{margin-top:4px;display:flex;flex-direction:column;gap:1px}
.swm b{font:600 9.5px/12px ui-monospace,Menlo,monospace;color:var(--n-text)}
.swm i{font:400 9.5px/12px ui-monospace,Menlo,monospace;color:var(--n-text-2);font-style:normal}
.swm s{font:400 9.5px/12px var(--n-font);color:var(--n-text-3);text-decoration:none}
.type .tr{display:flex;align-items:baseline;justify-content:space-between;gap:12px;
  padding:3px 0;border-bottom:1px solid var(--n-hairline)}
.type em{font:400 9.5px/12px ui-monospace,Menlo,monospace;color:var(--n-text-3);
  font-style:normal;white-space:nowrap;flex:none}
.rad{display:flex;gap:10px}
.rad>div{text-align:center}
.rb{width:44px;height:28px;background:var(--n-fill);border:1px solid var(--n-border)}
.rad em{display:block;margin-top:2px;font:400 9.5px/12px var(--n-font);color:var(--n-text-3);font-style:normal}
.metrics{margin-top:6px;font:400 10.5px/15px ui-monospace,Menlo,monospace;color:var(--n-text-2)}
.comps{display:grid;grid-template-columns:132px 1fr;gap:9px;align-items:center}
.comps .crow{grid-column:1/-1;display:flex;align-items:center;gap:10px}
.comps .cta{margin-left:auto;width:104px;height:36px;font:600 14px/1 var(--n-font)}
.seg{display:flex;background:var(--n-fill);border-radius:var(--n-r-field);padding:3px}
.seg div{flex:1;text-align:center;padding:5px 0;font:600 14px/20px var(--n-font);color:var(--n-text-2);border-radius:8px}
.seg .on{background:#fff;color:var(--n-text);box-shadow:0 1px 3px rgba(0,0,0,.10)}
.field{display:flex;align-items:center;gap:10px;height:36px;padding:0 12px;
  background:var(--n-fill);border-radius:var(--n-r-field);color:var(--n-text-3)}
.field svg{width:19px;height:19px;flex:none}
.field span{font:400 14px/20px var(--n-font);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.crow{display:flex;align-items:center;gap:14px}
.tg{width:51px;height:31px;border-radius:16px;background:var(--n-track);position:relative;flex:none}
.tg::after{content:"";position:absolute;top:2px;left:2px;width:27px;height:27px;border-radius:50%;
  background:#fff;box-shadow:0 2px 5px rgba(0,0,0,.18)}
.tg.on{background:var(--n-blue)}
.tg.on::after{left:22px}
.tile{width:36px;height:36px;border-radius:var(--n-r-tile);background:var(--n-fill);
  display:grid;place-items:center;color:#4B4945;flex:none}
.tile svg{width:20px;height:20px}
.daysq{width:34px;height:34px;border-radius:var(--n-r-day);background:var(--n-blue);color:#fff;
  display:grid;place-items:center;font:var(--n-t-row)}
.daycr{width:34px;height:34px;border-radius:50%;background:var(--n-red);color:#fff;
  display:grid;place-items:center;font:var(--n-t-row)}
.cta{height:50px;border-radius:var(--n-r-field);background:var(--n-blue);color:#fff;
  display:grid;place-items:center;font:var(--n-t-nav)}
"""

BODY_00 = """
<div class="sheetcard">
  <header>
    <div class="brandmark"><svg class="logo" viewBox="0 0 100 100" fill="none"><path d="M6.017 4.313 61.35.227c6.797-.583 8.543-.19 12.817 2.916l17.663 12.443c2.913 2.14 3.883 2.723 3.883 5.053v68.243c0 4.277-1.553 6.807-6.99 7.193l-64.257 3.89c-4.08.193-6.023-.39-8.16-3.113L3.3 79.94C.967 76.827 0 74.497 0 71.773V11.113c0-3.497 1.553-6.413 6.017-6.8Z" fill="#fff"/><path fill-rule="evenodd" clip-rule="evenodd" d="M61.35.227 6.017 4.313C1.553 4.7 0 7.617 0 11.113v60.66c0 2.724.967 5.054 3.3 8.167l13.007 16.913c2.137 2.723 4.08 3.306 8.16 3.113l64.257-3.89c5.433-.386 6.99-2.916 6.99-7.193V20.64c0-2.21-.873-2.847-3.443-4.733L74.167 3.143C69.894.037 68.147-.356 61.35.227ZM25.92 19.523c-5.247.353-6.437.433-9.417-1.99L8.927 11.507c-.77-.78-.383-1.753 1.557-1.947l53.193-3.887c4.467-.39 6.793 1.167 8.54 2.527l9.123 6.61c.39.197 1.36 1.36.193 1.36l-54.933 3.307-.68.046ZM19.803 88.3V30.367c0-2.53.777-3.697 3.103-3.894L86 22.78c2.14-.193 3.107 1.167 3.107 3.693v57.547c0 2.53-.39 4.67-3.883 4.863l-60.377 3.5c-3.493.194-5.043-.97-5.043-4.083Zm59.6-54.827c.387 1.75 0 3.5-1.75 3.7l-2.91.577V80.52c-2.527 1.36-4.853 2.137-6.797 2.137-3.107 0-3.883-.973-6.21-3.887l-19.03-29.94v28.967l6.02 1.363s0 3.5-4.857 3.5l-13.39.777c-.39-.78 0-2.723 1.357-3.11l3.497-.97V40.99l-4.853-.39c-.39-1.75.58-4.277 3.3-4.474l14.367-.966 19.807 30.327V38.657l-5.047-.58c-.39-2.144 1.163-3.7 3.103-3.89l13.393-.78Z" fill="#000"/></svg></div>
    <div><h1>Notion iOS — Design Tokens</h1>
    <p>Sampled from 393 x 852 pt @3x captures. Every mockup in this folder inlines
    this exact <code>:root</code> block.</p></div>
  </header>

  <h2>Surface</h2>
  <div class="grid"><div class="sw"><div class="chip" style="background:#FFFFFF"></div><div class="swm"><b>--n-bg</b><i>#FFFFFF</i><s>page</s></div></div><div class="sw"><div class="chip" style="background:#FAF8F6"></div><div class="swm"><b>--n-bg-sheet</b><i>#FAF8F6</i><s>sheet ground</s></div></div><div class="sw"><div class="chip" style="background:#EAE9E7"></div><div class="swm"><b>--n-fill</b><i>#EAE9E7</i><s>field / track</s></div></div><div class="sw"><div class="chip" style="background:#F0F0F0"></div><div class="swm"><b>--n-fill-neutral</b><i>#F0F0F0</i><s>chip on white</s></div></div><div class="sw"><div class="chip" style="background:#E9E8E7"></div><div class="swm"><b>--n-hairline</b><i>#E9E8E7</i><s>row divider</s></div></div><div class="sw"><div class="chip" style="background:#EFEEEC"></div><div class="swm"><b>--n-border</b><i>#EFEEEC</i><s>card outline</s></div></div><div class="sw"><div class="chip" style="background:#E0E0E0"></div><div class="swm"><b>--n-scrim</b><i>#E0E0E0</i><s>dimmed app</s></div></div><div class="sw"><div class="chip" style="background:#C4C4C4"></div><div class="swm"><b>--n-scrim-strong</b><i>#C4C4C4</i><s>dimmed, AI</s></div></div></div>

  <h2>Ink</h2>
  <div class="grid"><div class="sw"><div class="chip" style="background:#2C2C2C"></div><div class="swm"><b>--n-text</b><i>#2C2C2C</i><s>titles</s></div></div><div class="sw"><div class="chip" style="background:#2C2C2C"></div><div class="swm"><b>--n-text-body</b><i>#2C2C2C</i><s>body copy</s></div></div><div class="sw"><div class="chip" style="background:#787774"></div><div class="swm"><b>--n-text-2</b><i>#787774</i><s>secondary</s></div></div><div class="sw"><div class="chip" style="background:#9B9A97"></div><div class="swm"><b>--n-text-3</b><i>#9B9A97</i><s>placeholder</s></div></div></div>

  <h2>Accent</h2>
  <div class="grid"><div class="sw"><div class="chip" style="background:#2784E0"></div><div class="swm"><b>--n-blue</b><i>#2784E0</i><s>primary / on</s></div></div><div class="sw"><div class="chip" style="background:#E66457"></div><div class="swm"><b>--n-red</b><i>#E66457</i><s>today</s></div></div><div class="sw"><div class="chip" style="background:#F7F1DE"></div><div class="swm"><b>--n-yellow-bg</b><i>#F7F1DE</i><s>Guest fill</s></div></div><div class="sw"><div class="chip" style="background:#402C1B"></div><div class="swm"><b>--n-yellow-ink</b><i>#402C1B</i><s>Guest ink</s></div></div></div>

  <h2>Type — SF Pro</h2>
  <div class="type">
    <div class="tr"><span style="font:var(--n-t-title)">Meeting</span><em>--n-t-title · 34/40 · 700</em></div>
    <div class="tr"><span style="font:var(--n-t-h2)">AirPods Overview</span><em>--n-t-h2 · 19/26 · 700</em></div>
    <div class="tr"><span style="font:var(--n-t-nav)">Share settings</span><em>--n-t-nav · 17/22 · 600</em></div>
    <div class="tr"><span style="font:var(--n-t-row)">Date format</span><em>--n-t-row · 17/22 · 400</em></div>
    <div class="tr"><span style="font:var(--n-t-body)">A major leap forward</span><em>--n-t-body · 17/24 · 400</em></div>
    <div class="tr"><span style="font:var(--n-t-sub);color:var(--n-text-3)">in Private Pages</span><em>--n-t-sub · 15/20 · 400</em></div>
    <div class="tr"><span style="font:var(--n-t-cap);color:var(--n-yellow-ink);background:var(--n-yellow-bg);padding:1px 5px;border-radius:4px">Guest</span><em>--n-t-cap · 13/18 · 400</em></div>
  </div>

  <h2>Radius &amp; metrics</h2>
  <div class="rad">
    <div><div class="rb" style="border-radius:var(--n-r-tile)"></div><em>tile 8</em></div>
    <div><div class="rb" style="border-radius:var(--n-r-day)"></div><em>day 8</em></div>
    <div><div class="rb" style="border-radius:var(--n-r-field)"></div><em>field 10</em></div>
    <div><div class="rb" style="border-radius:var(--n-r-card)"></div><em>card 12</em></div>
    <div><div class="rb" style="border-radius:var(--n-r-sheet)"></div><em>sheet 14</em></div>
    <div><div class="rb" style="border-radius:var(--n-r-pill)"></div><em>pill 999</em></div>
  </div>
  <p class="metrics">gutter 20 · page 26 · summary 46 · card 12 · row 44 · tap 44 ·
     status bar 54 · sheet top 71 · day cell 34 / pitch 44</p>

  <h2>Components</h2>
  <div class="comps">
    <div class="seg"><div class="on">Share</div><div>Publish</div></div>
    <div class="field"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m15.5 15.5 4.5 4.5"/></svg><span>Invite people, emails, groups…</span></div>
    <div class="crow"><div class="tg"></div><div class="tg on"></div>
      <div class="tile"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><rect x="4.2" y="10.4" width="15.6" height="10.4" rx="2.6"/><path d="M8 10.4V7.6a4 4 0 0 1 8 0v2.8"/><circle cx="12" cy="15.4" r="1.3" fill="currentColor" stroke="none"/></svg></div>
      <div class="daysq">27</div><div class="daycr">28</div>
      <div class="cta">Share link</div></div>
  </div>
</div>"""


# ----------------------------------------------------------------- 01-splash ---
CSS_01 = """

.stage{position:absolute;inset:0;display:grid;place-items:center}
.stage .logo{width:136px;height:136px;display:block}
"""

BODY_01 = """
<div class="phone">
  <!--sb-->

  <div class="stage"><svg class="logo" viewBox="0 0 100 100" fill="none"><path d="M6.017 4.313 61.35.227c6.797-.583 8.543-.19 12.817 2.916l17.663 12.443c2.913 2.14 3.883 2.723 3.883 5.053v68.243c0 4.277-1.553 6.807-6.99 7.193l-64.257 3.89c-4.08.193-6.023-.39-8.16-3.113L3.3 79.94C.967 76.827 0 74.497 0 71.773V11.113c0-3.497 1.553-6.413 6.017-6.8Z" fill="#fff"/><path fill-rule="evenodd" clip-rule="evenodd" d="M61.35.227 6.017 4.313C1.553 4.7 0 7.617 0 11.113v60.66c0 2.724.967 5.054 3.3 8.167l13.007 16.913c2.137 2.723 4.08 3.306 8.16 3.113l64.257-3.89c5.433-.386 6.99-2.916 6.99-7.193V20.64c0-2.21-.873-2.847-3.443-4.733L74.167 3.143C69.894.037 68.147-.356 61.35.227ZM25.92 19.523c-5.247.353-6.437.433-9.417-1.99L8.927 11.507c-.77-.78-.383-1.753 1.557-1.947l53.193-3.887c4.467-.39 6.793 1.167 8.54 2.527l9.123 6.61c.39.197 1.36 1.36.193 1.36l-54.933 3.307-.68.046ZM19.803 88.3V30.367c0-2.53.777-3.697 3.103-3.894L86 22.78c2.14-.193 3.107 1.167 3.107 3.693v57.547c0 2.53-.39 4.67-3.883 4.863l-60.377 3.5c-3.493.194-5.043-.97-5.043-4.083Zm59.6-54.827c.387 1.75 0 3.5-1.75 3.7l-2.91.577V80.52c-2.527 1.36-4.853 2.137-6.797 2.137-3.107 0-3.883-.973-6.21-3.887l-19.03-29.94v28.967l6.02 1.363s0 3.5-4.857 3.5l-13.39.777c-.39-.78 0-2.723 1.357-3.11l3.497-.97V40.99l-4.853-.39c-.39-1.75.58-4.277 3.3-4.474l14.367-.966 19.807 30.327V38.657l-5.047-.58c-.39-2.144 1.163-3.7 3.103-3.89l13.393-.78Z" fill="#000"/></svg></div>
  <div class="homebar"></div>
</div>"""


# ---------------------------------------------------------- 02-search-ask-ai ---
CSS_02 = """

.askrow{display:flex;align-items:center;gap:10px;padding:6px 20px 10px;flex:none}
.aiava{width:30px;height:30px;border-radius:50%;border:1px solid var(--n-border);
  display:grid;place-items:center;flex:none;color:var(--n-text)}
.aiava .aiface{width:19px;height:19px}
.asktext{font:600 17px/22px var(--n-font);color:var(--n-text);letter-spacing:-.2px}
.list{flex:1;overflow:hidden}
.sect{font:var(--n-t-row);color:var(--n-text-2);padding:22px 20px 8px}
.row{display:flex;align-items:center;gap:6px;padding:10px 20px;min-height:60px}
.emo{width:26px;font-size:21px;line-height:1;text-align:center;flex:none}
.gly{width:26px;height:26px;flex:none;display:grid;place-items:center;color:#8A8985}
.gly svg{width:25px;height:25px}
.rt{display:flex;flex-direction:column;gap:2px;min-width:0}
.rt b{font:var(--n-t-rowb);color:var(--n-text);letter-spacing:-.2px;white-space:nowrap}
.rt i{font:var(--n-t-sub);color:var(--n-text-3);font-style:normal}
.bottombar{flex:none;display:flex;align-items:center;gap:8px;padding:12px 20px 20px}
.searchfield{flex:1;height:44px;border-radius:var(--n-r-pill);background:var(--n-fill-soft);
  border:1px solid var(--n-border);box-shadow:0 2px 8px rgba(29,25,26,.06);
  display:flex;align-items:center;gap:10px;padding:0 16px}
.searchfield .si{width:21px;height:21px;flex:none;color:var(--n-text-2)}
.searchfield .si svg{width:21px;height:21px;display:block}
.searchfield .tune{margin-left:auto}
.searchfield .ph{font:var(--n-t-row);color:var(--n-text-3)}
.circbtn{width:44px;height:44px;flex:none;border-radius:50%;background:var(--n-fill-soft);
  border:1px solid var(--n-border);box-shadow:0 2px 8px rgba(29,25,26,.06);
  display:grid;place-items:center;color:var(--n-text)}
.circbtn svg{width:21px;height:21px}
"""

BODY_02 = """
<div class="phone">
  <!--sb-->

  <div class="askrow">
    <div class="aiava"><svg class="aiface" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4.4 6.0Q7.55 3.0 10.75 5.85"/><path d="M19.4 6.15C17.75 3.6 14.6 3.4 12.5 6.15L5.45 19.6h6.15"/><circle cx="7.95" cy="8.75" r="1.15" fill="currentColor" stroke="none"/><circle cx="14.55" cy="9.55" r="1.15" fill="currentColor" stroke="none"/></svg></div>
    <div class="asktext">Ask AI anything in Alex Smith&rsquo;s Space</div>
  </div>

  <div class="list">
    <div class="sect">Today</div>
    <div class="group">
      <div class="row"><span class="emo">&#129513;</span><span class="rt"><b>UI/UX Notes (2)</b><i>in Private Pages</i></span></div>
      <div class="row"><span class="emo">&#127912;</span><span class="rt"><b>New page</b><i>in Private Pages</i></span></div>
      <div class="row"><span class="emo">&#128083;</span><span class="rt"><b>Sidekick</b><i>in Private Pages</i></span></div>
      <div class="row"><span class="gly"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"><path d="M6 2.8h7.2L19 8.6v12.6H6V2.8Z"/><path d="M13.2 2.8v5.8H19"/><path d="M8.8 12.6h7.4M8.8 15.8h7.4M8.8 19h4.6"/></svg></span><span class="rt"><b>Meeting @May 24, 2026 2:47 PM</b><i>in Private Pages</i></span></div>
    </div>
    <div class="sect">This week</div>
    <div class="group">
      <div class="row"><span class="emo">&#128075;</span><span class="rt"><b>Welcome to Notion!</b><i>in Private Pages</i></span></div>
      <div class="row"><span class="gly"><svg viewBox="0 0 24 24" fill="none" stroke="#0F7B3E" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><path d="M2.4 6.6 4.4 8.6 8.2 4.4"/><path d="M2.4 15.6l2 2 3.8-4.2"/><path d="M11.4 6.2h10M11.4 10h7.4M11.4 15.4h10M11.4 19.2h7.4"/></svg></span><span class="rt"><b>To Do List</b><i>in Private Pages</i></span></div>
    </div>
  </div>

  <div class="bottombar">
    <div class="searchfield">
      <span class="si"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m15.5 15.5 4.5 4.5"/></svg></span>
      <span class="ph">Search or ask AI</span>
      <span class="si tune"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M3 7h18M6 12h12M10 17h4"/></svg></span>
    </div>
    <div class="circbtn"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg></div>
  </div>
</div>"""


# --------------------------------------------------------- 03-notion-ai-chat ---
CSS_03 = """

.phone{background:var(--n-scrim-strong)}
.sheet{position:absolute;left:0;right:0;top:65px;bottom:0;background:var(--n-bg);
  border-radius:var(--n-r-sheet) var(--n-r-sheet) 0 0;display:flex;flex-direction:column;overflow:hidden}
.aihdr{display:flex;align-items:flex-start;justify-content:space-between;padding:16px 16px 0;flex:none}
.cbtn{width:40px;height:40px;border-radius:50%;background:#fff;border:1px solid var(--n-border);
  box-shadow:0 2px 8px rgba(29,25,26,.08);display:grid;place-items:center;color:var(--n-text);flex:none}
.cbtn svg{width:21px;height:21px}
.brand{display:flex;flex-direction:column;align-items:center;gap:5px;margin-top:-6px}
.ava{width:64px;height:64px;border-radius:50%;background:#fff;border:1px solid #F1F0EE;
  box-shadow:0 3px 12px rgba(29,25,26,.10);display:grid;place-items:center;color:var(--n-text)}
.ava .aiface{width:36px;height:36px}
.bname{font:var(--n-t-nav);color:var(--n-text);letter-spacing:-.2px}
.thread{flex:1;padding:26px 16px 0;overflow:hidden}
.bubble{margin-left:auto;max-width:83%;width:max-content;background:var(--n-bg-sheet);
  border-radius:20px;padding:13px 20px;font:var(--n-t-row);color:var(--n-text);letter-spacing:-.2px}
.steps{margin-top:36px}
.steps-h{display:flex;align-items:center;gap:8px;font:var(--n-t-row);color:var(--n-text-2)}
.cv{width:18px;height:18px;display:block;color:var(--n-text-3)}
.cv.sm{width:15px;height:15px}
.cv svg{width:100%;height:100%;display:block}
.tl{position:relative;padding:14px 0 0 18px}
.tl::before{content:"";position:absolute;left:20px;top:24px;bottom:16px;width:1.5px;background:var(--n-hairline)}
.tli{display:flex;align-items:center;gap:26px;padding:7px 0}
.dot{width:6px;height:6px;border-radius:50%;background:#D6D5D1;flex:none;position:relative;z-index:1;
  box-shadow:0 0 0 3px #fff}
.tlt{display:flex;align-items:center;gap:8px;font:var(--n-t-row);color:var(--n-text-2)}
.tlt u{text-decoration:underline;text-underline-offset:3px;text-decoration-color:#C9C8C5}
.ans{margin-top:22px;font:var(--n-t-body);color:var(--n-text);letter-spacing:-.2px;word-break:break-word}
.ans b{font-weight:700}
.acts{display:flex;gap:26px;margin-top:22px;color:var(--n-text-2)}
.acts span{width:22px;height:22px;display:block}
.acts svg{width:22px;height:22px;display:block}
.composer{flex:none;padding:12px 16px 22px}
.cfield{height:48px;border-radius:24px;background:var(--n-fill-soft);border:1px solid var(--n-hairline);
  box-shadow:0 2px 10px rgba(29,25,26,.06);display:flex;align-items:center;padding:0 18px}
.cfield .ph{font:var(--n-t-row);color:var(--n-text-3)}
.cfield .mic{margin-left:auto;width:21px;height:21px;color:var(--n-text-2)}
.cfield .mic svg{width:21px;height:21px;display:block}
"""

BODY_03 = """
<div class="phone">
  <!--sb-->

  <div class="sheet">
    <div class="aihdr">
      <div class="cbtn"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 1.8"/></svg></div>
      <div class="brand">
        <div class="ava"><svg class="aiface" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4.4 6.0Q7.55 3.0 10.75 5.85"/><path d="M19.4 6.15C17.75 3.6 14.6 3.4 12.5 6.15L5.45 19.6h6.15"/><circle cx="7.95" cy="8.75" r="1.15" fill="currentColor" stroke="none"/><circle cx="14.55" cy="9.55" r="1.15" fill="currentColor" stroke="none"/></svg></div>
        <div class="bname">Notion AI</div>
      </div>
      <div class="cbtn"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M19 13.5V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h5.5"/><path d="M16.5 3.5 20.5 7.5 12 16H8v-4l8.5-8.5Z"/></svg></div>
    </div>

    <div class="thread">
      <div class="bubble">Create a ui ux note for me</div>

      <div class="steps">
        <div class="steps-h">2 steps <span class="cv"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m5 9 7 7 7-7"/></svg></span></div>
        <div class="tl">
          <div class="tli"><span class="dot"></span><span class="tlt">Thought <span class="cv sm"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 5 7 7-7 7"/></svg></span></span></div>
          <div class="tli"><span class="dot"></span><span class="tlt">Created page &#127912; <u>UI/UX Notes</u></span></div>
        </div>
      </div>

      <p class="ans">Done &mdash; I created a <b>UI/UX Notes</b> page for you here: https://www.notion.so/<wbr>587f0f6dce5b47748195448fa5e4bd4c.</p>
      <p class="ans">Done &mdash; I created a <b>UI/UX Notes</b> page for you here: https://www.notion.so/<wbr>587f0f6dce5b47748195448fa5e4bd4c.</p>

      <div class="acts">
        <span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"><rect x="8.5" y="3.5" width="12" height="12" rx="2.6"/><path d="M15.5 18.2v.9a2.4 2.4 0 0 1-2.4 2.4H5.9a2.4 2.4 0 0 1-2.4-2.4v-7.2a2.4 2.4 0 0 1 2.4-2.4h.9"/></svg></span><span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"><path d="M7 10.5 11.4 3c1.6 0 2.6 1 2.6 2.6V9.4h4.6c1.5 0 2.6 1.3 2.3 2.8l-1.3 6.3A2.6 2.6 0 0 1 17 20.6H7"/><rect x="2.4" y="10.2" width="4.6" height="10.4" rx="1.4"/></svg></span>
        <span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"><path d="M7 13.5 11.4 21c1.6 0 2.6-1 2.6-2.6v-3.8h4.6c1.5 0 2.6-1.3 2.3-2.8l-1.3-6.3A2.6 2.6 0 0 0 17 3.4H7"/><rect x="2.4" y="3.4" width="4.6" height="10.4" rx="1.4"/></svg></span><span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6 3.5 11.2 9 16.4"/><path d="M3.5 11.2H15a5.5 5.5 0 0 1 5.5 5.5V19"/></svg></span>
      </div>
    </div>

    <div class="composer">
      <div class="cfield"><span class="ph">Ask, search, or make anything...</span>
        <span class="mic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="9.2" y="2.6" width="5.6" height="11" rx="2.8"/><path d="M5.5 11.2a6.5 6.5 0 0 0 13 0M12 17.7V21"/></svg></span></div>
    </div>
  </div>
</div>"""


# ----------------------------------------------------------- 04-meeting-page ---
CSS_04 = """

.nav{display:flex;align-items:center;gap:18px;padding:8px 26px 4px;flex:none;color:var(--n-text)}
.nb{width:26px;height:26px;display:block}
.nb svg{width:26px;height:26px;display:block}
.nb.dots svg{width:24px;height:24px}
.sp{flex:1}
.ptitle{font:var(--n-t-title);letter-spacing:-.9px;color:var(--n-text);padding:14px 26px 0}
.ptitle span{color:var(--n-text-2)}
.card{margin:18px 26px 0;border:1px solid var(--n-border);border-radius:var(--n-r-card);
  background:#fff;overflow:hidden;flex:none}
.chead{display:flex;align-items:flex-start;gap:8px;padding:14px 40px 14px 16px}
.cico{width:26px;height:26px;flex:none;color:var(--n-text)}
.cico svg{width:26px;height:26px;display:block}
.chead .cv{width:18px;height:18px;flex:none;margin-top:4px;color:var(--n-text-2)}
.cv svg{width:100%;height:100%;display:block}
.ctitle{font:700 19px/26px var(--n-font);letter-spacing:-.3px;color:var(--n-text)}
.ctools{display:flex;align-items:center;justify-content:space-between;padding:14px 46px 2px}
.chip{display:inline-flex;align-items:center;gap:8px;height:38px;padding:0 14px;
  border-radius:var(--n-r-pill);background:var(--n-fill-neutral);
  font:600 17px/1 var(--n-font);letter-spacing:-.2px;color:var(--n-text)}
.chip svg{width:19px;height:19px;display:block}
.chip .cv{width:17px;height:17px;color:var(--n-text-2)}
.tunebtn{width:38px;height:38px;border-radius:var(--n-r-tile);background:var(--n-fill-neutral);
  display:grid;place-items:center;color:#4B4945}
.tunebtn svg{width:21px;height:21px}
.cbody{padding:0 46px;flex:1;overflow:hidden}
.cbody h2{font:var(--n-t-h2);letter-spacing:-.3px;color:var(--n-text);margin:20px 0 4px}
.cbody ul{list-style:none}
.cbody li{position:relative;padding:4px 0 4px 31px;font:var(--n-t-body);color:var(--n-text-body);letter-spacing:-.2px}
.cbody li::before{content:"";position:absolute;left:9px;top:13px;width:6px;height:6px;
  border-radius:50%;background:var(--n-text-body)}
.cite{display:inline-grid;place-items:center;width:18px;height:18px;border-radius:50%;
  border:1px solid #DEDDDA;font:400 11px/1 var(--n-font);color:var(--n-text-2);
  vertical-align:2px;margin-left:2px}
"""

BODY_04 = """
<div class="phone">
  <!--sb-->

  <div class="nav">
    <span class="nb"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><path d="m15 5-7 7 7 7"/></svg></span>
    <span class="sp"></span>
    <span class="nb"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12"/><path d="m8 6.6 4-3.6 4 3.6"/><path d="M6 11H4.6A1.6 1.6 0 0 0 3 12.6v7.8A1.6 1.6 0 0 0 4.6 22h14.8a1.6 1.6 0 0 0 1.6-1.6v-7.8A1.6 1.6 0 0 0 19.4 11H18"/></svg></span>
    <span class="nb dots"><svg viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="1.9"/><circle cx="12" cy="12" r="1.9"/><circle cx="19" cy="12" r="1.9"/></svg></span>
  </div>

  <h1 class="ptitle">Meeting <span>@Today<br>12:02&thinsp;PM</span></h1>

  <div class="card">
    <div class="chead">
      <span class="cico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"><rect x="2.8" y="4.6" width="18.4" height="16.6" rx="2.4"/><path d="M2.8 9.6h18.4"/><path d="M7.4 2.8v3.4M16.6 2.8v3.4"/><text x="12" y="18.2" text-anchor="middle" font-family="-apple-system,Helvetica,Arial" font-size="7.4" font-weight="700" fill="currentColor" stroke="none">28</text></svg></span>
      <span class="cv"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m5 9 7 7 7-7"/></svg></span>
      <span class="ctitle">iPhone and AirPods Product Announcement</span>
    </div>
  </div>

  <div class="ctools">
      <span class="chip"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><path d="M2.4 6.6 4.4 8.6 8.2 4.4"/><path d="M2.4 15.6l2 2 3.8-4.2"/><path d="M11.4 6.2h10M11.4 10h7.4M11.4 15.4h10M11.4 19.2h7.4"/></svg>Summary <span class="cv"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m5 9 7 7 7-7"/></svg></span></span>
      <span class="tunebtn"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M3 7h18M6 12h12M10 17h4"/></svg></span>
  </div>

  <div class="cbody">
      <h2>iPhone</h2>
      <ul><li>A major leap forward for iPhone was announced, described as "the biggest leap ever" <span class="cite">1</span></li></ul>
      <h2>AirPods Overview</h2>
      <ul><li>AirPods are positioned as the best and most popular headphones in the world <span class="cite">1</span></li><li>Feature an iconic design and groundbreaking sound quality that have revolutionized the headphone industry <span class="cite">1</span></li></ul>
      <h2>AirPods User Experience</h2>
      <ul><li>Effortless setup process <span class="cite">1</span></li><li>Amazing sound quality <span class="cite">1</span></li></ul>
  </div>
</div>"""


# ------------------------------------------------------------- 05-date-sheet ---
CSS_05 = """

.phone{background:var(--n-scrim)}
.sheet{position:absolute;left:0;right:0;top:var(--n-sheet-top);bottom:0;background:var(--n-bg-sheet);
  border-radius:var(--n-r-sheet) var(--n-r-sheet) 0 0;overflow:hidden}
.handle{width:42px;height:5px;border-radius:3px;background:#D6D4D1;margin:6px auto 0}
.snav{display:flex;align-items:center;justify-content:space-between;height:var(--n-tap);
  padding:0 var(--n-gutter);margin-top:8px}
.stitle{font:var(--n-t-nav);color:var(--n-text);letter-spacing:-.2px}
.help{width:26px;height:26px;color:var(--n-text-3);display:block}
.help svg{width:26px;height:26px;display:block}
.help.ghost{visibility:hidden}
.card{background:var(--n-bg-card);border-radius:var(--n-r-card);margin:0 var(--n-gutter-card) 12px}
.card.pad{padding:16px}
.dtfield{display:flex;align-items:center;height:30px;border-radius:var(--n-r-tile);
  background:var(--n-bg-sheet);padding:0 14px}
.dt{font:var(--n-t-row);color:var(--n-text);letter-spacing:-.2px;flex:1}
.dt.tm{text-align:right}
.sep{width:1px;height:16px;background:#E2E0DD;flex:none}
.cal{padding:14px 35px 12px;position:relative;overflow:hidden}
.cal::before{content:"";position:absolute;top:0;left:0;right:0;height:20px;
  background:linear-gradient(#F1F0EE,#FFF)}
.wk{display:flex;justify-content:space-between;height:44px;align-items:center;position:relative}
.d{width:34px;height:34px;display:grid;place-items:center;font:var(--n-t-row);color:var(--n-text);letter-spacing:-.2px}
.d.out{color:var(--n-text-3)}
.d.sel{background:var(--n-blue);color:#fff;border-radius:var(--n-r-day)}
.d.today{background:var(--n-red);color:#fff;border-radius:50%}
.rows{overflow:hidden}
.srow{display:flex;align-items:center;height:var(--n-row-h);padding:0 22px}
.srow + .srow{border-top:1px solid var(--n-hairline)}
.sl{font:var(--n-t-row);color:var(--n-text);letter-spacing:-.2px;flex:1}
.sv{font:var(--n-t-row);color:var(--n-text-3);letter-spacing:-.2px}
.cv{width:17px;height:17px;color:#B6B5B1;margin-left:6px;display:block}
.cv svg{width:100%;height:100%;display:block}
.tg{width:51px;height:31px;border-radius:16px;background:var(--n-track);position:relative;flex:none}
.tg::after{content:"";position:absolute;top:2px;left:2px;width:27px;height:27px;border-radius:50%;
  background:#fff;box-shadow:0 2px 5px rgba(0,0,0,.18)}
.tg.on{background:var(--n-blue)}
.tg.on::after{left:22px}
"""

BODY_05 = """
<div class="phone">
  <!--sb-->

  <div class="sheet">
    <div class="handle"></div>
    <div class="snav">
      <span class="help"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9.2"/><path d="M9.4 9.4a2.7 2.7 0 0 1 5.2.9c0 1.8-2.6 2.2-2.6 4"/><circle cx="12" cy="17.4" r=".95" fill="currentColor" stroke="none"/></svg></span>
      <span class="stitle">Date</span>
      <span class="help ghost"></span>
    </div>

    <div class="card pad">
      <div class="dtfield">
        <span class="dt">May 27, 2026</span>
        <span class="sep"></span>
        <span class="dt tm">12:02&thinsp;PM</span>
      </div>
    </div>

    <div class="card cal"><div class="wk"><div class="d ">3</div><div class="d ">4</div><div class="d ">5</div><div class="d ">6</div><div class="d ">7</div><div class="d ">8</div><div class="d ">9</div></div><div class="wk"><div class="d ">10</div><div class="d ">11</div><div class="d ">12</div><div class="d ">13</div><div class="d ">14</div><div class="d ">15</div><div class="d ">16</div></div><div class="wk"><div class="d ">17</div><div class="d ">18</div><div class="d ">19</div><div class="d ">20</div><div class="d ">21</div><div class="d ">22</div><div class="d ">23</div></div><div class="wk"><div class="d ">24</div><div class="d ">25</div><div class="d ">26</div><div class="d sel">27</div><div class="d today">28</div><div class="d ">29</div><div class="d ">30</div></div><div class="wk"><div class="d ">31</div><div class="d out">1</div><div class="d out">2</div><div class="d out">3</div><div class="d out">4</div><div class="d out">5</div><div class="d out">6</div></div></div>

    <div class="card rows">
      <div class="srow"><span class="sl">End date</span><span class="tg"></span></div>
      <div class="srow"><span class="sl">Date format</span><span class="sv">Full date</span><span class="cv"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 5 7 7-7 7"/></svg></span></div>
      <div class="srow"><span class="sl">Include time</span><span class="tg on"></span></div>
      <div class="srow"><span class="sl">Time format</span><span class="sv">12 hour</span><span class="cv"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 5 7 7-7 7"/></svg></span></div>
      <div class="srow"><span class="sl">Timezone</span><span class="sv">GMT+7</span><span class="cv"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 5 7 7-7 7"/></svg></span></div>
      <div class="srow"><span class="sl">Remind</span><span class="sv">None</span><span class="cv"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 5 7 7-7 7"/></svg></span></div>
    </div>

    <div class="card rows">
      <div class="srow"><span class="sl">Clear</span></div>
    </div>
  </div>
</div>"""


# --------------------------------------------------- 06-share-settings-sheet ---
CSS_06 = """

.phone{background:var(--n-scrim)}
.sheet{position:absolute;left:0;right:0;top:var(--n-sheet-top);bottom:0;background:var(--n-bg-sheet);
  border-radius:var(--n-r-sheet) var(--n-r-sheet) 0 0;overflow:hidden}
.handle{width:42px;height:5px;border-radius:3px;background:#D6D4D1;margin:6px auto 0}
.snav{display:flex;align-items:center;justify-content:space-between;height:var(--n-tap);
  padding:0 var(--n-gutter);margin-top:10px}
.stitle{font:var(--n-t-nav);color:var(--n-text);letter-spacing:-.2px}
.help{width:26px;height:26px;color:var(--n-text-3);display:block}
.help svg{width:26px;height:26px;display:block}
.done{font:var(--n-t-nav);color:var(--n-blue);letter-spacing:-.2px}
.seg{display:flex;background:var(--n-fill);border-radius:var(--n-r-field);padding:3px;
  margin:14px var(--n-gutter) 0}
.seg div{flex:1;text-align:center;padding:6px 0;font:var(--n-t-nav);color:var(--n-text-2);
  border-radius:8px;letter-spacing:-.2px}
.seg .on{background:#fff;color:var(--n-text);box-shadow:0 1px 3px rgba(0,0,0,.10)}
.invite{display:flex;align-items:center;gap:12px;height:34px;padding:0 14px;margin:12px var(--n-gutter) 0;
  background:var(--n-fill);border-radius:var(--n-r-field);color:var(--n-text-3)}
.invite svg{width:20px;height:20px;flex:none}
.invite span{font:var(--n-t-row);letter-spacing:-.2px}
.people{padding:10px var(--n-gutter) 14px;border-bottom:1px solid var(--n-hairline)}
.prow{display:flex;align-items:center;gap:14px;padding:12px 0}
.av{width:38px;height:38px;border-radius:50%;background:#fff;border:1px solid var(--n-border);
  display:grid;place-items:center;font:var(--n-t-row);color:var(--n-text-2);flex:none}
.pt{display:flex;flex-direction:column;gap:2px;flex:1;min-width:0}
.pt b{font:var(--n-t-rowb);color:var(--n-text);letter-spacing:-.2px;white-space:nowrap}
.pt b em{font-style:normal;font-weight:400;color:var(--n-text-3)}
.pt i{font:var(--n-t-sub);color:var(--n-text-2);font-style:normal}
.guest{font:var(--n-t-cap);background:var(--n-yellow-bg);color:var(--n-yellow-ink);
  padding:1px 6px;border-radius:5px;font-weight:500;vertical-align:2px}
.pd{width:24px;height:24px;color:var(--n-text-2);flex:none}
.pd svg{width:24px;height:24px;display:block}
.ga{font:var(--n-t-row);color:var(--n-text-2);padding:18px var(--n-gutter) 8px;letter-spacing:-.2px}
.garow{display:flex;align-items:center;gap:14px;padding:6px var(--n-gutter)}
.tile{width:38px;height:38px;border-radius:var(--n-r-tile);background:var(--n-fill);
  display:grid;place-items:center;color:#4B4945;flex:none}
.tile svg{width:21px;height:21px}
.gat{font:var(--n-t-row);color:var(--n-text);letter-spacing:-.2px}
.cv{width:17px;height:17px;color:#B6B5B1;display:block}
.cv svg{width:100%;height:100%;display:block}
.cta{height:48px;margin:22px var(--n-gutter) 0;border-radius:var(--n-r-field);
  background:var(--n-blue);color:#fff;display:grid;place-items:center;
  font:var(--n-t-nav);letter-spacing:-.2px}
"""

BODY_06 = """
<div class="phone">
  <!--sb-->

  <div class="sheet">
    <div class="handle"></div>
    <div class="snav">
      <span class="help"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9.2"/><path d="M9.4 9.4a2.7 2.7 0 0 1 5.2.9c0 1.8-2.6 2.2-2.6 4"/><circle cx="12" cy="17.4" r=".95" fill="currentColor" stroke="none"/></svg></span>
      <span class="stitle">Share settings</span>
      <span class="done">Done</span>
    </div>

    <div class="seg"><div class="on">Share</div><div>Publish</div></div>

    <div class="invite"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m15.5 15.5 4.5 4.5"/></svg><span>Invite people, emails, groups...</span></div>

    <div class="people">
      <div class="prow"><span class="av">A</span><span class="pt"><b>Alex Smith <em>(You)</em></b><i>Full access</i></span><span class="pd"><svg viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="1.9"/><circle cx="12" cy="12" r="1.9"/><circle cx="19" cy="12" r="1.9"/></svg></span></div>
      <div class="prow"><span class="av">S</span><span class="pt"><b>samlee.mobbin+1 <span class="guest">Guest</span></b><i>Full access</i></span><span class="pd"><svg viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="1.9"/><circle cx="12" cy="12" r="1.9"/><circle cx="19" cy="12" r="1.9"/></svg></span></div>
    </div>

    <div class="ga">General access</div>
    <div class="garow">
      <span class="tile"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><rect x="4.2" y="10.4" width="15.6" height="10.4" rx="2.6"/><path d="M8 10.4V7.6a4 4 0 0 1 8 0v2.8"/><circle cx="12" cy="15.4" r="1.3" fill="currentColor" stroke="none"/></svg></span>
      <span class="gat">Only people invited</span>
      <span class="cv"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 5 7 7-7 7"/></svg></span>
    </div>

    <div class="cta">Share link</div>
  </div>
</div>"""


# ------------------------------------------------------------------- boards ---
BOARDS = [
    ("00-design-tokens", "Notion iOS — Design Tokens", CSS_00, BODY_00),
    ("01-splash", "Notion iOS — Splash", CSS_01, BODY_01),
    ("02-search-ask-ai", "Notion iOS — Search / Ask AI", CSS_02, BODY_02),
    ("03-notion-ai-chat", "Notion iOS — Notion AI chat", CSS_03, BODY_03),
    ("04-meeting-page", "Notion iOS — Meeting page", CSS_04, BODY_04),
    ("05-date-sheet", "Notion iOS — Date sheet", CSS_05, BODY_05),
    ("06-share-settings-sheet", "Notion iOS — Share settings sheet", CSS_06, BODY_06),
]

if __name__ == "__main__":
    for board in BOARDS:
        write(*board)
