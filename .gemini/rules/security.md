# Security: Secret & Credential Safety Rule

- **Do NOT Write Real Secrets**: Under no circumstances should real secrets, credentials, personal access tokens (PATs), API keys, private keys, passwords, or other sensitive authentication materials be written, copied, or committed to any codebase files, environment templates, configuration files, or documentation.
- **Use Generic Placeholders**: Always use descriptive, generic placeholders wrapped in angle brackets or standard conventions (e.g., `<your-dockerhub-access-token>`, `<gcp-service-account-key>`, `<db-password>`) when writing code snippets, configuration files, or documentation.
- **Sanitize File Edits**: Before saving or modifying files that contain environment configurations, variables, or docs, verify that no plain-text credentials have been introduced.
