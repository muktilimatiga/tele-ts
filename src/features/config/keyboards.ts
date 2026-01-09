import { Markup } from "telegraf";

export function configActionsKeyboard() {
  return Markup.inlineKeyboard([
    [Markup.button.callback("Config PSB", "config_psb")],
    [Markup.button.callback("No Onu", "no_onu")],
    [
      Markup.button.callback("Config Ulang Modem", "config_ulang"), // Full config
      Markup.button.callback("Regist Sn", "regist_sn"), // Just regist new SN
    ],
    [Markup.button.callback("Cancel", "cancel")],
  ]);
}
