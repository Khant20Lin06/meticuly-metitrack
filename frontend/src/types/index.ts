export type ImplantType =
  | 'CRANIAL_PLATE'
  | 'MANDIBULAR_RECON'
  | 'HIP_ACETABULAR_CUP'
  | 'SPINAL_CAGE'
  | string;

export type OrderPriority = 'STANDARD' | 'URGENT' | string;
export type OrderStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
export type ResourceCategory = 'MATERIAL' | 'MACHINE_TIME' | 'LABOR';
export type ResourceUnit = 'GRAMS' | 'HOURS' | 'CYCLES' | 'UNITS';

export interface ProcessStep {
  id: number;
  sequence_order: number;
  code: string;
  name: string;
  description: string;
  suggested_resource_ids: number[];
}

export interface Resource {
  id: number;
  name: string;
  category: ResourceCategory;
  category_display: string;
  unit: ResourceUnit;
  unit_display: string;
  cost_per_unit: string | number;
  total_available: string | number;
}

export interface OrderResourceConsumption {
  id: number;
  order: number;
  step: number;
  step_name: string;
  resource: number;
  resource_name: string;
  resource_category: ResourceCategory;
  unit: ResourceUnit;
  quantity: number;
  cost: number;
  logged_at: string;
  logged_by: string;
}

export interface OrderStepLog {
  id: number;
  order: number;
  from_step: number | null;
  from_step_name: string | null;
  to_step: number;
  to_step_name: string;
  transitioned_at: string;
  operator_name: string;
  notes: string;
}

export interface CostBreakdownSummary {
  material_cost: number;
  machine_cost: number;
  labor_cost: number;
}

export interface StepCostDetail {
  step_id: number;
  step_name: string;
  sequence_order: number;
  step_total_cost: number;
  consumptions: Array<{
    consumption_id: number;
    resource_id: number;
    resource_name: string;
    category: ResourceCategory;
    quantity: number;
    unit: string;
    unit_cost: number;
    subtotal_cost: number;
  }>;
}

export interface OrderCostBreakdown {
  order_id: number;
  case_id: string;
  total_cost: number;
  cost_breakdown: CostBreakdownSummary;
  by_step: StepCostDetail[];
}

export interface ResourceSummaryItem {
  resource_id: number;
  name: string;
  category: string;
  unit: string;
  total_quantity: number;
}

export interface Order {
  id: number;
  case_id: string;
  patient_ref: string;
  implant_type: ImplantType;
  implant_type_display: string;
  priority: OrderPriority;
  priority_display: string;
  status: OrderStatus;
  status_display: string;
  current_step: ProcessStep;
  can_advance: boolean;
  total_cost: number;
  cost_breakdown: CostBreakdownSummary;
  resource_summary: ResourceSummaryItem[];
  step_logs: OrderStepLog[];
  created_at: string;
  updated_at: string;
}

export interface DHRPackage {
  dhr_document_id?: string;
  case_id: string;
  patient_ref: string;
  implant_type: string;
  status: string;
  current_step?: string;
  is_sealed?: boolean;
  udi_data?: {
    gtin_14: string;
    batch_lot: string;
    serial_case_id: string;
    gs1_128_barcode_string: string;
  };
  udi_barcode?: string;
  dhr_sha256_checksum?: string;
  dhr_seal_sha256?: string;
  financial_summary?: any;
  audit_trail?: Array<{
    log_id: number;
    from_step: string;
    to_step: string;
    operator_name: string;
    notes: string;
    timestamp: string;
  }>;
  resource_ledger?: any[];
  step_logs?: OrderStepLog[];
  total_cost?: number;
  digital_signature?: {
    algorithm: string;
    key_identifier: string;
    content_digest: string;
    signature: string;
    signed_at: string;
    signer: {
      signer_name: string;
      signer_username: string;
      signer_role: string;
      signer_role_display?: string;
      badge_number: string;
      certification_id: string;
      key_fingerprint?: string;
      public_key_pem?: string;
      signed_at: string;
      meaning: string;
      standard: string;
    };
    is_valid: boolean;
    non_repudiation_statement: string;
  };
  regulatory_compliance?: {
    iso_standard: string;
    fda_regulation: string;
    part_11_electronic_records: string;
    immutability_status: string;
  };
  compliance_statement?: string;
}

export interface SecurityAuditEvent {
  id: number;
  event_type: string;
  event_type_display: string;
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  severity_display: string;
  actor_username: string;
  ip_address: string | null;
  user_agent: string;
  endpoint: string;
  method: string;
  status_code: number | null;
  details: any;
  timestamp: string;
}

export interface StepDistributionItem {
  step_id: number;
  sequence_order: number;
  code: string;
  name: string;
  order_count: number;
}

export interface ResourceConsumptionStat {
  resource_id: number;
  name: string;
  category: ResourceCategory;
  unit: ResourceUnit;
  total_consumed: number;
  cost_per_unit: number;
  total_cost: number;
  total_available: number;
}

export interface PlantAnalytics {
  total_orders: number;
  in_progress: number;
  completed: number;
  step_distribution: StepDistributionItem[];
  resource_consumption: ResourceConsumptionStat[];
  financial_summary: {
    total_plant_cost?: number;
    grand_total_cost?: number;
    material_cost: number;
    machine_cost: number;
    labor_cost: number;
    average_cost_per_case?: number;
  };
}

export interface ResourceHealthAlert {
  resource_id: number;
  name: string;
  category: string;
  unit: string;
  current_stock: number;
  safety_stock: number;
  status: 'HEALTHY' | 'LOW_STOCK' | 'CRITICAL_DEPLETION';
}

export interface PlantStockHealth {
  healthy: boolean;
  alerts: ResourceHealthAlert[];
}

export interface RoleInfo {
  name: string;
  authorized_steps: number[];
  description: string;
}

export type RoleKey = 'BIOMEDICAL_ENGINEER' | 'PRODUCTION_OPERATOR' | 'QA_SPECIALIST' | 'ADMIN';
export type RoleCatalog = Record<RoleKey, RoleInfo>;

export interface ResourceInputItem {
  resource_id: number;
  quantity: number;
}

export interface AdvanceOrderPayload {
  operator_name: string;
  notes?: string;
  resources?: ResourceInputItem[];
  expected_step_sequence?: number;
}

export interface CreateOrderPayload {
  case_id: string;
  patient_ref: string;
  implant_type: ImplantType;
  priority: OrderPriority;
  operator_name?: string;
  notes?: string;
}

export interface UpdateOrderMetadataPayload {
  patient_ref?: string;
  priority?: OrderPriority;
}

export interface AuthUser {
  id: number;
  username: string;
  name: string;
  email: string;
  role: RoleKey;
  title: string;
  badge_number: string;
  certification_id: string;
  authorized_steps: number[];
  is_superuser: boolean;
}

export interface LoginResponse {
  access: string;
  refresh: string;
  user: AuthUser;
}

export interface OperatorAccount {
  id: number;
  username: string;
  name: string;
  email: string;
  role: RoleKey;
  title: string;
  badge_number: string;
  authorized_steps: number[];
}
