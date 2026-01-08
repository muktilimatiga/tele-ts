const API_BASE_URL = process.env.API_BASE_URL || "";
const TELEGRAM_BOT_TOKEN = process.env.BOT_TOKEN || "";

if (!TELEGRAM_BOT_TOKEN || !API_BASE_URL) throw new Error("BOT_TOKEN or API_BASE_URL is missing!");

export { API_BASE_URL, TELEGRAM_BOT_TOKEN };
