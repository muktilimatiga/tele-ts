/**
 * Config Ulang Handler - Reconfigure ONU
 */
import { Markup, type Telegraf } from "telegraf";
import type { MyContext } from "../../types/session";
import { Api } from "../../api/api";
import { onuActionsKeyboard } from "../cek/keyboards";

export function registerConfigUlangHandler(bot: Telegraf<MyContext>) {
  // Request reconfigure confirmation
  bot.action("config_ulang", async (ctx) => {
    await ctx.answerCbQuery();

    const customer = ctx.session.selectedCustomer;
    if (!customer) {
      return ctx.reply("Session expired. Use /cek again.");
    }

    ctx.session.step = "CONFIG_ULANG_CONFIRM";

    await ctx.editMessageText(
      `⚠️ *Konfirmasi Config Ulang*\n\nPelanggan: ${customer.name}\nInterface: ${customer.interface}\n\nApakah Anda yakin ingin config ulang ONU?`,
      {
        parse_mode: "Markdown",
        ...Markup.inlineKeyboard([
          Markup.button.callback("Ya, Config Ulang", "config_ulang_confirm"),
          Markup.button.callback("Cancel", "cancel"),
        ]),
      }
    );
  });

  // Execute reconfigure
  bot.action("config_ulang_confirm", async (ctx) => {
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

    await ctx.editMessageText("⏳ Reconfiguring ONU...");

    try {
      // First, delete the ONU
      await Api.sendNoOnu(oltName, interfaceName);

      // Then reconfigure - you may need to adjust the payload based on your API
      const configPayload = {
        olt_name: oltName,
        interface: interfaceName,
        customer_name: customer.name,
        user_pppoe: customer.user_pppoe,
        // Add other config fields as needed
      };

      const result = await Api.configureOnt(oltName, configPayload);
      const resultText =
        typeof result === "string" ? result : JSON.stringify(result, null, 2);

      await ctx.reply(
        `✅ *Config Ulang Berhasil*\n\`\`\`\n${resultText}\n\`\`\``,
        {
          parse_mode: "Markdown",
          ...onuActionsKeyboard(),
        }
      );

      ctx.session.step = "CEK_ACTIONS";
    } catch (error: any) {
      await ctx.reply(
        `❌ Error config ulang: ${error.message}`,
        onuActionsKeyboard()
      );
    }
  });
}
