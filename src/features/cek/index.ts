/**
 * Cek Feature - Main entry point
 *
 * This module handles the /cek command and related ONU check actions.
 */
import type { Telegraf } from "telegraf";
import type { MyContext } from "../../types/session";

// Import all handlers
import { registerCekHandlers } from "./cek";
import { registerCekStatusHandler } from "./cek-status";
import { registerCekStatus1PortHandler } from "./cek-1-port";
import { registerCekRedaman1PortHandler } from "./cek-redaman-1-port";
import { registerCekRunningConfigHandler } from "./cek-running-config";
import { registerRebootHandler } from "./reboot";
import { registerConfigUlangHandler } from "../config/config-ulang";

// Re-export individual handlers for flexibility
export { registerCekHandlers } from "./cek";
export { registerCekStatusHandler } from "./cek-status";
export { registerCekStatus1PortHandler } from "./cek-1-port";
export { registerCekRedaman1PortHandler } from "./cek-redaman-1-port";
export { registerCekRunningConfigHandler } from "./cek-running-config";
export { registerRebootHandler } from "./reboot";
export { registerConfigUlangHandler } from "../config/config-ulang";

// Re-export utils and keyboards
export { cleanOnuOutput, parseOnuResult } from "./utils";
export { onuActionsKeyboard } from "./keyboards";

/**
 * Register all cek feature handlers at once
 */
export function registerAllCekHandlers(bot: Telegraf<MyContext>) {
  registerCekHandlers(bot); // /cek command + selection
  registerCekStatusHandler(bot); // cek_status, cek_refresh
  registerCekStatus1PortHandler(bot); // cek_status_1_port
  registerCekRedaman1PortHandler(bot); // cek_redaman_1_port
  registerCekRunningConfigHandler(bot); // cek_config
  registerRebootHandler(bot); // reboot, reboot_confirm
  registerConfigUlangHandler(bot); // config_ulang, config_ulang_confirm
}
