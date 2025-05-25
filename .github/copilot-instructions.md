<!-- Use this file to provide workspace-specific custom instructions to Copilot. For more details, visit https://code.visualstudio.com/docs/copilot/copilot-customization#_use-a-githubcopilotinstructionsmd-file -->

This is a Next.js project with both frontend and backend (API routes) running in a single Docker container. Use environment variables for MariaDB connection. All code should be compatible with containerized deployment.

- Any changes you make you should tick up the version number in `package.json` and `package-lock.json` files. Use semantic versioning (major.minor.patch) for version numbers. Also tick this version in the default footer added to layout.tsx.
- Each change should automatically trigger a commit with a descriptive list of changes but not mention the version bumps.
- When working with MariaDB, always ensure that BigInt values are converted to Number before returning JSON responses from API routes.
- When extracting dynamic route parameters from URLs in API routes, use robust parsing (such as regex) to avoid capturing static path segments.
- For admin UI tables, use Tailwind CSS to ensure strong contrast, alternating row backgrounds, clear headers, and accessible button styling for readability and usability.
- Add debug logging (using `adminDebugLog`) to backend admin API routes when troubleshooting or making changes to data logic.
