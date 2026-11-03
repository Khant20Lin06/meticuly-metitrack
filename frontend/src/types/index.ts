export interface ProcessStep {
  id: number;
  sequence_order: number;
  code: string;
  name: string;
  description: string;
  suggested_resource_ids?: number[];
}

export type ImplantType =
  | 'CRANIAL_PLATE'
  | 'MANDIBULAR_RECON'
  | 'HIP_ACETABULAR_CUP'
  | 'SPINAL_CAGE';

export type Priority = 'STANDARD' | 'URGENT';
export type OrderStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

export interface Resource {
  id: number;
  name: string;
  category: 'MATERIAL' | 'MACHINE_TIME' | 'LABOR';
  unit: 'GRAMS' | 'HOURS' | 'UNITS';
  cost_per_unit: string;
  total_available: string;
}

export interface OrderResourceConsumption {
  id: number;
  order: number;
  step: number;
  resource: number;
  resource_name: string;
  resource_category: 'MATERIAL' | 'MACHINE_TIME' | 'LABOR';
  quantity: string;
  unit: string;
  cost_per_unit: string;
  subtotal_cost: number;
  logged_at: string;
  logged_by: string;
}

export interface OrderStepLog {
  id: number;
  order: number;
  from_step: number | null;
  from_step_name: string;
  to_step: number | null;
  to_step_name: string;
  operator_name: string;
  notes: string;
  transitioned_at: string;
}

export interface Order {
  id: number;
  case_id: string;
  patient_ref: string;
  implant_type: ImplantType;
  priority: Priority;
  status: OrderStatus;
  current_step: ProcessStep;
  consumptions: OrderResourceConsumption[];
  step_logs: OrderStepLog[];
  total_cost: number;
  can_advance: boolean;
  created_at: string;
  updated_at: string;
}

export interface AnalyticsOverview {
  total_orders: number;
  in_progress: number;
  completed: number;
  step_distribution: {
    step_id: number;
    step_order: number;
    step_code: string;
    step_name: string;
    order_count: number;
  }[];
  resource_totals: {
    category: string;
    total_consumed_cost: number;
  }[];
  total_plant_cost: number;
}

export interface CreateOrderPayload {
  case_id: string;
  patient_ref: string;
  implant_type: ImplantType;
  priority: Priority;
}

export interface AdvanceOrderPayload {
  operator_name: string;
  notes?: string;
  resources: {
    resource_id: number;
    quantity: number;
  }[];
}
