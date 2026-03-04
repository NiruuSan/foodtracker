# FitTrack - Health & Fitness Tracker

A full-stack web app for a group of friends to track nutrition, fitness, weight, and health goals together. Built with React, TypeScript, Tailwind CSS, and Supabase.

## Features

- **Authentication** — Email/password signup & login via Supabase Auth
- **Onboarding** — Collects body stats and goals, auto-calculates daily nutrition targets (Mifflin-St Jeor equation)
- **Meal Tracking** — 4 input methods:
  - Barcode scan / manual barcode entry (Open Food Facts API)
  - Photo recognition (AI-powered via Groq)
  - Text description (AI-powered via Groq)
  - Manual entry
- **Detailed Nutrition** — Track macros, fat breakdown (saturated, mono/poly unsaturated, omega-3/6, cholesterol), carb breakdown (sugar, fiber, glycemic index), vitamins, and minerals
- **Exercise Tracking** — 25+ preset exercises with auto calorie estimation, or manual entry
- **Water Tracking** — Quick +/- buttons on the dashboard
- **Weight Logging** — Track weight over time with charts
- **Dashboard** — Daily calories, macro progress bars, water intake, weight chart, recent logs
- **Leaderboard** — Rank friends by streak, weight progress, or weekly activity
- **Friends** — Add friends by email, accept/reject requests

## Tech Stack

- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS v4
- **Backend**: Supabase (Auth, PostgreSQL, Storage, Row Level Security)
- **AI**: Groq API (Llama 3.3 70B for text, Llama 3.2 11B Vision for photos)
- **Charts**: Recharts
- **Icons**: Lucide React
- **Barcode**: html5-qrcode + Open Food Facts API

## Setup

### 1. Clone & install

```bash
git clone <your-repo-url>
cd wheight-tracker
npm install
```

### 2. Configure Supabase

Create a Supabase project at [supabase.com](https://supabase.com), then run the schema in the SQL Editor:

1. Go to your project's **SQL Editor**
2. Paste the contents of `supabase/schema.sql`
3. Click **Run**

### 3. Configure environment variables

```bash
cp .env.example .env
```

Fill in your keys:

| Variable | Where to get it |
|---|---|
| `VITE_SUPABASE_URL` | Supabase Dashboard → Settings → API |
| `VITE_SUPABASE_ANON_KEY` | Supabase Dashboard → Settings → API |
| `VITE_GROQ_API_KEY` | [console.groq.com](https://console.groq.com) (free) |

### 4. Run

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

## Project Structure

```
src/
  components/     UI components (Layout, ProgressRing, WeightChart, etc.)
  contexts/       React context (AuthContext)
  lib/            Utilities (supabase client, types, nutrition calc, food API)
  pages/          Page components (Dashboard, Meals, Exercise, Leaderboard, Profile)
supabase/
  schema.sql      Database migration (tables, RLS policies, triggers)
```

## License

MIT
