import type { Telegraf } from "telegraf";
import type { MyContext } from "../types/session";
import { message } from "telegraf/filters";
import { Api } from "../api/api";
import { logError } from "../utils/error-handler";
import { formatError } from "../utils/error-handler";

export function registerOcrHandler(bot: Telegraf<MyContext>) {
    bot.on(message("photo"), async (ctx) => {
        await ctx.reply("⏳ Memulai proses convert image to text...");

        // Get the largest photo (last in array has highest resolution)
        const photos = ctx.message.photo;
        const largestPhoto = photos[photos.length - 1];

        if (!largestPhoto) {
            return ctx.reply("Tidak dapat membaca gambar.");
        }

        try {
            // Get file link from Telegram
            const file = await ctx.telegram.getFile(largestPhoto.file_id);
            const fileUrl = `https://api.telegram.org/file/bot${ctx.telegram.token}/${file.file_path}`;

            // Download the image
            const response = await fetch(fileUrl);
            const imageBuffer = Buffer.from(await response.arrayBuffer());

            // Send to OCR API
            const result = await Api.sendOcr(imageBuffer, file.file_path || "image.jpg");

            if (result) {
                await ctx.reply(`*Hasil OCR:*`, { parse_mode: "Markdown" });
                await ctx.reply(result);
            } else {
                await ctx.reply("Tidak ada teks yang terdeteksi dari gambar.");
            }
        } catch (e: unknown) {
            logError("Ocr", e);
            await ctx.reply(formatError(e));
        }
    });
}