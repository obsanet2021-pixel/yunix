# Yunix — AI-Powered Trading Assistant

> Your personal trading companion built for disciplined funded and non-funded traders.

Yunix is a full-stack web application that helps traders track, analyse, and improve their performance. It combines a structured trade journal, backtesting tools, MT5 integration, an AI assistant, and a comprehensive educational courses system — all behind a tiered subscription model with role-based access control.

---

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Subscription Plans](#subscription-plans)
- [Role-Based Access](#role-based-access)
- [Routes Overview](#routes-overview)
- [Database Schema](#database-schema)
- [Deployment](#deployment)
- [Development Guidelines](#development-guidelines)
- [Contributing](#contributing)

---

## Features

### Trading Tools
- **Trade Journal** — Log and review daily trades with prop firm tracking
- **Trade Management** — Organise and manage open and closed positions
- **Analytics Dashboard** — Visual performance metrics, win rate, P&L stats
- **Backtesting** — Test strategies against historical data with session history
- **MT5 Connection** — Connect your MetaTrader 5 account directly (Pro plan)
- **Economic Calendar** — Stay informed on upcoming market events
- **Trading Sessions** — Track session-specific performance

### AI Assistant
- Context-aware chat powered by Google Gemini AI
- Personalised advice based on your live trading stats (win rate, best/worst trades, P&L)
- Image upload for chart analysis (Pro plan)
- Full markdown rendering in chat responses

### Certificates & Achievements
- View and print personalised trading achievement certificates
- Certificate size guide (Starter/Pro)

### Educational Courses
- Browse published video courses (all authenticated users)
- Admin-only course creation with YouTube/Vimeo/direct link support
- Category filtering and thumbnail support

### Admin & CEO Controls
- Role-based admin panel for course and user management
- CEO dashboard for toggling platform features globally
- Feature flags system with plan-level and toggle-level control

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, TypeScript, Vite |
| UI Components | shadcn/ui, Radix UI, Tailwind CSS |
| State & Data | TanStack Query v5, React Hook Form, Zod |
| Routing | React Router DOM v6 |
| Backend / Database | Supabase (PostgreSQL, Auth, Edge Functions, RLS) |
| AI | Google Generative AI (Gemini) |
| Charts | Recharts |
| Mobile | Capacitor (iOS/Android) |
| Deployment | Netlify, Cloudflare Workers (Wrangler) |
| Testing | Playwright |
| Linting | ESLint, TypeScript ESLint, Husky, lint-staged |

---

## Project Structure

```
yunix/
├── src/
│   ├── components/         # Reusable UI components
│   │   └── features/       # FeatureGate, UpgradePrompt, PlanBadge, etc.
│   ├── config/
│   │   └── features.ts     # Feature access config and useFeatureAccess hook
│   ├── pages/              # Route-level page components
│   │   └── admin/          # Admin-only pages (FeatureManagement, etc.)
│   ├── hooks/              # Custom React hooks
│   └── lib/                # Utilities, helpers, and examples
├── supabase/
│   ├── functions/          # Edge Functions
│   └── migrations/         # Versioned database migrations
├── public/                 # Static assets (icons, images, favicon)
├── scripts/                # Utility and setup scripts
├── .env.example            # Environment variable template
├── FEATURE_ACCESS_SYSTEM.md
├── REPOSITORY_STRUCTURE.md
├── SETUP.md
├── DEVELOPMENT_INSTRUCTIONS.md
└── vite.config.ts
```

---

## Getting Started

### Prerequisites

- Node.js >= 18.0.0
- npm >= 9.0.0
- A [Supabase](https://supabase.com) project

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/obsanet2021-pixel/yunix.git

# 2. Navigate into the project
cd yunix

# 3. Install dependencies
npm install

# 4. Set up environment variables
cp .env.example .env
# Fill in your values (see Environment Variables below)

# 5. Start the development server
npm run dev
```

The app will be available at `http://localhost:5173`.

### Other Scripts

```bash
npm run build        # Production build
npm run build:dev    # Development build
npm run preview      # Preview production build locally
npm run lint         # Run ESLint
```

---

## Environment Variables

Copy `.env.example` to `.env` and populate the following:

```env
# Supabase
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# Google AI (Gemini)
VITE_GOOGLE_AI_API_KEY=your-gemini-api-key

# Telegram Bot (for OTP auth)
TELEGRAM_BOT_TOKEN=your-telegram-bot-token
```

> **Never commit `.env` files.** The pre-commit hook will block this automatically.

---

## Subscription Plans

| Feature | Free | Starter | Pro |
|---|:---:|:---:|:---:|
| Dashboard & Trade Journal | ✅ | ✅ | ✅ |
| Trade Management | ✅ | ✅ | ✅ |
| Analytics | ✅ | ✅ | ✅ |
| Economic Calendar | ✅ | ✅ | ✅ |
| AI Chat (text) | ✅ | ✅ | ✅ |
| Certificate View | ✅ | ✅ | ✅ |
| Backtesting | ❌ | ✅ | ✅ |
| Screenshot Sharing | ❌ | ✅ | ✅ |
| Certificate Printing | ❌ | ✅ | ✅ |
| AI Image Upload | ❌ | ✅ | ✅ |
| Plug Orders | ❌ | ✅ | ✅ |
| MT5 Connection | ❌ | ❌ | ✅ |

Some features (e.g. loyalty program, partner program, invitation contest) are additionally controlled by CEO-level toggles independent of plan tier.

---

## Role-Based Access

Yunix uses three user roles:

| Role | Access Level |
|---|---|
| `user` | Restricted by subscription plan |
| `staff` | Full access to all features, bypasses plan restrictions |
| `ceo` | Full access + ability to toggle platform features globally |

### Assigning Roles

```sql
-- Get the user's ID
SELECT id, email FROM auth.users WHERE email = 'user@example.com';

-- Assign a role
INSERT INTO user_roles (user_id, role)
VALUES ('USER_ID_HERE', 'admin');
```

For full details on the feature access system, see [FEATURE_ACCESS_SYSTEM.md](./FEATURE_ACCESS_SYSTEM.md).

---

## Routes Overview

### Public Routes
| Path | Description |
|---|---|
| `/landing` | Marketing landing page |
| `/auth` | Sign in / Sign up |

### Authenticated Routes
| Path | Description |
|---|---|
| `/` | Welcome dashboard |
| `/dashboard` | Main trading dashboard |
| `/trade-journal` | Daily trade logging |
| `/trade-management` | Position management |
| `/analytics` | Performance analytics |
| `/backtesting` | Strategy backtesting *(Starter/Pro)* |
| `/backtest-sessions` | Backtest history |
| `/prop-firms` | Prop firm tracking |
| `/certificates` | Achievement certificates |
| `/calendar` | Economic calendar |
| `/ai-chat` | AI trading assistant |
| `/sessions` | Trading sessions |
| `/courses` | Educational courses |

### Admin Routes
| Path | Description |
|---|---|
| `/admin/profile` | Admin profile management |
| `/app/admin/feature-management` | CEO feature toggle dashboard |

---

## Database Schema

### Core Tables

**`user_roles`** — Maps users to roles (`user`, `admin`)

**`profiles`** — Extended user profile (name, bio, avatar)

**`courses`** — Educational course content with video URLs, categories, and publish state

**`system_settings`** — Stores CEO-controlled feature toggle states as JSONB

All tables use Row Level Security (RLS). A security-definer function `public.has_role(_user_id, _role)` is used to safely check roles without triggering RLS recursion.

Database schema is fully versioned under `supabase/migrations/`.

---

## Deployment

### Netlify (Recommended)

The project includes a `netlify.toml` configuration. To deploy:

1. Push your code to GitHub
2. Connect your repository to [Netlify](https://netlify.com)
3. Set all environment variables in Netlify's dashboard
4. Deploy — Netlify will run `npm run build` automatically

### Cloudflare Workers

A `wrangler.jsonc` configuration is included for Cloudflare Workers deployment.

### Mobile (Capacitor)

The project supports iOS and Android builds via Capacitor:

```bash
npm run build
npx cap sync
npx cap open ios     # or android
```

---

## Development Guidelines

This project follows a structured three-phase development workflow:

1. **Problem Identification** — Diagnose before writing code. Classify issues as Critical / Big / Tiny.
2. **Solution Strategy** — Plan a portable, migration-safe fix before executing.
3. **Execution & Validation** — Implement incrementally, test each step, document what changed.

For the full workflow, coding standards, and migration readiness checklist, see [DEVELOPMENT_INSTRUCTIONS.md](./DEVELOPMENT_INSTRUCTIONS.md).

---

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature-name`
3. Commit your changes with a clear message
4. Push to your fork and open a pull request

Please ensure your changes pass linting (`npm run lint`) before submitting.

---

*Built with care for traders who take discipline seriously.*