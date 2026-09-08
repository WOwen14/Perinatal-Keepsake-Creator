# Security Guidance

## Scope

This repository contains a client-side memorial keepsake application intended for controlled healthcare workflow review. It should not be treated as approved for production use solely because the source is publicly available.

## Security Expectations

- Do not place credentials, tokens, private keys, certificates, internal URLs, or patient information in this repository.
- Do not use real patient photographs or identifiers for public testing, screenshots, issues, or pull requests.
- Treat changes that add analytics, telemetry, network APIs, cloud storage, external image processing, or third-party scripts as security/privacy-significant changes requiring explicit review.
- Keep the application dependency-light and review any future external dependency before deployment.
- Validate PWA/service-worker updates so stale cached code does not remain in use after a controlled release.

## Reporting a Security or Privacy Concern

Do not post patient information, credentials, or sensitive screenshots in a public GitHub issue.

When reporting a problem, provide only the minimum synthetic reproduction data needed to explain the defect. If a real operational screenshot or patient-related artifact is required for internal troubleshooting, use an approved organizational channel rather than the public repository.

## Production Review

A healthcare organization should perform its own privacy, cybersecurity, browser/device-management, records-retention, and workflow review before approving production use.
