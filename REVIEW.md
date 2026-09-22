# Review rules

Flag these on every PR, on top of the usual bugs and security checks.

## Over-engineering

- An unrequested abstraction: an interface with one implementation, a factory
  for one product, a config knob for a value that never changes.
- Configuration, an extension point, or generic machinery for a case that
  has not happened yet. Flag it and ask what the second real case is.
- A fallback or error handler for a state that should be impossible. Prefer
  letting it fail loudly over absorbing it silently.
- A helper with exactly one call site. Inlining it costs nothing and a name
  read once buys nothing.
- Boilerplate or scaffolding added "for later."

## Writing (comments, docs, PR descriptions)

A comment should explain a non-obvious *why* — a hidden constraint, a
workaround, a subtle invariant. Flag a comment that only restates what the
code already says.

Flag AI-writing tells in anything written for a human to read:

- Em dashes. Filler phrases ("in order to", "it is important to note that").
- Fancy synonyms for "is" ("serves as", "stands as", "boasts").
- Abstract jargon (delve, leverage, utilize, robust, seamless, landscape,
  tapestry, testament, underscore) where a plain word says the same thing.
- "Not just X, but Y" and forced rule-of-three lists.
- Chatbot phrases ("I hope this helps!", "Let me know if...") and
  sycophantic openers ("Great question!").
- A bold label used as an inline heading that just restates the sentence
  after it.
- Vague attribution ("industry reports suggest") instead of naming the
  actual source, or no source at all.
