# TekStore Odoo Sidebar Extension

This Chrome extension enhances the TekStore Odoo deployment with a persistent sidebar, quick navigation helpers, and a secure lock overlay. The sidebar now ships with a fully user-configurable menu editor so teams can tailor categories, icons, and shortcuts without touching the codebase.

## Features

- **Collapsible sidebar** that keeps core TekStore routes within reach.
- **Host-aware lock overlay** with PIN verification to protect unattended sessions.
- **Dark mode** and collapse toggles persisted per user.
- **Configurable navigation menu**:
  - Add, reorder, enable/disable, and rename categories.
  - Choose Material Icons for categories and individual links through inline icon pickers.
  - Add, reorder, enable/disable, and rename individual links.
  - Configuration stored per-host in extension storage.

## Usage

1. Load the extension as an unpacked extension in Chrome/Edge.
2. Navigate to `https://odoo.tek.store/` or `https://staging-odoo.tek.store/`.
3. Click the version badge in the sidebar footer to open **Sidebar Settings**.
4. Use the editor to tailor categories and links. Save changes to persist them immediately.
5. The lock button (or `Ctrl+Alt+L`) triggers the lock overlay without affecting menu settings.

## Development

- **Entry point**: `content.js` injects all sidebar, settings, and lock overlay logic.
- **Styling** is injected at runtime within the same script; no external CSS files are required.
- **Configuration storage** relies on `chrome.storage.local` and falls back gracefully when unavailable.

### Making releases

When preparing a new build:

1. Increment the extension version in `manifest.json`.
2. Update the human-readable version string inside `content.js` (both the header comment and the footer label).
3. Always perform a **point (patch) increment**—for example, `8.2.22` → `8.2.23`—to keep Chrome Web Store upgrades predictable.
4. Document notable changes in this README or release notes as needed.

## Testing

This project currently has no automated test suite. Smoke-test the sidebar and settings in both production and staging hosts after making changes.
