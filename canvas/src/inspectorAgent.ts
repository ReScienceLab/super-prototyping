/**
 * The script the inspector injects into a board, and the shapes of what it sends back.
 *
 * The boards on the canvas are `sandbox=""`: an opaque origin with no scripting, so the canvas
 * cannot read them. The panel loads the same HTML into a second frame with `allow-scripts` (and
 * deliberately without `allow-same-origin`, which together would let the frame reach back out)
 * and splices this script in before `</body>`. Everything it reports is measured in the board's
 * own layout, and it talks over postMessage.
 *
 * The script is ES5 and lives in a `String.raw` literal, so a regex backslash is written once.
 * Two rules keep it embeddable: no backtick and no `${` anywhere in it (inspectorAgent.test.ts
 * checks), and the closing `</script>` is assembled in injectAgent so the literal never holds
 * one. `svgSignature.ts` is the one piece of it written elsewhere: its source is spliced in ahead
 * of the body, so the frame signs a vector exactly as the build-time index does.
 */
import { svgSignature } from "./svgSignature";

export interface SpBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** One element of the board, in document order; index 0 is the root (`.phone`, else body). */
export interface SpNode {
  i: number;
  tag: string;
  cls: string;
  /** Own text, for an element with no element children; up to 60 characters. */
  text: string;
  alt: string;
  depth: number;
  parent: number;
  /** Whether an asset is drawn here: an `<img>`, a CSS background or an inline `<svg>`. */
  img: boolean;
  /** Inside an `<svg>`: a path, a group, a gradient stop. The layers list hides these. */
  inSvg?: boolean;
  /** Relative to the root, in board px. Null only before layout. */
  box: SpBox | null;
}

/** One distinct image on the board, keyed the way the build-time index keys the folder's files. */
export interface SpAsset {
  /**
   * `"<payload length>:<fnv1a>"` of the base64 payload, or `"svg:<fnv1a>"` of an inline vector's
   * geometry signature; joins against rawAssetNames.
   */
  key: string;
  uri: string;
  via: "img" | "css" | "svg";
  mime: string;
  /** Payload length in characters; for a vector, the standalone markup's. */
  chars: number;
  /** For a vector, the viewBox size in board units. */
  w: number;
  h: number;
  /** The `alt`; for a vector, its accessible name, class or the caption beside it. */
  alt: string;
  /** A vector on its own: cascade colours written in, xmlns added. What Copy SVG hands out. */
  svg?: string;
  /** Node indices that draw it. */
  uses: number[];
}

export type SpTokenKind =
  | "color"
  | "length"
  | "number"
  | "font"
  | "family"
  | "image"
  | "filter"
  | "shadow"
  | "other"
  | "unset";

export interface SpToken {
  name: string;
  /** As written in `:root`, `600 17px/22px var(--sa-font)`. */
  decl: string;
  /** The `/* heading *\/` above it in `:root`, null before the first one. */
  group: string | null;
  /** A trailing comment on the same line. */
  note: string;
  /** Substituted, as `:root` resolves it. */
  value: string;
  kind: SpTokenKind;
  /** The colour as `rgb()`, for a swatch; empty for other kinds. */
  canon: string;
  /** Tokens this one's declaration references. */
  refs: string[];
  /** Node indices where a declaration binding it reaches the element and is not overridden. */
  usedBy: number[];
  /** Redefinitions outside `:root`, `.dark { --x: … }`. */
  overrides: { sel: string; decl: string }[];
  /** Defined only under a scope, never in `:root`. */
  scoped?: boolean;
}

export interface SpGroup {
  name: string;
  tokens: string[];
}

export interface SpReady {
  type: "sp:ready";
  nodes: SpNode[];
  size: SpBox;
  assets: SpAsset[];
  tokens: SpToken[];
  groups: SpGroup[];
  /** Milliseconds the token use pass took. */
  ms: number;
}

export type SpBindingState = "applied" | "partial" | "overridden" | "unconfirmed" | "invalid";

export interface SpLonghand {
  p: string;
  v: string;
  ok: boolean;
}

/** One declaration that reaches the selected element, and whether it won. */
export interface SpBinding {
  prop: string;
  value: string;
  tokens: string[];
  /** Token -> its value on this element (not on `:root`, which a `.dark` scope may differ from). */
  resolved: Record<string, string>;
  /** Selector it came from; empty for the inline attribute. */
  src: string;
  pseudo: string;
  state: SpBindingState;
  /** The declaration that took the longhands this one lost, named as written. */
  by: string | null;
  longhands: SpLonghand[];
  elValue: string;
  inheritedFrom?: { depth: number; tag: string; cls: string; i: string | null };
}

export interface SpBindings {
  type: "sp:bindings";
  i: number;
  bindings: SpBinding[];
  computed: Record<string, string>;
}

export type SpMessage =
  | SpReady
  | SpBindings
  | { type: "sp:pick"; i: number }
  | { type: "sp:hover"; i: number | null };

const AGENT_BODY = String.raw`(function(){
var root=document.querySelector('.phone')||document.body;

/* ============ token resolver ============
   Binds per declaration from the whole cascade, resolves each token on the element (not :root,
   which a .dark{--x:..} scope makes wrong), and confirms with a hidden probe which longhands the
   declaration actually produced on screen. See docs/2026-09-07-token-resolution.md. */
var T=(function(){
  var wrap=document.createElement('div');
  wrap.style.cssText='position:absolute;left:0;top:0;width:0;height:0;overflow:hidden;visibility:hidden;pointer-events:none';
  var probe=document.createElement('div'),zero=document.createElement('div');
  wrap.appendChild(probe);wrap.appendChild(zero);
  document.documentElement.appendChild(wrap);
  var pcs=getComputedStyle(probe),zcs=getComputedStyle(zero);

  /* split "a:b; c:d(e;f)" on top-level semicolons */
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
  function specificity(sel){ /* ids > classes/attrs/pseudo-classes > types; enough for class-heavy boards */
    var s=sel.replace(/::?[\w-]+(\([^)]*\))?/g,function(m){return m.indexOf('::')===0||/^:(before|after)/.test(m)?' ':' :x ';});
    var ids=(s.match(/#[\w-]+/g)||[]).length,cls=(s.match(/\.[\w-]+|\[[^\]]*\]|:x/g)||[]).length;
    var types=(s.replace(/#[\w-]+|\.[\w-]+|\[[^\]]*\]|:x/g,' ').match(/[a-zA-Z][\w-]*/g)||[]).length;
    return ids*10000+cls*100+types;
  }
  /* every stylesheet rule in cascade order; an inline <style> shares the document's opaque origin, so it is readable */
  var rules=[];
  function collect(list){var i,r;for(i=0;i<list.length;i++){r=list[i];
    if(r.type===1){var d=splitDecls(r.style.cssText,true);
      if(d.length)rules.push({sel:r.selectorText,parts:splitSelectors(r.selectorText).map(function(p){var m=/::?(before|after|marker|placeholder)\s*$/.exec(p);
        return m?{sel:p.slice(0,m.index),pseudo:'::'+m[1]}:{sel:p,pseudo:''};}),decls:d,order:rules.length});}
    else if(r.cssRules)collect(r.cssRules);}}
  (function(){var i;for(i=0;i<document.styleSheets.length;i++){try{collect(document.styleSheets[i].cssRules);}catch(e){}}})();

  /* :root as written: groups from own-line comments, notes from trailing comments */
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
  function kind(v){ /* classified on the substituted value: CSS.supports('color', v) is true for any var() string */
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
  function canon(k,v){if(k!=='color')return '';probe.style.cssText='color:'+v;return pcs.color;}
  for(i=0;i<tokens.length;i++){var tk=tokens[i];tk.value=rcs.getPropertyValue(tk.name).replace(/^\s+|\s+$/g,'');
    tk.kind=kind(tk.value);tk.canon=canon(tk.kind,tk.value);tk.refs=(tk.decl.match(/var\(\s*(--[\w-]+)/g)||[]).map(function(s){return s.slice(4).replace(/^\s+/,'');});
    tk.usedBy=[];tk.overrides=[];}
  /* tokens redefined outside :root (e.g. .dark{--ac-bg:...}) */
  (function(){var i,j;for(i=0;i<document.styleSheets.length;i++){var rs;try{rs=document.styleSheets[i].cssRules;}catch(e){continue;}
    for(j=0;j<rs.length;j++){var r=rs[j];if(r.type!==1||r.selectorText===':root')continue;var k;
      for(k=0;k<r.style.length;k++){var p=r.style[k];if(p.indexOf('--')===0){var t=byName[p];var ov={sel:r.selectorText,decl:r.style.getPropertyValue(p).replace(/^\s+|\s+$/g,'')};
        if(t)t.overrides.push(ov);else{t={name:p,decl:'',group:null,note:'',value:'',kind:'unset',canon:'',refs:[],usedBy:[],overrides:[ov],scoped:true};tokens.push(t);byName[p]=t;}}}}}})();

  /* the element's own computed token values, so a .dark{--x:..} redefinition is honoured */
  function subst(value,cs){
    return value.replace(/var\(\s*(--[\w-]+)\s*(?:,[^()]*)?\)/g,function(_,n){return cs.getPropertyValue(n).replace(/^\s+|\s+$/g,'');});}
  /* which declarations reach the element, and whether each one won; the all flag includes the ones without a token */
  function usesFor(el,all){
    var cands=[],i,j,k,pseudos={'':getComputedStyle(el)};
    for(i=0;i<rules.length;i++){var r=rules[i];var best={};
      for(j=0;j<r.parts.length;j++){var p=r.parts[j];try{if(el.matches(p.sel)){var s=specificity(p.sel);if(!(p.pseudo in best)||s>best[p.pseudo])best[p.pseudo]=s;}}catch(e){}}
      for(var ps in best){if(!pseudos[ps])pseudos[ps]=getComputedStyle(el,ps);
        for(j=0;j<r.decls.length;j++)cands.push({prop:r.decls[j].prop,value:r.decls[j].value,tokens:r.decls[j].tokens,src:r.sel,pseudo:ps,spec:best[ps],order:i});}}
    var inl=splitDecls(el.getAttribute('style')||'',true); /* the raw attribute, so an overrider is named as written */
    for(j=0;j<inl.length;j++)cands.push({prop:inl[j].prop,value:inl[j].value,tokens:inl[j].tokens,src:'',pseudo:'',spec:1e6,order:rules.length+j});
    cands.sort(function(a,b){return a.spec-b.spec||a.order-b.order;});
    /* the longhands each candidate sets, via the probe; the probe copies display so a grid track list resolves */
    for(i=0;i<cands.length;i++){var c=cands[i],ecs=pseudos[c.pseudo];c.ecs=ecs;
      probe.style.cssText='display:'+ecs.display;probe.style.setProperty(c.prop,subst(c.value,ecs));
      c.longs=[];c.all=[];c.invalid=probe.style.length<=1;
      for(k=0;k<probe.style.length;k++){var L=probe.style[k];if(L==='display')continue;var pv=pcs.getPropertyValue(L),ev=ecs.getPropertyValue(L),same=pv===ev;
        c.all.push({p:L,v:pv,ok:same});if(pv!==zcs.getPropertyValue(L))c.longs.push({p:L,v:pv,ok:same});}
      if(!c.longs.length)c.longs=c.all;}
    var out=[];
    for(i=cands.length-1;i>=0;i--){var c=cands[i];if(!c.tokens.length&&!all)continue;
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
  function bindingsFor(el,all){
    var own=usesFor(el,all),have={},i,a=el.parentElement,depth=1;
    for(i=0;i<own.length;i++)if(!own[i].pseudo&&own[i].state!=='overridden')have[own[i].prop.split('-')[0]]=true;
    while(a&&a.nodeType===1){var up=usesFor(a);
      for(i=0;i<up.length;i++){var u=up[i];if(u.pseudo||u.state==='overridden'||!INHERITED.test(u.prop)||have[u.prop.split('-')[0]])continue;
        have[u.prop.split('-')[0]]=true;u.inheritedFrom={depth:depth,tag:a.tagName.toLowerCase(),cls:a.getAttribute('class')||'',i:a.getAttribute('data-sp')};own.push(u);}
      a=a.parentElement;depth++;}
    return own;
  }
  return {tokens:tokens,groups:groups,rules:rules.length,usesFor:usesFor,bindingsFor:bindingsFor,byName:byName};
})();
window.__spTokens=T;

/* ============ element index ============
   Marked up front: indices are layout-independent, boxes are not, so those wait for measure(). */
var els=[root],nodes=[],i;
Array.prototype.forEach.call(root.querySelectorAll('*'),function(el){if(el.tagName==='STYLE'||el.tagName==='SCRIPT')return;els.push(el);});
for(i=0;i<els.length;i++)els[i].setAttribute('data-sp',i);
function inSvg(el){var p=el.parentElement;return !!(p&&p.closest('svg'));}
for(i=0;i<els.length;i++){var el=els[i],p=el.parentElement,up=-1;
  while(i>0&&p){var ps=p.getAttribute('data-sp');if(ps!==null){up=+ps;break;}p=p.parentElement;}
  nodes.push({i:i,tag:el.tagName.toLowerCase(),cls:el.getAttribute('class')||'',
    text:el.children.length?'':(el.textContent||'').replace(/\s+/g,' ').replace(/^\s+|\s+$/g,'').slice(0,60),
    alt:el.getAttribute('alt')||'',depth:up>=0?nodes[up].depth+1:0,parent:up,img:false,inSvg:inSvg(el),box:null});}
function box(el){var r=el.getBoundingClientRect(),o=root.getBoundingClientRect();
  return{x:+(r.left-o.left).toFixed(2),y:+(r.top-o.top).toFixed(2),w:+r.width.toFixed(2),h:+r.height.toFixed(2)};}

/* ============ assets ============
   Keyed by length:fnv1a of the base64 payload, which is how vite.config.ts keys the folder's
   files, so the parent can join without any attribute in the HTML. FNV-1a rather than SHA
   because this frame has no crypto.subtle under a non-secure parent (plain http). */
function fnv(s){var h=0x811c9dc5;for(var i=0;i<s.length;i++){h=Math.imul(h^s.charCodeAt(i),0x01000193)>>>0;}return h.toString(36);}
var assets=[],byKey={};
function addAsset(i,uri,via,el){var c=uri.indexOf(','),payload=uri.slice(c+1),k=payload.length+':'+fnv(payload),a=byKey[k];
  if(!a){a=byKey[k]={key:k,uri:uri,via:via,mime:uri.slice(5,c).split(';')[0],chars:payload.length,w:0,h:0,alt:'',uses:[]};assets.push(a);
    if(via==='css'){var im=new Image();im.onload=function(){a.w=im.naturalWidth;a.h=im.naturalHeight;schedule();};im.src=uri;}}
  if(via==='img'){if(el.naturalWidth){a.w=el.naturalWidth;a.h=el.naturalHeight;}if(!a.alt)a.alt=el.getAttribute('alt')||'';}
  if(a.uses.indexOf(i)<0)a.uses.push(i);nodes[i].img=true;}

/* An inline <svg> is an asset too, keyed by its geometry rather than its bytes: the generators'
   icon() writes class, style and preserveAspectRatio into the root tag on the way in, so the
   board's markup is never the file's. The copy handed out stands alone — the colours the cascade
   supplied (currentColor, var(), a fill from a stylesheet) are written in, and xmlns is added
   where a literal icon had none — so an <img> in the parent draws it and Figma accepts it. */
function addSvg(i,el){
  if(!el.querySelector('path,rect,circle,ellipse,line,polygon,polyline,text,image,use'))return;
  var c=el.cloneNode(true),cs=getComputedStyle(el),inner=c.querySelectorAll('[data-sp]'),n;
  for(n=0;n<inner.length;n++)inner[n].removeAttribute('data-sp');
  c.removeAttribute('data-sp');c.removeAttribute('style');c.removeAttribute('class');c.removeAttribute('preserveAspectRatio');
  if(!c.hasAttribute('xmlns'))c.setAttribute('xmlns','http://www.w3.org/2000/svg');
  if(!c.hasAttribute('fill'))c.setAttribute('fill',cs.fill);
  if(!c.hasAttribute('stroke'))c.setAttribute('stroke',cs.stroke);
  /* A stylesheet rule on a child (apple-wallet's .ds path{fill:…}) leaves the copy: write a child's
     computed fill/stroke in where it differs from its parent's and no attribute carries it.
     ponytail: fill and stroke only; opacity or a dasharray from a stylesheet is lost. */
  var src=el.querySelectorAll('*'),dst=c.querySelectorAll('*'),j,s,ps;
  for(j=0;j<src.length;j++){s=getComputedStyle(src[j]);ps=getComputedStyle(src[j].parentNode);
    if(!dst[j].hasAttribute('fill')&&s.fill!==ps.fill)dst[j].setAttribute('fill',s.fill);
    if(!dst[j].hasAttribute('stroke')&&s.stroke!==ps.stroke)dst[j].setAttribute('stroke',s.stroke);}
  var svg=c.outerHTML.replace(/currentColor/gi,cs.color)
    .replace(/var\(\s*(--[\w-]+)[^)]*\)/g,function(m,p){return cs.getPropertyValue(p).replace(/^\s+|\s+$/g,'')||m;});
  /* One row per glyph and colour: the geometry key joins the file, and the colours after it keep
     a red and a black instance of the same glyph apart, so what a row shows is what it copies.
     ponytail: the root's computed colours; a colour that differs only in a child's var() collapses. */
  var k='svg:'+fnv(svgSignature(svg))+':'+fnv(cs.fill+'|'+cs.stroke+'|'+cs.color),a=byKey[k];
  if(!a){var vb=(el.getAttribute('viewBox')||'').split(/[\s,]+/);
    a=byKey[k]={key:k,uri:'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg),via:'svg',mime:'image/svg+xml',
      chars:svg.length,w:+vb[2]||0,h:+vb[3]||0,alt:svgLabel(el),svg:svg,uses:[]};assets.push(a);}
  if(a.uses.indexOf(i)<0)a.uses.push(i);nodes[i].img=true;}
/* No board writes a title on its icons, so with no file to name one the name is a guess from
   context: the accessible name if there is one; else a class, when it is a word (logo, aiface)
   and not a generator's abbreviation (i, mk); else a caption, which is the one short leaf of text
   beside the icon within two ancestors — the span under a tab icon, the label in a chip. A clock,
   a keyboard row, a whole composer or a screen of text is not a caption: the icon stays nameless.
   ponytail: two ancestors and one leaf sibling is the ceiling; a <title> in the svg beats it. */
function svgLabel(el){var t=el.querySelector('title'),c=(el.getAttribute('class')||'').split(/\s+/)[0],p=el.parentElement,d,k,n,s,one;
  if(el.getAttribute('aria-label'))return el.getAttribute('aria-label');
  if(t&&t.textContent)return t.textContent.replace(/^\s+|\s+$/g,'');
  if(c.length>=3)return c;
  for(d=0;p&&d<2;d++,p=p.parentElement){one=null;
    for(k=0;k<p.childNodes.length;k++){n=p.childNodes[k];if(n.nodeType===1?(n.contains(el)||n.children.length):n.nodeType!==3)continue;
      s=(n.textContent||'').replace(/\s+/g,' ').replace(/^\s+|\s+$/g,'');if(!s)continue;
      if(one!==null||s.length>40||!/[a-z]/i.test(s)){one=false;break;}one=s;}
    if(one)return one;}
  return '';}

/* Every box is read after layout. A script at the end of the body runs at readyState
   'interactive', before the first layout pass and before the data: URIs have decoded, so
   measuring here reports 0x0 for every element on every board. */
function measure(){
  for(var i=0;i<els.length;i++){var el=els[i];nodes[i].box=box(el);
    if(el.tagName==='IMG'){var src=el.getAttribute('src')||'';if(src.indexOf('data:')===0)addAsset(i,src,'img',el);}
    else if(el.tagName==='svg'&&!nodes[i].inSvg)addSvg(i,el);
    var bg=getComputedStyle(el).backgroundImage;
    if(bg&&bg.indexOf('data:')>=0){var re=/url\("?(data:image[^")]+)"?\)/g,m;while((m=re.exec(bg)))addAsset(i,m[1],'css',el);}}}

/* One pass over every element, so the Tokens tab can say "used by N" and select them. */
var tokenMs=-1;
function countUses(){if(tokenMs>=0)return;var t0=performance.now();
  for(var i=0;i<els.length;i++){var u=T.usesFor(els[i]);
    for(var j=0;j<u.length;j++){if(u[j].state==='overridden')continue;
      for(var k=0;k<u[j].tokens.length;k++){var tk=T.byName[u[j].tokens[k]];if(tk&&tk.usedBy.indexOf(i)<0)tk.usedBy.push(i);}}}
  tokenMs=Math.round(performance.now()-t0);}

function send(){measure();countUses();
  parent.postMessage({type:'sp:ready',nodes:nodes,size:box(root),assets:assets,tokens:T.tokens,groups:T.groups,ms:tokenMs},'*');}
var queued=false;
function schedule(){if(queued)return;queued=true;requestAnimationFrame(function(){queued=false;send();});}
/* Three chances, because each one alone has a hole: 'load' waits for the images, the frame after
   it waits for the layout they cause, and the parent's own hello covers a listener that attached
   late. The parent keeps whichever arrives last. */
addEventListener('load',function(){send();schedule();});

/* ============ overlays and selection ============ */
function overlay(css){var d=document.createElement('div');
  d.style.cssText='position:fixed;pointer-events:none;z-index:2147483647;display:none;box-sizing:border-box;'+css;
  document.documentElement.appendChild(d);return d;}
var hi=overlay('box-shadow:0 0 0 1.5px #0d99ff'),hov=overlay('box-shadow:0 0 0 1px #0d99ff'),
  badge=overlay('height:16px;padding:0 4px;border-radius:2px;background:#0d99ff;color:#fff;font:10px/16px Inter,system-ui,sans-serif;white-space:nowrap;transform:translateX(-50%)');
function fmt(n){return String(Math.round(n*100)/100);}
function place(d,el){if(!el){d.style.display='none';return null;}var r=el.getBoundingClientRect();
  d.style.display='block';d.style.left=r.left+'px';d.style.top=r.top+'px';d.style.width=r.width+'px';d.style.height=r.height+'px';return r;}
/* els[i], not a querySelector: root is index 0 and carries its own data-sp, but querySelector
   searches descendants only, so selecting the root row highlighted nothing and never sent
   bindings — its Styles section sat on "resolving..." for good. */
function at(i){return i===null||i===undefined?null:(els[i]||null);}
var selEl=null;
function select(i){selEl=at(i);var r=place(hi,selEl);
  if(r){badge.style.display='block';badge.textContent=fmt(r.width)+' × '+fmt(r.height);badge.style.left=(r.left+r.width/2)+'px';badge.style.top=(r.bottom+4)+'px';}
  else badge.style.display='none';
  if(!selEl)return;
  var cs=getComputedStyle(selEl);
  parent.postMessage({type:'sp:bindings',i:i,bindings:T.bindingsFor(selEl,true),
    computed:{color:cs.color,'background-color':cs.backgroundColor,
      font:cs.fontWeight+' '+cs.fontSize+'/'+cs.lineHeight+' '+cs.fontFamily,
      'border-radius':cs.borderRadius,opacity:cs.opacity,padding:cs.padding}},'*');}
function hover(i){var el=at(i);place(hov,el&&el!==selEl?el:null);}

addEventListener('message',function(e){var d=e.data;if(!d||typeof d!=='object')return;
  if(d.type==='sp:hello')send();
  else if(d.type==='sp:sel')select(d.i);
  else if(d.type==='sp:hover')hover(d.i);});

/* A click on a path is a click on its icon: the layers list shows the svg as one layer. */
function pick(e){var el=e.target&&e.target.closest?e.target.closest('[data-sp]'):null;if(el&&el.closest('svg'))el=el.closest('svg');return el?+el.getAttribute('data-sp'):null;}
var lastHover=null;
document.addEventListener('click',function(e){var i=pick(e);if(i===null)return;e.preventDefault();parent.postMessage({type:'sp:pick',i:i},'*');},true);
document.addEventListener('mousemove',function(e){var i=pick(e);if(i===lastHover)return;lastHover=i;hover(i);parent.postMessage({type:'sp:hover',i:i},'*');},true);
document.addEventListener('mouseleave',function(){lastHover=null;hover(null);parent.postMessage({type:'sp:hover',i:null},'*');},true);
})();`;

/**
 * The whole tag, as spliced into a board. Exported for the tests and the Playwright sweeps. The
 * signature function rides along as its own source: it has no outer references, so the text is
 * the same function whether the bundle was minified or not.
 */
export const AGENT =
  "<script>var svgSignature=" + svgSignature.toString() + ";" + AGENT_BODY + "</" + "script>";

/**
 * Not every board has a `</body>`: the apple-* generators emit none, so those get the agent
 * appended. The fallback is load bearing, not defensive — a splice alone reports nothing for
 * 37 of the repo's 180 boards.
 */
export function injectAgent(html: string) {
  return /<\/body>/i.test(html) ? html.replace(/<\/body>/i, (tag) => AGENT + tag) : html + AGENT;
}
