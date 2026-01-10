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
  ["Cek Status 1 PORT", "Cek Redaman 1 PORT"],
  ["Cek Config", "Config Ulang"],
  ["Reboot ONU"],
  ["Refresh", "Cancel"]
];

export const RUNNING_ACTION_BUTTON = [
  ["Lock / Unlock Port", "Ganti kapasitas ONU"],
  ["Refresh", "Cancel"]
]

export function runningActionKeyboard() {
  return Markup.keyboard(RUNNING_ACTION_BUTTON).resize();
}
/**
 * ONU Actions as Reply Keyboard (persistent at bottom)
 * This replaces the main menu while in CEK flow
 */
export function onuActionsKeyboard() {
  return Markup.keyboard(ONU_ACTION_BUTTONS).resize();
}

