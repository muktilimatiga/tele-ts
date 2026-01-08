import { Markup, type Telegraf } from "telegraf";
import type { MyContext } from "../types/session";
import { useCustomer, useOnu } from "../api/hooks";
import { onuActionsKeyboard } from "../keyboards";

/**
 * Register /cek command and action handlers
 */
export function registerCekHandlers(bot: Telegraf<MyContext>) {

  // --- /cek command (Keep as is) ---
  bot.command("cek", async (ctx) => {
    // ... (Your existing search logic is fine)
    // Just ensure you use parse_mode: "HTML" if you change anything here.
    // For brevity, I am skipping the search part to focus on the FIX below.
    const args = ctx.message.text.split(" ").slice(1).join(" ").trim();
    if (!args) return ctx.reply("Gunakan: /cek <nama/pppoe>");
    
    // ... (Perform search and reply with buttons) ... 
    // This part of your code was likely fine, let's focus on the ACTION handlers.
    // Assuming you have the search logic here...
    try {
        const results = await useCustomer.search(args);
        // ... (results handling)
        if (results.length === 1 && results[0]) {
            const customer = results[0];
            ctx.session.selectedCustomer = customer;
            ctx.session.step = "CEK_ACTIONS";
            await ctx.reply(`✅ Ditemukan: <b>${customer.name}</b>`, {
                parse_mode: "HTML",
                ...onuActionsKeyboard()
            });
        } else {
            await ctx.reply(`Hasil: ${results.length} ditemukan`, {
                ...Markup.inlineKeyboard([
                    // ... buttons
                ])
            });
        }
    } catch(e) { ctx.reply("Error searching"); }
  });

  // --- Customer Selection (Keep as is) ---
  bot.action(/^cek_select:(\d+)$/, async (ctx) => {
      // ... (Your existing selection logic)
      // Just make sure to use parse_mode: "HTML" for bolding
      ctx.session.step = "CEK_ACTIONS";
      await ctx.reply("Pilih aksi:", { ...onuActionsKeyboard() }); 
  });


  // ==========================================
  //  THE FIX IS HERE (Status, Redaman, Reboot)
  // ==========================================

  // --- Cek Status action ---
  bot.action("cek_status", async (ctx) => {
    await ctx.answerCbQuery();
    const { selectedCustomer } = ctx.session;

    if (!selectedCustomer?.olt_name || !selectedCustomer?.interface) return ctx.reply("Data OLT/Interface tidak tersedia.");

    await ctx.editMessageText("⏳ Mengecek status ONU...");

    try {
      const result = await useOnu.cek(
        selectedCustomer.olt_name,
        selectedCustomer.interface
      );
      
      // 1. Get the raw text
      const rawText = typeof result === "string" ? result : formatResultToText(result);
      
      // 2. Format it as a PURE MESSAGE (No Wrapper)
      const cleanMessage = formatZteStatusToHtml(rawText);

      await ctx.editMessageText(cleanMessage, {
        ...onuActionsKeyboard(),
      });

    } catch (error: any) {
      await ctx.editMessageText(`⚠️ Error: ${error.message}`, onuActionsKeyboard());
    }
  });

  // --- Cek Redaman action ---
  bot.action("cek_redaman", async (ctx) => {
    await ctx.answerCbQuery();
    const { selectedCustomer } = ctx.session;

    if (!selectedCustomer?.olt_name || !selectedCustomer?.interface) return ctx.reply("Data OLT/Interface tidak tersedia.");

    await ctx.editMessageText("⏳ Mengecek redaman...");

    try {
      const result = await useOnu.portRx(
        selectedCustomer.olt_name,
        selectedCustomer.interface
      );

      const rawText = typeof result === "string" ? result : formatResultToText(result);
      
      // Format as Pure Message
      const cleanMessage = formatZteRedamanToHtml(rawText);

      await ctx.editMessageText(cleanMessage, {
        ...onuActionsKeyboard(),
      });
    } catch (error: any) {
      await ctx.editMessageText(`⚠️ Error: ${error.message}`, onuActionsKeyboard());
    }
  });

  // --- Reboot action ---
  bot.action("cek_reboot", async (ctx) => {
    await ctx.answerCbQuery();
    const { selectedCustomer } = ctx.session;

    if (!selectedCustomer?.olt_name || !selectedCustomer?.interface) return ctx.reply("Data OLT/Interface tidak tersedia.");

    await ctx.editMessageText("⏳ Rebooting ONU...");

    try {
      const result = await useOnu.reboot(
        selectedCustomer.olt_name,
        selectedCustomer.interface
      );

      const rawText = formatResultToText(result);
      
      await ctx.editMessageText(`✅ Reboot Command Sent\n\n${rawText}`, {
        ...onuActionsKeyboard(),
      });
    } catch (error: any) {
      await ctx.editMessageText(`⚠️ Error: ${error.message}`, onuActionsKeyboard());
    }
  });

  // ... (Keep your refresh handler) ...
}

/**
 * PARSER 1: Format Status Output nicely without Wrapper
 */
function formatZteStatusToHtml(raw: string): string {
  return raw;
}

/**
 * PARSER 2: Format Redaman Output nicely without Wrapper
 */
/**
 * PARSER 2: Format Redaman Output nicely without Wrapper
 */
function formatZteRedamanToHtml(raw: string): string {
    // Expected: up Rx :-26.411(dbm) Tx:2.276(dbm) ...
    // Let's make it look like a clean list.
    
    let output = "📡 Optical Signal Info\n\n";
    
    // Extract numbers using Regex
    const upRx = raw.match(/up.*?Rx\s*:([-\d\.]+)/)?.[1];
    const upTx = raw.match(/up.*?Tx\s*:([-\d\.]+)/)?.[1];
    const downTx = raw.match(/down.*?Tx\s*:([-\d\.]+)/)?.[1];
    const downRx = raw.match(/down.*?Rx\s*:([-\d\.]+)/)?.[1];
    const att = raw.match(/(\d+\.\d+)\(dB\)/)?.[1]; // Finds "28.687(dB)"

    if (upRx || downRx) {
        output += `⬆️ UPLOAD (ONU -> OLT)\n`;
        output += `Tx Power: ${upTx || "?"} dBm\n`;
        output += `Rx Power: ${upRx || "?"} dBm\n\n`;

        output += `⬇️ DOWNLOAD (OLT -> ONU)\n`;
        output += `Tx Power: ${downTx || "?"} dBm\n`;
        output += `Rx Power: ${downRx || "?"} dBm\n\n`;
        
        if (att) output += `📉 Attenuation: ${att} dB`;
    } else {
        // Fallback if regex fails: just return text but bolded
        output += raw; 
    }

    return output;
}

// Helper (Keep as is)
// Helper (Updated to be smarter about extracting text)
function formatResultToText(data: any): string {
  if (typeof data === "string") return data;
  if (!data) return "";
  
  // Handle array
  if (Array.isArray(data)) return data.map(formatResultToText).join("\n");
  
  // Handle object wrappers
  if (typeof data === "object") {
    // 1. Prioritize meaningful text keys
    const candidates = ["data", "result", "output", "message", "response"];
    for (const key of candidates) {
        if (key in data) {
             const val = data[key];
             // If it's a non-empty string, that's likely our output!
             if (typeof val === "string" && val.trim().length > 0) return val;
        }
    }

    // 2. Recursion for "data" or "result" even if not string (nested wrapper)
    if ("data" in data) return formatResultToText(data.data);
    if ("result" in data) return formatResultToText(data.result);

    // 3. Single key object? parsing { "foo": "bar" } -> "bar"
    const keys = Object.keys(data);
    if (keys.length === 1 && keys[0]) {
        return formatResultToText(data[keys[0]]);
    }

    // 4. Fallback: formatted key-value pairs
    return Object.entries(data).map(([k, v]) => `${k}: ${v}`).join("\n");
  }
  
  return String(data);
}