---
name: frontend-components-and-styling
description: Implement, debug, or style web frontend wizard steps, UI components, state management, and LESS stylesheets. Use when modifying the 3-step wizard flow, editing UI cards, updating toggles, or editing LESS files under mobile-first and variable-only CSS rules.
---

# Frontend Components and Styling

Use this skill when developing frontend features, editing LESS files, updating state models, or adding components to the client application.

## Scope

- Applies to JS files under [web/src/js/components/](file:///Users/pablowerlang/Documents/Workspaces/ifsul/atesdoc/web/src/js/components/) (Form, Input, Modal, Button, Toast, Select) and [web/src/js/modules/](file:///Users/pablowerlang/Documents/Workspaces/ifsul/atesdoc/web/src/js/modules/) (Step logic).
- Applies to state synchronization in [web/src/js/helpers/state.js](file:///Users/pablowerlang/Documents/Workspaces/ifsul/atesdoc/web/src/js/helpers/state.js).
- Applies to LESS sheets in [web/src/less/](file:///Users/pablowerlang/Documents/Workspaces/ifsul/atesdoc/web/src/less/).

## Core Rules

1. **Strict CSS Variables for Colors**: **NEVER** use hardcoded hex values (`#5b775a`), standard color names (`white`), or direct `rgba(...)` calls. Every color must reference custom properties defined in [web/src/less/common.less](file:///Users/pablowerlang/Documents/Workspaces/ifsul/atesdoc/web/src/less/common.less).
   - Dynamic transparency: `rgb(from var(--color-name) r g b / alpha)`
   - Mixing colors: `color-mix(in srgb, var(--color-name) percentage%, var(--color-white))`
   - Skeleton loading shimmers: `rgb(from var(--color-text) r g b / 0.08)`
2. **Mobile-First Responsive Layouts**: Write layout styling with mobile viewports (320px+) as the base configuration. Progressive enhancement media queries (e.g. `@media @size-600` and `@media (min-width: 900px)`) must be nested directly within the affected selector block (co-location). Never cluster media queries at the bottom of LESS files.
3. **Reactive State Pattern**: Keep the UI decoupled. All modifications to inputs, selects, or search results should update the state through `state.update({ key: value })`. Step transition visibility is driven automatically by state update triggers.
4. **Use Reusable Components**: For form interactions, dialogs, dropdowns, and toast notifications, import their respective classes from `web/src/js/components/` instead of writing custom DOM events or inline nodes.
5. **No Cross-Module Imports**: Wizard modules in `web/src/js/modules/` should not import or invoke each other directly. Connect them purely through `state` mutations and listeners.

## Guardrails

- All interactive targets (buttons, inputs, toggles) must meet touch criteria of minimum `44px` width/height targets.
- Ensure LESS nesting does not exceed 4 levels deep to avoid specificity bloating.
- Avoid introducing inline styling attributes in JavaScript. Toggle classes or utilize class changes instead.

## Review Checklist

- Are all color treatments using variables and standard functions in `web/src/less/common.less`?
- Are responsive breakpoints nested/co-located with their base styles?
- Does module coordination occur through the `StateManager`?
- Do interactive buttons or touch interfaces follow accessibility sizing constraints?
