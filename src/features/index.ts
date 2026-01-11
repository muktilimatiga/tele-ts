/**
 * Features Index - Aggregates all feature handlers
 */

import type { Telegraf } from "telegraf";
import type { MyContext } from "../types/session";

import { registerStartHandlers } from "./start";
import { registerBillingHandlers } from "./billing";
import { registerAllCekHandlers } from "./cek";
import { registerPsbHandlers } from "./config/config";
import { registerTicketHandlers } from "./ticket";
import { registerOcrHandler } from "./ocr";

/**
 * Register all bot command/action handlers
 */
export function registerAllHandlers(bot: Telegraf<MyContext>) {
  registerStartHandlers(bot);
  registerBillingHandlers(bot);
  registerAllCekHandlers(bot); // Registers all cek handlers (command + actions)
  registerPsbHandlers(bot);
  registerTicketHandlers(bot);
  registerOcrHandler(bot);
}

// Re-export individual features for selective use
export { registerStartHandlers } from "./start";
export { registerBillingHandlers } from "./billing";
export { registerAllCekHandlers, registerCekHandlers } from "./cek";
export { registerPsbHandlers } from "./config/config";
export { registerOcrHandler } from "./ocr";

// Re-export billing utilities (used elsewhere)
export {
  lookupBilling,
  parseBillingCommand,
  formatBillingResponse,
  CustomerNotFoundError,
  type BillingResult,
} from "./billing";
