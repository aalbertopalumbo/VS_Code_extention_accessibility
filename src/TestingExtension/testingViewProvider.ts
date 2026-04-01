import * as vscode from 'vscode';
import { detectIntent } from './intentDetector';
import { getHistory, addEntry, clearHistory, HistoryEntry } from './historyManager';

// ---------------------------------------------------------------------------
// HIGHLIGHT DECORATION (to highlight the HTML snippet in the editor)
// ---------------------------------------------------------------------------

const snippetDecoration = vscode.window.createTextEditorDecorationType({
    backgroundColor: 'rgba(80, 150, 255, 0.20)',
    isWholeLine: true,
    overviewRulerColor: 'rgba(80, 150, 255, 0.8)',
    overviewRulerLane: vscode.OverviewRulerLane.Right,
});

function highlightSnippet(snippet: string) {
    const editor = vscode.window.activeTextEditor;
    if (!editor || !snippet) { return; }

    const fullText = editor.document.getText();
    const index = fullText.indexOf(snippet.trim());
    if (index === -1) { return; }

    const startPos = editor.document.positionAt(index);
    const endPos = editor.document.positionAt(index + snippet.trim().length);
    const range = new vscode.Range(startPos, endPos);

    editor.setDecorations(snippetDecoration, [range]);
    editor.revealRange(range, vscode.TextEditorRevealType.InCenterIfOutsideViewport);
}

function clearHighlight() {
    const editor = vscode.window.activeTextEditor;
    if (editor) { editor.setDecorations(snippetDecoration, []); }
}

// ---------------------------------------------------------------------------
// GROQ RESPONSE GENERATOR
// ---------------------------------------------------------------------------

async function askGroq(
    userMessage: string,
    intent: string,
    htmlCode: string
): Promise<{ botResponse: string; htmlSnippet: string }> {

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
        return {
            botResponse: 'Error: Groq API key not found. Please check your .env file.',
            htmlSnippet: ''
        };
    }

    let intentInstruction = '';
    if (intent === 'DESCRIBE') {
        intentInstruction = `The user wants a description of the page or a part of it.
Respond as a voice assistant would: describe the page structure (presence of menus, sections, headings, links, main content).
Example: "You are on the home page of Wikipedia. There are three sections: A, B, C. A navigation menu is present."`;
    } else if (intent === 'NAVIGATE') {
        intentInstruction = `The user wants to navigate to a link on the page.
Find the relevant link in the HTML and respond as a voice assistant would.
Example: "Navigating to About Us. The link points to /about."`;
    } else if (intent === 'READ') {
        intentInstruction = `The user wants you to read the text content of a specific element.
Find the relevant paragraph, heading, or text element and read it aloud as a voice assistant would.
Example: "Reading the first paragraph: Welcome to our website..."`;
    }

    const systemPrompt = `You are a voice assistant that helps test the vocal interaction of a web page under development.
You must respond as if you were a screen reader or voice assistant speaking to a blind user.

${intentInstruction}

IMPORTANT: Respond with ONLY a valid JSON object — no markdown, no explanation, no code fences.
Use this exact schema:
{
  "response": "<your voice assistant response to the user>",
  "snippet": "<the exact portion of HTML code you used to generate the response>"
}`;

    try {
        const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'llama-3.3-70b-versatile',
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: `User message: ${userMessage}\n\nHTML code:\n${htmlCode}` }
                ],
                max_tokens: 1024,
                temperature: 0.2
            })
        });

        const data = await res.json() as any;
        const text = (data.choices?.[0]?.message?.content || '').trim();
        const clean = text.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim();

        let parsed: { response: string; snippet: string } = { response: '', snippet: '' };
        try {
            parsed = JSON.parse(clean);
        } catch {
            return { botResponse: text, htmlSnippet: '' };
        }

        return {
            botResponse: parsed.response || '',
            htmlSnippet: parsed.snippet || ''
        };

    } catch (err: any) {
        return {
            botResponse: `Error calling Groq: ${err.message}`,
            htmlSnippet: ''
        };
    }
}

// ---------------------------------------------------------------------------
// TESTING VIEW PROVIDER
// ---------------------------------------------------------------------------

export class TestingViewProvider implements vscode.WebviewViewProvider {

    public static readonly viewType = 'testing';

    private _view?: vscode.WebviewView;

    constructor(
        private readonly _extensionUri: vscode.Uri,
        private readonly _context: vscode.ExtensionContext
    ) {}

    public resolveWebviewView(
        webviewView: vscode.WebviewView,
        _context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken
    ) {
        this._view = webviewView;

        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [this._extensionUri]
        };

        const styleUri = webviewView.webview.asWebviewUri(
            vscode.Uri.joinPath(this._extensionUri, 'css', 'styles.css')
        );

        const history = getHistory(this._context);
        webviewView.webview.html = this.getWebviewContent(styleUri, history);

        webviewView.webview.onDidReceiveMessage(async (message) => {
            if (message.command === 'sendMessage') {
                await this.handleUserMessage(message.text, webviewView.webview);
            }
            if (message.command === 'clearHistory') {
                await clearHistory(this._context);
                webviewView.webview.postMessage({ command: 'historyCleared' });
            }
            if (message.command === 'highlightSnippet') {
                highlightSnippet(message.snippet);
            }
            if (message.command === 'clearHighlight') {
                clearHighlight();
            }
        });
    }

    private async handleUserMessage(userMessage: string, webview: vscode.Webview) {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            webview.postMessage({
                command: 'error',
                text: 'No HTML file open in the editor. Please open the file you want to test.'
            });
            return;
        }
        const htmlCode = editor.document.getText();

        const intentResult = await detectIntent(userMessage);

        if (intentResult.intent === 'UNKNOWN') {
            webview.postMessage({
                command: 'error',
                text: 'I could not understand your request. Try: "describe the page", "navigate to...", or "read the paragraph".'
            });
            return;
        }

        const { botResponse, htmlSnippet } = await askGroq(
            userMessage,
            intentResult.intent,
            htmlCode
        );

        const entry = await addEntry(this._context, {
            userMessage,
            intent: intentResult.intent,
            confidence: intentResult.confidence,
            htmlSnippet,
            botResponse
        });

        webview.postMessage({ command: 'newEntry', entry });
    }

    private getWebviewContent(styleUri: vscode.Uri, history: HistoryEntry[]): string {
        const historyJson = JSON.stringify(history)
        .replace(/\\/g, '\\\\')
        .replace(/`/g, '\\`')
        .replace(/<\/script>/gi, '<\\/script>');

        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link rel="stylesheet" href="${styleUri}">
    <title>Vocal Testing</title>
    <style>
        * { box-sizing: border-box; }

        body { margin: 0; padding: 0; font-family: var(--vscode-font-family); font-size: 13px; color: var(--vscode-foreground); }

        .chat-container { display: flex; flex-direction: column; height: 100vh; padding: 10px; gap: 8px; }

        h2 { margin: 0; font-size: 15px; font-weight: 600; padding-bottom: 6px; border-bottom: 1px solid var(--vscode-panel-border); }

        /* ---- ENTRY CARD ---- */
        .chat-history { flex: 1; overflow-y: auto; display: flex; flex-direction: column; gap: 10px; padding-right: 2px; }

        .entry {
            border: 1px solid var(--vscode-panel-border);
            border-radius: 8px;
            overflow: hidden;
            background: var(--vscode-sideBar-background);
        }

        .entry-header {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 8px 10px;
            background: var(--vscode-sideBarSectionHeader-background);
            border-bottom: 1px solid var(--vscode-panel-border);
        }

        .entry-user-msg {
            font-weight: 600;
            font-size: 13px;
            color: var(--vscode-textLink-foreground);
            flex: 1;
        }

        .intent-badge {
            font-size: 10px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            padding: 2px 8px;
            border-radius: 10px;
            white-space: nowrap;
        }
        .badge-DESCRIBE { background: #1e4d78; color: #7ec8f7; }
        .badge-NAVIGATE { background: #2d4a1e; color: #8fca6b; }
        .badge-READ     { background: #4a2d1e; color: #f0a868; }

        .confidence-tag {
            font-size: 10px;
            color: var(--vscode-descriptionForeground);
            white-space: nowrap;
        }

        .entry-body { padding: 10px; display: flex; flex-direction: column; gap: 8px; }

        /* ---- SECTION LABELS ---- */
        .section-label {
            font-size: 10px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.6px;
            color: var(--vscode-descriptionForeground);
            margin-bottom: 3px;
        }

        /* ---- BOT RESPONSE ---- */
        .bot-response {
            background: var(--vscode-textBlockQuote-background);
            border-left: 3px solid var(--vscode-textLink-foreground);
            border-radius: 0 4px 4px 0;
            padding: 8px 10px;
            line-height: 1.6;
            font-size: 13px;
        }

        /* ---- HTML SNIPPET ---- */
        .snippet-wrapper { position: relative; }

        .snippet-box {
            background: var(--vscode-textCodeBlock-background, #1e1e1e);
            border: 1px solid var(--vscode-panel-border);
            border-radius: 4px;
            padding: 8px 10px;
            font-family: var(--vscode-editor-font-family, monospace);
            font-size: 11px;
            line-height: 1.5;
            white-space: pre-wrap;
            word-break: break-all;
            max-height: 140px;
            overflow-y: auto;
            color: var(--vscode-editor-foreground, #d4d4d4);
        }

        .highlight-btn {
            position: absolute;
            top: 4px;
            right: 4px;
            font-size: 10px;
            padding: 2px 7px;
            background: var(--vscode-button-secondaryBackground, #3a3a3a);
            color: var(--vscode-button-secondaryForeground, #ccc);
            border: 1px solid var(--vscode-panel-border);
            border-radius: 4px;
            cursor: pointer;
        }
        .highlight-btn:hover { background: var(--vscode-button-secondaryHoverBackground, #4a4a4a); }

        .entry-timestamp {
            font-size: 10px;
            color: var(--vscode-descriptionForeground);
            text-align: right;
        }

        /* ---- INPUT AREA ---- */
        .input-area { display: flex; flex-direction: column; gap: 6px; }

        .input-row { display: flex; gap: 6px; }

        #user-input {
            flex: 1;
            padding: 7px 10px;
            font-size: 13px;
            background: var(--vscode-input-background);
            color: var(--vscode-input-foreground);
            border: 1px solid var(--vscode-input-border);
            border-radius: 4px;
            outline: none;
        }
        #user-input:focus { border-color: var(--vscode-focusBorder); }

        #send-btn {
            padding: 7px 14px;
            background: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 13px;
            font-weight: 500;
        }
        #send-btn:hover { background: var(--vscode-button-hoverBackground); }

        #clear-btn {
            width: 100%;
            padding: 6px;
            background: transparent;
            color: var(--vscode-errorForeground);
            border: 1px solid var(--vscode-errorForeground);
            border-radius: 4px;
            cursor: pointer;
            font-size: 12px;
            opacity: 0.8;
        }
        #clear-btn:hover { opacity: 1; background: rgba(255,80,80,0.08); }

        /* ---- STATUS / ERROR ---- */
        #status { min-height: 20px; }
        .loading { color: var(--vscode-descriptionForeground); font-size: 12px; font-style: italic; }
        .error-msg {
            color: var(--vscode-errorForeground);
            font-size: 12px;
            background: rgba(255,80,80,0.08);
            border: 1px solid var(--vscode-errorForeground);
            border-radius: 4px;
            padding: 6px 8px;
        }
    </style>
</head>
<body>
<div class="chat-container">

    <h2>🎙 Vocal Testing</h2>

    <div class="chat-history" id="chat-history"></div>

    <div id="status"></div>

    <div class="input-area">
        <div class="input-row">
            <input type="text" id="user-input" placeholder="e.g. descrivi la pagina, leggi il paragrafo..." />
            <button id="send-btn">Send</button>
        </div>
        <button id="clear-btn">🗑 Clear history</button>
    </div>
</div>

<script>
    const vscode = acquireVsCodeApi();
    const historyEl = document.getElementById('chat-history');
    const statusEl  = document.getElementById('status');
    const input     = document.getElementById('user-input');

    const initialHistory = ${historyJson};
    initialHistory.forEach(entry => renderEntry(entry));

    document.getElementById('send-btn').addEventListener('click', sendMessage);
    input.addEventListener('keydown', e => { if (e.key === 'Enter') { sendMessage(); } });

    document.getElementById('clear-btn').addEventListener('click', () => {
        vscode.postMessage({ command: 'clearHistory' });
    });

    function sendMessage() {
        const text = input.value.trim();
        if (!text) { return; }
        input.value = '';
        statusEl.innerHTML = '<div class="loading">⏳ Analysing request, please wait...</div>';
        vscode.postMessage({ command: 'sendMessage', text });
    }

    window.addEventListener('message', event => {
        const msg = event.data;
        statusEl.innerHTML = '';

        if (msg.command === 'newEntry')      { renderEntry(msg.entry); }
        if (msg.command === 'historyCleared') { historyEl.innerHTML = ''; }
        if (msg.command === 'error') {
            statusEl.innerHTML = '<div class="error-msg">⚠ ' + escHtml(msg.text) + '</div>';
        }
    });

    function renderEntry(entry) {
        const div = document.createElement('div');
        div.className = 'entry';

        // Format bot response: replace ". " with ".\n" for readability
        const formattedResponse = entry.botResponse
            .replace(/\. ([A-Z])/g, '.\n$1')
            .replace(/\. (La |Il |Un |Una |I |Gli |Le |C'è |Ci sono )/g, '.\n$1');

        // Pretty-print the HTML snippet
        const prettySnippet = formatHtml(entry.htmlSnippet || '');

        const badgeClass = 'badge-' + entry.intent;

        div.innerHTML =
            '<div class="entry-header">' +
                '<span class="entry-user-msg">' + escHtml(entry.userMessage) + '</span>' +
                '<span class="intent-badge ' + badgeClass + '">' + escHtml(entry.intent) + '</span>' +
                '<span class="confidence-tag">via ' + escHtml(entry.confidence) + '</span>' +
            '</div>' +
            '<div class="entry-body">' +
                '<div>' +
                    '<div class="section-label">💬 Chatbot response</div>' +
                    '<div class="bot-response">' + escHtml(formattedResponse) + '</div>' +
                '</div>' +
                '<div>' +
                    '<div class="section-label">🔍 HTML snippet used</div>' +
                    '<div class="snippet-wrapper">' +
                        '<pre class="snippet-box">' + escHtml(prettySnippet || '—') + '</pre>' +
                        (entry.htmlSnippet
                            ? '<button class="highlight-btn" data-snippet="' + escAttr(entry.htmlSnippet) + '">Highlight in editor</button>'
                            : '') +
                    '</div>' +
                '</div>' +
                '<div class="entry-timestamp">' + escHtml(entry.timestamp) + '</div>' +
            '</div>';

        // Highlight button: show snippet in editor on click
        const btn = div.querySelector('.highlight-btn');
        if (btn) {
            btn.addEventListener('click', () => {
                vscode.postMessage({ command: 'highlightSnippet', snippet: entry.htmlSnippet });
                setTimeout(() => vscode.postMessage({ command: 'clearHighlight' }), 5000);
            });
        }

        historyEl.appendChild(div);
        historyEl.scrollTop = historyEl.scrollHeight;
    }

    // Basic HTML pretty-printer: adds newlines after tags
    function formatHtml(html) {
        return html
            .replace(/></g, '>\\n<')
            .replace(/^\\n/, '')
            .trim();
    }

    function escHtml(str) {
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/\\n/g, '\\n');
    }

    function escAttr(str) {
        return String(str).replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }
</script>
</body>
</html>`;
    }
}