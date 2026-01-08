// src/core/api.ts
import axios from "axios";
import { API_BASE_URL } from "../config";
import type {
  OptionsResponse,
  UnconfiguredOnt,
  CustomerData,
  TicketOperationResponse,
} from "./generated/models";

// 1. Create the Instance
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 60000, // 60 seconds (matches your Python code)
  headers: {
    "Content-Type": "application/json",
  },
});

// 2. Add Response Interceptor (Optional but recommended)
// This logs errors automatically so you don't have to print() everywhere
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error(`[API Error] ${error.config?.url}:`, error.message);
    return Promise.reject(error);
  }
);

// 3. Export Typed API Methods
export const Api = {
  // --- PSB FLOW ---
  getOptions: async () => {
    const { data } = await api.get<OptionsResponse>("/api/options");
    return data;
  },

  detectOnts: async (oltName: string) => {
    const { data } = await api.get<UnconfiguredOnt[]>(
      `/api/olts/${oltName}/detect-onts`
    );
    return data;
  },

  getPsbList: async () => {
    // Matches python: get_real_psb_list
    const { data } = await api.get<CustomerData[]>("/customer/psb");
    return data;
  },

  configureOnt: async (oltName: string, payload: any) => {
    const { data } = await api.post(`/api/olts/${oltName}/configure`, payload);
    return data;
  },

  // --- CEK FLOW ---
  searchCustomers: async (query: string) => {
    const { data } = await api.get<CustomerData[]>("/customer/customers-data", {
      params: { search: query, limit: 20 },
    });
    return data;
  },

  cekOnu: async (oltName: string, interfaceName: string) => {
    // Correct path from OpenAPI spec: /api/v1/onu/onu/cek (double 'onu')
    const { data } = await api.post<string>("/api/v1/onu/onu/cek", {
      olt_name: oltName,
      interface: interfaceName,
    });
    return data;
  },

  rebootOnu: async (oltName: string, interfaceName: string) => {
    // Correct path: /api/v1/onu/{olt_name}/onu/reboot
    const { data } = await api.post(`/api/v1/onu/${oltName}/onu/reboot`, {
      olt_name: oltName,
      interface: interfaceName,
    });
    return data;
  },

  getPortState: async (oltName: string, interfaceName: string) => {
    // Correct path: /api/v1/onu/{olt_name}/onu/port_state
    const { data } = await api.post(`/api/v1/onu/${oltName}/onu/port_state`, {
      olt_name: oltName,
      interface: interfaceName,
    });
    return data;
  },

  getPortRx: async (oltName: string, interfaceName: string) => {
    // Correct path: /api/v1/onu/{olt_name}/onu/port_rx
    const { data } = await api.post(`/api/v1/onu/${oltName}/onu/port_rx`, {
      olt_name: oltName,
      interface: interfaceName,
    });
    return data;
  },

  // --- BILLING ---
  getInvoices: async (query: string) => {
    const { data } = await api.get<any>("/customers/invoices", {
      params: { query },
      timeout: 15000, // 15s timeout from python
    });
    // Handle the case where API returns { data: [...] } or just [...]
    if (Array.isArray(data)) return data as CustomerData[];
    return (data.data || []) as CustomerData[];
  },

  // --- TICKET ---
  searchOpenTicket: async (query: string) => {
    const { data } = await api.get("/open-ticket/search", {
      params: { query },
    });
    if (Array.isArray(data)) return data;
    return data.results || [];
  },

  createTicket: async (payload: {
    query: string;
    description: string;
    priority?: string;
    jenis?: string;
    headless?: boolean;
  }) => {
    const { data } = await api.post<TicketOperationResponse>("/open-ticket/", {
      priority: "LOW",
      jenis: "FREE",
      headless: true,
      ...payload,
    });
    return data;
  },
};

export default api; // Export raw axios instance just in case
