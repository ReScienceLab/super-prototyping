# Sources

Each cover, and each page of screen 04's document, is the publisher's own file,
not a crop. gen.py's COVERS places a cover:
1083 device px across -- the card's own 361pt gutter width -- from the file row
scratch/wherefrom.py matched it at, over a flat ground and under the scrim
scratch/scrim.py fitted. assets/art/cover-*.png are the cuts the boards inline;
these are the files those cuts come from.

Where a file is served through a resizer, what is taken is the rendition the
post itself references and not the upstream master. That is the one the app
decoded, and a sharper original scores worse.

card-2 — "An hour a day is all you need." (The Improvement Journal, restacked by pathsofstoicism) — https://improvebypathsofstoicism.substack.com/p/an-hour-a-day-is-all-you-need — https://substack-post-media.s3.amazonaws.com/public/images/3e25b318-08ae-4631-aefe-4efdbf49ff1b_1456x1048.png
card-5 — "Indexing Strategies: B-Trees, Hash Tables, and R-Trees" (System Design Interview Roadmap) — https://systemdr.systemdrd.com/p/indexing-strategies-b-trees-hash — https://substack-post-media.s3.amazonaws.com/public/images/4b5f8567-d95a-4b96-8a8b-09c1edab9a1a_1312x1138.png
card-7 — "How to Trick Your Brain into Doing Difficult Things" (Brain Health, Decoded) — https://www.brainhealthdecoded.com/p/how-to-trick-your-brain-into-doing — https://images.unsplash.com/photo-1711409645921-ef3db0501f96?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080 — the post's own og:image, 1080 wide; the Unsplash master scores 0.6 worse
photo-6 — sol, "how to be okay with being disliked" (words i keep inside) — https://substack.com/@solennne/note/c-270926302 — https://substack-post-media.s3.amazonaws.com/public/images/c30b0447-db98-44ad-8436-053fdac746a7_735x391.jpeg
photo-1 — "WILD WEEK" (wild.plus) — the note is a video and the capture holds a frame of it; there is no still to fetch, so that one stays a crop
doc-4a — page 1 of 5, "The complete system-design playbook…" (AI Engineering Insider) — https://substack.com/@aiengineeringinsider/note/c-275326222 — https://substack-post-media.s3.amazonaws.com/public/images/e6a87174-ecbc-4f44-938c-ab61f3bad436_1241x1754.jpeg
doc-4b — page 2 of 5, same note — https://substack-post-media.s3.amazonaws.com/public/images/0a9a4730-77bb-4151-8f58-642796c3081d_1241x1754.jpeg

photo-6's file is 735 px wide and the card draws it at 1083. Substack's resizer
is asked with c_limit and will not upscale, so the app was handed the same
735 px and upscaled it on the device; the board does the same with Lanczos. That
upscale is most of what separates screen 6's cover from the capture.

The two pages are not covers and gen.py's DOCS places them separately. The
carousel is 300pt tall and a page keeps its own 1241x1754, so the width is a
consequence and not a token: 900 device px tall is 637 across. scratch/docfit.py
matches both at exactly that size, first row on the box, at x 16.00pt and
x 236.33pt -- an 8pt gap -- so neither is cropped or centred. The second runs off
the right edge of the screen and the raster cuts it there.
