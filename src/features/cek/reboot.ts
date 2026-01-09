/**
 * Reboot ONU Handler
 */
import { Markup, type Telegraf } from "telegraf";
import type { MyContext } from "../../types/session";
import { useOnu } from "../../api/hooks";
import { onuActionsKeyboard } from "./keyboards";
import { formatError, logError } from "../../utils/error-handler";

export function registerRebootHandler(bot: Telegraf<MyContext>) {
  // Request reboot confirmation
  bot.action("reboot", async (ctx) => {
    await ctx.answerCbQuery();

    const customer = ctx.session.selectedCustomer;
    if (!customer) {
      return ctx.reply("Session expired. Use /cek again.");
    }

    ctx.session.step = "REBOOT_CONFIRM";

    await ctx.editMessageText(
      `⚠️ *Konfirmasi Reboot ONU*\n\nPelanggan: ${customer.name}\nInterface: ${customer.interface}\n\nApakah Anda yakin ingin reboot ONU?`,
      {
        parse_mode: "Markdown",
        ...Markup.inlineKeyboard([
          Markup.button.callback("Ya, Reboot", "reboot_confirm"),
          Markup.button.callback("Cancel", "cancel"),
        ]),
      }
    );
  });

  // Execute reboot
  bot.action("reboot_confirm", async (ctx) => {
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

    await ctx.editMessageText("⏳ Rebooting ONU...");

    try {
      const result = await useOnu.reboot(oltName, interfaceName);
      const resultText =
        typeof result === "string" ? result : JSON.stringify(result, null, 2);

      await ctx.reply(`✅ *Reboot Berhasil*\n\`\`\`\n${resultText}\n\`\`\``, {
        parse_mode: "Markdown",
        ...onuActionsKeyboard(),
      });

      ctx.session.step = "CEK_ACTIONS";
    } catch (e: unknown) {
      logError("Reboot", e);
      await ctx.reply(formatError(e), onuActionsKeyboard());
    }
  });
}
