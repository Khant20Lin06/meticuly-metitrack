# MetiTrack — Manufacturing Process & Resource Tracking System

> **Candidate:** Khant Lin  
> **Position:** Full-stack Software Development Engineer  
> **Company:** Meticuly Co., Ltd. (Bangkok, Thailand)  
> **Ref Code:** 150102  
> **Submission Date:** November 2026  

![Pytest Suite](https://img.shields.io/badge/Pytest-105%2F105%20Passed%20(100%25)-brightgreen?style=flat&logo=pytest&logoColor=white)
![Vitest Suite](https://img.shields.io/badge/Vitest-28%2F28%20Passed%20(100%25)-brightgreen?style=flat&logo=vitest&logoColor=white)
![Playwright Suite](https://img.shields.io/badge/Playwright-5%2F5%20Passed%20(100%25)-brightgreen?style=flat&logo=playwright&logoColor=white)
![ISO 13485](https://img.shields.io/badge/Compliance-ISO%2013485%3A2016-blue?style=flat)
![FDA 21 CFR Part 11](https://img.shields.io/badge/FDA-21%20CFR%20Part%2011%20%7C%20Part%20820%20%7C%20Part%20830-darkblue?style=flat)
![Django](https://img.shields.io/badge/Django-5.1-092E20?style=flat&logo=django&logoColor=white)
![DRF](https://img.shields.io/badge/DRF-3.15-red?style=flat)
![Next.js](https://img.shields.io/badge/Next.js-16.4%20(Turbopack)-black?style=flat&logo=next.js&logoColor=white)
![React](https://img.shields.io/badge/React-19-61DAFB?style=flat&logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=flat&logo=typescript&logoColor=white)
![Tailwind](https://img.shields.io/badge/Tailwind_CSS-4.0-38B2AC?style=flat&logo=tailwind-css&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?style=flat&logo=docker&logoColor=white)

---

## 🔬 Domain Overview
**MetiTrack** is a specialized Manufacturing Execution System (MES) engineered specifically for **Patient-Specific Implants (PSI)** and medical additive manufacturing (3D printed Titanium cranial plates, acetabular hip cups, mandibular jaw plates, and spinal fusion cages).

The platform enforces strict sequential state-machine transitions across the 5 cleanroom manufacturing stages while tracking **raw titanium powder consumption (grams)**, **additive machine hours (SLM & CNC)**, and **certified labor hours (Biomedical Engineers & QA Specialists)** under **ISO 13485 Device History Record (DHR)** and **US FDA 21 CFR Part 11 / Part 820 / Part 830** standards.

---

## 🏗 Clean Architecture & System Design

```
                  ┌─────────────────────────────────────────────────────────┐
                  │       Domain 3: Cleanroom Presentation Layer            │
                  │              (Next.js 16 + React 19 + TypeScript)       │
                  │  • Feature 1: HIPAA Masked Patient Intake & Triage      │
                  │  • Feature 2: 320px Fixed 5-Station Kanban Pipeline     │
                  │  • Feature 3: Cleanroom Advance Modal (Numerical BOM)   │
                  │  • Feature 4: 480px Slide Drawer & Three.js 3D CAD Mesh │
                  │  • Feature 5: FDA GS1-128 & DataMatrix UDI Print Engine │
                  │  • Feature 6: Factory Telemetry & Bottleneck Dashboard  │
                  │  • Feature 7: High-Density Master Data Table & CSV      │
                  │  • Feature 8: Real-Time Security Audit Stream Table     │
                  └────────────────────────────┬────────────────────────────┘
                                               │ HTTP / REST (JWT / Cookies)
                                               ▼
                  ┌─────────────────────────────────────────────────────────┐
                  │     Domain 2: Business Logic & Invariants Services      │
                  │                (Django REST Framework 3.15)             │
                  │  • OrderService: Strict Sequential Machine (N -> N+1)   │
                  │  • InventoryService: Concurrency Lock & Stock Deduction │
                  │  • CostService: Real-Time Cumulative Financial Ledger   │
                  │  • DHRService: Cryptographic eDHR Compiler & Verifier   │
                  │  • PKIService: NIST FIPS 186-5 ECDSA P-256 Signatures   │
                  │  • PHIEncryptionService: AES-256-GCM PHI at Rest (HIPAA)│
                  │  • RBACService: Zero-Trust Claims-based Role Authority  │
                  │  • SecurityAuditService: Immutable ISO 13485 Audit Log  │
                  │  • CSVExportService: CWE-1236 Formula Injection Defense │
                  └────────────────────────────┬────────────────────────────┘
                                               │
                                               ▼
                  ┌─────────────────────────────────────────────────────────┐
                  │       Domain 1: Persistence & Relational Data Tier      │
                  │                (PostgreSQL / SQLite 3)                  │
                  │  • ProcessStep • Resource • Order                       │
                  │  • OrderResourceConsumption • OrderStepLog (Immutable)  │
                  │  • OperatorProfile (PKI Keys & Certs)                   │
                  │  • SecurityAuditEvent (Append-Only Audit Stream)        │
                  └─────────────────────────────────────────────────────────┘
```

---

## 🔑 Certified Operator Accounts & Personas

The system enforces Zero-Trust Role-Based Access Control (RBAC). Certified accounts seeded for testing:

| Role | Username | Password | Certification / Badge | Permitted Manufacturing Stations |
| :--- | :--- | :--- | :--- | :--- |
| **Plant Admin** | `admin` | `MeticulyAdmin2026!` | `ISO-13485-AUDITOR-2026` / `METI-ADMIN-01` | All Stations (1 to 5), Security Logs, Global Analytics |
| **Biomedical Engineer** | `biomed_lead` | `Biomed2026!` | `DICOM-CAD-CERT-908` / `METI-BIO-44` | **Station 1:** 3D CAD Modeling & Surgical Planning |
| **Production Operator** | `slm_tech` | `Operator2026!` | `SLM-SOLUTIONS-280-CERT` / `METI-SLM-12` | **Station 2:** SLM 3D Printing & **Station 3:** CNC Milling |
| **QA Specialist** | `qa_lead` | `QASpecialist2026!` | `ASQ-CMM-INSPECTOR-2026` / `METI-QA-08` | **Station 4:** CMM QC & **Station 5:** Packaging & eDHR Sign |

---

## ⚡ Active Stack & Quick Start

The stack is configured to run on dedicated ports to avoid system conflicts:
* **Frontend Web Application:** [http://localhost:3001](http://localhost:3001)
* **Django REST API Root:** [http://localhost:8001/api/](http://localhost:8001/api/)
* **Interactive OpenAPI / Swagger Documentation:** [http://localhost:8001/api/docs/](http://localhost:8001/api/docs/)

### 1. Fast Local Execution

#### Backend (Terminal 1):
```bash
cd backend
# Activate virtual environment
.\.venv\Scripts\activate

# Install dependencies (if not already installed)
pip install -r requirements.txt

# Run migrations and seed data
python manage.py migrate
python manage.py seed_data

# Start server on Port 8001
python manage.py runserver 8001
```

#### Frontend (Terminal 2):
```bash
cd frontend
# Install dependencies
npm install

# Build & start on Port 3001
npm run build
npm run start -- -p 3001
```

### 2. Docker Compose Run (Alternative):
```bash
docker compose up --build
```

---

## 🧪 Automated Testing & Live Verification Metrics

### 1. Backend Pytest Automated Test Suite
MetiTrack features a comprehensive test suite across 15 dedicated modules covering all functional, architectural, and security invariants:
```bash
cd backend
.\.venv\Scripts\pytest -v
```
**Result: 105 passed, 100% pass rate in 73.82s.**
* `test_asymmetric_pki_dhr_signing.py`: 12/12 passed (ECDSA P-256, DER signing, tamper alert, key-substitution defense)
* `test_phi_encryption_and_cookie_security.py`: 6/6 passed (AES-256-GCM PHI encryption at rest, HttpOnly session cookies)
* `test_red_team_cyberattacks.py`: 8/8 passed (Credential stuffing, role spoofing, CORS theft, Excel DDE, eDHR tampering, race condition overselling)
* `test_concurrency_locking.py`: Concurrency race condition prevention & row-level locking
* `test_jwt_auth_security.py`: Claims-based JWT validation & identity inspection
* `test_rate_limiting_and_audit_logging.py`: Scoped throttling & immutable security audit trail
* `test_csv_injection_defense.py`: CWE-1236 spreadsheet sanitization
* `test_inventory_service.py`: Automated stock deduction & safety threshold monitoring
* `test_cost_service.py`: Real-time cumulative financial accounting
* `test_dhr_immutability.py`: Append-only model protection & tamper-evident seals
* `test_server_side_rbac.py`: Station-by-station permission enforcement
* `test_domain1_crud.py` & `test_domain2_business_logic.py`: Clean architecture domain invariants

### 2. Frontend React Testing Library & Vitest Automated Suite
MetiTrack features a dedicated 28-test frontend suite covering state transitions, role switches, UDI barcode generation, and modal interactions:
```bash
cd frontend
npm test
```
**Result: 7 test files, 28 passed, 100% pass rate in 3.19s.**
* `UDILabelGenerator.test.tsx`: 4/4 passed (FDA 21 CFR 830, GS1-128 linear barcode, ECC200 DataMatrix, DPM laser toggle)
* `AdvanceModal.test.tsx`: 3/3 passed (BOM resource steppers, cumulative cost bar, sequential advance validation)
* `CreateOrderModal.test.tsx`: 4/4 passed (HIPAA pseudo-hash generation, anatomical geometry selection, SLA urgency)
* `OrderCard.test.tsx`: 6/6 passed (Urgency badges, click triggers, role authorization tooltip)
* `TopBar.test.tsx`: 4/4 passed (Search filtering, priority dropdowns, 4-persona role switcher, modal triggers)
* `SlimSidebar.test.tsx`: 3/3 passed (5-view cleanroom rail navigation, low-stock threshold alert counters)
* `api.test.ts`: 4/4 passed (JWT token management, x-operator-role injection, RFC-7807 error parsing)

### 3. Live End-to-End Simulation & Verification
Verified via live integration runner across all 12 operational stages:
* Multi-persona authentication (`admin`, `biomed_lead`, `slm_tech`, `qa_lead`)
* Case creation (`CAS-2026-LIVE-38888`) with HIPAA-encrypted patient reference
* Zero-Trust RBAC rejection of unauthorized step transitions (HTTP 400/403)
* Sequential advancement through Stations 1 to 5 with atomic inventory deduction
* Asymmetric ECDSA NIST P-256 digital signature creation & constant-time verification
* Forged payload tamper detection (HTTP 422 `TAMPERED_OR_INVALID`)
* Unit costing reconciliation ($1,023.75 total) and immutable audit log capture

### 3. Frontend Production Build & TypeScript Verification
```bash
cd frontend
npm run build
```
**Result: Zero TypeScript errors, zero lint warnings, optimized production build.**

---

## 📋 The 5 Defined Sequential Manufacturing Steps

| Sequence | Station Code | Station Name | Authorized Persona | Consumed Resources | Regulatory Scope |
| :---: | :--- | :--- | :--- | :--- | :--- |
| **Step 1** | `CAD_MODELING` | **3D CAD Modeling & Surgical Planning** | Biomedical Engineer | Biomedical Engineer Labor (hrs) | Patient CT/MRI DICOM segmentation, anatomical cranial/hip design |
| **Step 2** | `SLM_PRINTING` | **3D Metal Printing (SLM)** | Production Operator | Titanium Ti-6Al-4V Grade 23 Powder (g) + SLM Printer time (hrs) | Laser powder bed fusion additive manufacturing under argon |
| **Step 3** | `CNC_MACHINING` | **CNC Post-Processing & Heat Treatment** | Production Operator | 5-Axis CNC Milling time (hrs) + Additive Machinist Labor (hrs) | Vacuum stress-relief anneal (840°C), wire EDM detachment, contour milling |
| **Step 4** | `QA_INSPECTION` | **ISO 13485 QA Inspection & Sterilization** | QA Specialist | QA Specialist Labor (hrs) | Zeiss CMM metrology scan, ASTM F86 passivation, particulate wash |
| **Step 5** | `PACKAGING` | **Medical Labelling & Packaging** | QA Specialist | Sterile Barrier Packaging Kit (UDI) | ISO 15223-1 Tyvek double pouching, FDA GS1 UDI, ECDSA eDHR digital release |

---

## 📄 Deliverable Documentation

* **1-Page Written Summary:** [`docs/1-PAGE-SUMMARY.md`](docs/1-PAGE-SUMMARY.md) (comprehensive summary addressing all 5 assignment requirements).
* **Architecture & ERD:** [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) (system components, database schema, REST API contracts).
* **Living Task & Progress Tracker:** [`docs/PROGRESS.md`](docs/PROGRESS.md) (complete audit trail of all implementation milestones).
* **Architectural Decision Records (ADRs):** [`docs/DECISIONS.md`](docs/DECISIONS.md) (design decisions, concurrency strategy, cryptography).
* **Domain Engineering Specification:** [`docs/medical_implant_mes_spec.md`](docs/medical_implant_mes_spec.md) (titanium powder genealogy, eDHR schema).
* **Burmese Architecture Post-Mortem:** [`docs/CLEAN_ARCHITECTURE_DOMAINS_MY.md`](docs/CLEAN_ARCHITECTURE_DOMAINS_MY.md).

---

## ⚖️ License & Confidentiality
All materials submitted are strictly for the recruitment evaluation process at **Meticuly Co., Ltd.** and remain confidential. Copyright © 2026 Meticuly All rights reserved.
