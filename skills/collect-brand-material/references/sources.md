# Where to look, in yield order

Work down this list. The first two produce most of a good manifest; the rest
fill in the surfaces they cannot reach.

Every URL below is a shape, not an address to paste — find the real id or
handle yourself and confirm it belongs to the company before you download
anything from it.

## A. The company's own brand or press kit — always check first

Most companies of any size publish one, and it is the highest-quality source
there is: full-resolution logo variants, the official type, colour values,
usage rules, and often the art direction. When one exists, `Logo & wordmark`,
`Typeface`, `Art direction` and `Applied identity` should come almost entirely
from it.

Where they hide it, roughly in order of how often it works:

```
/brand   /brand-guidelines   /brand-assets   /press   /press-kit
/newsroom/media-assets   /about/brand   /company/brand   /legal/trademark
```

A site's footer usually links it under "Press", "Brand" or "Media". Failing
that, search the web for `<company> brand guidelines` and `<company> press kit`
and check the result is on the company's own domain — a third-party "brand kit"
aggregator is `archive` at best and usually neither.

Two traps:

- A ZIP is fine to download, but list the files you extracted, not the ZIP.
- Logos are often shipped white-on-transparent for dark backgrounds. That
  renders as a blank card. Take the dark-on-light variant, or take both and
  label them.

## B. Store listings — the most reliable bulk source

An API returns every screenshot at once, at full size, unambiguously
first-party.

**App Store.** The iTunes lookup API needs no key:

```bash
curl -s "https://itunes.apple.com/lookup?id=<APP_ID>&country=us" \
  | python3 -c 'import json,sys; r=json.load(sys.stdin)["results"][0]; print(r["sellerName"]); print(*r["screenshotUrls"],sep="\n"); print(*r.get("ipadScreenshotUrls",[]),sep="\n"); print(r["artworkUrl512"])'
```

Check `sellerName` is the actual company before you use anything. Take **all**
iPhone screenshots and **all** iPad screenshots, not the first two. Screenshot
URLs end in a size segment like `/392x696bb.jpg`; request a bigger one
(`/1290x2796bb.jpg`, or `/0x0ss.jpg`) and check what actually comes back —
the store will happily serve you a different size than you asked for.

**Google Play.** No API; the listing HTML carries the image URLs:

```bash
curl -s "https://play.google.com/store/apps/details?id=<PKG>&hl=en&gl=US" \
  | grep -o 'https://play-lh.googleusercontent.com/[A-Za-z0-9_=-]*' | sort -u
```

Strip the trailing `=w...-h...` suffix and append your own (`=w1600`).

**Microsoft Store.** Only if a listing genuinely exists, and only after
confirming the publisher is the right company. Plenty of repackaged
third-party listings sit next to real ones.

## C. Social — the posted content, not just the profile furniture

An avatar and a banner is not a row. Add what the account actually posts: 4–8
real posted visuals per platform the product is genuinely on. Reel covers,
video thumbnails, campaign stills, announcement graphics.

Use whatever social API or skill the environment already gives you. If you have
none, say so in the report and collect the surfaces that do not need one — a
missing row is honest, a row of screenshots of a profile page is not.

Two that need no key:

- **YouTube** thumbnails, given a video id:
  `https://i.ytimg.com/vi/<VIDEO_ID>/maxresdefault.jpg`
- **og:image** on any public post URL, for platforms that still serve one to a
  plain `curl`.

### Verify the account, not the handle

Confirm the handle resolves, that it carries whatever verification the platform
offers, and that it is the right company — not a fan account, a regional
subsidiary you were not asked for, or a squatter. The obvious handle is
routinely wrong: on one pass the bare `@tiktok` on X was an unrelated
local-offers account and the company's was `@tiktok_us`.

A company with several accounts (global, regional, "newsroom", "design") is
one row per platform, not one per account. Pick the main one, and say which.

## D. Marketing site and newsroom

Hero imagery, product shots, illustration sets, feature-page art, and the
`og:image` cards off a newsroom or blog **index** — an index gives you a dozen
at once:

```bash
curl -sL "$INDEX_URL" | grep -o 'og:image[^>]*content="[^"]*"'
```

Press photography — leadership headshots, office and event photography — is its
own row, not part of art direction.

### A 200 is not proof the page exists

Most newsrooms are single-page apps that answer HTTP 200 for any path,
including one you invented. Before you trust a set of article URLs, fetch a
deliberately bogus slug on the same host and see what its generic `<title>` is;
then check every real candidate has its own:

```bash
curl -sL "$URL" | grep -o '<title>[^<]*</title>'
```

Any slug that comes back with the generic title does not exist. Drop it, and
drop anything you took from it.

## E. Curated brand archives

Sites like `brandarchive.xyz` hold identity work that companies have stopped
publishing — old wordmarks, retired art direction. Useful, and legitimate, but
everything from one is `"provenance": "archive"`, never `"theirs"`.

They are also aggressively bot-protected; expect HTTP 429 and a challenge page.
If it is blocked, try once, say so in one line, and move on. A challenge page
saved as `.jpg` is a file that passes `curl` and fails `file` — see the
verification script.

## What not to take

- A screenshot **you** took of their website or app. The row is material they
  published, not material you captured.
- Anything from a press aggregator, a stock library, a wiki, or a fan account.
- Anything you cannot attribute to a human-readable page. A signed CDN URL with
  no page behind it is not a source.
