# atesdoc - AI Coding Agent Instructions

This document provides definitive guidelines, architecture overview, and specific coding patterns for development on the **atesdoc** project. It is intended to ensure future AI coding agents and human developers make highly assertive contributions that maintain codebase consistency.

## Project Overview
**Atestado de Docência (atesdoc)** is a dockerized two-service application that scrapes professor activity logs and class data from SUAP (Sistema Unificado de Administração Pública) for IFSUL (Instituto Federal Sul-rio-grandense), compiling it into formal teaching certificates.

The user interface follows a modern 3-step wizard workflow:
1. **Professor Search**: Finds a professor by name, CPF, or SIAPE using real-time Puppeteer SUAP admin scraping.
2. **Semester & Diary Selection**: Lists semesters and allows checking/unchecking academic books/diaries via a reactive table.
3. **Document Generation**: Spawns concurrent scraper runs to fetch individual lesson logs (Aulas) and outputs a printable PDF.

---

## Directory Structure
- [api/](file:///Users/pablowerlang/Documents/Workspaces/ifsul/atesdoc/api/): Node.js backend WebSocket server, scraper engine, and document compiler.
  - [api/helpers/](file:///Users/pablowerlang/Documents/Workspaces/ifsul/atesdoc/api/helpers/): Utility files (Router, WSServer, Scraper, Queue, DocumentBuilder).
  - [api/model/](file:///Users/pablowerlang/Documents/Workspaces/ifsul/atesdoc/api/model/): Data models (Professor, Semester, Book, Report) holding entity and business logic.
  - [api/template/](file:///Users/pablowerlang/Documents/Workspaces/ifsul/atesdoc/api/template/): HTML/CSS and image assets for document generation.
- [web/](file:///Users/pablowerlang/Documents/Workspaces/ifsul/atesdoc/web/): Express.js frontend server delivering assets and SSR Mustache pages.
  - [web/src/js/components/](file:///Users/pablowerlang/Documents/Workspaces/ifsul/atesdoc/web/src/js/components/): Core reusable client-side UI components (Button, Form, Input, Modal, Select, Toast).
  - [web/src/js/modules/](file:///Users/pablowerlang/Documents/Workspaces/ifsul/atesdoc/web/src/js/modules/): Step-specific JS logic controllers.
  - [web/src/js/helpers/](file:///Users/pablowerlang/Documents/Workspaces/ifsul/atesdoc/web/src/js/helpers/): StateManager, WSClient, TemplateVar.
  - [web/src/less/](file:///Users/pablowerlang/Documents/Workspaces/ifsul/atesdoc/web/src/less/): LESS stylesheets and color tokens.

---

## Core Architecture & Patterns

### 1. WebSocket Communication Pattern (API Backend)
The API runs on port 8080. It handles incoming requests via WebSocket.
- Routes are registered in [api/app.js](file:///Users/pablowerlang/Documents/Workspaces/ifsul/atesdoc/api/app.js) using the `Route` helper class:
  ```javascript
  new Route('get_professors', async (payload, reply) => {
      const professors = await Professor.search(payload.query, reply);
      return { professors };
  });
  ```
- **The Queue System**: Under the hood, `Route` registers handlers on `WSServer` and routes incoming payloads into a static [Queue](file:///Users/pablowerlang/Documents/Workspaces/ifsul/atesdoc/api/helpers/queue.js) instance. This prevents overloading the SUAP website.
- **Client Response**: Responses are sent back to the client using a callback `reply(data)`. The route handler first responds with status `'in queue'` and position updates, followed by status `'processing'`, and finally the payload outcome.

### 2. Puppeteer Scraper Pattern (`SUAPScraper`)
All SUAP scraping actions are static methods in [api/helpers/scraper.js](file:///Users/pablowerlang/Documents/Workspaces/ifsul/atesdoc/api/helpers/scraper.js) using `puppeteer-core`.
- **Chrome Remote Connection**: Scraper connects to the external `browserless/chrome` container over Docker network alias `chrome` on port `CHROME_PORT` (default 3000) using:
  ```javascript
  puppeteer.connect({ browserWSEndpoint: `ws://chrome:${port}` })
  ```
- **Login Lifecycle**: The scraper tracks `logged` state. Navigations automatically check if `logged === false` and execute the login phase first. If redirect to the login page is detected during access, the scraper resets state and attempts to login again.
- **Resource Recovery**: On completion or failure, sessions are detached. All methods should clean up references to prevent page leaks via `SUAPScraper.disconnect()`.
- **Selector Selectors Configuration**: Keep all target URL endpoints, login forms, search criteria, and parsing methods separated in [api/suap-config.js](file:///Users/pablowerlang/Documents/Workspaces/ifsul/atesdoc/api/suap-config.js). Avoid hardcoding target selectors inside scrape methods.

### 3. Frontend Architecture
The frontend uses standard ES6 modules compiled with Webpack.
- **State Reactivity**: The page modules communicate and synchronize using the [StateManager](file:///Users/pablowerlang/Documents/Workspaces/ifsul/atesdoc/web/src/js/helpers/state.js). Modules listen to state changes:
  ```javascript
  state.onUpdate((newState) => {
      // conditionally re-render or activate steps
  });
  ```
- **Feature Modules**: Each wizard step is a separate module in `web/src/js/modules/` which receives the `(wsserver, state)` instance. Avoid cross-module direct invocation; communicate through `state` mutation.
- **Components**: The component classes (`Form`, `Input`, `Modal`, etc.) in `web/src/js/components/` encapsulate DOM structure and event handling. Use them instead of manual jQuery/ad-hoc vanilla DOM queries.

### 4. LESS / CSS Styling Guidelines
- **Strict Custom Property Rules**: **NEVER** use hardcoded hex values, colors, or direct rgb/rgba numbers. Every color token must reside in [web/src/less/common.less](file:///Users/pablowerlang/Documents/Workspaces/ifsul/atesdoc/web/src/less/common.less) and be accessed via `var(--color-*)`.
- **Color Manipulation**:
  - Muted/Opacity elements: Use standard CSS `rgb(from var(--color-name) r g b / opacity)` syntax.
  - Light/Dark blends: Use standard CSS `color-mix(in srgb, var(--color-name) percentage%, var(--color-white))` instead of adding standalone properties.
  - Skeleton Loading: Shimmers must use `rgb(from var(--color-text) r g b / 0.08)`.
- **Mobile-First Media Queries**:
  - Start with mobile-friendly layouts (320px+) as the base rules.
  - Progressive enhancement: Apply `@media @size-600` (600px+) and `@media (min-width: 900px)` (900px+) to build desktop layout variations.
  - **Co-location Rule**: Breakpoint selectors **must** be co-located directly inside the parent component LESS blocks (nesting), rather than clustered at the bottom of the style file.

---

## Technical Workflows

### Running in Development
For active coding, hot reload is supported:
1. Ensure the browserless chrome container is up:
   `docker run -d -p 3000:3000 browserless/chrome:latest`
2. Start the API server:
   `cd api && npm run development`
3. Start the Webpack dev server and frontend Express server:
   `cd web && npm run development`

### Deployment
To package and launch the services:
`docker compose up -d`

---

## Common Gotchas & Troubleshooting
- **Scraper Hanger**: If Puppeteer hangs, ensure there's a timeout fallback on `waitForSelector` or `goto` commands. Check browser connection status, make sure the `chrome` container is responsive.
- **Port Conflicts**: Ensure development Web server (port 3000) does not conflict with API port (8080) or Chrome connection port (3000). The default production web server is port 80.
- **WebSocket Reconnection**: If connection to the WebSocket server is dropped, the client-side `WSClient` handles automatic re-connection. Toast notifications will notify the user.
