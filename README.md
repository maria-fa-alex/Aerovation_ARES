# Aerovation — ARES

> **Less contamination — more elevation.**

The official website for **Aerovation** and our innovation **ARES** (Aerospace Residue Elimination Service), developed for the [CONRAD Challenge](https://conrad.spacecenter.org/) (Aviation & Aerospace category) by a team of sixth form students.

Live at **https://aerovation.uk** (GitHub Pages with a custom domain, see `CNAME`).

---

## How the site is put together

The site is plain HTML, CSS and JavaScript. GitHub Pages serves the files exactly as they are, with no build step on GitHub.

The **header, footer and shared `<head>` lines** live once, in `partials/`. After editing them (or any CSS/JS), run from this folder:

```bash
python tools/build.py
```

This copies the partials into every page (between the `<!-- @include … -->` / `<!-- @end … -->` markers — never edit inside those by hand), marks the current page in the nav, stamps CSS/JS links with a content hash so visitors always get the latest version, and updates the "Site updated" month in the footer. Commit the updated pages afterwards.

`404.html` is not built: it uses root paths (`/assets/…`) so it works at any missing URL.

### Files

- `index.html` — Home: interactive dust hero, headline stats, plain-language "how it works", page links, project status.
- `ares.html` — Product page with a sticky in-page menu: problem, how it works (with diagrams), the numbers (chart + key specs), taxi-time calculator, **The technicalities** (a dark datasheet section with tabs: governing physics and the micro-gap scaling argument, design point, full model tables, assumptions and model limits), validation roadmap, open challenges, market and targets.
- `about.html` — Team story and member cards (initial avatars until photos exist).
- `contact.html` — Contact cards and topic cards that open a pre-filled email.
- `partials/` — Shared head, header and footer (see above).
- `tools/build.py` — The sync script.
- `assets/css/styles.css` — Design system: fonts, theme tokens (light/dark), components.
- `assets/js/main.js` — Theme toggle, header state and reading progress, scroll reveals, sub-nav highlighting, glossary pop-ups, card glow, technicalities tabs, count-up figures (add `data-count="69"` to an element whose text contains 69), dust calculator.
- `assets/js/hero.js` — Home hero: dust that gets charged and captured by the pointer (or by an automatic collector on touch screens).
- `assets/fonts/` — Self-hosted Manrope and Rajdhani (SIL Open Font License, see `LICENSE.txt`).
- `assets/img/` — The ARES "capture rings" logo set, plus team photos:
  - `logo.svg` / `logo-light.svg`: full lockup (symbol + ARES + AEROVATION) for dark / light backgrounds
  - `logo-mark.svg` / `logo-mark-light.svg`: symbol only, dark / light backgrounds
  - `logo-mono-white.svg` / `logo-mono-black.svg`: one-colour versions for print, merchandise and slides
  - `favicon.svg` (simplified), `apple-touch-icon.png` (phone home screen), `og-image.png` (link previews); `favicon.ico` sits in the site root for browsers and tools that ask for it there
  - On the site itself the mark is inline SVG in `partials/header.html` and `partials/footer.html`, so it follows the theme. All lettering is outlined from Rajdhani Bold.
- `robots.txt`, `sitemap.xml` — Search engine hints.

### Design rules

- **Colours:** orange = brand, buttons, links and headline numbers. Cyan = what ARES does (dust captured, ARES switched on). Icons and section labels stay neutral.
- **Type:** page titles, buttons, nav and small labels in uppercase Rajdhani; section headings and card titles in normal case; body text in Manrope.
- **Honesty:** every performance figure is a concept-stage model prediction, and the site says so near the numbers.
- **Polish layer:** gradient edges and a cursor spotlight on cards, gradient headline numbers, pill section labels, a spec ticker on the home page and a reading-progress line in the header. All of it is in the "VISUAL POLISH LAYER" block near the end of `styles.css`.
- **Phones (under 768px):** a bottom tab bar replaces the header links, card rows become swipeable (`snap-row` class), and the steps and roadmap become vertical timelines. Hidden pop-ups use `display: none`: anything invisible but still laid out past the screen edge makes phones zoom the whole page out.
- **The technicalities section** always uses a dark palette, set by redefining the colour tokens on `.section--tech`.
- **Print / Save as PDF:** a print stylesheet at the end of `styles.css` turns every page black on white, shows all technicalities tabs in full and hides navigation. Check it after big layout changes (browser print preview).
- **Page transitions:** pages cross-fade in browsers that support view transitions; others simply load normally.

---

## Previewing locally

```bash
python -m http.server 8080
```

Then open http://localhost:8080. (Opening the HTML files directly from disk will not load everything correctly.)

---

## Common edits

- **Team photos:** put them in `assets/img/team/` and follow the comment above the team list in `about.html` (each avatar's initial can be swapped for an `<img>`).
- **Product render or prototype photo:** see the comment above the cassette figure in `ares.html`.
- **Calculator numbers:** constants at the top of the "Dust budget calculator" block in `assets/js/main.js`; keep the tables in `ares.html` in step.
- **Glossary terms:** copy an existing `<span class="term">…</span>` in `ares.html` and change the word and definition.
- **Instagram:** when the account is live, see the comment above "Where we are" in `index.html`, then update `partials/footer.html` and `contact.html`, and run the build.
- **Visitor statistics (optional):** a privacy-friendly service such as GoatCounter needs an account; once you have one, add its script tag to `partials/head.html` and run the build.

---

© 2026 Aerovation. All rights reserved.
