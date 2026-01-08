/**
 * Features Index - Aggregates all feature handlers
 */

import type { Telegraf } from "telegraf";
import type { MyContext } from "../types/session";

import { registerStartHandlers } from "./start";
import { registerBillingHandlers } from "./billing";
import { registerCekHandlers } from "./cek";
import { registerPsbHandlers } from "./psb";

/**
 * Register all bot command/action handlers
 */
export function registerAllHandlers(bot: Telegraf<MyContext>) {
  registerStartHandlers(bot);
  registerBillingHandlers(bot);
  registerCekHandlers(bot);
  registerPsbHandlers(bot);
}

// Re-export individual features for selective use
export { registerStartHandlers } from "./start";
export { registerBillingHandlers } from "./billing";
export { registerCekHandlers } from "./cek";
export { registerPsbHandlers } from "./psb";

// Re-export billing utilities (used elsewhere)
export {
  lookupBilling,
  parseBillingCommand,
  formatBillingResponse,
  CustomerNotFoundError,
  type BillingResult,
} from "./billing";
