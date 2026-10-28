# AI CODE EDITOR MASTER PROMPT
# Project: Cross-Platform Universal Video Downloader
# Working name: ClipNest (changeable)

Act as a senior cross-platform engineer, product designer, security engineer, and QA lead. Build a polished, production-minded video-link and download-management application inspired by the general UX pattern of BlackHole-style downloaders. Do not copy any existing product's branding, assets, or proprietary code.

## 1. Product goal

Create one cross-platform application that runs on:
- Web browsers
- Android
- iOS

Users can paste a media link, inspect the link, see what actions are legitimately available, and manage supported downloads. The app should be useful even when a social platform does not permit direct file downloads: clearly explain the limitation and provide the official viewing, export, or offline-download route where appropriate.

Do not claim that every link can be downloaded. Do not implement or recommend bypassing DRM, paywalls, login restrictions, private-content controls, rate limits, or platform technical protections. Do not scrape or extract YouTube streams using unofficial methods. YouTube content must only be downloaded through a method expressly authorized by YouTube or where the user has the necessary permission and a legitimate source/export. The YouTube Data API is not a general video-file download API.

## 2. Recommended stack

Use a TypeScript monorepo.

- Mobile + web UI: Expo + React Native + TypeScript + Expo Router
- Web support: Expo web / React Native Web where practical; use platform-specific files only where necessary
- Backend: Node.js + Express + TypeScript
- Validation: Zod
- API client: fetch or a small typed wrapper
- Testing: Jest or Vitest where suitable, React Native Testing Library, and Playwright for web end-to-end tests
- Lint/format: ESLint + Prettier
- Persistence: local storage on-device for preferences and download history; MongoDB is optional and should not be required for the first MVP
- Hosting: static web hosting for web; a low-cost Node host for API if required. Document free-tier limitations.
- Package manager: npm workspaces unless the environment already uses pnpm

Before coding, inspect the existing workspace and preserve any working files. If a repository already exists, adapt it instead of overwriting it. Do not generate fake API keys or claim that external integrations work without credentials and verification.

## 3. Core user journeys

### A. Paste and inspect a link
1. User pastes or types a URL.
2. Validate the URL locally and on the server.
3. Identify the host/platform from the hostname, not from user-supplied labels.
4. Show one of these clear states:
   - `direct_download_available`
   - `official_action_available`
   - `permission_required`
   - `unsupported`
   - `invalid_link`
   - `temporarily_unavailable`
5. Show metadata only if it is obtained from a permitted, trustworthy source.
6. Never imply that metadata inspection proves the media file is downloadable.

### B. Download a supported direct media file
Support only a user-provided, publicly accessible direct media file URL where the user is authorized to save the content and the host permits it. Prefer a client-side browser/native download to avoid proxying video bytes through the backend.

- Support common direct file URLs such as MP4 only in the MVP.
- Use native file-saving APIs on mobile and browser download behavior on web.
- Display progress when the platform API provides reliable progress; otherwise show a clear indeterminate state.
- Provide cancel/retry when supported.
- Handle interrupted, failed, expired, and inaccessible URLs.
- Never download an arbitrary URL on the server without strict controls.

### C. Social platform links
Create source adapters, but keep unsupported behavior honest:
- YouTube: show official viewing/offline/export guidance or authorized integrations only. Do not implement unofficial stream extraction or an MP4-conversion endpoint.
- Instagram: use official/authorized APIs and export methods only where access and permissions allow.
- Facebook: use official/authorized APIs and export methods only where access and permissions allow.
- Other websites: support direct media file URLs first; do not scrape pages or bypass access controls.

If no authorized direct download method exists, show “Direct download isn’t available for this link” plus a button to open the original URL or official workflow. Do not make fake quality choices or fabricated download links.

### D. Downloads library
- List locally saved/downloaded items with name, source hostname, file size if known, date, and status.
- Search/filter by status.
- Open, share, retry, or delete local records/files where supported.
- Persist a local history record without uploading personal URLs to a server by default.
- Clearly distinguish a history record from an actual saved media file.
- Do not store third-party credentials, cookies, or access tokens.

## 4. Screens and design

Create a modern, accessible interface with light and dark themes. Use original branding and no copied logos.

Screens:
1. Home / Paste Link
   - App title and settings icon
   - URL input with paste action
   - Analyze button
   - Supported-source explainer
   - Recent downloads
   - Helpful validation/error messages
2. Link Result
   - Source hostname and link preview if available
   - Availability status
   - Real options only
   - Primary action: Download when authorized; otherwise Open official option / Open source
3. Downloads
   - Active, completed, failed sections
   - Progress, cancel/retry where supported
   - Empty state
4. Download Details
   - File metadata and actions
5. Settings
   - Theme
   - Default download behavior
   - Storage information where available
   - Privacy and acceptable-use policy
6. About / Help
   - Explain supported links and platform restrictions
   - Report issue / troubleshooting
7. Privacy and acceptable-use page

UX requirements:
- Responsive layouts for phone, tablet, and desktop
- Accessible labels, keyboard support on web, screen-reader semantics
- Loading, empty, error, success, and offline states
- Do not show fake “100% success” metrics or fake progress
- Avoid dark patterns, adware, hidden subscriptions, or unnecessary permissions

## 5. Backend API

Implement a small, typed API with clear validation and error handling.

### POST /api/v1/links/inspect
Request:
{
  "url": "https://example.com/video.mp4"
}

Response example (illustrative only):
{
  "platform": "website",
  "status": "direct_download_available",
  "displayHost": "example.com",
  "title": null,
  "mediaType": "video/mp4",
  "sizeBytes": null,
  "availableActions": ["download"],
  "message": "A direct media URL was detected. Confirm you have permission to save it."
}

Use Zod schemas. Derive `platform` from a strict hostname allowlist / hostname parser, not a free-form client field. Do not claim that a URL is a direct media file just because its path ends in `.mp4`; verify safely from the client or a permitted source. If server-side inspection is needed, make it an explicit, protected feature with strict network controls.

### GET /api/v1/health
Return a simple health status.

Optional future endpoints:
- `GET /api/v1/config` for public feature flags only
- Download-job endpoints only if a legitimate supported provider actually requires server-side jobs. Do not add job queues or server-side video proxying by default.

### Error contract
Return structured errors such as:
- `INVALID_URL`
- `UNSUPPORTED_SOURCE`
- `DOWNLOAD_NOT_AUTHORIZED`
- `DIRECT_FILE_NOT_FOUND`
- `NETWORK_ERROR`
- `RATE_LIMITED`

Do not leak stack traces, environment variables, tokens, or internal network addresses to clients.

## 6. Security requirements

Treat URLs as untrusted input.
- Allow only `https:` by default; permit `http:` only if explicitly justified and warn users.
- Reject `file:`, `javascript:`, `data:`, and other non-web schemes.
- Avoid server-side fetching of arbitrary URLs. If any server-side fetch is implemented, defend against SSRF: resolve and validate DNS/IP, block loopback/private/link-local/multicast/reserved ranges and cloud metadata endpoints, validate every redirect, limit redirects, enforce timeouts and response-size limits, and defend against DNS rebinding.
- Do not expose private API keys in client bundles.
- Use secure headers, request size limits, rate limiting, and safe CORS configuration.
- Never ask for social-media passwords or session cookies.
- Do not persist submitted URLs on the server unless required and clearly disclosed.
- No tracking analytics by default.
- Add `.env.example` with placeholders only and ensure `.env` is in `.gitignore`.
- Avoid logging full URLs when they might contain tokens or private identifiers.
- Do not provide a server-side URL proxy endpoint that can fetch arbitrary user-supplied resources.

## 7. Data model

For the MVP, prefer local persistence:
- `DownloadRecord`: id, sourceHost, displayName, status, createdAt, localUri (platform-specific and optional), mimeType, sizeBytes (optional), errorCode (optional)
- `AppSettings`: theme, defaultAction, privacyPreferences

Do not store actual video files in MongoDB. Do not store passwords or social tokens. Add MongoDB only if there is a clear cross-device sync requirement, and document privacy implications before implementing it.

## 8. Tests and acceptance criteria

Write tests for:
- Valid HTTPS URL
- Malformed URL
- Unsupported schemes such as `javascript:` and `file:`
- Hostname parsing, including lookalike domains
- YouTube link returns an official-action/unsupported state, never an unofficial extraction action
- Instagram/Facebook links do not fabricate a downloadable file
- Direct MP4 with permitted access can be downloaded on each supported platform
- Missing, expired, inaccessible, and non-video URLs
- Network offline, timeout, cancellation, retry
- No false success status
- Local download history survives app restart
- Web keyboard and accessibility basics
- API error responses do not leak secrets
- If any server-side fetching exists, SSRF and redirect protections have tests

Acceptance criteria:
1. `npm install` completes.
2. Documented commands start web and API locally.
3. TypeScript and lint checks pass.
4. Automated tests pass.
5. Web app works at desktop and mobile viewport sizes.
6. Android and iOS projects can be run with the documented Expo workflow, subject to available SDK/tooling.
7. A direct authorized test video can be saved through a supported path.
8. Unsupported social links receive an accurate explanation, not a fake download button.
9. No secrets are committed.
10. README explains limitations, setup, test commands, deployment, privacy, and platform rules.

## 9. Development workflow

Proceed in small phases. Do not try to build everything in one unverified code dump.

Phase 1: inspect workspace and present a short implementation plan.
Phase 2: scaffold the monorepo, app shell, theme, navigation, shared types, and README.
Phase 3: implement URL validation, platform classification, and honest result states.
Phase 4: implement direct authorized media downloads on web and mobile using appropriate platform APIs.
Phase 5: implement downloads library and local history.
Phase 6: implement API health and link-inspection endpoint.
Phase 7: add tests and run lint/typecheck/test commands.
Phase 8: document deploy options, environment variables, known limitations, and next steps.

After each phase:
- Summarize files created/changed.
- Run relevant checks if tools are available.
- Fix errors before continuing.
- Do not claim tests passed unless actually run.
- If a platform-specific API cannot be tested in this environment, clearly document the manual test steps.
- If you need a decision, ask one concise question; otherwise use sensible defaults.

## 10. Deliverables

Produce:
- Working source code, not just mockups
- README with exact setup and run commands
- `.env.example`
- `.gitignore`
- Automated tests
- A platform support matrix
- A security/privacy checklist
- A clear explanation of what works today versus what requires official provider approval
- No fabricated API keys, fake service integrations, or claims that every YouTube video can be downloaded

Start by inspecting the current project folder, then implement Phase 1 and Phase 2. Keep the project easy for a beginner to run in VS Code, with commands written explicitly.
