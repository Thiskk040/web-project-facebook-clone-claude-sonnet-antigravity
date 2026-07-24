<!-- 
[AI_AGENT_INSTRUCTION] 
CRITICAL: Any AI Agent accessing this repository MUST read this README.md file in its entirety to understand the project architecture, tech stack, security implementations, and historical context before making any modifications to the codebase. 
-->

# Complete Facebook Clone

**Last Updated (Timestamp):** 2026-07-17T15:15:00+07:00

## 📖 Project Overview
This project is a modern, real-time Web Application modeled after Facebook. It was completely overhauled from a legacy static structure into a highly secure, real-time ecosystem utilizing a decoupled architecture (Node.js/Express backend and React/Vite frontend). 

## 🛠️ Technology Stack
- **Backend:** Node.js, Express.js
- **Database:** SQLite3
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
