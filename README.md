# MetiTrack — Manufacturing Process & Resource Tracking System

> **Candidate:** Khant Lin  
> **Position:** Full-stack Software Development Engineer  
> **Company:** Meticuly Co., Ltd.  
> **Ref Code:** 150102  

[![CI Pipeline](https://github.com/khantlin/meticuly-metitrack/actions/workflows/ci.yml/badge.svg)](https://github.com/khantlin/meticuly-metitrack/actions)
![Django](https://img.shields.io/badge/Django-5.1-092E20?style=flat&logo=django&logoColor=white)
![DRF](https://img.shields.io/badge/DRF-3.15-red?style=flat)
![Next.js](https://img.shields.io/badge/Next.js-16.4-black?style=flat&logo=next.js&logoColor=white)
![React](https://img.shields.io/badge/React-19-61DAFB?style=flat&logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=flat&logo=typescript&logoColor=white)
![Tailwind](https://img.shields.io/badge/Tailwind_CSS-4.0-38B2AC?style=flat&logo=tailwind-css&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?style=flat&logo=docker&logoColor=white)
![ISO 13485](https://img.shields.io/badge/Compliance-ISO_13485-green?style=flat)

---

## 🔬 Domain Overview
**MetiTrack** is a specialized Manufacturing Execution System (MES) prototype designed specifically for **Patient-Specific Implants (PSI)** and medical additive manufacturing (3D printed Titanium cranial plates, hip acetabular cups, mandibular plates, and spinal cages).

The platform enforces strict sequential state-machine transitions across the 5 medical device manufacturing stages while tracking **raw titanium powder consumption (grams)**, **additive machine hours (SLM & CNC)**, and **certified labor hours (Biomedical Engineers & QA Specialists)** under **ISO 13485 Device History Record (DHR)** standards.

---

## 🏗 System Architecture

```
                  ┌──────────────────────────────────────────────┐
                  │   Next.js 15 Client (React 19 + TypeScript)  │
                  │  • Multi-Station Kanban Board (5 Steps)       │
                  │  • Step Advance & Dynamic Resource Modal     │
                  │  • Real-Time Resource Telemetry (Recharts)   │
                  │  • ISO 13485 Traceability & Audit Ledger     │
                  │  • Persona Role Switcher (RBAC)              │
                  └──────────────────────┬───────────────────────┘
                                         │ HTTP REST (JSON)
                                         ▼
                  ┌──────────────────────────────────────────────┐
                  │    Django REST Framework API Gateway         │
                  │  • Atomic Sequential State Machine           │
                  │  • Resource Consumption Calculation Engine   │
                  │  • Immutable Medical Audit Logger            │
                  │  • Interactive Swagger / OpenAPI 3.0 Docs    │
                  └──────────────────────┬───────────────────────┘
                                         │
                                         ▼
                  ┌──────────────────────────────────────────────┐
                  │   Persistence Layer (PostgreSQL / SQLite)    │
                  │  • ProcessStep • Resource • Order            │
                  │  • OrderResourceConsumption • OrderStepLog   │
                  └──────────────────────────────────────────────┘
```

---

## ⚡ Quick Start: 1-Command Run with Docker (Recommended)

To boot the entire production stack (Frontend, Backend, and PostgreSQL database) with sample Meticuly cases seeded automatically:

```bash
# From the project root
docker compose up --build
```

- **Frontend Web Application:** [http://localhost:3001](http://localhost:3001)
- **Django REST API Root:** [http://localhost:8000/api/](http://localhost:8000/api/)
- **Interactive OpenAPI / Swagger Documentation:** [http://localhost:8000/api/docs/](http://localhost:8000/api/docs/)

---

## 💻 Alternative: Fast Local Execution (Without Docker)

### 1. Backend Setup (Django REST Framework)
```bash
cd backend

# Create & activate virtual environment (Windows PowerShell)
python -m venv .venv
.\.venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Run migrations and seed sample Meticuly implant cases
python manage.py migrate
python manage.py seed_data

# Start backend server
python manage.py runserver 0.0.0.0:8000
```

### 2. Frontend Setup (Next.js 15)
In a separate terminal:
```bash
cd frontend

# Install dependencies
npm install

# Start Next.js development server
npm run dev
```
Open [http://localhost:3001](http://localhost:3001) in your browser.

---

## 🧪 Automated Testing & Code Quality

### 1. Backend Pytest Suite
Run the automated test suite testing sequential transitions, resource logging, atomic rollbacks, and analytics aggregations:
```bash
cd backend
.\.venv\Scripts\pytest -v
```
*(Result: 6/6 tests passing with 100% assertion success)*

### 2. Frontend Production Build & TypeScript Verification
```bash
cd frontend
npm run build
```
*(Result: zero type errors, optimized static page generation)*

---

## 📋 The 5 Defined Sequential Steps
1. **Step 1: 3D CAD Modeling & Surgical Planning**
   * *Scope:* Convert patient CT/MRI DICOM scans into patient-specific implant geometries with surgeon approval.
   * *Consumes:* Biomedical Engineer Labor (hours).
2. **Step 2: 3D Metal Printing (SLM)**
   * *Scope:* Laser powder bed fusion additive manufacturing using medical-grade Titanium Ti-6Al-4V ELI powder.
   * *Consumes:* Titanium Ti-6Al-4V powder (grams) + SLM 3D Printer machine hours.
3. **Step 3: CNC Post-Processing & Heat Treatment**
   * *Scope:* Vacuum furnace annealing and 5-axis precision CNC milling of critical anatomical interfaces.
   * *Consumes:* 5-Axis CNC Milling machine hours + Operator labor.
4. **Step 4: ISO 13485 QA Inspection & Sterilization**
   * *Scope:* Dimensional CMM validation, cleanroom ultrasonic wash, and gamma sterilization pouching.
   * *Consumes:* QA Specialist Labor (hours) + Sterile packaging kits.
5. **Step 5: Medical Labelling & Packaging**
   * *Scope:* Laser-etched Unique Device Identifier (UDI), hospital case labeling, and cold-chain dispatch.
   * *Consumes:* UDI packaging kits + Dispatch labor.

---

## 📄 Deliverable Documentation
* **1-Page Written Summary:** [`docs/1-PAGE-SUMMARY.md`](docs/1-PAGE-SUMMARY.md) (covers requirements, functional specs conversion, software design, simplified user manual, and software summary).
* **AI & Contributor Guidelines:** [`AGENTS.md`](AGENTS.md)
* **Functional Specifications:** [`docs/SPEC.md`](docs/SPEC.md)
* **Architecture & Database ERD:** [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)
* **Living Task & Progress Tracker:** [`docs/PROGRESS.md`](docs/PROGRESS.md)
* **Architectural Decision Records (ADRs):** [`docs/DECISIONS.md`](docs/DECISIONS.md)

---

## ⚖️ License & Confidentiality
All materials submitted are strictly for the recruitment evaluation process at **Meticuly Co., Ltd.** and remain confidential. Copyright © 2026 Meticuly All rights reserved.
