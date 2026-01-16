/**
 * API Hooks for Telegram Bot
 * Clean wrappers around Orval-generated functions
 */

// Re-export all generated API getters
export { getBot } from "./generated/bot/bot";
export { getCustomer } from "./generated/customer/customer";
// export { getOnu } from "./generated/onu/onu"; (Excluded due to generation error)
export { getTicket } from "./generated/ticket/ticket";
export { getConfig } from "./generated/config/config";
export { getCli } from "./generated/cli/cli";
// export { getOcr } from "./generated/ocr/ocr";
// export { getFile } from "./generated/file/file";
// export { getDefault } from "./generated/default/default";

// Re-export all models for convenience
export * from "./generated/models";

// --- Instantiated API clients ---
import { getBot } from "./generated/bot/bot";
import { getCustomer } from "./generated/customer/customer";
// import { getOnu } from "./generated/onu/onu";
import { getTicket } from "./generated/ticket/ticket";
import { getConfig } from "./generated/config/config";

// Import types for proper typing
import type {
  TicketCreateOnlyPayload,
  TicketCreateAndProcessPayload,
  TicketClosePayload,
  TicketForwardPayload,
} from "./generated/models";

// Create singleton instances for easy use
export const botApi = getBot();
export const customerApi = getCustomer();
// export const onuApi = getOnu();
export const ticketApi = getTicket();
export const configApi = getConfig();

// --- Simplified hook functions for common operations ---

/**
 * Customer operations
 */
export const useCustomer = {
  /** Get all PSB data */
  getPsbList: () => customerApi.getPsbDataApiV1CustomerPsbGet(),

  /** Search customers by query */
  search: (query: string) =>
    customerApi.getCustomerDataApiV1CustomerCustomersDataGet({
      search: query,
    }),

  /** Get customer billing details */
  getBilling: (query: string) =>
    customerApi.getCustomerDetailsRouteApiV1CustomerCustomersBillingGet({
      query,
    }),
};

/**
 * ONU operations
 */
/**
 * ONU operations
 */
import { Api } from "./api";

export const useOnu = {
  /** Check ONU status */
  cek: (oltName: string, interfaceName: string) =>
    Api.cekOnu(oltName, interfaceName),

  /** Reboot ONU */
  reboot: (oltName: string, interfaceName: string) =>
    Api.rebootOnu(oltName, interfaceName),

  /** Check port state */
  portState: (oltName: string, interfaceName: string) =>
    Api.getPortState(oltName, interfaceName),

  /** Check port RX power */
  portRx: (oltName: string, interfaceName: string) =>
    Api.getPortRx(oltName, interfaceName),

  /** Remove ONU */
  noOnu: (oltName: string, interfaceName: string) =>
    Api.sendNoOnu(oltName, interfaceName),

  /** Get DBA profile */
  getDba: (oltName: string, interfaceName: string) =>
    Api.getDba(oltName, interfaceName),

  /** Get running config */
  getRunningConfig: (oltName: string, interfaceName: string) =>
    Api.getRunningConfig(oltName, interfaceName),

  /** Get ethernet status */
  getEthStatus: (oltName: string, interfaceName: string) =>
    Api.getEthStatus(oltName, interfaceName),

  /** Lock/unlock ethernet port */
  sendEthLock: (oltName: string, interfaceName: string, isUnlocked: boolean) =>
    Api.sendEthLock(oltName, interfaceName, isUnlocked),

  /** Change capacity/DBA */
  sendChangeCapacity: (
    oltName: string,
    interfaceName: string,
    newCapacity: string
  ) => Api.sendChangeCapacity(oltName, interfaceName, newCapacity),
};

/**
 * Ticket operations
 */
export const useTicket = {
  /** Search for tickets */
  search: (query: string) =>
    ticketApi.searchTicketApiV1TicketSearchPost({ query }),

  /** Create ticket only */
  create: (payload: TicketCreateOnlyPayload) =>
    ticketApi.createTicketOnlyApiV1TicketCreatePost(payload),

  /** Create and process ticket */
  createAndProcess: (payload: TicketCreateAndProcessPayload) =>
    ticketApi.createAndProcessTicketApiV1TicketCreateAndProcessPost(payload),

  /** Close ticket */
  close: (payload: TicketClosePayload) =>
    ticketApi.closeTicketApiV1TicketClosePost(payload),

  /** Forward ticket */
  forward: (payload: TicketForwardPayload) =>
    ticketApi.forwardTicketApiV1TicketForwardPost(payload),
};

/**
 * Bot monitoring operations
 */
export const useBot = {
  /** Check monitoring */
  cekMonitoring: (oltName: string, interfaceName: string) =>
    botApi.cekMonitoringApiV1BotCekPost(
      { interface: interfaceName },
      { olt_name: oltName }
    ),

  /** Check dying gasp */
  cekDying: (oltName: string) =>
    botApi.cekDyingApiV1BotCekDyingPost({ olt_name: oltName }),

  /** Redaman monitoring */
  redamanMonitoring: (oltName: string, interfaceName: string) =>
    botApi.redamanMonitoringApiV1BotRedamanMonitoringPost(
      { interface: interfaceName },
      { olt_name: oltName }
    ),

  /** Switch description */
  switchDescription: (ip: string) =>
    botApi.switchDescriptionApiV1BotSwitchDescriptionPost({ ip }),
};

/**
 * Config operations
 */
export const useConfigApi = {
  /** Get options */
  getOptions: () => configApi.getOptionsApiV1ConfigApiOptionsGet(),

  /** Detect unconfigured ONTs */
  detectOnts: (oltName: string) =>
    configApi.detectUncfgOntsApiV1ConfigApiOltsOltNameDetectOntsGet(oltName),
};

/**
 * PSB (Provisioning) operations
 */
export const usePsb = {
  /** Get OLT options */
  getOptions: () => Api.getOptions(),

  /** Detect unconfigured ONTs */
  detectOnts: (oltName: string) => Api.detectOnts(oltName),

  /** Get PSB customer list */
  getPsbList: () => Api.getPsbList(),

  /** Configure ONT */
  configureOnt: (
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
  ) => Api.configureOnt(oltName, payload),
};

/**
 * Billing operations
 */
export const useBilling = {
  /** Get customer invoices */
  getInvoices: (query: string) => Api.getInvoices(query),
};

/**
 * OCR operations
 */
export const useOcr = {
  /** Convert image to text */
  sendOcr: (imageBuffer: Buffer, filename: string) =>
    Api.sendOcr(imageBuffer, filename),
};

/**
 * Search operations (alternative to Orval-generated)
 */
export const useSearch = {
  /** Search customers */
  searchCustomers: (query: string) => Api.searchCustomers(query),

  /** Search open tickets */
  searchOpenTicket: (query: string) => Api.searchOpenTicket(query),
};

/**
 * Manual Ticket operations (using Api instead of Orval)
 */
export const useTicketApi = {
  /** Search open tickets */
  search: (query: string) => Api.searchOpenTicket(query),

  /** Create ticket */
  create: (payload: {
    query: string;
    description: string;
    priority?: string;
    jenis?: string;
    headless?: boolean;
  }) => Api.createTicket(payload),
};
