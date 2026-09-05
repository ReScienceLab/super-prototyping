# What a board folder's README has to carry

Phase 6. Past a list of screens, past what the canvas already shows:

- **How close it lands**: the per-screen delta table from Phase 4, with the
  crop and the units named, and one sentence explaining the spread rather
  than apologising for it.
- **Every substitution and its consequence**: the faces you could not name,
  the width ratio, the containers you widened because of it.
- **What the source itself gets wrong.** A capture is a state of a real app,
  and some of those states are defects: a partial markdown stream that runs
  two labels together, a component left on its unfilled default, a missing
  Dynamic Island. Transcribed faithfully, they look like *your* bugs. Name
  them as the source's.
- **Anything a reader would otherwise mistake for measurement**: line counts
  standing in for text you could not see, a fitted material, a gradient
  rebuilt from stops.

- **Which assets are generated rather than cropped**, if any, with the probe
  that says how close each one lands. A reader assumes the artwork is the
  source's until told otherwise. Keep those deltas in a manifest the generator
  reads, next to `crops.json` and in the same shape, holding the shipped Δ
  *and* the runs behind it, so "it scored 3.88" reads as "any run of this lands
  near 4.5" rather than as one lucky draw — `generating.md` has the entry
  shape. If the generated set is not what the screens ship, it still belongs
  on a board of its own, including the part that failed. A negative result you
  measured is cheaper for the next reader than the experiment they will
  otherwise repeat.
