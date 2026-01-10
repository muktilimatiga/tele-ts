/**
 * Telegram Bot - Main Entry Point
 * Run with: bun run index.ts
 */

import "dotenv/config";

import { bot } from "./src/core/bot";
import { registerAllHandlers } from "./src/features";
import { API_BASE_URL } from "./src/config";
import { getAllSessionKeys, clearAllSessions } from "./src/core/session-store";
import { removeKeyboard } from "./src/keyboards";

/**
 * Notify active users that bot has restarted
 */
const notifyRestartToUsers = async () => {
  const sessionKeys = getAllSessionKeys();
  
  for (const key of sessionKeys) {
    // Session key format is usually "chatId:userId" or just "chatId"
    const chatId = key.split(":")[0];
    if (!chatId || isNaN(Number(chatId))) continue;
    
    try {
      await bot.telegram.sendMessage(
        chatId,
        `Bot telah direstart. Session sebelumnya telah dihapus.\n\n` +
        `Panduan Bot\n\n` +
        `config psb\n` +
        `cek\n` +
        `link\n` +
        `open\n` +
        `Contoh:\n` +
        `• \`/cek nasrul beji\`\n` +
        `• \`/link nasrul beji\``,
        {
          parse_mode: "Markdown",
          ...removeKeyboard(),
        }
      );
    } catch (e) {
      // User may have blocked the bot or chat doesn't exist
      console.log(`[Restart] Could not notify ${chatId}:`, (e as Error).message);
    }
  }
};

/**s
 * Main entry point with proper async error handling
 */
const main = async () => {
  try {
    // Register all command handlers
    registerAllHandlers(bot);

    console.log("🤖 Starting Telegram Bot...");
    console.log(`📡 API URL: ${API_BASE_URL}`);

    // Notify users before clearing sessions
    await notifyRestartToUsers();
    
    // Clear all sessions on restart
    clearAllSessions();

    // Set bot commands menu (appears on left of text input)
    await bot.telegram.setMyCommands([
      { command: "config", description: "Mulai wizard konfigurasi ONT" },
      { command: "cek", description: "Cek data pelanggan" },
      { command: "link", description: "Cek detail tagihan" },
      { command: "open", description: "Buka tiket gangguan" },
      { command: "help", description: "Panduan bot" },
    ]);

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