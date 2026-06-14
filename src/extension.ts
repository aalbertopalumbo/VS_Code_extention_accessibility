// Main file of the Accessibility Assistant extension.
// It adds two panels to the editor sidebar:
//   "Documentation": shows the accessibility guidelines as searchable cards.
//   "Analysis": sends the open HTML file to the Gemini AI model, lists the
//   violations it finds and lets the user apply or undo each fix

import * as path from 'path';
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as dotenv from 'dotenv'; // loads the Gemini API key from a .env file


// The "Documentation" panel: reads the guidelines from a Markdown file and
// shows them as collapsible, searchable cards. It can also open and highlight
// one specific guideline when the Analysis panel asks for it
class DocumentationViewProvider implements vscode.WebviewViewProvider {

    public static readonly viewType = 'documentation';
    private _view?: vscode.WebviewView;

    constructor(private readonly _extensionUri: vscode.Uri) {
        console.log('DocumentationViewProvider initialized with extension URI:'); //DEBUG
    }

    // Brings the Documentation panel to the front and tells its web page to
    // open and highlight the guideline whose title is passed in. Called when
    // the user clicks a violation in the Analysis panel
    public revealGuideline(title: string) {
        if (this._view) {
            this._view.show?.(true);
            this._view.webview.postMessage({ command: 'revealGuideline', title: title.toLowerCase() });
        }
    }

    // Builds the panel's content the first time it is opened. It reads the
    // Markdown guidelines file, splits it into one section per guideline,
    // converts each section to HTML, and renders them as collapsible cards
    public async resolveWebviewView(
        webviewView: vscode.WebviewView,
        _context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken
    ) {
        this._view = webviewView;
        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [this._extensionUri]
        };

        // get the path to the CSS file and the markdown documentation
        const styleUri = webviewView.webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'css', 'styles.css'));
        const docPath = vscode.Uri.joinPath(this._extensionUri, 'css', 'Web_Design_guidelines.md');

        // read the markdown file and convert it to HTML
        const markdownContent = fs.readFileSync(docPath.fsPath, 'utf-8');
        const { marked } = await import('marked');
        const tokens = marked.lexer(markdownContent); //lexer divides the markdown in token (titles, paragraphs, code pieces...)
        
        // Divide tokens into sections, one per guideline
        const sections: { title: string; html: string }[] = []; //each element of the array contains title (of the guideline) and html (the content of the guideline in HTML)
        let currentTitle = ''; //variable that is the title we are analysing 
        let currentTokens: any[] = []; //array filled with tokens of the current guideline

        for (const token of tokens) {
            const isDetailsHeading = token.type === 'html' && token.raw.includes('<details'); //for the 3 first guidelines: HTML token which contains <details>
            const isMarkdownHeading = token.type === 'heading' && token.depth === 3; //heading type token with ### (4-12)

            if (isDetailsHeading || isMarkdownHeading) {
                if (currentTitle !== '') {
                    sections.push({
                        title: currentTitle,
                        html: marked.parser(currentTokens as any)
                    });
                }
                if (isDetailsHeading) {
                    const titleMatch = token.raw.match(/<h3[^>]*>(.*?)<\/h3>/s); //regex, more info https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_expressions
                    currentTitle = titleMatch ? titleMatch[1].trim() : 'Guideline';
                    currentTokens = [];
                } else {
                    currentTitle = token.text;
                    currentTokens = [];
                }
            } else {
                currentTokens.push(token); //if currentTokens isn't a title
            }
        }

        // Push last section
        if (currentTitle) {
            sections.push({
                title: currentTitle,
                html: marked.parser(currentTokens as any)
            });
        }

        const htmlContent = sections.map(s => `
        <details class="guideline-card" data-title="${s.title.toLowerCase().replace(/['"]/g, '')}">
        <summary class="guideline-header">${s.title}</summary>
        <div class="guideline-body">${s.html.replace(/<details[^>]*>[\s\S]*?<\/summary>/g, '').replace(/<\/details>/g, '')}</div>
        </details>      
        `).join('');
        webviewView.webview.html = this.getWebviewContent(webviewView.webview, styleUri, htmlContent as string);
        console.log('Documentation view resolved');
    }

    // Returns the full HTML page of the Documentation panel. It embeds the
    // guideline cards plus a small script that powers the live search box and
    // reacts to the "revealGuideline" message coming from the Analysis panel
    private getWebviewContent(webview: vscode.Webview, styleUri: vscode.Uri, htmlContent: string): string {

    return `<!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <link rel="stylesheet" href="${styleUri}">
        <title>Documentation</title>
    </head>
    
    <script>
    document.addEventListener('DOMContentLoaded', () => {                   //HTML has to be loaded
        const searchBar = document.getElementById('search-bar');            //Takes the input in the search-bar
        
        searchBar.addEventListener('input', () => {                         //Listen the event input
            const query = searchBar.value.toLowerCase();                    //the typed text is converted to lowercase
            const cards = document.querySelectorAll('.guideline-card');     //Takes the card of the HTML
            cards.forEach(card => {                                         
                const title = card.getAttribute('data-title');              //Takes the title of the card
                const body = card.querySelector('.guideline-body').textContent.toLowerCase();
                if (title.includes(query) || body.includes(query)) {        //if the title contains the input of the search-bar the card remains visible, otherwise is hidden
                    card.style.display = '';
                } else {
                    card.style.display = 'none';
                }
            });
        });

        window.addEventListener('message', event => {
            const message = event.data;
            if (message.command === 'revealGuideline') {
                const query = message.title.trim().toLowerCase();
                const cards = document.querySelectorAll('.guideline-card');

                document.getElementById('search-bar').value = '';
                cards.forEach(card => { card.style.display = ''; });

                cards.forEach(card => {
                    const title = card.getAttribute('data-title');
                    const normalize = s => s.toLowerCase().replace(/['"]/g, '').trim();
                    const q = normalize(query);
                    const t = normalize(title);
                    const queryMatch = q === t ||
                        t.includes(q) ||
                        q.includes(t) ||
                        (q.split(' ').length > 1 && q.split(' ').every(w => t.includes(w)));
                    if (queryMatch) {
                        card.open = true;
                        card.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        card.style.transition = '';
                        card.style.backgroundColor = 'rgba(255, 255, 0, 0.20)';
                        setTimeout(() => {
                            card.style.transition = 'background-color 1.5s ease';
                            card.style.backgroundColor = '';
                        }, 2000);
                    } else {
                        card.open = false;
                    }
                });
            }
        });
    });
    </script>

    <body>
    <div class ="container">
        <h1>Documentation</h1>
        <input type="text" id="search-bar" placeholder="Type to search guidelines...">
        <div id="guidelines-content">
            ${htmlContent}
        </div>
    </div>
    </body>

    </html>`;
    
    }
}

// The "Analysis" panel: sends the open HTML file to Gemini with the guidelines, shows the violations it returns as cards, and applies or undoes
// the suggested fixes in the editor
class AnalysisViewProvider implements vscode.WebviewViewProvider {

    public static readonly viewType = 'analysis';

    // Extra highlights created during an "Accept All"/"Undo All" run, plus the timer that clears every highlight after a few seconds
    private _bulkDecorations: vscode.TextEditorDecorationType[] = [];
    private _clearTimeout?: NodeJS.Timeout;

    // Concurrency guards for an analysis in progress:
    //  _abortController acts as a "lock": while it exists, a new
    //  analysis cannot start. _cancelled is raised when the user cancels, so a late reply from Gemini can be ignored
    private _abortController?: AbortController;
    private _cancelled = false;

    // Visual style used to mark removed/original lines in the editor
    private readonly _removedDecoration = vscode.window.createTextEditorDecorationType({
        backgroundColor: 'rgba(255, 80, 80, 0.25)',
        isWholeLine: true,
        overviewRulerColor: 'rgba(255, 80, 80, 0.8)',
        overviewRulerLane: vscode.OverviewRulerLane.Right,
    });

    // Visual style used to mark added/applied lines in the editor
    private readonly _addedDecoration = vscode.window.createTextEditorDecorationType({
        backgroundColor: 'rgba(80, 200, 80, 0.25)',
        isWholeLine: true,
        overviewRulerColor: 'rgba(80, 200, 80, 0.8)',
        overviewRulerLane: vscode.OverviewRulerLane.Right,
    });

    constructor(
        private readonly _extensionUri: vscode.Uri,
        private readonly _context: vscode.ExtensionContext,
        private readonly _docProvider: DocumentationViewProvider
    ) {}

    // Removes every highlight from the editor
    private clearDecorations() {
        this._bulkDecorations.forEach(deco => deco.dispose());
        this._bulkDecorations = [];

        const editor = vscode.window.activeTextEditor;
        if (editor) {
            editor.setDecorations(this._removedDecoration, []);
            editor.setDecorations(this._addedDecoration, []);
        }
    }

    // Finds the given snippet in the active file, scrolls to it and paints it red
    // Used to preview the violation the user is hovering
    private highlightOriginal(original: string) {
        const editor = vscode.window.activeTextEditor;
        if (!editor) { return; }

        const fullText = editor.document.getText();
        const index = fullText.indexOf(original);
        if (index === -1) { return; }

        const startPos = editor.document.positionAt(index);
        const endPos = editor.document.positionAt(index + original.length);
        const range = new vscode.Range(startPos, endPos);

        editor.revealRange(range, vscode.TextEditorRevealType.InCenterIfOutsideViewport);
        editor.setDecorations(this._removedDecoration, [range]);
        editor.setDecorations(this._addedDecoration, []);
    }


    // Runs one analysis: it locks so two can't run at once, checks the API key and that a file is open, sends the file plus the guidelines to Gemini
    // asking for a JSON list of violations, then parses that list and hands it to the panel. If the user cancels in the meantime, the reply is thrown away
    private async runGeminiAnalysis(webview: vscode.Webview) {
    // If a lock is already held, an analysis is in progress: do nothing
    if (this._abortController) {
        return;
    }

    this._cancelled = false;   // reset the cancel flag
    this._abortController = new AbortController();   // acquire the lock

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        vscode.window.showErrorMessage('Gemini API key is not set.');
        this._abortController = undefined;
        return;
    }

    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        webview.postMessage({ command: 'analysisError', error: 'No file open to analyse.' });
        this._abortController = undefined;
        return;
    }

    // Gather the two inputs for the model: the code to analyse and the guidelines
    const code = editor.document.getText();
    const docPath = vscode.Uri.joinPath(this._extensionUri, 'css', 'Web_Design_guidelines.md');
    const documentation = fs.readFileSync(docPath.fsPath, 'utf-8');

    try {
        const { GoogleGenAI } = await import('@google/genai');
        const genAI = new GoogleGenAI({ apiKey });

        // Ask Gemini to return only a JSON array of violations following a schema
        // The "original" field must be copied literally, otherwise the text replacement in the editor won't find it
        const response = await genAI.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `You are an expert code assistant specialized in conversational web browsing.
            You provide your suggestions based on the documentation provided and nothing else.
            Make is so you can't generate two suggestions overlapping on the same lines.
            You generate the analysis based on this format:
            1. Title of the guideline violated
            2. Rationale: explain why you are proposing this suggestion based on the guidelines present in the documentation
            3. Suggestion: shown in a diff format

            IMPORTANT: Respond with ONLY a valid JSON array — no markdown, no explanation, no code fences.
            Each element must follow this exact schema:
            {
                "title": "<exact title of the guideline violated, as written in the documentation>",
                "rationale": "<why this code violates the guideline>",
                "original": "<the exact lines of code containing the violation>",
                "suggested": "<the corrected version of those lines>"
            }

            CRITICAL: The "original" field must be copied character by character from the code below.
            Do not paraphrase, reformat, or modify it in any way.
            Preserve all whitespace, newlines, and indentation exactly as they appear.
            If the original field does not match exactly, the tool will break.
            If no violations are found, return an empty array: []

            === DOCUMENTATION ===
            ${documentation}

            === CODE TO ANALYSE ===
            ${code}`
        });

        // If the user cancelled gemini response while gemini was answering, ignore the answer
        if (this._cancelled) {
            return;
        }

        // Keep only the JSON array, from the first '[' to the last ']'. This tolerates extra text or markdown fences the model may add around it
        const text = (response.text || '').trim();
        const start = text.indexOf('[');
        const end = text.lastIndexOf(']');
        if (start === -1 || end === -1) {
            webview.postMessage({ command: 'analysisError', error: 'Could not parse Gemini response.' });
            return;
        }
        const clean = text.slice(start, end + 1);

        // Parse the JSON, on any failure fall back to "no violations"
        let violations = [];
        try {
            violations = JSON.parse(clean);
            if (!Array.isArray(violations)) { violations = []; }
        } catch {
            webview.postMessage({ command: 'analysisError', error: 'Could not parse Gemini response.' });
            return;
        }

        webview.postMessage({ command: 'analysisResult', violations });

    } catch (err: any) {
        // If the user cancelled, the error is expected: stay silent
        if (this._cancelled) {
            return;
        }
        webview.postMessage({ command: 'analysisError', error: err.message });
    } finally {
        this._abortController = undefined; // release the lock in every case
    }
}

    // Builds the Analysis panel's page and wires up the messages it sends back
    // The handler is the single entry point for every user action in the panel (run, cancel, hover, accept, undo, open guideline)
    public resolveWebviewView(
        webviewView: vscode.WebviewView,
        _context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken
    ) {
        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [this._extensionUri]
        };

        const styleUri = webviewView.webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'css', 'styles.css'));

        webviewView.webview.html = this.getWebviewContent(webviewView.webview, styleUri);
        console.log('Analysis view resolved');

        // Sends the messages sent by the panel's web page
        webviewView.webview.onDidReceiveMessage(async (message) => {
            // "Run Analysis" button: start a new Gemini analysis
            if (message.command === 'runAnalysis') {
                await this.runGeminiAnalysis(webviewView.webview);
            }

            // "Cancel" button: raise the cancel flag, release the lock and tell the panel to reset
            if (message.command === 'cancelAnalysis') {
                if (this._abortController) {
                    this._cancelled = true;
                    this._abortController = undefined;
                    webviewView.webview.postMessage({ command: 'analysisCancelled' });
    }
}

            // Mouse hovers on a violation card: highlight that snippet in the editor
            if (message.command === 'highlightOriginal') {
                const editor = vscode.window.activeTextEditor;
                if (!editor) { return; }
                let original = message.original.replace(/\\n/g, '\n').replace(/\\t/g, '\t');
                const eol = editor.document.eol === vscode.EndOfLine.CRLF ? '\r\n' : '\n';
                original = original.replace(/\r?\n/g, eol);
                this.highlightOriginal(original);
            }

            // Mouse leaves a card: remove the highlight
            if (message.command === 'clearHighlight') {
                this.clearDecorations();
            }

            // Click on a violation title: ask the Documentation panel to open it
            if (message.command === 'revealGuideline') {
                this._docProvider.revealGuideline(message.title);
            }

            // "Accept": replace the original snippet with the suggested one in the editor, then briefly highlight the inserted lines in green
            if (message.command === 'acceptSuggestion') {
                const editor = vscode.window.activeTextEditor;
                if (!editor) { return; }

                const document = editor.document;
                const fullText = document.getText();
                const eol = document.eol === vscode.EndOfLine.CRLF ? '\r\n' : '\n';

                let searchStringOriginal = message.original.replace(/\\n/g, '\n').replace(/\\t/g, '\t');
                searchStringOriginal = searchStringOriginal.replace(/\r?\n/g, eol);

                let searchStringSuggested = message.suggested.replace(/\\n/g, '\n').replace(/\\t/g, '\t');
                searchStringSuggested = searchStringSuggested.replace(/\r?\n/g, eol);

                // Locate the snippet to replace, abort if it is not found exactly
                const index = fullText.indexOf(searchStringOriginal);
                if (index === -1) {
                    vscode.window.showErrorMessage('Could not find the original code in the file.');
                    return;
                }

                // Replace that text range with the suggested code
                const startPos = document.positionAt(index);
                const endPos = document.positionAt(index + searchStringOriginal.length);
                const range = new vscode.Range(startPos, endPos);
                const edit = new vscode.WorkspaceEdit();
                edit.replace(document.uri, range, searchStringSuggested);
                await vscode.workspace.applyEdit(edit);

                const newStartPos = editor.document.positionAt(index);
                const newEndPos = editor.document.positionAt(index + searchStringSuggested.length);
                const newRange = new vscode.Range(newStartPos, newEndPos);

                // For a single Accept we scroll to the change and highlight it
                // (doesn't work in Accept All because it would make a mess)
                if (!message.isBulk) {
                    this.clearDecorations();
                    editor.setDecorations(this._addedDecoration, [newRange]);
                    editor.revealRange(newRange, vscode.TextEditorRevealType.InCenterIfOutsideViewport);
                } else {
                    const bulkDeco = vscode.window.createTextEditorDecorationType({
                        backgroundColor: 'rgba(80, 200, 80, 0.25)', isWholeLine: true,
                        overviewRulerColor: 'rgba(80, 200, 80, 0.8)', overviewRulerLane: vscode.OverviewRulerLane.Right
                    });
                    editor.setDecorations(bulkDeco, [newRange]);
                    this._bulkDecorations.push(bulkDeco);
                }

                // Keep the highlights visible for 10s, restarting the timer on
                // each new change so they all disappear at the same moment
                if (this._clearTimeout) { clearTimeout(this._clearTimeout); }
                this._clearTimeout = setTimeout(() => this.clearDecorations(), 10000);

                webviewView.webview.postMessage({
                    command: 'suggestionAccepted',
                    cardId: message.cardId,
                    original: message.original,   
                    suggested: message.suggested   
                });

                vscode.window.showInformationMessage('Substitution applied successfully!');
            }

            // "Undo": it finds the suggested code currently in the file and puts the original snippet back
            if (message.command === 'undoSuggestion') {
                const editor = vscode.window.activeTextEditor;
                if (!editor) { return; }

                const document = editor.document;
                const fullText = document.getText();
                const eol = document.eol === vscode.EndOfLine.CRLF ? '\r\n' : '\n';

                let searchStringSuggested = message.suggested.replace(/\\n/g, '\n').replace(/\\t/g, '\t');
                searchStringSuggested = searchStringSuggested.replace(/\r?\n/g, eol);

                let searchStringOriginal = message.original.replace(/\\n/g, '\n').replace(/\\t/g, '\t');
                searchStringOriginal = searchStringOriginal.replace(/\r?\n/g, eol);

                const index = fullText.indexOf(searchStringSuggested);
                if (index === -1) {
                    vscode.window.showErrorMessage('Could not find the suggested code to undo.');
                    return;
                }

                const startPos = document.positionAt(index);
                const endPos = document.positionAt(index + searchStringSuggested.length);
                const range = new vscode.Range(startPos, endPos);
                const edit = new vscode.WorkspaceEdit();
                edit.replace(document.uri, range, searchStringOriginal);
                await vscode.workspace.applyEdit(edit);

                const restoredStartPos = editor.document.positionAt(index);
                const restoredEndPos = editor.document.positionAt(index + searchStringOriginal.length);
                const restoredRange = new vscode.Range(restoredStartPos, restoredEndPos);

                // Same as Accept: scroll and highlight for a single Undo,
                // but doen't scroll in undo all
                if (!message.isBulk) {
                    this.clearDecorations();
                    editor.setDecorations(this._removedDecoration, [restoredRange]);
                    editor.revealRange(restoredRange, vscode.TextEditorRevealType.InCenterIfOutsideViewport);
                } else {
                    const bulkDeco = vscode.window.createTextEditorDecorationType({
                        backgroundColor: 'rgba(255, 80, 80, 0.25)', isWholeLine: true,
                        overviewRulerColor: 'rgba(255, 80, 80, 0.8)', overviewRulerLane: vscode.OverviewRulerLane.Right
                    });
                    editor.setDecorations(bulkDeco, [restoredRange]);
                    this._bulkDecorations.push(bulkDeco);
                }

                if (this._clearTimeout) { clearTimeout(this._clearTimeout); }
                this._clearTimeout = setTimeout(() => this.clearDecorations(), 10000);

                webviewView.webview.postMessage({
                    command: 'suggestionUndone',
                    cardId: message.cardId,
                    original: message.original, 
                    suggested: message.suggested
                });

                vscode.window.showInformationMessage('Substitution undone successfully!');
            }
        });
    }

    // Returns the full HTML page of the Analysis panel: the Run/Cancel buttons,
    // the results area, the History section, and the script that builds the violation cards and reacts to the backend's messages
    private getWebviewContent(webview: vscode.Webview, styleUri: vscode.Uri): string {

    return `<!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <link rel="stylesheet" href="${styleUri}">
        <title>Analysis</title>
        
    </head>
    <body>
    <div class="container">
        <h1>Analysis</h1>
        <p>Code analysis tools and results will appear here.</p>
        <div class="sticky-buttons" style="display: flex; gap: 10px;">
            <button id="run-analysis">Run Analysis</button>
            <button id="cancel-analysis">Cancel</button>
            <button id="accept-all" style="display: none;">Accept All</button>
            <button id="undo-all" style="display: none;">Undo All</button>
        </div>
        <div id="status"></div>
        <div id="results"></div>

		<details class="history-section">
			<summary>History</summary>
			<div id="history-list">
				<em>No actions taken yet.</em>
			</div>
		</details>


    </div>

    <script>
    // This script runs inside the panel's web page. It cannot access the editor
    // directly: it asks the extension to act by calling vscode.postMessage(...) and updates the UI when the extension answers
    const vscode = acquireVsCodeApi();
    let cardCounter = 0;       // gives each violation card a unique id
    let _analysisInterval;     // timer for the animated "Running analysis..." dots
    let isBulkMode = false;    // true while an "Accept All"/"Undo All" run is going

    // Adds one entry (with its diff) to the History section, newest on top.
    function addHistoryEntry(action, title, original, suggested) {
        const historySection = document.querySelector('.history-section');
        const historyList = document.getElementById('history-list');
        
        if (historyList.querySelector('em')) {
            historyList.innerHTML = '';
        }
        const entry = document.createElement('div');
        entry.className = 'history-entry';

        const time = new Date().toLocaleTimeString();
        const actionClass = action === 'Applied' ? 'history-action-accepted' : 'history-action-undone';

        let diffHtml = '';
        if (original && suggested) {
            const removedLines = original.split('\\n')
                .map(line => '<span class="diff-removed">- ' + escHtml(line) + '</span>')
                .join('');
            const addedLines = suggested.split('\\n')
                .map(line => '<span class="diff-added">+ ' + escHtml(line) + '</span>')
                .join('');
            diffHtml = '<div class="history-diff diff-block">' + removedLines + addedLines + '</div>';
        }

        if (diffHtml) {
            entry.innerHTML = '<details class="history-item-details">' +
                              '<summary class="history-header">' + 
                              '<span class="history-time">[' + time + ']</span> ' +
                              '<span class="' + actionClass + '">' + action + '</span>: ' + escHtml(title) +
                              '</summary>' + 
                              diffHtml + 
                              '</details>';
        } else {
            entry.innerHTML = '<div class="history-header">' + 
                              '<span class="history-time">[' + time + ']</span> ' +
                              '<span class="' + actionClass + '">' + action + '</span>: ' + escHtml(title) +
                              '</div>';
        }
        historyList.prepend(entry);
    }

    const runBtn = document.getElementById('run-analysis');
    const cancelBtn = document.getElementById('cancel-analysis');
    const acceptAllBtn = document.getElementById('accept-all');
    const undoAllBtn = document.getElementById('undo-all');
    const statusEl = document.getElementById('status');
    const resultsEl = document.getElementById('results');

    // Brings the UI back to idle: stop the animation, show "Run", hide "Cancel"
    function resetUIState() {
        clearInterval(_analysisInterval);
        statusEl.textContent = '';
        runBtn.style.display = 'block';
        cancelBtn.style.display = 'none';
        acceptAllBtn.style.display = 'none';
        undoAllBtn.style.display = 'none';
    }

    // "Run Analysis" click: clear old results, animate the status text and ask the extension to start the analysis
    runBtn.addEventListener('click', () => {
        resultsEl.innerHTML = '';
        
        runBtn.style.display = 'none';
        cancelBtn.style.display = 'block';

        let dots = 0;
        statusEl.textContent = 'Running analysis, please wait.';
        _analysisInterval = setInterval(() => {
            dots = (dots + 1) % 3;
            statusEl.textContent = 'Running analysis, please wait' + '.'.repeat(dots + 1);
        }, 500);

        vscode.postMessage({ command: 'runAnalysis' });
    });

    cancelBtn.addEventListener('click', () => {
        vscode.postMessage({ command: 'cancelAnalysis' });
        statusEl.textContent = 'Cancelling...';
    });

    // "Accept All": click every card's Accept button one after another. isBulkMode tells the backend not to scroll on each fix
    // when done we switch to the "Undo All" button
    acceptAllBtn.addEventListener('click', async () => {
        isBulkMode = true;
        const acceptButtons = document.querySelectorAll('.accept-btn');
        for (let i = 0; i < acceptButtons.length; i++) {
            acceptButtons[i].click();
            await new Promise(r => setTimeout(r, 150));
        }
        isBulkMode = false;
        acceptAllBtn.style.display = 'none';
        undoAllBtn.style.display = 'block';
    });

    // "Undo All": the same in reverse, reverting every applied suggestion
    undoAllBtn.addEventListener('click', async () => {
        isBulkMode = true;
        const undoButtons = document.querySelectorAll('.undo-btn');
        for (let i = 0; i < undoButtons.length; i++) {
            undoButtons[i].click();
            await new Promise(r => setTimeout(r, 150));
        }
        isBulkMode = false;
        undoAllBtn.style.display = 'none';
        acceptAllBtn.style.display = 'block';
    });

    // Reacts to the messages sent back by the extension and updates the UI
    window.addEventListener('message', event => {
        const message = event.data;

        // These three outcomes all end an analysis, so reset the buttons first
        if (['analysisResult', 'analysisError', 'analysisCancelled'].includes(message.command)) {
            resetUIState();
        }

        if (message.command === 'analysisCancelled') {
            resultsEl.innerHTML = '<p style="color: var(--vscode-errorForeground);">Analysis cancelled by user.</p>';
            return;
        }

        if (message.command === 'analysisResult') {
            if (!message.violations || message.violations.length === 0) {
                resultsEl.innerHTML = '<p>No violations found!</p>';
                return;
            }

            // Header with the number of violations found
            const countHeader = document.createElement('h3');
            countHeader.className = 'violations-count-header';
            countHeader.textContent = message.violations.length + (message.violations.length === 1 ? ' violation found' : ' violations found');
            resultsEl.appendChild(countHeader);

            // Build one card per violation: title, rationale, diff and an Accept button
            message.violations.forEach(v => {
                const cardId = 'card-' + (cardCounter++);
                const card = document.createElement('div');
                card.className = 'violation-card';
                card.id = cardId;

                const removedLines = v.original.split('\\n')
                    .map(line => '<span class="diff-removed">- ' + escHtml(line) + '</span>').join('');
                const addedLines = v.suggested.split('\\n')
                    .map(line => '<span class="diff-added">+ ' + escHtml(line) + '</span>').join('');
                
                card.innerHTML =
                    '<div class="violation-label">Rule Violated</div>' +
                    '<div class="violation-title" style="cursor: pointer; color: var(--vscode-textLink-foreground); text-decoration: underline;" title="Click to open documentation">' + escHtml(v.title) + '</div>' +
                    '<div class="violation-label">Rationale</div>' +
                    '<div class="violation-rationale">' + escHtml(v.rationale) + '</div>' +
                    '<div class="violation-label">Suggestion</div>' +
                    '<div class="diff-block">' + removedLines + addedLines + '</div>' +
                    '<button class="accept-btn">Accept</button>';

                resultsEl.appendChild(card);

                card.querySelector('.violation-title').addEventListener('click', () => {
                    vscode.postMessage({ command: 'revealGuideline', title: v.title });
                });

                card.addEventListener('mouseenter', () => {
                    vscode.postMessage({ command: 'highlightOriginal', original: v.original });
                });

                card.addEventListener('mouseleave', () => {
                    vscode.postMessage({ command: 'clearHighlight' });
                });
                
                card.querySelector('.accept-btn').addEventListener('click', (e) => {
                    e.stopPropagation();
                    vscode.postMessage({
                        command: 'acceptSuggestion',
                        original: v.original,
                        suggested: v.suggested,
                        cardId: cardId,
                        isBulk: isBulkMode
                    });
                });
            });

            // With at least one violation, offer the bulk "Accept All" action
            if (message.violations.length > 0) {
                acceptAllBtn.style.display = 'block';
                undoAllBtn.style.display = 'none';
            }

        // A fix was applied: swap the "Accept" button for an "Applied" badge and an "Undo" button, and log the action in the history
        } else if (message.command === 'suggestionAccepted') {
            const card = document.getElementById(message.cardId);
            if (card) {
                const btn = card.querySelector('.accept-btn');
                if (btn) { btn.remove(); }
                
                const badge = document.createElement('span');
                badge.className = 'accepted-badge';
                badge.textContent = '✓ Applied';
                card.appendChild(badge);
                
                const undoBtn = document.createElement('button');
                undoBtn.className = 'undo-btn';
                undoBtn.textContent = 'Undo';
                card.appendChild(undoBtn);

                undoBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    vscode.postMessage({
                        command: 'undoSuggestion',
                        original: message.original,
                        suggested: message.suggested,
                        cardId: message.cardId,
                        isBulk: isBulkMode
                    });
                });

                
				// Update the history
				const titleEl = card.querySelector('.violation-title');
				const titleText = titleEl ? titleEl.textContent : 'Code modification';
				addHistoryEntry('Applied', titleText, message.original, message.suggested);
            }

        // A fix was reverted: remove the badge/Undo and restore the "Accept" button so the suggestion can be applied again
        } else if (message.command === 'suggestionUndone') {
            const card = document.getElementById(message.cardId);
            if (card) {
                const badge = card.querySelector('.accepted-badge');
                const undoBtn = card.querySelector('.undo-btn');
                if (badge) { badge.remove(); }
                if (undoBtn) { undoBtn.remove(); }
                
                const acceptBtn = document.createElement('button');
                acceptBtn.className = 'accept-btn';
                acceptBtn.textContent = 'Accept';
                card.appendChild(acceptBtn);

                acceptBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    vscode.postMessage({
                        command: 'acceptSuggestion',
                        original: message.original,
                        suggested: message.suggested,
                        cardId: message.cardId,
                        isBulk: isBulkMode
                    });
                });

                // Update the history
				const titleEl = card.querySelector('.violation-title');
				const titleText = titleEl ? titleEl.textContent : 'Code modification';
				addHistoryEntry('Undone', titleText, message.original, message.suggested);
            }

        } else if (message.command === 'analysisError') {
            document.getElementById('results').textContent = 'Error: ' + message.error;
        }
    });

    // Escapes &, <, >, " so text coming from the model can be put into the page safely
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




// Entry point of the extension, run once by VS Code when it starts up. It loads
// the API key from the .env file and registers the two sidebar panels so that
// VS Code can build them when the user opens them.
export function activate(context: vscode.ExtensionContext) {

    dotenv.config({ path: path.join(context.extensionPath, '.env') });



    // Use the console to output diagnostic information (console.log) and errors (console.error)
    // This line of code will only be executed once when your extension is activated
    console.log('Congratulations, your extension "accessibility-assistant" is now active!');

    // Register webview view providers for both sidebar views
    const docProvider = new DocumentationViewProvider(context.extensionUri);
    console.log('Registering DocumentationViewProvider with view type:');
    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider(DocumentationViewProvider.viewType, docProvider)
    );

    const analysisProvider = new AnalysisViewProvider(context.extensionUri, context, docProvider);
    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider(AnalysisViewProvider.viewType, analysisProvider)
    );




    // The command has been defined in the package.json file
    // Now provide the implementation of the command with registerCommand
    // The commandId parameter must match the command field in package.json
    const disposable = vscode.commands.registerCommand('accessibility-assistant.helloWorld', () => {
        // The code you place here will be executed every time your command is executed
        // Display a message box to the user
        vscode.window.showInformationMessage('Hi there! Accessibility Assistant is here to help you. Let\'s get started!');
        var panel = vscode.window.createWebviewPanel(
            'accessibilityAssistant', // Identifies the type of the webview. Used internally
            'Accessibility Assistant', // Title of the panel displayed to the user
            vscode.ViewColumn.One, // Editor column to show the new webview panel in.
            {
                enableScripts: true, // Enable scripts in the webview
                localResourceRoots: [vscode.Uri.joinPath(context.extensionUri, 'css')] // Restrict the webview to only load resources from the `css` directory
            }
        );

        //
        const onDiskPath = vscode.Uri.file(path.join(context.extensionPath, 'css', 'styles.css'));
        const cssUri = panel.webview.asWebviewUri(onDiskPath);
        
        panel.webview.html = getWebviewContent(cssUri);
    });



    context.subscriptions.push(disposable);

    console.log('Extension activation complete');
}

// HTML of the simple welcome page shown by the "Hello World" command
function getWebviewContent(cssUri: vscode.Uri) {
    return `<!DOCTYPE html>
    <html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link rel="stylesheet" href="${cssUri}">
    <title>Accessibility Assistant</title>
</head>

<body>
    <h1>Welcome to Accessibility Assistant!</h1>
    <p>This extension is designed to help you improve the accessibility of your code. 
    It provides tools and resources to identify and fix accessibility issues in your projects.</p>
    <p>To get started, simply run the command "Check Accessibility" from the command palette. 
    The extension will analyze your code and provide feedback on any accessibility issues it finds, along with suggestions for how to fix them.</p>
    <p>Whether you're a seasoned developer or just starting out, 
    Accessibility Assistant is here to help you create more inclusive and accessible applications. Let's work together to make the web a better place for everyone!</p>
    <script>
        console.log('Webview loaded');
    </script>
</body>

</html>`;
}



// Called by VS Code when the extension is shut down. Nothing to clean up here
export function deactivate() {}