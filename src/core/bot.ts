/**
 * Bot Core - Shared Telegraf instance with persistent session middleware
 */

import { Telegraf, session } from "telegraf";
import "dotenv/config";

import { TELEGRAM_BOT_TOKEN } from "../config";
import type { SessionData, MyContext } from "../types/session";
import { sqliteSessionStore } from "./session-store";
import { sessionTimeoutMiddleware } from "../middleware/session-timeout";

// Re-export types for convenience
export type { SessionData, MyContext };

/**
 * Shared bot instance
 */
export const bot = new Telegraf<MyContext>(TELEGRAM_BOT_TOKEN);

/**
 * Session middleware with SQLite persistence
 * Sessions survive bot restarts
 */
bot.use(
  session({
    defaultSession: (): SessionData => ({
      step: "IDLE" as const,
      page: 0,
      lastActivity: Date.now(),
    }),
    store: {
      get: (key: string) => Promise.resolve(sqliteSessionStore.get(key)),
      set: (key: string, session: SessionData) => {
        sqliteSessionStore.set(key, session);
        return Promise.resolve();
      },
      delete: (key: string) => {
        sqliteSessionStore.delete(key);
        return Promise.resolve();
      },
    },
  })
);

/**
 * Session timeout middleware
 * Checks for 2-minute inactivity and resets session
 */
bot.use(sessionTimeoutMiddleware);

