/**
 * Configuration - Environment variable validation with Zod
 */

import { z } from "zod";

// Define schema for environment variables
const envSchema = z.object({
    BOT_TOKEN: z.string().min(1, "BOT_TOKEN is required"),
    API_BASE_URL: z.string().url("API_BASE_URL must be a valid URL"),
});

// Validate environment variables
const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
    console.error("❌ Invalid environment configuration:");
    parsed.error.issues.forEach((issue) => {
        console.error(`  - ${issue.path.join(".")}: ${issue.message}`);
    });
    process.exit(1);
}

// Export validated configuration
export const TELEGRAM_BOT_TOKEN = parsed.data.BOT_TOKEN;
export const API_BASE_URL = parsed.data.API_BASE_URL;
