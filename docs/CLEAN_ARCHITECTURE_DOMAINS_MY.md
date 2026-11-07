# MetiTrack — Medical Device & 3D Titanium Implant MES
## Clean Architecture Domain Breakdown & UI/UX Post-Mortem Guide (`docs/CLEAN_ARCHITECTURE_DOMAINS_MY.md`)

> **Target Enterprise:** Meticuly Co., Ltd. (Bangkok, Thailand)  
> **Industry Domain:** Class III Medical Devices & Patient-Specific Implants (PSI) Additive Manufacturing  
> **Compliance Standards:** ISO 13485:2016, US FDA 21 CFR Part 820 (Quality System Regulation), 21 CFR Part 830 (UDI)  
> **Architecture Standard:** Domain-Driven Design (DDD) & Clean Architecture  
> **Document Status:** Official Architectural Specification (Pre-Implementation Reference)

---

## ၁။ အရင် UI/UX ၏ ပြဿနာများကို ပွင့်ပွင့်လင်းလင်း သုံးသပ်ခြင်း (Honest Blaming & Post-Mortem)

User ပေးပို့ထားသော UI Screenshot ကို Senior Product Designer နှင့် Enterprise Frontend Architect အမြင်ဖြင့် အားမနာတမ်း သုံးသပ်ရလျှင် အောက်ပါ **ပြင်းထန်သော UI/UX Design Flaws (အမှားများ)** ကြောင့် အသုံးပြုသူကို မျက်စိညောင်းစေခြင်းနှင့် စိတ်ပင်ပန်းမှု (Cognitive Fatigue) ကို ဖြစ်ပေါ်စေခဲ့သည်-

```
[ အရင် UI ၏ Layout ပြဿနာ ]
┌──────────────┬─────────────────────────────────────────────────────────────┐
│ 260px Fixed  │ 5 Columns jammed into ~1000px screen space (No H-Scroll)   │
│ Dark Sidebar │ ┌──────────┬──────────┬──────────┬──────────┬──────────┐    │
│              │ │ ~190px   │ ~190px   │ ~190px   │ ~190px   │ ~190px   │    │
│ (Screen space│ │ Squished │ Squished │ Squished │ Squished │ Squished │    │
│ 18-20% Wasted│ │ Text cut │ Text cut │ Text cut │ Text cut │ Text cut │    │
│ for icons)   │ └──────────┴──────────┴──────────┴──────────┴──────────┘    │
└──────────────┴─────────────────────────────────────────────────────────────┘
```

### ၁.၁ တွေ့ရှိရသော အဓိက UI/UX အမှားများ (Critical Flaws)
1. **Sidebar ကြောင့် Screen နေရာ အလဟဿဖြစ်ခြင်း (Viewport Waste):**
   - 260px ရှိသော အမည်းရောင် Sidebar ကြီးသည် Desktop Screen တစ်ခုလုံး၏ 18% မှ 20% အထိ နေရာယူထားသည်။
   - Sidebar တွင် Menu item အနည်းငယ်သာ ရှိသော်လည်း မျက်နှာပြင်တစ်ခုလုံးကို ညှပ်ထားသလို ဖြစ်နေသည်။
2. **Horizontal Scroll မပါဘဲ ၅ ခုစလုံးကို အတင်းကျဉ်းကျပ် ထည့်ထားခြင်း (Severe Column Squishing):**
   - Station (၅) ခုကို ရေပြင်ညီ မျက်နှာပြင်တွင် အတင်းကြိတ်ထည့်ထားသောကြောင့် Column တစ်ခုချင်းစီသည် 180px–200px ဝန်းကျင်သာ ကျန်တော့သည်။
   - ရလဒ်အနေဖြင့် စာသားများ နေရာမဆံ့တော့ဘဲ ခေါက်ကျိုးကျခြင်းများ ဖြစ်ပေါ်သည်-
     - `CAS-2026-083` သည် `CAS-` တစ်ကြောင်း၊ `2026-083` တစ်ကြောင်း စာလုံးကျိုးသွားသည်။
     - `# Mandibular...` နှင့် `# Acetabular...` စသည့် အရေးကြီးသော ဆေးဘက်ဆိုင်ရာ ကိုယ်အင်္ဂါ အစိတ်အပိုင်း အမည်များ Truncate ဖြစ်သွားသည်။
3. **Card တစ်ခုတည်းတွင် အချက်အလက်များ အကုန်ပုံထည့်ထားခြင်း (Lack of Progressive Disclosure):**
   - Card တစ်ခုစီပေါ်တွင် Patient ID, Anatomy, Resource Badges (4 ခုမှ 5 ခုအထိ), 3D CAD ခလုတ်, Audit ခလုတ်, Advance ခလုတ်, UDI Label ခလုတ် အားလုံးကို တပြိုင်နက် ပြသထားသည်။
   - ဆေးရုံ/စက်ရုံမှ Operator တစ်ဦးအတွက် မလိုအပ်ဘဲ Visual Noise (အမြင်အာရုံ အနှောင့်အယှက်) အလွန်များပြားသည်။
4. **Empty State များ နေရာယူလွန်းခြင်း (Station Idle Waste):**
   - အလုပ်မရှိသော Station များတွင် "Station Idle" ဟုဆိုကာ ကြီးမားသော Card အလွတ်ကြီးများဖြင့် နေရာဖြုန်းထားသည်။
5. **Color Contrast & Visual Hierarchy ရှုပ်ထွေးခြင်း:**
   - အပြာနုရောင် Badge များ၊ အမည်းရောင် ခလုတ်များ၊ အဝါရောင် Badge များ အစီအစဉ်မကျဘဲ ပြန့်ကျဲနေသောကြောင့် မည်သည့်အရာက အရေးကြီးသည် (Call-To-Action) ကို ချက်ချင်း မခွဲခြားနိုင်ပါ။

---

## ၂။ Metronic 9 & Linear Enterprise UI Architecture သို့ ပြောင်းလဲမည့် ဖြေရှင်းနည်း

အထက်ပါ ပြဿနာများကို နိုင်ငံတကာ Enterprise SaaS Dashboard များ (Metronic 9, Linear, Siemens MES) စံနှုန်းအတိုင်း အောက်ပါအတိုင်း ရှင်းလင်းပြေပြစ်အောင် ပြင်ဆင်ဖွဲ့စည်းမည်-

```
[ Metronic / Linear Style Architecture ]
┌────┬─────────────────────────────────────────────────────────────────────────┐
│ 68 │ Global Filter / Search Ribbon (High-density header)                     │
│ px ├─────────────────────────────────────────────────────────────────────────┤
│ S  │ ◄─── Horizontal Smooth Scroll Kanban Canvas (min-w-[320px] per column) ───►
│ l  │ ┌───────────────┐ ┌───────────────┐ ┌───────────────┐ ┌───────────────┐ │
│ i  │ │ Station 1     │ │ Station 2     │ │ Station 3     │ │ Station 4     │ │
│ m  │ │ (w-80: 320px) │ │ (w-80: 320px) │ │ (w-80: 320px) │ │ (w-80: 320px) │ │
│    │ │ Clean Card    │ │ Clean Card    │ │ Clean Card    │ │ Clean Card    │ │
│ A  │ │ Minimal Info  │ │ Minimal Info  │ │ Minimal Info  │ │ Minimal Info  │ │
│ s  │ │ Advance Button│ │ Advance Button│ │ Advance Button│ │ Advance Button│ │
│ i  │ └───────────────┘ └───────────────┘ └───────────────┘ └───────────────┘ │
│ d  │                                                                         │
│ e  │ ──► Card ကို Click လုပ်လျှင် ညာဘက်မှ 480px Slide-over Drawer ထွက်လာမည်   │
└────┴─────────────────────────────────────────────────────────────────────────┘
```

### အဓိက တိုးတက်ပြောင်းလဲမှု ၃ ချက်-
1. **Slim Sidebar (68px Width):** Icon-only tooltip ပါဝင်သော Metronic Mini Sidebar ဖြင့် Screen ဧရိယာ 95% အထိ ကျယ်ဝန်းစွာ ရယူမည်။
2. **Horizontal Free-Scroll Board (`min-w-[320px]`):** Column တစ်ခုချင်းစီကို 320px အကျယ် တိကျစွာ သတ်မှတ်ပေးထားသဖြင့် မည်သည့် စာသားမှ ညှပ်မသွားဘဲ သန့်ရှင်းစွာ မြင်တွေ့ရမည်။
3. **Offcanvas Slide-Over Drawer (Progressive Disclosure):**
   - Card ပေါ်တွင် မလိုအပ်သော အသေးစိတ် အချက်အလက်များကို မတင်ထားဘဲ Case ID, Patient Ref, Anatomy နှင့် `Advance ➔` ခလုတ်တစ်ခုတည်းကိုသာ ရှင်းရှင်းလင်းလင်း ပြသမည်။
   - Card ကို Click နှိပ်လိုက်မှသာ ညာဘက်မှ **480px Slide-Over Drawer** ချောမွေ့စွာ ပွင့်လာပြီး 3D Model, DHR Audit Trail, Resource Consumption နှင့် UDI Barcode Print လုပ်ခြင်းများကို စိတ်အေးချမ်းသာစွာ ကြည့်ရှုအသုံးပြုနိုင်မည်။

---

## ၃။ Clean Architecture အရ Domain (၃) ခု အတိအကျ ခွဲခြားသတ်မှတ်ခြင်း

Meticuly ပရောဂျက်ကို Enterprise Software Engineering စံနှုန်းအတိုင်း **Domain (၃) ခု** တိကျစွာ ပိုင်းခြားထားသည်-

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ 3. FEATURE / APPLICATION DOMAIN (User Workflows & Presentation)             │
│    • Module 1: Patient Order Intake & Triage Modal                          │
│    • Module 2: Metronic 5-Station Horizontal Pipeline                       │
│    • Module 3: Offcanvas Detail Slide-Over Drawer (Progressive Disclosure)  │
│    • Module 4: Three.js Interactive 3D WebGL Titanium Mesh Viewport        │
│    • Module 5: Automated Medical UDI Barcode Label Generator (FDA 21 CFR)   │
│    • Module 6: Factory Telemetry & Bottleneck Dashboard (Recharts)         │
│    • Module 7: Master Queue Dense Data Table (Auditing View)               │
├─────────────────────────────────────────────────────────────────────────────┤
│ 2. BUSINESS LOGIC DOMAIN (Core Invariants, Rules & Calculation Engines)     │
│    • Rule 1: Strict Sequential State Machine (Step N ➔ N+1 only)            │
│    • Rule 2: Atomic State Transition with Concurrency Row-Locking           │
│    • Rule 3: Automated Inventory Balance Depletion (Stock Deduction)        │
│    • Rule 4: Dynamic Cumulative Case Cost Accumulation Formula              │
│    • Rule 5: ISO 13485 Device History Record (DHR) Audit Immutability       │
│    • Rule 6: Server-Side Role-Based Access Control (RBAC) Permission Gates  │
├─────────────────────────────────────────────────────────────────────────────┤
│ 1. CRUD & PERSISTENCE DOMAIN (Database Models & Storage Contracts)          │
│    • Entity Models: Order, ProcessStep, Resource, Consumption, OrderStepLog │
│    • Indexing, Filtering, Foreign Keys, Schema Integrity, Pagination        │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

### ဒိုမိန်း ၁။ CRUD & Persistence Domain (အချက်အလက် သိမ်းဆည်းခြင်း အလွှာ)

ဤ Domain သည် Database Schema များ၊ ဆက်သွယ်ချက်များ (Foreign Keys)၊ Validation နှင့် Data Read/Write သီးသန့်သာ ဖြစ်ပြီး မည်သည့် Workflow Side-effects မျှ မပါဝင်ပါ။

| Entity (ဇယားအမည်) | တာဝန်နှင့် ရည်ရွယ်ချက် | အဓိက Fields & Types |
| :--- | :--- | :--- |
| **`Order`** | လူနာတစ်ဦးချင်းစီ၏ စိတ်ကြိုက် 3D Implant ထုတ်လုပ်မှု အော်ဒါ (Aggregate Root) | `id` (PK, UUID/Int)<br>`case_id` (Unique, e.g. `CAS-2026-081`)<br>`patient_ref` (HIPAA Hash, e.g. `PT-BKK-491`)<br>`implant_type` (Enum: Cranial, Mandibular, Acetabular, Spinal)<br>`priority` (Enum: Standard, Urgent)<br>`status` (Enum: Pending, In Progress, Completed, Cancelled)<br>`current_step_id` (FK to ProcessStep)<br>`created_at`, `updated_at` |
| **`ProcessStep`** | ထုတ်လုပ်မှု အဆင့် ၅ ဆင့်၏ Master Definition | `id` (PK)<br>`sequence_order` (Int: 1 မှ 5 အထိ)<br>`code` (String, e.g. `CAD_MODELING`, `PRINTING_SLM`)<br>`name` (String, အဆင့်အမည်)<br>`description` (Text)<br>`suggested_resource_ids` (JSON) |
| **`Resource`** | ကုန်ကြမ်းပစ္စည်းများ၊ စက်ချိန်နှင့် လုပ်သားနာရီ စာရင်း (Inventory) | `id` (PK)<br>`name` (String, e.g. `Medical-grade Ti-6Al-4V ELI Powder`)<br>`category` (Enum: Material, Machine, Labor)<br>`unit` (Enum: Grams, Hours, Units)<br>`cost_per_unit` (Decimal, ဈေးနှုန်း)<br>`total_available` (Decimal, လက်ကျန် Stock) |
| **`OrderResourceConsumption`** | အော်ဒါတစ်ခုမှ ကုန်ကျစရိတ်နှင့် သုံးစွဲမှု မှတ်တမ်း (Ledger Entry) | `id` (PK)<br>`order_id` (FK to Order)<br>`step_id` (FK to ProcessStep)<br>`resource_id` (FK to Resource)<br>`quantity` (Decimal > 0)<br>`logged_at` (Timestamp)<br>`logged_by` (String, အော်ပရေတာ အမည်) |
| **`OrderStepLog`** | အဆင့်ကျော်လွှားမှု အချိန်နှင့် မှတ်တမ်း (Device History Record - DHR) | `id` (PK)<br>`order_id` (FK to Order)<br>`from_step_id` (FK to ProcessStep, Nullable)<br>`to_step_id` (FK to ProcessStep, Nullable)<br>`transitioned_at` (Timestamp)<br>`operator_name` (String)<br>`notes` (Text) |

#### ဤ Domain တွင် ပါဝင်သော Pure CRUD စွမ်းဆောင်ရည်များ-
- **Create:** အော်ဒါအသစ် တည်ဆောက်ခြင်း (`status = IN_PROGRESS`, `current_step = Step 1`)။
- **Read / Filter:** Orders များကို Status, Implant Type, Priority တို့ဖြင့် Filter စစ်ထုတ်ခြင်းနှင့် Keyword ရှာဖွေခြင်း။
- **Read Detail:** Order ၏ မူလအချက်အလက်များနှင့် ချိတ်ဆက်ထားသော `current_step`, `step_logs`, `consumptions` များကို Pre-fetch လုပ်၍ ဆွဲထုတ်ခြင်း။
- **Read Master Data:** အဆင့် (၅) ဆင့်နှင့် ကုန်ကြမ်းပစ္စည်းလက်ကျန် (Resources) များကို ရယူခြင်း။

---

### ဒိုမိန်း ၂။ Business Logic Domain (လုပ်ငန်း စည်းမျဉ်းနှင့် တွက်ချက်မှု အင်ဂျင်များ)

ဤ Domain သည် System ၏ အသည်းနှလုံးဖြစ်ပြီး ဆေးဘက်ဆိုင်ရာ ထုတ်လုပ်မှု စံနှုန်းများ၊ သင်္ချာဖော်မြူလာများနှင့် စည်းမျဉ်းများကို ထိန်းချုပ်သည်။ UI နှင့် လုံးဝ သီးခြားဖြစ်ရမည်။

#### ၂.၁ Strict Sequential State Machine (တင်းကျပ်သော အဆင့်ကျော်ခွင့်မပြုသည့် စည်းမျဉ်း)
1. **Zero Step-Skipping Rule:**
   - အော်ဒါတစ်ခုသည် Step $N$ တွင် ရှိနေပါက Step $N+1$ သို့သာ ကူးပြောင်းခွင့်ရှိသည်။
   - ဥပမာ- Step 1 မှ Step 3 သို့ တိုက်ရိုက်ကျော်သွားခြင်း (Illegal Skip) ကို Server-side မှ HTTP 400 Bad Request ပေး၍ လုံးဝ ပိတ်ပင်သည်။
2. **Automatic Terminal Completion:**
   - နောက်ဆုံးအဆင့်ဖြစ်သော Step 5 (Medical Packaging & Labeling) ပြီးမြောက်ပါက `order.status` သည် အလိုအလျောက် `COMPLETED` သို့ ပြောင်းလဲသွားပြီး `can_advance = False` ဖြစ်သွားရမည်။
3. **Pessimistic Concurrency & Row-Level Locking:**
   - Operator နှစ်ဦး တပြိုင်နက် Advance ခလုတ် နှိပ်မိပါက ပြဿနာမဖြစ်စေရန် Backend Database တွင် `transaction.atomic()` နှင့် `select_for_update()` သုံးပြီး Order Record ကို Lock ချထားရမည်။

#### ၂.၂ Automated Inventory Depletion Engine (ပစ္စည်းလက်ကျန် အလိုအလျောက် နှုတ်ယူခြင်း)
- အဆင့်တစ်ခု ပြီးမြောက်၍ အသုံးပြုခဲ့သော ကုန်ကြမ်းပစ္စည်းပမာဏ (Quantity) ကို ထည့်သွင်းလိုက်သည်နှင့် System သည် Inventory စာရင်းမှ အလိုအလျောက် နုတ်ယူရမည်-
  $$\text{Resource.total\_available}_{\text{new}} = \text{Resource.total\_available}_{\text{old}} - \text{quantity\_consumed}$$
- အကယ်၍ သုံးစွဲသည့် ပမာဏသည် လက်ကျန် Stock ထက် ကျော်လွန်နေပါက သို့မဟုတ် သုညထက် နည်းနေပါက (`quantity <= 0`) Validation Error ထုတ်ပြန်ရမည်။

#### ၂.၃ Cumulative Case Cost Accumulation Formula (စုစုပေါင်း ကုန်ကျစရိတ် တွက်ချက်မှု)
- Case တစ်ခုချင်းစီ၏ စုစုပေါင်း ကုန်ကျစရိတ်ကို အဆင့်တိုင်းတွင် အသုံးပြုခဲ့သော ကုန်ကြမ်း၊ စက်နာရီနှင့် လုပ်သားခများအပေါ် အခြေခံ၍ dynamic တွက်ချက်သည်-
  $$\text{Total Case Cost} = \sum_{i=1}^{M} (\text{quantity}_i \times \text{cost\_per\_unit}_i)$$

#### ၂.၄ ISO 13485 Device History Record (DHR) Immutability
- Step အပြောင်းအလဲတိုင်းအတွက် `OrderStepLog` ကို မဖြစ်မနေ Create လုပ်ရမည်။
- ထို Log များသည် ဆေးဘက်ဆိုင်ရာ စစ်ဆေးမှု (Audit) အတွက် အလွန်အရေးကြီးသဖြင့် မည်သည့် API endpoint မှတစ်ဆင့်မျှ Update သို့မဟုတ် Delete ပြုလုပ်ခွင့်မရှိပါ (Append-Only Invariant)။

#### ၂.၅ Server-Side Role-Based Access Control (RBAC) Permissions
- **Step 1 (CAD Modeling):** `Biomedical Engineer` သို့မဟုတ် `Admin` သာ Advance လုပ်ပိုင်ခွင့်ရှိသည်။
- **Step 2 & 3 (3D Printing & CNC):** `Production Operator` သို့မဟုတ် `Admin` သာ လုပ်ပိုင်ခွင့်ရှိသည်။
- **Step 4 & 5 (QA & Packaging):** `QA Specialist` သို့မဟုတ် `Admin` သာ Release ပေးပိုင်ခွင့်ရှိသည်။

---

### ဒိုမိန်း ၃။ Feature / Application Presentation Domain (အသုံးပြုသူ တွေ့ကြုံရမည့် Features များ)

ဤ Domain သည် Business Logic များကို အခြေခံ၍ User Interface ပေါ်တွင် စိတ်ချမ်းသာစွာ အသုံးပြုနိုင်ရန် Metronic 9 စံနှုန်းဖြင့် တည်ဆောက်မည့် Features များ ဖြစ်သည်-

#### Feature Module 1: Patient Order Intake & Triage Modal
- **HIPAA Masked Entry:** လူနာ၏ အမည်ရင်းကို မသုံးဘဲ စနစ်တကျ Hash လုပ်ထားသော Patient Reference (`PT-BKK-xxxx`) အလိုအလျောက် ထုတ်ပေးခြင်း။
- **Anatomy Selector:** Cranial Plate, Mandibular, Acetabular Cup, Spinal Cage စသည့် ပုံစံများကို Visual ရွေးချယ်နိုင်ခြင်း။
- **Urgent Trauma Flag:** အရေးပေါ် ခွဲစိတ်မှုများအတွက် `🚨 Urgent` Switch တစ်ချက်နှိပ်ရုံဖြင့် အနီရောင် Highlight ပြသပေးခြင်း။

#### Feature Module 2: Metronic 5-Station Horizontal Pipeline
- **320px Fixed-width Column Board:** Screen ကြီးသည်ဖြစ်စေ သေးသည်ဖြစ်စေ Column အကျယ် 320px အပြည့်ရှိပြီး Horizontal Smooth Scroll ပါဝင်သဖြင့် စာလုံးကျိုးခြင်း၊ ညှပ်ခြင်း လုံးဝ မရှိစေရ။
- **Minimal High-Density Card:** Case ID, Patient Hash, Anatomy, Step Progress (`Step X of 5`) နှင့် အဓိက လုပ်ဆောင်ရမည့် `Advance ➔` ခလုတ်တစ်ခုသာ ပါဝင်မည်။
- **Station-Specific Advance Dialog:** ခလုတ်နှိပ်လိုက်ပါက သက်ဆိုင်ရာ Station တွင် သုံးစွဲရမည့် ကုန်ကြမ်း (ဥပမာ- Step 2 တွင် Titanium ပေါင်ဒါဂရမ်၊ Step 3 တွင် CNC စက်နာရီ) ကိုသာ Dynamic တောင်းခံမည်။

#### Feature Module 3: Offcanvas Detail Slide-Over Drawer (Key UX Breakthrough)
- **Zero-Clutter Workspace:** Kanban Board ပေါ်တွင် မလိုအပ်ဘဲ ရှုပ်မနေစေရန် Card တစ်ခုကို Click လိုက်သည်နှင့် ညာဘက်မျက်နှာပြင်မှ **480px Slide-Over Drawer** ချောမွေ့စွာ ပွင့်လာမည်။
- **Drawer အတွင်း ပါဝင်မည့် အချက်အလက်များ-**
  1. လူနာနှင့် ခွဲစိတ်မှု အသေးစိတ် အချက်အလက်များ (Surgical Specs)
  2. 3D WebGL Titanium Implant Model Interactive စစ်ဆေးခန်း
  3. အဆင့်အလိုက် ကုန်ကျခဲ့သော ကုန်ကြမ်းပစ္စည်းနှင့် ကုန်ကျစရိတ် Ledger ဇယား
  4. ISO 13485 Device History Record (DHR) Timeline မှတ်တမ်းအပြည့်အစုံ
  5. ဆေးရုံသုံး UDI Barcode Label ကို Print ထုတ်ယူနိုင်သည့် ခလုတ်

#### Feature Module 4: Three.js Interactive 3D WebGL Titanium Mesh Viewport
- Browser ပေါ်တွင် ဆေးဘက်ဆိုင်ရာ Titanium 3D Mesh ကို 360° လှည့်ပတ်ကြည့်ရှုခြင်း (Orbit, Pan, Zoom)။
- 3D Printing အလွှာများ (30 μm Layer slicing) နှင့် ဝက်အူပေါက်များ တိကျမှု ရှိမရှိ စစ်ဆေးနိုင်သည့် **FEA Wireframe Mode Toggle** ပါဝင်ခြင်း။

#### Feature Module 5: Automated Medical UDI Barcode Label Generator
- US FDA 21 CFR 830 နှင့် GS1 စံနှုန်းနှင့်ညီသော Unique Device Identifier (UDI) Barcode အလိုအလျောက် ထုတ်လုပ်ပေးခြင်း။
- Cleanroom အတွင်း Laser marking ထိုးရန် သို့မဟုတ် ပိုးသတ်အိတ် (Sterile pouch) ပေါ်တွင် ကပ်ရန် `@media print` ဖြင့် စာရွက်ပေါ် တိုက်ရိုက်ထုတ်ယူနိုင်ခြင်း။

#### Feature Module 6: Factory Telemetry & Bottleneck Dashboard (Recharts)
- စက်ရုံတစ်ရုံလုံးရှိ Station အလိုက် အလုပ်ပိတ်ဆို့နေမှု (Bottleneck) ကို ဖော်ပြပေးသည့် Bar Chart။
- Titanium Powder သုံးစွဲမှု (kg)၊ စက်လည်ပတ်နာရီ (Machine Hours) နှင့် ကုန်ကျစရိတ် အချိုးအစား (Material vs Machine vs Labor) ကို ပြသပေးသော Donut Chart။
- ကုန်ကြမ်းပစ္စည်း လက်ကျန် (Inventory Balances) ကို အချိန်နှင့်တပြေးညီ ပြသပေးသော Live Status Cards။

#### Feature Module 7: Master Queue Dense Data Table (Auditing View)
- Kanban board အပြင် အော်ဒါများစွာကို တစ်စုတစ်စည်းတည်း Filter စစ်ထုတ်လိုသော QA Auditor များနှင့် စက်ရုံမန်နေဂျာများအတွက် Excel ကဲ့သို့ အသုံးပြုနိုင်သော High-density Data Table မြင်ကွင်း။

---

## ၄။ Backend Code Refactoring အကြံပြုချက် (Clean Architecture Service Layer)

ယခုလက်ရှိ Backend တွင် ViewSets ထဲ၌ Business Logic အချို့ ရောနှောနေသည်ကို ပိုမိုသန့်ရှင်းစေရန် အောက်ပါအတိုင်း **Service Layer Pattern** သို့ ပြောင်းလဲဖွဲ့စည်းသင့်သည်-

```
backend/manufacturing/
├── models/                     # CRUD & Data Layer
│   ├── order.py
│   ├── process_step.py
│   └── resource.py
├── services/                   # Business Logic Layer (Pure Domain Rules)
│   ├── order_service.py        # State transitions, Row-locking, DHR logging
│   └── inventory_service.py    # Stock deduction, Cost formulas, Insufficient checks
├── api/                        # Presentation / HTTP Adapters
│   ├── serializers.py
│   └── views.py                # Thin ViewSets, calls services
└── tests/                      # Automated Verification (Pytest 100% Pass)
```

### အကျိုးကျေးဇူး-
1. ViewSet များသည် HTTP Request လက်ခံခြင်းနှင့် Response ပြန်ခြင်းကိုသာ လုပ်ဆောင်မည် (Thin Controllers)။
2. စည်းမျဉ်းများ၊ Formula များနှင့် Stock Deduction များကို `services/` ထဲတွင် သီးသန့် စမ်းသပ်နိုင်မည် (Unit Testable without HTTP overhead)။

---

## ၅။ ရှေ့ဆက်သွားမည့် အဆင့်ဆင့် အစီအစဉ် (Action Roadmap)

> [!IMPORTANT]
> User ၏ ညွှန်ကြားချက်အရ **ယခုအဆင့်တွင် မည်သည့် Frontend သို့မဟုတ် Backend Code ကိုမျှ စတင်ရေးသားခြင်း မပြုသေးပါ**။ ဤ Markdown Specification ကို User သဘောတူအတည်ပြုပြီးမှသာ အောက်ပါအစီအစဉ်အတိုင်း စနစ်တကျ ဆက်လက်ဆောင်ရွက်မည်ဖြစ်ပါသည်-

1. **အဆင့် (၁) - Backend Service Layer ပြင်ဆင်ခြင်း:**
   - `services/order_service.py` နှင့် `services/inventory_service.py` ကို တည်ဆောက်ပြီး Stock Deduction နှင့် Row Locking များကို စနစ်တကျ ရေးသားခြင်း။
   - `pytest` ဖြင့် 100% အောင်မြင်ကြောင်း စစ်ဆေးအတည်ပြုခြင်း။
2. **အဆင့် (၂) - Frontend Metronic Architecture တည်ဆောက်ခြင်း:**
   - 68px Slim Sidebar + Top Filter Ribbon တည်ဆောက်ခြင်း။
   - `min-w-[320px]` Horizontal Free-Scroll Kanban Pipeline Board ပြင်ဆင်ခြင်း။
   - 480px Slide-Over Drawer ကို Progressive Disclosure Pattern ဖြင့် ထည့်သွင်းခြင်း။
3. **အဆင့် (၃) - Interactive 3D Viewport & UDI Label Generator ထည့်သွင်းခြင်း:**
   - Three.js Titanium Mesh Viewer ကို Drawer အတွင်း သန့်ရှင်းစွာ ပေါင်းစပ်ခြင်း။
   - GS1-128 UDI Barcode Print စနစ် ထည့်သွင်းခြင်း။
4. **အဆင့် (၄) - Final End-to-End Test & Deliverables စစ်ဆေးခြင်း:**
   - Docker Container Build ပြုလုပ်၍ စမ်းသပ်ခြင်း။
   - Meticuly HR သို့ ပေးပို့ရမည့် 1-Page Summary နှင့် Submission Link များ အဆင်သင့်ဖြစ်စေခြင်း။
