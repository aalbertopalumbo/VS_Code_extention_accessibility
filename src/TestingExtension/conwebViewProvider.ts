import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

// ---------------------------------------------------------------------------
// TYPES — mirrors the ConWeb API response structure
// ---------------------------------------------------------------------------

interface ConWebBaseResult {
    user_intent: string;
    assistant_message: string;
    next_actions?: string[];
}

interface ConWebDescribeResult extends ConWebBaseResult {
    user_intent: 'describe';
    describe_text: string;
}

interface ConWebReadResult extends ConWebBaseResult {
    user_intent: 'read';
    read_text: string;
}

interface ConWebNavigateResult extends ConWebBaseResult {
    user_intent: 'navigate';
    html_link_id: string;
    query_selector: string;
}

interface ConWebFillResult extends ConWebBaseResult {
    user_intent: 'fill';
    form_info: {
        form_name: string;
        form_html: string;
        fields_list: {
            cnt_id: string;
            input_html: string;
            label_name: string;
            query_selector: string;
            user_value: string | null;
        }[];
    };
}

type ConWebResult =
    | ConWebDescribeResult
    | ConWebReadResult
    | ConWebNavigateResult
    | ConWebFillResult;

interface ConWebResponse {
    type: string;
    interact_result: ConWebResult;
}

// ---------------------------------------------------------------------------
// RESPONSE FORMATTER
// ---------------------------------------------------------------------------

/**
 * Concatenates assistant_message + content text + next_actions
 * exactly as described in the ConWeb spec.
 */
function formatConWebMessage(result: ConWebResult): string {
    let message = result.assistant_message + '\n\n';

    if (result.user_intent === 'describe') {
        message += (result as ConWebDescribeResult).describe_text + '\n\n';
    } else if (result.user_intent === 'read') {
        message += (result as ConWebReadResult).read_text + '\n\n';
    } else if (result.user_intent === 'navigate') {
        return message.trim(); // navigate has no next_actions per spec
    } else if (result.user_intent === 'fill') {
        const fill = result as ConWebFillResult;
        message += `Form: ${fill.form_info.form_name}\n`;
        message += `Campi trovati: ${fill.form_info.fields_list.length}\n\n`;
    }

    if (result.next_actions && result.next_actions.length > 0) {
        message += 'Prossime azioni disponibili:\n';
        message += result.next_actions.map(a => `• ${a}`).join('\n');
    }

    return message.trim();
}

// ---------------------------------------------------------------------------
// PARSE DETAIL — extracts extra fields for navigate and fill
// ---------------------------------------------------------------------------

function parseDetail(result: ConWebResult): object {
    if (result.user_intent === 'navigate') {
        const nav = result as ConWebNavigateResult;
        return { html_link_id: nav.html_link_id, query_selector: nav.query_selector };
    }
    if (result.user_intent === 'fill') {
        const fill = result as ConWebFillResult;
        return {
            form_name: fill.form_info.form_name,
            fields_count: fill.form_info.fields_list.length,
            fields: fill.form_info.fields_list.map(f => ({
                label: f.label_name,
                selector: f.query_selector,
                value: f.user_value
            }))
        };
    }
    return {};
}

// ---------------------------------------------------------------------------
// CONWEB VIEW PROVIDER
// ---------------------------------------------------------------------------

export class ConWebViewProvider implements vscode.WebviewViewProvider {

    public static readonly viewType = 'conweb';

    constructor(
        private readonly _extensionUri: vscode.Uri,
        private readonly _context: vscode.ExtensionContext
    ) {}

    public resolveWebviewView(
        webviewView: vscode.WebviewView,
        _context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken
    ) {
        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [this._extensionUri]
        };

        const styleUri = webviewView.webview.asWebviewUri(
            vscode.Uri.joinPath(this._extensionUri, 'css', 'styles.css')
        );

        webviewView.webview.html = this.getWebviewContent(styleUri);

        // Render mock entries as soon as the panel is visible
        webviewView.onDidChangeVisibility(() => {
            if (webviewView.visible) {
                this.renderMockEntries(webviewView.webview);
            }
        });

        // Also render immediately on first load
        setTimeout(() => this.renderMockEntries(webviewView.webview), 300);

        // Listen for messages — input disabled until real endpoint is available
        webviewView.webview.onDidReceiveMessage(async (message) => {
            if (message.command === 'clearHistory') {
                webviewView.webview.postMessage({ command: 'historyCleared' });
            }
            // sendMessage intentionally not handled — endpoint not yet available
        });
    }

    /**
     * Reads mockResponses.json and sends each entry to the WebView for rendering.
     * This simulates having already received the responses from ConWeb.
     * When the real endpoint is available, this method will be replaced by actual API calls.
     */
    private renderMockEntries(webview: vscode.Webview) {
        const mockPath = path.join(
            this._extensionUri.fsPath,
            'src', 'TestingExtension', 'mockResponses.json'
        );

        let responses: ConWebResponse[] = [];
        try {
            const raw = fs.readFileSync(mockPath, 'utf-8');
            responses = JSON.parse(raw);
        } catch (err) {
            vscode.window.showErrorMessage('ConWeb: impossibile leggere mockResponses.json');
            return;
        }

        responses.forEach((response, index) => {
            const result = response.interact_result;
            const formattedMessage = formatConWebMessage(result);
            const detail = parseDetail(result);

            webview.postMessage({
                command: 'newEntry',
                entry: {
                    id: String(index + 1),
                    timestamp: new Date().toLocaleString('it-IT'),
                    userMessage: getMockUserMessage(result.user_intent),
                    intent: result.user_intent,
                    formattedMessage,
                    detail,
                    isMock: true
                }
            });
        });
    }

    private getWebviewContent(styleUri: vscode.Uri): string {
        return `<!DOCTYPE html>
<html lang="it">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link rel="stylesheet" href="${styleUri}">
    <title>ConWeb Testing</title>
    <style>
        * { box-sizing: border-box; }
        body { margin: 0; padding: 0; font-family: var(--vscode-font-family); font-size: 13px; color: var(--vscode-foreground); }

        .chat-container { display: flex; flex-direction: column; height: 100vh; padding: 10px; gap: 8px; overflow: hidden; }

        h2 { margin: 0; font-size: 15px; font-weight: 600; padding-bottom: 6px; border-bottom: 1px solid var(--vscode-panel-border); }

        .subtitle { font-size: 11px; color: var(--vscode-descriptionForeground); margin-bottom: 4px; }

        .mock-badge { display: inline-block; font-size: 9px; font-weight: 600; text-transform: uppercase; background: #5a3e00; color: #f0c060; border-radius: 4px; padding: 1px 6px; margin-left: 6px; vertical-align: middle; }

        .chat-history { flex: 1; min-height: 0; overflow-y: auto; display: flex; flex-direction: column; gap: 10px; padding-right: 2px; }

        .entry { border: 1px solid var(--vscode-panel-border); border-radius: 8px; overflow: hidden; background: var(--vscode-sideBar-background); flex-shrink: 0; }

        .entry-header { display: flex; align-items: center; gap: 8px; padding: 8px 10px; background: var(--vscode-sideBarSectionHeader-background); border-bottom: 1px solid var(--vscode-panel-border); }

        .entry-user-msg { font-weight: 600; font-size: 13px; color: var(--vscode-textLink-foreground); flex: 1; word-break: break-word; }

        .intent-badge { font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; padding: 2px 8px; border-radius: 10px; white-space: nowrap; flex-shrink: 0; }
        .badge-describe { background: #1e4d78; color: #7ec8f7; }
        .badge-navigate { background: #2d4a1e; color: #8fca6b; }
        .badge-read     { background: #4a2d1e; color: #f0a868; }
        .badge-fill     { background: #3a1e5a; color: #c8a0f0; }

        .entry-body { padding: 10px; display: flex; flex-direction: column; gap: 8px; }

        .section-label { font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.6px; color: var(--vscode-descriptionForeground); margin-bottom: 3px; }

        .bot-response { background: var(--vscode-textBlockQuote-background); border-left: 3px solid var(--vscode-textLink-foreground); border-radius: 0 4px 4px 0; padding: 8px 10px; line-height: 1.6; font-size: 13px; white-space: pre-wrap; word-wrap: break-word; }

        .detail-block { background: var(--vscode-editor-background); border: 1px solid var(--vscode-panel-border); border-radius: 4px; padding: 8px 10px; font-size: 12px; }

        .detail-row { display: flex; gap: 8px; margin-bottom: 4px; font-size: 11px; }
        .detail-key { color: var(--vscode-descriptionForeground); min-width: 80px; flex-shrink: 0; }
        .detail-val { font-family: var(--vscode-editor-font-family, monospace); word-break: break-all; }

        .fields-table { width: 100%; border-collapse: collapse; font-size: 11px; margin-top: 6px; }
        .fields-table th { text-align: left; color: var(--vscode-descriptionForeground); font-weight: 600; padding: 3px 6px; border-bottom: 1px solid var(--vscode-panel-border); }
        .fields-table td { padding: 3px 6px; border-bottom: 1px solid var(--vscode-panel-border, #333); vertical-align: top; }
        .fields-table tr:last-child td { border-bottom: none; }

        .entry-timestamp { font-size: 10px; color: var(--vscode-descriptionForeground); text-align: right; }

        .input-area { display: flex; flex-direction: column; gap: 6px; flex-shrink: 0; }
        .input-row { display: flex; gap: 6px; }

        #user-input { flex: 1; padding: 7px 10px; font-size: 13px; background: var(--vscode-input-background); color: var(--vscode-input-foreground); border: 1px solid var(--vscode-input-border); border-radius: 4px; outline: none; opacity: 0.5; cursor: not-allowed; }

        #send-btn { padding: 7px 14px; background: var(--vscode-button-background); color: var(--vscode-button-foreground); border: none; border-radius: 4px; cursor: not-allowed; font-size: 13px; font-weight: 500; opacity: 0.5; }

        #clear-btn { width: 100%; padding: 6px; background: transparent; color: var(--vscode-errorForeground); border: 1px solid var(--vscode-errorForeground); border-radius: 4px; cursor: pointer; font-size: 12px; opacity: 0.8; }
        #clear-btn:hover { opacity: 1; background: rgba(255,80,80,0.08); }
    </style>
</head>
<body>
<div class="chat-container">

    <h2>🌐 ConWeb Testing</h2>
    <div class="subtitle">Parsing test — mock responses from mockResponses.json</div>

    <div class="chat-history" id="chat-history"></div>

    <div class="input-area">
        <div class="input-row">
            <input type="text" id="user-input" placeholder="Disponibile con endpoint reale..." disabled />
            <button id="send-btn" disabled>Send</button>
        </div>
        <button id="clear-btn">🗑 Clear</button>
    </div>
</div>

<script>
    const vscode = acquireVsCodeApi();
    const historyEl = document.getElementById('chat-history');

    document.getElementById('clear-btn').addEventListener('click', () => {
        historyEl.innerHTML = '';
        vscode.postMessage({ command: 'clearHistory' });
    });

    window.addEventListener('message', event => {
        const msg = event.data;
        if (msg.command === 'newEntry')       { renderEntry(msg.entry); }
        if (msg.command === 'historyCleared') { historyEl.innerHTML = ''; }
    });

    function renderEntry(entry) {
        const div = document.createElement('div');
        div.className = 'entry';

        const badgeClass = 'badge-' + entry.intent;
        const mockTag = entry.isMock ? '<span class="mock-badge">mock</span>' : '';

        let detailHtml = '';
        if (entry.intent === 'navigate' && entry.detail && entry.detail.html_link_id) {
            detailHtml =
                '<div class="section-label">🔗 Link detail</div>' +
                '<div class="detail-block">' +
                    '<div class="detail-row"><span class="detail-key">Link ID</span><span class="detail-val">' + escHtml(entry.detail.html_link_id) + '</span></div>' +
                    '<div class="detail-row"><span class="detail-key">Selector</span><span class="detail-val">' + escHtml(entry.detail.query_selector) + '</span></div>' +
                '</div>';
        }

        if (entry.intent === 'fill' && entry.detail && entry.detail.fields) {
            const rows = entry.detail.fields.map(f =>
                '<tr>' +
                    '<td>' + escHtml(f.label || '') + '</td>' +
                    '<td>' + escHtml(f.selector || '') + '</td>' +
                    '<td>' + escHtml(f.value !== null && f.value !== undefined ? String(f.value) : '—') + '</td>' +
                '</tr>'
            ).join('');

            detailHtml =
                '<div class="section-label">📋 Form fields (' + entry.detail.fields_count + ')</div>' +
                '<div class="detail-block">' +
                    '<div style="font-size:11px;margin-bottom:6px;color:var(--vscode-descriptionForeground);">' + escHtml(entry.detail.form_name || '') + '</div>' +
                    '<table class="fields-table">' +
                        '<thead><tr><th>Label</th><th>Selector</th><th>Value</th></tr></thead>' +
                        '<tbody>' + rows + '</tbody>' +
                    '</table>' +
                '</div>';
        }

        div.innerHTML =
            '<div class="entry-header">' +
                '<span class="entry-user-msg">' + escHtml(entry.userMessage) + '</span>' +
                '<span class="intent-badge ' + badgeClass + '">' + escHtml(entry.intent) + '</span>' +
                mockTag +
            '</div>' +
            '<div class="entry-body">' +
                '<div>' +
                    '<div class="section-label">💬 ConWeb response</div>' +
                    '<div class="bot-response">' + escHtml(entry.formattedMessage) + '</div>' +
                '</div>' +
                (detailHtml ? '<div>' + detailHtml + '</div>' : '') +
                '<div class="entry-timestamp">' + escHtml(entry.timestamp) + '</div>' +
            '</div>';

        historyEl.appendChild(div);
        historyEl.scrollTop = historyEl.scrollHeight;
    }

    function escHtml(str) {
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }
</script>
</body>
</html>`;
    }
}

// ---------------------------------------------------------------------------
// HELPER — returns a representative user message for each intent
// ---------------------------------------------------------------------------

function getMockUserMessage(intent: string): string {
    switch (intent) {
        case 'describe':  return 'descrivimi la pagina';
        case 'read':      return 'leggimi le notizie';
        case 'navigate':  return 'vai a carta di identità';
        case 'fill':      return 'mi chiamo Andrea Rossi';
        default:          return intent;
    }
}