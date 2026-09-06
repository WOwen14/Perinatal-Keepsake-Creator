# Perinatal Loss Keepsake Creator

A browser-based, Chromebook-friendly application designed to help perinatal loss support teams create respectful, print-ready **8 × 10 memorial keepsakes** for families.

## Current Version

**v2.4 PWA**

## Purpose

The Perinatal Loss Keepsake Creator provides a guided workflow for creating a memorial keepsake using one to four photographs, optional baby name and birthday text, and simple photo-editing controls.

The application is designed for Jefferson Abington Hospital / Abington Jefferson Perinatal Loss Committee workflows and is intended to be simple enough for clinical staff to use without specialized image-editing software.

## Features

- Installable Progressive Web App (PWA)
- Chromebook and modern browser support
- Offline-capable operation
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

## Privacy & Data Handling

**Photos are processed locally in the browser. The application does not include code that uploads or transmits patient images.**

This repository must never be used to store real patient photographs, names, dates of birth, medical records, or other protected health information.

A healthcare organization should independently review the application under its privacy, HIPAA, device-management, records-retention, cybersecurity, and clinical-workflow requirements before production use.

## Running Locally

For basic browser use, open `index.html` in Chrome or another modern browser.

For full PWA/service-worker behavior, serve the folder through HTTPS or a local web server.

## GitHub Pages

The project contains `.nojekyll`, `manifest.json`, and `sw.js` and is structured for static hosting such as GitHub Pages.

> **Important:** Publishing the application on GitHub Pages does not cause photographs selected by a user to be uploaded to GitHub. Image processing occurs in the user's browser. Organizations should still approve any production deployment before use with real patient information.

## Project Structure

```text
.
├── index.html
├── styles.css
├── app-part1.js
├── app-part2.js
├── app-part3.js
├── app-part4.js
├── manifest.json
├── sw.js
├── committee-logo.svg
├── icons/
│   └── icon.svg
├── .nojekyll
└── GITHUB_PAGES_SETUP.txt
```

The four `app-part*.js` files are the original v2.4 application logic split into ordered, version-controlled source files. When concatenated in order, they reproduce the original `app.js` byte-for-byte.

## Status

This project is under active development and should be treated as a clinical-support tool pending organizational review and approval.

## Disclaimer

This software is not a medical device, diagnostic tool, medical record system, or substitute for hospital policy. It creates memorial photo keepsakes only.
