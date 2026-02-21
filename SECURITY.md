Security checklist

- Rotate and avoid committing secrets (.env should be in .gitignore)
- Use environment-specific API keys and restrict scopes
- Run dependency vulnerability scans (npm audit, Snyk)
- Enforce HTTPS for all external services
- Harden session cookies (secure, httpOnly, sameSite)
- Validate and sanitize all inputs on server endpoints
- Limit file uploads and store files safely

For a full security audit, run automated scanners and a manual review.
