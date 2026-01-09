/**
 * Cek Redaman 1 PORT Handler - Check port RX power
 * This is now handled in cek-status.ts as "Cek Redaman"
 * Keeping this file for backward compatibility with callback actions
 */
import type { Telegraf } from "telegraf";
import type { MyContext } from "../../types/session";
import { useOnu } from "../../api/hooks";
import { onuActionsKeyboard } from "./keyboards";
import { cleanOnuOutput } from "./utils";
import { formatError, logError } from "../../utils/error-handler";
import { mainMenuKeyboard } from "../../keyboards";

export function registerCekRedaman1PortHandler(bot: Telegraf<MyContext>) {
  // Legacy callback handler (for inline buttons if any)
  bot.action("cek_redaman_1_port", async (ctx) => {
    await ctx.answerCbQuery();

    const customer = ctx.session.selectedCustomer;
    if (!customer) {
      return ctx.reply("Session expired. Use /cek again.", mainMenuKeyboard());
    }

    const oltName = customer.olt_name;
    const interfaceName = customer.interface;

    if (!oltName || !interfaceName) {
      return ctx.reply("Data OLT/Interface tidak tersedia.", onuActionsKeyboard());
    }

    ctx.session.lastCekAction = "redaman";

    await ctx.reply("⏳ Mengecek redaman 1 port...");

    try {
      const result = await useOnu.portRx(oltName, interfaceName);
      const resultText =
        typeof result === "string"
          ? cleanOnuOutput(result)
          : Object.entries(result)
            .map(([k, v]) => `${k}: ${v}`)
            .join("\n");

      await ctx.reply(`*Port RX Power:*\n\`\`\`\n${resultText}\n\`\`\``, {
        parse_mode: "Markdown",
        ...onuActionsKeyboard(),
      });
    } catch (e: unknown) {
      logError("Cek Redaman 1 PORT", e);
      await ctx.reply(formatError(e), onuActionsKeyboard());
    }
  });
}
