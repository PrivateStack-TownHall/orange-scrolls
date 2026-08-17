# Orange Scrolls 📜

Internal Content Operating System (CMS) for **VSG Group** — manages articles, brands, categories, tags, and media across multiple brands (Orange Kode, Sadino Technology, Sekolah Stack, Protein Shack, Cookiefy) from a single dashboard.

The UI follows a parchment / treasure-map visual theme — sidebar styled as an unrolled scroll, wax-seal status badges, hand-illustrated icons — built on top of a fairly standard React + NestJS CRUD stack underneath.

---

## Tech Stack

| Layer        | Stack                                                                                     |
| ------------ | ----------------------------------------------------------------------------------------- |
| **Frontend** | React 19, Vite, React Router v7, Tailwind CSS v4, TipTap (rich text editor), Lucide icons |
| **Backend**  | NestJS, Prisma ORM, PostgreSQL (via Supabase)                                             |
| **Storage**  | Supabase Storage (media uploads)                                                          |

---

## Project Structure

```
orange-scrolls/
├── ui/                     # React frontend (Vite)
│   ├── public/
│   │   ├── backgrounds/    # parchment textures, sidebar scroll artwork
│   │   ├── fonts/          # JetBrains Mono (self-hosted)
│   │   ├── icons/          # themed icons (wax seals, feather, compass, etc.)
│   │   └── os-logo.png
│   └── src/
│       ├── app/            # router
│       ├── layouts/        # MainLayout, LeftBar, TopBar
│       ├── pages/          # one folder per feature (articles, brands, categories, tags, media, dashboard)
│       ├── components/     # shared UI (Badge, DataTable, PopUp, Toast, ...)
│       ├── services/       # axios calls to the API
│       ├── hooks/
│       └── styles/         # globals.css (theme vars + component classes), App.css
│
└── api/                    # NestJS backend
    └── src/
        ├── articles/
        ├── brands/
        ├── categories/
        ├── tags/
        ├── media/
        ├── common/
        └── prisma/         # schema.prisma + migrations
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- A PostgreSQL database (this project uses [Supabase](https://supabase.com))

### 1. Backend (`api/`)

```bash
cd api
npm install
cp .env.example .env
```

Fill in `.env`:

```
PORT=3015
DATABASE_URL=postgresql://...          # your Supabase/Postgres connection string
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_KEY=your_service_role_key
SUPABASE_BUCKET=media
```

Run migrations, then start the server:

```bash
npx prisma migrate deploy
npm run start:dev
```

API runs at `http://localhost:3015` by default.

### 2. Frontend (`ui/`)

```bash
cd ui
npm install
cp .env.example .env
```

Fill in `.env`:

```
VITE_APP_NAME=Orange Scrolls
VITE_PORT=5175
VITE_API_URL=http://localhost:3015/
VITE_UPLOAD_URL=http://localhost:3015/uploads
```

```bash
npm run dev
```

UI runs at `http://localhost:5175` by default.

---

## Scripts

**`ui/`**
| Command | Description |
|---|---|
| `npm run dev` | Start Vite dev server |
| `npm run build` | Production build → `ui/dist` |
| `npm run preview` | Preview the production build locally |
| `npm run lint` | Run ESLint |

**`api/`**
| Command | Description |
|---|---|
| `npm run start:dev` | Start NestJS in watch mode |
| `npm run build` | Compile to `api/dist` |
| `npm run start:prod` | Run the compiled build |
| `npm run lint` | Run ESLint (auto-fix) |
| `npm run test` | Unit tests |
| `npm run test:e2e` | End-to-end tests |

---

## Data Model

Defined in `api/prisma/schema.prisma`:

- **Brand** — top-level tenant (Orange Kode, Cookiefy, etc.)
- **Article** — belongs to a Brand + Category, has many Tags and Media, has a `status` (Draft / Published / Archived)
- **Category**, **Tag** — scoped per Brand
- **ArticleTag**, **ArticleMedia** — join tables
- **Media** — uploaded files (Supabase Storage)
- **Notification**

---

## UI Theme Notes

A few implementation details that aren't obvious from the code alone:

- **Sidebar** (`src/layouts/LeftBar.jsx`) is built from two layers inside `.scroll`: a decorative `.scroll__frame` (absolutely positioned, auto-sized via flexbox — top/bottom art at natural height, middle piece stretches with `flex: 1`) and `.scroll__menu-list` (the actual nav, sized to fill via `height: 100%`). The scroll artwork PNGs (`public/backgrounds/scrolls-leftbar-*.png`) are pre-cropped to their visible bounding box — if you regenerate these assets, crop out transparent margins before dropping them in, or the sidebar will look disproportionate at narrow widths.
- **Status badges** (`components/shared/ui/Badge.jsx`) use wax-seal icons color-coded by status: green = Published, yellow = Draft, treasure chest = Archived, purple = Featured, blue = Info.
- **Cards** (`.os-card` / `.os-card-compact` / `.os-card-portrait` / `.os-card-banner` in `globals.css`) use the parchment-paper PNG as a background — pick the variant matching the card's aspect ratio to avoid the artwork looking stretched.
- Custom `os-*` classes in `globals.css` are **unlayered** CSS (not inside `@layer`), so they take priority over Tailwind utility classes of the same property regardless of class order in JSX. To override e.g. padding on an `.os-card`, add a dedicated modifier class (see `.os-card-flush`) rather than a plain utility like `p-0`.

---

## License

Internal project — not published.
