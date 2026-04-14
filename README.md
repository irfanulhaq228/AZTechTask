# CSV Product Processing System

This project is a small end-to-end CSV product processing system built with:

- Next.js App Router for the frontend and API routes
- Tailwind CSS for styling
- PostgreSQL for persistence
- Prisma ORM for the application data model
- Python for background CSV processing and Gemini-backed insights
- Docker Compose for local setup

## What it does

- Uploads CSV files with dynamic headers
- Stores file metadata and processing status in PostgreSQL
- Processes files asynchronously in a Python worker
- Normalizes rows, parses prices, generates slugs, and removes duplicates
- Stores processed product rows as flexible JSON-backed records
- Surfaces dataset insights, missing data, duplicate counts, and common values

## Architecture

- `web`: Next.js UI + API routes
- `worker`: Python polling worker for background processing
- `postgres`: PostgreSQL database
- `uploads` volume: shared storage for uploaded CSV files

The upload request returns immediately after saving the file and creating an `Upload` row. The worker later claims `PENDING` uploads, processes the CSV, stores products, generates insights, and updates the final status.

## Data model

The system uses three core Prisma models:

- `Upload`: file metadata, status, row counts, detected headers, and error details
- `Product`: normalized product rows with `rawData` and `cleanData` stored as JSON
- `UploadInsight`: summary text plus structured issues and stats

JSON fields are used intentionally so different CSV column shapes can be handled without schema changes.

## Setup

### 1. Create the environment file

```bash
cp .env.example .env
```

Optional:

- Set `GEMINI_API_KEY` to enable Gemini-generated insights
- Leave it empty to use the built-in heuristic fallback

### 2. Start the system

```bash
docker compose up --build
```

Compose runs a one-shot `migrate` service (`npx prisma db push`) before starting `web` and `worker`, so the worker never queries Postgres while tables are still missing.

### 3. Open the app

[http://localhost:3000](http://localhost:3000)

## Troubleshooting (Docker)

### `docker compose ps` is empty / pgAdmin: `role "postgres" does not exist`

If **no containers are running**, start the stack:

```bash
docker compose up --build
```

If **port 5432 on your Mac is already used by a local Postgres** (Homebrew / Postgres.app), Docker publishes Postgres on a **different host port** so both can run.

By default the mapped port is **`15432`** (see `POSTGRES_HOST_PORT` in `.env.example`). If Docker errors with **“address already in use”**, pick a free port (for example `15433`) in your `.env`:

```bash
POSTGRES_HOST_PORT=15433
```

Use **pgAdmin** (from your Mac) with:

- **Host:** `localhost`
- **Port:** the value of `POSTGRES_HOST_PORT` from your `.env` (default **`15432`**)
- **Database:** `products`
- **Username:** `postgres`
- **Password:** `postgres`

Inside Docker, apps still connect using `DATABASE_URL=...@postgres:5432/...` from `.env.example` — that hostname is the **Compose network**, not your Mac loopback.

### Worker error: `relation "Upload" does not exist`

That means the worker connected to Postgres before the Prisma schema existed (startup race), or migrations were never applied.

Use `docker compose up` (which includes the `migrate` job) or run `npx prisma db push` manually against the same database.

### Worker error: `invalid URI query parameter: "schema"`

Prisma URLs often include `?schema=public`. The Python worker uses `psycopg`, which does not accept that query parameter as part of a PostgreSQL connection URI.

The worker strips the Prisma `schema` query param and applies `search_path` after connecting, so you can keep Prisma-style URLs in `.env`.

If you still see this error, rebuild images so Docker picks up the fix:

```bash
docker compose down
docker compose up --build
```

### Docker build context is huge / slow

Avoid sending `node_modules` or `.next` to Docker as build context. This repository includes a `.dockerignore` to keep builds fast.

### Web image build fails: `Cannot resolve environment variable: DATABASE_URL`

`docker compose` injects `.env` at **runtime**, but `docker build` for the `web` image does not automatically receive your local `.env` values (and `.env` is intentionally excluded from the Docker build context).

The `Dockerfile.web` build stage sets a **placeholder** `DATABASE_URL` so `npx prisma generate` and `npm run build` can succeed. The running container still uses the real `DATABASE_URL` from your `.env` via `docker compose`.

## Example CSV

A sample file is included at `samples/products.csv`.

The app expects:

- UTF-8 CSV input
- A header row
- Dynamic product-related columns

It does not require fixed header names. The worker detects headers automatically and uses best-effort matching for fields such as product name and price.

## Local development without Docker

If you want to run services manually:

1. Start PostgreSQL and make sure `DATABASE_URL` points to it.
2. Install Node dependencies:

```bash
npm install
```

3. Install Python dependencies:

```bash
pip install -r worker/requirements.txt
```

4. Generate Prisma Client and push the schema:

```bash
npx prisma generate
npx prisma db push
```

5. Start the Next.js app:

```bash
npm run dev
```

6. Start the worker in another terminal:

```bash
python3 worker/main.py
```

## Key implementation decisions

- Dynamic CSV handling is implemented by storing all row payloads in JSON rather than hard-coding source columns.
- A database-polling worker was chosen instead of Redis/RabbitMQ to keep the assignment small and easy to run.
- Canonical derived fields like normalized name, normalized price, and slug are still stored as top-level columns for easier querying and display.
- Gemini is used only for lightweight summary generation. If the API key is missing or the call fails, the app still produces deterministic heuristic insights.

## Tradeoffs

- Polling is simpler than a full queue, but it is less immediate and less scalable for high-throughput systems.
- JSON-backed products are flexible for unknown CSV shapes, but they provide less strict validation than a fully normalized relational model.
- The worker currently keeps the parsing logic intentionally compact and assignment-focused rather than building a more advanced rule engine per file type.

## Main routes

- `/`: upload form + recent jobs
- `/uploads`: all uploads and statuses
- `/uploads/[id]`: upload detail, stats, processed rows, and insights
- `/products`: processed product table with dynamic columns
