# Trainygo

SaaS platform for personal trainers and fitness coaches — manage clients,
training programs, nutrition plans, check-ins and measurements from one place.

Arabic-first (RTL) with full English (LTR) support, light/dark theming, and
offline subscription management.

## Tech stack

- **Next.js 15** (App Router) + **React 19** + **TypeScript**
- **Tailwind CSS** + shadcn-style UI components
- **MongoDB** + **Mongoose**
- **NextAuth (Auth.js v5)** — credentials, 3 roles
- **Cloudinary** — media (exercise GIFs, progress photos, chat attachments)
- **React Hook Form** + **Zod**
- **Recharts** (progress charts) · **Framer Motion** (light usage)

## Getting started

```bash
npm install --legacy-peer-deps
cp .env.example .env.local   # then fill in MONGODB_URI, AUTH_SECRET, Cloudinary
npm run dev
```

Open http://localhost:3000

### Seeding

```bash
npm run seed   # creates Super Admin, plans, exercise & food libraries (only if empty)
```

### Instant preview (no database needed)

```bash
npm run preview   # spins up an in-memory MongoDB, seeds one user per role, runs the app
```

Then open http://localhost:3000 and log in with:

| Role        | Username | Password    |
|-------------|----------|-------------|
| Super Admin | `admin`  | `Admin123!` |
| Coach       | `coach`  | `Coach123!` |
| Client      | `client` | `Client123!`|

The in-memory database is discarded on exit — use a real `MONGODB_URI` + `npm run seed` for persistent data.

## Architecture

```
src/
  app/                 # routes (App Router)
    api/               # REST API route handlers
    page.tsx           # marketing landing page
    layout.tsx         # root layout: fonts, dir/lang, providers
  components/
    ui/                # shadcn-style primitives (button, card, input, ...)
    brand/             # logo, language switcher, theme toggle
    marketing/         # public site header/footer/landing
    providers/         # theme + i18n context providers
  lib/
    constants.ts       # shared enums (roles, statuses, categories, ...)
    db.ts              # cached Mongoose connection
    utils.ts           # cn(), helpers
    i18n/              # dictionaries (ar/en), locale config, server helpers
  models/              # Mongoose models (one file per entity) + barrel index
```

## Internationalization

- Default locale: **Arabic (RTL)**. English (LTR) fully supported.
- Locale is stored in the `trainygo_locale` cookie and (for logged-in users)
  on the user profile. The root layout sets `<html lang dir>` from the cookie.
- All UI strings live in `src/lib/i18n/dictionaries.ts`. The Arabic dictionary
  is the canonical shape; English is type-checked against it.

## Theming

All colors are CSS variables in `src/app/globals.css` (`:root` + `.dark`).
Components reference semantic tokens only (`bg-primary`, `text-muted-foreground`),
so the whole platform can be re-skinned from one place. Toggle via `next-themes`.

## Roles

- **super_admin** — platform owner: coaches, plans, libraries, settings.
- **coach** — manages own clients, programs, nutrition, templates. 3-day trial.
- **client** — created by a coach (cannot self-register); views workouts,
  nutrition, logs progress, check-ins, messages.

## Build status

Phase 1 (foundation) + marketing site: **complete & verified** (`npm run build` passes,
dev server renders RTL Arabic homepage). See the in-repo task list for remaining phases.
