/**
 * Keyboards for cek feature
 */
import { Markup } from "telegraf";

/**
 * ONU Actions keyboard for cek flow
 */
export function onuActionsKeyboard() {
  return Markup.inlineKeyboard([
    [Markup.button.callback("Cek Status", "cek_status")],
    [Markup.button.callback("Cek Status 1 PORT", "cek_status_1_port")],
    [Markup.button.callback("Cek Redaman 1 PORT", "cek_redaman_1_port")],
    [Markup.button.callback("Cek Config", "cek_config")],
    [Markup.button.callback("Config Ulang", "config_ulang")],
    [Markup.button.callback("Reboot ONU", "reboot")],
    [
      Markup.button.callback("Refresh", "cek_refresh"),
      Markup.button.callback("Cancel", "cancel"),
    ],
  ]);
}
