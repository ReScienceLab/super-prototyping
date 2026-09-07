<!-- Written 2026-09-07 after the inspector-panel spike showed `--sa-amber -> rgb(247,246,242)`
for an element whose amber is its background. Kept because the numbers in section 3 decide the
design, and because section 5 is the code that has to live inside the injected agent. -->

# Resolving a board's tokens from inside the inspector frame

**Date:** 2026-09-07
**Context:** the inspector panel (`docs/2026-09-07-inspector-panel-feasibility.md`) promises
"token name above its resolved value" for a selected element. The spike regexes `var(--x)` out
of the inline `style` attribute and prints the element's computed `color` next to whatever it
finds, so `background:var(--sa-amber)` shows the text colour.
**Question asked:** what should the agent compute, so that a person reading the panel can tell
which token drives which visible property, and where must it admit it cannot know?

Everything below was measured against all 180 boards in `mockups/canvases/*/[0-9]*.html`,
in real Chrome, inside a `sandbox="allow-scripts"` frame exactly as the panel loads them.
The scripts are in `scratch/token-resolution/` (gitignored): `census.py` and `census2.py` are
the static counts, `cssom.py` is the CSSOM experiment, `resolver.js` is the agent code,
`sweep.py` runs it on every element of every board, `cases.py`, `inh_case.py` and `inherit.py`
are the targeted checks.

---

## 1. Recommendation

**Bind per declaration from the cascade, resolve each token on the element, and confirm the
binding with a probe element.** Concretely, for a selected element the agent:

1. Collects every declaration that mentions `var()` and reaches the element: from the inline
   `style` attribute *and* from every `<style>` rule whose selector the element `matches()`.
   Each declaration is split property by property, so a `var()` is bound to its own property.
2. Resolves each token with `getComputedStyle(el).getPropertyValue('--x')` — on the element,
   not on `:root`. That returns the token's fully substituted value (`#F0A468`, or
   `590 18px/18px -apple-system,…` for a type token defined through `--sa-font`), and it is the
   only call that honours a scoped redefinition like `.dark{--hs-grey3:#464649}`.
3. Sets the same declaration, with the tokens substituted, on a hidden zero-sized probe, and
   reads which longhands that produced (`background` → `background-color`; `font` → weight,
   size, line-height, family; `border` → twelve sides) and their values. Comparing those to the
   element's own computed longhands proves whether the token actually reached the screen.
4. Reports one of three states per binding. **applied** — every longhand the declaration sets
   matches the element. **partial** — some do, and the declaration that took the rest is named
   (`table.ev td.n font-family: ui-monospace, Menlo, monospace`). **overridden** — none do, and
   the winner is named (`inline border-bottom: none`).
5. For inherited properties the element does not bind itself (`color`, `font-*`,
   `letter-spacing`, …) walks up and reports the nearest ancestor's binding, tagged with where
   it came from (`color ← --l-ink, inherited from div.phone`).

Why this and not the alternatives the brief listed:

- **(a) Parse the inline style per declaration, then read `getComputedStyle(el)[prop]`.**
  Necessary but not sufficient. Only 12% of bindings on these boards come from the inline
  attribute; 88% reach the element through a `<style>` rule (`.card{background:var(--sa-card)}`,
  `.phone{width:var(--sa-w)}`). Reading the computed property back is also the wrong
  confirmation: `getComputedStyle(el).background` is a 60-character shorthand serialisation, and
  for `font` it is empty whenever the element has any non-default font longhand. The probe gives
  the longhand list for free and makes the comparison exact.
- **(b) Resolve the token on `:root` and show its declared value.** Always cheap and never
  wrong about the token, but it does not answer the question. It cannot say which property the
  token feeds, it cannot see that the binding lost the cascade (448 bindings do, on 180 boards),
  and it is wrong on the one board that actually applies `.dark` (19 bindings resolve to a
  different value on the element than on `:root`). It is, however, exactly what the Tokens tab
  needs, so the same resolver computes it once per board.
- **A hybrid** is what the recommendation is: (a) widened to the stylesheet and inheritance,
  (b) done on the element, and a probe joining the two.

The resolver runs in under 10 ms for a median board when asked for every element, 229 ms on
the worst (294 elements), and about 1–8 ms for a single element with its ancestors. Compute a
single element's bindings on `sp:sel`, not up front: the full per-element payload for
`luma-ios/12-home-later` is 107 KB of JSON, while the token list is 11–19 KB.

## 2. What the panel should show

Per selected element, one row per binding, in the order the properties are declared:

```
background   ← --sa-amber          #F0A468   ■        applied
font         ← --sa-t-time         590 18px/18px SF Pro …        applied
             weight 590 · size 18px · line 18px · family -apple-system, "system-ui", …
border       ← --sa-line           #2A2A2A   ■        partial — border-bottom from inline border-bottom: none
color        ← --l-ink             #FFFFFF   ■        applied · inherited from div.phone
```

Three columns carry the three different facts, and the panel should keep them apart:

- **`property ← token`** is the binding: which declaration, from which source (inline, a
  selector, or an ancestor). Show the selector on hover or in a muted suffix.
- **The token's value** is the substituted custom-property value (`#F0A468`), not the
  element's computed `rgb(240, 164, 104)`. The author wrote the hex, the swatch is drawn from
  the canonical `rgb()` the resolver also returns, and the two never disagree for colours.
- **The state** is the honest part. `applied` is proven by the probe. `partial` and
  `overridden` name what won; the design should render the losing token struck through or
  dimmed with the winner's text beside it, because a designer reading "this card's border is
  `--sa-line`" would otherwise be misled on the 1% of elements where an inline
  `border-bottom:none` cut it.

For a `font` binding show the longhands the probe returned (weight, size, line-height, family)
under the row; that is the "type token" reading a designer wants and it is what `partial` will
usually be about (170 of 172 partials are `font` with `font-family` or `font-size` replaced by
a later rule).

For a declaration with more than one token (30 bindings, all `linear-gradient(… var(--g-fade)
72%, var(--g-fade) 100%)` and `repeat(var(--a-cols), var(--a-icon))`) show the declaration
text with each token's value, and the single confirmed longhand. Which token contributed which
stop is not knowable from computed style and should not be pretended.

### The Tokens tab

Group by the author's own `/* headings */` in `:root`. Every one of the 180 boards has them
(1,305 headings, about 7 per board: Surface, Line, Ink, Accent, Radius, Type, Metrics), and
they carry meaning the value cannot (luma's "Fills (white over the backdrop)"). Rules:

- A comment on its own line starts a group; a comment trailing a token on the same line is that
  token's note (2,398 of them across the repo, all luma-style annotations such as
  "host-only section headers"). Show notes as a muted second line.
- Tokens before the first heading (79 boards, 102 tokens, almost always the family
  `--x-font`) go in an unnamed first group. Three boards have no headings at all
  (`00-welcome`, the two `apple-icons` boards): fall back to grouping by kind.
- Each row: swatch for colours (39% of tokens), a small specimen for fonts (27%), the bare
  value for lengths (31%), the value for families and filters. `CSS.supports()` classifies
  every one of the 11,109 tokens into colour / length / font / family / filter / number; none
  land in "other".
- Show `used by N elements` and let a click select or highlight them; 71% of a board's tokens
  are unused on that board (the sheet is shared across the canvas), so sort or dim by use. A
  further 1% are used only through another token (`--sa-font` inside every `--sa-t-*`); show
  those as "via --sa-t-time, …".
- Where a token is redefined under a scope (`.dark{--ac-bg:#000000}`, 469 redefinitions on 35
  boards), show both values on the row with the selector.

The per-element view and the Tokens tab meet at the token name: clicking `--sa-amber` in an
element row jumps to its Tokens row, and the Tokens row lists the elements.

## 3. Measured failure-mode frequencies

180 boards, 11,109 `:root` tokens (min 7, median 67, max 89), 37 boards without `</body>`.

| Claim in the brief | Measured |
|---|---|
| Tokens used inline | 1,339 elements, 1,845 declarations |
| Tokens used in `<style>` rules | 6,584 `var()` in rules, 546 distinct selectors; **88% of element bindings** (12,673 of 14,423) arrive through a rule, 12% inline |
| Shorthand with a `var()` inline | **1,154 of 1,845 (63%)**: `font` 647, `background` 356, `border-radius` 115, `border` 27, `border-bottom` 9 |
| `var()` that is not the whole value | 55 inline (`border:1px solid var(--x)`, one gradient, three `calc(-1 * var(--x))`) |
| More than one `var()` in a declaration | 8 inline declarations, 30 bindings in total — one chatgpt gradient repeated across 6 boards, and `repeat(var(--a-cols), var(--a-icon))` |
| `var(--a, fallback)` | 0 |
| `var()` naming an undefined token | 0 |
| Tokens defined through other tokens | **2,954 of 11,109 (27%)**, on 177 boards; all composites (`600 17px/22px var(--sa-font)`), 0 pure aliases |
| Tokens redefined outside `:root` | 469 on 35 boards, every one inside `.dark{}`; the class is applied on 1 board (`apple-home-lock/02-home-dark`), where 19 bindings resolve differently on the element than on `:root` |
| Tokens with relative units, `%`, `currentColor` | 0, 0, 0 — the boards are px-only, so the probe's context does not matter today |
| Descendant / list / pseudo selectors using `var()` | 1,420 rules; 6 pseudo-class rules, 31 pseudo-element rules (15 use `var()`), 0 `@media`, 0 ids |
| Duplicate token names in one `:root` | 0 |

Resolver sweep, every element of every board (14,423 bindings on 7,618 elements):

| State | Count | Share |
|---|---|---|
| applied — probe longhands all match | 13,975 | 96.9% |
| overridden — a later declaration took the property; winner named | 276 | 1.9% |
| partial — some longhands taken; winner named | 172 | 1.2% |
| unconfirmed — mismatch with no winner found | **0** | |
| invalid — declaration the browser rejected | 0 | |

By property: `color` 4,032 applied / 49 overridden; `font` 3,844 / 57 / 170 partial;
`background` 1,282 / 39; `border-bottom` 1,253 / 0; `height` 961 / 32; `border-radius` 947 /
22 / 1; `width` 785 / 30; `border` 464 / 21 / 1; `left` 158 / 26; everything else all applied.

Two round-trip failures showed up and were fixed by the probe design rather than by special
cases: `grid-template-columns` resolves to a track list only on a grid container, so the probe
copies the element's `display`; and a probe under `<html>` resolves `--hs-grey3` to the light
value inside a `.dark` subtree, so tokens are substituted from the element's computed style
before the declaration is set on the probe.

Inheritance, over the 5,993 elements that carry text directly:

| | bound on itself | bound on an ancestor | bound nowhere |
|---|---|---|---|
| `color` | 3,528 (59%) | **1,789 (30%)** | 676 (11%, on 9 evidence/token boards that use literal colours) |
| `font` | 3,907 (65%) | **2,086 (35%)** | 0 |

The ancestor is usually `.phone` or a card: depth 1: 764, 2: 468, 3: 497, 4: 1,779, 5: 329,
6: 36, 7: 2.

Timing: `usesFor` on every element of a board, median 8.7 ms, max 229 ms
(`duolingo-ios/00d-art`, 294 elements). `bindingsFor` on one element with its ancestor walk,
0.9–7.6 ms.

## 4. What it still cannot resolve, and what to show

- **Which token contributed what inside one value.** A gradient with two tokens, a `calc()`,
  or `repeat(var(--cols), var(--w))` confirms as one longhand. Show the declaration with each
  token's value and do not split the credit.
- **Colour that is bound to nothing.** 11% of text elements sit on boards whose colours are
  literals. The row should say "no token — `color: #111` from `.k`", which the same candidate
  list provides if the panel asks for declarations without `var()` too (the resolver already
  collects them to name overriders).
- **Pseudo-elements.** 15 rules bind tokens on `::before`/`::after`. The resolver handles them
  through `getComputedStyle(el, '::before')` and tags the binding with the pseudo, but the
  layers list has no node for them; render them under the owning element as `::before`.
- **Specificity is approximated.** Ids, classes, attributes, pseudo-classes and types are
  counted; `:is()`/`:where()`/`:not()` internals are not weighed. On these boards it never
  mattered (0 unconfirmed), and a wrong order still surfaces as `overridden` with the true
  winner named, because the probe judges by value, not by ordering.
- **`!important` and `@layer`** are not modelled; neither appears on any board. A wrong guess
  again degrades to a named override, not to a wrong value.
- **Values the probe cannot reproduce.** Percentages against a parent (`height:50%`), `em`,
  `currentColor`, inherited `font-size` in the token itself. None occur today. If one did, the
  state would come out `unconfirmed`; render that as the token and value with a question mark,
  never as `applied`.
- **Tokens applied through JavaScript or SVG attributes.** The boards have no scripts and the
  `fill:var()` uses are in rules, so this is theoretical.

## 5. The agent-side resolver

This is the exact text validated by the sweep, minus the wrapper. It is ES5, contains no
backtick and no `${`, and is meant to be pasted into the `AGENT` template literal in
`canvas/src/InspectorPanel.tsx`. When it goes into the literal, every `\` in a regex must be
doubled and any `</script>` written as `<\/script>` — the same rules the current agent already
follows. Call `__spTokens.bindingsFor(el)` on `sp:sel` and post the result; post
`__spTokens.tokens` and `__spTokens.groups` once in `sp:ready`, with `uses` filled in by one
pass over the marked elements.

```js
/* Token resolver — runs inside the board's document (opaque origin, sandbox=allow-scripts).
   ES5 only, no backticks or dollar-brace, since this gets embedded in a TS template literal.
   Exposes window.__spTokens = { tokens, groups, usesFor(el), bindingsFor(el), byName } */
(function(){
  /* ---- probe: a hidden, zero-sized, out-of-flow box the resolver can style freely ---- */
  var wrap=document.createElement('div');
  wrap.style.cssText='position:absolute;left:0;top:0;width:0;height:0;overflow:hidden;visibility:hidden;pointer-events:none';
  var probe=document.createElement('div'),zero=document.createElement('div');
  wrap.appendChild(probe);wrap.appendChild(zero);
  document.documentElement.appendChild(wrap);
  var pcs=getComputedStyle(probe),zcs=getComputedStyle(zero);

  /* ---- split "a:b; c:d(e;f)" on top-level semicolons ---- */
  function splitDecls(text,all){
    var out=[],depth=0,cur='',q=null,i,ch;
    for(i=0;i<text.length;i++){ch=text.charAt(i);
      if(q){cur+=ch;if(ch===q)q=null;continue;}
      if(ch==='"'||ch==="'")q=ch;else if(ch==='(')depth++;else if(ch===')')depth--;
      if(ch===';'&&depth===0){out.push(cur);cur='';}else cur+=ch;}
    if(cur.replace(/\s/g,''))out.push(cur);
    var decls=[];
    for(i=0;i<out.length;i++){var d=out[i],c=d.indexOf(':');if(c<0)continue;
      var prop=d.slice(0,c).replace(/^\s+|\s+$/g,'').toLowerCase(),val=d.slice(c+1).replace(/^\s+|\s+$/g,'');
      if(val.indexOf('var(')<0&&!all)continue;
      var toks=[],re=/var\(\s*(--[\w-]+)/g,m;while((m=re.exec(val)))toks.push(m[1]);
      decls.push({prop:prop,value:val,tokens:toks});}
    return decls;
  }
  function splitSelectors(sel){ /* top-level commas only (":is(a,b)" stays whole) */
    var out=[],depth=0,cur='',i,ch;
    for(i=0;i<sel.length;i++){ch=sel.charAt(i);if(ch==='(')depth++;else if(ch===')')depth--;
      if(ch===','&&depth===0){out.push(cur);cur='';}else cur+=ch;}
    out.push(cur);return out;
  }
  function specificity(sel){ /* good enough for class-heavy boards; ids > classes/attrs/pseudo-classes > types */
    var s=sel.replace(/::?[\w-]+(\([^)]*\))?/g,function(m){return m.indexOf('::')===0||/^:(before|after)/.test(m)?' ':' :x ';});
    var ids=(s.match(/#[\w-]+/g)||[]).length,cls=(s.match(/\.[\w-]+|\[[^\]]*\]|:x/g)||[]).length;
    var types=(s.replace(/#[\w-]+|\.[\w-]+|\[[^\]]*\]|:x/g,' ').match(/[a-zA-Z][\w-]*/g)||[]).length;
    return ids*10000+cls*100+types;
  }
  /* ---- every stylesheet rule, in cascade order; the inline <style> sheet is readable from the opaque origin ---- */
  var rules=[];
  function collect(list){var i,r;for(i=0;i<list.length;i++){r=list[i];
    if(r.type===1){var d=splitDecls(r.style.cssText,true);
      if(d.length)rules.push({sel:r.selectorText,parts:splitSelectors(r.selectorText).map(function(p){var m=/::?(before|after|marker|placeholder)\s*$/.exec(p);
        return m?{sel:p.slice(0,m.index),pseudo:'::'+m[1]}:{sel:p,pseudo:''};}),decls:d,order:rules.length});}
    else if(r.cssRules)collect(r.cssRules);}}
  (function(){var i;for(i=0;i<document.styleSheets.length;i++){try{collect(document.styleSheets[i].cssRules);}catch(e){}}})();

  /* ---- :root as written: groups from own-line comments, notes from trailing comments ---- */
  var css='',i;for(i=0;i<document.styleSheets.length;i++){var o=document.styleSheets[i].ownerNode;if(o&&o.textContent)css+=o.textContent+'\n';}
  var tokens=[],byName={},groups=[],rootText=(/:root\s*\{([\s\S]*?)\}/.exec(css)||['',''])[1];
  (function(){var lines=rootText.split('\n'),group=null,gi=-1,li,line,m;
    for(li=0;li<lines.length;li++){line=lines[li];
      m=/^\s*\/\*\s*([\s\S]*?)\s*\*\//.exec(line);
      if(m&&!/--[\w-]+\s*:/.test(line.slice(0,m.index))){group=m[1];gi=groups.length;groups.push({name:group,tokens:[]});line=line.slice(m.index+m[0].length);}
      var re=/(--[\w-]+)\s*:\s*([^;]*);/g,t,last=null;
      while((t=re.exec(line))){last={name:t[1],decl:t[2].replace(/^\s+|\s+$/g,''),group:group,note:''};
        if(!byName[last.name]){tokens.push(last);byName[last.name]=last;if(gi>=0)groups[gi].tokens.push(last.name);}}
      var tail=/\/\*\s*([\s\S]*?)\s*\*\/\s*$/.exec(line);if(tail&&last)last.note=tail[1];}})();
  function kind(v){
    if(!v)return 'unset';
    if(/^-?[\d.]+(px|pt|em|rem|%|vw|vh|ch)$/.test(v))return 'length';
    if(/^-?[\d.]+$/.test(v))return 'number';
    if(CSS.supports('color',v))return 'color';
    if(CSS.supports('font',v))return 'font';
    if(CSS.supports('background-image',v))return 'image';
    if(CSS.supports('filter',v))return 'filter';
    if(CSS.supports('box-shadow',v))return 'shadow';
    if(CSS.supports('font-family',v))return 'family';
    return 'other';
  }
  var rcs=getComputedStyle(document.documentElement);
  function canon(k,v){ /* what the panel draws a swatch from */
    if(k!=='color')return '';probe.style.cssText='color:'+v;return pcs.color;}
  for(i=0;i<tokens.length;i++){var tk=tokens[i];tk.value=rcs.getPropertyValue(tk.name).replace(/^\s+|\s+$/g,'');
    tk.kind=kind(tk.value);tk.canon=canon(tk.kind,tk.value);tk.refs=(tk.decl.match(/var\(\s*(--[\w-]+)/g)||[]).map(function(s){return s.slice(4).replace(/^\s+/,'');});
    tk.uses=0;tk.overrides=[];}
  /* tokens redefined outside :root (e.g. .dark{--ac-bg:...}) */
  (function(){var i,j;for(i=0;i<document.styleSheets.length;i++){var rs;try{rs=document.styleSheets[i].cssRules;}catch(e){continue;}
    for(j=0;j<rs.length;j++){var r=rs[j];if(r.type!==1||r.selectorText===':root')continue;var k;
      for(k=0;k<r.style.length;k++){var p=r.style[k];if(p.indexOf('--')===0){var t=byName[p];var ov={sel:r.selectorText,decl:r.style.getPropertyValue(p).replace(/^\s+|\s+$/g,'')};
        if(t)t.overrides.push(ov);else{t={name:p,decl:'',group:null,note:'',value:'',kind:'unset',canon:'',refs:[],uses:0,overrides:[ov],scoped:true};tokens.push(t);byName[p]=t;}}}}}})();

  /* ---- per element: which declarations with var() reach it, and whether they won ---- */
  function subst(value,cs){ /* the element's own computed token values, so a .dark{--x:..} redefinition is honoured */
    return value.replace(/var\(\s*(--[\w-]+)\s*(?:,[^()]*)?\)/g,function(_,n){return cs.getPropertyValue(n).replace(/^\s+|\s+$/g,'');});}
  function usesFor(el){
    var cands=[],i,j,k,pseudos={'':getComputedStyle(el)};
    for(i=0;i<rules.length;i++){var r=rules[i];var best={};
      for(j=0;j<r.parts.length;j++){var p=r.parts[j];try{if(el.matches(p.sel)){var s=specificity(p.sel);if(!(p.pseudo in best)||s>best[p.pseudo])best[p.pseudo]=s;}}catch(e){}}
      for(var ps in best){if(!pseudos[ps])pseudos[ps]=getComputedStyle(el,ps);
        for(j=0;j<r.decls.length;j++)cands.push({prop:r.decls[j].prop,value:r.decls[j].value,tokens:r.decls[j].tokens,src:r.sel,pseudo:ps,spec:best[ps],order:i});}}
    var inl=splitDecls(el.getAttribute('style')||'',true); /* the raw attribute, so an overrider is named as written */
    for(j=0;j<inl.length;j++)cands.push({prop:inl[j].prop,value:inl[j].value,tokens:inl[j].tokens,src:'',pseudo:'',spec:1e6,order:rules.length+j});
    cands.sort(function(a,b){return a.spec-b.spec||a.order-b.order;});
    /* which longhands each candidate sets, via the probe; tokens substituted in the element's context */
    for(i=0;i<cands.length;i++){var c=cands[i],ecs=pseudos[c.pseudo];c.ecs=ecs;
      probe.style.cssText='display:'+ecs.display;probe.style.setProperty(c.prop,subst(c.value,ecs));
      c.longs=[];c.all=[];c.invalid=probe.style.length<=1;
      for(k=0;k<probe.style.length;k++){var L=probe.style[k];if(L==='display')continue;var pv=pcs.getPropertyValue(L),ev=ecs.getPropertyValue(L),same=pv===ev;
        c.all.push({p:L,v:pv,ok:same});if(pv!==zcs.getPropertyValue(L))c.longs.push({p:L,v:pv,ok:same});}
      if(!c.longs.length)c.longs=c.all;}
    var out=[];
    for(i=cands.length-1;i>=0;i--){var c=cands[i];if(!c.tokens.length)continue;
      var bad=[],ok=true;for(k=0;k<c.longs.length;k++)if(!c.longs[k].ok){ok=false;bad.push(c.longs[k].p);}
      var by=null,byProp=null;
      if(!ok){ /* name the later declaration that took those longhands, if there is one */
        for(j=cands.length-1;j>i&&!by;j--){var d=cands[j];if(d.pseudo!==c.pseudo||d.invalid)continue;
          for(k=0;k<d.all.length;k++)if(bad.indexOf(d.all[k].p)>=0){by=(d.src?d.src+' ':'inline ')+d.prop+': '+d.value;byProp=d.prop;break;}}}
      var state=c.invalid?'invalid':ok?'applied':!by?'unconfirmed':(byProp===c.prop||bad.length===c.longs.length)?'overridden':'partial';
      var vals={};for(k=0;k<c.tokens.length;k++)vals[c.tokens[k]]=c.ecs.getPropertyValue(c.tokens[k]).replace(/^\s+|\s+$/g,'');
      out.push({prop:c.prop,value:c.value,tokens:c.tokens,resolved:vals,src:c.src,pseudo:c.pseudo,state:state,by:by,longhands:c.longs,elValue:c.ecs.getPropertyValue(c.prop)});}
    out.reverse();return out;
  }
  /* inherited properties the element does not bind itself: report the nearest ancestor that does */
  var INHERITED=/^(color|font|font-[\w-]+|line-height|letter-spacing|text-align|text-transform|word-spacing|visibility|fill|stroke)$/;
  function bindingsFor(el){
    var own=usesFor(el),have={},i,a=el.parentElement,depth=1;
    for(i=0;i<own.length;i++)if(!own[i].pseudo&&own[i].state!=='overridden')have[own[i].prop.split('-')[0]]=true;
    while(a&&a.nodeType===1){var up=usesFor(a);
      for(i=0;i<up.length;i++){var u=up[i];if(u.pseudo||u.state==='overridden'||!INHERITED.test(u.prop)||have[u.prop.split('-')[0]])continue;
        have[u.prop.split('-')[0]]=true;u.inheritedFrom={depth:depth,tag:a.tagName.toLowerCase(),cls:a.getAttribute('class')||'',i:a.getAttribute('data-sp')};own.push(u);}
      a=a.parentElement;depth++;}
    return own;
  }
  window.__spTokens={tokens:tokens,groups:groups,rules:rules.length,usesFor:usesFor,bindingsFor:bindingsFor,byName:byName};
})();
```

What one binding looks like on the wire, for the element from the bug report
(`snapaction-ios/01-timeline`, `div.sh`):

```json
{"prop":"background","value":"var(--sa-amber)","tokens":["--sa-amber"],
 "resolved":{"--sa-amber":"#F0A468"},"src":"","pseudo":"","state":"applied","by":null,
 "longhands":[{"p":"background-color","v":"rgb(240, 164, 104)","ok":true}],
 "elValue":"rgb(240, 164, 104) none repeat scroll 0% 0% / auto padding-box border-box"}
```

And a token row, as the Tokens tab receives it:

```json
{"name":"--l-amber","decl":"#F1CD8A","group":"Ink","note":"host-only section headers",
 "value":"#F1CD8A","kind":"color","canon":"rgb(241, 205, 138)","refs":[],"uses":3,"overrides":[]}
```

## 6. Things the CSSOM experiment settled

Recorded because each one was a guess before `cssom.py` ran, and each shapes the code above.

- `document.styleSheets[0].cssRules` is readable inside the `allow-scripts` frame. The sheet
  is an inline `<style>`, so it shares the document's (opaque) origin; only fetched sheets
  would throw.
- A shorthand with `var()` in `el.style` expands to its longhands (`background` → 9 entries),
  and `getPropertyValue` on every longhand returns `''` — the browser stores them as pending
  substitution. `getPropertyValue('background')` and `cssText` still return `var(--sa-amber)`,
  which is why the resolver parses `cssText`/the attribute rather than iterating properties.
- `getComputedStyle(el).getPropertyValue('--sa-t-time')` returns the substituted stream,
  `590 18px/18px -apple-system,BlinkMacSystemFont,…`; the browser does the token-in-token
  resolution for free. The declared hex is preserved exactly (`#F0A468`), which is what the
  panel should print.
- `getComputedStyle(el).font` does serialise on these boards, but it is empty as soon as any
  font longhand is non-default (`td.n` above), so it is not a safe confirmation source.
- `CSS.supports('color', v)` is true for any `var()` string, so kinds must be classified on
  the substituted value, never on the declaration.
- Chrome computes a `1.5px` border width as `1px` on both the probe and the element; the probe
  comparison is immune to that kind of snapping because both sides go through the same engine.
