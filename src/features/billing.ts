/**
 * Billing Feature
 * Handles billing lookup workflow for the Telegram bot
 */

import { Markup, type Telegraf } from "telegraf";
import { useCustomer } from "../api/hooks";
import type { Customer, CustomerData } from "../api/hooks";
import type { MyContext } from "../types/session";
import { formatError, logError } from "../utils/error-handler";
import { customerSelectKeyboard } from "../keyboards";

/**
 * Error thrown when customer data is not found
 */
export class CustomerNotFoundError extends Error {
  constructor(query: string) {
    super(`Customer not found: ${query}`);
    this.name = "CustomerNotFoundError";
  }
}

/**
 * Result of billing lookup
 */
export interface BillingResult {
  customer: Customer;
  source: "search" | "direct";
}

/**
 * Lookup billing for a specific pppoe_user
 */
async function getBillingForUser(pppoeUser: string): Promise<Customer | null> {
  try {
    const billingResults = await useCustomer.getBilling(pppoeUser);
    return billingResults?.[0] || null;
  } catch (error) {
    logError("Billing Lookup", error);
    return null;
  }
}

/**
 * Format billing result for display in Telegram
 * Returns [mainMessage, invoicesMessage] - invoices can be sent separately
 */
export function formatBillingResponse(customer: Customer): [string, string | null] {
  // Main info message
  const mainLines: string[] = [
    `*${customer.name || "N/A"}*`,
    `${customer.address || "N/A"}`,
    ``,
    `Paket: ${customer.package || "N/A"}`,
    `Terakhir Bayar: ${customer.last_payment || "N/A"}`,
  ];

  // Invoices message (separate)
  let invoicesMessage: string | null = null;

  if (customer.invoices) {
    if (typeof customer.invoices === "string") {
      invoicesMessage = customer.invoices;
    } else if (Array.isArray(customer.invoices)) {
      const invLines: string[] = [];
      (customer.invoices as any[]).forEach((inv: any, i: number) => {
        invLines.push(`${i + 1}. ${inv.amount || inv.total || inv}`);
      });
      invoicesMessage = invLines.join("\n");
    } else {
      invoicesMessage = JSON.stringify(customer.invoices);
    }
  }

  return [mainLines.join("\n"), invoicesMessage];
}

/**
 * Parse billing command from user input
 * Supports: "/link <query>", "link <query>", "/l <query>", "l <query>"
 */
export function parseBillingCommand(text: string): string | null {
  const trimmed = text.trim();
  const match = trimmed.match(/^\/?(?:link|l)\s+(.+)$/i);
  return match?.[1]?.trim() || null;
}

/**
 * Send billing info for a customer
 */
async function sendBillingInfo(ctx: MyContext, pppoeUser: string) {
  const customer = await getBillingForUser(pppoeUser);

  if (!customer) {
    await ctx.reply(`Tidak dapat mengambil data billing untuk: \`${pppoeUser}\``, {
      parse_mode: "Markdown",
    });
    return;
  }

  const [mainMessage, invoicesMessage] = formatBillingResponse(customer);

  // Send main info
  await ctx.reply(mainMessage, { parse_mode: "Markdown" });

  // Send invoices as separate message if available
  if (invoicesMessage) {
    await ctx.reply(invoicesMessage, {
      parse_mode: "Markdown",
      link_preview_options: { is_disabled: true },
    });
  }
}

/**
 * Register billing command handlers (link/l)
 */
export function registerBillingHandlers(bot: Telegraf<MyContext>) {
  // Match both "/link query" and "link query" patterns
  bot.hears(/^\/?(?:link|l)\s+.+$/i, async (ctx) => {
    const query = parseBillingCommand(ctx.message.text);

    if (!query) {
      return ctx.reply("Format salah. Gunakan: `link <nama/pppoe>`", {
        parse_mode: "Markdown",
      });
    }

    await ctx.reply(`Mencari data untuk: *${query}*...`, {
      parse_mode: "Markdown",
    });

    try {
      // Step 1: Search for customers
      const searchResults = await useCustomer.search(query);
      console.log(`[Billing] Search results: ${searchResults?.length || 0}`);

      if (!searchResults || searchResults.length === 0) {
        return ctx.reply(`Data tidak ditemukan: \`${query}\``, {
          parse_mode: "Markdown",
        });
      }

      // Step 2: If only 1 result, directly fetch billing
      if (searchResults.length === 1) {
        const customer = searchResults[0]!;
        const pppoeUser = customer.pppoe_user;

        if (!pppoeUser) {
          return ctx.reply("Customer tidak memiliki data PPPoE.");
        }

        console.log(`[Billing] Single result, fetching billing for: ${pppoeUser}`);
        await sendBillingInfo(ctx, pppoeUser);
        return;
      }

      ctx.session.billingResults = searchResults;
      ctx.session.step = "BILLING_SELECT";

      await ctx.reply(`📋 Ditemukan ${searchResults.length} pelanggan. Pilih:`, {
        ...customerSelectKeyboard(searchResults, "billing_select:"),
      });
    } catch (error) {
      logError("Billing", error);
      await ctx.reply(formatError(error));
    }
  });

  // --- Customer Selection from list ---
  bot.action(/^billing_select:(\d+)$/, async (ctx) => {
    await ctx.answerCbQuery();

    // Validate step
    if (ctx.session.step !== "BILLING_SELECT") {
      return ctx.reply("⚠️ Session expired. Jalankan /link lagi.");
    }

    const idx = parseInt(ctx.match[1]!);
    const customer = ctx.session.billingResults?.[idx] as CustomerData | undefined;

    if (!customer) {
      return ctx.reply("Session expired. Gunakan /link lagi.");
    }

    const pppoeUser = customer.pppoe_user;
    if (!pppoeUser) {
      return ctx.reply("Customer tidak memiliki data PPPoE.");
    }

    // Clear session
    ctx.session.step = "IDLE";
    ctx.session.billingResults = undefined;

    await ctx.editMessageText(`Dipilih: ${customer.name}\nMengambil data billing...`);

    console.log(`[Billing] Selected customer, fetching billing for: ${pppoeUser}`);
    await sendBillingInfo(ctx, pppoeUser);
  });
}

// Legacy exports for compatibility
export async function lookupBilling(query: string): Promise<BillingResult> {
  const searchResults = await useCustomer.search(query);
  if (searchResults && searchResults.length > 0) {
    const customer = searchResults[0];
    if (customer?.pppoe_user) {
      const billingCustomer = await getBillingForUser(customer.pppoe_user);
      if (billingCustomer) {
        return { customer: billingCustomer, source: "search" };
      }
    }
  }
  throw new CustomerNotFoundError(query);
}
