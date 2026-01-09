/**
 * Error Handler Utility
 * Standardized error formatting for user-facing messages
 */

import { AxiosError } from "axios";

/**
 * Format any error into a user-friendly message
 * Extracts API error details when available
 */
export const formatError = (e: unknown): string => {
  if (e instanceof AxiosError && e.response?.data) {
    // Try to extract detail from API response (FastAPI format)
    const data = e.response.data as Record<string, unknown>;
    const detail = data.detail || data.message || data.error;
    if (detail) {
      if (typeof detail === "string") {
        return `❌ API Error: ${detail}`;
      }
      // Handle FastAPI validation errors (array format)
      if (Array.isArray(detail)) {
        const messages = detail.map((d: any) => d.msg || d.message || String(d));
        return `❌ Validation Error: ${messages.join(", ")}`;
      }
    }
    // Fallback to status text
    return `❌ API Error (${e.response.status}): ${e.response.statusText}`;
  }

  if (e instanceof AxiosError) {
    // Network errors, timeouts, etc.
    if (e.code === "ECONNREFUSED") {
      return "❌ Server tidak dapat dihubungi";
    }
    if (e.code === "ETIMEDOUT" || e.code === "ECONNABORTED") {
      return "❌ Request timeout - server tidak merespons";
    }
    return `❌ Network Error: ${e.message}`;
  }

  if (e instanceof Error) {
    return `❌ Error: ${e.message}`;
  }

  return "❌ Unknown error occurred";
};

/**
 * Log error with context (for debugging)
 */
export const logError = (context: string, e: unknown): void => {
  console.error(`[${context}]`, e instanceof Error ? e.message : e);
  if (e instanceof AxiosError && e.response?.data) {
    console.error(`[${context}] Response:`, e.response.data);
  }
};
