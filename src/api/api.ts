/**
 * API Client - Manual API wrappers using shared Axios instance
 * Uses AXIOS_INSTANCE from custom_instance.ts to ensure consistent interceptors
 */

import { AXIOS_INSTANCE } from "./custom_instance";
import type {
  OptionsResponse,
  UnconfiguredOnt,
  CustomerData,
  TicketOperationResponse,
} from "./generated/models";

/**
 * Manual API methods for endpoints not covered by Orval
 * or requiring custom handling
 */
export const Api = {
  // --- PSB FLOW ---
  getOptions: async (): Promise<OptionsResponse> => {
    const { data } = await AXIOS_INSTANCE.get<OptionsResponse>("/api/options");
    return data;
  },

  detectOnts: async (oltName: string): Promise<UnconfiguredOnt[]> => {
    const { data } = await AXIOS_INSTANCE.get<UnconfiguredOnt[]>(
      `/api/olts/${oltName}/detect-onts`
    );
    return data;
  },

  getPsbList: async (): Promise<CustomerData[]> => {
    const { data } = await AXIOS_INSTANCE.get<CustomerData[]>("/customer/psb");
    return data;
  },

  sendNoOnu: async (
    oltName: string,
    interfaceName: string
  ): Promise<{ message: string }> => {
    const { data } = await AXIOS_INSTANCE.post<{ message: string }>(
      `/api/olts/${oltName}/send-no-onu`,
      {
        olt_name: oltName,
        interface: interfaceName,
      }
    );
    return data;
  },

  configureOnt: async (
    oltName: string,
    payload: {
      sn: string;
      customer: {
        name: string;
        address: string;
        pppoe_user: string;
        pppoe_pass: string;
      };
      package: string;
      modem_type: string;
      eth_locks: boolean[];
    }
  ): Promise<{ message: string }> => {
    const { data } = await AXIOS_INSTANCE.post<{ message: string }>(
      `/api/olts/${oltName}/configure`,
      payload
    );
    return data;
  },

  // --- CEK FLOW ---
  searchCustomers: async (query: string): Promise<CustomerData[]> => {
    const { data } = await AXIOS_INSTANCE.get<CustomerData[]>(
      "/customer/customers-data",
      {
        params: { search: query, limit: 20 },
      }
    );
    return data;
  },

  cekOnu: async (oltName: string, interfaceName: string): Promise<string> => {
    const { data } = await AXIOS_INSTANCE.post<string>("/api/v1/onu/onu/cek", {
      olt_name: oltName,
      interface: interfaceName,
    });
    return data;
  },

  rebootOnu: async (
    oltName: string,
    interfaceName: string
  ): Promise<string> => {
    const { data } = await AXIOS_INSTANCE.post<string>(
      `/api/v1/onu/${oltName}/onu/reboot`,
      {
        olt_name: oltName,
        interface: interfaceName,
      }
    );
    return data;
  },

  getPortState: async (
    oltName: string,
    interfaceName: string
  ): Promise<string> => {
    const { data } = await AXIOS_INSTANCE.post<string>(
      `/api/v1/onu/${oltName}/onu/port_state`,
      {
        olt_name: oltName,
        interface: interfaceName,
      }
    );
    return data;
  },

  getPortRx: async (
    oltName: string,
    interfaceName: string
  ): Promise<string> => {
    const { data } = await AXIOS_INSTANCE.post<string>(
      `/api/v1/onu/${oltName}/onu/port_rx`,
      {
        olt_name: oltName,
        interface: interfaceName,
      }
    );
    return data;
  },

  // --- BILLING ---
  getInvoices: async (query: string): Promise<CustomerData[]> => {
    const { data } = await AXIOS_INSTANCE.get<
      CustomerData[] | { data: CustomerData[] }
    >("/customers/invoices", {
      params: { query },
      timeout: 15000,
    });
    // Handle the case where API returns { data: [...] } or just [...]
    if (Array.isArray(data)) return data;
    return data.data || [];
  },

  // --- TICKET ---
  searchOpenTicket: async (
    query: string
  ): Promise<Array<Record<string, unknown>>> => {
    const { data } = await AXIOS_INSTANCE.get<
      Array<Record<string, unknown>> | { results: Array<Record<string, unknown>> }
    >("/open-ticket/search", {
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
  }): Promise<TicketOperationResponse> => {
    const { data } = await AXIOS_INSTANCE.post<TicketOperationResponse>(
      "/open-ticket/",
      {
        priority: "LOW",
        jenis: "FREE",
        headless: true,
        ...payload,
      }
    );
    return data;
  },
};
