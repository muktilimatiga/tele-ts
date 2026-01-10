/**
 * Ticket Feature
 * Handles ticket creation workflow for the Telegram bot
 * 
 * Supported flows:
 * 1. "open" → ask for query, then description
 * 2. "open <query>" → search customer, then ask for description
 * 3. "open <query> <description>" → search and create ticket directly
 */

import { Markup, type Telegraf } from "telegraf";
import { useCustomer } from "../api/hooks";
import type { CustomerData } from "../api/hooks";
import type { MyContext } from "../types/session";
import { formatError, logError } from "../utils/error-handler";
import { customerSelectKeyboard, mainMenuKeyboard, removeKeyboard } from "../keyboards";
import { Api } from "../api/api";

/**
 * Parse ticket command from user input
 * Returns { query, description } or null parts
 * 
 * Examples:
 * - "open" → { query: null, description: null }
 * - "open nasrul beji" → { query: "nasrul beji", description: null }
 * - "open nasrul beji wifi lag" → tries to detect if last words are description
 */
function parseTicketCommand(text: string): { query: string | null; description: string | null } {
  const trimmed = text.trim();
  const match = trimmed.match(/^\/?(?:open|o)(?:\s+(.*))?$/i);
  
  if (!match) {
    return { query: null, description: null };
  }
  
  const args = match[1]?.trim() || null;
  
  if (!args) {
    return { query: null, description: null };
  }
  
  // Try to detect if there's a description after the query
  // Common patterns: "nasrul beji wifi lag", "nasrul beji tidak bisa connect"
  // We'll use a simple heuristic: if there are more than 2 words and 
  // the last part looks like a description (contains common keywords)
  const words = args.split(/\s+/);
  
  if (words.length >= 3) {
    // Common description keywords
    const descKeywords = [
      'wifi', 'lag', 'lambat', 'putus', 'mati', 'error', 'tidak', 'bisa', 
      'connect', 'koneksi', 'internet', 'los', 'gangguan', 'trouble', 'down',
      'slow', 'disconnect', 'timeout', 'lemot', 'lelet', 'sering', 'restart'
    ];
    
    // Check if any word after the first 2 is a keyword
    const potentialDescWords = words.slice(2);
    const hasDescKeyword = potentialDescWords.some(w => 
      descKeywords.includes(w.toLowerCase())
    );
    
    if (hasDescKeyword) {
      // First 2 words are query, rest is description
      const query = words.slice(0, 2).join(' ');
      const description = potentialDescWords.join(' ');
      return { query, description };
    }
  }
  
  // No description detected, all args are query
  return { query: args, description: null };
}

/**
 * Create ticket via API
 */
async function createTicket(
  ctx: MyContext,
  query: string,
  description: string,
  customer?: CustomerData
) {
  try {
    await ctx.reply(`Membuat tiket untuk: ${query}...`);
    
    const result = await Api.createTicket({
      query: customer?.pppoe_user || query,
      description: description,
    });
    
    // Clear session
    ctx.session.step = "IDLE";
    ctx.session.ticketCustomer = undefined;
    ctx.session.ticketQuery = undefined;
    ctx.session.ticketDescription = undefined;
    ctx.session.ticketResults = undefined;
    
    await ctx.reply(
      `Tiket berhasil dibuat\n\n` +
      `Pelanggan: ${customer?.name || query}\n` +
      `PPPoE: ${customer?.pppoe_user || 'N/A'}\n` +
      `Kendala: ${description}\n` +
      `${result.message || ''}`,
      removeKeyboard()
    );
  } catch (error: any) {
    logError("Create Ticket", error);
    await ctx.reply(`Gagal membuat tiket: ${error.message}`, removeKeyboard());
  }
}

/**
 * Search customer and handle ticket flow
 */
async function searchAndProceed(ctx: MyContext, query: string, description: string | null) {
  try {
    const searchResults = await useCustomer.search(query);
    console.log(`[Ticket] Search results: ${searchResults?.length || 0}`);
    
    if (!searchResults || searchResults.length === 0) {
      // No customer found - use query as-is for ticket
      if (description) {
        // Have description, create ticket directly with query text
        await createTicket(ctx, query, description);
      } else {
        // No description, ask for it
        ctx.session.ticketQuery = query;
        ctx.session.step = "TICKET_WAITING_DESCRIPTION";
        await ctx.reply(
          `Pelanggan tidak ditemukan, tiket akan dibuat dengan query: ${query}\n\n` +
          `Masukkan kendala/deskripsi:`,
          removeKeyboard()
        );
      }
      return;
    }
    
    // Single result
    if (searchResults.length === 1) {
      const customer = searchResults[0]!;
      
      if (description) {
        // Have description, create ticket directly
        await createTicket(ctx, query, description, customer);
      } else {
        // No description, save customer and ask for description
        ctx.session.ticketCustomer = customer;
        ctx.session.ticketQuery = customer.pppoe_user || query;
        ctx.session.step = "TICKET_WAITING_DESCRIPTION";
        await ctx.reply(
          `Pelanggan: ${customer.name}\n` +
          `PPPoE: ${customer.pppoe_user || 'N/A'}\n\n` +
          `Alamat: ${customer.address || 'N/A'}\n\n` +
          `Masukkan kendala/deskripsi:`,
          removeKeyboard()
        );
      }
      return;
    }
    
    // Multiple results - save description for later and show selection
    ctx.session.ticketResults = searchResults;
    ctx.session.ticketDescription = description || undefined;
    ctx.session.step = "TICKET_SELECT";
    
    await ctx.reply(`Ditemukan ${searchResults.length} pelanggan. Pilih:`, {
      ...customerSelectKeyboard(searchResults, "ticket_select:"),
    });
  } catch (error) {
    logError("Ticket Search", error);
    await ctx.reply(formatError(error), mainMenuKeyboard());
  }
}

/**
 * Register ticket command handlers
 */
export function registerTicketHandlers(bot: Telegraf<MyContext>) {
  // Handle "open" command with or without arguments
  bot.hears(/^\/?(?:open|o)(?:\s+.*)?$/i, async (ctx) => {
    const { query, description } = parseTicketCommand(ctx.message.text);
    
    // Case 1: Just "open" - ask for query
    if (!query) {
      ctx.session.step = "TICKET_WAITING_QUERY";
      return ctx.reply(
        "Masukkan nama atau user PPPoE pelanggan:",
        removeKeyboard()
      );
    }
    
    await ctx.reply(`Mencari data untuk: ${query}...`, removeKeyboard());
    
    // Case 2 & 3: Have query, search and proceed
    await searchAndProceed(ctx, query, description);
  });
  
  // Handle text input when waiting for query
  bot.on("text", async (ctx, next) => {
    if (ctx.session.step !== "TICKET_WAITING_QUERY") {
      return next();
    }
    
    const query = ctx.message.text.trim();
    
    if (!query || query.startsWith('/')) {
      return next();
    }
    
    await ctx.reply(`Mencari data untuk: ${query}...`);
    await searchAndProceed(ctx, query, null);
  });
  
  // Handle text input when waiting for description
  bot.on("text", async (ctx, next) => {
    if (ctx.session.step !== "TICKET_WAITING_DESCRIPTION") {
      return next();
    }
    
    const description = ctx.message.text.trim();
    
    if (!description || description.startsWith('/')) {
      return next();
    }
    
    const query = ctx.session.ticketQuery;
    const customer = ctx.session.ticketCustomer;
    
    if (!query) {
      ctx.session.step = "IDLE";
      return ctx.reply("Session expired. Gunakan /open lagi.", mainMenuKeyboard());
    }
    
    await createTicket(ctx, query, description, customer);
  });
  
  // Handle customer selection from list
  bot.action(/^ticket_select:(\d+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    
    if (ctx.session.step !== "TICKET_SELECT") {
      return ctx.reply("Session expired. Gunakan /open lagi.", mainMenuKeyboard());
    }
    
    const idx = parseInt(ctx.match[1]!);
    const customer = ctx.session.ticketResults?.[idx] as CustomerData | undefined;
    
    if (!customer) {
      return ctx.reply("Session expired. Gunakan /open lagi.", mainMenuKeyboard());
    }
    
    const description = ctx.session.ticketDescription;
    
    await ctx.editMessageText(`Dipilih: ${customer.name}`);
    
    if (description) {
      // Already have description, create ticket
      await createTicket(ctx, customer.pppoe_user || customer.name || '', description, customer);
    } else {
      // Need to ask for description
      ctx.session.ticketCustomer = customer;
      ctx.session.ticketQuery = customer.pppoe_user || customer.name;
      ctx.session.step = "TICKET_WAITING_DESCRIPTION";
      
      await ctx.reply(
        `Nama Pelanggan: ${customer.name}\n` +
        `PPPoE: ${customer.pppoe_user || 'N/A'}\n\n` +
        `Alamat: ${customer.address || 'N/A'}\n\n` +
        `Masukkan kendala/deskripsi:`,
        removeKeyboard()
      );
    }
  });
}
