# Balentine Tech Solutions — Portfolio Website

Live site: **[debalent.github.io/Balentine-Tech-Solutions-Website](https://debalent.github.io/Balentine-Tech-Solutions-Website/)**

Personal portfolio and business site for **Demond Balentine Sr.**, full-stack developer and technical founder.

---

## Tech Stack

- **HTML5** — semantic structure, accessibility attributes
- **CSS3** — custom properties (design tokens), dark/light themes, responsive layouts, animations
- **Vanilla JavaScript** — no frameworks, no build step
- **Google Fonts** — Inter + Space Grotesk
- **GitHub Pages** — static hosting via GitHub Actions

---

## Project Structure

```
/
├── index.html              # Main page (all sections)
├── styles.css              # Full design system & component styles
├── script.js               # Interactivity (nav, theme, sliders, forms)
├── assets/
│   ├── logo.jpg            # Brand logo (nav + hero)
│   ├── about-primary.jpg   # About section main photo
│   ├── profile-photo.jpg   # About section secondary photo
│   ├── hero-image.jpg      # Hero background image
│   ├── creatorsync-1.png   # CreatorSync project screenshot 1
│   ├── creatorsync-2.png   # CreatorSync project screenshot 2
│   └── resume.pdf          # Downloadable resume
├── .github/
│   └── workflows/
│       └── deploy.yml      # GitHub Actions → GitHub Pages deployment
└── README.md
```

---

## Local Development

No build tools required. Open directly in a browser:

```bash
# Option 1: open directly
start index.html

# Option 2: serve with Python (avoids any local CORS issues)
python -m http.server 8080
# then visit http://localhost:8080
```

---

## Deploying Changes

Any push to `main` automatically deploys via GitHub Actions:

```bash
git add .
git commit -m "your message"
git push origin main
```

Deployment takes ~1–2 minutes. Check the **Actions** tab on GitHub to monitor progress.

---

## Customizing Content

### Update text content
All page content is in `index.html`. Sections are clearly commented:
- `<!-- Navigation -->`
- `<!-- Hero Section -->`
- `<!-- Featured Projects Section -->`
- `<!-- Tech Stack Section -->`
- `<!-- About Section -->`
- `<!-- Services Section -->`
- `<!-- Blog/Insights Section -->`
- `<!-- Contact Section -->`

### Update colors / design tokens
All colors, spacing, and typography are CSS variables at the top of `styles.css`:

```css
:root {
    --color-accent: #6366f1;        /* primary purple */
    --color-bg-primary: #0a0a0a;    /* dark background */
    --color-gradient: linear-gradient(135deg, #6366f1 0%, #a855f7 100%);
    /* ... */
}
```

### Add a project screenshot slider
1. Copy images to `assets/`
2. Replace the project card's `project-image-placeholder` div with:
```html
<div class="project-screenshots">
    <img src="assets/your-image-1.png" alt="Description" class="screenshot-slide active">
    <img src="assets/your-image-2.png" alt="Description" class="screenshot-slide">
    <div class="screenshot-dots">
        <span class="dot active" onclick="showSlide(this, 0)"></span>
        <span class="dot" onclick="showSlide(this, 1)"></span>
    </div>
</div>
```

### Update the resume
Replace `assets/resume.pdf` with a new file of the same name, then push.
The download buttons in the hero and footer will automatically serve the new file.

### Toggle dark/light theme default
Change the `data-theme` attribute on the `<html>` tag in `index.html`:
```html
<html lang="en" data-theme="dark">   <!-- or data-theme="light" -->
```

---

## Contact

- **Email:** balentinetechsolutions@gmail.com
- **Phone:** (479) 250-2573
- **GitHub:** [github.com/Debalent](https://github.com/Debalent)
