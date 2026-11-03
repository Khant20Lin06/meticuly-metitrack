# MetiTrack — Living Progress & Task Tracker (`docs/PROGRESS.md`)

## 1. Project Health & Milestones Overview

| Milestone | Scope | Status | Completion Date |
| :--- | :--- | :---: | :--- |
| **M1: Foundations & Architecture** | Living docs (`AGENTS.md`, `SPEC.md`, `ARCHITECTURE.md`, `PROGRESS.md`, `DECISIONS.md`) | `[x] Done` | Nov 3, 2026 |
| **M2: Backend Core (DRF + Models)** | Django setup, models, sequential transition engine, resource logging, seed data | `[x] Done` | Nov 3, 2026 |
| **M3: Backend Testing & Verification** | Pytest test suite for step validation, atomic transitions, resource aggregations | `[x] Done` | Nov 3, 2026 |
| **M4: Frontend UI (Next.js + Tailwind)** | Pipeline Kanban board, Advance step modal, Create order dialog, TanStack Query | `[x] Done` | Nov 3, 2026 |
| **M5: Analytics & Traceability** | Recharts resource consumption dashboard, ISO 13485 audit trail timeline, RBAC switcher | `[x] Done` | Nov 3, 2026 |
| **M6: Containerization & CI/CD** | `docker-compose.yml`, Dockerfiles, GitHub Actions CI workflow | `[x] Done` | Nov 3, 2026 |
| **M7: Deliverables & 1-Page Summary** | 1-page written assignment summary, README setup guide, demo documentation | `[x] Done` | Nov 3, 2026 |

---

## 2. Granular Task Checklist

### Milestone 1: Specifications & Living Documentation
- [x] Create project workspace `cv prepare/meticuly/`
- [x] Create `AGENTS.md` (AI & Contributor guidelines, coding principles, boundaries)
- [x] Create `docs/SPEC.md` (Meticuly domain requirements, 5 production steps, resource definitions)
- [x] Create `docs/ARCHITECTURE.md` (ERD, Mermaid architecture, REST API contracts)
- [x] Create `docs/DECISIONS.md` (Initial ADR records)
- [x] Create `docs/PROGRESS.md` (Living tracking document)

### Milestone 2: Django REST Framework Backend
- [x] Initialize Python virtual environment & Django project (`backend/`)
- [x] Implement `ProcessStep` model & migration (5 sequential steps)
- [x] Implement `Resource` model & migration (Titanium, Machine time, Labor)
- [x] Implement `Order` model & state machine (Status choices, current step FK)
- [x] Implement `OrderResourceConsumption` & `OrderStepLog` models (Audit trail)
- [x] Create Database Seed Script (`seed_data.py`) with realistic Meticuly PSI cases
- [x] Implement DRF Serializers & ViewSets:
  - `GET/POST /api/orders/`
  - `POST /api/orders/{id}/advance/` (with strict transition validation & atomic resource logging)
  - `GET /api/steps/`
  - `GET /api/resources/`
  - `GET /api/analytics/overview/`
  - `GET /api/audit-logs/`

### Milestone 3: Automated Testing (Backend)
- [x] Write `pytest` test suite (`manufacturing/tests/test_manufacturing_api.py`):
  - [x] Test sequential advancement: Step 1 -> Step 2 succeeds
  - [x] Test illegal jump: Step 1 -> Step 3 prohibited
  - [x] Test completion: Step 5 advance sets order to `COMPLETED`
  - [x] Test negative/invalid resource quantities rejected
  - [x] Test atomic rollback if resource consumption logging fails
  - [x] Test analytics aggregation calculations (100% 6/6 passed)

### Milestone 4: Next.js Frontend Pipeline
- [x] Initialize Next.js 16 (App Router, TypeScript, Tailwind CSS)
- [x] Setup TanStack Query client & API client layer (`lib/api.ts`)
- [x] Build Header & Navigation with Mock Role Switcher (`components/Navbar.tsx`)
- [x] Build Manufacturing Kanban Pipeline Board (`components/PipelineBoard.tsx`)
- [x] Build Order Card component with priority badge, patient ref, and quick metrics (`components/OrderCard.tsx`)
- [x] Build "Advance Step & Log Resources" Modal (`components/AdvanceModal.tsx`)
- [x] Build "New Implant Order" Modal (`components/CreateOrderModal.tsx`)

### Milestone 5: Analytics & Medical Traceability
- [x] Implement Recharts Dashboard (Total Titanium powder consumed, Machine utilization hours, Orders per step) (`components/AnalyticsView.tsx`)
- [x] Implement Order Traceability & Audit Timeline Drawer (ISO 13485 compliant view) (`components/TraceabilityModal.tsx`)
- [x] Role-Based Access Control (RBAC) UI indicators (Biomedical Lead, Production Operator, QA Inspector)

### Milestone 6: Dockerization & DevOps
- [x] Create `backend/Dockerfile`
- [x] Create `frontend/Dockerfile`
- [x] Create root `docker-compose.yml` (Frontend + Backend + PostgreSQL)
- [x] Create `.github/workflows/ci.yml` for automated tests and build checks

### Milestone 7: Final Deliverables & 1-Page Summary
- [x] Author `docs/1-PAGE-SUMMARY.md` addressing the 5 exact prompts from Meticuly HR
- [x] Author root `README.md` with clear architecture, setup instructions, and badges

---

## 3. Change & Decision Log
- **2026-11-03 12:18:** Milestone 1 completed. Initialized enterprise living documentation (`AGENTS.md`, `SPEC.md`, `ARCHITECTURE.md`, `PROGRESS.md`, `DECISIONS.md`).
- **2026-11-03 12:28:** Milestone 2 & 3 completed. Implemented Django models, migrations, serializers, seed data, and DRF viewsets with atomic transitions. Verified with 6/6 passing Pytest test cases.
- **2026-11-03 12:57:** Milestone 4 & 5 completed. Built Next.js 16 frontend with interactive 5-station Kanban board, advance step modal, Recharts analytics telemetry, and ISO 13485 medical traceability audit modal. Verified with `npm run build` passing with zero errors.
- **2026-11-03 13:00:** Milestone 6 & 7 completed. Configured `docker-compose.yml`, Dockerfiles, GitHub Actions CI workflow, `README.md`, and the required `docs/1-PAGE-SUMMARY.md` submission document.
- **2026-11-03 14:05:** Overhauled Enterprise UI & added 2 Game-Changer features:
  - Fixed Left Sidebar with official Meticuly 3D implant logo and station hardware telemetry.
  - Interactive 3D Medical Titanium Implant Viewer via Three.js (rotating meshes, wireframe toggle, anatomical specs).
  - Automated Medical Device UDI sterile barrier package label & barcode generator (ISO 13485 & FDA 21 CFR 830).
  - Verified with `npm run build` passing with zero compilation or TypeScript errors.
- **2026-11-03 23:58:** Authored `docs/DOMAIN_SPECIFICATION.md` categorizing the entire MES architecture into Clean Architecture domains: CRUD/Persistence Domain, Business Logic / Invariants Domain, and Feature / Application Presentation Domain.
- **2026-11-04 00:20:** Major UI/UX Overhaul & Backend Hardening (Metronic 9 + Linear Zen Minimalist Design):
  - **Identified & Eliminated Visual Fatigue:** Deconstructed cramped `grid-cols-5` layout that caused text wrapping (e.g. `CAS-` / `2026-083`) and excessive cognitive clutter.
  - **Slim 68px Icon Sidebar (Metronic Keen Style):** Reclaimed 200px of horizontal real estate with sleek icon tooltips, plant status, and operator badge.
  - **Horizontal Scrollable Columns (`w-[340px] fixed`):** Unconstrained breathing room for all 5 stations (`3D CAD`, `SLM Printing`, `CNC Post-Processing`, `ISO 13485 QA`, `Labelling & Packaging`).
  - **Linear Zen Minimalist Cards:** Case ID, patient tag, implant category badge, resource summary, and a single smooth `Advance →` action.
  - **Slide-over Offcanvas Drawer (Metronic pattern):** Houses the 3D WebGL Titanium mesh viewer (Three.js), itemized resource ledger, ISO 13485 DHR audit timeline, and hospital UDI barcode.
  - **Backend Service Hardening:** Added row-level concurrency locking (`select_for_update()`) and atomic inventory stock deduction with over-consumption validation.
  - **Verification:** 7/7 Pytest tests passing in 0.39s. Next.js 16 build verified with zero errors. Live servers active on port 8000 (Backend) and port 3001 (Frontend).

