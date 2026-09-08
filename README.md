# Perinatal Loss Keepsake Creator

A browser-based, Chromebook-friendly Progressive Web App designed to help perinatal loss support teams create respectful, print-ready **8 × 10 memorial keepsakes** for families.

## Current Version

**v2.7 PWA**

**Status:** Working software / active development pending organizational review and approval.

## Purpose

The Perinatal Loss Keepsake Creator provides a guided workflow for creating a memorial keepsake using one to four photographs, optional baby name and birthday text, and simple photo-editing controls.

The application is designed around Jefferson Abington Hospital / Abington Jefferson Perinatal Loss Committee workflows and is intended to be simple enough for clinical staff to use without specialized image-editing software.

## Features

- Installable Progressive Web App (PWA)
- Chromebook and modern browser support
- Offline-capable operation after initial installation/cache
- 1-, 2-, 3-, and 4-photo layouts
- Live 8 × 10 preview
- Individual photo cropping and positioning
- Brightness, contrast, saturation, hue, warmth, sharpness, zoom, rotation, and position controls
- Color, black-and-white, and sepia styles
- Apply selected settings across active photos
- Optional baby's name and birthday
- Multiple readable memorial fonts
- JPG and PNG export
- Browser-based 8 × 10 printing
- Guided workflow: Layout → Photos → Adjust → Details → Review
- Installable PWA icons and offline cache management

## Privacy & Data Handling

**Photos are processed locally in the browser. The current application does not include code that uploads selected patient images to a backend service.**

This repository must never be used to store real patient photographs, names, dates of birth, medical records, or other protected health information.

GitHub Pages serves the application files themselves. A healthcare organization should independently review the application under its privacy, HIPAA, device-management, records-retention, cybersecurity, and clinical-workflow requirements before production use with real patient information.

See [PRIVACY.md](PRIVACY.md) for the current data-handling model and [SECURITY.md](SECURITY.md) for security guidance.

## Screenshots

Screenshots are being prepared for the public repository. Public screenshots should use **synthetic demonstration images and fictional names/dates only**. Do not publish patient data or screenshots captured from real patient workflows.

Planned screenshot set:

- Main guided workflow / application overview
- Layout and photo-editing workflow
- Review / print-readiness view
- Example finished keepsake using synthetic content

## Running Locally

For basic browser use, open `index.html` in Chrome or another modern browser.

For full PWA/service-worker behavior, serve the folder through HTTPS or a local web server.

## GitHub Pages

The project contains a GitHub Pages deployment workflow, `.nojekyll`, `manifest.json`, and `sw.js` and is structured for static HTTPS hosting.

Publishing the application on GitHub Pages does not, by itself, upload photographs selected by the user. Image processing is performed by the application in the user's browser. Organizations should still approve any production deployment before use with real patient information.

## Project Structure

```text
.
├── index.html
├── styles.css
├── app.js
├── app-part1.js
├── app-part2.js
├── app-part3.js
├── app-part4.js
├── manifest.json
├── sw.js
├── icons/
├── .github/workflows/pages.yml
├── .nojekyll
├── USER_GUIDE.txt
├── PRIVACY.md
├── SECURITY.md
└── CHANGELOG.md
```

The four `app-part*.js` files preserve the split source representation of the application logic. `app.js` is the browser-loaded application script.

## Versioning

The current deployment baseline is **v2.7 PWA**. Earlier v2.4 and v2.6 milestones are retained in [CHANGELOG.md](CHANGELOG.md).

## Development Workflow

- `main` — current validated/deployed baseline
- `develop` — integrated development
- `feature/<description>` — new capability work
- `fix/<description>` — defect and repository corrections

Changes should move from feature/fix branches into `develop`, then from tested `develop` into `main`.

## Branding

Jefferson Abington Hospital / committee names and branding remain the property of their respective owners. Publication of source code does not grant permission to reuse organizational names, logos, or trademarks in unrelated products or deployments.

## License / Reuse

No open-source license is currently declared for this repository. Do not assume permission to redistribute organizational branding or deploy the application in another clinical environment without appropriate review and authorization.

## Disclaimer

This software is not a medical device, diagnostic tool, medical record system, or substitute for hospital policy. It creates memorial photo keepsakes only.
