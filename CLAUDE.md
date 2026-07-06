# CLAUDE.md

Guidance for working in this repository.

## Project

**Secora** — a Visitor & Facility Management system for Eljin Corporation (front desk, fleet/delivery, inventory, safety). Runs on XAMPP (Windows).

**Stack:** Laravel 12 + Inertia.js + React 18 + Tailwind CSS (Breeze `react` scaffold), MySQL/MariaDB. Charts via Chart.js (`react-chartjs-2`). QR via `html5-qrcode` / `qrcode.react`.

## Run & build

- **Dev:** `php artisan serve` + `npm run dev` (Vite HMR).
- **Production assets:** `npm run build`. After editing any `.jsx`, rebuild (or run `npm run dev`) — the app serves built assets unless `public/hot` exists.
- **MySQL CLI is not on PATH** — use `/c/xampp/mysql/bin/mysql.exe -u root` (no password). Database: `visitor`.
- **Migrations:** `php artisan migrate --force`.
- **Remote HTTPS:** `run-public.bat` deletes `public/hot`, serves on :8000, and opens a Cloudflare quick tunnel (`cloudflared`). `bootstrap/app.php` trusts all proxies so URLs are https behind it.

## Auth & seeded logins

- `admin@visitor.test` / `password` (is_admin=true), `guard@visitor.test` / `password` (is_admin=false).
- **Public registration is disabled.** Accounts are created admin-only on the **Team** page (`/users`), gated by the `admin` middleware alias (`EnsureUserIsAdmin`).
- ⚠️ Change the seeded admin password before any public exposure.

## Access control — module system

Per-user module access gates both the sidebar and the routes. **This is the key cross-cutting system — read `App\Support\Modules` first.**

- `App\Support\Modules::LIST` is the single source of truth: module key → label + route-name `prefixes`. Modules are **grouped**, not per-nav-item (e.g. `front_desk` = visitors + badges + scan).
- `users.module_access` (JSON, cast `array`) holds a non-admin's granted keys. Admins bypass everything. `User::canAccessModule($key)`.
- **Enforcement:** `EnsureModuleAccess` middleware (alias `module.access`) on the main `['auth','verified']` route group in `routes/web.php` — maps the current route name to a module and 403s non-admins who lack it. Routes not matching any module (dashboard, settings, profile, team) always pass.
- **Nav:** `HandleInertiaRequests` shares `auth.modules` (effective keys). `AuthenticatedLayout` nav items carry a `module` key and are hidden if the user can't access them.
- **Adding a new CRUD module:** add a `Modules::LIST` entry + a nav item with the matching `module` key + register routes inside the `module.access` group. Dashboard is intentionally NOT a module (it's the always-visible post-login landing page).

## Architecture

- **Inertia pages** live in `resources/js/Pages/<Feature>/Index.jsx` (+ `Show.jsx` where relevant); controllers `Inertia::render('<Feature>/Index', [...])`.
- **Feature modules:** Visitors (+ Badges, Scan/QR check-out), Reports, Delivery Log, Supplier Delivery, Vehicles (+ Trips), Drivers, Equipment Inventory, Scrap Disposal, Incident & Accident Reports, Emergency Roster, Team (users), Settings.
- **Shared layout:** `resources/js/Layouts/AuthenticatedLayout.jsx` (sidebar nav + topbar). **Modal:** `resources/js/Components/Modal.jsx` (Headless UI). **Charts:** `resources/js/Components/ReportCharts.jsx`.
- **CSV export + printable PDF** pattern (Supplier Delivery, Delivery Log): controller has a shared `filteredQuery()` reused by `index`/`export`/`printable`; a `resources/views/<feature>/print.blade.php` renders a branded, landscape, corporate report that auto-opens the browser print dialog. Print views wait for the Eljin logo (`public/logo_main.webp`) to load before printing.

## Conventions & gotchas

- **Always add new columns to the model `$fillable`** — silently dropped otherwise (bit BiometricDevice, SupplierDelivery, etc.).
- **MariaDB/XAMPP TIMESTAMP trap:** the first NOT-NULL `timestamp` column without an explicit default silently gets `ON UPDATE CURRENT_TIMESTAMP` (rewrites itself on every row update, in DB-local tz). Make check-in/out and similar timestamp columns `->nullable()` (`dateTime`), as done throughout.
- **Inertia React `form.transform()` returns `undefined`** — never chain `form.transform(cb).post(...)`. Call as two statements. Needed for multipart PATCH (spoof `_method:'patch'` + `forceFormData`). Most forms just use `form.patch(route(...))` directly.
- **Storage URLs are root-relative** (`/storage/...` via a model accessor), never absolute — resolves against whatever host serves the app (localhost, tunnel, LAN, Hostinger). `php artisan storage:link` is done.
- **Tall form modals** use a capped, scrollable pattern: `<form className="flex max-h-[calc(100vh-3rem)] flex-col">` with a fixed header, a `flex-1 overflow-y-auto` body, and a fixed footer — so many rows don't overflow the viewport.
- **Charts:** `ReportCharts.jsx` uses a pre-validated data-viz palette (categorical hues in fixed order; reserved status/severity colors). Time-series → `AreaTrend` (line+gradient); part-to-whole → doughnut; ranked categories → horizontal `RankedBar`. When touching charts, load the `dataviz` skill and don't invent new colors.
- **Exports/prints display in Asia/Manila** (timestamps stored UTC; `DISPLAY_TZ` const in the controller converts).

## Biometrics (dormant)

ZKTeco integration (`ZktecoService`, `TcpZkClient`, `BiometricSyncService`, `biometric:sync` command, `employees`/`attendance_logs`/`biometric_devices` tables) exists but is **UI-hidden and abandoned** — the target host can't reach the office-LAN device. Leave it dormant; don't wire it back into the UI without being asked.
