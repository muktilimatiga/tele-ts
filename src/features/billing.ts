/**
 * Billing Feature
 * Handles billing lookup workflow for the Telegram bot
 */

import type { Telegraf } from "telegraf";
import { useCustomer } from "../api/hooks";
import type { Customer } from "../api/hooks";
import type { MyContext } from "../types/session";

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
 * Lookup billing information for a customer
 *
 * Workflow:
 * 1. Try to find customer using search (by name or user_pppoe)
 * 2. If found, use user_pppoe to get billing details
 * 3. If not found in search, fallback to direct billing lookup
 * 4. If still not found, throw CustomerNotFoundError
 *
 * @param query - Customer name or user_pppoe
 * @returns BillingResult with customer data and source
 * @throws CustomerNotFoundError if customer not found
 */
export async function lookupBilling(query: string): Promise<BillingResult> {
  // Step 1: Try to find customer via search
  try {
    const searchResults = await useCustomer.search(query);

    if (searchResults && searchResults.length > 0) {
      // Found customer in search - use their pppoe_user to get billing
      const customerData = searchResults[0];
      if (!customerData) {
        // Shouldn't happen, but TypeScript safety
        throw new Error("Unexpected empty search result");
      }
      const pppoeUser = customerData.pppoe_user;

      if (pppoeUser) {
        // Get full billing details
        const billingResults = await useCustomer.getBilling(pppoeUser);
        const billingCustomer = billingResults?.[0];

        if (billingCustomer) {
          return {
            customer: billingCustomer,
            source: "search",
          };
        }
      }

      // If no pppoe_user or billing not found, try with original query
    }
  } catch (error) {
    // Search failed, continue to fallback
    console.log(`[Billing] Search failed for "${query}", trying direct lookup`);
  }

  // Step 2: Fallback - try direct billing lookup
  try {
    const billingResults = await useCustomer.getBilling(query);
    const billingCustomer = billingResults?.[0];

    if (billingCustomer) {
      return {
        customer: billingCustomer,
        source: "direct",
      };
    }
  } catch (error) {
    // Direct lookup also failed
    console.log(`[Billing] Direct lookup failed for "${query}"`);
  }

  // Step 3: Nothing found - throw error
  throw new CustomerNotFoundError(query);
}

/**
 * Parse billing command from user input
 * Supports: "link <query>", "l <query>"
 *
 * @param text - User input text
 * @returns Query string or null if not a billing command
 */
export function parseBillingCommand(text: string): string | null {
  const trimmed = text.trim();

  // Match "link" or "l" followed by query
  const match = trimmed.match(/^(?:link|l)\s+(.+)$/i);

  if (match?.[1]) {
    return match[1].trim();
  }

  return null;
}

/**
 * Format billing result for display in Telegram
 * Returns [mainMessage, invoicesMessage] - invoices can be sent separately
 */
export function formatBillingResponse(result: BillingResult): [string, string | null] {
  const { customer } = result;

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
 * Register billing command handlers (link/l)
 */
export function registerBillingHandlers(bot: Telegraf<MyContext>) {
  bot.hears(/^(?:link|l)\s+.+$/i, async (ctx) => {
    const query = parseBillingCommand(ctx.message.text);

    if (!query) {
      return ctx.reply("❌ Format salah. Gunakan: `link <nama/pppoe>`", {
        parse_mode: "Markdown",
      });
    }

    await ctx.reply(`🔍 Mencari data untuk: *${query}*...`, {
      parse_mode: "Markdown",
    });

    try {
      const result = await lookupBilling(query);
      const [mainMessage, invoicesMessage] = formatBillingResponse(result);

      // Send main info
      await ctx.reply(mainMessage, { parse_mode: "Markdown" });

      // Send invoices as separate message if available (no link preview)
      if (invoicesMessage) {
        await ctx.reply(invoicesMessage, {
          parse_mode: "Markdown",
          link_preview_options: { is_disabled: true },
        });
      }
    } catch (error) {
      if (error instanceof CustomerNotFoundError) {
        await ctx.reply(`❌ Data tidak ditemukan: \`${query}\``, {
          parse_mode: "Markdown",
        });
      } else {
        console.error("[Billing Error]", error);
        await ctx.reply("❌ Terjadi kesalahan saat mengambil data.");
      }
    }
  });
}

