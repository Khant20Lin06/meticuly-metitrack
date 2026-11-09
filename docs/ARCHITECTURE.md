# MetiTrack — System Architecture (`docs/ARCHITECTURE.md`)

## 1. System Overview & Architecture Diagram

```mermaid
flowchart TD
    subgraph Client["Frontend Client (Next.js 16 + React 19 + TypeScript)"]
        UI_TopBar["TopBar (Role Switcher & Session Header)"]
        UI_Sidebar["SlimSidebar (Navigation: Board, Table, Metrics, Stock, Security)"]
        UI_Board["PipelineBoard (5-Station Horizontal Cleanroom Kanban)"]
        UI_AdvanceModal["AdvanceModal (BOM Quantity Steppers, Financial Bar, RBAC)"]
        UI_Drawer["DetailDrawer (480px Slide-Over with WebGL 3D Mesh & eDHR Timeline)"]
        UI_UDI["UDILabelGenerator (FDA UDI Barcode: GS1-128 & DataMatrix ECC200)"]
        UI_Three["ThreeImplantViewer (Three.js WebGL Orbit & Solid/Wireframe FEA)"]
        UI_Stock["WarehouseStockView (Titanium Inventory & Replenishment)"]
        UI_Table["MasterTableView (Dense Filterable Queue & Sanitized CSV Export)"]
        UI_Audit["SecurityAuditView (Immutable FDA 21 CFR Part 11 Audit Stream)"]
        StateMgr["Typed API Client (lib/api.ts + React Hooks)"]
    end

    subgraph API_Gateway["REST API Gateway (Django REST Framework 3.15)"]
        Auth_RBAC["Zero-Trust RBAC & JWT Middleware"]
        Throttle["Rate Limiter (AdvanceRateThrottle 120/min, Login 10/min)"]
        Router["DRF ViewSets & Routers (/api/)"]
        Serializers["DRF Serializers & Invariant Validators"]
    end

    subgraph Core_Engine["Business Logic & Invariants Layer"]
        StateMachine["Sequential State Machine (OrderService: Step N -> N+1)"]
        ResourceTracker["Inventory & Atomic Depletion (InventoryService: select_for_update)"]
        CostEngine["Financial Accounting Engine (CostService: Real-Time BOM Costs)"]
        PKIEngine["FDA Digital Signatures (PKIService: ECDSA NIST P-256 / SHA-256)"]
        PHICrypto["HIPAA Data Protection (PHIEncryptionService: AES-256-GCM / HKDF)"]
        AuditLogger["Medical Traceability Logger (OrderStepLog & SecurityAuditEvent)"]
    end

    subgraph Persistence["Persistence & Database Layer"]
        DB[(PostgreSQL / SQLite via Django ORM)]
    end

    UI_Board --> StateMgr
    UI_AdvanceModal --> StateMgr
    UI_Drawer --> StateMgr
    UI_UDI --> StateMgr
    UI_Three --> StateMgr
    UI_Stock --> StateMgr
    UI_Table --> StateMgr
    UI_Audit --> StateMgr
    StateMgr -->|HTTP REST / JSON / Cookies| Throttle
    Throttle --> Auth_RBAC
    Auth_RBAC --> Router
    Router --> Serializers
    Serializers --> StateMachine
    StateMachine --> ResourceTracker
    ResourceTracker --> CostEngine
    CostEngine --> PKIEngine
    PKIEngine --> PHICrypto
    PHICrypto --> AuditLogger
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
    User ||--|| OperatorProfile : "has certified role"
    OperatorProfile ||--o{ OrderStepLog : "signs transition"

    ProcessStep {
        int id PK
        int sequence_order "1..5 unique"
        string code "STEP_CAD, STEP_PRINT, etc."
        string name
        string description
        json suggested_resource_ids
    }

    Order {
        int id PK
        string case_id "Unique (CAS-2026-xxx)"
        string patient_ref "AES-256-GCM Encrypted (HIPAA)"
        string implant_type "CRANIAL, HIP, JAW, SPINAL"
        string priority "STANDARD, URGENT"
        string status "PENDING, IN_PROGRESS, COMPLETED, CANCELLED"
        int current_step_id FK
        datetime created_at
        datetime updated_at
    }

    Resource {
        int id PK
        string name "Unique"
        string category "MATERIAL, MACHINE_TIME, LABOR"
        string unit "GRAMS, HOURS, UNITS"
        decimal cost_per_unit
        decimal total_available "Real-time balance"
    }

    OrderResourceConsumption {
        int id PK
        int order_id FK
        int step_id FK
        int resource_id FK
        decimal quantity "Must be > 0"
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

    OperatorProfile {
        int id PK
        int user_id FK
        string role "BIOMEDICAL_ENGINEER, PRODUCTION_OPERATOR, QA_SPECIALIST, ADMIN"
        string certification_id "ISO 13485 ID"
        string public_key_pem "ECDSA SECP256R1"
        string key_fingerprint "SHA256 Fingerprint"
        string private_key_pem "Encrypted at rest (AES-256-GCM)"
    }

    SecurityAuditEvent {
        int id PK
        string event_type "AUTH_SUCCESS, AUTH_FAILED, ROLE_VIOLATION, TAMPER_DETECTED, RATE_LIMITED, DHR_SIGNED"
        string severity "INFO, WARNING, CRITICAL"
        string actor_username
        string endpoint
        string method
        int status_code
        json details
        datetime timestamp
    }
```

---

## 3. REST API Contracts

### 3.1 `GET /api/orders/`
Returns active and completed orders with nested current step and aggregated resource consumption.
- **Query Params:** `status`, `implant_type`, `priority`, `search`
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
      { "resource_name": "Titanium Ti-6Al-4V Grade 23 Powder", "quantity": 120.0, "unit": "GRAMS" },
      { "resource_name": "Biomedical Engineer Labor", "quantity": 3.5, "unit": "HOURS" }
    ],
    "accumulated_cost": "1420.50",
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
Advances an order strictly to the next sequential step ($N \rightarrow N+1$) while logging operator notes, checking RBAC authorization, and atomically deducting inventory.
- **Request Body:**
```json
{
  "operator_name": "Khant Lin (Biomedical Lead)",
  "notes": "3D design approved by surgeon Dr. Somchai. Slicing completed.",
  "expected_step_sequence": 1,
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
- **Validation & Enforcement:**
  - Order must not already be `COMPLETED`.
  - Next step is strictly `current_step.sequence_order + 1`.
  - Quantities must be $> 0$.
  - Atomic database transaction (`select_for_update`): If logging resources fails or inventory is insufficient, step transition rolls back.
  - Rate-limited via `AdvanceRateThrottle` (120 req/min).

### 3.4 `GET /api/orders/{id}/history/`
Returns full ISO 13485 audit trail: all previous step transitions, timestamps, operator signatures, and resource consumptions.

### 3.5 `GET /api/orders/{id}/cost-breakdown/`
Returns granular itemized financial accounting split into Raw Materials, Machine Time, Labor, and station-by-station totals ($\text{Total Cost} = \sum [\text{Quantity} \times \text{Unit Cost}]$).

### 3.6 `GET /api/analytics/overview/`
Returns plant-wide telemetry: WIP bottleneck distribution per station, total cases, and itemized material consumption totals.

### 3.7 `POST /api/auth/token/`
Authenticates certified operator persona and returns JWT access/refresh tokens alongside secure HttpOnly session cookies.

### 3.8 `GET /api/security-logs/`
Returns immutable FDA 21 CFR Part 11 append-only security audit trail monitoring logins, role violations, and cryptographic verification results.

---

## 4. Frontend Component Hierarchy
- `app/layout.tsx` (Root layout, Geist font definitions, metadata)
- `app/page.tsx` (Main MES App Container, state synchronization, tab router)
  - `components/TopBar.tsx` (Meticuly branding, Quick Role Switcher, search, urgency filter, +New Case CTA)
  - `components/SlimSidebar.tsx` (Cleanroom navigation: Board, Table, Metrics, Stock, Security)
  - `components/PipelineBoard.tsx` (5-Station Horizontal Kanban Board with WIP badges)
    - `components/OrderCard.tsx` (Case ID, anatomical tag, progress bar, accumulated cost, Advance CTA)
  - `components/AdvanceModal.tsx` (Numerical BOM quantity steppers, live financial bar, certified operator credentials)
  - `components/CreateOrderModal.tsx` (HIPAA-compliant masked case intake modal)
  - `components/DetailDrawer.tsx` (480px Slide-Over Drawer)
    - `components/ThreeImplantViewer.tsx` (Interactive Three.js WebGL 3D Titanium Mesh Viewport)
    - `components/UDILabelGenerator.tsx` (FDA 21 CFR Part 830 UDI GS1-128 & DataMatrix ECC200)
  - `components/AnalyticsView.tsx` (Recharts cleanroom WIP distribution & resource KPIs)
  - `components/WarehouseStockView.tsx` (Titanium inventory balances & stock replenishment)
    - `components/ReplenishModal.tsx` (Batch powder restock dialog)
  - `components/MasterTableView.tsx` (Dense multi-column sorting, filtering, and sanitized CSV export)
  - `components/SecurityAuditView.tsx` (Real-time append-only security and tamper audit log)
