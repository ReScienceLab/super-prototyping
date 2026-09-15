# Where to look, in yield order

Work down this list. The first two produce most of a good manifest; the rest
fill in the surfaces they cannot reach.

Every URL below has placeholders. Do not paste one — find the real id or handle
yourself, and confirm it belongs to the company before you download anything
from it.

## A. The company's own brand or press kit

Check this first. When one exists it carries full-resolution logo variants, the
official type, colour values, usage rules and often the art direction, so
`Logo & wordmark`, `Typeface`, `Art direction` and `Applied identity` should
come almost entirely from it.

Paths to try, in order of how often each works:

```
/brand   /brand-guidelines   /brand-assets   /press   /press-kit
/newsroom/media-assets   /about/brand   /company/brand   /legal/trademark
```

A site's footer usually links it under "Press", "Brand" or "Media". Failing
that, search the web for `<company> brand guidelines` and `<company> press kit`
and check the result is on the company's own domain. A third-party "brand kit"
aggregator is `archive` at best, and usually not even that.

Two traps:

- A ZIP is fine to download, but list the files you extracted, not the ZIP.
- Logos are often shipped white-on-transparent for dark backgrounds. The brand
  sheet's cards are light, so such a file renders as a blank card and fails the
  per-file rules. Take the dark-on-light variant.

## B. Store listings

The most reliable bulk source. The lookup API returns every screenshot URL at
once, and the listing's seller name settles who published them.

**App Store.** The iTunes lookup API needs no key:

```bash
curl -s "https://itunes.apple.com/lookup?id=<APP_ID>&country=us" \
  | python3 -c 'import json,sys; r=json.load(sys.stdin)["results"][0]; print(r["sellerName"]); print(*r["screenshotUrls"],sep="\n"); print(*r.get("ipadScreenshotUrls",[]),sep="\n"); print(r["artworkUrl512"])'
```

Check `sellerName` is the actual company before you use anything. Take all the
iPhone screenshots and all the iPad ones; the shipped store rows run 4 to 20,
so the 4–8 cap is for social rows, not these. Screenshot URLs end in a size
segment like `/392x696bb.jpg`; request a bigger one (`/1290x2796bb.jpg`, or
`/0x0ss.jpg`) and check what comes back, because the CDN substitutes a size it
has when it lacks the one you asked for.

**Google Play.** No API; the listing HTML carries the image URLs:

```bash
curl -s "https://play.google.com/store/apps/details?id=<PKG>&hl=en&gl=US" \
  | grep -o 'https://play-lh.googleusercontent.com/[A-Za-z0-9_=-]*' | sort -u
```

Strip the trailing `=w...-h...` suffix and append your own (`=w1600`).

**Microsoft Store.** No usable API, and the listing is client-rendered, so read
the image URLs off the page by hand in a browser's network panel. Only if a
listing exists, and only after confirming the publisher is the right company:
repackaged third-party listings sit next to real ones. These rows are small,
3 to 5 in the shipped folders.

For all three, `source` is the human listing page —
`https://apps.apple.com/us/app/<name>/id<APP_ID>` — never the `mzstatic.com` or
`play-lh.googleusercontent.com` URL you downloaded from.

## C. Social

An avatar and a banner is not a row. Add 4–8 posted visuals per platform the
product has an account on: reel covers, video thumbnails, campaign stills,
announcement graphics.

Use whatever social API or skill the environment already gives you. If you have
none, say so in the report and collect the surfaces that do not need one. A
missing row is honest; a row of screenshots of a profile page is not.

Two that need no key:

- **YouTube** thumbnails, given a video id:
  `https://i.ytimg.com/vi/<VIDEO_ID>/maxresdefault.jpg`
- **og:image** on any public post URL, for platforms that still serve one to a
  plain `curl`.

Verify every handle before you collect from it — see "Verify the account, not
the handle" in `SKILL.md`. A company with several accounts (global, regional,
"newsroom", "design") is one row per platform, not one per account. Pick the
main one, and say which.

## D. Marketing site and newsroom

Hero imagery, product shots, illustration sets and feature-page art come off
the marketing pages directly.

Announcement cards are the `og:image` of individual posts, one per page, so an
index gives you the URLs rather than the images. List the articles, then read
each one's card:

```bash
curl -sL "$INDEX_URL" | grep -oE 'https?://[^"]*/news/[^"#?]*' | sort -u   # path pattern is per site
curl -sL "$ARTICLE_URL" | grep -o 'og:image[^>]*content="[^"]*"'
```

Every article URL you take one from has to survive the `<title>` check in
`SKILL.md` first.

Press photography — leadership headshots, office and event photography — is its
own row, not part of art direction.

## E. Curated brand archives

Sites like `brandarchive.xyz` hold identity work that companies have stopped
publishing: old wordmarks, retired art direction. Useful, and legitimate, but
everything from one is `"provenance": "archive"`, never `"theirs"` — and only
when the archive names the original source and date for each item.

They are bot-protected; expect HTTP 429 and a challenge page. If it is blocked,
retry once, say so in one line, and move on. A challenge page saved as `.jpg`
is a file that passes `curl` and fails `file`; the verification script catches
it.

## What not to take

- A screenshot **you** took of their website or app. The row is material they
  published, not material you captured.
- Anything from a press aggregator, a stock library, a wiki, or a fan account.
- Anything you cannot attribute to a human-readable page. A signed CDN URL with
  no page behind it is not a source.
