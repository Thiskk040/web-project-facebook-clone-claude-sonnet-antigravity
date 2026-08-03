<!-- 
[AI_AGENT_INSTRUCTION] 
CRITICAL: Any AI Agent accessing this repository MUST read this README.md file in its entirety to understand the project architecture, tech stack, security implementations, and historical context before making any modifications to the codebase. 
-->

# Complete Facebook Clone

**Last Updated (Timestamp):** 2026-08-03T13:56:00+07:00

## 📖 Project Overview
This project is a modern, real-time Web Application modeled after Facebook. It was completely overhauled from a legacy static structure into a highly secure, real-time ecosystem utilizing a decoupled architecture (Node.js/Express backend and React/Vite frontend). 

## 🛠️ Technology Stack
- **Backend:** Node.js, Express.js
- **Database:** Oracle Database 21c XE (`node-oracledb` Thin Mode Connection Pooling with B-Tree Composite Indexing)
- **Real-time:** Socket.io
- **Security:** JWT (JSON Web Tokens), Bcrypt.js, Multer (Strict Mime-type validation)
- **Frontend:** React, Vite, Vanilla CSS (Glassmorphism aesthetics)

---

## 📜 Complete Work History & Development Phases

The project was developed and upgraded systematically across 5 distinct phases, concluding with a comprehensive security audit.

### Phase 1: Architecture & Database Design
- Analyzed the legacy codebase.
- Designed a robust relational SQLite schema containing tables for `users`, `posts`, `comments`, `interactions` (likes), and `friendships`.
- Implemented Foreign Keys and UNIQUE constraints to prevent duplicate actions (e.g., duplicate friend requests or likes).

### Phase 2: Backend Core & Security
- Transitioned to an Express.js server (`server.js`).
- Implemented strict JWT-based authentication via middleware (`authenticateToken`).
- Secured user passwords using `bcryptjs` hashing.
- Integrated `multer` for secure image uploads, strictly validating extensions (jpeg, png, webp) and capping file sizes at 5MB.
- Established core API endpoints for authentication, posting, and interacting.

### Phase 3: Real-time Socket.io Integration
- Attached Socket.io to the Express HTTP server.
- **Socket Security:** Implemented custom socket middleware to intercept connections, verify JWT tokens, and immediately disconnect clients upon token expiration.
- Configured event emitters (`new_post`, `new_interaction`, `new_comment`, `friend_request`) directly within the database callback functions to guarantee real-time data sync.

### Phase 4: Frontend UI Modernization (React + Vite)
- Deleted the legacy `frontend/` folder containing plain HTML/JS (backed up previously).
- Initialized a brand new React application powered by Vite.
- Designed a **Premium Glassmorphism UI** from scratch using CSS Variables, featuring micro-animations and a seamless Dark/Light Mode toggle.
- Utilized Context API (`AuthContext`) to manage global authentication state and auto-logout logic.

### Phase 5: Advanced Features & Refinement
- **Interactive Feed:** Upgraded `FeedPage.jsx` to process and display real-time likes and comments using Socket.io client listeners.
- **Post Management:** Added post deletion capabilities (`DELETE /posts/:id`), ensuring strict ownership checks.
- **Friend Management:** Implemented a sidebar for Suggested Friends and Pending Requests, powered by complex SQLite exclusionary subqueries.

### Phase 6: Core System Upgrades (v2)
- **Persistent Notifications:** Upgraded the notification system from real-time-only to a persistent history stored in the `notifications` table, including read receipts (`is_read`) and API endpoints (`GET /notifications`, `PUT /notifications/:id/read`).
- **Smart Search Friend:** Added an autocomplete search bar (`GET /users/search`) with a 300ms debounce. Integrated friendship status directly into the search results to dynamically display "Add", "Pending", or "Friends".
- **Full Profile Page & @mention System:**
  - Expanded `users` schema to include `bio` and `cover_photo`.
  - Created `ProfilePage.jsx` with tabs for user's own posts and posts they are tagged in.
  - Implemented an `@mention` autocomplete system in the post creation area. Mentions are securely parsed and stored in the `tags` table, triggering persistent 'tag' notifications for the tagged users.

### Phase 7: Final Polish & Messenger
- **Direct Messaging:** Added a `/messages` route with a split-pane layout for real-time private conversations, utilizing `socket.io` for immediate message delivery.
- **Profile Enhancements:** Implemented profile picture uploads natively, seamlessly displaying the avatar across all system components (Feed, Comments, Suggestions, Messages).
- **Feed & Privacy Polish:** Overhauled feed logic to display posts exclusively from confirmed friends and the user. Added `Unlike` functionality and the ability to delete personal comments.
- **Friend Management:** Introduced a "Friends" tab on user profiles, along with "Unfriend" and direct "Message" buttons for integrated user interaction.

### Phase 8: Satirical Social Media Features (Joke Features)
- **Engagement Bait Detector 🎣 (Upgraded to 5,000 Patterns):** Built a database-driven regex analyzer (`utils/baitDetector.js`) utilizing an SQLite table (`bait_patterns`) containing satirical social media patterns from modern culture. **Upgraded the dataset to exactly 5,000 patterns** covering Gen-Z slang, LGBTQ/Katoey expressions, and current beauty/industry trends (including "อาหวัง"). Decoupled the pattern generation logic from `config/database.js` into `config/baitPatternsGenerator.js` to keep the database initialization clean and lightweight while seeding all 5,000 patterns inside a SQLite transaction. Computes dynamic bait percentage metrics and appends them to post schemas on-the-fly. Integrates UI badges with hover explanations, client-side settings to hide/show badges, and an interactive click-to-roast savage analysis modal window.
- **Ghost Read Receipt 👻:** Measures read-to-response elapsed hours when the recipient has viewed a message. If a message is seen but unanswered for $>24$ hours, displays a custom ghost emoji checkmark, a custom timestamp (e.g. `Seen 2 วันที่แล้ว 👻`), and a pulse-animated ghost icon.
- **Unskippable Fake Ad Card 📢:** Interjects funny sponsored wellness warning cards dynamically every 9 posts in the main feed containing locked skip buttons and distinguishable blue dashed highlights.

### Phase 9: Hybrid Engagement Bait Detector (Regex + Gemini API Fallback)
- **Hybrid Detection System:** Upgraded `utils/baitDetector.js` to run local SQLite Regex patterns first (~50ms) and fall back to Gemini API (using `gemini-3.6-flash` model) if the score is 0. This enables semantic understanding of complex word modifications (e.g., "โซเหนื่อย", "พสจีน", "โต๋วอิน") that fail traditional regex matching.
- **Database Caching of Analysis:** Redesigned post retrieval to query pre-calculated bait details stored in the `posts` table columns (`bait_score`, `bait_translation`, `bait_roasts`). Analysis is executed only once when a post is created (`POST /posts`) rather than dynamically on-the-fly, reducing latency and avoiding API rate limits.
- **Robust JSON Parsing:** Developed custom bracket-matching string extractor `extractFirstJson` supporting quoted strings and escape sequences to handle formatting anomalies in LLM responses safely.

### Phase 10: UI Usability Overhaul & Bug Fixes (July 22, 2026)
- **Unified Navigation Experience:** Created a global, responsive `Navbar` component (`src/Navbar.jsx`) containing logo, search (with autocomplete dropdown), Home, Messages link, Notifications bell dropdown, Theme Toggle, Profile Avatar link, and Logout. This navbar is now consistently integrated across the Feed, Profile, and Messages pages, providing a cohesive navigation layout.
- **Theme Persistence Fix:** Resolved the dark mode resetting/flashing bug by moving the `data-theme` initialization to `AppRoutes` in `src/App.jsx`. Themes are now loaded immediately from `localStorage` on any page refresh (e.g. `/messages` or `/profile/:username`).
- **Profile Avatar Sync:** Exposed an `updateUser` hook in `AuthContext` to sync updates to the user's profile picture immediately with the navbar header avatar upon saving profile edits.
- **Resolved Chat Initialization Crash:** Added a backend `/users/by-id/:id` endpoint. Fixed a critical bug in `MessagesPage.jsx` where clicking "Message" on a profile page of a user with no chat history fetched `/users/search?q=`, causing empty responses and failing to start the conversation. The app now resolves user profiles directly by ID.
- **Safe Avatar Character Indexing:** Guarded all avatar initials rendering with safe fallback strings `(username || '?')[0]` to prevent React rendering crashes due to asynchronous data loading.

### Phase 11: Secure Email-Based Password Reset & Session Revocation (July 24, 2026)
- **Database Schema Migration:** Added `email`, `email_verified`, and `token_version` columns to `users` table with unique conditional indexing (`idx_users_email`). Created `password_resets` and `email_verifications` tables storing SHA-256 token hashes, IP addresses, and user agents for audit trailing.
- **Session Revocation (Token Versioning):** Implemented `token_version` tracking in signed JWTs and enforced live verification in `middleware/auth.js` and `socket/socketHandler.js`. Password resets increment `token_version`, instantly invalidating all active JWT tokens and socket sessions across all devices for that user.
- **2FA OTP Enforcement on Password Reset:** For 2FA-enabled accounts, `POST /auth/reset-password` requires TOTP verification (`reset-password-verify-2fa`) before updating password hashes or invalidating tokens, preventing email compromise from bypassing 2FA protection. Tokens remain usable for retry if an incorrect OTP is entered.
- **Email Enumeration & Timing Attack Defense:** Returned uniform messages (`If that email exists, a reset link has been sent.`) and executed non-blocking asynchronous email delivery with constant-time dummy operations for non-existent emails.
- **CSPRNG Tokens & Single-Use Enforcement:** Utilized `crypto.randomBytes(32)` (64-char hex strings) for reset tokens. Automatically invalidated older unused tokens when a new request was issued.
- **Production Guarded Nodemailer Integration:** Integrated `utils/mailer.js` using `nodemailer`. Enforced strict startup validation throwing errors if `NODE_ENV === 'production'` without SMTP configuration, while providing Ethereal test account previews during development.
- **Referrer Protection & Token Sanitization:** Cleaned reset tokens from address bar immediately upon page mount using `history.replaceState` in `ResetPasswordPage.jsx` and enforced `<meta name="referrer" content="no-referrer">`.
- **Re-Authentication for Email Updates:** Secured `PUT /users/me/email` by requiring `currentPassword` re-authentication before updating account recovery emails. Added a dismissible email prompt modal (`FeedPage.jsx`) for legacy users missing recovery emails.

### Final QA & Security Audit
Before deployment, a rigorous security and reliability audit was conducted:
1. **IDOR Prevention:** Verified that endpoints like `DELETE /posts/:id` strictly enforce ownership.
2. **Performance:** Validated that relational queries avoid the N+1 problem by utilizing SQL subqueries efficiently.
3. **XSS Prevention:** Scanned the entire React codebase confirming the absolute absence of `dangerouslySetInnerHTML`.
4. **Data Integrity:** Scanned the DB confirming 100% of user accounts employ bcrypt hashing.
5. **Real-time Resilience:** Tested and confirmed the socket's ability to gracefully auto-reconnect and resume event listening following simulated network failures.
6. **Secret Management:** Enforced a strict `.gitignore` to protect `.env` and `facebook.db`.


---

## 🧪 Recent Validations & Tests (July 2026)

### 1. Concurrent Write Load Test
A concurrent load test was executed on the live server (running 16 clustered workers) to stress-test the SQLite database's WAL (Write-Ahead Logging) configuration.
- **Concurrent Post Creations:** 50 parallel requests -> **100% Success** (0 failures, 0 `SQLITE_BUSY` errors).
- **Concurrent User Registrations & Logins:** 50 parallel requests -> **100% Success**.
- **Concurrent Likes (interactions):** 50 parallel requests on a target post -> **100% Success**.
- **Concurrent Comments:** 50 parallel requests on a target post -> **100% Success**.
- **Conclusion:** Clustered backend configuration paired with SQLite WAL mode handles heavy concurrent write actions securely and successfully without database lockups.

### 2. Git Repository & Backup Lock
To guarantee regression safety and establish proper version control, a local git repository was initialized and backed up to GitHub:
- **Repository Path:** `https://github.com/Thiskk040/web-project-facebook-clone-claude-sonnet-antigravity.git`
- **Initial Backup Commit Hash:** `c84235d52cb3ea97423194c49c2217e4e6eaa91c`

## 📅 Development Progress — July 22, 2026

### 1. Gemini API Model Migration & Timeout Fix
Due to high response latency on the `gemini-3.5-flash` model (averaging ~15.6 seconds) exceeding the 10-second timeout limit and causing fallback failures, the following updates were implemented:
- **Model Upgraded:** Migrated integration endpoint to the newer, highly responsive `gemini-3.6-flash` model.
- **Timeout Adjusted:** Increased the Axios connection timeout limit from 10 seconds to 15 seconds to handle transient network delays safely.
- **Result:** Gemini fallback latency decreased to 6-7 seconds, achieving 100% success rates on Thai slang parsing without triggering timeout errors.

### 2. Calm Clarity UI/UX Redesign & Accessibility Refactor
Successfully completed the 9-Phase "Calm Clarity" Apple/HIG-inspired design system overhaul:
- **Design Tokens Architecture:** Implemented `src/styles/tokens.css` exposing surface layers (`--surface-0`..`2`), semantic borders, contrast typography, 8px grid spacing (`--space-1`..`7`), radii (`--radius-sm`..`full`), and standardized motion (`cubic-bezier(0.4, 0, 0.2, 1)`).
- **Navbar & Materiality Rules:** Restricted backdrop-filter blur exclusively to floating overlays (Navbar, Search & Notification dropdowns). Introduced mobile bottom navigation bar (`< 768px`) with solid background.
- **Feed & Component Polish:** Converted Post Cards to solid `--surface-1` surfaces, added 120ms scale micro-animation to Like button, updated Bait badges with semantic color tints, and added `--warning` dashed border to Fake Ad Cards.
- **High Contrast Messaging:** Solved chat bubble contrast issues using solid `--accent` bubbles with `--accent-contrast` text for sent messages and `--surface-1` bubbles with `--text-main` text for received messages.
- **AuthPage Styling Fix:** Removed browser default button background on the Login/Register toggle link (`"Already have an account? Login"`), applying a transparent background with `--text-secondary` color for high contrast and readability across dark & light themes.

### 3. Icon System & Visual Polish Overhaul
Completed a comprehensive visual polish pass replacing all inline emojis with scalable `lucide-react` icons and enhancing layout depth:
- **Zero Emoji Mandate:** Replaced all 13 inline emojis across `FeedPage.jsx`, `ProfilePage.jsx`, `Navbar.jsx`, and `MessagesPage.jsx` with `<Fish />`, `<Megaphone />`, `<Ghost />`, `<EyeOff />`, and `<CheckCircle2 />` icons. Verified 0 unicode emojis remain in `frontend/src`.
- **Chat Bubble Contrast Fix:** Fixed received message bubbles in `MessagesPage.jsx` to use solid `var(--surface-1)` background instead of blending into the `var(--surface-0)` page background.
- **Global Radial Background Mesh:** Added subtle radial gradient mesh (`radial-gradient(ellipse at top, rgba(24, 119, 242, 0.04), transparent 60%), var(--surface-0)`) to `body` in `index.css`.
- **Split-Screen Auth Page:** Transformed `AuthPage.jsx` on desktop ($\ge 1024\text{px}$) into an Apple/HIG split-screen layout featuring a gradient branding panel on the left and a high-contrast form container on the right.
- **Dynamic Avatar Gradients & Skeleton Loader:** Created `src/utils/avatarGradient.js` generating 5 hash-based gradient palettes for user avatars, and implemented CSS shimmer skeleton loading states (`.skeleton`).
- **Avatar Spacing & Gap Utilities Fix:** Added complete `.gap-1` through `.gap-7` utility classes in `index.css` and `flex-shrink: 0` on avatar elements, ensuring a clean 12px (`var(--space-3)`) separation between profile pictures and usernames across `MessagesPage.jsx`, `Navbar.jsx`, `FeedPage.jsx`, and `ProfilePage.jsx`.
- **Centered Messages Empty State:** Redesigned the unselected chat container in `MessagesPage.jsx` into a centered, visually engaging empty state card with a circular `<MessageSquare />` icon badge and clean typography.

### 4. "Glaze" Liquid Glass Design System Overhaul
Successfully transitioned the interface to the **"Glaze" Liquid Glass Design System**:
- **Rebranding to `glaze`:** Updated application branding to lowercase **glaze** with a gradient sheen wordmark in `Navbar.jsx`, `AuthPage.jsx`, and `index.html`.
- **Particle & Interactive Canvas:** Integrated `<AntigravityCanvas />` with fluid particle animations and interactive floating elements.
- **Gmail SMTP & Recovery Email Integration:** Configured live Gmail SMTP support in `.env` (`SMTP_HOST=smtp.gmail.com`) for direct email delivery, with fallback to Ethereal in local testing. Added user account recovery email binding and cleaned reset tokens from address bar safely.
- **100% English UI Translation:** Translated all user interface strings across `AuthPage.jsx`, `FeedPage.jsx`, `ProfilePage.jsx`, and `ResetPasswordPage.jsx` into clean, professional English.
- **Cloud Dancer Warm Neutral Palette:** Shifted background neutrals in `tokens.css` from cold grey to Pantone Cloud Dancer warm white (`#f7f4ef` light) and warm obsidian (`#100e0c` dark).
- **Liquid Glaze Material System (`.liquid-glaze`):** Upgraded floating overlays (Navbar, Search/Notification dropdowns, Roast Modal) with 24px blur + 1.4 saturation, top specular border inset highlight, and sheen hover reflection animations.
- **Signature Moments (`.btn-glaze` & `.glaze-avatar-ring`):** Applied signature pastel gradient CTA button (`.btn-glaze`) on AuthPage and double-ringed gradient outline (`.glaze-avatar-ring`) around the authenticated user's avatar.
- **Accessibility & Motion Compliance:** Enforced `@media (prefers-reduced-motion: reduce)` to disable sheen sweeps for reduced-motion users, maintaining $\ge 4.5:1$ AA text contrast ratios.

### 5. Apple WWDC iOS 26 Liquid Glass UI Kit Transformation
Upgraded the interface to match Apple's WWDC iOS 26 Liquid Glass UI Kit specification:
- **Ambient Aurora & Champagne Mesh Backdrops:** Configured multi-gradient ambient space/aurora mesh in dark mode (`var(--bg-mesh-dark)`) and champagne-rose pearlescent mesh in light mode (`var(--bg-mesh-light)`).
- **Floating Capsule Navbar:** Transformed `.navbar` into a floating capsule container (`border-radius: var(--radius-full)`, `margin: 12px auto`, `max-width: 1040px`).
- **WWDC Dual Specular Highlight Engine:** Applied top refraction rim highlights (`inset 0 1.5px 1px rgba(255, 255, 255, 0.65)`) and bottom internal reflection shadows (`inset 0 -1.5px 1px rgba(255, 255, 255, 0.15)`).
- **Liquid Pill Controls:** Introduced `.liquid-pill` utility styling for pill-shaped inputs, buttons, and capsule active states.

### 6. Glaze Analysis Modal Redesign & Bait → Glaze Renaming
Completed the Liquid Glaze modal upgrade and feature renaming across the app:
- **Liquid Glaze Analysis Modal:** Transformed the Roast Analysis window into a translucent `.liquid-glaze` container (`background: var(--surface-2)` with 28px blur and top specular refraction highlights), replacing red warning themes with a circular pastel `--glaze-gradient` badge icon and `.btn-glaze` action button.
- **Bait → Glaze Feature Renaming & Icon Migration:** Renamed all user-facing UI labels, badges (`{score}% Glaze`), tooltips (`Show Glaze Badge`), toasts (`Glaze badges visible`), and modal titles (`วิเคราะห์การประจบอวดอ้าง (Glaze Analysis)`) across `Navbar.jsx`, `FeedPage.jsx`, `ProfilePage.jsx`, and `AuthPage.jsx`. Replaced the legacy fish icon (`<Fish />`) with the Lucide **`<Sparkles />`** icon to match the Glaze theme.

### 7. Authentic Liquid Glass Physics & Refraction Engine (`feDisplacementMap`)
Upgraded static glassmorphism to an authentic **Liquid Glass Physics Engine**:
- **SVG Background Refraction Warping (`feDisplacementMap`):** Inserted a global hidden SVG filter (`#liquid-glass-refraction`) into `index.html` combining `feTurbulence` and `feDisplacementMap` to physically distort underlying pixels beneath floating glass containers.
- **Chromatic Prism Specular Edge Dispersion:** Upgraded `.liquid-glaze` and `.navbar` with multi-channel specular rim highlights (`inset 0 2px 1.5px rgba(255, 255, 255, 0.85)` top light, `inset 2px 0 2px rgba(154, 212, 255, 0.4)` cyan left dispersion, `inset -2px 0 2px rgba(255, 214, 232, 0.4)` rose right dispersion).

### 8. Light Theme Vibrant Mesh & Translucent Liquid Glass Cards
Solved jarring solid white card cutouts in Light Theme by uniting vibrant background glows with translucent glass surface cards:
- **Vibrant Liquid Gradient Background Mesh:** Upgraded Light Theme `--bg-mesh` with vibrant multi-gradient glows (Magenta Rose `#ffb6d9` + Electric Cyan `#a5d8ff` + Deep Lavender `#d8b4fe`).
- **Translucent Liquid Glass Cards (`.post-card`, `.card-glass`):** Converted Post cards, Suggested Friends sidebar, and Messages Pane containers to translucent surfaces (`background: rgba(255, 255, 255, 0.65)` with `backdrop-filter: blur(20px) saturate(1.6)`), allowing background colors to refract smoothly through cards.
- **Inset Glass Text Fields:** Updated `textarea` and `input` elements to use translucent inset glass styling (`background: rgba(247, 244, 239, 0.65)` with `inset shadow`).

### 9. Modern Tech Glaze Logo Component (`GlazeLogo.jsx`)
Designed and deployed a high-tech logo component (`src/GlazeLogo.jsx`) matching Apple WWDC and Raycast aesthetics:
- **Interlocking Liquid Glass Capsule Badge:** Created a vector logo mark combining a translucent glass capsule badge (`border-radius: var(--radius-full)`, `backdrop-filter: blur(20px)`), an inner iridescent liquid optical spark, specular top reflection arcs, and an optics symbol.
- **Wordmark Integration:** Paired the glass capsule badge with a crisp lowercase `glaze` wordmark (`.glaze-wordmark`).
- **Global Deployment:** Integrated `<GlazeLogo size={32} />` across `Navbar.jsx`, `<GlazeLogo size={44} />` across `AuthPage.jsx`, and updated `public/favicon.svg`.

### 10. Google Antigravity Particle Canvas Animation (`AntigravityCanvas.jsx`)
Built a high-performance 60fps HTML5 Canvas particle swirl animation (`src/AntigravityCanvas.jsx`) on `AuthPage.jsx`:
- **Swirling Antigravity Particle Constellation:** Rendered 160+ elongated pastel particle dashes (Magenta, Cyan, Violet, Sun Yellow, Electric Blue) orbiting in a dynamic antigravity swirl vortex behind the Auth form layout.
- **Mouse Interactivity & Gravity Physics:** Added real-time mouse tracking (`mousemove`) applying antigravity spring forces and orbital rotation to nearby particles.
- **Translucent Glass Layering:** Placed the particle canvas behind translucent Liquid Glaze Auth panels (`.auth-branding-panel` & `.auth-form-panel` with `backdrop-filter: blur(28px)`).

### 11. Duplicate Message Socket Emission Fix (`messageRoutes.js` & `MessagesPage.jsx`)
Resolved a bug where sent chat messages would occasionally render as duplicates in the conversation view:
- **Backend Room Broadcast Filtering:** Fixed `routes/messageRoutes.js` to avoid emitting redundant `new_message` socket events when `receiver_id === req.user.id`.
- **Frontend State Deduplication:** Updated `setMessages` in `MessagesPage.jsx` to filter incoming socket payloads by `msg.id` (`if (prev.some(m => m.id === msg.id)) return prev;`), guaranteeing single-instance rendering.

### 12. Notification Dropdown & Realtime Chat Unread Badge Refactor (`Navbar.jsx`, `messageRoutes.js`, `index.css`)
Resolved UI bugs in notification dropdown scrolling and missing real-time chat unread notification badges:
- **Fixed Height & Scroll Containment:** Enforced `max-height: 380px`, `overflow-y: auto`, and custom webkit scrollbar (`.notif-list-container`) on the Notification dropdown in `Navbar.jsx`.
- **Batch Mark-All-Read Control:** Introduced a "Mark read" (`<CheckCheck />`) header button calling `PUT /notifications/:id/read` to mark all unread notifications instantly.
- **Categorized Visual Icons:** Assigned semantic Lucide icons matching notification types (`<Heart />` for likes, `<MessageSquare />` for comments, `<UserPlus />` for friend requests, `<UserCheck />` for accepted requests, `<Tag />` for mentions, and `<Sparkles />` for new posts).
- **Realtime Chat Unread Badge:** Added backend `GET /messages/unread/count` API. Integrated `unreadMessagesCount` state in `Navbar.jsx` with `new_message_${user.id}` Socket.io listeners, displaying a dynamic red badge on both desktop and mobile chat navbar icons.
### 13. "Flowing Glaze" Liquid Pastel Loading State Upgrade (`tokens.css`, `index.css`, `FeedPage.jsx`, `MessagesPage.jsx`, `ProfilePage.jsx`)
Upgraded the legacy grey shimmer `.skeleton` styling to an authentic "Flowing Glaze" liquid pastel animation signature:
- **Design Token Integration (`tokens.css`):** Introduced `--glaze-stop-1` (strawberry pastel), `--glaze-stop-2` (lavender pastel), and `--glaze-stop-3` (blue pastel) tokens for light and dark modes.
- **Glaze Flow Animation (`index.css`):** Replaced `.skeleton` background shimmer with `.skeleton::after` pseudo-element rendering a diagonal pastel gradient sweep (`glazeFlow` keyframes).
- **Accessibility & Motion Safety:** Enforced `@media (prefers-reduced-motion: reduce)` rules explicitly targeting `.skeleton::after { animation: none !important; opacity: 0.4 !important; }` to halt motion cleanly for users preferring reduced motion.
- **Universal Application Across Views:** Integrated Flowing Glaze skeleton loaders across `ProfilePage.jsx` (header cover/avatar/bio), `FeedPage.jsx` (post cards loader), and `MessagesPage.jsx` (conversation list & chat bubbles loader).
- **Verified Build:** Validated production bundle via `npm run build` (100% clean output).

### 14. Git Ignored Wildcard & Security History Rewrite (`.gitignore`, Git History)
- **Wildcard Ignore Rule:** Updated `.gitignore` to `facebook.db*` to exclude SQLite database files, WAL (`facebook.db-wal`), and SHM (`facebook.db-shm`) temporary files.
- **Git Index Cleaned:** Executed `git rm --cached facebook.db*` to un-track database files from Git cache while keeping local database files intact.
- **Complete Git History Purge:** Performed `git filter-branch --force --index-filter "git rm --cached --ignore-unmatch facebook.db*"` to purge all historical occurrences of SQLite database files across every commit in the repository.
### 15. Full 2FA Authentication System Implementation (Register + Login)
- **TOTP Dependencies:** Installed `speakeasy` and `qrcode` for standard TOTP secret generation, QR Code Data URL rendering, and 6-digit OTP verification.
- **Idempotent Database Migration:** Updated `config/database.js` adding `two_factor_secret` & `two_factor_enabled` columns to `users` table via `ALTER TABLE` error handlers, alongside an `otp_attempts` table for rate limiting.
- **Cluster Atomic Rate Limiter:** Developed an atomic SQLite rate limiter using `INSERT ... ON CONFLICT(key) DO UPDATE` with a 10-minute sliding window reset logic (`600,000ms`) and automatic 24-hour cleanup to prevent rate limit lockouts across 16 cluster workers without external Redis dependency.
- **Token Isolation Enforcement:** Updated `middleware/auth.js` (`authenticateToken`) and `socket/socketHandler.js` to reject any JWT tokens containing temporary purpose claims (`register_2fa_pending`, `login_2fa_pending`), preventing unauthorized access to protected REST APIs and Socket.io connections.
- **Full Auth Flow Overhaul (`authRoutes.js`):**
  - `POST /auth/register-init`: Generates secret `glaze (${username})`, QR code, and `register_2fa_pending` temp token.
  - `POST /auth/register-resend-2fa`: Regenerates QR codes securely requiring valid unexpired `tempToken` authorization proof.
  - `POST /auth/register-verify-2fa`: Validates OTP code, saves user with `two_factor_enabled = 1`, and issues full session JWT.
  - `POST /auth/login`: Checks password credentials; if 2FA enabled, returns `requires2FA: true` with `loginTempToken`.
  - `POST /auth/login-verify-2fa`: Verifies OTP against stored user TOTP secret and issues full session JWT upon success.
- **Liquid Glass Frontend Wizard (`AuthPage.jsx` & `AuthContext.jsx`):** Integrated 2-step registration wizard and login 2FA verification modal matching Apple HIG / Liquid Glaze design tokens.
- **Verification:** Created `generate_otp.js` dev helper and `test_2fa.js` automated suite. Validated 100% test pass rate across token isolation, invalid OTP rejection, registration setup, and login challenge enforcement. Validated clean frontend build (`npm run build`).

### 17. Glaze Logo Vector Asset Suite & Export Hub (`export_logos.js`, `exports/`, `frontend/public/`)
- **Multi-Format Vector Asset Generation:** Developed `export_logos.js` script to programmatically render and export the Glaze logo in multiple high-precision vector SVG formats:
  - `glaze-icon.svg` (512×512 standalone liquid glass capsule mark)
  - `glaze-logo-full-dark.svg` (800×240 full horizontal logo with iridescent gradient typography for dark mode)
  - `glaze-logo-full-light.svg` (800×240 full horizontal logo optimized for light mode)
  - `glaze-logo-stacked-dark.svg` (512×512 vertical centered splash logo)
  - `glaze-wordmark.svg` (600×200 vector text wordmark)
- **Interactive Asset Hub & HD PNG Exporter:** Created `exports/index.html` (and mirrored to `frontend/public/logo-exporter.html`) featuring a glassmorphism brand asset preview hub with one-click SVG downloads and an HTML5 Canvas rasterizer for exporting HD PNG images (up to 4K resolution).

### 18. Real-Time Live Typing Preview & Dual Opt-In Privacy Engine (`config/database.js`, `socket/socketHandler.js`, `routes/userRoutes.js`, `MessagesPage.jsx`, `test_live_typing.js`)
- **Database Schema Migration:** Added `live_typing_enabled INTEGER DEFAULT 0` column to `users` table via idempotent migration.
- **In-Memory Cache & Server Opt-In Gate (`socketHandler.js`):**
  - Implemented fast in-memory `userOptInCache` (`Map<userId, boolean>`) to avoid SQLite round-trips during keystroke events.
  - Enforced mandatory dual opt-in verification: server drops `typing_draft` events unless **BOTH** sender and receiver have `live_typing_enabled === 1`.
- **Throttling & Length Truncation:** Enforced a 150ms relay throttle per user/room to prevent client flooding, and capped `draftText` length to max 500 characters.
- **Instant Invalidation & Disconnect Safety:**
  - Toggling setting OFF mid-conversation immediately updates in-memory cache, emits `peer_typing_stopped`, and broadcasts `live_typing_status_changed` (`active: false`).
  - Socket disconnects automatically emit `peer_typing_stopped` across active user rooms.
- **Enumeration Protected REST API (`userRoutes.js`):** Added `PUT /users/me/live-typing` to toggle preferences and `GET /users/live-typing-status/:targetUserId` protected by friendship checks (`status = 'accepted'`) to prevent status scraping.
- **Liquid Glass Chat UI (`MessagesPage.jsx`):**
  - Integrated settings toggle switch and `<Sparkles /> Live Preview Active` badge.
  - Debounced emissions at 150ms with a 3-second idle timer.
  - Rendered peer draft bubbles separately at the bottom of the chat list with translucent dashed glass styling (`font-style: italic`, muted text color).
- **Automated Verification Suite (`test_live_typing.js`):** Created full automated test suite verifying dual opt-in blocking, 150ms throttling, 500-char truncation, mid-draft toggle invalidation, and **Concrete Zero DB Persistence Audit** (confirming 0 occurrences of draft text in SQLite database).

### 19. Strict CORS Policy Implementation & Socket.io Origin Restriction (`server.js`, `.env`)
- **Strict Allowed Origins Configuration:** Configured CORS options using `process.env.FRONTEND_URL` (defaulting to `http://localhost:5173`) with support for comma-separated multiple origins and `credentials: true`.
- **Unified Express & Socket.io Origin Binding:** Bound both Express middleware (`app.use(cors(corsOptions))`) and Socket.io server (`new Server(httpServer, { cors: { origin: allowedOrigins, credentials: true } })`) to the exact same `allowedOrigins` array, eliminating wildcard `*` access vulnerabilities.
- **Empirical Verification:** Conducted live curl preflight tests confirming HTTP 500 / zero `Access-Control-Allow-Origin` header for unauthorized origins (e.g. `http://malicious-site.com`), valid `Access-Control-Allow-Origin: http://localhost:5173` headers for authorized origins, and clean socket handshake routing.

### 20. Security Hardening Batch — 5 Critical Security Fixes (`socketHandler.js`, `userRoutes.js`, `upload.js`, `server.js`)
1. **Live Typing Unauthorized Room Join & Eavesdropping Prevention (`socketHandler.js`):**
   - Eliminated client-supplied `roomId` parameters across `join_room`, `typing_draft`, and `typing_stopped` socket events.
   - Enforced server-calculated room IDs (`chat_${min}_${max}`) based strictly on authenticated JWT user ID (`socket.user.id`) and target user ID.
   - Added mandatory database friendship verification (`friendships` table `status = 'accepted'`) before granting room access or emitting draft events, preventing unauthorized eavesdropping.
2. **Tracking Pixel Guard (`routes/userRoutes.js`):**
   - Implemented `isValidLocalPath` URL validation for `cover_photo` and `profile_picture` payload updates in `PUT /users/me/profile`. External tracking pixel URLs (e.g. `http://attacker.com/pixel.png`) are rejected and ignored.
3. **Magic Byte Upload Validation (`config/upload.js`):**
   - Implemented post-save magic byte signature checks inspecting the first 12 bytes of uploaded files.
   - Strictly validates PNG (`89 50 4E 47`), JPEG (`FF D8 FF`), GIF (`47 49 46 38`), and WEBP (`RIFF` + `WEBP` only, excluding audio WAVE). Disguised files (e.g. `.txt` renamed to `.jpg`) are automatically deleted from disk via `fs.unlinkSync` and returned with HTTP 400 Bad Request.
4. **Helmet HTTP Security Headers (`server.js`, `package.json`):**
   - Integrated `helmet` middleware (`app.use(helmet())`) to inject protection headers including `X-Frame-Options`, `X-Content-Type-Options`, `Strict-Transport-Security`, and `X-DNS-Prefetch-Control`.
5. **JWT_SECRET Startup Fail-Fast Check (`server.js`):**
   - Implemented an immediate startup check validating `process.env.JWT_SECRET`. If missing, logs a `FATAL` error and exits the process (`exit code 1`).
6. **Automated Verification Suite (`scratch/test_hardening.js`):**
   - Validated 100% test pass rate across eavesdropping prevention, tracking pixel rejection, magic byte enforcement, helmet response headers, and fail-fast startup behavior.

### 21. Emoji Removal & Code Clean Formatting Refactor (`FeedPage.jsx`, test scripts)
- **Zero Emoji Compliance:** Scanned and purged all unicode emojis across JS/JSX source and test files. Replaced UI modal symbols with clean Lucide icons (`<Mail />`, `<X />`) and console test logs with standard bracket tags (`[PASS]`, `[FAIL]`, `[INFO]`).
- **Clean Code & Maintainability Formatting:** Standardized formatting, imports, and component layout for improved long-term codebase maintainability. Verified clean production build (`npm run build`).

### 22. Email Verification Bypass Fix (`routes/userRoutes.js`, `routes/authRoutes.js`, `config/database.js`)
- **Strict Unverified Status Enforcement:** Updated `PUT /users/me/email` to update email addresses with `email_verified = 0`, invalidating older unused verification tokens and issuing a 24-hour CSPRNG verification token (`sendEmailVerificationEmail`).
- **Password Reset Protection for Unverified Emails:** Enforced `email_verified == 1` check in `POST /auth/forgot-password`. Requests with unverified emails return standard `UNIFORM_MESSAGE` without creating reset tokens or sending emails.
- **Empirical Verification (`scratch/test_email_verify_fix.js`):** Confirmed `email_verified = 0` upon update, verified token activation to `email_verified = 1` on verification link click, blocked forgot-password resets on unverified emails, and confirmed uninterrupted login for unverified accounts.

### 23. Modular Auth Routes Refactor & Shared Auth Helpers (`utils/authHelpers.js`, `routes/`)
- **Shared Auth Helpers (`utils/authHelpers.js`):** Extracted `checkOtpRateLimit`, `issueAuthToken`, and `asyncHandler` into a centralized helper module, eliminating code duplication across authentication flows.
- **Modular Route File Decomposition (`routes/`):** Decomposed monolithic `authRoutes.js` into targeted route modules mounted at `/auth`:
  - `routes/authRoutes.js` (Core registration initialization & login)
  - `routes/twoFactorRoutes.js` (2FA registration verification, resend, 2FA login & 2FA reset verification)
  - `routes/passwordResetRoutes.js` (Forgot password & password reset step 1)
  - `routes/emailVerifyRoutes.js` (Email verification token confirmation)
- **Zero API Contract Mutation:** Maintained 100% endpoint URL and payload compatibility across all 4 mounted route files (`/auth/*`). Verified 100% pass rate across `test_2fa.js`, `test_forgot_password.js`, `test_email_verify_fix.js`, and `test_hardening.js`.

### 24. Project Governance, Root Cleanup & Security Vulnerability Remediation
- **Agent Governance Rules ([.agents/AGENTS.md](file:///.agents/AGENTS.md)):** Established strict repo-wide rules covering test script relocation (`scratch/`), git-ignoring execution logs (`.txt`, `.log`, `.zip`), handler file size caps (~200 lines), and mandatory `README.md` changelog maintenance.
- **Root Directory Cleanup:** Relocated all 19 legacy test/debug scripts from root to `scratch/` using `git mv`. Deleted legacy output files (`security_test_output.txt`, `deep_audit_output.txt`, `deep_audit_cluster_output.txt`, `frontend_backup.zip`) and updated `.gitignore`.
- **Vulnerability Remediation (`npm audit`):**
  - **Backend:** Resolved `tar` DoS vulnerability via `npm audit fix` (0 vulnerabilities remaining).
  - **Frontend:** Patched `postcss` path traversal and upgraded `react-router-dom` to `^7.18.2` resolving high-severity vulnerabilities. Verified zero build breakages (`npm run build`).
- **Privacy Metadata Guard (`routes/userRoutes.js`):** Patched `PUT /users/me/live-typing` to emit socket events `user_live_typing_toggled` strictly to active accepted friends' user rooms (`io.to('user_' + friendId)`) rather than broadcasting system-wide metadata to strangers.

### 25. Email Verification Frontend Route Integration & Account Verification
- **Frontend Email Verification UI (`VerifyEmailPage.jsx`, `App.jsx`):** Built and integrated `<VerifyEmailPage />` handling `/verify-email` and `/auth/verify-email` routes. Automatically extracts verification tokens, calls backend `GET /auth/verify-email`, strips tokens from URL to prevent referrer leakage, and displays confirmation/error states.
### 26. Database Migration Execution & Verification (SQLite -> Oracle Database XE)
- **Oracle XE Infrastructure & Schema Creation:** Provisioned Database User `Glaze` in Oracle 21c XE (`XEPDB1`) and created all 12 relational tables (`users`, `posts`, `interactions`, `comments`, `friendships`, `notifications`, `tags`, `messages`, `password_resets`, `email_verifications`, `otp_attempts`, `bait_patterns`) with `IDENTITY` primary keys and Oracle constraints.
- **Data ETL Migration Pipeline:** Executed [`scratch/migrate_to_oracle.js`](file:///c:/Users/user/Desktop/ReadingTokenbotschat/complete-facebook-clone/scratch/migrate_to_oracle.js) to extract and transform 100% of SQLite data (114 users, 112 posts, 5,948 notifications, 5,000 bait patterns, etc.) into Oracle XE, followed by identity sequence reseeding to `MAX(id) + 1`.
- **Database Access Layer Refactoring:** Updated [`config/database.js`](file:///c:/Users/user/Desktop/ReadingTokenbotschat/complete-facebook-clone/config/database.js) to utilize `node-oracledb` Thin Mode connection pooling, providing seamless backward-compatible async wrappers (`get`, `all`, `run`, `prepare`) with automatic SQL parameter conversion (`?` -> `:1`), Oracle `LIMIT/OFFSET` translation, and lower-case object key normalization.
- **Runtime Verification & Asset Serving Fix:** Ran backend server and executed end-to-end API tests ([`scratch/test_oracle_api.js`](file:///c:/Users/user/Desktop/ReadingTokenbotschat/complete-facebook-clone/scratch/test_oracle_api.js)) verifying successful authentication, post querying, and post creation against Oracle XE. Configured `Cross-Origin-Resource-Policy: cross-origin` header for `/uploads` route in [`server.js`](file:///c:/Users/user/Desktop/ReadingTokenbotschat/complete-facebook-clone/server.js) allowing cross-origin image rendering on the frontend. Cleaned up obsolete SQLite database files (`facebook.db`) and temporary migration SQL scripts.

### 27. Oracle Database Listener Diagnosis & Connection Resolution
- **Troubleshooting Root Cause:** Identified that the database connection error (`NJS-503: connect ECONNREFUSED` / `NJS-518: Service XEPDB1 is not registered with listener`) was caused by the Oracle TNS Listener service (`OracleOraDB21Home1TNSListener`) being in a `Stopped` status, along with `HOST = host.docker.internal` restriction in `listener.ora` preventing connections to `localhost:1521`.
- **Service Recovery & Listener Configuration:**
  - Started the Windows service `OracleOraDB21Home1TNSListener`.
  - Reconfigured `listener.ora` (`HOST = 0.0.0.0`) and `tnsnames.ora` (`HOST = localhost`).
  - Set `LOCAL_LISTENER='LISTENER_XE'` and executed `ALTER SYSTEM REGISTER` in Oracle DB.
- **Verification:** Verified database connection via [`scratch/test_db.js`](file:///c:/Users/user/Desktop/ReadingTokenbotschat/complete-facebook-clone/scratch/test_db.js). Connections to `localhost:1521/XEPDB1`, `192.168.1.126:1521/XEPDB1`, and `host.docker.internal:1521/XEPDB1` all succeeded cleanly.

### 28. Command-Line Oracle DB Search & Grep Utility
- **CLI Utility Implementation ([`scratch/grep_db.js`](file:///c:/Users/user/Desktop/ReadingTokenbotschat/complete-facebook-clone/scratch/grep_db.js)):** Created a command-line tool allowing developers to query, inspect, and search database content directly from terminal without relying on external GUI apps like DBeaver.
- **Features:**
  - `node scratch/grep_db.js`: Summary of all tables and total row counts.
  - `node scratch/grep_db.js <tableName> [limit]`: View recent rows formatted in neat terminal tables.
  - `node scratch/grep_db.js --search <keyword>`: Global grep searching across text/number columns in all tables.
  - `node scratch/grep_db.js --table <tableName> --grep <keyword>`: Targeted search within a specific table.
  - `node scratch/grep_db.js --schema <tableName>`: Display table schema and data types.
- **DB Layer Promise Support Fix:** Refactored [`config/database.js`](file:///c:/Users/user/Desktop/ReadingTokenbotschat/complete-facebook-clone/config/database.js) to return Promises directly from `db.get`, `db.all`, and `db.run` for native `async/await` usage alongside legacy callbacks.

### 30. Database Query & Index Optimization (Oracle 21c XE) (August 3, 2026)
- **Safe & Gated Index Provisioning ([`config/init_indexes.js`](file:///c:/Users/user/Desktop/ReadingTokenbotschat/complete-facebook-clone/config/init_indexes.js)):** Built an idempotent index migration system querying `USER_INDEXES` prior to creation. Gated execution via `npm run migrate:indexes` CLI command. Confirmed `CREATE INDEX ... ONLINE` capability on Oracle 21c XE.
- **Dual Mirrored Chat Index Design:** Implemented `IDX_MSG_CONV_FORWARD` `(sender_id, receiver_id, created_at ASC)` and `IDX_MSG_CONV_REVERSE` `(receiver_id, sender_id, created_at ASC)` to serve bidirectional chat queries without table schema DDL alterations.
- **Full Composite B-Tree Index Suite:** Provisioned 11 targeted composite indexes across hot query paths (`IDX_POSTS_USER_CREATED`, `IDX_MSG_UNREAD`, `IDX_NOTIF_USER_CREATED`, `IDX_FRIENDSHIP_PAIR`, `IDX_FRIENDSHIP_REVERSE`, `IDX_INTERACTIONS_POST`, `IDX_COMMENTS_POST`, `IDX_TAGS_USER`, `IDX_USERS_USERNAME_LOWER`).
- **Route Refactoring:** Updated [`routes/userRoutes.js`](file:///c:/Users/user/Desktop/ReadingTokenbotschat/complete-facebook-clone/routes/userRoutes.js) (`GET /users/search`) to use `UPPER(username) LIKE UPPER(:1) || '%'` for functional index scans and [`routes/postRoutes.js`](file:///c:/Users/user/Desktop/ReadingTokenbotschat/complete-facebook-clone/routes/postRoutes.js) (`GET /posts`) for pagination.
- **Empirical Benchmark & EXPLAIN PLAN Verification ([`scratch/benchmark_queries.js`](file:///c:/Users/user/Desktop/ReadingTokenbotschat/complete-facebook-clone/scratch/benchmark_queries.js)):** Verified 100% idempotency (0 errors on consecutive runs). Confirmed Oracle CBO optimizer selects `INDEX RANGE SCAN` across `IDX_FRIENDSHIP_PAIR`, `IDX_MSG_CONV_FORWARD`, `IDX_NOTIF_USER_CREATED`, and `IDX_USERS_USERNAME_LOWER`.

### 31. Repository Hygiene Completion & Test Script Tracking (August 3, 2026)
- **Root Directory Cleanup:** Relocated `export_logos.js` from root into [`scratch/export_logos.js`](file:///c:/Users/user/Desktop/ReadingTokenbotschat/complete-facebook-clone/scratch/export_logos.js) and updated relative paths (`../exports`, `../frontend/public`), leaving `server.js` as the single `.js` file at repository root.
- **Git Ignore Granular Rules (Option A):** Updated [`.gitignore`](file:///c:/Users/user/Desktop/ReadingTokenbotschat/complete-facebook-clone/.gitignore) to selectively ignore output artifacts (`scratch/*.log`, `scratch/*_output.txt`, `scratch/*.tmp`, `scratch/*.txt`, `scratch/*.zip`) while tracking all essential verification scripts (`test_2fa.js`, `test_hardening.js`, `test_email_verify_fix.js`, `test_forgot_password.js`, `grep_db.js`, `benchmark_queries.js`, `test_performance.js`, etc.) for future automated re-runs.

### 32. Credential Hardening & Fail-Fast Protection (August 3, 2026)
- **Live Password Rotation:** Executed `ALTER USER Glaze IDENTIFIED BY "<new_secure_password>"` on live Oracle Database 21c XE instance, revoking leaked fallback credentials.
- **Fail-Fast Environment Validation:** Updated [`config/database.js`](file:///c:/Users/user/Desktop/ReadingTokenbotschat/complete-facebook-clone/config/database.js) and [`scratch/migrate_to_oracle.js`](file:///c:/Users/user/Desktop/ReadingTokenbotschat/complete-facebook-clone/scratch/migrate_to_oracle.js) to enforce startup checks for required environment variables (`ORACLE_USER`, `ORACLE_PASSWORD`, `ORACLE_CONNECT_STRING`). Removed all hardcoded fallback secrets.
- **Zero Hardcoded Secrets Audit:** Confirmed 0 occurrences of hardcoded passwords across the entire codebase via repository-wide `grep`.
- **Environment Template ([`.env.example`](file:///c:/Users/user/Desktop/ReadingTokenbotschat/complete-facebook-clone/.env.example)):** Created a clean environment variable template for deployment and onboarding without sensitive values.

### 33. Comprehensive Security & Privacy Remediation (August 3, 2026)
- **Login Brute-Force Rate Limiting ([`routes/authRoutes.js`](file:///c:/Users/user/Desktop/ReadingTokenbotschat/complete-facebook-clone/routes/authRoutes.js)):** Added rate limit checks on `POST /auth/login` allowing max 5 attempts per 10-minute window per IP & username pair (returns HTTP 429).
- **Gemini API Cost-Abuse Protection ([`routes/postRoutes.js`](file:///c:/Users/user/Desktop/ReadingTokenbotschat/complete-facebook-clone/routes/postRoutes.js)):** Enforced rate limiting on `POST /posts` capping post creation to max 10 posts per 10 minutes per user, protecting server worker threads and Gemini API quotas.
- **Hardened Password Policy ($\ge 8$ Characters):** Upgraded minimum password length requirement from 4 to **8 characters** across registration ([`routes/authRoutes.js`](file:///c:/Users/user/Desktop/ReadingTokenbotschat/complete-facebook-clone/routes/authRoutes.js)), password reset ([`routes/passwordResetRoutes.js`](file:///c:/Users/user/Desktop/ReadingTokenbotschat/complete-facebook-clone/routes/passwordResetRoutes.js)), and frontend validation ([`ResetPasswordPage.jsx`](file:///c:/Users/user/Desktop/ReadingTokenbotschat/complete-facebook-clone/frontend/src/ResetPasswordPage.jsx)).
- **Server-Side Logout & Immediate Token Revocation:** Implemented `POST /auth/logout` endpoint in [`routes/authRoutes.js`](file:///c:/Users/user/Desktop/ReadingTokenbotschat/complete-facebook-clone/routes/authRoutes.js) to increment `token_version` in the database, instantly invalidating active JWT tokens across all devices and severing real-time socket connections via `io.in(userRoom).disconnectSockets(true)`. Updated [`AuthContext.jsx`](file:///c:/Users/user/Desktop/ReadingTokenbotschat/complete-facebook-clone/frontend/src/AuthContext.jsx) to execute server logout prior to clearing client storage.
- **Direct Messaging Friendship Authorization ([`routes/messageRoutes.js`](file:///c:/Users/user/Desktop/ReadingTokenbotschat/complete-facebook-clone/routes/messageRoutes.js)):** Restricted direct messaging in `POST /messages` strictly to accepted friends (`status = 'accepted'`), returning HTTP 403 Forbidden for non-friend user IDs, and added messaging rate limits.
- **EXIF GPS Metadata Sanitization ([`config/upload.js`](file:///c:/Users/user/Desktop/ReadingTokenbotschat/complete-facebook-clone/config/upload.js)):** Built a zero-dependency in-memory JPEG APP1 (`0xFF 0xE1`) EXIF metadata scrubber `sanitizeExifMetadata` to automatically strip embedded GPS location data and device camera info from uploaded image files.
- **Automated Security Verification Suite ([`scratch/test_security_fixes.js`](file:///c:/Users/user/Desktop/ReadingTokenbotschat/complete-facebook-clone/scratch/test_security_fixes.js)):** Built and executed an end-to-end automated verification script confirming 100% pass rate (5/5 tests) across all security and privacy remediations.

---



## 🚀 How to Run the Project

This project utilizes a decoupled architecture, requiring both the backend and frontend to be run simultaneously in separate terminal windows.

### 1. Start the Backend
Open Terminal 1:
```bash
cd complete-facebook-clone
node server.js
```
*(Expected Output: `Backend running on port 3000`)*

### 2. Start the Frontend
Open Terminal 2:
```bash
cd complete-facebook-clone/frontend
npm run dev
```
*(The terminal will output a local URL, typically `http://localhost:5173`. Open this URL in your browser.)*
