/**
 * Session Store - SQLite-based persistent session storage
 * Uses Bun's built-in SQLite for lightweight persistence
 */

import { Database } from "bun:sqlite";
import type { SessionData } from "../types/session";

// Initialize database
const db = new Database("sessions.db");

// Create sessions table if not exists
db.run(`
  CREATE TABLE IF NOT EXISTS sessions (
    key TEXT PRIMARY KEY,
    data TEXT NOT NULL,
    updated_at INTEGER NOT NULL
  )
`);

// Prepare statements for better performance
const getStmt = db.prepare<{ data: string }, [string]>(
    "SELECT data FROM sessions WHERE key = ?"
);
const setStmt = db.prepare<void, [string, string, number]>(
    "INSERT OR REPLACE INTO sessions (key, data, updated_at) VALUES (?, ?, ?)"
);
const deleteStmt = db.prepare<void, [string]>(
    "DELETE FROM sessions WHERE key = ?"
);

/**
 * SQLite session store compatible with Telegraf session middleware
 */
export const sqliteSessionStore = {
    /**
     * Get session data by key
     */
    get: (key: string): SessionData | undefined => {
        try {
            const row = getStmt.get(key);
            if (row?.data) {
                return JSON.parse(row.data) as SessionData;
            }
            return undefined;
        } catch (e) {
            console.error("[Session] Error reading session:", e);
            return undefined;
        }
    },

    /**
     * Set session data
     */
    set: (key: string, data: SessionData): void => {
        try {
            setStmt.run(key, JSON.stringify(data), Date.now());
        } catch (e) {
            console.error("[Session] Error writing session:", e);
        }
    },

    /**
     * Delete session
     */
    delete: (key: string): void => {
        try {
            deleteStmt.run(key);
        } catch (e) {
            console.error("[Session] Error deleting session:", e);
        }
    },
};

/**
 * Cleanup old sessions (optional maintenance)
 * Call periodically to prevent database bloat
 */
export const cleanupOldSessions = (maxAgeMs: number = 24 * 60 * 60 * 1000) => {
    const cutoff = Date.now() - maxAgeMs;
    db.run("DELETE FROM sessions WHERE updated_at < ?", [cutoff]);
};
