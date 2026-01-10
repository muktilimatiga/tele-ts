/**
 * Cek Status 1 PORT Handler - Check port state
 */
import type { Telegraf } from "telegraf";
import type { MyContext } from "../../types/session";
import { useOnu } from "../../api/hooks";
import { onuActionsKeyboard } from "./keyboards";
import { cleanOnuOutput } from "./utils";
import { formatError, logError } from "../../utils/error-handler";
import { mainMenuKeyboard } from "../../keyboards";

export function registerCekStatus1PortHandler(bot: Telegraf<MyContext>) {
  bot.hears("Cek Status 1 PORT", async (ctx) => {
    const customer = ctx.session.selectedCustomer;
    if (!customer) {
      return ctx.reply("Session expired. Use /cek again.", mainMenuKeyboard());
    }

    const oltName = customer.olt_name;
    const interfaceName = customer.interface;

    if (!oltName || !interfaceName) {
      return ctx.reply("Data OLT/Interface tidak tersedia.", onuActionsKeyboard());
    }

    ctx.session.lastCekAction = "status_1_port";

    await ctx.reply("⏳ Mengecek status 1 port...");

    try {
      const result = await useOnu.portState(oltName, interfaceName);
      const resultText =
        typeof result === "string"
          ? cleanOnuOutput(result)
          : Object.entries(result)
            .map(([k, v]) => `${k}: ${v}`)
            .join("\n");

      await ctx.reply(`${resultText}`, {
        ...onuActionsKeyboard(),
      });
    } catch (e: unknown) {
      logError("Cek Status 1 PORT", e);
      await ctx.reply(formatError(e), onuActionsKeyboard());
    }
  });
}
