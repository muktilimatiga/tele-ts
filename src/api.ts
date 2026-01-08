// src/core/api.ts
import axios from "axios";
import { API_BASE_URL } from "../config";
import {
  OltOptions,
  OntDevice,
  PsbCustomer,
  TicketResult,
  CustomerInvoice,
} from "../types/api";

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
    const { data } = await api.get<OltOptions>("/api/options");
    return data;
  },

  detectOnts: async (oltName: string) => {
    const { data } = await api.get<OntDevice[]>(
      `/api/olts/${oltName}/detect-onts`
    );
    return data;
  },

  getPsbList: async () => {
    // Matches python: get_real_psb_list
    const { data } = await api.get<PsbCustomer[]>("/customer/psb");
    return data;
  },

  configureOnt: async (oltName: string, payload: any) => {
    const { data } = await api.post(`/api/olts/${oltName}/configure`, payload);
    return data;
  },

  // --- CEK FLOW ---
  searchCustomers: async (query: string) => {
    const { data } = await api.get<PsbCustomer[]>("/customer/customers-data", {
      params: { search: query, limit: 20 },
    });
    return data;
  },

  cekOnu: async (oltName: string, interfaceName: string) => {
    // Note: Your Python code says this returns plain text, not JSON
    const { data } = await api.post<string>("/onu/cek", {
      olt_name: oltName,
      interface: interfaceName,
    });
    return data; // This might be a string
  },

  rebootOnu: async (oltName: string, interfaceName: string) => {
    const { data } = await api.post(`/${oltName}/onu/reboot`, {
      olt_name: oltName,
      interface: interfaceName,
    });
    return data;
  },

  getPortState: async (oltName: string, interfaceName: string) => {
    const { data } = await api.post(`/${oltName}/onu/port_state`, {
      olt_name: oltName,
      interface: interfaceName,
    });
    return data;
  },

  getPortRx: async (oltName: string, interfaceName: string) => {
    const { data } = await api.post(`/${oltName}/onu/port_rx`, {
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
    if (Array.isArray(data)) return data as CustomerInvoice[];
    return (data.data || []) as CustomerInvoice[];
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
    const { data } = await api.post<TicketResult>("/open-ticket/", {
      priority: "LOW",
      jenis: "FREE",
      headless: true,
      ...payload,
    });
    return data;
  },
};

export default api; // Export raw axios instance just in case
