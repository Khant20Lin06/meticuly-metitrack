# MetiTrack — Architectural Decision Records (`docs/DECISIONS.md`)

## ADR-001: Domain Selection — Patient-Specific Titanium Implant Manufacturing
- **Date:** 2026-11-03
- **Status:** Accepted
- **Context:** The preliminary assignment allowed unrestricted domain creation ("Step A -> Step B -> Step C").
- **Decision:** Model the platform directly around Meticuly's real-world business: Patient-Specific Implants (PSI) using 3D additive titanium printing, CNC post-processing, and ISO 13485 medical device QA.
- **Consequences:** Directly demonstrates domain understanding to Meticuly's engineering leadership while fulfilling all generic tracking requirements.

---

## ADR-002: Dedicated `/advance/` RPC-style Endpoint over Generic `PATCH`
- **Date:** 2026-11-03
- **Status:** Accepted
- **Context:** An order advances sequentially and consumes resources atomically.
- **Decision:** Instead of exposing a loose `PATCH /api/orders/{id}/` where a client could arbitrarily set `current_step_id = 4`, expose an explicit `POST /api/orders/{id}/advance/` endpoint.
- **Consequences:**
  - Enforces strict sequential validation in the domain model.
  - Ensures atomic database transaction between step transition and resource consumption logging.
  - Records an immutable audit log for medical traceability.

---

## ADR-003: Database Strategy — Zero-Friction SQLite for Dev, PostgreSQL for Production/Docker
- **Date:** 2026-11-03
- **Status:** Accepted
- **Context:** Reviewers have limited time and may test locally with or without Docker installed.
- **Decision:** Configure Django settings to automatically use PostgreSQL when `DATABASE_URL` or Docker environment variables exist, but seamlessly fall back to a self-contained SQLite file populated with seed data for direct local execution (`python manage.py runserver`).
- **Consequences:** Zero installation headaches for reviewers, while maintaining full enterprise-grade Docker PostgreSQL compatibility.

---

## ADR-004: RBAC with Mock SSO Role Switcher
- **Date:** 2026-11-03
- **Status:** Accepted
- **Context:** Full OAuth2/OpenID Connect setup requires external client IDs/secrets that fail in offline or reviewer environments.
- **Decision:** Implement Role-Based Access Control (RBAC) with 4 roles (`Biomedical Engineer`, `Production Operator`, `QA Specialist`, `Admin`) accompanied by a top-bar "Quick Role Switcher" in the UI.
- **Consequences:** Demonstrates deep understanding of RBAC permissions and healthcare user personas without requiring the reviewer to configure external OAuth credentials.
