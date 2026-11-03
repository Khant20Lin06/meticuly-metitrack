# MetiTrack — Domain Architecture & Feature Specification (`docs/DOMAIN_SPECIFICATION.md`)

> **System:** MetiTrack (Patient-Specific Titanium Implant Manufacturing Execution System)  
> **Company:** Meticuly Co., Ltd. | **Standard Compliance:** ISO 13485:2016 & US FDA 21 CFR Part 820 / 830  
> **Architecture Pattern:** Clean Architecture / Domain-Driven Design (DDD)  

---

## 1. Executive Summary & Domain Scope

MetiTrack is an enterprise-grade Manufacturing Execution System (MES) purpose-built for **Patient-Specific Implants (PSI)**. The system models the complete lifecycle of personalized 3D-printed titanium implants—from initial CT scan intake through additive manufacturing, subtractive CNC machining, cleanroom quality assurance, and sterile UDI packaging.

---

## 2. The 3 Architectural Domain Layers

To ensure clean code, maintainability, and strict separation of concerns, the system is partitioned into three distinct domains:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ 3. FEATURE / APPLICATION DOMAIN (User-Facing Capabilities & Workflows)       │
│    • Metronic Slim Workspace • 5-Station Pipeline • Offcanvas Detail Drawer │
│    • Interactive 3D WebGL Mesh • Automated UDI Label • Bottleneck Telemetry│
├─────────────────────────────────────────────────────────────────────────────┤
│ 2. BUSINESS LOGIC DOMAIN (Core Invariants, Rules & Calculation Engines)     │
│    • Sequential State Machine • Atomic Advance RPC • Inventory Depletion    │
│    • Live Cost Accumulation • Role Authorization Gates • DHR Immutability  │
├─────────────────────────────────────────────────────────────────────────────┤
│ 1. CRUD & PERSISTENCE DOMAIN (Data Models, Storage & Query Contracts)      │
│    • Orders • ProcessSteps • Resources • Consumptions • Audit Logs         │
│    • Indexing, Filtering, Row-Locking, Pagination, Relational Integrity    │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Layer 1: CRUD & Persistence Domain (Data Layer)

This layer is strictly responsible for data representation, relational integrity, querying, and database persistence. It contains zero workflow side-effects.

### 3.1 Entity Models & Schemas

| Entity | Primary Responsibility | Key Fields & Data Types |
| :--- | :--- | :--- |
| **`Order`** | Represents a patient-specific manufacturing order (Aggregate Root). | `id` (PK), `case_id` (Unique string), `patient_ref` (Anonymized HIPAA string), `implant_type` (Enum), `priority` (Standard/Urgent), `status` (Pending/In Progress/Completed), `current_step_id` (FK to ProcessStep), `created_at`, `updated_at`. |
| **`ProcessStep`** | Master definition of sequential production stations. | `id` (PK), `sequence_order` (PositiveInt unique 1..5), `code` (Unique string), `name`, `description`, `suggested_resource_ids` (JSON). |
| **`Resource`** | Inventory of raw materials, machine capacity, and labor. | `id` (PK), `name` (Unique string), `category` (Material/Machine Time/Labor), `unit` (Grams/Hours/Units), `cost_per_unit` (Decimal), `total_available` (Decimal). |
| **`OrderResourceConsumption`** | Ledger entry of resources consumed by an order at a step. | `id` (PK), `order_id` (FK), `step_id` (FK), `resource_id` (FK), `quantity` (Decimal > 0), `logged_at` (Timestamp), `logged_by` (String). |
| **`OrderStepLog`** | Immutable chronological audit trail of step transitions (DHR). | `id` (PK), `order_id` (FK), `from_step_id` (FK nullable), `to_step_id` (FK nullable), `transitioned_at` (Timestamp), `operator_name` (String), `notes` (Text). |

### 3.2 CRUD Capabilities (Data Operations)
- **Create Order:** Insert new record with status `IN_PROGRESS` and `current_step = Step 1`.
- **Read / List Orders:** Filter by `status`, `implant_type`, `priority`, or keyword search (`case_id`, `patient_ref`).
- **Read Order Details:** Retrieve full order entity with pre-fetched relations (`current_step`, `step_logs`, `consumptions`).
- **Read Steps:** Return ordered sequence (1 through 5).
- **Read Resources:** Return inventory items with current available balances and unit costs.

---

## 4. Layer 2: Business Logic Domain (Core Rules & Engines)

This layer encapsulates all business rules, mathematical formulas, state constraints, and validation logic. It is completely independent of the UI.

### 4.1 Sequential State Machine Rules
1. **Strict Sequential Invariance:**
   An order residing at Step $N$ can **only** advance to Step $N+1$. Jumps (e.g. Step 1 directly to Step 3) are strictly prohibited and throw an HTTP 400 domain exception.
2. **Terminal State Transition:**
   Advancing from the final step (Step 5: Labelling & Packaging) automatically transitions `order.status` to `COMPLETED` and sets `order.can_advance = False`.
3. **Immutability of Completed Cases:**
   A `COMPLETED` or `CANCELLED` order cannot be advanced or modified.
4. **Concurrency & Row-Level Locking:**
   State transitions must execute inside a `transaction.atomic()` block with `select_for_update()` applied to the target `Order` to prevent race conditions.

### 4.2 Resource Allocation & Calculation Engines
1. **Automatic Inventory Balance Depletion (BOM Deduction):**
   $$\text{Resource.total\_available}_{\text{new}} = \text{Resource.total\_available}_{\text{old}} - \text{quantity\_consumed}$$
   If $\text{Resource.total\_available}_{\text{new}} < 0$, the system flags an insufficient inventory condition.
2. **Non-Negative Validation:**
   Any consumption quantity where $\text{quantity} \le 0$ is rejected.
3. **Cumulative Case Cost Formula:**
   $$\text{Total Cost} = \sum_{i=1}^{M} (\text{quantity}_i \times \text{cost\_per\_unit}_i)$$
   Calculated dynamically per order across all stations.
4. **Plant-Wide Telemetry Aggregation:**
   Aggregates total active cases per station (bottleneck metric), total grams of Titanium Ti-6Al-4V consumed, total machine run hours, and total financial allocation.

### 4.3 Regulatory Compliance & Audit Immutability (ISO 13485)
1. **Device History Record (DHR) Invariance:**
   Every step transition MUST generate an immutable `OrderStepLog` record. Logs cannot be edited or deleted via any API endpoint.
2. **Server-Side Role Permission Enforcement (RBAC):**
   - Step 1 (CAD Design): Requires `Biomedical Engineer` or `Admin`.
   - Step 2 & 3 (3D Printing & CNC): Requires `Production Operator` or `Admin`.
   - Step 4 & 5 (QA & Packaging): Requires `QA Specialist` or `Admin`.

---

## 5. Layer 3: Feature & Application Presentation Domain

This layer bridges the business logic into tangible, ergonomic user experiences following the **Metronic 9 & Linear Enterprise UI Architecture**.

### 5.1 Module Breakdown

#### Module 1: Order Intake & Triage Feature
- **Anonymized Patient Entry Modal:** Masked ID generation (`PT-BKK-xxxx`) adhering to HIPAA/PDPA healthcare privacy.
- **Anatomical Geometry Selector:** Visual selector for Cranial Plate, Mandibular Reconstruction, Acetabular Cup, and Spinal Cage.
- **Surgical Priority Triage:** One-click toggle between `Standard Elective` and `🚨 Urgent Emergency Trauma`.

#### Module 2: The 5-Station Horizontal Pipeline Feature
- **Metronic-Style Horizontal Scrollable Board:**
  Fixed-width columns (`w-80` / 320px minimum) preventing text squishing and truncation.
- **Ergonomic Work-Order Cards:**
  Clean, high-density cards displaying Case ID, Patient Ref, Implant Anatomy, Progress Bar (`Step X of 5`), and a single prominent `Advance ➔` action button.
- **Atomic Step Advance Dialog:**
  Presents dynamic resource inputs customized to the current station (e.g. Titanium grams for 3D Printing, machine hours for CNC, inspection hours for QA).

#### Module 3: Offcanvas Slide-Over Detail Drawer Feature
- **Progressive Disclosure Architecture:**
  Clicking any card smoothly opens a 480px slide-over drawer from the right edge, keeping the primary Kanban board completely calm and uncluttered.
- **Drawer Contents:**
  1. Full Patient Case & Surgical Specs.
  2. Interactive 3D WebGL Implant Model Viewer.
  3. Itemized Resource Consumption Ledger.
  4. Complete ISO 13485 Device History Record (DHR) Timeline.
  5. 1-Click Medical UDI Label Print button.

#### Module 4: Interactive 3D WebGL CAD Viewport Feature
- **Three.js Powered Mesh Inspection:**
  Surgeons and engineers can orbit (360°), pan, and zoom titanium implant geometries directly in the browser.
- **Finite Element Analysis (FEA) Wireframe Toggle:**
  Inspects surface slicing layer density (30 μm powder bed) and surgical fixation hole alignments.

#### Module 5: Automated Medical UDI Label Generator Feature (JD Scope 4)
- **FDA 21 CFR 830 & GS1 Compliant Labeling:**
  Generates machine-readable UDI barcodes containing GTIN, Expiration Date, Lot/Batch Number, and Serial Case ID.
- **Printable Cleanroom Output:**
  Clean `@media print` layout ready for laser etching or sterile pouch packaging.

#### Module 6: Factory Telemetry & Bottleneck Dashboard Feature
- **Executive Metric Cards:** Total Cases, WIP on Stations, Dispatched, Titanium Used (kg), Machine Hours.
- **Recharts Analytics:**
  - Station Load Bar Chart (instant bottleneck detection).
  - Material vs Machine vs Labor Cost Allocation Donut Chart.
  - Consumable Inventory Stock Balance Ledger.

#### Module 7: Master Queue Data Table Feature
- **Dense Medical Ledger View:**
  An alternative view to the Kanban board for operators who need high-throughput tabular filtering, multi-column sorting, and batch auditing.

---

## 6. Recommended Implementation Strategy

### Backend (Django REST Framework)
1. **Refactor Views into Clean Service Layers:**
   Move inventory balance deduction and state machine transitions into a dedicated `manufacturing/services.py` module to keep ViewSets lightweight.
2. **Database Query Optimization:**
   Annotate total case costs at the database query level (`Sum(F(...) * F(...))`) to eliminate N+1 query loops.
3. **Pessimistic Row-Level Locking:**
   Enforce `select_for_update()` on both the Order and Resource models during step advance.

### Frontend (Next.js 16 / React 19 / Tailwind CSS)
1. **Metronic Layout Architecture:**
   - Slim Left Sidebar (68px) with icon tooltips for maximum screen width.
   - Clean top search and filter ribbon.
   - Horizontal pipeline container with `overflow-x-auto` and `min-w-[320px]` columns.
2. **Slide-Over Offcanvas Drawer:**
   Isolate deep features (3D Viewer, Audit Trail, UDI Label) inside the drawer to guarantee a zero-stress, uncluttered Kanban experience.
