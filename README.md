# Yunix — AI-Powered Trading Assistant

> Your personal trading companion built for disciplined funded and non-funded traders.

Yunix is a full-stack web application that helps traders track, analyse, and improve their performance. It combines a structured trade journal, backtesting tools, trading platform integration, an AI assistant, and a comprehensive educational courses system behind a secure authentication and subscription model.

---

# Table of Contents

- Features
- Tech Stack
- Project Structure
- Getting Started
- Environment Variables
- Subscription Plans
- Deployment
- Contributing

---

# Features

## Trading Tools

- **Trade Journal** — Log and review daily trades
- **Trade Management** — Organise and manage open and closed positions
- **Analytics Dashboard** — Visual performance metrics, win rate, and P&L statistics
- **Backtesting** — Test strategies against historical market data
- **Trading Platform Integration** — Connect supported trading accounts
- **Economic Calendar** — Stay informed on upcoming market events
- **Trading Sessions** — Track session-specific performance

## AI Assistant

- AI-powered trading assistant
- Personalized insights based on trading performance
- Chart image analysis
- Rich markdown responses

## Certificates & Achievements

- View trading achievement certificates
- Print certificates (supported plans)

## Educational Courses

- Browse educational trading courses
- Video-based learning content
- Course categorization and filtering

## Administration

- User management
- Course management
- Platform configuration

---

# Tech Stack

| Layer | Technology |
| --- | --- |
| Frontend | React, TypeScript, Vite |
| UI | Tailwind CSS, shadcn/ui, Radix UI |
| State Management | TanStack Query, React Hook Form |
| Backend | Supabase |
| Database | PostgreSQL |
| AI | Generative AI |
| Charts | Recharts |
| Mobile | Capacitor |
| Deployment | Modern Cloud Hosting |
| Testing | Playwright |
| Linting | ESLint |

---

# Project Structure

```text
yunix/
├── src/
├── public/
├── supabase/
├── scripts/
├── package.json
├── .env.example
└── README.md
```

---

# Getting Started

## Prerequisites

- Node.js 18+
- npm 9+
- Supabase Project

## Installation

```bash
git clone <repository-url>

cd yunix

npm install

cp .env.example .env

npm run dev
```

The application will be available at:

```text
http://localhost:5173
```

### Available Scripts

```bash
npm run dev
npm run build
npm run build:dev
npm run preview
npm run lint
```

---

# Environment Variables

Copy `.env.example` to `.env` and configure the required values.

```env
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
AI_API_KEY=
```

> **Never commit your `.env` file.**

---

# Subscription Plans

| Feature | Free | Starter | Pro |
| --- | :---: | :---: | :---: |
| Dashboard | ✅ | ✅ | ✅ |
| Trade Journal | ✅ | ✅ | ✅ |
| Trade Management | ✅ | ✅ | ✅ |
| Analytics | ✅ | ✅ | ✅ |
| Economic Calendar | ✅ | ✅ | ✅ |
| AI Chat | ✅ | ✅ | ✅ |
| Certificates | ✅ | ✅ | ✅ |
| Backtesting | ❌ | ✅ | ✅ |
| Screenshot Sharing | ❌ | ✅ | ✅ |
| Certificate Printing | ❌ | ✅ | ✅ |
| AI Image Analysis | ❌ | ✅ | ✅ |
| Trading Platform Integration | ❌ | ❌ | ✅ |

---

# Deployment

The application supports deployment on modern cloud platforms.

1. Push your repository.
2. Configure the required environment variables.
3. Build and deploy the application.

For mobile deployment:

```bash
npm run build
npx cap sync
```

---

# Contributing

1. Fork the repository.
2. Create a feature branch.

```bash
git checkout -b feature/your-feature
```

3. Commit your changes.
4. Push your branch.
5. Open a Pull Request.

Please ensure your project passes linting before submitting:

```bash
npm run lint
```

---

*Built with care for traders who take discipline seriously.*
