---
name: api-websocket-routes
description: Add, refactor, or debug backend WebSocket routes, handlers, router, queue logic, and report PDF generation. Use when implementing new WS routes in api/app.js or updating the document generation helper in api/helpers/document-builder.js.
---

# API WebSocket Routes

Use this skill when adding or refactoring API communication routes, handling task queuing, or building generated PDF documents.

## Scope

- Applies to [api/app.js](file:///Users/pablowerlang/Documents/Workspaces/ifsul/atesdoc/api/app.js) (route definitions).
- Applies to route helpers: [api/helpers/router.js](file:///Users/pablowerlang/Documents/Workspaces/ifsul/atesdoc/api/helpers/router.js), [api/helpers/wsserver.js](file:///Users/pablowerlang/Documents/Workspaces/ifsul/atesdoc/api/helpers/wsserver.js), and [api/helpers/queue.js](file:///Users/pablowerlang/Documents/Workspaces/ifsul/atesdoc/api/helpers/queue.js).
- Applies to document compiler: [api/helpers/document-builder.js](file:///Users/pablowerlang/Documents/Workspaces/ifsul/atesdoc/api/helpers/document-builder.js) and templates in [api/template/](file:///Users/pablowerlang/Documents/Workspaces/ifsul/atesdoc/api/template/).

## Core Rules

1. **Use the Route Helper**: Never listen directly on the WebSocket server. Always register endpoints by constructing a `new Route(name, handler)` instance in [api/app.js](file:///Users/pablowerlang/Documents/Workspaces/ifsul/atesdoc/api/app.js).
2. **WebSocket Message Schema**: Messages must conform to the JSON contract:
   - Client sends: `{ id, method, payload }`
   - Server returns: `{ id, data }`
3. **Queue Awareness**: Every `Route` handler automatically runs inside the static task `Queue`. The queue handles:
   - Reporting `'in queue'` status and line position back to the client immediately.
   - Reporting `'processing'` status when execution starts.
   - Catching runtime exceptions and responding with standard JSON error shapes (`{ error: 'message' }`).
4. **Data Isolation inside Models**: Route callbacks should keep business logic focused. Instantiation and heavy lifting (like scraping or parsing) must be deferred to model classes (e.g. `Professor`, `Book`, `Report`).
5. **Document Building**: To generate teaching certificates, feed extracted model records to `DocumentBuilder` to map placeholders like `{{professorName}}` against templates in [api/template/](file:///Users/pablowerlang/Documents/Workspaces/ifsul/atesdoc/api/template/). Convert compilation results to base64 PDFs using `SUAPScraper.generatePDF(html)`.

## Guardrails

- Never write route logic that returns naked text; always return structured JSON objects containing requested keys or status codes.
- Do not let route tasks block indefinitely; if downstream scraper fails, handle errors gracefully inside the router try/catch block.
- Keep `DocumentBuilder` variables structured; nested objects in templates are formatted as `{{prefix.property}}`.

## Review Checklist

- Is the new route instantiated using the `new Route` pattern?
- Are inputs validated before being passed to models?
- Does the return statement return a structured object?
- Are HTML document variables correctly registered and mapped in `api/helpers/document-builder.js`?
