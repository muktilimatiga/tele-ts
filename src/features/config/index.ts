/**
 * Config Feature - Main entry point
 *
 * This module handles /config (PSB) and /cu (config ulang) commands.
 */
import type { Telegraf } from "telegraf";
import type { MyContext } from "@/types/session";

// Import all handlers
import { registerPsbHandlers } from "./config";
import { registerConfigUlangHandler } from "./config-ulang";

// Re-export individual handlers for flexibility
export { registerPsbHandlers } from "./config";
export { registerConfigUlangHandler } from "./config-ulang";

// Re-export keyboards
export * from "./keyboards";

/**
 * Register all config feature handlers at once
 */
export function registerAllConfigHandlers(bot: Telegraf<MyContext>) {
  registerPsbHandlers(bot); // /config command (PSB flow)
  registerConfigUlangHandler(bot); // /cu command (config ulang flow)
}
