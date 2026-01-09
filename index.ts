/**
 * Telegram Bot - Main Entry Point
 * Run with: bun run index.ts
 */

import "dotenv/config";

import { bot } from "./src/core/bot";
import { registerAllHandlers } from "./src/features";
import { API_BASE_URL } from "./src/config";

/**
 * Main entry point with proper async error handling
 */
const main = async () => {
  try {
    // Register all command handlers
    registerAllHandlers(bot);

    console.log("🤖 Starting Telegram Bot...");
    console.log(`📡 API URL: ${API_BASE_URL}`);

    // Launch bot
    await bot.launch();
    console.log("✅ Bot is running!");
  } catch (error) {
    console.error("❌ Failed to start bot:", error);
    process.exit(1);
  }
};

// Start the bot
main();

// Graceful shutdown
process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));