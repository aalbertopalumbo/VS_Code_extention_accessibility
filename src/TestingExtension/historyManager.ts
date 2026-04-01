import * as vscode from 'vscode';
import { Intent } from './intentDetector';

// ---------------------------------------------------------------------------
// TYPES
// ---------------------------------------------------------------------------

// A single exchange between user and chatbot, saved in history
export interface HistoryEntry {
    id: string;             // unique id, used to identify the entry in the UI
    timestamp: string;      // human-readable date and time
    userMessage: string;    // what the user typed
    intent: Intent;         // classified intent
    confidence: string;     // how the intent was detected (keyword / ai / fallback)
    htmlSnippet: string;    // the portion of HTML code used to generate the response
    botResponse: string;    // the chatbot's response
}

// Key used to store the history in VS Code's globalState
const HISTORY_KEY = 'vocalTesting.history';

// ---------------------------------------------------------------------------
// PUBLIC API
// ---------------------------------------------------------------------------

/**
 * Returns the full history array, or an empty array if nothing is stored yet.
 */
export function getHistory(context: vscode.ExtensionContext): HistoryEntry[] {
    return context.globalState.get<HistoryEntry[]>(HISTORY_KEY) ?? [];
}

/**
 * Appends a new entry to the history and persists it.
 */
export async function addEntry(
    context: vscode.ExtensionContext,
    entry: Omit<HistoryEntry, 'id' | 'timestamp'>  // caller does not need to set id/timestamp
): Promise<HistoryEntry> {
    const history = getHistory(context);

    const newEntry: HistoryEntry = {
        id: Date.now().toString(),                          // simple unique id based on timestamp
        timestamp: new Date().toLocaleString('it-IT'),      // e.g. "31/03/2026, 14:23:05"
        ...entry
    };

    history.push(newEntry);
    await context.globalState.update(HISTORY_KEY, history);
    return newEntry;
}

/**
 * Deletes all history entries and persists the empty state.
 */
export async function clearHistory(context: vscode.ExtensionContext): Promise<void> {
    await context.globalState.update(HISTORY_KEY, []);
}