/**
 * Cek Status Handler - Refresh the full ONU check
 */
import type { Telegraf } from "telegraf";
import type { MyContext } from "../../types/session";
import { useOnu } from "../../api/hooks";
import { onuActionsKeyboard } from "./keyboards";
import { cleanOnuOutput, parseOnuResult } from "./utils";

export function registerCekStatusHandler(bot: Telegraf<MyContext>) {
  // cek_status - Re-check full ONU status (same as initial cek)
  bot.action("cek_status", async (ctx) => {
    await ctx.answerCbQuery();

    const customer = ctx.session.selectedCustomer;
    if (!customer) {
      return ctx.reply("Session expired. Use /cek again.");
    }

    const oltName = customer.olt_name;
    const interfaceName = customer.interface;

    if (!oltName || !interfaceName) {
      return ctx.reply("⚠️ Data OLT/Interface tidak tersedia.");
    }

    await ctx.editMessageText("⏳ Mengecek status ONU...");

    try {
      const result = await useOnu.cek(oltName, interfaceName);
      const rawText =
        typeof result === "string"
          ? result
          : Object.entries(result)
              .map(([k, v]) => `${k}: ${v}`)
              .join("\n");

      const { detail, attenuation } = parseOnuResult(rawText);

      if (detail) {
        await ctx.reply(`*Detail Data:*\n\`\`\`\n${detail}\n\`\`\``, {
          parse_mode: "Markdown",
        });
      }

      if (attenuation) {
        await ctx.reply(`*Attenuation Data:*\n\`\`\`\n${attenuation}\n\`\`\``, {
          parse_mode: "Markdown",
          ...onuActionsKeyboard(),
        });
      } else {
        await ctx.reply("Pilih aksi:", onuActionsKeyboard());
      }
    } catch (error: any) {
      await ctx.reply(`Error: ${error.message}`, onuActionsKeyboard());
    }
  });

  // cek_refresh - Same as cek_status (alias)
  bot.action("cek_refresh", async (ctx) => {
    await ctx.answerCbQuery();

    const customer = ctx.session.selectedCustomer;
    if (!customer) {
      return ctx.reply("Session expired. Use /cek again.");
    }

    const oltName = customer.olt_name;
    const interfaceName = customer.interface;

    if (!oltName || !interfaceName) {
      return ctx.reply("⚠️ Data OLT/Interface tidak tersedia.");
    }

    await ctx.editMessageText("⏳ Refreshing...");

    try {
      const result = await useOnu.cek(oltName, interfaceName);
      const rawText =
        typeof result === "string"
          ? result
          : Object.entries(result)
              .map(([k, v]) => `${k}: ${v}`)
              .join("\n");

      const { detail, attenuation } = parseOnuResult(rawText);

      if (detail) {
        await ctx.reply(`*Detail Data:*\n\`\`\`\n${detail}\n\`\`\``, {
          parse_mode: "Markdown",
        });
      }

      if (attenuation) {
        await ctx.reply(`*Attenuation Data:*\n\`\`\`\n${attenuation}\n\`\`\``, {
          parse_mode: "Markdown",
          ...onuActionsKeyboard(),
        });
      } else {
        await ctx.reply("Pilih aksi:", onuActionsKeyboard());
      }
    } catch (error: any) {
      await ctx.reply(`Error: ${error.message}`, onuActionsKeyboard());
    }
  });
}
