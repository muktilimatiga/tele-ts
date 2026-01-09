import { Markup, type Telegraf } from "telegraf";
import type { MyContext } from "../../types/session";
import { useCustomer, useOnu } from "../../api/hooks";
import { onuActionsKeyboard } from "./keyboards";

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
          `Ditemukan: ${customer.name}\n⏳ Mengecek status ONU...`
        );

        await executeCekOnu(ctx, customer);
      } else {
        // Multiple results: show list for user to pick
        ctx.session.cekResults = results;
        ctx.session.step = "CEK_SELECT";

        const buttons = results
          .slice(0, 10)
          .map((c, i) => [
            Markup.button.callback(
              `${(c.name || "").slice(0, 20)} | ${c.user_pppoe || "N/A"}`,
              `cek_select:${i}`
            ),
          ]);
        buttons.push([Markup.button.callback("Cancel", "cancel")]);

        await ctx.reply(`📋 Ditemukan ${results.length} pelanggan. Pilih:`, {
          ...Markup.inlineKeyboard(buttons),
        });
      }
    } catch (e: any) {
      ctx.reply(`Error: ${e.message}`);
    }
  });

  // --- Customer Selection from list ---
  bot.action(/^cek_select:(\d+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    const idx = parseInt(ctx.match[1]!);
    const customer = ctx.session.cekResults?.[idx];

    if (!customer) return ctx.reply("Session expired. Use /cek again.");

    ctx.session.selectedCustomer = customer;
    ctx.session.step = "CEK_ACTIONS";

    await ctx.editMessageText(
      `✅ Dipilih: ${customer.name}\n⏳ Mengecek status ONU...`
    );

    await executeCekOnu(ctx, customer);
  });
}

import { parseOnuResult } from "./utils";

/**
 * Helper: Execute cekOnu API and reply with result
 */
async function executeCekOnu(ctx: MyContext, customer: any) {
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
  } catch (error: any) {
    await ctx.reply(`Error cek ONU: ${error.message}`, onuActionsKeyboard());
  }
}
