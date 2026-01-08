/**
 * Start Feature - /start and /help commands
 */

import type { Telegraf } from "telegraf";
import type { MyContext } from "../types/session";

/**
 * Register start and help command handlers
 */
export function registerStartHandlers(bot: Telegraf<MyContext>) {
  bot.start(async (ctx) => {
    await ctx.reply(
      `🤖 *Selamat datang di Bot Fiber!*\n\n` +
        `📋 *Perintah yang tersedia:*\n` +
        `• /psb - Konfigurasi ONT baru\n` +
        `• /cek <query> - Cek status pelanggan\n` +
        `• link <nama/pppoe> - Cek tagihan\n` +
        `• l <nama/pppoe> - Singkatan dari link\n\n` +
        `Ketik /help untuk bantuan lebih lanjut.`,
      { parse_mode: "Markdown" }
    );
  });

  bot.help(async (ctx) => {
    await ctx.reply(
      `📚 *Panduan Bot*\n\n` +
        `*PSB (Pasang Baru):*\n` +
        `/psb - Mulai wizard konfigurasi ONT\n\n` +
        `*Cek Pelanggan:*\n` +
        `/cek <nama/pppoe> - Cek data pelanggan\n\n` +
        `*Tagihan:*\n` +
        `link <nama/pppoe> - Cek detail tagihan\n` +
        `l <nama/pppoe> - Sama dengan link\n\n` +
        `*Contoh:*\n` +
        `• \`link john doe\`\n` +
        `• \`l user123\`\n` +
        `• \`/cek ahmad\``,
      { parse_mode: "Markdown" }
    );
  });
}
