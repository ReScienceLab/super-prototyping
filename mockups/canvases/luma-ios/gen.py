#!/usr/bin/env python3
"""Luma iOS event-detail replica. One generator, every board in this folder.

This script is the single source for all 19 .html artboards here plus
layout.json. Never hand-edit those files: they are measured output, and the
next regeneration would silently overwrite the edit. Change this script and
re-run it, from anywhere:

    python3 mockups/canvases/luma-ios/gen.py

Every number below traces to a measurement on the @3x captures (the eight
Mobbin screens embedded in refassets.json); see the evidence tables on the
00b/00c boards. assets.json holds the hero/map/avatar bitmaps as data: URIs,
refassets.json the full source captures for the reference row.
"""
import json, pathlib

HERE = pathlib.Path(__file__).resolve().parent
A = json.load(open(HERE / 'assets.json'))
OUT = HERE

# ---------------------------------------------------------------- tokens ----
TOKENS = """:root{
  --l-font:-apple-system,BlinkMacSystemFont,"SF Pro Text","SF Pro Display","Helvetica Neue",Helvetica,Arial,sans-serif;

  /* Ambient backdrop — a measured 24x52 field per event, upscaled and blurred */
  --l-bg-a:#918A72;       /* ELSEWHERE field median                      */
  --l-bg-b:#9B8C7B;       /* Clay Date! field median                     */
  --l-bg-c:#602A34;       /* Karaoke field median                        */

  /* Fills (white over the backdrop) */
  --l-fill-btn:rgba(255,255,255,.10);   /* action button                 */
  --l-fill-card:rgba(255,255,255,.10);  /* invite banner, manage tile    */
  --l-fill-round:rgba(255,255,255,.075);/* round "more" button           */
  --l-round-mat:saturate(.5);           /* round "more" button material  */
  --l-hairline:rgba(255,255,255,.07);   /* section divider, chip outline */
  --l-scrim-nav:rgba(0,0,0,.47);        /* nav scrim over the nav blur   */
  --l-nav-blur:blur(60px) saturate(.72);/* nav bar material              */
  --l-mat-foot:rgba(64,66,70,.415);     /* sticky-footer material, full  */

  /* Ink */
  --l-ink:#FFFFFF;                      /* titles, body, names           */
  --l-ink-2:rgba(255,255,255,.6);       /* labels, dates, addresses      */
  --l-ink-glyph:rgba(255,255,255,.84);  /* button glyph + label, dots    */
  --l-ink-inv:#000000;                  /* label on a white button       */
  --l-amber:#F1CD8A;                    /* host-only section headers     */
  --l-red:#FB7871;                      /* Cancel Event                  */
  --l-cta:#FFFFFF;                      /* sticky call-to-action fill    */

  /* Radius */
  --l-r-card:14px;  --l-r-btn:14px;  --l-r-tile:16px;
  --l-r-pill:999px; --l-r-phone:52px;

  /* Type — SF Pro, Chrome-calibrated against the captures */
  --l-t-title:600 28px/34px var(--l-font);  /* event title              */
  --l-t-nav:600 17px/22px var(--l-font);    /* nav bar title            */
  --l-track-nav:-.16px;                     /* nav title tracking       */
  --l-t-h2:600 22px/28px var(--l-font);     /* description heading      */
  --l-t-body:400 17px/24px var(--l-font);   /* description copy         */
  --l-t-list:400 17px/28px var(--l-font);   /* numbered list item       */
  --l-t-row:500 17px/22px var(--l-font);    /* venue name, host name    */
  --l-t-date:400 17px/22px var(--l-font);   /* date line                */
  --l-t-cta:500 17px/22px var(--l-font);    /* sticky button label      */
  --l-t-stat:600 20px/24px var(--l-font);   /* guest-stat number        */
  --l-t-label:500 15px/20px var(--l-font);  /* section header           */
  --l-t-name:500 15px/20px var(--l-font);   /* invite-banner name       */
  --l-t-meta:400 15px/20px var(--l-font);   /* address, guest, tile     */
  --l-t-sub:400 13px/18px var(--l-font);    /* host tagline, stat label */
  --l-t-chip:500 13px/18px var(--l-font);   /* tag chip                 */
  --l-t-btn:500 12px/16px var(--l-font);    /* action button label      */
  --l-t-time:600 17px/22px var(--l-font);   /* status bar clock         */

  /* Metrics */
  --l-gutter:20px;      /* screen gutter, both sides                    */
  --l-content:353px;    /* 393 - 2 x gutter                             */
  --l-status:54px;      /* status bar                                   */
  --l-nav:110.7px;      /* nav bar bottom edge                          */
  --l-hero:352px;       /* hero card, 353 x 352                         */
  --l-map:120px;        /* map card height                              */
  --l-avatar:32px;      /* guest / host avatar                          */
  --l-btn-h:54.3px;     /* action button height                         */
  --l-btn-w:83.675px;   /* action button width (gap 6.1)                */
  --l-tile:112.33px;    /* manage tile, square, gap 8                   */
  --l-cta-h:50px;       /* sticky button height                         */
  --l-rule:24px;        /* section label ink top -> divider             */
}"""

# ------------------------------------------------------------------ base ----
BASE = """*{box-sizing:border-box;margin:0;padding:0}
/* No board background: the phone floats on the canvas ground, and its drop shadow
   lands on whatever the artboard is placed over instead of a cream rectangle. */
body{font-family:var(--l-font);-webkit-font-smoothing:antialiased;
  display:flex;justify-content:center;padding:24px}
.phone{width:393px;height:852px;position:relative;border-radius:var(--l-r-phone);overflow:hidden;
  flex:none;background:#000;color:var(--l-ink);
  box-shadow:0 0 0 11px #1D191A, 0 0 0 12.5px #3A3735, 0 24px 60px rgba(29,25,26,.28)}
.bg{position:absolute;left:-8%;top:-8%;width:116%;height:116%;
  background-size:100% 100%;filter:blur(11px)}
.scroll{position:absolute;inset:0;overflow:hidden}
.scroll.faded{-webkit-mask-image:linear-gradient(#000 733px,rgba(0,0,0,.105) 798px,transparent 800px);
  mask-image:linear-gradient(#000 733px,rgba(0,0,0,.105) 798px,transparent 800px)}
.doc{position:absolute;left:0;width:393px}
.doc>*{position:absolute;left:20px;width:353px}
.hero,.map{border-radius:var(--l-r-card);display:block;object-fit:cover}
.rule{height:1px;background:var(--l-hairline)}

/* type roles */
.t-title{font:var(--l-t-title)}
.t-h2{font:var(--l-t-h2)}
.t-body{font:var(--l-t-body)}
.t-list{font:var(--l-t-list)}
.t-row{font:var(--l-t-row)}
.t-date{font:var(--l-t-date);color:var(--l-ink-2)}
.t-label{font:var(--l-t-label);color:var(--l-ink-2)}
.t-meta{font:var(--l-t-meta)}
.t-sub{font:var(--l-t-sub);color:var(--l-ink-2)}
.dim{color:var(--l-ink-2)}
.t-body a{color:inherit;text-decoration:underline;text-underline-offset:.7px;
  text-decoration-thickness:1px;text-decoration-color:rgba(255,255,255,.36)}

/* section header: label left, optional action right */
.sect{display:flex;justify-content:space-between;align-items:baseline}
.sect.amber{color:var(--l-amber)}
.sect.amber .lk{position:absolute;right:2px;top:2.67px;width:10px;height:14.33px}
.sect.amber .lk svg{width:100%;height:100%;display:block}

/* action buttons */
.btns{display:flex;gap:6.1px;height:var(--l-btn-h)}
.btns>div{width:var(--l-btn-w);height:var(--l-btn-h);border-radius:var(--l-r-btn);
  background:var(--l-fill-btn);position:relative;color:var(--l-ink-glyph)}
.btns>div.pri{background:#fff;color:var(--l-ink-inv)}
.btns .gl{position:absolute;left:50%;top:19.1px;transform:translate(-50%,-50%)}
.btns .gl svg{width:100%;height:100%;display:block}
.btns .lb{position:absolute;left:0;right:0;top:30.81px;text-align:center;font:var(--l-t-btn)}

/* rows with an avatar */
.arow{display:flex;align-items:center;gap:10px}
.arow img{width:var(--l-avatar);height:var(--l-avatar);border-radius:50%;flex:none;object-fit:cover}
.arow .nm{font:var(--l-t-row)}

/* weather corner: icon ink box and temperature both placed from measurement */
.wxi svg{width:100%;height:100%;display:block}

/* tag chip */
.chip{display:inline-block;width:auto;font:var(--l-t-chip);color:var(--l-ink-2);
  border:1px solid var(--l-hairline);border-radius:var(--l-r-pill);padding:5px 8.5px}

/* manage tiles */
.tiles{display:flex;gap:8px}
.tile{width:var(--l-tile);height:var(--l-tile);border-radius:var(--l-r-tile);
  background:var(--l-fill-card);padding:13px;position:relative;flex:none}
.tile .ic{width:34px;height:34px;border-radius:50%;background:rgba(255,255,255,.11);
  display:grid;place-items:center}
.tile .ic span{display:block}
.tile .ic svg{width:100%;height:100%;display:block}
.tile .lb{position:absolute;left:13px;right:8px;bottom:13.4px;font:var(--l-t-meta)}
.tile.dngr .ic{background:rgba(251,120,113,.18);color:var(--l-red)}
.tile.dngr .lb{color:var(--l-red)}

/* guest stats */
.stats{display:grid;grid-template-columns:repeat(3,115px);gap:4px}
.stats b{font:var(--l-t-stat);display:block}

/* chrome */
.nav{position:absolute;left:0;top:0;width:393px;height:var(--l-nav);
  background:var(--l-scrim-nav);
  -webkit-backdrop-filter:var(--l-nav-blur);backdrop-filter:var(--l-nav-blur)}
.foot{position:absolute;inset:0;pointer-events:none;
  background:linear-gradient(rgba(64,66,70,0) 723px,var(--l-mat-foot) 800px)}
.nav .ttl{position:absolute;left:0;top:77.6px;width:393px;text-align:center;font:var(--l-t-nav);
  letter-spacing:var(--l-track-nav)}
.grab{position:absolute;left:176.67px;top:59px;width:40px;height:4px;border-radius:2px;
  background:rgba(255,255,255,.32)}
.statusbar{position:absolute;left:0;top:0;width:393px;height:var(--l-status)}
.statusbar .time{position:absolute;left:0;top:18.2px;width:142.4px;font:var(--l-t-time);
  display:flex;align-items:center;justify-content:center;gap:3.1px}
.statusbar .time svg{position:static;width:17.5px;height:17.5px;display:block;flex:none}
.statusbar svg{position:absolute;display:block;fill:#fff}
.island{position:absolute;top:11px;left:50%;transform:translateX(-50%);
  width:125px;height:36px;border-radius:20px;background:#000}
/* the indicator is not white: iOS picks a colour against the wallpaper, measured per screen */
.homebar{position:absolute;left:50%;bottom:8px;transform:translateX(-50%);
  width:139px;height:5px;border-radius:3px}
.sticky{position:absolute;left:20px;top:748px;width:353px;height:var(--l-cta-h);
  display:flex;gap:7.3px}
.sticky .cta{flex:1;height:var(--l-cta-h);border-radius:var(--l-r-pill);background:var(--l-cta);
  color:var(--l-ink-inv);font:var(--l-t-cta);display:grid;place-items:center}
.sticky .more{width:50px;height:50px;border-radius:50%;background:var(--l-fill-round);
  -webkit-backdrop-filter:var(--l-round-mat);backdrop-filter:var(--l-round-mat);
  display:grid;place-items:center;flex:none;color:var(--l-ink-glyph)}
.sticky .more svg{width:100%;height:100%;display:block}"""

# ------------------------------------------------------------------ svg -----
# Every glyph is drawn so its ink fills the viewBox edge to edge, then rendered at
# the reference's measured ink box (GLYPH / TGLYPH / the .lk and wx rules below).
def s(p, vb='0 0 24 24', sw=1.7):
    return '<svg viewBox="%s" fill="none" stroke="currentColor" stroke-width="%s" ' \
           'stroke-linecap="round" stroke-linejoin="round">%s</svg>' % (vb, sw, p)
def f(p, vb='0 0 24 24'):
    return '<svg viewBox="%s" fill="currentColor">%s</svg>' % (vb, p)

IC = {
 # ticket, filled, semicircular notches left and right; "+" knocked out (Register)
 'ticket': f('<path fill-rule="evenodd" d="M4.2 0H19.8A4.2 4.2 0 0 1 24 4.2V8.05a2.45 2.45 0 0 0 0 4.9V16.8A4.2 4.2 0 0 1 19.8 21H4.2A4.2 4.2 0 0 1 0 16.8V12.95a2.45 2.45 0 0 0 0-4.9V4.2A4.2 4.2 0 0 1 4.2 0Zm8.7 6.2a.9.9 0 0 0-1.8 0v3.4H7.7a.9.9 0 0 0 0 1.8h3.4v3.4a.9.9 0 0 0 1.8 0v-3.4h3.4a.9.9 0 0 0 0-1.8h-3.4V6.2Z"/>', '0 0 24 21'),
 # the same ticket without the plus (Registration tile)
 'ticket2': f('<path d="M4.2 0H19.8A4.2 4.2 0 0 1 24 4.2V8.05a2.45 2.45 0 0 0 0 4.9V16.8A4.2 4.2 0 0 1 19.8 21H4.2A4.2 4.2 0 0 1 0 16.8V12.95a2.45 2.45 0 0 0 0-4.9V4.2A4.2 4.2 0 0 1 4.2 0Z"/>', '0 0 24 21'),
 # envelope, filled, flap knocked out (Contact)
 'mail': f('<path fill-rule="evenodd" d="M5.4 0H18.6A5.4 5.4 0 0 1 24 5.4V15.6A5.4 5.4 0 0 1 18.6 21H5.4A5.4 5.4 0 0 1 0 15.6V5.4A5.4 5.4 0 0 1 5.4 0Zm.75 5a1.05 1.05 0 0 0-1.35 1.6l5.55 4.75a2.55 2.55 0 0 0 3.3 0l5.55-4.75A1.05 1.05 0 1 0 17.85 5l-5.25 4.5a.8.8 0 0 1-1.2 0L6.15 5Z"/>', '0 0 24 21'),
 # square and arrow up, stroked (Share)
 'share': s('<path d="M12 1.6V14.2"/><path d="M7.2 6.4 12 1.6l4.8 4.8"/>'
            '<path d="M7.4 9.6H5.1A3.5 3.5 0 0 0 1.6 13.1v5.3A3.5 3.5 0 0 0 5.1 21.9h13.8a3.5 3.5 0 0 0 3.5-3.5v-5.3a3.5 3.5 0 0 0-3.5-3.5h-2.3"/>',
            '0 0 24 23.5', 3.2),
 # three dots; the viewBox is the dot row itself, 13 x 3
 'more': f('<circle cx="1.665" cy="1.665" r="1.665"/><circle cx="7.835" cy="1.665" r="1.665"/>'
           '<circle cx="14.005" cy="1.665" r="1.665"/>', '0 0 15.67 3.33'),
 # person with a plus clear of the body (Invite)
 'invite': f('<circle cx="7.8" cy="6.2" r="6.2"/>'
             '<path d="M7.8 13.6c4.3 0 7.8 3.5 7.8 7.8 0 3-3.5 4.9-7.8 4.9S0 24.4 0 21.4c0-4.3 3.5-7.8 7.8-7.8Z"/>'
             '<path d="M19.65 14.4a1.15 1.15 0 0 1 1.15 1.15v2.15h2.05a1.15 1.15 0 0 1 0 2.3H20.8v2.15a1.15 1.15 0 0 1-2.3 0V20h-2.05a1.15 1.15 0 0 1 0-2.3h2.05v-2.15a1.15 1.15 0 0 1 1.15-1.15Z"/>',
             '0 0 24 26.3'),
 # viewfinder brackets, thick, centre bar below the middle (Check In)
 'checkin': s('<path d="M1.7 8.2V5.1A3.4 3.4 0 0 1 5.1 1.7H8.2"/>'
              '<path d="M15.8 1.7h3.1A3.4 3.4 0 0 1 22.3 5.1V8.2"/>'
              '<path d="M22.3 15.8v3.1a3.4 3.4 0 0 1-3.4 3.4h-3.1"/>'
              '<path d="M8.2 22.3H5.1a3.4 3.4 0 0 1-3.4-3.4v-3.1"/>'
              '<path d="M6.4 13.4h11.2"/>', '0 0 24 24', 3.4),
 # megaphone: one fused horn, knob at the base (Blast)
 'blast': f('<path d="M24 1.7v18.9a1.7 1.7 0 0 1-2.4 1.55L5.9 15.6V6.7L21.6.15A1.7 1.7 0 0 1 24 1.7Z"/>'
            '<path d="M5.9 6.7v8.9H3.4A3.4 3.4 0 0 1 0 12.2v-2.1A3.4 3.4 0 0 1 3.4 6.7h2.5Z"/>'
            '<circle cx="6.6" cy="19.9" r="3.5"/>', '0 0 24 23.4'),
 'sun': s('<circle cx="12" cy="12" r="4.6"/>'
          '<path d="M12 1.4v2.2M12 20.4v2.2M1.4 12h2.2M20.4 12h2.2M4.55 4.55l1.55 1.55'
          'M17.9 17.9l1.55 1.55M19.45 4.55l-1.55 1.55M6.1 17.9l-1.55 1.55"/>', '0 0 24 24', 2.8),
 # crescent outline plus two four-point sparkles; viewBox is the measured ink box, in pt
 'moon': ('<svg viewBox="0 0 16.67 17.67" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">'
          '<path transform="rotate(-9 7.165 10.5)" d="M4.765 4.713A6.265 6.265 0 1 0 12.952 12.9A6.265 6.265 0 0 1 4.765 4.713Z"/>'
          '<path d="M9.67 -0.065Q9.875 1.645 11.72 1.835Q9.875 2.025 9.67 3.735Q9.465 2.025 7.62 1.835Q9.465 1.645 9.67 -0.065Z" fill="currentColor" stroke="none"/>'
          '<path d="M13.5 3.3Q13.82 6.18 16.7 6.5Q13.82 6.82 13.5 9.7Q13.18 6.82 10.3 6.5Q13.18 6.18 13.5 3.3Z" fill="currentColor" stroke="none"/></svg>'),
 # padlock: hollow shackle over a filled body
 'lock': f('<path d="M12 0a8.4 8.4 0 0 0-8.4 8.4v5.2h4.3V8.4a4.1 4.1 0 0 1 8.2 0v5.2h4.3V8.4A8.4 8.4 0 0 0 12 0Z"/>'
           '<rect x="0" y="12.8" width="24" height="21.6" rx="5.4"/>', '0 0 24 34.4'),
 # round bubble with a small tail bottom left
 'chat': f('<circle cx="12.4" cy="11.6" r="11.6"/>'
           '<path d="M5.5 19.2c1.35 1.5 1.15 3.35-.5 4.35-.35.2-.2.72.2.7 2.7-.15 4.75-1.5 5.7-3.15L5.5 19.2Z"/>',
           '0 0 24 24'),
 # outlined pencil with the compose underline
 'pencil': s('<path d="M15.6 2.35 21.25 8l-11.4 11.4-6.75 1.1 1.1-6.75L15.6 2.35Z"/>'
             '<path d="m13.4 4.55 5.65 5.65"/><path d="M14.3 22.3h8.4"/>', '0 0 24 23.6', 2.6),
 # one silhouette in front, a crescent of a second behind and right
 'people': f('<circle cx="8.4" cy="6" r="6"/>'
             '<path d="M8.4 13.2c4.65 0 8.4 2.95 8.4 6.6 0 1.65-3.75 2.5-8.4 2.5S0 21.45 0 19.8c0-3.65 3.75-6.6 8.4-6.6Z"/>'
             '<path d="M16 1.05a5.05 5.05 0 0 1 0 9.9 7.5 7.5 0 0 0 0-9.9Z"/>'
             '<path d="M17.3 12.8c-.85 0-1.65.07-2.4.2 1.95 1.5 3.2 3.65 3.2 6.05 0 .5-.06.95-.18 1.4C21.75 20 24 19.05 24 17.6c0-2.65-2.95-4.8-6.7-4.8Z"/>',
             '0 0 24 22.6'),
 # flared lid with ears, two grooves in the body
 'trash': f('<path d="M9 0h6a2 2 0 0 1 2 2v1.2H7V2a2 2 0 0 1 2-2Z"/>'
            '<path d="M1.3 3.2h21.4a1.3 1.3 0 0 1 0 2.6H1.3a1.3 1.3 0 0 1 0-2.6Z"/>'
            '<path fill-rule="evenodd" d="M2.8 6.6h18.4l-1 14.5a3 3 0 0 1-3 2.8H6.8a3 3 0 0 1-3-2.8L2.8 6.6Zm7 4a.9.9 0 0 0-.9.9v7a.9.9 0 0 0 1.8 0v-7a.9.9 0 0 0-.9-.9Zm4.4 0a.9.9 0 0 0-.9.9v7a.9.9 0 0 0 1.8 0v-7a.9.9 0 0 0-.9-.9Z"/>',
            '0 0 24 23.9'),
 # open envelope, white, inside the purple invite badge
 'envelope': f('<path d="M12 0 23.4 7.1v1.5L12 15.9.6 8.6V7.1L12 0Z"/>'
               '<path d="M.6 10.5 12 17.6l11.4-7.1v6.1A3.4 3.4 0 0 1 20 20H4a3.4 3.4 0 0 1-3.4-3.4v-6.1Z"/>',
               '0 0 24 20'),
 'loc': f('<path d="M21.4 3.2 3.6 10.4c-.7.3-.6 1.3.1 1.45l7.35 1.5 1.5 7.35c.15.7 1.15.8 1.45.1L21.4 3.2Z"/>'),
}

# Measured reference ink boxes, in pt. Action buttons: s1 y-band 576..591, s4 541..557.
GLYPH = {'ticket': (16.0, 14.0), 'mail': (16.0, 14.0), 'share': (15.33, 15.35),
         'more': (12.57, 2.67), 'invite': (14.0, 15.35), 'checkin': (16.0, 16.0),
         'blast': (14.0, 14.0)}
# Manage tiles, s6.
TGLYPH = {'chat': (16.7, 16.0), 'pencil': (19.1, 18.0), 'people': (19.35, 17.35),
          'ticket2': (20.0, 17.33), 'trash': (20.35, 18.67)}

# Status bar, placed from measured runs on s1/s4/s7: bars x282.0..301.3 (w 3.33,
# pitch 5.33, heights 4.33/6.67/9.33/12.00, bottom 35.34), wifi x309.0..325.7 y23.3..35.3,
# battery fill x335.0..356.3 y25.0..33.7, time ink x56.0..87.0 (46.0..77.0 with the arrow).
SB_ICONS = (
 '<svg style="left:282px;top:23.34px;width:19.33px;height:12px" viewBox="0 0 19.33 12">'
 '<rect x="0" y="7.67" width="3.33" height="4.33" rx="1.05"/>'
 '<rect x="5.33" y="5.33" width="3.33" height="6.67" rx="1.05"/>'
 '<rect x="10.67" y="2.67" width="3.33" height="9.33" rx="1.05"/>'
 '<rect x="16" y="0" width="3.33" height="12" rx="1.05"/></svg>'
 '<svg preserveAspectRatio="none" viewBox="335 22.008 19.114 13.796"'
 ' style="left:309px;top:23px;width:16.62px;height:12.3px">'
 '<path d="M344.555 35.8042C344.738 35.8042 344.896 35.7212 345.219 35.4058L347.245'
 ' 33.4634C347.369 33.3389 347.403 33.1562 347.286 33.0068C346.747 32.3096 345.726'
 ' 31.7036 344.555 31.7036C343.352 31.7036 342.331 32.3345 341.791 33.0566C341.708'
 ' 33.1895 341.741 33.3389 341.874 33.4634L343.891 35.4058C344.215 35.7129 344.373'
 ' 35.8042 344.555 35.8042ZM339.7 31.2886C339.882 31.4629 340.106 31.438 340.272'
 ' 31.2554C341.268 30.1514 342.895 29.3462 344.555 29.3545C346.232 29.3462 347.859'
 ' 30.1763 348.872 31.2803C349.021 31.4546 349.229 31.4463 349.411 31.2803L350.698'
 ' 30.002C350.831 29.8691 350.848 29.6865 350.723 29.5371C349.47 28.0015 347.145'
 ' 26.8477 344.555 26.8477C341.966 26.8477 339.641 28.0015 338.388 29.5371C338.263'
 ' 29.6865 338.272 29.8525 338.413 30.002L339.7 31.2886ZM336.255 27.8189C336.421'
 ' 27.9766 336.653 27.9766 336.811 27.8106C338.853 25.644 341.542 24.4985 344.555'
 ' 24.4985C347.585 24.4985 350.291 25.6523 352.317 27.8189C352.466 27.9683 352.69'
 ' 27.96 352.856 27.8022L354.002 26.6567C354.151 26.5073 354.143 26.3247 354.027'
 ' 26.1836C352.076 23.7764 348.407 22.0083 344.555 22.0083C340.712 22.0083 337.027'
 ' 23.7764 335.084 26.1836C334.968 26.3247 334.968 26.5073 335.109 26.6567L336.255'
 ' 27.8189Z"/></svg>'
 '<svg style="left:333px;top:23px;width:27.3px;height:12.7px" viewBox="0 0 27.3 12.7">'
 '<rect x=".6" y=".6" width="24.1" height="11.5" rx="4" fill="none" stroke="#fff"'
 ' stroke-opacity=".38"/><rect x="2" y="2" width="21.3" height="8.7" rx="2.6"/>'
 '<path d="M26.1 4.3c.9.7.9 3 0 3.7V4.3Z" fill-opacity=".38"/></svg>')

# --------------------------------------------------------------- helpers ----
def statusbar(loc=False):
    return ('<div class="statusbar"><div class="island"></div>'
            '<div class="time"><span>9:41</span>%s</div>%s</div>'
            % (IC['loc'].replace('<svg ', '<svg style="color:#fff" ') if loc else '', SB_ICONS))

def blk(top, cls, html, left=20, w=353, extra=''):
    return ('<div class="%s" style="top:%.2fpx;left:%.2fpx;width:%.2fpx;%s">%s</div>'
            % (cls, top, left, w, extra, html))

def rule(top):
    return blk(top, 'rule', '')

def sect(box_top, label, right='', amber=False, div_top=None):
    """Section header. `box_top` is the label's line-box top; the divider sits
    24pt below the label's ink top (ink top = box_top + 4.67)."""
    lk = '<span class="lk">%s</span>' % IC['lock'] if amber else ''
    r = '<span>%s</span>' % right if right else ''
    h = blk(box_top, 'sect t-label' + (' amber' if amber else ''),
            '<span>%s</span>%s%s' % (label, r, lk))
    return h + (rule(div_top) if div_top else '')

def btns(items):
    return ''.join('<div class="%s"><span class="gl" style="width:%.2fpx;height:%.2fpx">%s</span>'
                   '<span class="lb">%s</span></div>'
                   % ('pri' if i == 0 else '', GLYPH[ic][0], GLYPH[ic][1], IC[ic], lb)
                   for i, (lb, ic) in enumerate(items))

def wx(icon, ix, iy, iw, ih, temp, ty):
    """Weather corner. Both boxes are ink boxes read off the capture: the icon at
    (ix, iy, iw, ih) and the temperature's cap top at ty, right-aligned to x373."""
    return (blk(iy, 'wxi', IC[icon], left=ix, w=iw, extra='height:%.2fpx' % ih)
            + blk(ty - 4.67, 't-meta dim', temp, left=273, w=100, extra='text-align:right'))

# ------------------------------------------------------------- documents ----
def doc_a():
    d = []
    d.append(blk(75.5, 'hero', '', extra='height:352px;background:url(%s) center/cover;' % A['hero_a']))
    d.append(blk(443.4, 't-title', 'ELSEWHERE - Tappan<br>Gallery Opening'))
    d.append(blk(518.7, 't-date', 'Tomorrow, 6:00&#8239;PM - 8:00&#8239;PM'))
    d.append(blk(564.0, 'btns', btns([('Register', 'ticket'), ('Contact', 'mail'),
                                      ('Share', 'share'), ('More', 'more')])))
    d.append(sect(640.6, 'Location', div_top=669.3))
    d.append(blk(682.4, 't-row', 'Tappan'))
    d.append(blk(705.3, 't-meta dim', '8200 Melrose Ave, Los Angeles, CA<br>90046, USA'))
    d.append(wx('sun', 346.15, 693.0, 19.03, 18.33, '22&deg;C', 720.7))
    d.append(blk(756.67, 'map', '', extra='height:120px;background:url(%s) center/cover;' % A['map_a']))
    d.append(blk(887.3, 't-meta dim', 'Please RSVP - https://www.tappancollective.com/<br>pages/elsewhere-tappan-art-talk-rsvp'))
    d.append(sect(949.3, 'Host', 'Contact', div_top=978.0))
    d.append(blk(990.7, 'arow', '<img src="%s" alt=""><span class="nm">Tappan Collective</span>' % A['av_a_host'],
                 extra='height:32px'))
    d.append(sect(1045.0, '4 Going', div_top=1073.7))
    d.append(blk(1088.7, '', '<img src="%s" alt="" style="width:104px;height:32px;display:block">' % A['av_a_going'],
                 extra='height:32px'))
    d.append(blk(1129.3, 't-meta', 'Emily, Tappan Collective, Chelsea Neman<br>Nassib, Max'))
    d.append(sect(1191.3, 'About Event', div_top=1220.0))
    d.append(blk(1228.3, 't-body',
                 'Join us for cocktails as we celebrate the<br>'
                 'opening of our latest group exhibition,<br>'
                 'ELSEWHERE. Enjoy an evening with Tappan<br>'
                 'artists, our advisory team, and a special<br>'
                 'conversation with Los Angeles painter Satsuki<br>'
                 'Shibuya.<br><br>Please RSVP =<br>'
                 '<a href="#">https://www.tappancollective.com/pages/else<br>'
                 'where-tappan-art-talk-rsvp</a>'))
    d.append(blk(1492.3, '', '<span class="chip"># Arts &amp; Culture</span>'))
    return ''.join(d), 1660

def doc_b(temp='22&deg;C'):
    d = []
    d.append(blk(75.5, 'hero', '', extra='height:352px;background:url(%s) center/cover;' % A['hero_b']))
    d.append(blk(443.4, 't-title', 'Clay Date!'))
    d.append(blk(485.0, 't-date', 'Sun, 29 Jun, 11.00&#8239;AM - 12.00&#8239;PM'))
    d.append(blk(530.0, 'btns', btns([('Invite', 'invite'), ('Check In', 'checkin'),
                                      ('Blast', 'blast'), ('More', 'more')])))
    d.append(sect(607.0, 'Location', div_top=635.7))
    d.append(blk(648.0, 't-row', '1226 University Dr'))
    d.append(blk(671.6, 't-meta dim', 'Menlo Park, California'))
    d.append(wx('sun', 346.49, 650.0, 19.03, 18.33, temp, 677.3))
    d.append(blk(704.0, 'map', '', extra='height:120px;background:url(%s) center/cover;' % A['map_b']))
    d.append(blk(834.6, 't-meta dim', 'Door code: 0240'))
    d.append(sect(877.0, 'Guest Stats', amber=True, div_top=905.67))
    d.append(blk(917.7, 'stats t-sub',
                 '<div><b>1</b>Going</div><div><b>1</b>Invited</div><div><b>0</b>Not Going</div>',
                 extra='height:52px'))
    d.append(sect(984.6, 'Host', div_top=1013.3))
    d.append(blk(1024.4, 'arow',
                 '<img src="%s" alt=""><div><div class="nm">Alex Smith</div>'
                 '<div class="t-sub">Lover of themed parties!</div></div>' % A['av_b_host'],
                 extra='height:40px'))
    d.append(sect(1086.0, '1 Going', div_top=1114.7))
    d.append(blk(1129.7, '', '<img src="%s" alt="" style="width:32px;height:32px;border-radius:50%%;display:block">' % A['av_b_going'],
                 extra='height:32px'))
    d.append(blk(1170.3, 't-meta', 'Sam'))
    d.append(sect(1212.3, 'About Event', div_top=1241.0))
    d.append(blk(1249.3, 't-h2', 'Clay date this Friday!'))
    d.append(blk(1293.3, 't-list',
                 '<div style="display:flex"><span style="width:22px;flex:none">1.</span>'
                 '<span>Get inspired</span></div>'
                 '<div style="display:flex"><span style="width:22px;flex:none">2.</span>'
                 '<span>Sculpt your figurines</span></div>'
                 '<div style="display:flex"><span style="width:22px;flex:none">3.</span>'
                 '<span>Trade figures with your friends!</span></div>'))
    d.append(blk(1400.7, '', '<span class="chip"># Arts &amp; Culture</span>'))
    d.append(sect(1451.3, 'Manage Event', amber=True))
    d.append(blk(1482.3, 'tiles',
                 tile('chat', 'Create Chat') + tile('pencil', 'Edit Event') + tile('people', 'Manage<br>Hosts'),
                 extra='height:112.33px'))
    d.append(blk(1602.7, 'tiles',
                 tile('ticket2', 'Registration') + tile('trash', 'Cancel<br>Event', True),
                 extra='height:112.33px'))
    return ''.join(d), 1765

def tile(icon, label, danger=False):
    return ('<div class="tile%s"><div class="ic"><span style="width:%.2fpx;height:%.2fpx">%s</span>'
            '</div><div class="lb">%s</div></div>'
            % (' dngr' if danger else '', TGLYPH[icon][0], TGLYPH[icon][1], IC[icon], label))

def doc_c(temp='18&deg;C'):
    d = []
    d.append(blk(75.5, 'hero', '', extra='height:352px;background:url(%s) center/cover;' % A['hero_c']))
    d.append(blk(443.4, 't-title', 'Karaoke'))
    d.append(blk(484.6, 't-date', 'Today, 10.00&#8239;PM - 11.00&#8239;PM'))
    d.append(blk(522.0, '', '<img src="%s" alt="" style="position:absolute;left:16px;top:12px;'
                 'width:40px;height:40px;border-radius:50%%">'
                 '<div style="position:absolute;left:68.7px;top:10.7px" class="t-row">'
                 '<div style="font:var(--l-t-name)">Jason Smith</div>'
                 '<div class="t-sub" style="margin-top:2px">invited you</div></div>'
                 '<div style="position:absolute;right:19.33px;top:30.67px;width:12.57px;'
                 'height:2.67px;color:var(--l-ink-glyph)">%s</div>'
                 # the invite badge overlaps the avatar, so it is drawn, not cropped:
                 # purple disc x64.33..78.67 y560.67..575.33, ring in the card blend #6A3F47
                 '<div style="position:absolute;left:44.33px;top:38.67px;width:14.33px;'
                 'height:14.67px;border-radius:50%%;background:#7C4AFE;'
                 'box-shadow:0 0 0 1.5px #6A3F47;display:grid;place-items:center">'
                 '<span style="width:8.6px;height:7.2px;display:block;color:#fff">%s</span></div>'
                 % (A['av_c_ban'], IC['more'], IC['envelope']),
                 extra='height:64px;background:var(--l-fill-card);border-radius:var(--l-r-card);position:absolute'))
    d.append(blk(602.0, 'btns', btns([('Register', 'ticket'), ('Contact', 'mail'),
                                      ('Share', 'share'), ('More', 'more')])))
    d.append(sect(678.6, 'Location', div_top=707.3))
    d.append(blk(720.4, 't-row', '633 Rose Ave'))
    d.append(blk(743.3, 't-meta dim', 'Los Angeles, California'))
    d.append(wx('moon', 349.0, 722.0, 16.67, 17.67, temp, 749.0))
    d.append(blk(775.67, 'map', '', extra='height:120px;background:url(%s) center/cover;' % A['map_c']))
    d.append(sect(918.3, 'Host', 'Contact', div_top=947.0))
    d.append(blk(959.7, 'arow', '<img src="%s" alt=""><span class="nm">Jason Smith</span>' % A['av_c_host'],
                 extra='height:32px'))
    d.append(sect(1014.3, 'About Event', div_top=1043.0))
    d.append(blk(1051.3, 't-body',
                 'Get ready to kick off your July with a bang!<br>'
                 'Join John Smith at <a href="#">633 Rose Ave in Venice</a> for<br>'
                 'a morning karaoke party you won&rsquo;t forget.<br>'
                 'Whether you&rsquo;re a shower singer or a stage<br>'
                 'superstar, this is your chance to grab the mic,<br>'
                 'belt out your favorite tunes, and cheer on your<br>'
                 'friends.'))
    d.append(blk(1232.0, 't-body',
                 'Bring your best moves, your wildest song<br>'
                 'choices, and let&rsquo;s make some memories<br>'
                 'together. Don&rsquo;t be shy&mdash;everyone&rsquo;s invited to<br>'
                 'sing! See you there!'))
    return ''.join(d), 1500

# --------------------------------------------------------------- screens ----
def screen(fam, scroll, hb, nav=None, nav_a=None, sticky=None, loc=False, temp=None):
    body, h = {'a': doc_a, 'b': lambda: doc_b(temp) if temp else doc_b(),
               'c': lambda: doc_c(temp) if temp else doc_c()}[fam]()
    parts = ['<div class="phone">',
             '<div class="bg" style="background-image:url(%s)"></div>' % A['bg_' + fam],
             '<div class="scroll%s"><div class="doc" style="top:%.2fpx;height:%dpx">%s</div></div>'
             % (' faded' if sticky else '', -scroll, h, body)]
    if nav:
        # scrim alpha is measured on each screen: iOS's dark material runs a luminance
        # curve CSS cannot express, so one alpha cannot serve every backdrop
        parts.append('<div class="nav" style="background:rgba(0,0,0,%.3f)"><div class="ttl">%s</div>'
                     '</div>' % (nav_a, nav))
    parts.append('<div class="grab"></div>')
    if sticky:
        parts.append('<div class="foot"></div>' + sticky)
    parts.append(statusbar(loc))
    parts.append('<div class="homebar" style="background:%s"></div></div>' % hb)
    return ''.join(parts)

STICKY_FULL = ('<div class="sticky"><div class="cta">%s</div></div>')
STICKY_PAIR = ('<div class="sticky"><div class="cta">%s</div>'
               '<div class="more"><span style="width:15.67px;height:3.33px;display:block">'
               '%s</span></div></div>')

def page(title, body, extra_css=''):
    return ('<!DOCTYPE html>\n<html lang="en">\n<head>\n<meta charset="UTF-8">\n'
            '<title>%s</title>\n<style>\n%s\n\n%s\n%s</style>\n</head>\n<body>\n%s\n</body>\n</html>\n'
            % (title, TOKENS, BASE, extra_css, body))

def write(name, html):
    (OUT / (name + '.html')).write_text(html)
    print(name, len(html))

SCREENS = [
 ('01-guest-top',      'Guest / top',          dict(fam='a', scroll=0,      loc=True, hb='#F0F0F0')),
 ('02-guest-mid',      'Guest / location',     dict(fam='a', scroll=559.67, loc=True, hb='#E3E5E4',
                                                    nav='ELSEWHERE - Tappan Gallery Opening', nav_a=.488,
                                                    sticky=STICKY_FULL % 'Register')),
 ('03-guest-about',    'Guest / about',        dict(fam='a', scroll=804.33, loc=True, hb='#E4E5E5',
                                                    nav='ELSEWHERE - Tappan Gallery Opening', nav_a=.628,
                                                    sticky=STICKY_FULL % 'Register')),
 ('04-host-top',       'Host / top',           dict(fam='b', scroll=0, hb='#D8D5D6')),
 ('05-host-stats',     'Host / guest stats',   dict(fam='b', scroll=492.0,  nav='Clay Date!', nav_a=.471,
                                                    temp='21&deg;C', hb='#D0D0D0')),
 ('06-host-manage',    'Host / manage event',  dict(fam='b', scroll=909.33, nav='Clay Date!', nav_a=.459,
                                                    temp='21&deg;C', hb='#D5D5D7')),
 ('07-invited-top',    'Invited / top',        dict(fam='c', scroll=0, hb='#010201')),
 ('08-invited-about',  'Invited / about',      dict(fam='c', scroll=636.67, nav='Karaoke', nav_a=.259, hb='#FDFDFD',
                                                    temp='17&deg;C',
                                                    sticky=STICKY_PAIR % ('Accept Invite', IC['more']))),
]

for name, label, kw in SCREENS:
    write(name, page('Luma iOS — ' + label, screen(**kw)))

# ------------------------------------------------------------ token board ---
def swatch(var, val, note, chip=None):
    return ('<div class="sw"><div class="chip" style="background:%s"></div>'
            '<div class="swm"><b>%s</b><i>%s</i><s>%s</s></div></div>'
            % (chip or val, var, val, note))

TOKEN_CSS = """body{background:#EDEBE7;padding:0}
.board{width:430px;height:932px;background:#1B1815;border-radius:20px;padding:16px 22px 14px;
  box-shadow:0 18px 44px rgba(29,25,26,.22);overflow:hidden;color:#fff;position:relative}
.board::before{content:"";position:absolute;inset:0;background:url(BGA) center/100% 100%;
  filter:blur(24px);opacity:.55}
.board>*{position:relative}
header{display:flex;gap:10px;align-items:flex-start;padding-bottom:7px;
  border-bottom:1px solid rgba(255,255,255,.14)}
.mark{width:30px;height:30px;border-radius:8px;background:#fff;color:#1B1815;flex:none;
  display:grid;place-items:center;font:700 17px/1 var(--l-font)}
h1{font:600 18px/22px var(--l-font)}
header p{font:400 10.5px/14px var(--l-font);color:rgba(255,255,255,.62);margin-top:2px}
h2{font:600 9px/12px var(--l-font);letter-spacing:.8px;text-transform:uppercase;
  color:rgba(255,255,255,.45);margin:3px 0 2px}
.grid{display:grid;grid-template-columns:repeat(4,1fr);gap:5px}
.sw .chip{height:18px;border-radius:5px;border:1px solid rgba(255,255,255,.14)}
.swm{margin-top:3px;display:flex;flex-direction:column}
.swm b{font:600 8.5px/11px ui-monospace,Menlo,monospace}
.swm i{font:400 8px/11px ui-monospace,Menlo,monospace;color:rgba(255,255,255,.62);font-style:normal;
  word-break:break-all}
.swm s{font:400 8.5px/11px var(--l-font);color:rgba(255,255,255,.42);text-decoration:none}
.type .tr{display:flex;align-items:baseline;justify-content:space-between;gap:10px;
  padding:0 0 1px;border-bottom:1px solid rgba(255,255,255,.08)}
.type .tr span{white-space:nowrap;overflow:hidden}
.type em{font:400 8px/11px ui-monospace,Menlo,monospace;color:rgba(255,255,255,.42);
  font-style:normal;white-space:nowrap;flex:none}
.rad{display:flex;gap:8px}
.rad>div{text-align:center}
.rb{width:40px;height:22px;background:rgba(255,255,255,.16);border:1px solid rgba(255,255,255,.14)}
.rad em{display:block;margin-top:1px;font:400 8.5px/11px var(--l-font);
  color:rgba(255,255,255,.42);font-style:normal}
.metrics{margin-top:2px;font:400 8.5px/12px ui-monospace,Menlo,monospace;color:rgba(255,255,255,.62)}
.comps{height:76px;overflow:hidden}
.comps>div{display:flex;gap:10px;align-items:center;transform:scale(.66);transform-origin:0 0;
  width:151.5%}
.comps .btns{height:54.3px}
.comps .tile{background:var(--l-fill-card);flex:none}"""

def token_board():
    c = ''.join([
      '<h2>Ambient backdrop &mdash; measured 24&times;52 field per event</h2>',
      '<div class="grid">',
      ''.join('<div class="sw"><div class="chip" style="background:url(%s) center/100%% 100%%"></div>'
              '<div class="swm"><b>--l-bg-%s</b><i>%s</i><s>%s</s></div></div>'
              % (A['bg_' + k], k, v, n)
              for k, v, n in (('a', '#918A72', 'ELSEWHERE'), ('b', '#9B8C7B', 'Clay Date!'),
                              ('c', '#602A34', 'Karaoke'))),
      '<div class="sw"><div class="chip" style="background:url(%s) center/100%% 100%%;filter:blur(4px)">'
      '</div><div class="swm"><b>blur(11px)</b><i>116%% inset</i><s>as rendered</s></div></div>' % A['bg_a'],
      '</div>',
      '<h2>Fills over the backdrop</h2><div class="grid">',
      swatch('--l-fill-btn', 'rgba(255,255,255,.10)', 'action button'),
      swatch('--l-fill-card', 'rgba(255,255,255,.10)', 'banner, tile'),
      swatch('--l-fill-round', 'rgba(255,255,255,.075)', 'round more'),
      swatch('--l-hairline', 'rgba(255,255,255,.07)', 'divider, chip'),
      '</div><div class="grid" style="margin-top:6px">',
      swatch('--l-scrim-nav', 'rgba(0,0,0,.47)', 'nav bar', chip='#000'),
      swatch('--l-ink', '#FFFFFF', 'title, body'),
      swatch('--l-ink-2', 'rgba(255,255,255,.6)', 'label, date'),
      swatch('--l-cta', '#FFFFFF', 'sticky button'),
      '</div><div class="grid" style="margin-top:6px">',
      swatch('--l-amber', '#F1CD8A', 'host sections'),
      swatch('--l-red', '#FB7871', 'Cancel Event'),
      swatch('--l-ink-inv', '#000000', 'on white'),
      swatch('--l-mat-foot', 'rgba(64,66,70,.415)', 'sticky scrim', chip='#404246'),
      '</div><div class="grid" style="margin-top:6px">',
      swatch('--l-ink-glyph', 'rgba(255,255,255,.84)', 'glyph, label, dots'),
      swatch('--l-round-mat', 'saturate(.5)', 'round button', chip='#4E4A46'),
      '</div><p class="metrics">--l-nav-blur: blur(60px) saturate(.72) &middot; nav scrim solved per '
      'screen .259&ndash;.628</p>',
      '<h2>Type &mdash; SF Pro</h2><div class="type">',
      ''.join('<div class="tr"><span style="font:var(--l-t-%s);%s">%s</span><em>--l-t-%s &middot; %s</em></div>'
              % (v, st, tx, v, sp) for v, tx, sp, st in (
                  ('title', 'Karaoke', '28/34 &middot; 600', ''),
                  ('h2', 'Clay date this Friday!', '22/28 &middot; 600', ''),
                  ('nav', 'ELSEWHERE - Tappan', '17/22 &middot; 600', ''),
                  ('body', 'Join us for cocktails as we', '17/24 &middot; 400', ''),
                  ('list', '1.&nbsp;&nbsp;Get inspired', '17/28 &middot; 400', ''),
                  ('row', 'Tappan Collective', '17/22 &middot; 500', ''),
                  ('date', 'Tomorrow, 6:00 - 8:00 PM', '17/22 &middot; 400', 'color:var(--l-ink-2)'),
                  ('stat', '12', '20/24 &middot; 600', ''),
                  ('label', 'About Event', '15/20 &middot; 500', 'color:var(--l-ink-2)'),
                  ('meta', '8200 Melrose Ave, Los Angeles', '15/20 &middot; 400', ''),
                  ('chip', '# Arts &amp; Culture', '13/18 &middot; 500', ''),
                  ('sub', 'Lover of themed parties!', '13/18 &middot; 400', 'color:var(--l-ink-2)'),
                  ('btn', 'Register', '12/16 &middot; 500', ''))),
      '</div>',
      '<h2>Radius &amp; metrics</h2><div class="rad">',
      ''.join('<div><div class="rb" style="border-radius:var(--l-r-%s)"></div><em>%s</em></div>'
              % (k, n) for k, n in (('card', 'card 14'), ('btn', 'btn 14'), ('tile', 'tile 16'),
                                    ('pill', 'pill 999'), ('phone', 'phone 52'))),
      '</div><p class="metrics">gutter 20 &middot; content 353 &middot; hero 353&times;352 &middot; map 353&times;120 '
      '&middot; avatar 32 &middot; status 54 &middot; nav 110.7<br>action btn 83.675&times;54.3 gap 6.1 &middot; '
      'tile 112.33 gap 8 &middot; sticky 353&times;50 @ y748 &middot; label ink &rarr; rule 24</p>',
      ])
    body = ('<div class="board"><header><div class="mark">l</div><div>'
            '<h1>Luma iOS &mdash; Design Tokens</h1>'
            '<p>Eight 393&times;852&nbsp;pt @3x captures. Every artboard here inlines this '
            '<code>:root</code> byte-identically.</p></div></header>'
            + c + '</div>')
    return page('Luma iOS — Design Tokens', body, TOKEN_CSS.replace('BGA', A['bg_a']))

write('00-design-tokens', token_board())


# ------------------------------------------------------- 00b evidence -------
# The Phase-1 table. It does not fit on the token board, so it gets its own
# artboard rather than being trimmed: the evidence is the deliverable.
EV_CSS = """body{background:#EDEBE7;padding:24px}
.board{width:430px;height:932px;background:#1B1815;border-radius:20px;padding:15px 20px 12px;
  box-shadow:0 18px 44px rgba(29,25,26,.22);overflow:hidden;color:#fff;position:relative}
.board::before{content:"";position:absolute;inset:0;background:url(BGA) center/100% 100%;
  filter:blur(24px);opacity:.55}
.board>*{position:relative}
header{padding-bottom:7px;border-bottom:1px solid rgba(255,255,255,.14)}
h1{font:600 17px/21px var(--l-font)}
h1 span{font:400 11px/21px ui-monospace,Menlo,monospace;color:rgba(255,255,255,.38);margin-left:5px}
header p{font:400 10px/13px var(--l-font);color:rgba(255,255,255,.62);margin-top:2px}
h2{font:600 9px/12px var(--l-font);letter-spacing:.8px;text-transform:uppercase;
  color:rgba(255,255,255,.42);margin:8px 0 3px}
table{width:100%;border-collapse:collapse;table-layout:fixed}
th{font:600 8px/11px var(--l-font);letter-spacing:.5px;text-transform:uppercase;
  color:rgba(255,255,255,.34);text-align:left;padding:0 4px 2px 0}
td{font:400 8.5px/11.5px var(--l-font);color:rgba(255,255,255,.86);padding:1.5px 4px 1.5px 0;
  border-top:1px solid rgba(255,255,255,.07);vertical-align:top;word-break:break-word}
td.k,td.v{font-family:ui-monospace,Menlo,monospace;font-size:7.5px;line-height:11.5px}
td.k{color:#F1CD8A}
td.v{color:rgba(255,255,255,.72)}
col.c1{width:70px}col.c2{width:106px}
.note{margin-top:7px;font:400 8.5px/12px var(--l-font);color:rgba(255,255,255,.5)}"""

EVIDENCE = [
 ('Face and type &mdash; Chrome-calibrated, &Delta; = render &minus; capture in pt', [
  ('--l-font', 'SF Pro / -apple-system', 'refkit font: "Gallery" .867 (margin .083), "Opening" .914, '
   '"Karaoke" .871 &mdash; no call inside the SF family, so the platform stack, not a webfont'),
  ('--l-t-title', '600 28px/34px', 'w +0.7 h +0.0; line pitch 34.0 measured s1 450.7&rarr;484.3'),
  ('--l-t-nav', '600 17px/22px', '17/600 gives w +4.7 h +0.7; 16px was &minus;10.0 wide'),
  ('--l-track-nav', '&minus;.16px', 'the +4.7pt residual over 29 characters of nav title across s2, s3, s5, '
   's6, s8 &mdash; tracking, not the wrong size'),
  ('--l-t-h2', '600 22px/28px', '"Clay date this Friday!" +0.3 / +0.0'),
  ('--l-t-body', '400 17px/24px', '+0.7 / +0.0; pitch 24.0 on s2, s3, s8'),
  ('--l-t-list', '400 17px/28px', '+0.0 / +0.0; pitch 28.3 on s6'),
  ('--l-t-row', '500 17px/22px', '"1226 University Dr" &minus;0.3 / +0.0; "Tappan Collective" h +0.0'),
  ('--l-t-date', '400 17px/22px', 'h +0.0 on s1, s4, s7'),
  ('--l-t-cta', '500 17px/22px', '"Register" +0.0; "Accept Invite" +0.3 / +0.3'),
  ('--l-t-stat', '600 20px/24px', '"0" +0.0 / +0.0 on s5'),
  ('--l-t-label', '500 15px/20px', '"Host" +0.0, "4 Going" +0.3, "About Event" +0.0, "Guest Stats" +0.0'),
  ('--l-t-name', '500 15px/20px', '"Jason Smith" +0.3 / +0.0 in the s7 invite banner'),
  ('--l-t-meta', '400 15px/20px', 'address +0.0 / +0.0; "Please RSVP - https://..." +0.3 / +0.0'),
  ('--l-t-sub', '400 13px/18px', '"invited you" +0.3; "Lover of themed parties!" +0.3; "Going" +0.3'),
  ('--l-t-chip', '500 13px/18px', '"# Arts &amp; Culture" &minus;0.3'),
  ('--l-t-btn', '500 12px/16px', '"Register" +0.0 under the action-button icon'),
  ('--l-t-time', '600 17px/22px', 'status clock ink x56.0..87.0, h +0.0'),
 ]),
 ('Colour &mdash; alphas solved against the recovered ambient field', [
  ('--l-ink', '#FFFFFF', 's1 title &alpha; 1.000; venue .994; body .989'),
  ('--l-ink-2', 'rgba(255,255,255,.6)', 's1 date &alpha; .592, "Location" .604, address .604'),
  ('--l-amber', '#F1CD8A', 's6 label core [241.4, 205.3, 134.3]; s5 [240, 205, 142]'),
  ('--l-red', '#FB7871', 's6 "Cancel Event" core [248.8, 120.7, 112.4]'),
  ('--l-fill-btn', 'rgba(255,255,255,.10)', 's1 &alpha; .108 / .093 / .098, s7 .098 / .102 / .103, '
   'solved against the field recovered above and below the button row'),
  ('--l-fill-card', 'rgba(255,255,255,.10)', 's6 tile &alpha; .096 / .110 / .093; s7 banner .089 / .098 / .096'),
  ('--l-fill-round', 'rgba(255,255,255,.075)', 's8 round button [80 64 65] over field [78.5 45.5 49.5]: '
   '&alpha; .088 / .075 in G / B once the desaturation is taken out'),
  ('--l-ink-glyph', 'rgba(255,255,255,.84)', 'peak of the s1 Contact glyph over its own button fill: '
   '&alpha; .844 / .816 / .814. Button labels, banner dots and the round button read the same'),
  ('--l-hairline', 'rgba(255,255,255,.07)', '1pt coverage solve on the s8 dividers: &alpha; .062 / .065 / .061'),
  ('--l-ink-inv', '#000000', 'darkest 3% inside the white Register button reads [0 0 0] on both s1 and s7'),
  ('--l-bg-a/b/c', '#918A72 #9B8C7B #602A34', 'medians of the three recovered 24&times;52 fields; a clean '
   's2 page region samples &alpha; 0.000 against its own field'),
 ]),
 ('Materials &mdash; iOS blur, fitted against real Chrome renders', [
  ('--l-nav-blur', 'blur(60px) saturate(.72)', 's5 and s6 nav bands differ by a uniform ~14 levels with no '
   'glyph structure; a white button behind smears ~100pt wide'),
  ('--l-scrim-nav', 'rgba(0,0,0,.47)', 'solved per screen by rendering at &alpha; .30 and .60 and fitting the '
   'line: s2 .488, s3 .628, s5 .471, s6 .459, s8 .259; predicted vs ref RGB within &plusmn;3'),
  ('--l-mat-foot', 'rgba(64,66,70,.415)', 'gutters under the sticky bar: family a darkens &minus;25, family c '
   '<i>lightens</i> +6 &rarr; grey material, not a black scrim; fit err 0.87. b has no sticky and no gradient'),
  ('--l-round-mat', 'saturate(.5)', 's8 round button chroma 16.0 against a backdrop chroma of 33.0 at '
   'matching luminance &mdash; the button desaturates what is behind it, it does not just tint it'),
  ('content fade', 'mask 733&rarr;806px', 'ink-deviation ratio ref/mine 1.026 @728, 0.998 @734, 0.989 @746'),
 ]),
 ('Geometry &mdash; off the labelled grid, confirmed with bbox / scan / bands', [
  ('--l-gutter / --l-content', '20 / 353', 'every text column and card edge lands on 20.0 and 373.0'),
  ('--l-status / --l-nav', '54 / 110.7', 'nav bottom edge from a column scan on s2, s3, s5, s6, s8'),
  ('--l-hero / --l-map', '352 / 120', 'hero bbox 20, 75.5 &rarr; 373, 427.5; map card 353&times;120'),
  ('--l-r-card / --l-r-tile', '14 / 16', 'corner run length on the hero, the map and the manage tiles'),
  ('--l-btn-w / --l-btn-h', '83.675 / 54.3', 'four buttons, gap 6.1, across 20..373; first is white on ink'),
  ('--l-avatar', '32', 'x20..52, text column starts 62.7; banner avatar 40 at x36'),
  ('--l-tile', '112.33', 'gap 8, radius 16, padding 13, 34pt icon circle top-left'),
  ('--l-cta-h', '50', 's2/s3 full width 20..373; s8 pill 20..315.7 + 50pt circle 323..373'),
  ('--l-rule', '24', 'section label ink top &rarr; divider; divider &rarr; row box top +13.07. '
   'The amber host sections (Guest Stats, Manage Event) have <i>no</i> divider'),
  ('stat columns', 'x20 / 139 / 258', 'grid 3&times;115 with gap 4'),
  ('grabber', '40&times;4 @ y59', 'x176.67..216.67, y59..63'),
  ('status bar ink', 'measured runs', 'clock x56..87 (46..77 with the arrow), arrow w13.0 h12.7; bars '
   'x282..301.3 w3.33 pitch 5.33 h 4.33/6.67/9.33/12.0 bottom 35.34; wifi x309..325.7; battery fill x335..356.3'),
  ('scroll offsets', '0 / 559.67 / 804.33', 'normalised cross-correlation of the map card across each family; '
   'b: 0 / 492.0 / 909.33, c: 0 / 636.67. The backdrop is screen-fixed &mdash; s5 and s6 gutters are '
   'pixel-identical, as are s1/s2/s3 and s7/s8'),
 ]),
]

def evidence_board(sub, sections, note):
    rows = []
    for head, items in sections:
        rows.append('<h2>%s</h2><table><col class="c1"><col class="c2"><col>'
                    '<tr><th>token</th><th>value</th><th>evidence</th></tr>' % head)
        rows += ['<tr><td class="k">%s</td><td class="v">%s</td><td>%s</td></tr>' % r for r in items]
        rows.append('</table>')
    body = ('<div class="board"><header><h1>Luma iOS &mdash; Phase 1 evidence <span>%s</span></h1>'
            '<p>Eight 393&times;852&nbsp;pt captures at exactly 3.000&times; (1179/393, 2556/852). '
            'Nothing without a row here became a token.</p></header>' % sub + ''.join(rows) +
            '<p class="note">%s</p></div>' % note)
    return page('Luma iOS — Phase 1 evidence ' + sub, body, EV_CSS.replace('BGA', A['bg_a']))

write('00b-evidence', evidence_board('1 / 2', EVIDENCE[:2],
      'Type was calibrated against Chrome, not against PIL: <code>-apple-system</code> renders ~6% wider '
      'than SFNS.ttf, so every size and weight was fitted by rendering candidates at 3&times; and matching '
      'both the ink width and the ink height of the capture.'))
write('00c-evidence', evidence_board('2 / 2', EVIDENCE[2:],
      'A nav-material fit taken from a PIL Gaussian landed +23 levels off once Chrome rendered it. '
      'The working method is to render at two known alphas, fit the line per screen, and solve for the '
      'target &mdash; calibrate against the engine that ships the pixels.'))

# --------------------------------------------- 00d / 00e: how it was made ----
# The process that produced this folder, on the canvas next to its output. Same
# dark treatment as the token and evidence sheets so Foundations reads as one set.
PROC_CSS = """body{background:#EDEBE7;padding:24px}
.board{width:430px;height:932px;background:#1B1815;border-radius:20px;padding:15px 20px 12px;
  box-shadow:0 18px 44px rgba(29,25,26,.22);overflow:hidden;color:#fff;position:relative}
.board::before{content:"";position:absolute;inset:0;background:url(BGA) center/100% 100%;
  filter:blur(24px);opacity:.55}
.board>*{position:relative}
header{padding-bottom:8px;border-bottom:1px solid rgba(255,255,255,.14)}
h1{font:600 17px/21px var(--l-font)}
h1 span{font:400 11px/21px ui-monospace,Menlo,monospace;color:rgba(255,255,255,.38);margin-left:5px}
header p{font:400 10px/13.5px var(--l-font);color:rgba(255,255,255,.62);margin-top:3px}
h2{font:600 9px/12px var(--l-font);letter-spacing:.8px;text-transform:uppercase;
  color:rgba(255,255,255,.42);margin:7px 0 4px}
.ph{display:flex;gap:9px;padding:5px 0;border-top:1px solid rgba(255,255,255,.07)}
.ph.first{border-top:0}
.ph .n{width:18px;height:18px;border-radius:50%;flex:none;margin-top:1px;
  background:rgba(255,255,255,.10);color:#F1CD8A;
  font:600 9.5px/18px ui-monospace,Menlo,monospace;text-align:center}
.ph .b{flex:1;min-width:0}
.ph h3{font:600 11.5px/15px var(--l-font);display:flex;justify-content:space-between;gap:8px}
.ph h3 em{font:400 9px/15px ui-monospace,Menlo,monospace;color:#F1CD8A;font-style:normal;flex:none}
.ph p{font:400 9px/12px var(--l-font);color:rgba(255,255,255,.74);margin-top:2px}
.cmd{display:block;margin-top:4px;font:400 7.5px/12px ui-monospace,Menlo,monospace;
  color:rgba(255,255,255,.52);background:rgba(0,0,0,.24);border-radius:4px;padding:4px 6px;
  white-space:pre-wrap;word-break:break-word}
.ph p code,.inv code{font:400 8.5px/12px ui-monospace,Menlo,monospace;color:#F1CD8A;
  background:rgba(0,0,0,.24);border-radius:3px;padding:0 3px}
.inv{font:400 9px/13px var(--l-font);color:rgba(255,255,255,.74);
  padding:3px 0;border-top:1px solid rgba(255,255,255,.07)}
.inv b{color:#F1CD8A;font-weight:600;margin-right:4px}
.fm{display:flex;gap:8px;padding:2.5px 0;border-top:1px solid rgba(255,255,255,.07)}
.fm b{width:98px;flex:none;font:400 7.5px/13px ui-monospace,Menlo,monospace;color:#F1CD8A;
  word-break:break-all}
.fm i{font:400 9px/13px var(--l-font);font-style:normal;color:rgba(255,255,255,.74)}
.loop{margin-top:3px;font:400 8.5px/16px ui-monospace,Menlo,monospace;
  color:rgba(255,255,255,.7);background:rgba(0,0,0,.24);border-radius:6px;padding:8px 10px}
.loop em{font-style:normal;color:#F1CD8A}
.sc{display:flex;align-items:center;gap:7px;padding:2.5px 0}
.sc b{width:76px;flex:none;font:400 8.5px/12px var(--l-font);font-weight:400;
  color:rgba(255,255,255,.74)}
.sc .bar{flex:1;height:7px;border-radius:3.5px;background:rgba(255,255,255,.09);overflow:hidden}
.sc .bar i{display:block;height:100%;background:#F1CD8A;opacity:.8}
.sc s{width:26px;flex:none;text-align:right;text-decoration:none;
  font:400 8.5px/12px ui-monospace,Menlo,monospace;color:#fff}
.note{margin-top:9px;font:400 8.5px/12.5px var(--l-font);color:rgba(255,255,255,.5)}"""

def proc_board(sub, title, lede, body, note):
    html = ('<div class="board"><header><h1>%s <span>%s</span></h1><p>%s</p></header>'
            % (title, sub, lede) + body + '<p class="note">%s</p></div>' % note)
    return page('Luma iOS — ' + title, html, PROC_CSS.replace('BGA', A['bg_a']))

# Phase, headline number, what actually happened, the command that did it.
PHASES = [
 ('0', 'Collect references', '8 captures @3x',
  'Eight Mobbin frames of the Luma event detail screen, saved to the scratch directory before '
  'anything else because image caches rotate mid-task. Scale is locked once and reused everywhere: '
  '1179/393 and 2556/852 both give exactly 3.000, so a disagreement over ~1% would have meant a bad crop.',
  'curl -sL &lt;image_url&gt; -o p1.png   # x8, 1179&times;2676'),
 ('1', 'Grid on the image, then LOOK', '47 evidence rows',
  'A labelled grid is drawn onto every capture and read <i>as an image</i>, element by element, before a '
  'single pixel is sampled. Sampling blind returns numbers with no idea which element they belong to, and '
  'those land in the wrong token.',
  'refkit grid s1.png -o g01.png --zoom 3 --minor 10 --major 50\n'
  'refkit sample s1.png 20 566 373 620 --pt 3\n'
  'refkit hairline s8.png 20 700 373 701 --bg 1B1815 --scale 3'),
 ('2', 'Design system before any screen', '50 tokens',
  'One <code>:root</code> block, inlined byte-identically into all 19 artboards &mdash; they render in '
  '<code>iframe srcDoc sandbox=""</code>, so there is no shared stylesheet and the generator is what keeps '
  'them in sync. Every token traces to a row on the two evidence boards to its left.',
  'refkit tokens mockups/canvases/luma-ios'),
 ('3', 'One generator, N artboards', '19 boards',
  'A single 793-line script emits 2.58&nbsp;MB of fully self-contained HTML. No artboard is ever hand-edited: '
  'the next regeneration would silently revert it. Twelve correction passes went into the script, never into '
  'the output.',
  'python3 mockups/canvases/luma-ios/gen.py'),
 ('4', 'Verify by rendering, not by reading', '&Delta; 3.47&ndash;4.50',
  'Render at the capture’s own scale and cut the screen out of the frame, so replica and reference share '
  'one pixel grid. Then read the side-by-side in order: nothing clipped, line wraps match string for string, '
  'structure, then colour. The diff table beats the eye &mdash; one defect read as &ldquo;4 levels dark&rdquo; '
  'and measured as a whole backdrop desaturated at matching luminance.',
  'refkit shoot 0*.html -o mine --scale 3 --crop-phone --check-overflow\n'
  'refkit diff mine/s8.png refs/s8.png --pt 3 -o d08.png --regions regions.json'),
 ('5', 'Park the reference underneath', '3 rows',
  'The eight captures go up as their own row, unretouched and with attribution intact, in the same order as '
  'the mockups. Rows are laid out at <code>index &times; (w + gap)</code> from x&nbsp;=&nbsp;0, so item N of row 3 '
  'lands directly under item N of row 2 and the replica is auditable against its source at a glance.',
  'layout.json &rarr; "Source of truth: captures"'),
]

RULES = [
 ('Evidence or it is not a token.', 'Anything without a row on 00b/00c did not get into the '
  ':root block. 47 rows, 50 tokens.'),
 ('One writer, many lookers.', 'Verification is per-screen and read-only, so it fans out to '
  'subagents. Editing never does &mdash; two agents in one generator clobber each other.'),
 ('The generator ships with the boards.', 'gen.py and its assets live in this folder and resolve '
  'paths from __file__, so the run is repeatable after the session that made it is gone.'),
]

def phase_rows():
    out = []
    for i, (n, name, stat, what, cmd) in enumerate(PHASES):
        out.append('<div class="ph%s"><div class="n">%s</div><div class="b">'
                   '<h3>%s<em>%s</em></h3><p>%s</p><div class="cmd">%s</div></div></div>'
                   % (' first' if i == 0 else '', n, name, stat, what, cmd))
    return ''.join(out)

write('00d-process', proc_board(
    'phases 0&ndash;5', 'How this board was made',
    'Every artboard in this page came out of one script. Tokens before HTML, sampling before tokens, '
    'and no number that cannot be traced back to a measurement on the captures in row 3.',
    phase_rows() + '<h2>The three rules that kept it consistent</h2>' +
    ''.join('<div class="inv"><b>%s</b>%s</div>' % r for r in RULES),
    'The phases run in order with one exception: the reference row needs no measurement and the captures '
    'exist at t&nbsp;=&nbsp;0, so those boards go up first and give you something true to look at while the '
    'replica is still being measured.'))

# Mean absolute per-channel delta, replica vs capture, top 56pt excluded (the
# status bar is composited differently by the source). Recomputed from the
# committed boards; see the note on the board for what is deliberately different.
DELTAS = [('1 Guest / top', 3.47), ('2 Guest / location', 3.89), ('3 Guest / about', 4.16),
          ('4 Host / top', 3.49), ('5 Host / stats', 3.85), ('6 Host / manage', 4.17),
          ('7 Invited / top', 3.57), ('8 Invited / about', 4.50)]

FILEMAP = [
 ('gen.py', '793 lines. The only editable source in this folder.'),
 ('assets.json', '258&nbsp;KB. Hero, map and avatar bitmaps as data: URIs.'),
 ('refassets.json', '1.6&nbsp;MB. The eight source captures, for row 3.'),
 ('00*.html', 'Tokens, two evidence sheets, and these two process boards.'),
 ('01&ndash;08*.html', 'The replica screens. 393&times;852&nbsp;pt at 1pt = 1px.'),
 ('ref-01&ndash;08*.html', 'The captures, unretouched, attribution intact.'),
 ('layout.json', 'Three rows. Row 3 is column-aligned under row 2.'),
]

TOOLKIT = [
 ('grid',      'draw a labelled grid so the capture is read with eyes, not sampled blind'),
 ('sample',    'flat fills, small-element modes and ink cores in one census'),
 ('hairline',  'recover a 1pt rule&rsquo;s true colour from a downscaled capture'),
 ('bands',     'ink bands and the pitch between them &rarr; the real row height'),
 ('bbox / ink', 'an element&rsquo;s box; <code>ink</code> drops a neighbour sharing the window'),
 ('scan',      'collapse a row or column to colour runs &rarr; the exact edge'),
 ('font',      'rank candidate faces at a common cap height, from a closed set'),
 ('shoot',     'render a board, crop the phone, and prove it does not clip'),
 ('diff',      'the side-by-side <i>and</i> the numbers behind it, per region'),
 ('batch',     'replay every probe, reference against render, in one process'),
 ('tokens',    'one shared <code>:root</code>; no <code>var()</code> that was never defined'),
]

DIFFS = [
 ('Dynamic Island', 'Mobbin composites it out of the capture; the frame spec draws it, so it is '
  'present in the replica and absent in the reference.'),
 ('Corner masking', '<code>--crop-phone</code> masks the 52pt corners, so verification crops show '
  'rounded corners where the raw capture is square.'),
 ('Hero, map, avatars', 'Photographic content is a crop of the capture, not a redraw. Those regions '
  'measure near-zero by construction and prove nothing.'),
 ('Time separators', 'The capture writes <code>9.41</code> and <code>6.00&thinsp;PM</code> with a period. '
  'The replica uses a colon, which is what iOS and Luma actually render.'),
]

write('00e-pipeline', proc_board(
    'files &amp; results', 'What is in this folder',
    'The folder is the deliverable and the generator is the source. Anything here that is not gen.py or '
    'an asset JSON is output, and can be thrown away and rebuilt.',
    ''.join('<div class="fm"><b>%s</b><i>%s</i></div>' % f for f in FILEMAP) +
    '<h2>The correction loop, run a dozen times</h2>'
    '<div class="loop">measure the capture &nbsp;<em>&rarr;</em>&nbsp; edit <em>gen.py</em> &nbsp;<em>&rarr;</em>'
    '&nbsp; re-run &nbsp;<em>&rarr;</em>&nbsp; shoot at 3&times; &nbsp;<em>&rarr;</em>&nbsp; diff vs capture<br>'
    '<em>&crarr;</em> back to the top. Never edit a board. A correction you have not re-rendered is not a '
    'correction.</div>'
    '<h2>Mean |&Delta;| per screen &mdash; replica vs capture, 0&ndash;255</h2>' +
    ''.join('<div class="sc"><b>%s</b><div class="bar"><i style="width:%.1f%%"></i></div>'
            '<s>%.2f</s></div>' % (n, v / 6.0 * 100, v) for n, v in DELTAS) +
    '<h2>The toolkit these phases call</h2>' +
    ''.join('<div class="fm"><b>refkit %s</b><i>%s</i></div>' % t for t in TOOLKIT) +
    '<h2>Where the replica differs on purpose</h2>' +
    ''.join('<div class="inv"><b>%s</b>%s</div>' % d for d in DIFFS),
    'All eight land between 3.47 and 4.50 levels, mean 3.89, with the top 56&nbsp;pt excluded. That residual is '
    'antialiasing and JPEG noise in the source, not layout: the p99 sits at 51&ndash;78 and is concentrated on '
    'glyph edges.'))

# ----------------------------------------------------- Phase 5: references ----
# The eight Mobbin captures, unretouched and with their attribution bar intact,
# parked in the same order as the mockup row so item N sits under item N.
REF_CSS = """.rboard{width:430px;height:932px;background:#151311;border-radius:20px;
  padding:14px 20px 12px;box-sizing:border-box;color:#fff;position:relative;overflow:hidden}
.rboard h1{font:600 14px/18px var(--l-font);letter-spacing:-.1px}
.rboard p{font:400 9.5px/13px ui-monospace,Menlo,monospace;color:rgba(255,255,255,.5);margin-top:2px}
.rboard .shot{margin-top:9px;display:flex;justify-content:center}
.rboard img{height:844px;width:auto;display:block;border-radius:6px}
.rboard .near{color:#F1CD8A}"""

REFS = [
 ('01', 'event-detail-guest-01',   'Guest / top',      'exact frame'),
 ('02', 'event-detail-guest-02',   'Guest / location', 'exact frame'),
 ('03', 'event-detail-guest-03',   'Guest / about',    'exact frame'),
 ('04', 'event-detail-hosting-01', 'Host / top',       'exact frame'),
 ('05', 'event-detail-hosting-02', 'Host / stats',     'exact frame'),
 ('06', 'event-detail-hosting-03', 'Host / manage',    'exact frame'),
 ('07', 'event-detail-invited-01', 'Invited / top',    'exact frame'),
 ('08', 'event-detail-invited-02', 'Invited / about',  'exact frame'),
]

def ref_boards():
    R = json.load(open(HERE / 'refassets.json'))
    for n, sid, label, note in REFS:
        body = ('<div class="rboard"><h1>%s &mdash; reference</h1>'
                '<p>%s.png &middot; Mobbin, Luma iOS &middot; 1179&times;2676 @3x &middot; %s</p>'
                '<div class="shot"><img src="%s" alt="%s"></div></div>'
                % (label, sid, note, R['p' + str(int(n))], sid))
        write('ref-' + SCREENS[int(n) - 1][0],
              page('Luma iOS \u2014 reference %s' % n, body, REF_CSS))

ref_boards()


# --------------------------------------------------------------------------------------
# Walkthrough boards: what a replication actually looks like, from the capture you hand
# over to the tokens that come out. The crops are real refkit output, built by mkwalk.py.
# --------------------------------------------------------------------------------------
W = json.load(open(HERE / 'walkassets.json'))

WALK_CSS = PROC_CSS + """
.shot{display:block;margin:0 auto;border-radius:10px}
.spec{border-top:1px solid rgba(255,255,255,.07);padding:5px 0 5px}
.spec.first{border-top:0}
.spec img{display:block;width:390px;border-radius:5px;background:rgba(0,0,0,.2)}
.spec .h{display:flex;justify-content:space-between;gap:8px;align-items:baseline;margin-bottom:4px}
.spec .h b{font:600 11px/14px var(--l-font)}
.spec .h em{font:400 8.5px/14px ui-monospace,Menlo,monospace;color:#F1CD8A;font-style:normal;flex:none}
.spec p{font:400 8.5px/11.5px var(--l-font);color:rgba(255,255,255,.7);margin-top:4px}
.tip{font:400 9px/12.5px var(--l-font);color:rgba(255,255,255,.74);margin-top:5px}
.tip b{color:#F1CD8A;font-weight:600}
.rd{display:flex;gap:8px;padding:2.5px 0;border-top:1px solid rgba(255,255,255,.07)}
.rd b{width:112px;flex:none;font:400 8px/12.5px ui-monospace,Menlo,monospace;color:#F1CD8A}
.rd i{font:400 9px/12.5px var(--l-font);font-style:normal;color:rgba(255,255,255,.74)}
.tk{display:flex;gap:8px;padding:2.5px 0;border-top:1px solid rgba(255,255,255,.07);
  align-items:baseline}
.tk b{width:74px;flex:none;font:400 8px/13px ui-monospace,Menlo,monospace;color:#F1CD8A}
.tk s{width:96px;flex:none;text-decoration:none;
  font:400 8px/13px ui-monospace,Menlo,monospace;color:#fff}
.tk i{font:400 8.5px/13px var(--l-font);font-style:normal;color:rgba(255,255,255,.6)}
.pair{display:flex;gap:8px;margin-top:5px}
.pair figure{flex:1;min-width:0}
.pair img{display:block;width:100%;height:96px;object-fit:cover;border-radius:5px}
.pair figcaption{margin-top:3px;font:400 8px/11px var(--l-font);color:rgba(255,255,255,.6)}
.pair figcaption b{color:#F1CD8A;font-weight:600}"""

def walk_board(sub, title, lede, body, note):
    html = ('<div class="board"><header><h1>%s <span>%s</span></h1><p>%s</p></header>'
            % (title, sub, lede) + body + '<p class="note">%s</p></div>' % note)
    return page('Luma iOS — ' + title, html, WALK_CSS.replace('BGA', A['bg_a']))

def rows(cls, items):
    return ''.join('<div class="%s"><b>%s</b><i>%s</i></div>' % (cls, a, b) for a, b in items)

# --- w1: the input ---------------------------------------------------------------------
write('w1-reference', walk_board(
 'step 1', 'This is all you get',
 'One capture of the screen to replicate, at the highest resolution available &mdash; here 1179&times;2556, '
 'so 3.000 capture px per design pt. Every number on the next three boards is read out of these pixels.',
 '<img class="shot" src="%s" width="302" height="655" alt="Luma event screen with its measured regions">'
 % W['overview'] +
 '<h2>The regions, and what each one needs</h2>' +
 rows('rd', [
  ('hero 20,75&rarr;373,428', 'bbox for the frame, radius by corner run length'),
  ('title 20,450&rarr;373,520', 'the biggest words on the screen &rarr; the face, then size and pitch'),
  ('date 20,528&rarr;262,554', 'a second weight and colour at the same size'),
  ('buttons 20,564&rarr;373,619', 'flat-fill census, and the pitch that gives the button width'),
  ('location 20,634&rarr;373,700', 'the label / divider / row rhythm that repeats down the page'),
 ]),
 'The boxes are drawn on, not guessed at: each one is the box an evidence row was measured in.'))

# --- w2: grid, then look ---------------------------------------------------------------
write('w2-grid', walk_board(
 'step 2', 'Grid the pixels, then look',
 'Before sampling anything, a labelled grid goes onto the capture and gets read <i>as an image</i>. '
 'Cyan every 10pt, red and labelled every 50. Sampling coordinates blind returns numbers with no '
 'element attached, and those land in the wrong token.',
 '<div class="ph first"><div class="b"><div class="cmd">refkit grid s1.png -o g01.png '
 '--zoom 2 --minor 10 --major 50</div></div></div>'
 '<img class="shot" src="%s" width="390" height="193" alt="labelled grid over the title block">'
 % W['grid'] +
 '<h2>Read straight off the labels</h2>' +
 rows('rd', [
  ('x 20 and x 373', 'every text column and every card edge lands on these two &rarr; 20pt gutter, '
   '353pt content'),
  ('y 450, y 484', 'the two title lines &rarr; a 34pt line pitch, before knowing the font size'),
  ('y 528', 'the date line, one 44pt step below the title block'),
  ('y 564 &rarr; 619', 'the button row is 54.3pt tall, four buttons across 353 with a 6.1 gap'),
  ('repeat vocabulary', '20 / 44 / 54 keep coming back. If every measurement were unique you would '
   'be reading antialiasing, not layout'),
 ]) +
 '<h2>Then one command turns a red label into an exact edge</h2>'
 '<div class="cmd">refkit scan s1.png row 592 20 373 --pt 3\n\n'
 '     20.0 ..      20.3   #F9F5F0\n'
 '     20.3 ..      21.3   #FFFDFE\n'
 '     22.0 ..     103.3   #FFFFFF   &lt;- the white Register button\n'
 '    103.3 ..     103.7   #F8F5E8\n'
 '    104.0 ..     105.3   #8D8871   &lt;- backdrop again\n'
 '    109.7 ..     113.0   #91876F</div>'
 '<p class="tip">The button runs 20.0&rarr;103.3, so <b>83.3pt wide</b>, and the next one starts at '
 '109.7 &mdash; a <b>6.4pt gap</b>. Four of those across 353 solve to a width of 83.675 and a gap of '
 '6.1, which is what the token says. No eyeballing, no round number picked because it looked plausible.</p>'
 '<h2>Three commands, three kinds of answer</h2>' +
 rows('rd', [
  ('bands', 'ink bands down a column and the pitch between them &rarr; the real row height. A list '
   'landing on 62.7 / 62.3 / 64.0 / 61.7 is a <b>64pt row</b>, and the spread is glyph height'),
  ('bbox', 'the exact box of one element, for hero frames, avatars and cards'),
  ('scan', 'a row or column collapsed into colour runs &rarr; the edge between two fills, to the pixel'),
 ]),
 'Expect a small vocabulary of repeated numbers. Luma uses 20 / 44 / 54 / 14 / 16 over and over, and '
 'that repetition is the check that you are reading layout rather than antialiasing.'))

# --- w3: the type ----------------------------------------------------------------------
SPECS = [
 (W['w_title'], 'Title', '600 28px/34px',
  '<code>refkit font</code> ranks the letterforms at a common cap height against every candidate face. '
  '"Gallery" .867 with a .083 margin, "Opening" .914, "Karaoke" .871 &mdash; a <b>no call</b> inside the '
  'SF family, which is the honest answer: SF Pro and SF Pro Rounded differ only in corner rounding at '
  'this size. So the token is the platform stack, never a webfont.'),
 (W['w_nav'], 'Nav title', '600 17px/22px, &minus;.16px',
  'Rendering at 17/600 came out <b>+4.7pt wide</b> and +0.7 tall. 16px was &minus;10.0 wide, so the size '
  'was right and something else was off. The same +4.7 over 29 characters showed up on s2, s3, s5, s6 and '
  's8 &mdash; a constant per-character residual, which is tracking, not the wrong size.'),
 (W['w_body'], 'Date line', '400 17px/22px',
  'Same size as the nav title, one weight down, at 60% ink. The alpha is <i>solved</i> against the '
  'recovered backdrop rather than picked, because there is a photo behind it.'),
 (W['w_label'], 'Section label', '500 15px/20px',
  'The amber core samples [241.4, 205.3, 134.3] on s6 and [240, 205, 142] on s5 &rarr; <code>#F1CD8A</code>. '
  '"Host", "About Event", "Guest Stats" and "4 Going" all render within &plusmn;0.3pt at 15/500.'),
]
write('w3-typography', walk_board(
 'step 3', 'Measure the type, do not name it',
 'Four specimens, magnified with nearest-neighbour so the capture\'s own pixel grid stays visible. '
 '&Delta; below is render minus capture, in pt, after rendering the candidate in Chrome at the same scale.',
 ''.join(
  '<div class="spec%s"><div class="h"><b>%s</b><em>%s</em></div>'
  '<img src="%s" alt="%s specimen"><p>%s</p></div>' % (' first' if i == 0 else '', n, v, src, n, why)
  for i, (src, n, v, why) in enumerate(SPECS)) +
 '<h2>What the face check actually prints</h2>'
 '<div class="cmd">refkit font s1.png 20 450 373 484 Gallery --pt 3   <b>&lt;- the whole line</b>\n'
 '  SF Compact     0.106     SF Pro        0.097\n'
 '  SF Pro Rounded 0.091     New York      0.085\n'
 '<b>weak</b>: top score 0.106 &lt; 0.80. Check the box holds exactly\n'
 '"Gallery" and nothing else.</div>'
 '<div class="cmd" style="margin-top:5px">refkit font s1.png <b>20.5 483 109.5 519</b> Gallery --pt 3\n'
 '  <b>SF Pro         0.867</b>     SF Pro Rounded 0.784\n'
 '  Verdana        0.642     SF Compact     0.618\n'
 '<b>call</b>: SF Pro   score 0.867, margin 0.083</div>'
 '<p class="note" style="margin-top:5px">Same word, same image. The only change is boxing <i>one word</i> '
 '&mdash; "Gallery" 21.0&rarr;109.0, an 8pt gap, then "Opening". A box holding more than the word you '
 'named quietly halves the score, and that is how a confident wrong face gets into a token.</p>'
 '<h2>Read the verdict line, not the ranking</h2>' +
 rows('rd', [
  ('call', 'one face clears the next by the margin. Write it down <i>with</i> its score'),
  ('no call', 'the top faces are inside the margin: indistinguishable at this size, or the real face is '
   'outside the set. Record the family; never promote the top row'),
  ('weak', 'top score under 0.80. The box is wrong, or the specimen is too small. Re-run on the '
   'largest instance of the same face'),
 ]),
 'The published classifiers pick from ~3,000 Google Fonts and cannot return "SF Pro" at all, which is '
 'why closed-set matching against the real system faces is the only honest answer here.'))

# --- w4: foundations -------------------------------------------------------------------
write('w4-foundations', walk_board(
 'step 4', 'Measurements become foundations',
 'Every measured pair becomes one composite <code>font:</code> shorthand, not separate size and weight '
 'variables. Sixteen of them cover all eight screens; a seventeenth would mean a measurement was wrong.',
 '<h2>Type scale &mdash; measured &rarr; token</h2>' +
 ''.join('<div class="tk"><b>%s</b><s>%s</s><i>%s</i></div>' % t for t in [
  ('--l-t-title', '600 28px/34px', 'pitch 34.0 measured s1 450.7&rarr;484.3'),
  ('--l-t-nav', '600 17px/22px', 'plus --l-track-nav &minus;.16px'),
  ('--l-t-h2', '600 22px/28px', '+0.3 / +0.0'),
  ('--l-t-body', '400 17px/24px', 'pitch 24.0 on s2, s3, s8'),
  ('--l-t-row', '500 17px/22px', '"1226 University Dr" &minus;0.3'),
  ('--l-t-date', '400 17px/22px', 'h +0.0 on s1, s4, s7'),
  ('--l-t-label', '500 15px/20px', '+0.0 on four different labels'),
  ('--l-t-meta', '400 15px/20px', 'address +0.0 / +0.0'),
  ('--l-t-sub', '400 13px/18px', '"Lover of themed parties!" +0.3'),
  ('--l-t-btn', '500 12px/16px', '"Register" +0.0'),
  ('--l-t-list', '400 17px/28px', 'pitch 28.3 on s6'),
  ('--l-t-cta', '500 17px/22px', '"Accept Invite" +0.3 / +0.3'),
  ('--l-t-stat', '600 20px/24px', '"0" +0.0 / +0.0 on s5'),
  ('--l-t-name', '500 15px/20px', '"Jason Smith" +0.3 / +0.0'),
  ('--l-t-chip', '500 13px/18px', '"# Arts &amp; Culture" &minus;0.3'),
  ('--l-t-time', '600 17px/22px', 'status clock ink x56.0..87.0'),
 ]) +
 '<h2>Colour needs a different technique per region</h2>'
 '<div class="pair">'
 '<figure><img src="%s" alt="button fill"><figcaption><b>Flat fill.</b> A pixel equal to all four '
 'neighbours is a real fill, not an antialiased edge. Census those &rarr; '
 '<code>rgba(255,255,255,.10)</code>.</figcaption></figure>'
 '<figure><img src="%s" alt="title ink"><figcaption><b>Text ink.</b> The mode of a text region returns '
 'its <i>background</i>. Take the extreme few percent instead &rarr; &alpha; 1.000.</figcaption></figure>'
 '</div>' % (W['c_flat'], W['c_ink']) +
 '<h2>Then the contract holds itself</h2>' +
 rows('rd', [
  ('refkit tokens', 'every board must inline the byte-identical <code>:root</code>, and nothing may '
   'reference a token that does not exist &mdash; in the CSS or in the evidence table'),
  ('--check-overflow', 'asks the layout engine, so a clipped board fails here rather than turning up '
   'on the canvas'),
  ('one generator', 'eight screens stay consistent through a dozen correction passes because no '
   'artboard is ever hand-edited'),
 ]),
 'That is the whole chain: capture &rarr; grid &rarr; measurement &rarr; token &rarr; artboard, with '
 'every value tracing back to a pixel someone looked at.'))


LAYOUT = {
 "name": "Luma iOS",
 "rows": [
  {"title": "Foundations",
   "files": [{"file": "00-design-tokens", "label": "Design tokens"},
             {"file": "00b-evidence", "label": "Evidence 1/2"},
             {"file": "00c-evidence", "label": "Evidence 2/2"},
             {"file": "00d-process", "label": "How it was made"},
             {"file": "00e-pipeline", "label": "Files &amp; results"}]},
  {"title": "Luma iOS replica screens", "numbered": True,
   "files": [{"file": n, "label": l} for n, l, _ in SCREENS]},
  {"title": "Walkthrough: replicating one page", "numbered": True,
   "files": [{"file": "w1-reference", "label": "The input"},
             {"file": "w2-grid", "label": "Grid, then look"},
             {"file": "w3-typography", "label": "Measure the type"},
             {"file": "w4-foundations", "label": "Into foundations"}]},
  {"title": "Source of truth: captures", "numbered": True,
   "files": [{"file": "ref-" + SCREENS[int(n) - 1][0], "label": label}
             for n, sid, label, note in REFS]},
 ],
}
(OUT / 'layout.json').write_text(json.dumps(LAYOUT, indent=2) + '\n')
print('layout.json', len(LAYOUT['rows']), 'rows')
