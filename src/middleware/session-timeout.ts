/**
 * Session Timeout Middleware
 * Checks if session has expired (2 minutes of inactivity)
 * Notifies user and resets session if expired
 */

import type { MyContext, SessionData } from "../types/session";
import { mainMenuKeyboard } from "../keyboards";

// Session timeout in milliseconds (2 minutes)
const SESSION_TIMEOUT_MS = 2 * 60 * 1000;

/**
 * Default session state
 */
function getDefaultSession(): SessionData {
  return {
    step: "IDLE",
    page: 0,
    lastActivity: Date.now(),
  };
}

/**
 * Check if session has timed out
 */
function isSessionExpired(session: SessionData): boolean {
  if (!session.lastActivity) return false;
  if (session.step === "IDLE") return false;
  
  const elapsed = Date.now() - session.lastActivity;
  return elapsed > SESSION_TIMEOUT_MS;
}

/**
 * Reset session to default state
 */
function resetSession(session: SessionData): void {
  Object.assign(session, getDefaultSession());
}

/**
 * Session timeout middleware
 * - Checks if session expired and notifies user
 * - Updates lastActivity timestamp on each interaction
 */
export async function sessionTimeoutMiddleware(
  ctx: MyContext,
  next: () => Promise<void>
): Promise<void> {
  // Check if session expired
  if (isSessionExpired(ctx.session)) {
    const wasInFlow = ctx.session.step !== "IDLE";
    
    // Reset session
    resetSession(ctx.session);
    
    // Notify user if they were in an active flow
    if (wasInFlow) {
      await ctx.reply(
        "Sesi anda telah berakhir karena tidak ada aktivitas selama 2 menit.",
        mainMenuKeyboard()
      );
    }
  }
  
  // Update last activity timestamp
  ctx.session.lastActivity = Date.now();
  
  // Continue to next middleware/handler
  await next();
}
