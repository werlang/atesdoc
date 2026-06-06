---
name: suap-scraper-maintenance
description: Debug, maintain, and update the Playwright-based SUAP scraping system in api/helpers/scraper.js and configuration selectors in api/suap-config.js. Use when investigating scraping errors, fixing login hangs, adjusting selector/navigation timeouts, or parsing new academic data fields from SUAP pages.
---

# SUAP Scraper Maintenance

Use this skill when investigating or modifying the automated web scraping workflows that extract professor, semester, class, or lesson logs from the SUAP portal.

## Scope

- Applies to [api/helpers/scraper.js](file:///Users/pablowerlang/Documents/Workspaces/ifsul/atesdoc/api/helpers/scraper.js) (scraper engine).
- Applies to [api/suap-config.js](file:///Users/pablowerlang/Documents/Workspaces/ifsul/atesdoc/api/suap-config.js) (URL and selector templates).
- Applies to data collection models: [api/model/professor.js](file:///Users/pablowerlang/Documents/Workspaces/ifsul/atesdoc/api/model/professor.js) and [api/model/books.js](file:///Users/pablowerlang/Documents/Workspaces/ifsul/atesdoc/api/model/books.js).

## Core Rules

1. **Keep Selectors Isolated**: All CSS selector strings, target URLs, login field names, and evaluation functions must reside in [api/suap-config.js](file:///Users/pablowerlang/Documents/Workspaces/ifsul/atesdoc/api/suap-config.js). Never hardcode selectors directly in [api/helpers/scraper.js](file:///Users/pablowerlang/Documents/Workspaces/ifsul/atesdoc/api/helpers/scraper.js) or models.
2. **Prevent Blocking Hangs**: Every Playwright action that waits for navigation or elements **must** specify an explicit timeout (e.g. `timeout: 8000`). Never use default or infinite timeouts.
3. **Session Reconnection**: Navigations should check the current page URL and handle automatic login if redirected to `accounts/login/` or if elements indicating a logged-in state are missing.
4. **Clean Resource Management**: Always ensure the page and browser instances are closed or disconnected in case of failure to prevent browserless Chrome from running out of memory. Invoke `PlaywrightScraper.disconnect()` on critical errors.
5. **Serialize Functions for Page Context**: Since `PlaywrightScraper.evaluate()` runs in the browser environment, any data object containing function callbacks must be processed using the scraper's function serialization/deserialization helper.
6. **TDD & Regression Testing**: When fixing scraper hangs, parsing errors, or updating scraper logic, you **MUST** write regression or unit test cases first under `api/test/` to reproduce/assert the target behavior before modifying production files.

## Guardrails

- Do not attempt to run Playwright in headful mode within Docker containers.
- Do not store credentials in code; always pull them from environment variables (`process.env.SUAP_USERNAME`, `process.env.SUAP_PASSWORD`).
- Do not run scraper operations concurrently without passing them through the WebSocket task queue.
- **Testing Guardrail**: A task is only complete when all tests pass. Never declare a scraper bug fix or change complete without writing tests and running them with: `docker compose exec api npm test`.

## Review Checklist

- Are all new selectors and URLs registered in `api/suap-config.js`?
- Do all Playwright page wait methods have a safe timeout?
- Is there clean error wrapping with `CustomError`?
- Are resources disconnected during errors or shutdown?
- Does local testing pass without leaking tabs in Chrome?
- **Testing**: Have unit/regression tests been created/updated for the modified or new logic?
- **Execution**: Did you run `docker compose exec api npm test` and verify all tests passed successfully?

