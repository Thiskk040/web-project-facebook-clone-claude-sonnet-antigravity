<!-- 
[AI_AGENT_INSTRUCTION] 
CRITICAL: Any AI Agent accessing this repository MUST read this README.md file in its entirety to understand the project architecture, tech stack, security implementations, and historical context before making any modifications to the codebase. 
-->

# Complete Facebook Clone

**Last Updated (Timestamp):** 2026-07-07T15:06:00+07:00

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

### Final QA & Security Audit
Before deployment, a rigorous security and reliability audit was conducted:
1. **IDOR Prevention:** Verified that endpoints like `DELETE /posts/:id` strictly enforce ownership.
2. **Performance:** Validated that relational queries avoid the N+1 problem by utilizing SQL subqueries efficiently.
3. **XSS Prevention:** Scanned the entire React codebase confirming the absolute absence of `dangerouslySetInnerHTML`.
4. **Data Integrity:** Scanned the DB confirming 100% of user accounts employ bcrypt hashing.
5. **Real-time Resilience:** Tested and confirmed the socket's ability to gracefully auto-reconnect and resume event listening following simulated network failures.
6. **Secret Management:** Enforced a strict `.gitignore` to protect `.env` and `facebook.db`.

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
