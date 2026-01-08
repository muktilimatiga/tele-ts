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
  pppoe_user?: string;
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
    | "CONFIRM"
    // Cek flow
    | "CEK_SELECT"
    | "CEK_ACTIONS";

  // PSB flow data
  oltName?: string;
  ontList?: any[];
  selectedOnt?: any;
  psbList?: any[];
  selectedPsb?: any;
  selectedModem?: string;
  page?: number;

  // Cek flow data
  cekResults?: any[];
  selectedCustomer?: SelectedCustomer;
  lastCekAction?: "status" | "redaman" | "reboot";
}

/**
 * Extended Telegraf Context with session data
 */
export interface MyContext extends Context {
  session: SessionData;
}
