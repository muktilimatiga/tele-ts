/**
 * Bot Core - Shared Telegraf instance with session middleware
 */

import { Telegraf, session } from "telegraf";
import "dotenv/config";

import { TELEGRAM_BOT_TOKEN } from "../config";
import type { SessionData, MyContext } from "../types/session";

// Re-export types for convenience
export type { SessionData, MyContext };

/**
 * Shared bot instance
 */
export const bot = new Telegraf<MyContext>(TELEGRAM_BOT_TOKEN);

/**
 * Session middleware with default session
 */
bot.use(
  session({
    defaultSession: (): SessionData => ({
      step: "IDLE" as const,
      page: 0,
    }),
  })
);
