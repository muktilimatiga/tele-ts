import { Markup, type Telegraf } from "telegraf";
import type { MyContext, SessionData } from "../../types/session";
import { useCustomer, useOnu } from "../../api/hooks";
import type { CustomerData } from "../../api/hooks";
import { onuActionsKeyboard } from "./keyboards";
import { formatError, logError } from "../../utils/error-handler";
import { customerSelectKeyboard } from "../../keyboards";

/**
 * Validate that the session is in the expected step
 */
async function requireStep(
  ctx: MyContext,
  expected: SessionData["step"]
): Promise<boolean> {
  if (ctx.session.step !== expected) {
    await ctx.answerCbQuery?.("⚠️ Session expired");
    await ctx.reply(
      "⚠️ Session expired atau aksi tidak valid.\nJalankan /cek lagi."
    );
    return false;
  }
  return true;
}

/**
 * Cek handler
 */
export function registerCekHandlers(bot: Telegraf<MyContext>) {
  // --- /cek command ---
  bot.command("cek", async (ctx) => {
    const args = ctx.message.text.split(" ").slice(1).join(" ").trim();
    if (!args) return ctx.reply("Gunakan: /cek <nama/pppoe>");

    try {
      const results = await useCustomer.search(args);

      if (results.length === 0) {
        return ctx.reply("Pelanggan tidak ditemukan.");
      }

      if (results.length === 1 && results[0]) {
        const customer = results[0];
        ctx.session.selectedCustomer = customer;
        ctx.session.step = "CEK_ACTIONS";

        await ctx.reply(
          `Pelanggan ditemukan !! Mengecek status ONU ${customer.name}...`
        );

        await executeCekOnu(ctx, customer);
      } else {
        ctx.session.cekResults = results;
        ctx.session.step = "CEK_SELECT";

        await ctx.reply(`📋 Ditemukan ${results.length} pelanggan. Pilih:`, {
          ...customerSelectKeyboard(results, "cek_select:"),
        });
      }
    } catch (e: unknown) {
      logError("Cek Command", e);
      await ctx.reply(formatError(e));
    }
  });

  // --- Customer Selection from list ---
  bot.action(/^cek_select:(\d+)$/, async (ctx) => {
    await ctx.answerCbQuery();

    // Validate step
    if (!await requireStep(ctx, "CEK_SELECT")) return;

    const idx = parseInt(ctx.match[1]!);
    const customer = ctx.session.cekResults?.[idx];

    if (!customer) {
      return ctx.reply("Session expired. Use /cek again.");
    }

    ctx.session.selectedCustomer = customer;
    ctx.session.step = "CEK_ACTIONS";

    await ctx.editMessageText(
      `Mengecek status ONU ${customer.name}...`
    );

    await executeCekOnu(ctx, customer);
  });
}

import { parseOnuResult } from "./utils";

/**
 * Helper: Execute cekOnu API and reply with result
 */
async function executeCekOnu(ctx: MyContext, customer: CustomerData) {
  const oltName = customer.olt_name;
  const interfaceName = customer.interface;

  if (!oltName || !interfaceName) {
    return ctx.reply(
      "⚠️ Data OLT/Interface tidak tersedia untuk pelanggan ini."
    );
  }

  try {
    const result = await useOnu.cek(oltName, interfaceName);
    const rawText =
      typeof result === "string"
        ? result
        : Object.entries(result)
          .map(([k, v]) => `${k}: ${v}`)
          .join("\n");

    const { detail, attenuation } = parseOnuResult(rawText);

    // Send detail data first
    if (detail) {
      await ctx.reply(`*Detail Data:*\n\`\`\`\n${detail}\n\`\`\``, {
        parse_mode: "Markdown",
      });
    }

    // Send attenuation data with action keyboard
    if (attenuation) {
      await ctx.reply(`*Attenuation Data:*\n\`\`\`\n${attenuation}\n\`\`\``, {
        parse_mode: "Markdown",
        ...onuActionsKeyboard(),
      });
    } else {
      // No attenuation, just send the keyboard with the detail
      await ctx.reply("Pilih aksi:", onuActionsKeyboard());
    }
  } catch (e: unknown) {
    logError("Cek ONU", e);
    await ctx.reply(formatError(e), onuActionsKeyboard());
  }
}
