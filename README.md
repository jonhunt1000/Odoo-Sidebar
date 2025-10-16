# TekStore Odoo Sidebar

TekStore Odoo Sidebar is a Manifest V3 Chrome extension that injects a persistent navigation sidebar and lock overlay into TekStore's Odoo instances. It ships as a single content script (`content.js`) that runs on production and staging hosts to enhance navigation, enforce inactivity locks, and provide configurable quick links tailored for TekStore workflows.【F:manifest.json†L1-L20】【F:content.js†L56-L188】【F:content.js†L1000-L1005】

## Features
- **Structured navigation sidebar** – Renders categorized quick links with active route tracking, hover behavior, and quick expand/collapse controls. Categories and links can be renamed, hidden, and reordered through settings, with state persisted in `localStorage` (`ts-config`, `ts_cat_state_v2`).【F:content.js†L82-L175】【F:content.js†L440-L516】【F:content.js†L756-L898】
- **Two layout modes** – Users can switch between the classic sidebar (Option 1) and an application drawer (Option 2). Layout choice and collapsed state are remembered, and a floating expand button appears when collapsed. A dark mode toggle keeps TekStore colors consistent with Odoo’s theme.【F:content.js†L519-L662】
- **Search-aware UI hints** – Contextual search filters categories or drawer tiles depending on layout, reveals the signed-in user’s name as a placeholder, and includes a quick back button to return to `/web` if history is unavailable.【F:content.js†L665-L752】
- **Configurable settings modal** – Double-clicking the sidebar version opens a modal to adjust layout, inactivity timeout, visible categories, and per-link metadata. Reset and save actions rewrite the stored configuration and rebuild the UI instantly.【F:content.js†L756-L898】
- **Inactivity lock overlay** – A pre-lock cover prevents flashes of unprotected content while lock state loads. Users can manually lock with `Ctrl+Alt+L` or via the lock button, and unlocking requires PIN verification against TekStore’s `/tek_lock/verify_pin` endpoint. Activity is shared across tabs via `chrome.storage` and `BroadcastChannel`, and idle timeout is configurable.【F:content.js†L62-L188】【F:content.js†L902-L997】
- **Built-in self-test** – An automated check runs after boot to confirm critical UI elements, collapsed-mode affordances, and POS theme adjustments are in place, logging to the console on failure.【F:content.js†L1007-L1031】

## Installation
1. Clone or download this repository.
2. Open Chrome (or any Chromium-based browser) and navigate to `chrome://extensions`.
3. Enable **Developer mode**.
4. Click **Load unpacked** and select the `Odoo-Sidebar/` directory. The manifest targets TekStore production and staging Odoo hosts by default.【F:manifest.json†L1-L20】

## Usage
- Press **Ctrl + Alt + M** to toggle between sidebar and drawer layouts instantly.【F:content.js†L651-L659】
- Press **Ctrl + Alt + L** or click the lock icon to invoke the lock overlay on demand.【F:content.js†L638-L980】
- Double-click the version badge in the sidebar footer to open the TekStore settings modal.【F:content.js†L788-L898】
- Use the moon icon to toggle dark mode; the extension mirrors the choice across page chrome and persists it for future sessions.【F:content.js†L645-L649】
- Collapse the sidebar with the double-arrow button; a floating action button appears bottom-right to reopen it when needed.【F:content.js†L608-L626】【F:content.js†L320-L347】

## Configuration & Storage
User preferences are stored entirely in browser storage:
- `localStorage`: `ts-config` (schema versioned navigation + layout), `ts_cat_state_v2` (category open state), `sidebarCollapsed`, `sidebarDarkMode`.
- `chrome.storage.local`: `ts-lock-state::<host>` (shared lock flag), `ts-last-activity::<host>` (cross-tab idle tracking).【F:content.js†L68-L175】【F:content.js†L610-L648】【F:content.js†L902-L997】

Resetting settings via the modal reverts to the default navigation defined in `DEFAULT_NAV`, covering Quick Access, Appointments, Sales, Workshop, Inventory, Purchasing, Workspace, and Accounts links tailored to TekStore processes.【F:content.js†L82-L141】【F:content.js†L794-L898】

## Development Notes
- The extension consists of `manifest.json` and a single content script. No build tooling is required; edit `content.js` directly and reload the extension to test changes.【F:manifest.json†L1-L20】
- Core functionality is organized into self-initialising modules (`Sidebar`, `Drawer`, `Chrome`, `Search`, `Settings`, `Lock`) that share configuration and DOM primitives. Boot order ensures layout and lock logic initialise before the self-test runs.【F:content.js†L400-L1005】
- When updating navigation defaults or schema, bump the `SCHEMA.version` constant and adjust `migrateConfig` to preserve existing installations.【F:content.js†L82-L175】

## Testing
Open the browser console after loading an Odoo page to review the **TS SelfTest** output. Any failures are logged with actionable error messages for rapid debugging.【F:content.js†L1007-L1031】
