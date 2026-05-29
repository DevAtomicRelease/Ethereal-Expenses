# Ethereal Expenses — Project Introduction Report

> **Formerly known as BEIS (Behavioral Economics Intelligence System)**
> Backend codename: **AtomicShift v3.0**

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [The Problem It Solves](#2-the-problem-it-solves)
3. [What Is Ethereal Expenses?](#3-what-is-ethereal-expenses)
4. [System Architecture Overview](#4-system-architecture-overview)
5. [Technology Stack](#5-technology-stack)
6. [Core Features](#6-core-features)
7. [The Intelligence Pipeline (How It Thinks)](#7-the-intelligence-pipeline-how-it-thinks)
8. [AI Engines — A Breakdown](#8-ai-engines--a-breakdown)
9. [Real-World Scenarios It Addresses](#9-real-world-scenarios-it-addresses)
10. [Data Privacy & Security Model](#10-data-privacy--security-model)
11. [What Makes It Different](#11-what-makes-it-different)
12. [Project Status & Scope](#12-project-status--scope)

---

## 1. Executive Summary

Ethereal Expenses is a **behavioral finance intelligence platform** built as a mobile-first application. It combines a React Native (Expo) frontend with a FastAPI Python backend powered by a Large Language Model (LLM) via NVIDIA's NIM API.

Unlike traditional expense trackers that function as glorified ledgers, Ethereal Expenses treats financial data as a proxy for **human behavior and psychology**. It analyzes spending patterns through 8 specialized AI engines, runs a 13-step intelligence pipeline per user, and generates personalized behavioral narratives using Qwen 3 — a state-of-the-art reasoning LLM.

The goal is not just to track money. It is to understand and change the **habits and emotional triggers** behind how money is spent.

---

## 2. The Problem It Solves

### The Gap in Existing Tools

Personal finance applications have long suffered from the same fundamental flaw: they are **retrospective, not behavioral**. Apps like Mint, YNAB, or standard bank dashboards tell you *what* you spent and *where*, but they stop there. They do not ask *why* you spent it, *when* you were most vulnerable to overspending, or *what kind of spender* you are psychologically.

This creates three major real-world failure modes for users:

| Failure Mode | What Happens |
|---|---|
| **Budgeting Fatigue** | A rigid ₹5,000 dining budget is broken by day 15. The user feels defeated, stops tracking entirely, and the app becomes useless. |
| **Emotional Spending Blindness** | A user buys ₹800 worth of snacks at midnight after a stressful day — categorized as "Food." The behavioral trigger (stress, boredom) is invisible to the app. |
| **No Long-Term Identity Signal** | Users have no way to know if they are *actually improving* over months. Month-to-month data is noisy and lacks psychological continuity. |

Ethereal Expenses was built specifically to eliminate these failure modes.

---

## 3. What Is Ethereal Expenses?

Ethereal Expenses is a two-part system:

- **`beis_mobile`** — A cross-platform mobile application (iOS/Android) built with React Native and Expo. This is what the user interacts with daily.
- **`beis_backend`** — A Python FastAPI server (AtomicShift v3.0) that handles all intelligence computation, data storage, and LLM communication.

At its core, the platform does the following:

1. The user logs expenses manually (with optional mood tagging) or imports them.
2. The backend continuously analyzes the rolling 90-day transaction window.
3. An 8-engine AI pipeline computes behavioral signals — risk, identity, momentum, anomalies, and more.
4. These compressed signals are passed to a Qwen 3 LLM, which generates a personalized **behavioral narrative** — a plain-language explanation of the user's financial psychology.
5. The mobile app presents this analysis, along with actionable insights, spending streaks, impulse guards, and a conversational AI assistant.

---

## 4. System Architecture Overview

```
┌──────────────────────────────────────────────────────┐
│                   MOBILE CLIENT                       │
│           React Native (Expo) — beis_mobile           │
│                                                        │
│  ┌─────────┐  ┌──────────┐  ┌──────────┐  ┌───────┐  │
│  │ Expenses│  │Insights/ │  │ AI Chat  │  │Profile│  │
│  │   Tab   │  │Analytics │  │   Hub    │  │ & Data│  │
│  └────┬────┘  └────┬─────┘  └────┬─────┘  └───┬───┘  │
│       │            │             │             │       │
│  Redux Toolkit + TanStack React Query (cache + sync)  │
└───────┼────────────┼─────────────┼─────────────┼──────┘
        │  REST API  │             │  WebSocket  │
        ▼            ▼             ▼             ▼
┌──────────────────────────────────────────────────────┐
│              FASTAPI BACKEND (AtomicShift v3.0)       │
│                      beis_backend                     │
│                                                        │
│   /expenses    /intelligence   /chat    /features     │
│   /insights    /anomalies      /risk    /recurring    │
│   /momentum    /identity       /splits  /benchmarks   │
│                                                        │
│  ┌────────────────────────────────────────────────┐   │
│  │         13-STEP INTELLIGENCE PIPELINE          │   │
│  │                                                │   │
│  │  Transactions → Brain → Identity → Anomaly    │   │
│  │  → Behavior Shift → Momentum → Lifestyle      │   │
│  │  → Risk → Adaptive Thresholds → Compressor    │   │
│  │  → LLM (NVIDIA NIM / Qwen 3) → Narrative      │   │
│  └────────────────────────────────────────────────┘   │
│                                                        │
│   MongoDB Atlas (documents)   Redis (response cache)  │
└──────────────────────────────────────────────────────┘
        │
        ▼
┌──────────────────────────────────────────────────────┐
│              NVIDIA NIM API (External)                │
│              Model: Qwen 3 (reasoning LLM)            │
└──────────────────────────────────────────────────────┘
```

### Data Flow Summary

1. User adds an expense on the mobile app.
2. The app sends a `POST /expenses` request to the backend; cache is invalidated.
3. On the Insights screen, the app calls `GET /intelligence`.
4. The backend checks Redis. On cache miss, it runs the full 13-step pipeline.
5. The pipeline output (compressed behavioral signals) is sent to NVIDIA NIM.
6. The LLM returns a personalized narrative + reasoning chain.
7. Result is stored in MongoDB's `intelligence_history` collection and Redis cache.
8. A WebSocket event (`intelligence_ready`) is pushed to the mobile client.
9. The app updates in real time.

---

## 5. Technology Stack

### Mobile (`beis_mobile`)

| Layer | Technology |
|---|---|
| Framework | React Native with Expo (file-based routing via Expo Router) |
| State Management | Redux Toolkit (global auth + preferences) |
| Server State & Caching | TanStack React Query (API caching, background refresh, optimistic updates) |
| Styling | NativeWind (Tailwind CSS for React Native) |
| Design Theme | "Obsidian Orchard" — `#131313` base, `#CCC989` gold accents |
| Animations | React Native Reanimated |
| Local Storage | AsyncStorage (streak data, impulse log — offline-capable) |
| Notifications | Expo Notifications (scheduled follow-up reminders) |
| Build / Distribution | EAS (Expo Application Services) |

### Backend (`beis_backend`)

| Layer | Technology |
|---|---|
| Framework | Python — FastAPI (async, high-performance) |
| Database | MongoDB Atlas via Beanie ODM (async document ODM) |
| Cache Layer | Redis (TTL-based per-user cache invalidation) |
| LLM / AI | NVIDIA NIM API — Qwen 3 reasoning model |
| Data Processing | Pandas + NumPy (90-day rolling window analytics) |
| Authentication | JWT Bearer tokens |
| Real-time | WebSocket (FastAPI native) |
| Containerization | Docker + docker-compose |
| Testing | Pytest |

---

## 6. Core Features

### 6.1 Expense Logging with Mood Tagging
The most fundamental feature. Users log expenses with an amount, category (25 supported categories), description, and an optional **mood tag** (`happy`, `neutral`, `stressed`, `frustrated`, `tired`). The mood tag is not cosmetic — it feeds directly into the backend's behavioral analysis to reveal correlations between emotional states and spending amounts.

### 6.2 Behavioral Intelligence Narrative
The flagship feature. On demand, the backend runs all 8 AI engines and passes the compressed behavioral signals to the Qwen 3 LLM. The LLM returns a personalized, plain-language narrative explaining the user's financial behavior — not generic advice, but analysis grounded in the user's own spending patterns, timing, categories, and psychological profile. It reads like a report from a financial psychologist.

### 6.3 AI Chat Hub (Conversational Finance Assistant)
A conversational interface where users can ask direct questions about their own spending. The assistant is powered by Qwen 3 and is grounded with a real-time financial context payload (recent transactions, category breakdown, thresholds, momentum, identity). It is instructed to never fabricate numbers — only reference data that actually exists. Example interactions:
- *"Why am I always overspending on weekends?"*
- *"How does my dining spending compare to last month?"*
- *"What should I cut to save ₹5,000 this month?"*

### 6.4 Impulse Purchase Guard
A behavioral friction tool. Before making an unplanned purchase, the user logs the item in the Impulse Log with its estimated cost and their current mood. The app then schedules a push notification 15 minutes later asking: *"Did you buy it?"* If the user marks it as **Resisted**, the app celebrates and logs the money saved. This creates a pause-and-reflect mechanism directly inspired by behavioral economics research on the "cooling-off" effect. Lifetime stats track total impulse items logged, resisted, bought, and total money saved by resisting.

### 6.5 Spending Streak Tracker with Badge System
A gamification layer that tracks consecutive days where the user stays at or below their daily spending threshold. The system is forgiving: days with zero expenses count as streak days (not spending is not a failure). Seven milestone badges are awarded at 1, 3, 7, 14, 30, 60, and 100 consecutive days:

| Badge | Requirement |
|---|---|
| 🌱 First Step | 1 day |
| ⚡ Getting Going | 3 days |
| 🔥 Week Warrior | 7 days |
| 💪 Steady Hand | 14 days |
| 🏆 Budget Master | 30 days |
| 🛡️ Iron Will | 60 days |
| 👑 Legendary | 100 days |

### 6.6 Mood-Correlation Analysis
A dedicated analytics endpoint that computes average spend per mood state. If a user tags their purchases, the system can definitively show: *"Your average spend when stressed (₹1,240) is 3.1× your average spend when neutral (₹400)."* This gives users hard data about their own emotional spending patterns rather than anecdotal self-awareness.

### 6.7 Recurring Expense Detection
An automatic subscription and recurring payment detector. The backend scans the last 180 days of transactions, groups by description + approximate amount, and identifies patterns with consistent intervals (weekly, bi-weekly, monthly, bi-monthly, quarterly). For each detected recurring expense it shows: frequency, monthly cost, annual cost, last occurrence, and next expected date. The total monthly and annual recurring burn rate is surfaced as a summary — this often surprises users who don't realize how many subscriptions are silently running.

### 6.8 Split Expense Tracker
A shared expense management system for social spending. Users can create a split with a title, total amount, their own share, and a list of participants with individual share amounts. The system tracks who has settled and who still owes money, showing outstanding amounts. Optionally, the user's share is automatically recorded as a transaction, keeping the expense history accurate without double-entry.

### 6.9 Peer Benchmarks
Anonymized community comparison. The backend aggregates all users' 30-day spending data and computes community averages and medians. The current user's spending is placed in percentile rank — showing how their total and category-level spending compares to the broader user base. No individual data is ever exposed; only aggregated statistics are used. This gives users external context for whether their spending levels are typical or outliers.

### 6.10 Adaptive Spending Thresholds
Dynamic budget limits that are computed by the AI pipeline rather than set rigidly by the user. The Adaptive Threshold Engine analyzes the user's historical patterns, risk score, and spending velocity to suggest appropriate daily, weekly, and monthly limits. Users can also override these with manual goals. When thresholds are breached, they feed into the anomaly and risk scores rather than simply showing a red bar.

---

## 7. The Intelligence Pipeline (How It Thinks)

The pipeline is a **13-step sequential computation** triggered per user, operating on a 90-day rolling transaction window. It is designed to be entirely stateless per run — each step feeds its output into the next.

```
Step 1  → Load behavioral memory (baseline from previous runs)
Step 2  → Fetch transactions from MongoDB (all-time, soft-deleted excluded)
Step 3  → Apply 90-day window filter → produce analysis DataFrame
Step 4  → Behavioral Brain Engine (18 statistical features)
Step 5  → Identity Engine (12-archetype classification)
Step 6  → Anomaly Engine (6 detection algorithms)
Step 7  → Behavior Shift Engine (first-half vs second-half comparison)
Step 8  → Momentum Engine (velocity, acceleration, direction)
Step 9  → Lifestyle Engine (discretionary ratio, social patterns)
Step 10 → Risk Engine (composite 0-100 score, 7 boolean flags)
Step 11 → Adaptive Threshold Engine (dynamic budget limits)
Step 12 → Behavioral Signal Compressor (reduces all signals to LLM-ready payload)
Step 13 → NVIDIA NIM / Qwen 3 LLM → Narrative + reasoning chain
```

**Data Maturity System:** The pipeline is disabled below a minimum transaction count. As data grows, the system moves through maturity phases:
- `insufficient` — not enough data yet (shows progress percentage)
- `bootstrap` — early analysis, low confidence
- `early` — meaningful patterns forming
- `optimal` — full analytical confidence

This prevents the system from producing misleading insights on sparse data.

---

## 8. AI Engines — A Breakdown

### Behavioral Brain (Foundation Layer)
Computes **18 statistical features** from the 90-day transaction window. These are the raw numerical signals that all other engines consume:
- Core stats: median, mean, standard deviation, coefficient of variation (CV ratio)
- Rolling windows: 7-day and 30-day spend totals
- Transaction frequency (per week)
- Spend acceleration (first-half vs second-half average comparison)
- Category distribution (percentage of total by category)
- Time-of-day pattern (morning / afternoon / evening / night / late_night distribution)
- Social spend ratio, discretionary spend ratio
- Daily spend velocity (₹/day)

### Identity Engine (Who Are You Financially?)
Classifies the user into **12 behavioral archetypes** with confidence scores:

| Archetype | Trigger Condition |
|---|---|
| `volatility_prone` | High CV ratio (erratic spending) |
| `high_discretionary_spender` | >30% of spend on non-essentials |
| `social_spender` | >15% in dining/entertainment/alcohol/gifts |
| `spend_accelerating` | Positive acceleration trend |
| `impulsive_spender` | High night spending + high volatility |
| `routine_spender` | Low CV + low acceleration |
| `frugal_disciplined` | Low median + essential-category dominant |
| `stress_spender` | High late-night + high variance |
| `comfort_spender` | Comfort categories dominant (food, coffee, personal care) |
| `binge_spender` | CV > 1.0 + positive acceleration |
| `status_spender` | Status categories (electronics, travel, dining out) + high median |
| `reluctant_spender` | Low variance + decelerating |

The engine also computes an **Impulsivity Index** (0–1) and **Self-Control Score** (0–1), and tracks Identity Stability by comparing against the behavioral memory baseline — flagging if the user's financial personality is shifting or volatile.

### Anomaly Engine (What Is Unusual?)
Six independent detection algorithms run in parallel:

1. **IQR Outlier Detection** — Transactions above the Q3+1.5×IQR fence
2. **Extreme Transaction Ratio** — Individual transactions >5× the user's median
3. **Daily Spending Spike** — Days where total spend exceeds mean + 2.5 standard deviations
4. **Category Surge** — A category's 7-day spend exceeds 2.5× its historical weekly average
5. **Threshold Breach** — Daily total exceeds the user's set or adaptive daily limit
6. **Frequency Anomaly** — Unusual clustering of transactions in a 6-hour block

Each anomaly is severity-rated (`mild` / `moderate` / `severe`) and persisted to the `anomaly_logs` MongoDB collection for historical trend analysis. Recurrence across anomaly types within the same analysis triggers a `recurrence_flag`.

### Behavior Shift Engine
Splits the 90-day window into two halves and computes directional spending shifts — detecting whether the user is entering a higher-spend phase, cooling down, or spiking in specific categories.

### Momentum Engine
Calculates spending **velocity** (₹/day rate), **acceleration** (rate of change of velocity), and **direction** (`accelerating`, `decelerating`, `stable`). Also computes 30-day spend projection. This is the engine that answers: *"At this rate, where will I be at month-end?"*

### Lifestyle Engine
Tracks discretionary spending ratios and social spending patterns to detect **lifestyle inflation** — the gradual increase in spending that accompanies income growth or social pressure.

### Risk Engine (Composite Score)
Produces a **0–100 risk score** with a weighted formula:

| Component | Weight |
|---|---|
| Spending volatility (CV ratio) | 30% |
| Spend acceleration | 25% |
| Anomaly cluster density | 20% |
| Lifestyle inflation signal | 15% |
| Budget threshold breach | 10% |

Risk levels: `safe` (0–24) → `watch` (25–49) → `concern` (50–74) → `danger` (75–100)

Seven boolean risk flags are set independently: `high_volatility`, `rapid_acceleration`, `anomaly_cluster`, `lifestyle_inflation`, `budget_breach`, `recurring_anomaly`, `identity_unstable`.

### Adaptive Threshold Engine
Uses the behavioral brain data and risk score to compute personalized daily/weekly/monthly spending limits that reflect the user's actual historical baseline — not arbitrary round numbers.

---

## 9. Real-World Scenarios It Addresses

### Scenario A: The Late-Night Stress Buyer
A user regularly makes purchases at 11 PM after stressful days — food delivery, impulse shopping, gaming credits. A standard app categorizes these as "Food" and "Entertainment." Ethereal Expenses detects the `late_night_dominant` time pattern, high CV ratio, and flags the `stress_spender` and `impulsive_spender` archetypes. The LLM narrative surfaces this: *"A significant portion of your spending occurs after 9 PM. Your highest-variance transactions cluster in late-night hours, which correlates with emotional rather than planned spending."*

### Scenario B: The Invisible Subscription Drain
A user is paying for Netflix, Spotify, two SaaS tools, a gym membership, and an old domain renewal — totaling ₹4,200/month — but has no single-screen view of this. The Recurring Expense Detector identifies all five patterns within the 180-day window and presents them as a ₹4,200/month, ₹50,400/year liability with next expected dates for each.

### Scenario C: The Budget-Broken Quitter
A user sets a ₹3,000 dining budget. By the 18th of the month, they've spent ₹3,400. In YNAB or Mint, they see a red bar and feel defeated. In Ethereal Expenses, the Adaptive Threshold Engine recalibrates based on their behavioral pattern. The Momentum Engine shows deceleration in the last 5 days. The narrative might read: *"Your dining acceleration has slowed significantly in the past week. Maintaining current velocity will keep monthly totals within a manageable range."* Instead of guilt, the user gets context.

### Scenario D: The Social Spender Who Doesn't Know It
A user sees their monthly total and wonders why it's always high. The Identity Engine flags `social_spender` (>22% of total in dining/entertainment/alcohol). The Mood Correlation analysis shows their average spend when tagged "happy" is 2.8× their baseline. The AI chat answers: *"Your dining-out and entertainment categories account for 22% of your 90-day spend — roughly ₹6,200/month. This is significantly above your community benchmark for these categories."*

### Scenario E: The Impulse Decision Point
A user is in a store about to buy headphones for ₹7,500 that are not in their budget. They open Ethereal Expenses, log the item in the Impulse Guard under the "electronics" category with mood "excited", and put their phone away. Fifteen minutes later they get a notification: *"🤔 Did you buy it? You logged headphones (₹7,500) 15 minutes ago. Still want it?"* They decide not to. The app celebrates, logs it as a resistance, and adds ₹7,500 to their total lifetime savings from impulse control.

---

## 10. Data Privacy & Security Model

- **JWT Authentication** — All API endpoints require Bearer token authentication. Tokens are scoped per user and validated on every request.
- **Soft Deletion** — Transactions are never hard-deleted from the database. The `is_deleted` flag ensures data integrity and allows recovery, while the user can permanently purge through a password-gated protocol.
- **Cache Isolation** — Each user's Redis cache entries are keyed by user ID. On logout, the mobile app performs mandatory React Query cache purges to prevent session leaks between users on shared devices.
- **LLM Data Minimization** — The behavioral signal compressor reduces raw transaction data to aggregated statistical features before sending to the LLM. Individual transaction descriptions are not sent verbatim.
- **Anonymous Benchmarks** — The peer benchmark system aggregates data across all users. No individual user's data is retrievable from the benchmark endpoint; only community-level averages and percentiles are exposed.
- **Data Export** — Users can export their full transaction history and behavioral memory through a dedicated data portal.

---

## 11. What Makes It Different

| Capability | Traditional Expense App | Ethereal Expenses |
|---|---|---|
| Primary function | Ledger / categorization | Behavioral pattern analysis |
| Budget model | Fixed monthly limits | Adaptive, pattern-derived thresholds |
| Insight type | "You spent ₹4,200 on Food" | "You spend 2.8× more when stressed late at night" |
| Anomaly detection | None | 6-algorithm statistical anomaly engine |
| User identity | Not tracked | 12-archetype financial identity profile |
| Peer comparison | None | Anonymous percentile benchmarks |
| Impulse control | None | Cooling-off impulse guard with notifications |
| Recurring detection | Manual tagging | Automatic interval-based pattern detection |
| AI model | None or rule-based | Qwen 3 reasoning LLM via NVIDIA NIM |
| Long-term tracking | Month-to-month charts | Behavioral memory baseline with stability tracking |
| Communication | Push notifications | Conversational AI chat + real-time WebSocket |

---

## 12. Project Status & Scope

**Stage:** Fully functional working prototype with production-grade architecture.

**What is complete:**
- Full expense CRUD with mood tagging
- 13-step behavioral intelligence pipeline
- All 8 AI engines (brain, identity, anomaly, behavior shift, momentum, lifestyle, risk, thresholds)
- LLM narrative generation via NVIDIA NIM / Qwen 3
- AI Chat Hub with financial context grounding
- Impulse Purchase Guard with push notification follow-up
- Spending Streak tracker with 7-badge progression system
- Mood-spend correlation analysis
- Recurring expense auto-detection
- Split expense tracking with settlement tracking
- Anonymized peer benchmarks
- WebSocket real-time pipeline completion events
- Redis caching with per-user TTL invalidation
- MongoDB Atlas persistence with 6 collections
- JWT authentication
- Docker containerization

**What this is not (yet):**
- Automatic bank/card transaction import (entry is currently manual or receipt scan)
- A deployed production service with live users

**Intended Audience:** Individual users who want to understand not just what they spend, but *why* — and who want a tool that actively helps them build better financial habits rather than simply record the consequences of bad ones.

---

*Report generated from source analysis of the `beis_backend` (AtomicShift v3.0) and `beis_mobile` codebases.*
