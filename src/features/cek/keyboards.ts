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

/**
 * Capacity options for inline keyboard
 * Each button triggers a callback that sends directly to the API
 */
const CAPACITY_OPTIONS = ["10M", "15M", "20M", "25M", "30M", "35M", "40M", "45M", "50M", "75M", "100M"];

export const NEW_CAPACITY_KEYBOARD = Markup.inlineKeyboard([
  ...CAPACITY_OPTIONS.map((cap) => [Markup.button.callback(cap, `capacity_${cap}`)]),
  [Markup.button.callback("Cancel", "cancel_capacity")],
]);

/**
 * ONU Actions as Reply Keyboard (persistent at bottom)
 * This replaces the main menu while in CEK flow
 */
export function onuActionsKeyboard() {
  return Markup.keyboard(ONU_ACTION_BUTTONS).resize();
}

