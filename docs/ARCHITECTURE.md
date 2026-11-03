# MetiTrack — System Architecture (`docs/ARCHITECTURE.md`)

## 1. System Overview & Architecture Diagram

```mermaid
flowchart TD
    subgraph Client["Frontend Client (Next.js 15 + React 19)"]
        UI_Kanban["Manufacturing Kanban Pipeline"]
        UI_AdvanceModal["Step Advance & Resource Modal"]
        UI_Dashboard["Analytics & Resource KPIs (Recharts)"]
        UI_Audit["Traceability & Audit Drawer"]
        StateMgr["TanStack Query (Cache & Sync) + Zod"]
    end

    subgraph API_Gateway["REST API Gateway (Django REST Framework)"]
        Auth_RBAC["RBAC & Mock SSO Middleware"]
        Router["DRF ViewSets & Routers"]
        Serializers["DRF Serializers & Validators"]
    end

    subgraph Core_Engine["Business Logic & State Machine"]
        StateMachine["Sequential Transition Validator"]
        ResourceTracker["Resource Consumption Engine"]
        AuditLogger["Medical Traceability Logger (ISO 13485)"]
    end

    subgraph Persistence["Database Layer"]
        DB[(PostgreSQL / SQLite)]
    end

    UI_Kanban --> StateMgr
    UI_AdvanceModal --> StateMgr
    UI_Dashboard --> StateMgr
    UI_Audit --> StateMgr
    StateMgr -->|HTTP / JSON| Router
    Router --> Auth_RBAC
    Auth_RBAC --> Serializers
    Serializers --> StateMachine
    StateMachine --> ResourceTracker
    ResourceTracker --> AuditLogger
    AuditLogger --> DB
```

---

## 2. Database Schema (Entity-Relationship Diagram)

```mermaid
erDiagram
    ProcessStep ||--o{ Order : "current step"
    ProcessStep ||--o{ OrderStepLog : "transitions"
    Order ||--o{ OrderStepLog : "audit history"
    Order ||--o{ OrderResourceConsumption : "consumes"
    ProcessStep ||--o{ OrderResourceConsumption : "logged at"
    Resource ||--o{ OrderResourceConsumption : "measured in"

    ProcessStep {
        int id PK
        int sequence_order "1..5 unique"
        string code "STEP_CAD, STEP_PRINT, etc."
        string name
        string description
    }

    Order {
        int id PK
        string case_id "Unique (CAS-2026-xxx)"
        string patient_ref "Anonymized (PT-xxxx)"
        string implant_type "CRANIAL, HIP, etc."
        string priority "STANDARD, URGENT"
        string status "PENDING, IN_PROGRESS, COMPLETED"
        int current_step_id FK
        datetime created_at
        datetime updated_at
    }

    Resource {
        int id PK
        string name
        string category "MATERIAL, MACHINE_TIME, LABOR"
        string unit "GRAMS, HOURS, UNITS"
        float cost_per_unit
        float total_available
    }

    OrderResourceConsumption {
        int id PK
        int order_id FK
        int step_id FK
        int resource_id FK
        float quantity "Must be > 0"
        datetime logged_at
        string logged_by
    }

    OrderStepLog {
        int id PK
        int order_id FK
        int from_step_id FK
        int to_step_id FK
        datetime transitioned_at
        string operator_name
        string notes
    }
```

---

## 3. REST API Contracts

### 3.1 `GET /api/orders/`
Returns all active and completed orders with nested current step and aggregated resource costs.
- **Query Params:** `status`, `implant_type`, `priority`
- **Response `200 OK`:**
```json
[
  {
    "id": 1,
    "case_id": "CAS-2026-001",
    "patient_ref": "PT-8821",
    "implant_type": "CRANIAL_PLATE",
    "priority": "URGENT",
    "status": "IN_PROGRESS",
    "current_step": {
      "id": 2,
      "sequence_order": 2,
      "code": "STEP_PRINT",
      "name": "3D Metal Printing (SLM)"
    },
    "total_resources_consumed": [
      { "resource_name": "Titanium Powder", "quantity": 120.0, "unit": "GRAMS" },
      { "resource_name": "Biomedical Engineer Labor", "quantity": 3.5, "unit": "HOURS" }
    ],
    "created_at": "2026-11-03T08:00:00Z"
  }
]
```

### 3.2 `POST /api/orders/`
Creates a new patient implant order. Automatically placed at Step 1 (`STEP_CAD`).
- **Request Body:**
```json
{
  "case_id": "CAS-2026-005",
  "patient_ref": "PT-1049",
  "implant_type": "HIP_ACETABULAR_CUP",
  "priority": "STANDARD"
}
```

### 3.3 `POST /api/orders/{id}/advance/`
Advances an order to the next sequential step while logging operator notes and consumed resources.
- **Request Body:**
```json
{
  "operator_name": "Khant Lin (Biomedical Lead)",
  "notes": "3D design approved by surgeon Dr. Somchai. Slicing completed.",
  "resources": [
    {
      "resource_id": 1,
      "quantity": 145.5
    },
    {
      "resource_id": 2,
      "quantity": 4.0
    }
  ]
}
```
- **Validation:**
  - Order must not already be `COMPLETED`.
  - Next step is strictly `current_step.sequence_order + 1`.
  - Quantities must be $> 0$.
  - Atomic database transaction: If logging resources fails, step transition rolls back.

### 3.4 `GET /api/analytics/overview/`
Returns dashboard aggregations:
```json
{
  "total_orders": 12,
  "in_progress": 8,
  "completed": 4,
  "orders_per_step": {
    "1": 2,
    "2": 3,
    "3": 1,
    "4": 1,
    "5": 1
  },
  "resource_totals": [
    { "category": "MATERIAL", "name": "Titanium Powder", "total_consumed": 980.5, "unit": "GRAMS" },
    { "category": "MACHINE_TIME", "name": "3D SLM Printer", "total_consumed": 42.0, "unit": "HOURS" },
    { "category": "LABOR", "name": "Biomedical Engineer", "total_consumed": 28.5, "unit": "HOURS" }
  ]
}
```

---

## 4. Frontend Component Hierarchy
- `app/layout.tsx` (Global layout, TanStack Query Client provider, Navigation Header with Role Switcher)
- `app/page.tsx` (Main Manufacturing Dashboard)
  - `components/Header.tsx` (Meticuly branding, current role pill, quick statistics)
  - `components/KanbanBoard.tsx` (5 Columns for 5 Steps)
    - `components/KanbanColumn.tsx` (Header with order count badge, Droppable zone)
      - `components/OrderCard.tsx` (Case ID, Urgent badge, Patient Ref, Consumed resources pill, "Advance" button)
  - `components/AdvanceModal.tsx` (Modal with dynamic resource inputs per step, operator signature, notes, Zod validation)
  - `components/CreateOrderModal.tsx` (Modal to create case with React Hook Form + Zod)
  - `components/AnalyticsDrawer.tsx` or Tab (Recharts for Titanium usage & Step distribution)
  - `components/TraceabilityModal.tsx` (Full audit timeline per order with ISO 13485 timestamps)
