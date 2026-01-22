/**
 * PSB Feature - ONT Configuration Wizard
 * Handles /psb command and the multi-step configuration flow
 */

import { Markup, type Telegraf } from "telegraf";
import type { MyContext, SessionData } from "@/types/session";
import { useCustomer, useConfigApi, configApi } from "@/api/hooks";
import { formatError, logError } from "@/utils/error-handler";
import {
  oltListKeyboard,
  modemSelectKeyboard,
  confirmKeyboard,
  refreshCancelKeyboard,
  ethLockKeyboard,
  removeKeyboard,
} from "../../keyboards";

/**
 * Validate that the session is in the expected step
 * Returns false and notifies user if session is stale
 */
async function requireStep(
  ctx: MyContext,
  expected: SessionData["step"]
): Promise<boolean> {
  if (ctx.session.step !== expected) {
    await ctx.answerCbQuery("Session expired");
    await ctx.reply(
      "Session expired atau aksi tidak valid.\nJalankan /config untuk memulai ulang."
    );
    return false;
  }
  return true;
}

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

      await ctx.reply("Pilih OLT:", {
        ...oltListKeyboard(olts),
      });
    } catch (e: unknown) {
      logError("PSB Start", e);
      await ctx.reply(formatError(e));
    }
  };

  bot.command("config", startPsb);
  bot.action("config", startPsb);

  // Handle 'config <olt_name>' - directly scan ONTs on specified OLT
  bot.hears(/^\/?(?:config|cfg)(?:\s+(.+))?$/i, async (ctx) => {
    const oltQuery = ctx.match[1]?.trim();

    // If no OLT specified, show OLT selection
    if (!oltQuery) {
      return startPsb(ctx);
    }

    try {
      await ctx.reply(`⏳ Scanning ONT di ${oltQuery}...`);

      // Get available OLTs and find matching one
      const options = await useConfigApi.getOptions();
      const olts = options.olt_options;

      // Find OLT that matches (case-insensitive, partial match)
      const matchedOlt = olts.find((olt: string) =>
        olt.toLowerCase().includes(oltQuery.toLowerCase())
      );

      if (!matchedOlt) {
        return ctx.reply(
          `❌ OLT "${oltQuery}" tidak ditemukan.\n\nOLT tersedia:\n${olts
            .map((o: string) => `• ${o}`)
            .join("\n")}`
        );
      }

      // Set session and scan ONTs
      ctx.session = { step: "SELECT_ONT", oltName: matchedOlt, page: 0 };

      const onts = await useConfigApi.detectOnts(matchedOlt);
      ctx.session.ontList = onts;

      if (onts.length === 0) {
        return ctx.reply(
          `Tidak ada ONT unconfigured di ${matchedOlt}.`,
          refreshCancelKeyboard(`olt:${matchedOlt}`)
        );
      }

      const buttons = onts
        .slice(0, 5)
        .map((ont, idx) => [Markup.button.callback(`${ont.sn}`, `ont:${idx}`)]);

      await ctx.reply(`*${matchedOlt}* - Pilih ONT (Found: ${onts.length})`, {
        parse_mode: "Markdown",
        ...Markup.inlineKeyboard([
          ...buttons,
          [Markup.button.callback("Refresh", "refresh_ont")],
          [Markup.button.callback("Cancel", "cancel")],
        ]),
      });
    } catch (e: unknown) {
      logError("Config Direct OLT", e);
      await ctx.reply(formatError(e));
    }
  });

  // --- OLT SELECTION ---
  bot.action(/^olt:(.+)$/, async (ctx) => {
    await ctx.answerCbQuery();

    // Validate step
    if (!(await requireStep(ctx, "SELECT_OLT"))) return;

    const match = ctx.match as RegExpMatchArray;
    const oltName = ctx.match[1]!;

    ctx.session.oltName = oltName;
    ctx.session.step = "SELECT_ONT";

    await ctx.editMessageText(`⏳ Scanning ONT di ${oltName}...`, {
      parse_mode: "Markdown", // This line seems redundant as editMessageText doesn't directly accept parse_mode here.
    });

    try {
      const onts = await useConfigApi.detectOnts(oltName);
      ctx.session.ontList = onts;

      if (onts.length === 0) {
        return ctx.editMessageText(
          `Tidak ada ONT unconfigured di ${oltName}.`,
          refreshCancelKeyboard(`olt:${oltName}`)
        );
      }

      const buttons = onts
        .slice(0, 5)
        .map((ont, idx) => [Markup.button.callback(`${ont.sn}`, `ont:${idx}`)]);

      await ctx.editMessageText(`📡 *Pilih ONT* (Found: ${onts.length})`, {
        ...Markup.inlineKeyboard([
          ...buttons,
          [Markup.button.callback("Refresh", "refresh_ont")],
          [Markup.button.callback("Cancel", "cancel")],
        ]),
      });
    } catch (e: unknown) {
      logError("OLT Selection", e);
      await ctx.editMessageText(formatError(e));
    }
  });

  // --- ONT SELECTION -> PSB LIST ---
  bot.action(/^ont:(\d+)$/, async (ctx) => {
    await ctx.answerCbQuery();

    // Validate step
    if (!(await requireStep(ctx, "SELECT_ONT"))) return;

    const idx = parseInt(ctx.match[1]!);
    const ont = ctx.session.ontList?.[idx];

    if (!ont) {
      return ctx.reply("Session expired. /config to restart.");
    }

    ctx.session.selectedOnt = ont;
    ctx.session.step = "SELECT_PSB";

    await ctx.editMessageText("Mengambil data pelanggan (PSB)...");

    try {
      const psbList = await useCustomer.getPsbList();

      if (psbList.length === 0) {
        return ctx.editMessageText(
          "Tidak ada pelanggan yang ditemukan.",
          refreshCancelKeyboard(`ont:${idx}`)
        );
      }

      ctx.session.psbList = psbList;

      const buttons = psbList
        .slice(0, 5)
        .map((p, i) => [
          Markup.button.callback(
            `${(p.name || "").slice(0, 15)} | ${p.address || "N/A"}`,
            `psb:${i}`
          ),
        ]);

      await ctx.editMessageText(`*Pilih Pelanggan PSB*\nONT: \`${ont.sn}\``, {
        ...Markup.inlineKeyboard([
          ...buttons,
          [Markup.button.callback("Refresh", "refresh_psb")],
          [Markup.button.callback("Cancel", "cancel")],
        ]),
      });
    } catch (e: unknown) {
      logError("PSB List", e);
      await ctx.editMessageText(formatError(e));
    }
  });

  // --- PSB SELECTION -> MODEM ---
  bot.action(/^psb:(\d+)$/, async (ctx) => {
    await ctx.answerCbQuery();

    // Validate step
    if (!(await requireStep(ctx, "SELECT_PSB"))) return;

    const idx = parseInt(ctx.match[1]!);
    const psb = ctx.session.psbList?.[idx];

    if (!psb) {
      return ctx.reply("Session expired. /config to restart.");
    }

    ctx.session.selectedPsb = psb;
    ctx.session.step = "SELECT_MODEM";

    await ctx.editMessageText(
      `📱 *Pilih Tipe Modem*\nUser: ${psb.name ?? "N/A"}`,
      modemSelectKeyboard("psb_modem")
    );
  });

  // --- MODEM SELECTION -> ETH LOCK ---
  bot.action(/^psb_modem:(.+)$/, async (ctx) => {
    try {
      await ctx.answerCbQuery();

      // Validate step
      if (!(await requireStep(ctx, "SELECT_MODEM"))) return;

      const modem = ctx.match[1];
      ctx.session.selectedModem = modem;
      ctx.session.step = "CONFIRM_ETH_LOCK";

      console.log(`[Config] Selected modem: ${modem}`);

      // Removed parse_mode to avoid markdown errors
      await ctx.editMessageText(
        `📱 Modem: ${modem}

🔌 Kunci PORT LAN?
Pilih untuk mengunci atau membuka semua port LAN.`,
        {
          ...ethLockKeyboard(),
        }
      );
    } catch (e) {
      logError("Modem Selection", e);
      await ctx.reply("Error occurred during modem selection.");
    }
  });

  // --- ETH LOCK -> CONFIRMATION ---
  bot.action("eth_lock", async (ctx) => {
    await ctx.answerCbQuery();

    // Validate step
    if (!(await requireStep(ctx, "CONFIRM_ETH_LOCK"))) return;

    ctx.session.selectedEthLock = [true];
    await showConfirmation(ctx);
  });

  bot.action("eth_unlock", async (ctx) => {
    await ctx.answerCbQuery();

    // Validate step
    if (!(await requireStep(ctx, "CONFIRM_ETH_LOCK"))) return;

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

    ctx.session.step = "CONFIRM";

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
    // Validate step
    if (!(await requireStep(ctx, "CONFIRM"))) return;

    const {
      oltName,
      selectedOnt,
      selectedPsb,
      selectedModem,
      selectedEthLock,
    } = ctx.session;

    if (!oltName || !selectedOnt) {
      return ctx.reply("Session expired. /config to restart.");
    }

    await ctx.editMessageText("⏳ Proses konfigurasi... Harap tunggu.");

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

      // Reset session on success
      ctx.session = { step: "IDLE" };

      await ctx.deleteMessage().catch(() => {});
      await ctx.reply(
        `✅ *Config Berhasil*\n\n` +
          `Serial: \`${result.summary?.serial_number}\`\n` +
          `Nama: \`${result.summary?.name}\`\n` +
          `PPPoE: \`${result.summary?.pppoe_user}\`\n` +
          `OLT dan ONU: \`${result.summary?.location}\`\n` +
          `Paket: \`${result.summary?.profile}\`\n\n` +
          `*SUCCESS*`,
        { parse_mode: "Markdown" }
      );
      removeKeyboard();
    } catch (e: unknown) {
      logError("Config Execute", e);
      await ctx.editMessageText(formatError(e), { parse_mode: "Markdown" });
    }
  });

  // --- REFRESH ONT LIST ---
  bot.action("refresh_ont", async (ctx) => {
    await ctx.answerCbQuery("Refreshing...");

    const { oltName } = ctx.session;
    if (!oltName) {
      return ctx.reply("Session expired. /config to restart.");
    }

    try {
      await ctx.editMessageText(`⏳ Scanning ONT di ${oltName}...`);

      const onts = await useConfigApi.detectOnts(oltName);
      ctx.session.ontList = onts;
      ctx.session.step = "SELECT_ONT";

      if (onts.length === 0) {
        return ctx.editMessageText(
          `Tidak ada ONT unconfigured di ${oltName}.`,
          refreshCancelKeyboard(`olt:${oltName}`)
        );
      }

      const buttons = onts
        .slice(0, 5)
        .map((ont, idx) => [Markup.button.callback(`${ont.sn}`, `ont:${idx}`)]);

      await ctx.editMessageText(
        `📡 *${oltName}* - Pilih ONT (Found: ${onts.length})`,
        {
          parse_mode: "Markdown",
          ...Markup.inlineKeyboard([
            ...buttons,
            [Markup.button.callback("Refresh", "refresh_ont")],
            [Markup.button.callback("Cancel", "cancel")],
          ]),
        }
      );
    } catch (e: unknown) {
      logError("Refresh ONT", e);
      await ctx.editMessageText(formatError(e));
    }
  });

  // --- REFRESH PSB LIST ---
  bot.action("refresh_psb", async (ctx) => {
    await ctx.answerCbQuery("Refreshing...");

    const { selectedOnt } = ctx.session;
    if (!selectedOnt) {
      return ctx.reply("Session expired. /config to restart.");
    }

    try {
      await ctx.editMessageText("⏳ Mengambil data pelanggan (PSB)...");

      const psbList = await useCustomer.getPsbList();
      ctx.session.psbList = psbList;
      ctx.session.step = "SELECT_PSB";

      if (psbList.length === 0) {
        return ctx.editMessageText(
          "Tidak ada pelanggan yang ditemukan.",
          refreshCancelKeyboard("refresh_psb")
        );
      }

      const buttons = psbList
        .slice(0, 5)
        .map((p, i) => [
          Markup.button.callback(
            `${(p.name || "").slice(0, 15)} | ${p.address || "N/A"}`,
            `psb:${i}`
          ),
        ]);

      await ctx.editMessageText(
        `*Pilih Pelanggan PSB*\nONT: \`${selectedOnt.sn}\``,
        {
          parse_mode: "Markdown",
          ...Markup.inlineKeyboard([
            ...buttons,
            [Markup.button.callback("Refresh", "refresh_psb")],
            [Markup.button.callback("Cancel", "cancel")],
          ]),
        }
      );
    } catch (e: unknown) {
      logError("Refresh PSB", e);
      await ctx.editMessageText(formatError(e));
    }
  });

  // --- GLOBAL CANCEL ---
  bot.action("cancel", async (ctx) => {
    await ctx.answerCbQuery("Cancelled");
    ctx.session = { step: "IDLE" };
    await ctx.editMessageText("Operation cancelled.");
    removeKeyboard();
  });
}
