# Arabic Root Notebook — 200-root edition

Static site; no framework and no build step.

## Views

- **Book** — physical page turns with StPageFlip.
- **Browse** — CSS Grid cards.
- Search/goto with Fuse.js.
- Previous/Next buttons and left/right keys advance by the number of pages currently visible (1 in portrait, 2 in a book spread, 3+ columns in Browse when applicable).
- `/` focuses search.
- `b` = book, `g` = browse.
- Hebrew comparisons are collapsed on book pages.

## Data

`roots.js` is the file the browser uses. `roots.json` is the same data in portable JSON form.

The 200 entries are **CAMeL-informed and learner-curated**, not presented as a mathematically exact
top-200 root ranking. CAMeL's public MSA frequency release is a surface-word list (about 11.4M
unique types / 12.6B tokens); getting root frequencies requires morphological analysis and manual
normalization of weak/ambiguous roots.

`build_camel_root_ranking.py` is included so the ranking can be regenerated from the CAMeL MSA
TSV with CAMeL Tools when the release file is available locally.

## Content conventions

- Generic filler notes are omitted; a note appears only when it adds substantive morphology, etymology, or semantic information.
- Arabic appears in Latin transliteration on the reading surface.
- Search aliases strip diacritics: `dunya`, `dunia`, `adna`, `fahisha`, `kitab`, etc.
- Hebrew is added only for clear or explicitly cautious comparisons; otherwise the entry says
  no verified learner-level connection was added.

## Run

Because content is in `roots.js`, the page itself does not need to fetch local data. It can be served
on GitHub Pages as-is. The two JS libraries are pinned from jsDelivr.

For a local server:

    python -m http.server 8000

then open http://localhost:8000
