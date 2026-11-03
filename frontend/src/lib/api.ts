import {
  ProcessStep,
  Resource,
  Order,
  AnalyticsOverview,
  CreateOrderPayload,
  AdvanceOrderPayload,
  OrderStepLog,
  OrderResourceConsumption
} from '@/types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api';

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let errorDetail = 'API request failed';
    try {
      const errJson = await res.json();
      errorDetail = errJson.error || errJson.detail || JSON.stringify(errJson);
    } catch {
      errorDetail = `${res.status} ${res.statusText}`;
    }
    throw new Error(errorDetail);
  }
  return res.json();
}

export async function fetchProcessSteps(): Promise<ProcessStep[]> {
  const res = await fetch(`${API_BASE_URL}/steps/`, { cache: 'no-store' });
  const data = await handleResponse<any>(res);
  return Array.isArray(data) ? data : data.results || [];
}

export async function fetchResources(): Promise<Resource[]> {
  const res = await fetch(`${API_BASE_URL}/resources/`, { cache: 'no-store' });
  const data = await handleResponse<any>(res);
  return Array.isArray(data) ? data : data.results || [];
}

export async function fetchOrders(): Promise<Order[]> {
  const res = await fetch(`${API_BASE_URL}/orders/`, { cache: 'no-store' });
  const data = await handleResponse<any>(res);
  return Array.isArray(data) ? data : data.results || [];
}

export async function fetchOrder(id: number): Promise<Order> {
  const res = await fetch(`${API_BASE_URL}/orders/${id}/`, { cache: 'no-store' });
  return handleResponse<Order>(res);
}

export interface OrderHistoryResponse {
  order_id: number;
  case_id: string;
  patient_ref: string;
  status: string;
  step_logs: OrderStepLog[];
  consumptions: OrderResourceConsumption[];
}

export async function fetchOrderHistory(id: number): Promise<OrderHistoryResponse> {
  const res = await fetch(`${API_BASE_URL}/orders/${id}/history/`, { cache: 'no-store' });
  return handleResponse<OrderHistoryResponse>(res);
}

export async function createOrder(payload: CreateOrderPayload): Promise<Order> {
  const res = await fetch(`${API_BASE_URL}/orders/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return handleResponse<Order>(res);
}

export async function advanceOrder(id: number, payload: AdvanceOrderPayload): Promise<Order> {
  const res = await fetch(`${API_BASE_URL}/orders/${id}/advance/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return handleResponse<Order>(res);
}

export async function fetchAnalytics(): Promise<AnalyticsOverview> {
  const res = await fetch(`${API_BASE_URL}/analytics/overview/`, { cache: 'no-store' });
  return handleResponse<AnalyticsOverview>(res);
}
