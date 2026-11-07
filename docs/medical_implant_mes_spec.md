# Medical Device & 3D Titanium Implant MES (Manufacturing Execution System)
## System Architecture & Engineering Specification (`medical_implant_mes_spec.md`)

> **Regulatory Compliance Scope:** ISO 13485:2016, FDA 21 CFR Part 11, ASTM F3001 (Ti-6Al-4V ELI for Additive Manufacturing), ISA-95 Level 3 Architecture.  
> **Target Architecture:** PostgreSQL (Immutable Append-Only Audit Logs), Prisma ORM / SQL DDL, TypeScript / NestJS or Go Core Backend.

---

## 1. System Overview & Core Principles

This system orchestrates the end-to-end manufacturing of **Patient-Specific Titanium Implants (PSI)** manufactured using Powder Bed Fusion (PBF-LB / SLM / DMLS).

### Key Architectural Tenets
- **Zero Silent Mutations:** Every database update on regulated tables is append-only or audited with a cryptographic SHA-256 hash, timestamp, user ID, and `reason_for_change` (FDA 21 CFR Part 11).
- **Strict Powder Genealogy:** No titanium powder batch can be loaded into an SLM machine without verifying its sieve test, chemistry certification, and reuse cycle count threshold.
- **Traceability Gateways:** No implant can proceed to post-processing without an approved surgeon sign-off and a certified 3D build log.
- **Automated eDHR Compilation:** Upon final packaging and sterilization release, the system bundles all machine logs, inspection reports, and digital signatures into an immutable Electronic Device History Record (eDHR).

---

## 2. Module Specifications

### Module 1: Titanium Powder Batch & Reuse Tracker (အမှုန့် ခြေရာခံစနစ်)
*Reference Base: PartKeepr / ASTM F3001 Raw Material Model*

#### 1.1 Functional Scope
- **Virgin Powder Ingestion:** Ingest raw Ti-6Al-4V ELI powder with mill certificates (Certificate of Analysis - CoA), vendor lot number, particle size distribution (PSD: D10, D50, D90), and chemical composition (O, N, H, C, Fe content).
- **Reuse Cycle & Sieving Engine:** Track each powder lot through sieving operations. Calculate reuse cycle count (`cycle_count`), blend ratio (e.g., 70% sieved recycled + 30% virgin), and flag powder exceeding max allowable reuses (e.g., 10 cycles).
- **Machine Hopper Reconciliation:** Track powder weight loaded into SLM machine, powder consumed in build, overflow/residual powder collected, and scrap waste.

#### 1.2 Data Schema (Prisma DSL)
```prisma
enum PowderGrade {
  TI6AL4V_GRADE5
  TI6AL4V_ELI_GRADE23
  CP_TI_GRADE2
}

enum PowderStatus {
  QUARANTINED
  RELEASED_FOR_PRODUCTION
  EXHAUSTED
  REJECTED_OUT_OF_SPEC
}

model PowderLot {
  id                    String        @id @default(uuid())
  lotNumber             String        @unique // Internal unique lot barcode
  vendorLotNumber       String
  manufacturer          String
  grade                 PowderGrade   @default(TI6AL4V_ELI_GRADE23)
  initialWeightKg       Decimal       @db.Decimal(10, 3)
  currentWeightKg       Decimal       @db.Decimal(10, 3)
  cycleCount            Int           @default(0)
  maxCyclesAllowed      Int           @default(10)
  status                PowderStatus  @default(QUARANTINED)
  
  // Chemical & Physical Specs (ASTM F3001)
  oxygenPpm             Int           // Critical: Increases with recycling
  d10Microns            Decimal?      @db.Decimal(6, 2)
  d50Microns            Decimal?      @db.Decimal(6, 2)
  d90Microns            Decimal?      @db.Decimal(6, 2)
  coaDocumentUrl        String        // Certificate of Analysis PDF
  
  sieveLogs             PowderSieveLog[]
  hopperLoads           BuildPowderUsage[]
  
  createdAt             DateTime      @default(now())
  updatedAt             DateTime      @updatedAt
}

model PowderSieveLog {
  id                    String        @id @default(uuid())
  lotId                 String
  powderLot             PowderLot     @relation(fields: [lotId], references: [id])
  sievedByUserId        String
  sieveMeshSizeMicrons  Int           // e.g., 63 microns or 45 microns
  inputWeightKg         Decimal       @db.Decimal(10, 3)
  outputWeightKg        Decimal       @db.Decimal(10, 3)
  scrapWeightKg         Decimal       @db.Decimal(10, 3)
  inspectionPassed      Boolean
  createdAt             DateTime      @default(now())
}
```

#### 1.3 State Rules & API Endpoints
- `POST /api/v1/powder/lots` -> Ingest virgin powder lot with CoA.
- `POST /api/v1/powder/sieve` -> Execute sieve operation. Automatically increments `cycleCount`. If `oxygenPpm > 2000` or `cycleCount > maxCyclesAllowed`, status transitions to `REJECTED_OUT_OF_SPEC`.
- `POST /api/v1/powder/blend` -> Blend virgin + recycled powder, generates a new child `lotNumber` with weighted average cycle calculation.

---

### Module 2: Build Job & CAD File Versioning (3D Print အလုပ်စီမံခန့်ခွဲမှု)
*Reference Base: ISA-95 Production Schedule & DICOM PSI Pipeline*

#### 2.1 Functional Scope
- **Patient Case Linkage:** Store de-identified patient case references (anonymized case ID, surgical date, hospital code, anatomical region: cranial, mandibular, pelvic, spinal).
- **CAD Design & Surgeon Sign-Off:** Strict versioning of 3D models (STL, STEP, CLI). Implements electronic signature gate: 3D printing cannot be scheduled until the attending surgeon officially approves the revision.
- **SLM Build Plate Layout:** Multiple patient implants nested onto a single titanium build plate. Tracks coordinate bounding box (X, Y, Z orientation) on the plate.
- **SLM Machine Telemetry Logging:** Chamber inert gas type (Argon), residual oxygen PPM (<100 ppm), laser power, scan speed, layer thickness (typically 30-60 µm), and total layer count.

#### 2.2 Data Schema (Prisma DSL)
```prisma
enum CaseStatus {
  DESIGN_IN_PROGRESS
  AWAITING_SURGEON_APPROVAL
  SURGEON_APPROVED
  NESTED_IN_BUILD
  MANUFACTURED
  CANCELLED
}

enum BuildStatus {
  PREPARATION
  PRINTING
  SUCCESSFULLY_COMPLETED
  FAILED_ABORTED
}

model PatientImplantCase {
  id                    String            @id @default(uuid())
  anonymizedCaseCode    String            @unique // e.g., PSI-2026-CRANIAL-089
  anatomicalLocation    String            // Cranial, Mandible, Acetabulum
  leadSurgeonName       String
  hospitalAffiliation   String
  targetSurgeryDate     DateTime
  status                CaseStatus        @default(DESIGN_IN_PROGRESS)
  
  cadRevisions          CadRevision[]
  buildPlacements       BuildPlatePlacement[]
  
  createdAt             DateTime          @default(now())
}

model CadRevision {
  id                    String              @id @default(uuid())
  caseId                String
  case                  PatientImplantCase  @relation(fields: [caseId], references: [id])
  revisionNumber        Int                 // 1, 2, 3...
  stlFileHashSha256     String              // Integrity check for 3D file
  fileStoragePath       String
  
  // 21 CFR Part 11 Surgeon Sign-Off
  isSurgeonApproved     Boolean             @default(false)
  surgeonSignatureHash  String?
  surgeonSignedAt       DateTime?
  
  createdAt             DateTime            @default(now())
}

model SlmBuildJob {
  id                    String              @id @default(uuid())
  jobCode               String              @unique // e.g., BUILD-SLM-2026-11-004
  machineId             String              // Equipment serial number
  layerThicknessMicrons Int                 @default(30)
  totalLayers           Int
  inertGasType          String              @default("Argon 5.0 (99.999%)")
  maxOxygenPpmLogged    Decimal             @db.Decimal(6, 2)
  status                BuildStatus         @default(PREPARATION)
  
  powderUsages          BuildPowderUsage[]
  implantPlacements     BuildPlatePlacement[]
  
  startedAt             DateTime?
  completedAt           DateTime?
}

model BuildPlatePlacement {
  id                    String              @id @default(uuid())
  buildJobId           String
  buildJob              SlmBuildJob         @relation(fields: [buildJobId], references: [id])
  caseId                String
  case                  PatientImplantCase  @relation(fields: [caseId], references: [id])
  plateCoordinateX      Decimal             @db.Decimal(8, 2)
  plateCoordinateY      Decimal             @db.Decimal(8, 2)
  implantSerialBarcode  String              @unique // Direct Laser Markable ID
}

model BuildPowderUsage {
  id                    String        @id @default(uuid())
  buildJobId           String
  buildJob              SlmBuildJob   @relation(fields: [buildJobId], references: [id])
  powderLotId           String
  powderLot             PowderLot     @relation(fields: [powderLotId], references: [id])
  weightLoadedKg        Decimal       @db.Decimal(8, 3)
}
```

---

### Module 3: Post-Processing Routing & Inspection (စက်ပြင်ပ ဆေးဘက်ဆိုင်ရာ အဆင့်ဆင့် ပြုပြင်ခြင်း)
*Reference Base: ERPNext Manufacturing Operations & ISO 13485 QMS*

#### 3.1 Post-Processing Standard Routing Stages
After 3D printing, titanium implants have internal residual stresses and rough surfaces unsuitable for medical insertion. They must undergo strict sequential operations:
1. **Stress Relief / Vacuum Heat Treatment:** Vacuum furnace annealing (e.g., 800°C for 2h under argon) to eliminate residual stress before removal from the plate.
2. **Substrate Separation:** Wire EDM (Electrical Discharge Machining) to slice implants off the titanium base plate.
3. **Support Structure Removal & CNC Finishing:** Manual/CNC deburring of sacrificial support scaffolding.
4. **Surface Treatment / Passivation:** Ultrasonic cleaning, acid pickling/passivation (ASTM F86) to form a biocompatible TiO2 oxide layer.
5. **Quality Control (CMM & Density):** Coordinate Measuring Machine (CMM) dimensional tolerance check and Archimedes density check (≥ 99.5% theoretical density).
6. **Cleanroom Packaging & Sterilization:** Double-pouch medical blister packing and Gamma/Ethylene Oxide (EtO) sterilization.

#### 3.2 Data Schema (Prisma DSL)
```prisma
enum OperationStage {
  VACUUM_HEAT_TREATMENT
  WIRE_EDM_SEPARATION
  SUPPORT_REMOVAL
  PASSIVATION_ASTM_F86
  CMM_DIMENSIONAL_INSPECTION
  DENSITY_ARCHIMEDES_TEST
  CLEANROOM_PACKAGING
  STERILIZATION
}

enum OperationVerdict {
  PENDING
  PASSED
  FAILED_REWORKABLE
  SCRAPPED_DEFECT
}

model PostProcessWorkOrder {
  id                    String                @id @default(uuid())
  implantSerialBarcode  String                @unique
  currentStage          OperationStage        @default(VACUUM_HEAT_TREATMENT)
  isCompleted           Boolean               @default(false)
  
  operations            OperationExecution[]
}

model OperationExecution {
  id                    String                @id @default(uuid())
  workOrderId           String
  workOrder             PostProcessWorkOrder  @relation(fields: [workOrderId], references: [id])
  stage                 OperationStage
  technicianUserId      String
  equipmentId           String                // e.g., Vacuum Furnace #02
  
  // Specific Run Telemetry
  temperatureCelsius    Decimal?              @db.Decimal(6, 2)
  durationMinutes       Int?
  measuredDensity       Decimal?              @db.Decimal(5, 4) // e.g. 4.41 g/cm3
  
  verdict               OperationVerdict      @default(PENDING)
  notes                 String?
  executedAt            DateTime              @default(now())
  
  // Quality Assurance Sign-Off
  qaInspectorUserId     String?
  qaSignatureHash       String?
  qaSignedAt            DateTime?
}
```

---

### Module 4: Immutable Audit Trail & eDHR (Electronic Device History Record)
*Reference Base: FDA 21 CFR Part 11 Electronic Records & Cryptographic Audit Trails*

#### 4.1 Functional Scope
- **FDA 21 CFR Part 11 Compliance:**
  - No `UPDATE` or `DELETE` can occur without an immutable row written to `AuditLog`.
  - Digital signatures require two distinct identification components (User ID + Cryptographic Private Key / Password verification) and an explicit Reason for Signature.
- **Hash Chaining (Tamper Evidence):** Each audit record contains the SHA-256 hash of the preceding record (`previousRecordHash`), creating an unalterable merkle-like chain.
- **eDHR Document Compilation:** A single endpoint compiles all Powder Lot details, SLM Machine Logs, Post-Processing Sign-offs, and CMM inspection certificates into a certified PDF package stamped with a global checksum.

#### 4.2 Data Schema (Prisma DSL)
```prisma
model AuditLog {
  id                    BigInt        @id @default(autoincrement())
  tableName             String
  recordId              String
  action                String        // INSERT, UPDATE, SOFT_DELETE, SIGN_OFF
  preImageJson          Json?         // Snapshot of data BEFORE change
  postImageJson         Json          // Snapshot of data AFTER change
  
  // 21 CFR Part 11 Attribution
  userId                String
  userIpAddress         String
  reasonForChange       String        // Mandatory justification
  digitalSignatureHash  String?       // HMAC/SHA-256 signature
  
  // Tamper-Evident Hash Chain
  previousRecordHash    String
  currentRecordHash     String
  
  timestamp             DateTime      @default(now())
}

model DeviceHistoryRecordRelease {
  id                    String        @id @default(uuid())
  implantSerialBarcode  String        @unique
  eDhrPdfStorageUrl     String
  pdfSha256Checksum     String
  
  // Final Medical Release Authorization
  releasedByQaLeadId    String
  qaDigitalSignature    String
  releasedAt            DateTime      @default(now())
  isReleasedForSurgery  Boolean       @default(false)
}
```

#### 4.3 PostgreSQL Trigger for Automated Audit Ingestion
```sql
-- PostgreSQL Automated Audit Trigger Implementation (FDA 21 CFR Part 11)
CREATE OR REPLACE FUNCTION process_21cfr11_audit() 
RETURNS TRIGGER AS $$
DECLARE
    last_hash TEXT;
    computed_hash TEXT;
    reason TEXT;
    acting_user TEXT;
BEGIN
    -- Extract session variables set by API layer
    acting_user := current_setting('app.current_user_id', true);
    reason := current_setting('app.reason_for_change', true);
    IF (acting_user IS NULL) THEN
        RAISE EXCEPTION 'FDA 21 CFR Part 11 Violation: User identity not established in database session.';
    END IF;

    -- Fetch latest hash in chain
    SELECT currentRecordHash INTO last_hash FROM "AuditLog" ORDER BY id DESC LIMIT 1;
    IF (last_hash IS NULL) THEN
        last_hash := '0000000000000000000000000000000000000000000000000000000000000000';
    END IF;

    -- Compute SHA256 of current record
    computed_hash := encode(digest(last_hash || TG_TABLE_NAME || TG_OP || now()::text || coalesce(NEW::text, OLD::text), 'sha256'), 'hex');

    IF (TG_OP = 'UPDATE') THEN
        INSERT INTO "AuditLog" ("tableName", "recordId", "action", "preImageJson", "postImageJson", "userId", "reasonForChange", "previousRecordHash", "currentRecordHash")
        VALUES (TG_TABLE_NAME, OLD.id::text, 'UPDATE', to_jsonb(OLD), to_jsonb(NEW), acting_user, coalesce(reason, 'General Update'), last_hash, computed_hash);
        RETURN NEW;
    ELSIF (TG_OP = 'DELETE') THEN
        RAISE EXCEPTION 'FDA 21 CFR Part 11 Violation: Direct DELETE forbidden. Use Soft Deactivation.';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

---

## 3. Developer & AI Agent Execution Instructions

To generate code using this specification:

1. **Database Migration:** Apply the Prisma schema above using `npx prisma migrate dev`. Run the audit trigger SQL script to ensure database-level immutability.
2. **API Layer Formulation:**
   - Build controllers using NestJS or Go.
   - Every write endpoint (`POST`, `PUT`, `PATCH`) must intercept headers `X-User-ID`, `X-Signature-Token`, and `X-Reason-For-Change`, passing them to PostgreSQL session variables via `SET LOCAL app.current_user_id = ...`.
3. **Verification & Testing (Validation Gate):**
   - Write an automated test suite verifying that updating a `PowderLot` without a `reason_for_change` is actively aborted by the database.
   - Write an end-to-end integration test creating a Powder Lot, scheduling a Build Job, executing 6 post-processing operations, and generating a validated eDHR PDF package with a matching SHA-256 hash.
