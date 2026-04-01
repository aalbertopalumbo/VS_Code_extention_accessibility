import * as vscode from 'vscode';
import { Intent } from './intentDetector';

// ---------------------------------------------------------------------------
// TYPES
// ---------------------------------------------------------------------------

export interface HistoryEntry {
    id: string;
    timestamp: string;
    userMessage: string;
    intent: Intent;
    confidence: string;
    htmlSnippet: string;
    botResponse: string;
    startLine: number;   // 1-based line number where the snippet starts in the HTML file
    endLine: number;     // 1-based line number where the snippet ends in the HTML file
}

const HISTORY_KEY = 'vocalTesting.history';

// ---------------------------------------------------------------------------
// PUBLIC API
// ---------------------------------------------------------------------------

export function getHistory(context: vscode.ExtensionContext): HistoryEntry[] {
    return context.globalState.get<HistoryEntry[]>(HISTORY_KEY) ?? [];
}

export async function addEntry(
    context: vscode.ExtensionContext,
    entry: Omit<HistoryEntry, 'id' | 'timestamp'>
): Promise<HistoryEntry> {
    const history = getHistory(context);

    const newEntry: HistoryEntry = {
        id: Date.now().toString(),
        timestamp: new Date().toLocaleString('it-IT'),
        ...entry
    };

    history.push(newEntry);
    await context.globalState.update(HISTORY_KEY, history);
    return newEntry;
}

export async function clearHistory(context: vscode.ExtensionContext): Promise<void> {
    await context.globalState.update(HISTORY_KEY, []);
}