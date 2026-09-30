# CoachOS: Master Specifications & Blueprints

Welcome to the **CoachOS** V1 specifications repository. CoachOS is a mobile-first, AI-powered coaching operating system designed for online fitness coaches to personalize, track, and scale their programs with zero friction.

To maintain documentation integrity, reduce duplication, and guarantee consistency, all specifications are consolidated into **four core files**:

## 1. [Product Master Blueprint (product_blueprint.md)](file:///Users/viswanthsai/Documents/Projects/Personal/Trainova/docs/product_blueprint.md)
* **Vision & Positioning:** 100% Mobile PWA strategy for both clients and trainers.
* **Core Functional Modules:** Detailed workflows for Dashboard (Feed), Clients, Plans, and AI Coach.
* **End-to-End User & Data Flows:** Visual mappings of invitations, check-ins, progressive overload logs, and alert messaging.
* **Advanced UX Resiliences:** Offline gym cache, plateau detection, deload triggers, photo swipe comparators, and typo safeguards.

## 2. [Technical & Database Blueprint (technical_blueprint.md)](file:///Users/viswanthsai/Documents/Projects/Personal/Trainova/docs/technical_blueprint.md)
* **Technology Stack:** Next.js, Supabase, Prisma, and Gemini/OpenAI SDK configurations.
* **Database Models (Prisma Schema):** Fully updated entities supporting phone invite authentication, daily nutrition logs, steps/cardio logs, weekly photo set groupings, and historical target snapping (nutrition metrics and training weights).
* **API Endpoints & Sync:** Complete route handler layouts, PWA local IndexedDB background replication pipelines.
* **AI Prompts & JSON Outputs:** Raw prompt guides for scoring analytics and client conversational tool schemas.

## 3. [Client UI/UX Specification (client_ui_ux.md)](file:///Users/viswanthsai/Documents/Projects/Personal/Trainova/docs/client_ui_ux.md)
* **Design Tokens & System:** Barlow typography import, HSL color palette, spacing, and transition constants.
* **Accessibility Guidelines:** Minimum 44x44px touch targets, iOS keyboard input size constraints, async loading spinner states, and cursor-pointers.
* **Screens Breakdown:** Magic onboarding setup page (`C1`), Today tab dashboard (`C2`), Progress charts/timeline (`C3`), and "Do or Talk" AI chat tabs (`C4`). Includes SVG icon mappings (no emojis).

## 4. [Trainer UI/UX Specification (trainer_ui_ux.md)](file:///Users/viswanthsai/Documents/Projects/Personal/Trainova/docs/trainer_ui_ux.md)
* **Mobile Design Framework:** Sticky bottom nav layout mapping Feed (`T1`), Clients Table (`T2`), Client Profiles (`T3`), Tap & Place Program Canvas (`T4`), and Command Chat Terminals (`T5`).
* **Visual Action Systems:** Tap-to-expand WhatsApp deep link messaging, visual Target vs. Actual comparative matrix logs, and progressive overload incrementor touch controls.

---

## Technical Goal
CoachOS unifies the scattered stack of **Instagram DM + WhatsApp + Google Sheets + Progress Photos** into a fast, mobile portrait interface.
