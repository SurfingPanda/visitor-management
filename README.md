<p align="center">
  <img src="public/images/secora-logo.png" width="96" alt="Secora logo">
</p>

<h1 align="center">Secora</h1>

<p align="center">
  <strong>Visitor &amp; Facility Management System</strong><br>
  Front desk, fleet &amp; deliveries, inventory, and safety — in one place.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Laravel-12-FF2D20?logo=laravel&logoColor=white" alt="Laravel 12">
  <img src="https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black" alt="React 18">
  <img src="https://img.shields.io/badge/Inertia.js-2-9553E9?logo=inertia&logoColor=white" alt="Inertia 2">
  <img src="https://img.shields.io/badge/Tailwind_CSS-3-06B6D4?logo=tailwindcss&logoColor=white" alt="Tailwind 3">
  <img src="https://img.shields.io/badge/PHP-8.2+-777BB4?logo=php&logoColor=white" alt="PHP 8.2+">
  <img src="https://img.shields.io/badge/MySQL%20%2F%20MariaDB-4479A1?logo=mysql&logoColor=white" alt="MySQL / MariaDB">
</p>

---

## Overview

**Secora** is an internal operations platform built for **Eljin Corporation**. It replaces paper logbooks and scattered spreadsheets across the front desk, delivery yard, motor pool, warehouse, and safety office with a single, access-controlled web app.

Visitors self-register from a public page, get an approved QR badge by email, and are scanned in and out at the gate. Staff log courier drop-offs and supplier deliveries with signatures and receipts, track vehicles and trips, manage equipment and scrap disposal, and file incident/accident reports — each behind a per-user permission system.

## Features

### 🛂 Front Desk
- **Visitor registration** with photo capture and printable QR **badges**
- **Public self-service requests** — visitors submit details + signature; staff approve/decline, and the visitor is **emailed** a link to download their pass
- **Appointment dates & QR expiry** — a badge is valid through its visit day; scanning it afterwards is rejected at the gate as *expired*
- **QR scan check-in / check-out** (`html5-qrcode`) with an explicit in/out mode

### 📦 Deliveries & Fleet
- **Delivery Log** — outbound dispatches and returns with crate/box counts
- **Supplier Delivery** — multi-item receipts, DR photo, check-in/out, CSV + printable PDF export
- **Package Deliveries** — courier drop-offs for employees; one drop-off can hold **multiple parcels**, received with a single on-screen signature
- **Vehicles & Trips**, **Drivers**, and **Helpers** registries

### 🏭 Inventory & Safety
- **Equipment Inventory** — asset tags, images, and lifecycle statuses (in stock, under repair, transferred, disposed)
- **Scrap Disposal** — itemized disposal records
- **Incident & Accident Reports** — branded printable form + `.docx` template export
- **Emergency Roster**

### 📊 Platform
- **Reports** dashboard with charts (`Chart.js` via `react-chartjs-2`)
- **Sidebar badges** showing pending/action-needed counts per module
- **Team management** with a granular **module access** system
- **Queued email** (password reset, request notifications) with branded templates

## Tech Stack

| Layer | Technology |
| --- | --- |
| Backend | Laravel 12 (PHP 8.2+) |
| Frontend | React 18 + Inertia.js 2 (Breeze `react` scaffold) |
| Styling | Tailwind CSS 3 |
| Build | Vite 7 |
| Database | MySQL / MariaDB |
| Charts | Chart.js + react-chartjs-2 |
| QR | html5-qrcode (scan) · qrcode.react (render) |
| Docs export | PhpWord (`.docx`), server-rendered Blade print views (PDF) |

## Requirements

- PHP **8.2+**
- Composer
- Node.js **18+** and npm
- MySQL / MariaDB (the reference dev environment is **XAMPP** on Windows)

## Getting Started (local)

```bash
# 1. Install dependencies
composer install
npm install

# 2. Environment
cp .env.example .env
php artisan key:generate

# 3. Configure the database in .env (default dev DB name: visitor)
#    DB_DATABASE=visitor  DB_USERNAME=root  DB_PASSWORD=

# 4. Migrate + seed the login accounts
php artisan migrate --seed

# 5. Link public storage (for served images)
php artisan storage:link
```

Run the app with the Vite dev server for hot reload:

```bash
php artisan serve      # http://127.0.0.1:8000
npm run dev            # Vite HMR
```

> **Production assets:** run `npm run build`. The app serves built assets unless a `public/hot` file exists, so after editing any `.jsx` either keep `npm run dev` running or rebuild.

### Seeded accounts

| Role | Email | Password |
| --- | --- | --- |
| Admin | `admin@visitor.test` | `password` |
| Staff (guard) | `guard@visitor.test` | `password` |

> ⚠️ **Public registration is disabled** — accounts are created admin-only from the **Team** page. **Change these seeded passwords before any public exposure.**

## Access Control — module system

Access is granted per user, per **module**, and gates both the sidebar and the routes.

- `App\Support\Modules::LIST` is the single source of truth: each module maps a label to the route-name prefixes it covers (modules are **grouped**, e.g. *Front Desk* = visitors + badges + scan + requests + packages).
- A non-admin's granted keys live in `users.module_access` (JSON). **Admins bypass everything.**
- The `EnsureModuleAccess` middleware maps the current route to a module and returns **403** for users who lack it. Some modules also split **view** vs **write** access.

To add a CRUD module: add a `Modules::LIST` entry, a matching sidebar nav item, and register its routes inside the `module.access` route group.

## Configuration notes

- **Mail** — password resets and visitor approval/decline notifications are **queued**, so a queue worker must be running (`php artisan queue:work`, or a scheduled `queue:work --stop-when-empty` in production). Set real SMTP credentials in `.env` (`MAIL_*`).
- **Storage** — sensitive uploads (signatures, visitor photos, DR/asset images) are stored on the **private** disk and streamed through auth-gated routes, never `/storage`. Run `php artisan storage:link` for the public assets.
- **Timezone** — records are stored in UTC; exports/prints display in **Asia/Manila**.

## Security

- Per-user, per-module authorization on every route (admin bypass)
- Privilege fields (`is_admin`, module grants) are **not mass-assignable** — set explicitly behind admin middleware
- Sensitive documents/photos on a private disk behind gated streaming
- Rate limiting on auth and public endpoints; base64 signature uploads size-capped
- In production: forced **HTTPS**, secure session cookies, and **HSTS** + baseline security headers
- Multi-step writes wrapped in **database transactions**

## Project structure

```
app/
  Http/Controllers/     Feature controllers (Visitors, Deliveries, Equipment, …)
  Http/Middleware/      Module access, security headers, Inertia sharing
  Models/               Eloquent models
  Support/Modules.php   Module → route-prefix map (access control source of truth)
  Mail/                 Queued mailables (visit approved / declined)
resources/
  js/Pages/<Feature>/   Inertia React pages (Index.jsx, Show.jsx)
  js/Layouts/           Authenticated sidebar layout
  js/Components/         Shared UI (Modal, VisitorPassCard, charts, …)
  views/                Blade print views + mail templates
routes/web.php          Routes, grouped by module behind access middleware
database/migrations/    Schema
```

## Deployment

Runs on standard PHP hosting (the production target is **Hostinger / CloudLinux, PHP 8.4**). A typical deploy:

```bash
git pull origin main
php artisan migrate --force
npm ci && npm run build
php artisan config:clear
```

Ensure `APP_ENV=production`, `APP_DEBUG=false`, a correct `APP_URL`, valid `MAIL_*` credentials, and a **cron job** running the queue worker so emails are delivered.

---

<p align="center"><em>Built for Eljin Corporation. Internal use.</em></p>
