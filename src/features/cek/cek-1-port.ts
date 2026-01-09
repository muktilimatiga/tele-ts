/**
 * Cek Status 1 PORT Handler - Check port state
 */
import type { Telegraf } from "telegraf";
import type { MyContext } from "../../types/session";
import { useOnu } from "../../api/hooks";
import { onuActionsKeyboard } from "./keyboards";
import { cleanOnuOutput } from "./utils";

export function registerCekStatus1PortHandler(bot: Telegraf<MyContext>) {
  bot.action("cek_status_1_port", async (ctx) => {
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

    await ctx.editMessageText("⏳ Mengecek status 1 port...");

    try {
      const result = await useOnu.portState(oltName, interfaceName);
      const resultText =
        typeof result === "string"
          ? cleanOnuOutput(result)
          : Object.entries(result)
              .map(([k, v]) => `${k}: ${v}`)
              .join("\n");

      await ctx.reply(`*Port State:*\n\`\`\`\n${resultText}\n\`\`\``, {
        parse_mode: "Markdown",
        ...onuActionsKeyboard(),
      });
    } catch (error: any) {
      await ctx.reply(`Error: ${error.message}`, onuActionsKeyboard());
    }
  });
}
