import { Telegraf, Markup, Context, session } from "telegraf";
import axios from "axios";
import "dotenv/config";

// --- CONFIG ---
const BOT_TOKEN = process.env.BOT_TOKEN || "";
const API_BASE_URL = process.env.API_BASE_URL || "http://localhost:8002";

if (!BOT_TOKEN) throw new Error("BOT_TOKEN is missing!");

// --- TYPES (Just simple interfaces, no Classes) ---
interface SessionData {
  step?:
    | "IDLE"
    | "SELECT_OLT"
    | "SELECT_ONT"
    | "SELECT_PSB"
    | "SELECT_MODEM"
    | "CONFIRM";
  oltName?: string;
  ontList?: any[];
  selectedOnt?: any;
  psbList?: any[];
  selectedPsb?: any;
  selectedModem?: string;
  page?: number;
}

// Extend Telegraf Context to include Session
interface MyContext extends Context {
  session: SessionData;
}

const bot = new Telegraf<MyContext>(BOT_TOKEN);

// Use built-in session middleware (stores data in RAM)
bot.use(session({ defaultSession: () => ({ step: "IDLE", page: 0 }) }));

// --- API HELPER (Simple Axios wrapper) ---
const api = axios.create({ baseURL: API_BASE_URL, timeout: 60000 });

// ============================================================
//  🤖 1. START PSB FLOW (Command /psb or Menu Button)
// ============================================================
const startPsb = async (ctx: MyContext) => {
  try {
    if (ctx.callbackQuery) await ctx.answerCbQuery();
    await ctx.reply("⏳ Mengambil daftar OLT...");

    // 1. Fetch from API
    const { data } = await api.get("/api/options");
    const olts: string[] = data.olt_options;

    // 2. Reset Session
    ctx.session = { step: "SELECT_OLT", page: 0 };

    // 3. Show Buttons
    // .map() is strictly cleaner than Python's list comprehension
    const buttons = olts.map((olt) => [
      Markup.button.callback(`📡 ${olt}`, `olt:${olt}`),
    ]);

    buttons.push([Markup.button.callback("❌ Cancel", "cancel")]);

    await ctx.reply("📡 *Pilih OLT:*", {
      parse_mode: "Markdown",
      ...Markup.inlineKeyboard(buttons),
    });
  } catch (e: any) {
    await ctx.reply(`❌ Error: ${e.message}`);
  }
};

bot.command("psb", startPsb);
bot.action("menu_psb", startPsb);

// ============================================================
//  📡 2. HANDLE OLT SELECTION
// ============================================================
// Regex matches "olt:ZTE-C320" -> captures "ZTE-C320"
bot.action(/^olt:(.+)$/, async (ctx) => {
  await ctx.answerCbQuery();
  const oltName = ctx.match[1]; // The regex capture

  ctx.session.oltName = oltName;
  ctx.session.step = "SELECT_ONT";

  await ctx.editMessageText(`⏳ Scanning ONT di *${oltName}*...`, {
    parse_mode: "Markdown",
  });

  try {
    const { data: onts } = await api.get(`/api/olts/${oltName}/detect-onts`);
    ctx.session.ontList = onts;

    if (onts.length === 0) {
      return ctx.editMessageText(
        `⚠️ Tidak ada ONT unconfigured di ${oltName}.`,
        Markup.inlineKeyboard([
          Markup.button.callback("🔄 Refresh", `olt:${oltName}`),
          Markup.button.callback("❌ Cancel", "cancel"),
        ])
      );
    }

    // Build buttons for ONTs
    const buttons = onts.slice(0, 5).map((ont: any, idx: number) => [
      Markup.button.callback(
        `${ont.interface || ont.onu_id} | ${ont.sn.slice(0, 8)}`,
        `ont:${idx}` // We just store the array index
      ),
    ]);

    await ctx.editMessageText(`📡 *Pilih ONT* (Found: ${onts.length})`, {
      parse_mode: "Markdown",
      ...Markup.inlineKeyboard([
        ...buttons,
        [Markup.button.callback("❌ Cancel", "cancel")],
      ]),
    });
  } catch (e: any) {
    await ctx.editMessageText(`❌ API Error: ${e.message}`);
  }
});

// ============================================================
//  🔌 3. HANDLE ONT SELECTION -> SHOW PSB LIST
// ============================================================
bot.action(/^ont:(\d+)$/, async (ctx) => {
  await ctx.answerCbQuery();
  const idx = parseInt(ctx.match[1]);
  const ont = ctx.session.ontList?.[idx];

  if (!ont) return ctx.reply("Session expired. /psb to restart.");

  ctx.session.selectedOnt = ont;
  ctx.session.step = "SELECT_PSB";

  await ctx.editMessageText("⏳ Mengambil data pelanggan (PSB)...");

  try {
    // Fetch Real PSB List
    const { data: psbList } = await api.get("/customer/psb");
    ctx.session.psbList = psbList;

    // Show top 5 PSB
    const buttons = psbList
      .slice(0, 5)
      .map((p: any, i: number) => [
        Markup.button.callback(
          `${p.name.slice(0, 15)} | ${p.pppoe_user}`,
          `psb:${i}`
        ),
      ]);

    await ctx.editMessageText(`👤 *Pilih Pelanggan PSB*\nONT: \`${ont.sn}\``, {
      parse_mode: "Markdown",
      ...Markup.inlineKeyboard([
        ...buttons,
        [Markup.button.callback("❌ Cancel", "cancel")],
      ]),
    });
  } catch (e: any) {
    await ctx.editMessageText(`❌ Failed to fetch PSB: ${e.message}`);
  }
});

// ============================================================
//  👤 4. HANDLE PSB SELECTION -> SELECT MODEM
// ============================================================
bot.action(/^psb:(\d+)$/, async (ctx) => {
  await ctx.answerCbQuery();
  const idx = parseInt(ctx.match[1]);
  const psb = ctx.session.psbList?.[idx];

  if (!psb) return ctx.reply("Session expired.");

  ctx.session.selectedPsb = psb;
  ctx.session.step = "SELECT_MODEM";

  await ctx.editMessageText(
    `📱 *Pilih Tipe Modem*\nUser: ${psb.name}`,
    Markup.inlineKeyboard([
      [Markup.button.callback("1. F609", "modem:F609")],
      [Markup.button.callback("2. F670L", "modem:F670L")],
      [Markup.button.callback("3. C-DATA", "modem:C-DATA")],
    ])
  );
});

// ============================================================
//  💾 5. CONFIRMATION SCREEN
// ============================================================
bot.action(/^modem:(.+)$/, async (ctx) => {
  await ctx.answerCbQuery();
  const modem = ctx.match[1];
  ctx.session.selectedModem = modem;

  const { oltName, selectedOnt: ont, selectedPsb: psb } = ctx.session;

  const msg =
    `✅ *Konfirmasi Config*\n\n` +
    `OLT: \`${oltName}\`\n` +
    `SN: \`${ont.sn}\`\n` +
    `Nama: \`${psb.name}\`\n` +
    `PPPoE: \`${psb.pppoe_user}\`\n` +
    `Modem: \`${modem}\`\n\n` +
    `Eksekusi sekarang?`;

  await ctx.editMessageText(msg, {
    parse_mode: "Markdown",
    ...Markup.inlineKeyboard([
      Markup.button.callback("🚀 YA, EKSEKUSI", "confirm_yes"),
      Markup.button.callback("❌ BATAL", "cancel"),
    ]),
  });
});

// ============================================================
//  🚀 6. EXECUTE CONFIGURATION
// ============================================================
bot.action("confirm_yes", async (ctx) => {
  const { oltName, selectedOnt, selectedPsb, selectedModem } = ctx.session;

  if (!oltName || !selectedOnt) return ctx.reply("Session expired.");

  await ctx.editMessageText("⚙️ Configuring... Please wait.");

  try {
    const payload = {
      interface: selectedOnt.interface || selectedOnt.onu_id,
      sn: selectedOnt.sn,
      username: selectedPsb.pppoe_user,
      package: selectedPsb.paket || "10M",
      modem_type: selectedModem,
    };

    const { data } = await api.post(`/api/olts/${oltName}/configure`, payload);

    await ctx.editMessageText(
      `✅ *SUCCESS*\n\nMessage: ${data.message || "Configured!"}`,
      { parse_mode: "Markdown" }
    );
  } catch (e: any) {
    await ctx.editMessageText(
      `❌ *FAILED*\nError: ${e.response?.data?.detail || e.message}`,
      { parse_mode: "Markdown" }
    );
  }
});

// Global Cancel
bot.action("cancel", async (ctx) => {
  await ctx.answerCbQuery("Cancelled");
  ctx.session = { step: "IDLE" }; // Clear session
  await ctx.editMessageText("🚫 Operation cancelled.");
});

// Start the bot
bot.launch().then(() => {
  console.log("🚀 Telegraf Bot Started!");
  console.log(`API URL: ${API_BASE_URL}`);
});

// Enable graceful stop
process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
