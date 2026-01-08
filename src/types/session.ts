// src/types/session.ts
import { Context } from "telegraf";

export interface SessionData {
  // Common
  step?:
    | "IDLE"
    | "SELECT_OLT"
    | "SELECT_ONT"
    | "SELECT_PSB"
    | "CONFIRM"
    | "CEK_SEARCHING";
  page?: number;

  // PSB Data
  oltName?: string;
  ontList?: any[];
  selectedOnt?: any;
  psbList?: any[];
  selectedPsb?: any;
  selectedModem?: string;

  // Cek Data
  cekTarget?: string; // PPPoE or Name
  cekResult?: string;

  // Billing & Ticket (Replacing your global python Dicts!)
  billingCandidates?: any[];
  ticketCandidates?: any[];
  ticketDraft?: {
    query: string;
    description?: string;
  };
}

// Custom Context
export interface MyContext extends Context {
  session: SessionData;
}
