/**
 * Cek Running Config Handler - Check ONU configuration
 */
import type { Telegraf } from "telegraf";
import type { MyContext } from "../../types/session";
import { Markup } from "telegraf";
import { Api } from "../../api/api";
import { onuActionsKeyboard } from "./keyboards";
import { cleanOnuOutput } from "./utils";
import { mainMenuKeyboard } from "../../keyboards";
import { removeKeyboard } from "telegraf/markup";
import { NEW_CAPACITY_KEYBOARD } from "./keyboards";

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
      const result = await Api.getRunningConfig(oltName, interfaceName);

      await ctx.reply(`Running Config:\n\n${result.running_config}`, removeKeyboard());
      await ctx.reply(`ONU Running Config:\n\n${result.onu_running_config}`, {
        ...Markup.inlineKeyboard([
          [Markup.button.callback("Lock / Unlock Port", "lock_unlock_port")],
          [Markup.button.callback("Ganti kapasitas ONU", "change_onu_capacity")],
          [Markup.button.callback("Refresh", "refresh"), Markup.button.callback("Cancel", "cancel")],
        ]),
      });
    } catch (error: any) {
      await ctx.reply(`Error: ${error.message}`, removeKeyboard());
    }
  });

  bot.action("lock_unlock_port", async (ctx) => {
    const customer = ctx.session.selectedCustomer;
    if (!customer) {
      return ctx.reply("Session expired. Use /cek again.", mainMenuKeyboard());
    }

    const oltName = customer.olt_name;
    const interfaceName = customer.interface;

    if (!oltName || !interfaceName) {
      return ctx.reply("Data OLT/Interface tidak tersedia.", onuActionsKeyboard());
    }

    await ctx.answerCbQuery();
    await ctx.reply("Mengecek status ETH...");

    try {
      const result = await Api.getEthStatus(oltName, interfaceName);

      // Handle array of ETH port objects
      let resultText: string;
      let isLocked = false;

      if (Array.isArray(result)) {
        // Format each port object nicely
        resultText = result.map((port: any) => {
          const lockIcon = port.is_unlocked ? "🔓" : "🔒";
          return `${lockIcon} ${port.interface}: ${port.is_unlocked ? "Unlocked" : "Locked"} | LAN: ${port.lan_detected ? "Terdeteksi" : "Tidak Terdeteksi"} | Speed: ${port.speed_status || "N/A"}`;
        }).join("\n");

        // Check if ALL ports are locked (none unlocked)
        isLocked = result.every((port: any) => !port.is_unlocked);
      } else if (typeof result === "string") {
        resultText = cleanOnuOutput(result);
        const textToCheck = resultText.toLowerCase();
        isLocked = textToCheck.includes("lock") && !textToCheck.includes("unlock");
      } else {
        resultText = JSON.stringify(result, null, 2);
        isLocked = false;
      }

      await ctx.reply(`Status ETH:\n${resultText}`, {
        ...Markup.inlineKeyboard([
          [Markup.button.callback(
            isLocked ? "🔓 Unlock Port" : "🔒 Lock Port",
            isLocked ? "confirm_unlock" : "confirm_lock"
          )],
          [Markup.button.callback("Batal", "cancel")],
        ]),
      });
    } catch (error: any) {
      await ctx.reply(`Error: ${error.message}`, onuActionsKeyboard());
    }
  });

  // Confirm Lock Port
  bot.action("confirm_lock", async (ctx) => {
    const customer = ctx.session.selectedCustomer;
    if (!customer) {
      return ctx.reply("Session expired. Use /cek again.", mainMenuKeyboard());
    }

    const oltName = customer.olt_name;
    const interfaceName = customer.interface;

    if (!oltName || !interfaceName) {
      return ctx.reply("Data OLT/Interface tidak tersedia.", onuActionsKeyboard());
    }

    await ctx.answerCbQuery();
    await ctx.editMessageText("⏳ Locking port...");

    try {
      const result = await Api.sendEthLock(oltName, interfaceName, false);
      await ctx.reply(`Port berhasil di-lock\n\n${result}`, onuActionsKeyboard());
    } catch (error: any) {
      await ctx.reply(`Gagal lock port: ${error.message}`, onuActionsKeyboard());
    }
  });

  // Confirm Unlock Port
  bot.action("confirm_unlock", async (ctx) => {
    const customer = ctx.session.selectedCustomer;
    if (!customer) {
      return ctx.reply("Session expired. Use /cek again.", mainMenuKeyboard());
    }

    const oltName = customer.olt_name;
    const interfaceName = customer.interface;

    if (!oltName || !interfaceName) {
      return ctx.reply("Data OLT/Interface tidak tersedia.", onuActionsKeyboard());
    }

    await ctx.answerCbQuery();
    await ctx.editMessageText("⏳ Unlocking port...");

    try {
      const result = await Api.sendEthLock(oltName, interfaceName, true);
      await ctx.reply(`Port berhasil di-unlock\n\n${result}`, onuActionsKeyboard());
    } catch (error: any) {
      await ctx.reply(`Gagal unlock port: ${error.message}`, onuActionsKeyboard());
    }
  });

  // Change ONU Capacity - prompt for new package
  bot.action("change_onu_capacity", async (ctx) => {
    const customer = ctx.session.selectedCustomer;
    if (!customer) {
      return ctx.reply("Session expired. Use /cek again.", mainMenuKeyboard());
    }

    const oltName = customer.olt_name;
    const interfaceName = customer.interface;

    if (!oltName || !interfaceName) {
      return ctx.reply("Data OLT/Interface tidak tersedia.", onuActionsKeyboard());
    }

    await ctx.answerCbQuery();
    // send the dba capacity first
    try {
      const result = await Api.getDba(oltName, interfaceName);
      await ctx.reply(`DBA Capacity: ${result.result} Mbps`, removeKeyboard());
    } catch (error: any) {
      await ctx.reply(`Gagal get dba capacity: ${error.message}`, removeKeyboard());
    }

    await ctx.reply(
      "Pilih kapasitas baru:",
      {
        ...NEW_CAPACITY_KEYBOARD,
      }
    );
  });

  // Handle capacity selection callbacks (capacity_10M, capacity_20M, etc.)
  bot.action(/^capacity_(.+)$/, async (ctx) => {
    const customer = ctx.session.selectedCustomer;
    if (!customer) {
      return ctx.reply("Session expired. Use /cek again.", mainMenuKeyboard());
    }

    const oltName = customer.olt_name;
    const interfaceName = customer.interface;

    if (!oltName || !interfaceName) {
      return ctx.reply("Data OLT/Interface tidak tersedia.", onuActionsKeyboard());
    }

    // Extract capacity from callback data (e.g., "capacity_10M" -> "10M")
    const newCapacity = ctx.match[1];
    if (!newCapacity) {
      return ctx.answerCbQuery("Invalid capacity selection");
    }

    await ctx.answerCbQuery();
    await ctx.editMessageText(`Mengubah kapasitas ke ${newCapacity}...`);

    try {
      const result = await Api.sendChangeCapacity(oltName, interfaceName, newCapacity);
      await ctx.reply(
        `Kapasitas berhasil diubah ke ${newCapacity}\n\n` +
        `OLT: ${oltName}\nInterface: ${interfaceName}\n\n${result}`,
        removeKeyboard()
      );
    } catch (error: any) {
      await ctx.reply(`Gagal ubah kapasitas: ${error.message}`, removeKeyboard());
    }
  });

  // Cancel capacity selection
  bot.action("cancel_capacity", async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.editMessageText("Pemilihan kapasitas dibatalkan.");
    await ctx.reply("Pilih aksi:", onuActionsKeyboard());
  });

  // Refresh - go back to running config
  bot.action("refresh", async (ctx) => {
    const customer = ctx.session.selectedCustomer;
    if (!customer) {
      return ctx.reply("Session expired. Use /cek again.", mainMenuKeyboard());
    }

    const oltName = customer.olt_name;
    const interfaceName = customer.interface;

    if (!oltName || !interfaceName) {
      return ctx.reply("Data OLT/Interface tidak tersedia.", onuActionsKeyboard());
    }

    await ctx.answerCbQuery();
    await ctx.editMessageText("Refreshing...");

    try {
      const result = await Api.getRunningConfig(oltName, interfaceName);

      await ctx.reply(`Running Config:\n${result.running_config}`);
      await ctx.reply(`ONU Running Config:\n${result.onu_running_config}`, {
        ...Markup.inlineKeyboard([
          [Markup.button.callback("Lock / Unlock Port", "lock_unlock_port")],
          [Markup.button.callback("Ganti kapasitas ONU", "change_onu_capacity")],
          [Markup.button.callback("Refresh", "refresh"), Markup.button.callback("Cancel", "cancel")],
        ]),
      });
    } catch (error: any) {
      await ctx.reply(`Error: ${error.message}`, onuActionsKeyboard());
    }
  });

  // Cancel action
  bot.action("cancel", async (ctx) => {
    await ctx.answerCbQuery();
    ctx.session.step = "CEK_ACTIONS";
    await ctx.editMessageText("ibatalkan");
    await ctx.reply("Pilih aksi:", onuActionsKeyboard());
  });
}

