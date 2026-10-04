# SmartBite frontend

A mobile-first React/Vite application for low-friction kitchen inventory, expiry reminders, recipe ideas and household food-waste tracking.

## Run locally

```bash
npm install
npm run dev
```

The app starts in **browser demo mode** when no API URL is configured. Demo pantry items and preferences are stored in `localStorage`; the workspace starts empty so all displayed activity is user-created. Use **View demo** on the landing page, then add an item from the dashboard to explore the flows.

Build and type-check:

```bash
npm run build
```

## Connect Supabase and FastAPI

Copy `.env.example` to `.env.local`, then set:

```env
VITE_API_BASE_URL=/api
VITE_BACKEND_URL=http://127.0.0.1:8000
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-public-anon-key
VITE_DEMO_MODE=false
```

Supabase Auth is used for email/password sign-in, registration, password reset and profile updates. API requests include the Supabase access token as a bearer token. In development, the browser calls the same-origin `/api` path and Vite proxies it to `VITE_BACKEND_URL`; the browser never calls a localhost backend directly. In production, configure your host/reverse proxy to route `/api` to FastAPI. If Supabase is not configured, the auth screen offers a clearly labeled local-only demo account.

## API contract used by the UI

The API base URL includes `/api`; the service layer appends these paths:

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/items` | List the signed-in user's food items |
| `GET` | `/items/:id` | Read one item |
| `POST` | `/items` | Create a food item |
| `PATCH` | `/items/:id` | Update an item |
| `DELETE` | `/items/:id` | Remove an item |
| `POST` | `/items/:id/action` | Record `used`, `donated` or `composted` |
| `POST` | `/items/parse` | Parse quick-entry text (`{ text }`) |
| `POST` | `/items/voice` | Parse a voice transcript (`{ transcript, text }`) |
| `POST` | `/items/receipt` | Extract receipt items (`multipart/form-data`, field `file`) |
| `GET` | `/recipes?include_near_expiry=true` | Recommend recipes from near-expiry inventory |
| `GET` | `/notifications` | List reminders |
| `PATCH` | `/notifications/:id` | Mark a reminder read (`{ read: true }`) |
| `DELETE` | `/notifications/:id` | Delete a reminder |
| `GET` | `/analytics` | Return impact counts and monthly trend |
| `GET` / `PUT` | `/settings` | Read and save user preferences |

Food items use `name`, `quantity`, `unit`, `expires_at`, `category`, `purchased_at`, `storage_location`, optional `notes` and optional `weight_kg`. Responses may use snake_case or camelCase; the client normalizes both. List responses may be an array or an object with an `items`, `recipes` or `notifications` key.

The UI deliberately shows waste-prevention weight as unavailable (`—`) until the API supplies item-weight data. Counts are derived from logged user actions; the global food-waste figures on the public landing page are attributed to UNEP's *Food Waste Index Report 2024*.

## Project structure

- `src/pages` — landing, auth, dashboard, inventory, item details, quick add, recipes, notifications, analytics and settings
- `src/components` — shared navigation, food cards, quick-entry modes, dialogs, charts and empty/loading/error states
- `src/context` — auth, pantry data and toast state
- `src/services/api.ts` — centralized FastAPI service plus browser-local demo adapter
- `src/lib` — Supabase client and date / freshness / quick-entry parsing utilities
- `src/types` — shared TypeScript domain models

