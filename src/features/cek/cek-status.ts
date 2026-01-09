/**
 * Cek Status Handler - Handles ONU check actions from reply keyboard
 */
import type { Telegraf } from "telegraf";
import type { MyContext } from "../../types/session";
import { useOnu } from "../../api/hooks";
import { onuActionsKeyboard } from "./keyboards";
import { cleanOnuOutput, parseOnuResult } from "./utils";
import { formatError, logError } from "../../utils/error-handler";
import { mainMenuKeyboard } from "../../keyboards";

/**
 * Helper to check if user has a selected customer
 */
function hasSelectedCustomer(ctx: MyContext): boolean {
  return !!ctx.session.selectedCustomer;
}

export function registerCekStatusHandler(bot: Telegraf<MyContext>) {
  // Handle "Cek Onu" text from reply keyboard
  bot.hears("Cek Onu", async (ctx) => {
    const customer = ctx.session.selectedCustomer;
    if (!customer) {
      return ctx.reply("Session expired. Use /cek again.", mainMenuKeyboard());
    }

    const oltName = customer.olt_name;
    const interfaceName = customer.interface;

    if (!oltName || !interfaceName) {
      return ctx.reply("Data OLT/Interface tidak tersedia.", onuActionsKeyboard());
    }

    ctx.session.lastCekAction = "status";

    await ctx.reply("⏳ Mengecek status ONU...");

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
        await ctx.reply(`*Attenuation:*\n\`\`\`\n${attenuation}\n\`\`\``, {
          parse_mode: "Markdown",
          ...onuActionsKeyboard(),
        });
      } else {
        await ctx.reply("Done.", onuActionsKeyboard());
      }
    } catch (e: unknown) {
      logError("Cek Status", e);
      await ctx.reply(formatError(e), onuActionsKeyboard());
    }
  });

  // Handle "Cek Redaman" text
  bot.hears("Cek Redaman", async (ctx) => {
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

    await ctx.reply("⏳ Mengecek redaman...");

    try {
      const result = await useOnu.portRx(oltName, interfaceName);
      const resultText =
        typeof result === "string" ? cleanOnuOutput(result) : JSON.stringify(result, null, 2);

      await ctx.reply(`*Port RX Power:*\n\`\`\`\n${resultText}\n\`\`\``, {
        parse_mode: "Markdown",
        ...onuActionsKeyboard(),
      });
    } catch (e: unknown) {
      logError("Cek Redaman", e);
      await ctx.reply(formatError(e), onuActionsKeyboard());
    }
  });

  // Handle "Refresh" - repeat last action
  bot.hears("Refresh", async (ctx) => {
    const customer = ctx.session.selectedCustomer;
    if (!customer) {
      return ctx.reply("Session expired. Use /cek again.", mainMenuKeyboard());
    }

    const lastAction = ctx.session.lastCekAction;
    if (!lastAction) {
      return ctx.reply("Tidak ada aksi sebelumnya.", onuActionsKeyboard());
    }

    const oltName = customer.olt_name;
    const interfaceName = customer.interface;

    if (!oltName || !interfaceName) {
      return ctx.reply("Data OLT/Interface tidak tersedia.", onuActionsKeyboard());
    }

    await ctx.reply(`🔄 Mengulangi: ${lastAction}...`);

    try {
      let result: string;

      switch (lastAction) {
        case "status":
          result = await useOnu.cek(oltName, interfaceName);
          break;
        case "redaman":
          result = await useOnu.portRx(oltName, interfaceName);
          break;
        case "status_1_port":
          result = await useOnu.portState(oltName, interfaceName);
          break;
        default:
          return ctx.reply("Aksi tidak dapat diulang.", onuActionsKeyboard());
      }

      const rawText = typeof result === "string" ? result : JSON.stringify(result, null, 2);

      await ctx.reply(`*Hasil (${lastAction}):*\n\`\`\`\n${rawText}\n\`\`\``, {
        parse_mode: "Markdown",
        ...onuActionsKeyboard(),
      });
    } catch (e: unknown) {
      logError("Refresh", e);
      await ctx.reply(formatError(e), onuActionsKeyboard());
    }
  });

  // Handle "Cancel" - return to main menu
  bot.hears("Cancel", async (ctx) => {
    ctx.session.selectedCustomer = undefined;
    ctx.session.step = "IDLE";
    await ctx.reply("🚫 Dibatalkan.", mainMenuKeyboard());
  });
}
