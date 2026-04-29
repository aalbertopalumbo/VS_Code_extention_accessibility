import * as vscode from 'vscode';
import { detectIntent } from './intentDetector';

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
// CONWEB API CALL
// ---------------------------------------------------------------------------

const CONWEB_ENDPOINT = ''; // TODO: set real endpoint URL when available

/**
 * Calls the ConWeb "chat" endpoint.
 * When CONWEB_ENDPOINT is empty, returns the exact mock responses
 * provided by the tutor, simulating a real completed API call.
 */
async function callConWeb(
    userMessage: string,
    intent: string,
    htmlCode: string,
    website: string
): Promise<ConWebResponse> {

    // ---- REAL CALL (activated when CONWEB_ENDPOINT is set) ----
    if (CONWEB_ENDPOINT) {
        try {
            const res = await fetch(CONWEB_ENDPOINT, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: userMessage,
                    website,
                    html: htmlCode
                })
            });
            return await res.json() as ConWebResponse;
        } catch (err: any) {
            throw new Error(`ConWeb endpoint error: ${err.message}`);
        }
    }

    // ---- MOCK RESPONSES — exact JSON responses provided by the tutor ----
    await new Promise(r => setTimeout(r, 600)); // simulate network delay

    if (intent === 'DESCRIBE') {
        return {
            type: 'interact',
            interact_result: {
                user_intent: 'describe',
                assistant_message: 'Sto eseguendo la descrizione della pagina.',
                next_actions: [
                    'Posso aiutarti a leggere il testo principale della pagina.',
                    'Vuoi che ti apra una delle sezioni principali come Servizi, Notizie o Amministrazione?',
                    'Posso aiutarti a compilare la barra di ricerca inserendo un termine da cercare.'
                ],
                describe_text: 'La pagina del Comune di Milano si apre con il logo cliccabile in alto, che funge anche da collegamento alla homepage. Subito sotto è presente una barra di ricerca dove puoi inserire un testo e premere il pulsante "Cerca" per trovare informazioni. Segue un menu di navigazione principale con i link: Servizi, Notizie, Amministrazione e un pulsante per espandere la sezione Argomenti.\nNella parte centrale della pagina trovi un annuncio riguardante una mostra storica a Palazzo Marino, con dettagli sugli orari di visita e la possibilità di accedere a una galleria fotografica tramite un link interattivo. Sono presenti anche altri link, come quello per prenotare la visita.\nPiù in basso, c\'è una sezione "Link Utili" con collegamenti rapidi a enti e servizi come Regione Lombardia, ATS Milano, ATM, Milano Ristorazione e altri. Un\'altra sezione offre link per accedere all\'area riservata, privacy, note legali e accessibilità.\nInfine, la pagina propone una sezione "Seguici su" con link ai canali social del Comune di Milano: Facebook, X (Twitter), YouTube, Instagram, Linkedin e Whatsapp.\nLe principali azioni che puoi compiere sono: utilizzare la barra di ricerca, navigare tra le sezioni tramite i menu, accedere ai link utili o ai social, e gestire le impostazioni cookie tramite un apposito pulsante.'
            } as ConWebDescribeResult
        };
    }

    if (intent === 'READ') {
        return {
            type: 'interact',
            interact_result: {
                user_intent: 'read',
                assistant_message: 'Sto leggendo le notizie presenti nella pagina.',
                next_actions: [
                    'Posso aprire il link della Galleria fotografica.',
                    'Posso aprire il link per prenotare la visita all\'iniziativa.',
                    'Posso tornare al menu principale o leggere altre sezioni della pagina.'
                ],
                read_text: 'Ecco le notizie presenti nella pagina:\n- Nell\'ottantesimo anno della Repubblica, esposto nell\'emiciclo di Palazzo Marino anche un baule in legno utilizzato per la raccolta delle schede in uno dei seggi della consultazione referendaria. Ingresso libero su prenotazione nei pomeriggi feriali, dalle 14:30 alle 17.\n- Galleria fotografica (link interattivo)\n- Milano, 20 aprile 2026\nManifesti e documenti delle prime elezioni amministrative milanesi del Dopoguerra, che rappresentarono il primo voto delle donne, e della campagna per il referendum istituzionale del 1946 esposti in Aula consiliare a Palazzo Marino.\n- Nell\'ottantesimo anno della Repubblica, in Consiglio comunale viene allestita una raccolta di materiali contenuti nella Cittadella degli Archivi su due momenti decisivi per Milano e per l\'Italia.'
            } as ConWebReadResult
        };
    }

    if (intent === 'NAVIGATE') {
        return {
            type: 'interact',
            interact_result: {
                user_intent: 'navigate',
                assistant_message: 'Sto aprendo la pagina relativa alla carta d\'identità come richiesto.',
                html_link_id: 'node_446',
                query_selector: '#fragment-e5b91b96-f8d6-1de8-9dd3-8c22c31d0f3c > DIV:nth-child(1) > DIV:nth-child(1) > DIV:nth-child(1) > H3:nth-child(1) > A:nth-child(1)'
            } as ConWebNavigateResult
        };
    }

    if (intent === 'FILL') {
        return {
            type: 'interact',
            interact_result: {
                user_intent: 'fill',
                assistant_message: 'Sto inserendo il nome "Andrea" e il cognome "Rossi" nei campi corrispondenti.',
                next_actions: [
                    'Posso inserire il Codice Fiscale dell\'intestatario (campo obbligatorio, testo).',
                    'Posso inserire il numero di telefono o cellulare dell\'intestatario (campo obbligatorio, solo cifre).',
                    'Posso inserire l\'indirizzo email dell\'intestatario (campo obbligatorio, formato email valido).'
                ],
                form_info: {
                    form_name: 'Richiesta pass per la sosta e la circolazione di persone con disabilità (CUDE - art. 381 DPR 495/1992) - Simulazione IA',
                    form_html: '',
                    fields_list: [
                        { cnt_id: 'node_122', input_html: '', label_name: 'Nome *', query_selector: '#S_5762_NEW_COL0001', user_value: 'Andrea' },
                        { cnt_id: 'node_137', input_html: '', label_name: 'Cognome *', query_selector: '#S_5762_NEW_COL0002', user_value: 'Rossi' },
                        { cnt_id: 'node_152', input_html: '', label_name: 'Codice Fiscale *', query_selector: '#S_5762_NEW_COL0003', user_value: null },
                        { cnt_id: 'node_180', input_html: '', label_name: 'Telefono/Cellulare *', query_selector: '#S_5762_NEW_COL0017', user_value: null },
                        { cnt_id: 'node_195', input_html: '', label_name: 'Email *', query_selector: '#S_5762_NEW_COL0004', user_value: null },
                        { cnt_id: 'node_227', input_html: '', label_name: 'Documento identità FRONTE *', query_selector: '#S_5762_NEW_COL0027_SID', user_value: null },
                        { cnt_id: 'node_244', input_html: '', label_name: 'Documento identità RETRO *', query_selector: '#S_5762_NEW_COL0028_SID', user_value: null },
                        { cnt_id: 'node_273', input_html: '', label_name: 'Fotografia fototessera *', query_selector: '#S_5762_NEW_COL0029_SID', user_value: null },
                        { cnt_id: 'node_282', input_html: '', label_name: 'Salva & Prosegui', query_selector: '#main > DIV:nth-child(1) > DIV:nth-child(2) > INPUT:nth-child(1)', user_value: 'Salva & Prosegui' },
                        { cnt_id: 'node_283', input_html: '', label_name: 'Indietro', query_selector: '#main > DIV:nth-child(1) > DIV:nth-child(2) > INPUT:nth-child(2)', user_value: 'Indietro' }
                    ]
                }
            } as ConWebFillResult
        };
    }

    throw new Error('Intento non riconosciuto dal mock ConWeb.');
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
        // navigate has no next_actions per spec
        return message.trim();
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
// CONWEB VIEW PROVIDER
// ---------------------------------------------------------------------------

export class ConWebViewProvider implements vscode.WebviewViewProvider {

    public static readonly viewType = 'conweb';

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

        webviewView.webview.html = this.getWebviewContent(styleUri);

        webviewView.webview.onDidReceiveMessage(async (message) => {
            if (message.command === 'sendMessage') {
                await this.handleUserMessage(message.text, webviewView.webview);
            }
            if (message.command === 'clearHistory') {
                webviewView.webview.postMessage({ command: 'historyCleared' });
            }
        });
    }

    private async handleUserMessage(userMessage: string, webview: vscode.Webview) {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            webview.postMessage({
                command: 'error',
                text: 'Nessun file HTML aperto nell\'editor. Apri il file che vuoi testare.'
            });
            return;
        }
        const htmlCode = editor.document.getText();
        const website = editor.document.uri.toString();

        const intentResult = await detectIntent(userMessage);

        if (intentResult.intent === 'UNKNOWN') {
            webview.postMessage({
                command: 'error',
                text: 'Intento non riconosciuto. Prova: "descrivi la pagina", "vai a...", "leggi...", "compila il form".'
            });
            return;
        }

        try {
            const response = await callConWeb(userMessage, intentResult.intent, htmlCode, website);
            const result = response.interact_result;
            const formattedMessage = formatConWebMessage(result);

            let detail: object = {};
            if (result.user_intent === 'navigate') {
                const nav = result as ConWebNavigateResult;
                detail = { html_link_id: nav.html_link_id, query_selector: nav.query_selector };
            } else if (result.user_intent === 'fill') {
                const fill = result as ConWebFillResult;
                detail = {
                    form_name: fill.form_info.form_name,
                    fields_count: fill.form_info.fields_list.length,
                    fields: fill.form_info.fields_list.map(f => ({
                        label: f.label_name,
                        selector: f.query_selector,
                        value: f.user_value
                    }))
                };
            }

            webview.postMessage({
                command: 'newEntry',
                entry: {
                    id: Date.now().toString(),
                    timestamp: new Date().toLocaleString('it-IT'),
                    userMessage,
                    intent: result.user_intent,
                    confidence: intentResult.confidence,
                    formattedMessage,
                    detail,
                    isMock: !CONWEB_ENDPOINT
                }
            });

        } catch (err: any) {
            webview.postMessage({
                command: 'error',
                text: `Errore ConWeb: ${err.message}`
            });
        }
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

        .confidence-tag { font-size: 10px; color: var(--vscode-descriptionForeground); white-space: nowrap; flex-shrink: 0; }

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

        #user-input { flex: 1; padding: 7px 10px; font-size: 13px; background: var(--vscode-input-background); color: var(--vscode-input-foreground); border: 1px solid var(--vscode-input-border); border-radius: 4px; outline: none; }
        #user-input:focus { border-color: var(--vscode-focusBorder); }

        #send-btn { padding: 7px 14px; background: var(--vscode-button-background); color: var(--vscode-button-foreground); border: none; border-radius: 4px; cursor: pointer; font-size: 13px; font-weight: 500; }
        #send-btn:hover { background: var(--vscode-button-hoverBackground); }

        #clear-btn { width: 100%; padding: 6px; background: transparent; color: var(--vscode-errorForeground); border: 1px solid var(--vscode-errorForeground); border-radius: 4px; cursor: pointer; font-size: 12px; opacity: 0.8; }
        #clear-btn:hover { opacity: 1; background: rgba(255,80,80,0.08); }

        #status { flex-shrink: 0; min-height: 20px; }
        .loading { color: var(--vscode-descriptionForeground); font-size: 12px; font-style: italic; }
        .error-msg { color: var(--vscode-errorForeground); font-size: 12px; background: rgba(255,80,80,0.08); border: 1px solid var(--vscode-errorForeground); border-radius: 4px; padding: 6px 8px; }
    </style>
</head>
<body>
<div class="chat-container">

    <h2>🌐 ConWeb Testing</h2>

    <div class="chat-history" id="chat-history"></div>

    <div id="status"></div>

    <div class="input-area">
        <div class="input-row">
            <input type="text" id="user-input" placeholder="e.g. descrivimi la pagina, vai a servizi, leggimi le notizie..." />
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

    document.getElementById('send-btn').addEventListener('click', sendMessage);
    input.addEventListener('keydown', e => { if (e.key === 'Enter') { sendMessage(); } });
    document.getElementById('clear-btn').addEventListener('click', () => {
        historyEl.innerHTML = '';
        vscode.postMessage({ command: 'clearHistory' });
    });

    function sendMessage() {
        const text = input.value.trim();
        if (!text) { return; }
        input.value = '';
        statusEl.innerHTML = '<div class="loading">⏳ Chiamata a ConWeb in corso...</div>';
        vscode.postMessage({ command: 'sendMessage', text });
    }

    window.addEventListener('message', event => {
        const msg = event.data;
        statusEl.innerHTML = '';
        if (msg.command === 'newEntry')       { renderEntry(msg.entry); }
        if (msg.command === 'historyCleared') { historyEl.innerHTML = ''; }
        if (msg.command === 'error') {
            statusEl.innerHTML = '<div class="error-msg">⚠ ' + escHtml(msg.text) + '</div>';
        }
    });

    function renderEntry(entry) {
        const div = document.createElement('div');
        div.className = 'entry';

        const badgeClass = 'badge-' + entry.intent;
        const mockTag = entry.isMock ? '<span class="mock-badge">mock</span>' : '';

        let detailHtml = '';
        if (entry.intent === 'navigate' && entry.detail) {
            detailHtml =
                '<div class="section-label">🔗 Link detail</div>' +
                '<div class="detail-block">' +
                    '<div class="detail-row"><span class="detail-key">Link ID</span><span class="detail-val">' + escHtml(entry.detail.html_link_id || '—') + '</span></div>' +
                    '<div class="detail-row"><span class="detail-key">Selector</span><span class="detail-val">' + escHtml(entry.detail.query_selector || '—') + '</span></div>' +
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
                '<span class="confidence-tag">via ' + escHtml(entry.confidence) + '</span>' +
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