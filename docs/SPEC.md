# MetiTrack — Functional Specification (`docs/SPEC.md`)

## 1. Business Context & Objective
Meticuly produces Patient-Specific Implants (PSI) customized using medical CT/MRI scans. Because each implant is custom-manufactured for an individual human patient, manufacturing must be:
1. **Strictly Sequential:** An implant cannot undergo CNC post-processing or QA before 3D printing finishes.
2. **Resource-Accountable:** Every gram of medical-grade Titanium powder and every machine/labor hour must be tracked against the specific patient case.
3. **Traceable (ISO 13485 & FDA UDI):** Complete audit history of who operated each step, when it was executed, and what resources were consumed.

---

## 2. Core Entities

### 2.1 Order (Patient-Specific Case)
Represents a personalized manufacturing job.
- `case_id`: Unique identifier (e.g., `CAS-2026-001`).
- `patient_ref`: Anonymized patient reference (e.g., `PT-9041` for HIPAA/PDPA privacy compliance).
- `implant_type`: Enum:
  - `CRANIAL_PLATE` (Custom Titanium Cranial Plate)
  - `MANDIBULAR_RECON` (Mandibular Reconstruction Plate)
  - `HIP_ACETABULAR_CUP` (Personalized Acetabular Hip Cup)
  - `SPINAL_CAGE` (Custom Titanium Spinal Fusion Cage)
- `priority`: `STANDARD` | `URGENT`
- `status`: `PENDING` | `IN_PROGRESS` | `COMPLETED` | `CANCELLED`
- `current_step`: Pointer to current `ProcessStep`.
- `created_at` / `updated_at`: ISO Timestamps.

### 2.2 ProcessStep (Sequential Step Definition)
- `sequence_order`: Integer 1 to 5 (strictly enforced order).
- `name`: Human-readable name.
- `code`: Unique step code.
- `description`: Scope of work in this step.
- `default_resource_types`: Suggested resource types typically logged at this step.

#### The 5 Defined Production Steps:
1. **Step 1 (`STEP_CAD`): 3D CAD Modeling & Surgical Planning**
   - Consumes: Biomedical Engineer Labor (Hours).
2. **Step 2 (`STEP_PRINT`): 3D Metal Printing (SLM)**
   - Consumes: Titanium Ti-6Al-4V Grade 23 Powder (Grams) + 3D Laser Sintering Machine Time (Hours).
3. **Step 3 (`STEP_CNC`): CNC Post-Processing & Heat Treatment**
   - Consumes: 5-Axis CNC Milling Machine Time (Hours) + Furnace Operator Labor (Hours).
4. **Step 4 (`STEP_QA`): ISO 13485 QA Inspection & Sterilization**
   - Consumes: QA Specialist Labor (Hours) + Sterilization Pouch Kits (Units).
5. **Step 5 (`STEP_LABEL`): Medical Labelling & Packaging**
   - Consumes: Unique Device Identifier (UDI) Packaging Kit (Units) + Dispatch Labor (Hours).

### 2.3 Resource
Represents resources consumed during production.
- `name`: e.g. "Titanium Ti-6Al-4V Powder", "3D Metal Printer #1".
- `category`: `MATERIAL` | `MACHINE_TIME` | `LABOR`
- `unit`: `GRAMS` | `HOURS` | `UNITS`
- `cost_per_unit`: Cost for consumption analytics.
- `total_available`: Inventory or maximum capacity.

### 2.4 OrderResourceConsumption
Records specific consumption linked to an order and step.
- `order`: FK to Order.
- `step`: FK to ProcessStep.
- `resource`: FK to Resource.
- `quantity`: Float (> 0).
- `logged_at`: Timestamp.
- `logged_by`: Operator username or role.

### 2.5 OrderStepLog (Step Execution History / Audit Trail)
- `order`: FK to Order.
- `from_step`: ProcessStep (or null for initial creation).
- `to_step`: ProcessStep.
- `transitioned_at`: Timestamp.
- `operator_name`: Name/role of person advancing the step.
- `notes`: Quality notes, machine parameters, or remarks.

---

## 3. Business Rules & State Transitions

1. **Sequential Advancement Rule:**
   - An order CANNOT skip steps (e.g., Step 1 directly to Step 3 is strictly prohibited).
   - An order CANNOT move backward without an explicit supervisor override/rework log.
2. **Concurrency Rule:**
   - Multiple orders can reside at any step simultaneously (e.g., 3 orders in 3D Printing, 2 orders in CAD).
3. **Mandatory Resource Logging on Advance:**
   - When an order transitions from Step $N$ to Step $N+1$, the operator MUST log the consumed resources (e.g. powder used or hours taken) with non-negative values.
4. **Completion Rule:**
   - When Step 5 is completed, the order automatically transitions to `status = COMPLETED`.

---

## 4. Required User Interactions (User Journey)
1. **Pipeline Dashboard (Kanban):**
   - 5 columns representing the 5 sequential steps.
   - Order cards displaying Case ID, Patient Ref, Implant Type, Priority badge, and total accumulated cost/resources.
   - Click "Advance Step" button on card -> Opens Advance Modal.
2. **Advance Modal:**
   - Shows current step and destination step.
   - Operator name input.
   - Resource input fields corresponding to the step (e.g., Titanium grams, Machine hours).
   - Quality notes / remarks.
   - Validation ensures quantities are valid numbers $\ge 0$.
3. **Create Order Modal:**
   - Form for Case ID, Patient Ref, Implant Type, Priority.
   - Initializes order at Step 1 with status `IN_PROGRESS`.
4. **Resource Overview & Analytics:**
   - Real-time KPI cards: Total Orders, Active Orders, Completed Orders, Total Titanium Consumed, Total Machine Hours.
   - Breakdown charts (Recharts): Resource consumption per step, order distribution per step.
5. **Medical Traceability Drawer / Audit Log:**
   - Clicking an order shows full timeline of every step transition, exact timestamp, operator, and resource consumption.
