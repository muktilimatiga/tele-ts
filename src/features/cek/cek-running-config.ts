/**
 * Cek Running Config Handler - Check ONU configuration
 */
import type { Telegraf } from "telegraf";
import type { MyContext } from "../../types/session";
import { Api } from "../../api/api";
import { onuActionsKeyboard } from "./keyboards";
import { cleanOnuOutput } from "./utils";

export function registerCekRunningConfigHandler(bot: Telegraf<MyContext>) {
  bot.action("cek_config", async (ctx) => {
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

    await ctx.editMessageText("⏳ Mengecek running config...");

    try {
      // Use the cek endpoint which should return config info
      const result = await Api.cekOnu(oltName, interfaceName);
      const resultText =
        typeof result === "string"
          ? cleanOnuOutput(result)
          : Object.entries(result)
              .map(([k, v]) => `${k}: ${v}`)
              .join("\n");

      await ctx.reply(`*Running Config:*\n\`\`\`\n${resultText}\n\`\`\``, {
        parse_mode: "Markdown",
        ...onuActionsKeyboard(),
      });
    } catch (error: any) {
      await ctx.reply(`Error: ${error.message}`, onuActionsKeyboard());
    }
  });
}
