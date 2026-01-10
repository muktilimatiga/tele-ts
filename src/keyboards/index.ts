/**
 * Keyboards - Reusable inline keyboard builders
 */

import { Markup } from "telegraf";

/**
 * Cancel button keyboard
 */
export function cancelKeyboard() {
  return Markup.inlineKeyboard([Markup.button.callback("Cancel", "cancel")]);
}

/**
 * Modem selection keyboard
 */
export function modemSelectKeyboard() {
  return Markup.inlineKeyboard([
    [Markup.button.callback("1. F609", "modem:F609")],
    [Markup.button.callback("2. F670L", "modem:F670L")],
    [Markup.button.callback("3. C-DATA", "modem:C-DATA")],
  ]);
}

/**
 * Confirmation keyboard (yes/cancel)
 */
export function confirmKeyboard() {
  return Markup.inlineKeyboard([
    Markup.button.callback("Oke", "confirm_yes"),
    Markup.button.callback("Cancel", "cancel"),
  ]);
}

/**
 * Build a list keyboard with cancel button
 * @param items - Array of items to show
 * @param labelFn - Function to generate button label
 * @param callbackPrefix - Prefix for callback data (e.g., "olt:", "ont:")
 * @param maxItems - Maximum items to show (default 5)
 */
export function listKeyboard<T>(
  items: T[],
  labelFn: (item: T, index: number) => string,
  callbackPrefix: string,
  maxItems = 5
) {
  const buttons = items
    .slice(0, maxItems)
    .map((item, idx) => [
      Markup.button.callback(labelFn(item, idx), `${callbackPrefix}${idx}`),
    ]);

  buttons.push([Markup.button.callback("Cancel", "cancel")]);

  return Markup.inlineKeyboard(buttons);
}

/**
 * OLT list keyboard
 */
export function oltListKeyboard(olts: string[]) {
  const buttons = olts.map((olt) => [
    Markup.button.callback(`📡 ${olt}`, `olt:${olt}`),
  ]);
  buttons.push([Markup.button.callback("Cancel", "cancel")]);
  return Markup.inlineKeyboard(buttons);
}

/**
 * ETH Lock keyboard
 */
export function ethLockKeyboard() {
  return Markup.inlineKeyboard([
    Markup.button.callback("Lock", "eth_lock"),
    Markup.button.callback("Unlock", "eth_unlock"),
  ]);
}
/**
 * Refresh + Cancel keyboard for empty results
 */
export function refreshCancelKeyboard(refreshCallback: string) {
  return Markup.inlineKeyboard([
    Markup.button.callback("Refresh", refreshCallback),
    Markup.button.callback("Cancel", "cancel"),
  ]);
}

// ===========================================
// MAIN MENU CONFIGURATION
// ===========================================

/**
 * Main menu button configuration
 * Edit this array to change the main menu buttons
 */
export const MAIN_MENU_BUTTONS = [
  ["/psb", "/cek"],
  ["/link", "/open"],
  ["/help"],
];

/**
 * Main reply keyboard (persistent at bottom)
 */
export function mainMenuKeyboard() {
  return Markup.keyboard(MAIN_MENU_BUTTONS).resize();
}

/**
 * Remove keyboard
 */
export function removeKeyboard() {
  return Markup.removeKeyboard();
}

/**
 * Customer selection button format
 * Edit this to change how customer buttons are displayed
 */
export function formatCustomerButton(customer: {
  name?: string;
  pppoe_user?: string;
  address?: string;
}): string {
  const name = (customer.name || "").slice(0, 15);
  const pppoe = customer.pppoe_user || "N/A";
  const alamat = (customer.address || "").slice(0, 15);
  return `${name} | ${pppoe} | ${alamat}`;
}

/**
 * Build a customer selection keyboard
 * @param customers - Array of customer objects
 * @param callbackPrefix - Prefix for callback (e.g., "cek_select:", "billing_select:")
 * @param maxItems - Maximum items to show (default 10)
 */
export function customerSelectKeyboard<
  T extends { name?: string; pppoe_user?: string }
>(customers: T[], callbackPrefix: string, maxItems = 10) {
  const buttons = customers.slice(0, maxItems).map((c, i) => [
    Markup.button.callback(formatCustomerButton(c), `${callbackPrefix}${i}`),
  ]);

  buttons.push([Markup.button.callback("Cancel", "cancel")]);

  return Markup.inlineKeyboard(buttons);
}
