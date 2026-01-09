/**
 * PSB Feature - ONT Configuration Wizard
 * Handles /psb command and the multi-step configuration flow
 */

import { Markup, type Telegraf } from "telegraf";
import type { MyContext } from "../../types/session";
import { useCustomer, useConfigApi, configApi } from "../../api/hooks";
import {
  oltListKeyboard,
  modemSelectKeyboard,
  confirmKeyboard,
  refreshCancelKeyboard,
  listKeyboard,
  ethLockKeyboard,
} from "../../keyboards";

/**
 * Register PSB (Pasang Baru) flow handlers
 */
export function registerPsbHandlers(bot: Telegraf<MyContext>) {
  // --- START PSB FLOW ---
  const startPsb = async (ctx: MyContext) => {
    try {
      if (ctx.callbackQuery) await ctx.answerCbQuery();
      await ctx.reply("⏳ Mengambil daftar OLT...");

      const options = await useConfigApi.getOptions();
      const olts = options.olt_options;

      ctx.session = { step: "SELECT_OLT", page: 0 };

      await ctx.reply("📡 *Pilih OLT:*", {
        parse_mode: "Markdown",
        ...oltListKeyboard(olts),
      });
    } catch (e: any) {
      await ctx.reply(`Error: ${e.message}`);
    }
  };

  bot.command("config", startPsb);
  bot.action("menu_config", startPsb);

  // --- OLT SELECTION ---
  bot.action(/^olt:(.+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    const oltName = ctx.match[1]!;

    ctx.session.oltName = oltName;
    ctx.session.step = "SELECT_ONT";

    await ctx.editMessageText(`⏳ Scanning ONT di *${oltName}*...`, {
      parse_mode: "Markdown",
    });

    try {
      const onts = await useConfigApi.detectOnts(oltName);
      ctx.session.ontList = onts;

      if (onts.length === 0) {
        return ctx.editMessageText(
          `⚠️ Tidak ada ONT unconfigured di ${oltName}.`,
          refreshCancelKeyboard(`olt:${oltName}`)
        );
      }

      const buttons = onts
        .slice(0, 5)
        .map((ont, idx) => [
          Markup.button.callback(
            `${ont.pon_port}:${ont.pon_slot} | ${ont.sn.slice(0, 8)}`,
            `ont:${idx}`
          ),
        ]);

      await ctx.editMessageText(`📡 *Pilih ONT* (Found: ${onts.length})`, {
        parse_mode: "Markdown",
        ...Markup.inlineKeyboard([
          ...buttons,
          [Markup.button.callback("Cancel", "cancel")],
        ]),
      });
    } catch (e: any) {
      await ctx.editMessageText(`API Error: ${e.message}`);
    }
  });

  // --- ONT SELECTION -> PSB LIST ---
  bot.action(/^ont:(\d+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    const idx = parseInt(ctx.match[1]!);
    const ont = ctx.session.ontList?.[idx];

    if (!ont) return ctx.reply("Session expired. /psb to restart.");

    ctx.session.selectedOnt = ont;
    ctx.session.step = "SELECT_PSB";

    await ctx.editMessageText("⏳ Mengambil data pelanggan (PSB)...");

    try {
      const psbList = await useCustomer.getPsbList();
      ctx.session.psbList = psbList;

      const buttons = psbList
        .slice(0, 5)
        .map((p, i) => [
          Markup.button.callback(
            `${(p.name || "").slice(0, 15)} | ${p.user_pppoe || "N/A"}`,
            `psb:${i}`
          ),
        ]);

      await ctx.editMessageText(
        `👤 *Pilih Pelanggan PSB*\nONT: \`${ont.sn}\``,
        {
          parse_mode: "Markdown",
          ...Markup.inlineKeyboard([
            ...buttons,
            [Markup.button.callback("Cancel", "cancel")],
          ]),
        }
      );
    } catch (e: any) {
      await ctx.editMessageText(`Failed to fetch PSB: ${e.message}`);
    }
  });

  // --- PSB SELECTION -> MODEM ---
  bot.action(/^psb:(\d+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    const idx = parseInt(ctx.match[1]!);
    const psb = ctx.session.psbList?.[idx];

    if (!psb) return ctx.reply("Session expired.");

    ctx.session.selectedPsb = psb;
    ctx.session.step = "SELECT_MODEM";

    await ctx.editMessageText(
      `📱 *Pilih Tipe Modem*\nUser: ${psb.name ?? "N/A"}`,
      modemSelectKeyboard()
    );
  });

  // --- MODEM SELECTION -> ETH LOCK ---
  bot.action(/^modem:(.+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    const modem = ctx.match[1];
    ctx.session.selectedModem = modem;
    ctx.session.step = "CONFIRM_ETH_LOCK";

    await ctx.editMessageText(
      `📱 Modem: *${modem}*\n\n🔌 *Kunci PORT LAN?*\nPilih untuk mengunci atau membuka semua port LAN.`,
      {
        parse_mode: "Markdown",
        ...ethLockKeyboard(),
      }
    );
  });

  // --- ETH LOCK -> CONFIRMATION ---
  bot.action("eth_lock", async (ctx) => {
    await ctx.answerCbQuery();
    ctx.session.selectedEthLock = [true];
    await showConfirmation(ctx);
  });

  bot.action("eth_unlock", async (ctx) => {
    await ctx.answerCbQuery();
    ctx.session.selectedEthLock = [false];
    await showConfirmation(ctx);
  });

  // --- HELPER: Show Confirmation ---
  async function showConfirmation(ctx: MyContext) {
    const {
      oltName,
      selectedOnt: ont,
      selectedPsb: psb,
      selectedModem: modem,
      selectedEthLock: ethLock,
    } = ctx.session;

    const lockStatus = ethLock?.every(Boolean) ? "🔒 Locked" : "🔓 Unlocked";

    const msg =
      `✅ *Konfirmasi Config*\n\n` +
      `OLT: \`${oltName}\`\n` +
      `SN: \`${ont?.sn || "N/A"}\`\n` +
      `Nama: \`${psb?.name || "N/A"}\`\n` +
      `PPPoE: \`${psb?.user_pppoe || "N/A"}\`\n` +
      `Modem: \`${modem}\`\n` +
      `ETH Lock: ${lockStatus}\n\n` +
      `Eksekusi sekarang?`;

    await ctx.editMessageText(msg, {
      parse_mode: "Markdown",
      ...confirmKeyboard(),
    });
  }

  // --- EXECUTE CONFIGURATION ---
  bot.action("confirm_yes", async (ctx) => {
    const {
      oltName,
      selectedOnt,
      selectedPsb,
      selectedModem,
      selectedEthLock,
    } = ctx.session;

    if (!oltName || !selectedOnt) return ctx.reply("Session expired.");

    await ctx.editMessageText("Proses konfigurasi... Harap tunggu.");

    try {
      const result =
        await configApi.runConfigurationApiV1ConfigApiOltsOltNameConfigurePost(
          oltName!,
          {
            sn: selectedOnt.sn,
            customer: {
              name: selectedPsb?.name || "",
              address: selectedPsb?.address || "",
              pppoe_user: selectedPsb?.user_pppoe || "",
              pppoe_pass: selectedPsb?.pppoe_password || "",
            },
            package: selectedPsb?.paket || "15M",
            modem_type: selectedModem || "C-DATA",
            eth_locks: selectedEthLock || [true],
          }
        );

      await ctx.editMessageText(
        `✅ *SUCCESS*\n\n${result.message || "Configured!"}`,
        { parse_mode: "Markdown" }
      );
    } catch (e: any) {
      await ctx.editMessageText(
        `❌ *FAILED*\nError: ${e.response?.data?.detail || e.message}`,
        { parse_mode: "Markdown" }
      );
    }
  });

  // Handle CONFIG ULANG

  // --- GLOBAL CANCEL ---
  bot.action("cancel", async (ctx) => {
    await ctx.answerCbQuery("Cancelled");
    ctx.session = { step: "IDLE" };
    await ctx.editMessageText("🚫 Operation cancelled.");
  });
}
