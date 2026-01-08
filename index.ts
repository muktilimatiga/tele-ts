/**
 * Telegram Bot - Main Entry Point
 * Run with: bun run index.ts
 */

import "dotenv/config";

import { bot } from "./src/core/bot";
import { registerAllHandlers } from "./src/features";
import { API_BASE_URL } from "./src/config";

// Register all command handlers
registerAllHandlers(bot);

// Launch bot
console.log("🤖 Starting Telegram Bot...");
console.log(`📡 API URL: ${API_BASE_URL}`);

bot.launch().then(() => {
  console.log("✅ Bot is running!");
});

// Graceful shutdown
process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));