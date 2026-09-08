# Privacy and Data Handling

## Purpose

The Perinatal Loss Keepsake Creator is designed to create memorial keepsakes locally in a user's browser. It is not a medical record system and should not be used as a repository for patient information.

## Current Data-Handling Model

- Selected photographs are processed in the browser by the application.
- The current application does not include a backend image-upload workflow.
- The current application does not require a user account or cloud database.
- GitHub Pages serves the application code and static assets; it is not intended to receive or store the photographs selected by the operator.
- PWA/service-worker caching is used to support offline application operation after the required static assets have been loaded.

## Protected Information

Do not commit, upload, attach, or publish any of the following in this repository:

- Real patient photographs
- Patient or family names
- Dates of birth or death tied to an identifiable patient
- Medical-record information
- Hospital account or encounter identifiers
- Screenshots containing protected health information
- Exported keepsakes created from real patient data

Public screenshots, documentation, tests, and demonstrations must use synthetic images and fictional names/dates only.

## Organizational Review

Before production use, the deploying healthcare organization should review the application under its own requirements for:

- HIPAA/privacy
- Cybersecurity
- Device and browser management
- Records retention
- Printing and export handling
- Clinical workflow
- Branding and communications

This document describes the intended behavior of the current source baseline and is not a substitute for an organizational privacy or security assessment.
