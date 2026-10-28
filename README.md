# ClipNest 🌌

> **Universal Media Link Inspector & Ethical Video Downloader**
> A cross-platform desktop and web application inspired by the sleek aesthetics of BlackHole, featuring cosmic glassmorphism, transparent platform behavior, and zero-compromise security.

---

## 🌟 Key Highlights

- **Cosmic Glassmorphism UI:** Built with dark/light themes, glowing ambient backdrops, blurred glass panels (`backdrop-filter`), micro-animations, and modern typography (*Outfit* & *Plus Jakarta Sans*).
- **Ethical & Transparent Platform Policy:** 
  - **Direct Media Streams (.mp4, .webm, .mkv, .mov, .m4v, .m3u8):** Analyzed and downloaded directly with real-time byte counters, speed measurement, and local file storage.
  - **Protected Social Platforms (YouTube, Instagram, Facebook, TikTok, X, Vimeo):** Provides honest explanations with official deep-links to authorized viewers and subscriptions—**no fake quality selectors, no deceptive progress bars, and zero DRM/paywall bypass.**
- **Enterprise-Grade SSRF Defense:** 
  - Dual-layer IP validation blocking IPv4 private ranges (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`), loopback (`127.0.0.0/8`), link-local/cloud metadata (`169.254.169.254`, `metadata.google.internal`), and IPv6 loopback (`::1`).
  - Pre-request DNS resolution pinning preventing DNS rebinding attacks.
  - Protocol whitelist strictly enforcing `http:` and `https:`.
- **Dual-Mode Desktop & Web Application:**
  - **Electron Desktop App:** Native window frame with custom drag regions, native chunked downloader saving directly to disk, folder picker dialog, and system shell launcher.
  - **Web Application:** Client-side streaming blob downloader with fallback client-side inspection engine.
- **100% Automated Test Suite:** 20 test cases across 5 test suites covering URL validation, SSRF defenses, lookalike domain rejection, platform classification, and Express REST API endpoints.

---

## 🏗️ Architecture & Project Structure

The project is structured as an npm workspaces monorepo:

```
Download enything/
├── packages/
│   └── shared/                  # @clipnest/shared
│       ├── src/
│       │   ├── types.ts         # Domain models (DownloadRecord, AppSettings, LinkInspectionResult)
│       │   ├── schemas.ts       # Zod schemas for runtime validation
│       │   ├── platforms.ts     # Platform definitions & ethical policies
│       │   ├── url-utils.ts     # Domain matching, extension parsers, formatters
│       │   └── index.ts         # Barrel export
│       └── package.json
├── apps/
│   ├── api/                     # @clipnest/api (Express REST API)
│   │   ├── src/
│   │   │   ├── ssrf-shield.ts   # IP range filtering & DNS resolution validator
│   │   │   ├── inspector.ts     # Safe HTTP HEAD/GET probe service
│   │   │   ├── routes.ts        # /api/v1/health & /api/v1/links/inspect
│   │   │   └── server.ts        # Express app with Helmet, CORS, and size limits
│   │   └── package.json
│   └── desktop/                 # @clipnest/desktop (Electron + Vite + React)
│       ├── electron/
│       │   ├── main.ts          # Native Electron window & chunked downloader
│       │   └── preload.ts       # Secure contextBridge IPC layer
│       ├── src/
│       │   ├── components/      # Header, UrlInspectorCard, ResultCard, DownloadsView, Modals
│       │   ├── hooks/           # useDownloads (localStorage sync), useTheme
│       │   ├── services/        # api-client (dual-mode probe), downloader, storage
│       │   ├── index.css        # Cosmic Glassmorphism CSS design system
│       │   ├── App.tsx          # Main application orchestrator
│       │   └── main.tsx         # React root
│       ├── index.html
│       ├── vite.config.ts
│       └── package.json
├── tests/                       # Automated Test Suite (Node.js Test Runner)
│   ├── test-framework.ts        # Lightweight Jest/Vitest-compatible test harness
│   ├── url-validation.test.ts   # URL schema & security checks
│   ├── ssrf-shield.test.ts      # SSRF defense, private IP & cloud metadata blocks
│   ├── platform-classification.test.ts # Ethical classification & sample checks
│   └── api.test.ts              # Express API integration tests
└── package.json                 # Monorepo root workspace configuration
```

---

## 🛡️ Ethical Platform Support Matrix

| Platform / Source | Action | User Experience & Guarantee |
| :--- | :--- | :--- |
| **Direct Video / Audio** (`.mp4`, `.webm`, `.mkv`, `.mov`, `.m4v`, `.m3u8`) | **Direct Download** | Full chunked streaming download with live speed calculation, byte progress, and local file storage. |
| **YouTube** | **Official Action** | Explains YouTube Terms of Service and content protections. Offers direct button to open the video on YouTube. No unofficial stream rip or fake quality dropdowns. |
| **Instagram** | **Official Action** | Explains Meta DRM and access controls. Provides direct link to open the post on Instagram. |
| **TikTok** | **Official Action** | Explains platform copyright policies and provides direct link to TikTok. |
| **Facebook** | **Official Action** | Explains privacy settings and provides direct link to Facebook. |
| **X (Twitter)** | **Official Action** | Explains developer API terms and provides direct link to X. |
| **Vimeo** | **Official Action / Direct** | If direct media stream is accessible, direct download is enabled; otherwise routes to official Vimeo player. |
| **Unsupported Sites** | **Unsupported** | Transparently informs the user that no direct media stream was found without false promises. |

---

## 🚀 Quick Start Guide

### Prerequisites
- Node.js `v20.x` or higher (tested on Node `v24.12.0`)
- npm `v10.x` or higher

### 1. Installation
Install monorepo dependencies across all packages:
```bash
npm install
```

### 2. Run Automated Tests
Execute the 20-test automated verification suite:
```bash
npm test
```

### 3. Build Production Artifacts
Build all packages (`@clipnest/shared`, `@clipnest/api`, and `@clipnest/desktop`):
```bash
npm run build
```

### 4. Run the Development Servers
Start both the Backend API and Web / Desktop application:

**Option A — Full Stack Dev:**
```bash
# Terminal 1: Run Backend API (Port 4000)
npm run dev:api

# Terminal 2: Run Desktop / Web UI (Port 5173)
npm run dev
```

**Option B — Production Preview:**
```bash
npm --workspace=@clipnest/desktop run preview
```

**Option C — Electron Desktop App:**
```bash
npm run dev:desktop
```

---

## 🔒 Security & SSRF Defense

ClipNest adheres to strict security standards to prevent Server-Side Request Forgery (SSRF) and data leakage:

1. **Deny-by-Default IP Filtering:**
   All hostnames resolved during link inspection are checked against private and reserved CIDR blocks:
   - `127.0.0.0/8` (Loopback)
   - `10.0.0.0/8` (RFC 1918 Private)
   - `172.16.0.0/12` (RFC 1918 Private)
   - `192.168.0.0/16` (RFC 1918 Private)
   - `169.254.0.0/16` (Link-Local & Cloud Metadata / AWS / GCP / Azure)
   - `0.0.0.0/8`, `100.64.0.0/10`, `192.0.0.0/24`, `198.18.0.0/15`
   - `::1`, `fc00::/7`, `fe80::/10` (IPv6 Loopback and Unique Local)
2. **DNS Pinning:**
   Target URLs are resolved via `dns.promises.lookup` before any HTTP probe is dispatched. If the resolved IP belongs to a forbidden range, the request is immediately terminated with HTTP 403 `SSRF_ATTEMPT_BLOCKED`.
3. **HTTP Strict Protection:**
   Rejects non-HTTP protocols (`file:`, `javascript:`, `ftp:`, `data:`, `gopher:`).
4. **Header Safety & Redirection Limits:**
   Only lightweight `HEAD` or ranged `GET` requests are performed with a 10-second timeout. HTTP redirects are capped and re-evaluated through the SSRF shield before following.

---

## 🧪 Test Verification

Run `npm test` to view test results:
```
▶ Backend API Endpoints (/api/v1)
  ✔ GET /health returns status ok with timestamp
  ✔ POST /links/inspect returns 400 when URL is missing or malformed
  ✔ POST /links/inspect returns honest YouTube guidance
  ✔ POST /links/inspect blocks SSRF loopback targets with 403
✔ Backend API Endpoints (/api/v1)
▶ Platform Classification & Honest Result States
  ✔ correctly classifies YouTube links and never generates unofficial stream extraction
  ✔ honestly classifies Instagram and Facebook links without fabricating downloadable files
  ✔ detects direct media files and marks direct_download_available
  ✔ marks regular websites as unsupported without false promises
  ✔ flags invalid link schemes cleanly
✔ Platform Classification & Honest Result States
▶ SSRF Shield & Private IP Filter
  ✔ correctly identifies private, loopback, and link-local IPv4 addresses
  ✔ allows public IPv4 addresses
  ✔ correctly identifies private and loopback IPv6 addresses
  ✔ blocks dangerous URLs targeting loopback or internal metadata
✔ SSRF Shield & Private IP Filter
▶ URL Validation & Security Filtering
  ✔ accepts valid https URLs
  ✔ accepts valid http URLs
  ✔ rejects unsupported schemes like javascript:, file:, data:
  ✔ rejects malformed URLs
  ✔ validates strictly with Zod LinkInspectionRequestSchema
✔ URL Validation & Security Filtering
▶ Hostname Parsing & Lookalike Domain Defense
  ✔ matches legitimate subdomains correctly
  ✔ rejects attacker lookalike domains
✔ Hostname Parsing & Lookalike Domain Defense

ℹ tests 20
ℹ suites 5
ℹ pass 20
ℹ fail 0
```

---

## ⚖️ License & Ethical Declaration

ClipNest is developed solely for authorized, personal media archiving and link inspection. It respects content creators and copyright holders by refusing to bypass technological access controls (DRM), scrape protected platforms without authorization, or violate service terms.
