/**
 * Cek Running Config Handler - Check ONU configuration
 */
import type { Telegraf } from "telegraf";
import type { MyContext } from "../../types/session";
import { Api } from "../../api/api";
import { onuActionsKeyboard, runningActionKeyboard } from "./keyboards";
import { cleanOnuOutput } from "./utils";
import { mainMenuKeyboard } from "../../keyboards";

export function registerCekRunningConfigHandler(bot: Telegraf<MyContext>) {
  // Handle "Cek Config" text from reply keyboard
  bot.hears("Cek Config", async (ctx) => {
    const customer = ctx.session.selectedCustomer;
    if (!customer) {
      return ctx.reply("Session expired. Use /cek again.", mainMenuKeyboard());
    }

    const oltName = customer.olt_name;
    const interfaceName = customer.interface;

    if (!oltName || !interfaceName) {
      return ctx.reply("Data OLT/Interface tidak tersedia.", onuActionsKeyboard());
    }

    await ctx.reply("⏳ Mengecek running config...");

    try {
      const result = await Api.cekOnu(oltName, interfaceName);
      const resultText =
        typeof result === "string"
          ? cleanOnuOutput(result)
          : Object.entries(result)
              .map(([k, v]) => `${k}: ${v}`)
              .join("\n");

      await ctx.reply(`Running Config:\n${resultText}`, {
        ...runningActionKeyboard(),
      });
    } catch (error: any) {
      await ctx.reply(`Error: ${error.message}`, runningActionKeyboard());
    }
  });
}

