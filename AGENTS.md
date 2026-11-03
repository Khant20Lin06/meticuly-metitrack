# MetiTrack — AI Agent & Developer Guidelines (`AGENTS.md`)

## 1. Project Overview & Context
- **Project Name:** MetiTrack (Meticuly Manufacturing Process & Resource Tracking System)
- **Domain:** Patient-Specific Implant (PSI) Medical Additive Manufacturing (Orthopedic & Cranio-maxillofacial 3D titanium implants).
- **Core Purpose:** Traceable multi-step manufacturing workflow tracking, sequential order state management, resource consumption monitoring (materials, machine time, labor), and regulatory audit logging (ISO 13485 / HIPAA / PDPA compliant concepts).

---

## 2. Tech Stack & Standards
- **Backend:** Python 3.13, Django 5.x, Django REST Framework (DRF), Celery + Redis (optional async tasks), SQLite (dev/standalone) / PostgreSQL (docker).
- **Frontend:** Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS, Lucide React, Recharts, TanStack Query, React Hook Form, Zod.
- **Testing:** Pytest (Backend unit/API tests), Jest/Playwright (Frontend E2E/component tests).
- **DevOps:** Docker, Docker Compose, GitHub Actions CI.

---

## 3. The Living Documentation Protocol (Mandatory)
Every AI agent and human engineer working on this codebase **MUST** follow this protocol:

1. **Before writing code:**
   - Check `docs/PROGRESS.md` to see the current active milestone and task.
   - Mark the targeted task as `[/] In-Progress`.
2. **While writing code:**
   - Adhere strictly to schemas in `docs/SPEC.md` and architecture in `docs/ARCHITECTURE.md`.
   - Write tests alongside feature code (TDD / Verification).
3. **After code is verified:**
   - Update `docs/PROGRESS.md` marking the task as `[x] Done`, linking the modified files.
   - If any architectural decision or data model changed, update `docs/ARCHITECTURE.md` and log an entry in `docs/DECISIONS.md`.
   - Never leave `docs/PROGRESS.md` out-of-sync with actual code state.

---

## 4. Directory Structure
```text
meticuly/
├── AGENTS.md                  # This rulebook
├── README.md                  # Setup and execution guide for reviewers
├── docker-compose.yml         # 1-command local deployment
├── docs/
│   ├── SPEC.md                # Functional specifications & domain entities
│   ├── ARCHITECTURE.md        # Technical design, ERD, API contracts
│   ├── PROGRESS.md            # Living state of tasks & milestones
│   ├── DECISIONS.md           # Architectural Decision Records (ADRs)
│   └── 1-PAGE-SUMMARY.md      # Executive 1-page assignment submission report
├── backend/                   # Django REST Framework backend
│   ├── manage.py
│   ├── core/                  # Project configuration & settings
│   └── apps/                  # Modular domain apps
│       ├── orders/            # Order state machine & tracking
│       ├── manufacturing/     # Sequential steps & execution logs
│       ├── resources/         # Resources & consumption tracking
│       └── audit/             # ISO 13485 compliance audit logs
└── frontend/                  # Next.js App Router frontend
    ├── src/
    │   ├── app/               # Next.js pages & layouts
    │   ├── components/        # Reusable UI & domain components
    │   ├── lib/               # API clients, utils, formatters
    │   └── types/             # Strict TypeScript domain interfaces
```

---

## 5. Coding Principles & Quality Standards
- **Clean Code & SOLID:** Single responsibility per module, explicit dependency injection, clear naming without abbreviations.
- **Strict Typing:** No `any` types in TypeScript. Strict serializers and type hints in Python.
- **No Hardcoded Magic Strings:** Use Python `TextChoices` / Enums for Order Status, Step Types, and Priority.
- **Auditability:** Every state transition (`advance`) must capture `timestamp`, `operator`, `order_id`, and `consumed_resources`.
- **Zero-Friction Execution:** The project MUST run cleanly with a single command (`docker compose up` or local `npm run dev` + `python manage.py runserver`).
