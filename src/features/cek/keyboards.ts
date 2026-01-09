/**
 * Keyboards for cek feature
 * Edit ONU_ACTION_BUTTONS to configure the action menu
 */
import { Markup } from "telegraf";

/**
 * ONU Action button configuration for REPLY KEYBOARD (bottom of screen)
 * Edit this array to change the ONU actions menu
 */
export const ONU_ACTION_BUTTONS = [
  ["Cek Status 1 PORT"],
  ["Cek Redaman 1 PORT"],
  ["Cek Config"],
  ["Config Ulang"],
  ["Reboot ONU"],
  ["Refresh"],
  ["Cancel"]
];

/**
 * ONU Actions as Reply Keyboard (persistent at bottom)
 * This replaces the main menu while in CEK flow
 */
export function onuActionsKeyboard() {
  return Markup.keyboard(ONU_ACTION_BUTTONS).resize();
}

/**
 * ONU Actions as Inline Keyboard (in chat - legacy)
 */
export function onuActionsInlineKeyboard() {
  return Markup.inlineKeyboard([
    [Markup.button.callback("Cek Status 1 PORT", "cek_status_1_port")],
    [Markup.button.callback("Cek Redaman 1 PORT", "cek_redaman_1_port")],
    [Markup.button.callback("Cek Config", "cek_config")],
    [Markup.button.callback("Config Ulang", "config_ulang")],
    [Markup.button.callback("Reboot ONU", "reboot")],
    [
      Markup.button.callback("Refresh", "repeat_last"),
      Markup.button.callback("Cancel", "cancel"),
    ],
  ]);
}
