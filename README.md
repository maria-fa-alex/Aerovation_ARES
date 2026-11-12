# Aerovation — ARES

> **Less contamination — more elevation.**

The official website for **Aerovation** and our innovation **ARES** (Aerospace Residue Elimination Service), developed for the [CONRAD Challenge](https://conrad.spacecenter.org/) (Aviation & Aerospace category) by a team of sixth form students.

Hosted directly via **GitHub Pages**.

---

## Website Structure

- `index.html` — Homepage with interactive drifting-dust canvas, core-dust budget stats (`0–20μm`, `~77% at idle`, `−69% core dust`), 4-step workflow overview (`Charge`, `Capture`, `Stow & wash`, `Monitor`), and explore links.
- `ares.html` — Product deep dive: the physics of fine dust ingestion ($\tau_p \propto d^2$, `9.8g` taxi/idle vs `3.1g` take-off/landing), why existing alternatives and naive full-inlet electrostatics fail (`93 m/s` required vs `0.14 m/s` achievable), the 36-channel concentric micro-gap core-inlet cassette (`5 mm` pitch, `s = 2.5 mm`, `2.5 kV`, `1 MV/m`, `50 μm` titanium foil, `30 L` post-shutdown wash) and Dust-Exposure Index (`DEI`), first-principles screening model tables, ground-mode architecture & validation roadmap, market segments, and quantitative targets.
- `about.html` — Team background, sixth form intro, and 3×2 grid of C-suite member profile cards plus a team photo placeholder.
- `contact.html` — Direct contact cards (email, Instagram, location) and quick navigation links.
- `404.html` — Branded not-found page.
- `assets/css/styles.css` — Complete design system (theme variables, WCAG AA contrast in light/dark mode, typography, data tables, responsive grid).
- `assets/js/main.js` — Navigation overlay, theme toggle with persistence, and scroll reveal animations.
- `assets/js/hero.js` — Drifting dust background for the home page hero.
- `assets/img/` — Brand vectors (`logo.svg`, `logo-mark.svg`, `favicon.svg`).

---

## Previewing Locally

Run a simple local server from this directory:

```bash
# Python 3
python3 -m http.server 8000
```

Then open `http://localhost:8000` in your browser.

---

## Customisation Guide

### 1. Adding Team Photos & Updating Bios
In `about.html`, locate each member's card (e.g. `#team-aurelia`, `#team-maria`):
- Place square or portrait photos inside `assets/img/team/` (e.g. `assets/img/team/aurelia.jpg`).
- Add the `<img>` tag inside the `.team-photo` container:
  ```html
  <div class="team-photo">
    <img src="assets/img/team/aurelia.jpg" alt="Aurelia">
  </div>
  ```
- Replace the `"Bio coming soon"` text and update the role subtitle.

### 2. Adding Product Renders and System Diagrams
In `ares.html`:
- **Product Render**: Save your 3D CAD render or prototype photo to `assets/img/ares-product.png`. Replace the placeholder `.media-ph` with `<img src="assets/img/ares-product.png" alt="ARES Prototype" class="media-ph">`.
- **System Flow Diagram**: Save your schematic to `assets/img/ares-diagram.png`. Replace the second placeholder `.media-ph--wide` similarly.

### 3. Activating the Contact Form (Formspree)
The contact form in `contact.html` is pre-styled and handles submissions gracefully. When you have an email address ready:
1. Create a free form at [Formspree](https://formspree.io/).
2. In `contact.html`, update the `<form>` tag:
   ```html
   <form class="contact-form" id="contact-form" action="https://formspree.io/f/YOUR_FORM_ID" method="POST" data-live="true">
   ```
3. Form submissions will automatically deliver to your inbox.

### 4. Connecting Instagram
In `index.html`, under `#instagram-feed`:
- You can embed free responsive feeds via [Behold.so](https://behold.so) or [LightWidget](https://lightwidget.com).
- Replace the placeholder grid with the embed snippet provided by the service.
- Update the `href` on `#instagram-follow` to your team's Instagram profile URL.

---

## Deployment to GitHub Pages

1. In your GitHub repository (`maria-fa-alex/Aerovation_ARES`), go to **Settings** > **Pages**.
2. Under **Build and deployment**:
   - **Source**: `Deploy from a branch`
   - **Branch**: `main` / `root`
3. Click **Save**. Your site will be live at `https://maria-fa-alex.github.io/Aerovation_ARES/`.

---

© 2026 Aerovation. All rights reserved.