/**
 * Config Ulang Handler - Reconfigure ONU with search-based user lookup
 * Flow: Search user → Select OLT → Select ONT (new SN) → Select Modem → ETH Lock → Confirm
 */
import { Markup, type Telegraf } from "telegraf";
import type { MyContext, SessionData } from "../../types/session";
import { useCustomer, useConfigApi, configApi, useOnu } from "../../api/hooks";
import { Api } from "../../api/api";
import { formatError, logError } from "../../utils/error-handler";
import { executeCekOnu } from "../cek/cek";
import {
  oltListKeyboard,
  modemSelectKeyboard,
  confirmKeyboard,
  refreshCancelKeyboard,
  ethLockKeyboard,
  customerSelectKeyboard,
  removeKeyboard,
} from "../../keyboards";

/**
 * Validate that the session is in the expected step
 */
async function requireStep(
  ctx: MyContext,
  expected: SessionData["step"]
): Promise<boolean> {
  if (ctx.session.step !== expected) {
    await ctx.answerCbQuery("Session expired");
    await ctx.reply(
      "Session expired atau aksi tidak valid.\nJalankan /cu untuk memulai ulang."
    );
    return false;
  }
  return true;
}

export function registerConfigUlangHandler(bot: Telegraf<MyContext>) {
  // --- BARE "config ulang" (no query) -> Ask for name/pppoe ---
  bot.hears(/^\/?(cu|config ulang)$/i, async (ctx) => {
    ctx.session = { step: "CONFIGULANG_WAITING_QUERY" };

    await ctx.reply(
      "🔄 *Config Ulang*\n\nMasukkan nama atau PPPoE pelanggan:",
      { parse_mode: "Markdown" }
    );
  });

  // --- Handle text input when waiting for query ---
  bot.on("text", async (ctx, next) => {
    if (ctx.session.step !== "CONFIGULANG_WAITING_QUERY") {
      return next();
    }

    const query = ctx.message.text.trim();
    if (!query) {
      return ctx.reply("Masukkan nama atau PPPoE pelanggan:");
    }

    await searchAndShowResults(ctx, query);
  });

  // --- "config ulang <query>" -> Search immediately ---
  bot.hears(/^\/?(cu|config ulang)\s+(.+)$/i, async (ctx) => {
    const query = ctx.match[2]?.trim();

    if (!query) {
      return ctx.reply("Format: `/cu <nama/pppoe>`", { parse_mode: "Markdown" });
    }

    await searchAndShowResults(ctx, query);
  });

  // --- HELPER: Search and show results ---
  async function searchAndShowResults(ctx: MyContext, query: string) {
    await ctx.reply(`🔍 Mencari pelanggan: *${query}*...`, {
      parse_mode: "Markdown",
    });

    try {
      const searchResults = await useCustomer.search(query);

      if (!searchResults || searchResults.length === 0) {
        return ctx.reply(`❌ Pelanggan tidak ditemukan: \`${query}\``, {
          parse_mode: "Markdown",
        });
      }

      // Single result - go directly to confirm no onu
      if (searchResults.length === 1) {
        const customer = searchResults[0]!;
        ctx.session = {
          step: "CONFIRM_NO_ONU_CONFIGULANG",
          configUlangCustomer: customer,
        };

        await confirmNoOnu(ctx);
        return;
      }

      // Multiple results - show selection
      ctx.session = {
        step: "SELECT_PSB_CONFIGULANG",
        cekResults: searchResults,
      };

      await ctx.reply(`📋 Ditemukan ${searchResults.length} pelanggan. Pilih:`, {
        ...customerSelectKeyboard(searchResults, "cu_select:"),
      });
    } catch (error) {
      logError("Config Ulang Search", error);
      await ctx.reply(formatError(error));
    }
  }
  // --- CUSTOMER SELECTION ---
  bot.action(/^cu_select:(\d+)$/, async (ctx) => {
    await ctx.answerCbQuery();

    if (!await requireStep(ctx, "SELECT_PSB_CONFIGULANG")) return;

    const idx = parseInt(ctx.match[1]!);
    const customer = ctx.session.cekResults?.[idx];

    if (!customer) {
      return ctx.reply("Session expired. Gunakan /cu lagi.");
    }

    ctx.session.configUlangCustomer = customer;
    ctx.session.step = "SELECT_OLT_CONFIGULANG";

    await ctx.editMessageText(`✅ Dipilih: ${customer.name}`);
    await confirmNoOnu(ctx);
  });

  // --- HELPER: Ask to delete ONU first ---
  async function confirmNoOnu(ctx: MyContext) {
    const customer = ctx.session.configUlangCustomer;
    if (!customer) {
      return ctx.reply("Session expired. Gunakan /cu lagi.");
    }

    ctx.session.step = "CONFIRM_NO_ONU_CONFIGULANG";

    // First show current ONU data
    await executeCekOnu(ctx, customer);

    // Then show confirmation prompt
    // Remove reply keyboard first
    await ctx.reply("⚠️ *Hapus ONU lama dulu?*", {
      parse_mode: "Markdown",
      ...removeKeyboard(),
    });

    // Then show inline keyboard for confirmation
    await ctx.reply(
      `Pilih Oke jika ingin menghapus ONU lama sebelum config ulang.`,
      {
        ...Markup.inlineKeyboard([
          [
            Markup.button.callback("Oke", "cu_no_onu_yes"),
            Markup.button.callback("Tidak", "cu_no_onu_no"),
          ],
          [Markup.button.callback("Cancel", "cancel")],
        ]),
      }
    );
  }

  // --- ASK: No ONU first? ---
  bot.action("cu_no_onu", async (ctx) => {
    await ctx.answerCbQuery();

    const customer = ctx.session.configUlangCustomer;
    if (!customer) {
      return ctx.reply("Session expired. Gunakan /cu lagi.");
    }

    ctx.session.step = "CONFIRM_NO_ONU_CONFIGULANG";

    await ctx.editMessageText(
      `⚠️ *Hapus ONU lama dulu?*\n\nPelanggan: ${customer.name || "N/A"}\n\nPilih Ya jika ingin menghapus ONU lama sebelum config ulang.`,
      {
        parse_mode: "Markdown",
        ...Markup.inlineKeyboard([
          [
            Markup.button.callback("Oke", "cu_no_onu_yes"),
            Markup.button.callback("Tidak", "cu_no_onu_no"),
          ],
          [Markup.button.callback("Cancel", "cancel")],
        ]),
      }
    );
  });

  // --- NO ONU: Yes -> First cek ONU, show data, then confirm ---
  bot.action("cu_no_onu_yes", async (ctx) => {
    await ctx.answerCbQuery();

    if (!await requireStep(ctx, "CONFIRM_NO_ONU_CONFIGULANG")) return;

    const customer = ctx.session.configUlangCustomer;
    if (!customer) {
      return ctx.reply("Session expired. Gunakan /cu lagi.");
    }

    const oltName = customer.olt_name;
    const interfaceName = customer.interface;

    if (!oltName || !interfaceName) {
      return ctx.reply("⚠️ Data OLT/Interface tidak tersedia.");
    }

    await ctx.editMessageText("⏳ Mengecek data ONU...");

    try {
      // First, cek ONU to get current data
      const result = await useOnu.cek(oltName, interfaceName);
      const rawText =
        typeof result === "string"
          ? result
          : Object.entries(result)
              .map(([k, v]) => `${k}: ${v}`)
              .join("\n");

      ctx.session.step = "CONFIRM_DELETE_ONU_CONFIGULANG";

      // Show ONU data and ask for confirmation to delete
      await ctx.reply(
        `📋 *Data ONU Saat Ini*\n\n` +
        `Nama: ${customer.name || "N/A"}\n` +
        `OLT: ${oltName}\n` +
        `Interface: ${interfaceName}\n\n` +
        `\`\`\`\n${rawText}\n\`\`\`\n\n` +
        `⚠️ *Apakah data ini benar dan ingin dihapus?*`,
        {
          parse_mode: "Markdown",
          ...Markup.inlineKeyboard([
            [
              Markup.button.callback("Ya, Hapus ONU Ini", "cu_delete_onu_confirm"),
              Markup.button.callback("Batal", "cancel"),
            ],
          ]),
        }
      );
    } catch (error) {
      logError("Config Ulang Cek ONU", error);
      await ctx.reply(formatError(error));
    }
  });

  // --- CONFIRM DELETE ONU -> Execute sendNoOnu then scan ONTs ---
  bot.action("cu_delete_onu_confirm", async (ctx) => {
    await ctx.answerCbQuery();

    if (!await requireStep(ctx, "CONFIRM_DELETE_ONU_CONFIGULANG")) return;

    const customer = ctx.session.configUlangCustomer;
    if (!customer) {
      return ctx.reply("Session expired. Gunakan /cu lagi.");
    }

    const oltName = customer.olt_name;
    const interfaceName = customer.interface;

    await ctx.editMessageText("⏳ Menghapus ONU lama...");

    try {
      // Call sendNoOnu API
      await Api.sendNoOnu(oltName, interfaceName);

      ctx.session.noOnu = true;
      ctx.session.oltName = oltName;
      await ctx.reply("ONU lama berhasil dihapus! Scanning ONT baru...");

      // Directly scan ONTs using customer's OLT
      await scanAndShowOnts(ctx, oltName);
    } catch (error) {
      logError("Config Ulang Delete ONU", error);
      await ctx.reply(formatError(error));
    }
  });

  // --- NO ONU: No -> Go directly to ONT scan ---
  bot.action("cu_no_onu_no", async (ctx) => {
    await ctx.answerCbQuery();

    if (!await requireStep(ctx, "CONFIRM_NO_ONU_CONFIGULANG")) return;

    const customer = ctx.session.configUlangCustomer;
    if (!customer) {
      return ctx.reply("Session expired. Gunakan /cu lagi.");
    }

    const oltName = customer.olt_name;
    if (!oltName) {
      return ctx.reply("⚠️ Data OLT tidak tersedia.");
    }

    ctx.session.noOnu = false;
    ctx.session.oltName = oltName;
    await ctx.editMessageText(`✅ Scanning ONT di ${oltName}...`);
    
    await scanAndShowOnts(ctx, oltName);
  });

  // --- HELPER: Scan and show ONTs ---
  async function scanAndShowOnts(ctx: MyContext, oltName: string) {
    try {
      ctx.session.step = "SELECT_ONT_CONFIGULANG";
      
      const onts = await useConfigApi.detectOnts(oltName);
      ctx.session.ontList = onts;

      if (onts.length === 0) {
        return ctx.reply(
          `Tidak ada ONT unconfigured di ${oltName}.`,
          refreshCancelKeyboard(`cu_rescan_ont`)
        );
      }

      const buttons = onts.slice(0, 10).map((ont: any, idx: number) => [
        Markup.button.callback(`${ont.sn}`, `cu_ont:${idx}`),
      ]);

      await ctx.reply(
        `📡 *Pilih ONT (SN Baru)* (Found: ${onts.length})`,
        {
          parse_mode: "Markdown",
          ...Markup.inlineKeyboard([
            ...buttons,
            [Markup.button.callback("Refresh", "cu_rescan_ont")],
            [Markup.button.callback("Cancel", "cancel")],
          ]),
        }
      );
    } catch (e: unknown) {
      logError("Config Ulang ONT Scan", e);
      await ctx.reply(formatError(e));
    }
  }

  // --- RESCAN ONTs ---
  bot.action("cu_rescan_ont", async (ctx) => {
    await ctx.answerCbQuery();

    const oltName = ctx.session.oltName;
    if (!oltName) {
      return ctx.reply("Session expired. Gunakan /cu lagi.");
    }

    await ctx.editMessageText(`⏳ Rescanning ONT di ${oltName}...`);
    await scanAndShowOnts(ctx, oltName);
  });


  // --- OLT SELECTION ---
  bot.action(/^cu_olt:(.+)$/, async (ctx) => {
    await ctx.answerCbQuery();

    if (!await requireStep(ctx, "SELECT_OLT_CONFIGULANG")) return;

    const oltName = ctx.match[1]!;
    ctx.session.oltName = oltName;
    ctx.session.step = "SELECT_ONT_CONFIGULANG";

    await ctx.editMessageText(`⏳ Scanning ONT di ${oltName}...`);

    try {
      const onts = await useConfigApi.detectOnts(oltName);
      ctx.session.ontList = onts;

      if (onts.length === 0) {
        return ctx.editMessageText(
          `Tidak ada ONT unconfigured di ${oltName}.`,
          refreshCancelKeyboard(`cu_olt:${oltName}`)
        );
      }

      const buttons = onts.slice(0, 10).map((ont: any, idx: number) => [
        Markup.button.callback(`${ont.sn}`, `cu_ont:${idx}`),
      ]);

      await ctx.editMessageText(
        `📡 *Pilih ONT (SN Baru)* (Found: ${onts.length})`,
        {
          parse_mode: "Markdown",
          ...Markup.inlineKeyboard([
            ...buttons,
            [Markup.button.callback("Cancel", "cancel")],
          ]),
        }
      );
    } catch (e: unknown) {
      logError("Config Ulang ONT Scan", e);
      await ctx.editMessageText(formatError(e));
    }
  });

  // --- ONT SELECTION -> MODEM ---
  bot.action(/^cu_ont:(\d+)$/, async (ctx) => {
    await ctx.answerCbQuery();

    if (!await requireStep(ctx, "SELECT_ONT_CONFIGULANG")) return;

    const idx = parseInt(ctx.match[1]!);
    const ont = ctx.session.ontList?.[idx];

    if (!ont) {
      return ctx.reply("Session expired. Gunakan /cu lagi.");
    }

    ctx.session.selectedOnt = ont;
    ctx.session.step = "SELECT_MODEM_CONFIGULANG";

    const customer = ctx.session.configUlangCustomer;

    await ctx.editMessageText(
      `📱 *Pilih Tipe Modem*\nPelanggan: ${customer?.name || "N/A"}\nSN: \`${ont.sn}\``,
      {
        parse_mode: "Markdown",
        ...modemSelectKeyboard(),
      }
    );
  });

  // --- MODEM SELECTION -> ETH LOCK ---
  bot.action(/^modem:(.+)$/, async (ctx) => {
    // Only handle if in config ulang flow
    if (ctx.session.step !== "SELECT_MODEM_CONFIGULANG") return;

    await ctx.answerCbQuery();

    const modem = ctx.match[1]!;
    ctx.session.selectedModem = modem;
    ctx.session.step = "CONFIRM_ETH_LOCK_CONFIGULANG";

    await ctx.editMessageText(
      `📱 Modem: *${modem}*\n\n🔌 *Kunci PORT LAN?*`,
      {
        parse_mode: "Markdown",
        ...Markup.inlineKeyboard([
          Markup.button.callback("Lock", "cu_eth_lock"),
          Markup.button.callback("Unlock", "cu_eth_unlock"),
        ]),
      }
    );
  });

  // --- ETH LOCK -> CONFIRMATION ---
  bot.action("cu_eth_lock", async (ctx) => {
    await ctx.answerCbQuery();
    if (!await requireStep(ctx, "CONFIRM_ETH_LOCK_CONFIGULANG")) return;

    ctx.session.selectedEthLock = [true];
    await showConfigUlangConfirmation(ctx);
  });


  // --- HELPER: Show Confirmation ---
  async function showConfigUlangConfirmation(ctx: MyContext) {
    const {
      oltName,
      selectedOnt: ont,
      configUlangCustomer: customer,
      selectedModem: modem,
      selectedEthLock: ethLock,
    } = ctx.session;

    ctx.session.step = "CONFIRM_CONFIGULANG";

    const lockStatus = ethLock?.every(Boolean) ? "🔒 Locked" : "🔓 Unlocked";

    const msg =
      `✅ *Konfirmasi Config Ulang*\n\n` +
      `Nama: \`${customer?.name || "N/A"}\`\n` +
      `PPPoE: \`${customer?.pppoe_user || "N/A"}\`\n` +
      `OLT: \`${oltName}\`\n` +
      `SN Baru: \`${ont?.sn || "N/A"}\`\n` +
      `Modem: \`${modem}\`\n` +
      `ETH Lock: ${lockStatus}\n\n` +
      `Eksekusi sekarang?`;

    await ctx.editMessageText(msg, {
      parse_mode: "Markdown",
      ...Markup.inlineKeyboard([
        Markup.button.callback("Oke", "cu_confirm_yes"),
        Markup.button.callback("Cancel", "cancel"),
      ]),
    });
  }

  // --- EXECUTE CONFIGURATION ---
  bot.action("cu_confirm_yes", async (ctx) => {
    await ctx.answerCbQuery();

    if (!await requireStep(ctx, "CONFIRM_CONFIGULANG")) return;

    const {
      oltName,
      selectedOnt,
      configUlangCustomer: customer,
      selectedModem,
      selectedEthLock,
    } = ctx.session;

    if (!oltName || !selectedOnt || !customer) {
      return ctx.reply("Session expired. Gunakan /cu lagi.");
    }

    await ctx.editMessageText("⏳ Proses konfigurasi... Harap tunggu.");

    try {
      const result =
        await configApi.runConfigurationApiV1ConfigApiOltsOltNameConfigurePost(
          oltName,
          {
            sn: selectedOnt.sn,
            customer: {
              name: customer.name || "",
              address: customer.address || "",
              pppoe_user: customer.pppoe_user || "",
              pppoe_pass: customer.pppoe_password || "",
            },
            package: customer.paket || "15M",
            modem_type: selectedModem || "C-DATA",
            eth_locks: selectedEthLock || [true],
          }
        );

      // Reset session on success
      ctx.session = { step: "IDLE" };

      await ctx.editMessageText(
        `✅ *Config Ulang Berhasil*\n\n
        Serial: ${result.summary?.serial_number}\n
        Nama: ${result.summary?.name}\n
        PPPoE: ${result.summary?.pppoe_user}\n
        OLT dan ONU: ${result.summary?.location}\n
        Paket: ${result.summary?.profile} || SUCCESS`
      );
      removeKeyboard();
    } catch (e: unknown) {
      logError("Config Ulang Execute", e);
      await ctx.editMessageText(formatError(e));
    }
  });
}