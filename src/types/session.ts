/**
 * Session Types - Shared types for bot session and context
 */

import type { Context } from "telegraf";

/**
 * Customer data stored in session after selection
 */
export interface SelectedCustomer {
  name?: string;
  address?: string;
  user_pppoe?: string;
  olt_name?: string;
  interface?: string;
}

/**
 * Session data stored for each user conversation
 */
export interface SessionData {
  // General
  step?:
  | "IDLE"
  // PSB flow
  | "SELECT_OLT"
  | "SELECT_ONT"
  | "SELECT_PSB"
  | "SELECT_MODEM"
  | "CONFIRM_ETH_LOCK"
  | "CONFIRM"

  // CONFIG ULANG
  | "SELECT_OLT_CONFIGULANG"
  | "SELECT_ONT_CONFIGULANG"
  | "SELECT_PSB_CONFIGULANG"
  | "SELECT_MODEM_CONFIGULANG"
  | "CONFIRM_ETH_LOCK_CONFIGULANG"
  | "CONFIRM_CONFIGULANG"

  // Cek flow
  | "CEK_SELECT"
  | "CEK_ACTIONS"
  | "REBOOT_CONFIRM"
  | "CONFIG_ULANG_CONFIRM"

  // Billing flow
  | "BILLING_SELECT";

  // PSB flow data
  oltName?: string;
  ontList?: any[];
  selectedOnt?: any;
  psbList?: any[];
  selectedPsb?: any;
  selectedModem?: string;
  selectedEthLock?: boolean[];
  ethLock?: boolean[];
  page?: number;

  // Cek flow data
  cekResults?: any[];
  selectedCustomer?: SelectedCustomer;
  lastCekAction?: "status" | "redaman" | "reboot" | "status_1_port";

  // Billing flow data
  billingResults?: any[];
}

/**
 * Extended Telegraf Context with session data
 */
export interface MyContext extends Context {
  session: SessionData;
}
