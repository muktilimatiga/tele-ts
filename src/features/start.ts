/**
 * Start Feature - /start and /help commands
 */

import type { Telegraf } from "telegraf";
import type { MyContext } from "../types/session";
import { mainMenuKeyboard } from "../keyboards";

/**
 * Register start and help command handlers
 */
export function registerStartHandlers(bot: Telegraf<MyContext>) {
  bot.start(async (ctx) => {
    await ctx.reply(
      `🤖 *BOT Fiber Lexxadata*\n\n` +
      `📋 *Perintah yang tersedia:*\n` +
      `• /config - Konfigurasi ONT baru\n` +
      `• /cek <nama/pppoe> - Cek status pelanggan\n` +
      `• /link <nama/pppoe> - Cek tagihan\n` +
      `• /open <nama/pppoe> <kendala> - Open ticket\n\n` +
      `Ketik /help untuk bantuan lebih lanjut.`,
      {
        parse_mode: "Markdown",
        ...mainMenuKeyboard(),
      }
    );
  });

  bot.help(async (ctx) => {
    await ctx.reply(
      `*Panduan Bot*\n\n` +
      `*Config ONT:*\n` +
      `/config - Mulai wizard konfigurasi ONT\n\n` +
      `*Cek Pelanggan:*\n` +
      `/cek <nama/pppoe> - Cek data pelanggan\n\n` +
      `*Tagihan:*\n` +
      `/link <nama/pppoe> - Cek detail tagihan\n\n` +
      `*Ticket:*\n` +
      `/open <query> <kendala> - Buka tiket gangguan\n\n` +
      `*Contoh:*\n` +
      `• \`/cek umam beji\`\n` +
      `• \`/link umam beji\`\n` +
      `• \`/open umam beji wifi leg\`\n`,
      {
        parse_mode: "Markdown",
        ...mainMenuKeyboard(),
      }
    );
  });
}
