"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const path = __importStar(require("path"));
const vscode = __importStar(require("vscode"));
const fs = __importStar(require("fs"));
const dotenv = __importStar(require("dotenv"));
// Import marked for markdown parsing
// WEBVIEW PROVIDER FOR DOCUMENTATION VIEW
class DocumentationViewProvider {
    _extensionUri;
    static viewType = 'documentation'; //type of the sidebar, same of what is written in the JSON
    _view; //variable that contains the webview of the documentation, useful to update the content of the webview without reloading it
    constructor(_extensionUri) {
        this._extensionUri = _extensionUri;
        console.log('DocumentationViewProvider initialized with extension URI:'); //DEBUG
    }
    revealGuideline(title) {
        if (this._view) {
            this._view.show?.(true); // Show the view if it's not visible, but don't take focus
            console.log('revealGuideline called with:', title); // DEBUG
            this._view.webview.postMessage({ command: 'revealGuideline', title: title.toLowerCase() }); //send a message to the webview to reveal the guideline with the given title
        }
    }
    // This method is called when the webview view is resolved
    async resolveWebviewView(webviewView, _context, _token) {
        this._view = webviewView; //save the webview in the variable _view so it can be updated later
        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [this._extensionUri]
        };
        // get the path to the CSS file and the markdown documentation
        const styleUri = webviewView.webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'css', 'styles.css'));
        const docPath = vscode.Uri.joinPath(this._extensionUri, 'css', 'Web_Design_guidelines.md');
        const markdownContent = fs.readFileSync(docPath.fsPath, 'utf-8'); // read the markdown file and convert it to HTML
        const { marked } = await import('marked');
        const tokens = marked.lexer(markdownContent); //lexer divides the markdown in token (titles, paragraphs, code pieces...)
        // Divide tokens into sections, one per guideline
        const sections = []; //each element of the array contains title (of the guideline) and html (the content of the guideline in HTML)
        let currentTitle = ''; //variable that is the title we are analysing 
        let currentTokens = []; //array filled with tokens of the current guideline
        for (const token of tokens) {
            const isDetailsHeading = token.type === 'html' && token.raw.includes('<details'); //for the 3 first guidelines: HTML token which contains <details>
            const isMarkdownHeading = token.type === 'heading' && token.depth === 3; //heading type token with ### (4-12)
            if (isDetailsHeading || isMarkdownHeading) {
                if (currentTitle != '') { //Each time a title is found, the previous section is finished so it's saved in sections. Marked.parser reassemble the tokens
                    sections.push({
                        title: currentTitle,
                        html: marked.parser(currentTokens)
                    });
                }
                if (isDetailsHeading) {
                    const titleMatch = token.raw.match(/<h3[^>]*>(.*?)<\/h3>/s); //regex, more info https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_expressions
                    currentTitle = titleMatch ? titleMatch[1].trim() : 'Guideline'; //trim removes spaces and newlines, titleMatch[0]=='<h3>Keyboard Navigation</h3>', titleMatch[1]=='Keyboard Navigation'
                    currentTokens = [];
                }
                else {
                    currentTitle = token.text;
                    currentTokens = [];
                }
            }
            else {
                currentTokens.push(token); //if currentTokens isn't a title
            }
        }
        // Push last section that isn't saved inside the loop because the loop is closed when the token are finished
        if (currentTitle) {
            sections.push({
                title: currentTitle,
                html: marked.parser(currentTokens)
            });
        }
        const htmlContent = sections.map(s => ` 		<!-- each sections become a HTML string -->
    	<details class="guideline-card" data-title="${s.title.toLowerCase().replace(/['"]/g, '')}">		<!-- data-title is an hidden attribute, toLowercase is useful for the search-bar -->
        <summary class="guideline-header">${s.title}</summary>
        <div class="guideline-body">${s.html.replace(/<details[^>]*>[\s\S]*?<\/summary>/g, '').replace(/<\/details>/g, '')}</div> 
    	</details>		
		`).join('');
        webviewView.webview.html = this.getWebviewContent(webviewView.webview, styleUri, htmlContent);
        console.log('Documentation view resolved');
    }
    getWebviewContent(webview, styleUri, htmlContent) {
        return `<!DOCTYPE html>
	<html lang="en">
	<head>
		<meta charset="UTF-8">
		<meta name="viewport" content="width=device-width, initial-scale=1.0">
		<link rel="stylesheet" href="${styleUri}">
		<title>Documentation</title>
	</head>
	
	<script>
    document.addEventListener('DOMContentLoaded', () => {					//HTML has to be loaded
        const searchBar = document.getElementById('search-bar');    		//Takes the input in the search-bar
        
        searchBar.addEventListener('input', () => {							//Listen the event input
            const query = searchBar.value.toLowerCase();					//the typed text is converted to lowercase
            const cards = document.querySelectorAll('.guideline-card');		//Takes the card of the HTML
			console.log('revealGuideline ricevuto:', query);
            cards.forEach(card => {											
                const title = card.getAttribute('data-title');				//Takes the title of the card
				const body = card.querySelector('.guideline-body').textContent.toLowerCase();
				if (title.includes(query) || body.includes(query)) {
                    card.style.display = '';
                } else {
                    card.style.display = 'none';
                }
            });
        });

	window.addEventListener('message', event => {	//Listen for messages from TypeScript
		const message = event.data;
		if (message.command === 'revealGuideline') {	//If the command is "revealGuideline", the card is opened
			const query = message.title.trim().toLowerCase();	//the title is converted to lowercase and trim for safety
			const cards = document.querySelectorAll('.guideline-card');

			//resets the searchbar
			document.getElementById('search-bar').value = '';
			cards.forEach(card => { card.style.display = ''; }); //makes all the cards visible again
			
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
					card.scrollIntoView({ behavior: 'smooth', block: 'start' }); //scrolls the card
					card.style.transition = '';

					card.style.backgroundColor = 'rgba(255, 255, 0, 0.20)'; //highlight the card in yellow
					setTimeout(() => { 
						card.style.transition = 'background-color 1.5s ease'; //fade out the yellow highlight after 2 seconds
						card.style.backgroundColor = ''; }, 2000); 
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
// WEBVIEW PROVIDER FOR ANALYSIS VIEW
class AnalysisViewProvider {
    _extensionUri;
    _context;
    _docProvider;
    static viewType = 'analysis';
    // Decoration types for highlighting lines in the editor
    _removedDecoration = vscode.window.createTextEditorDecorationType({
        backgroundColor: 'rgba(255, 80, 80, 0.25)',
        isWholeLine: true,
        overviewRulerColor: 'rgba(255, 80, 80, 0.8)',
        overviewRulerLane: vscode.OverviewRulerLane.Right,
    });
    _addedDecoration = vscode.window.createTextEditorDecorationType({
        backgroundColor: 'rgba(80, 200, 80, 0.25)',
        isWholeLine: true,
        overviewRulerColor: 'rgba(80, 200, 80, 0.8)',
        overviewRulerLane: vscode.OverviewRulerLane.Right,
    });
    constructor(_extensionUri, _context, _docProvider) {
        this._extensionUri = _extensionUri;
        this._context = _context;
        this._docProvider = _docProvider;
    }
    // Clears all editor decorations
    clearDecorations() {
        const editor = vscode.window.activeTextEditor;
        if (editor) {
            editor.setDecorations(this._removedDecoration, []);
            editor.setDecorations(this._addedDecoration, []);
        }
    }
    // Highlights the original lines red in the editor so the user can see what will be replaced
    highlightOriginal(original) {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            return;
        }
        const fullText = editor.document.getText();
        const index = fullText.indexOf(original);
        if (index === -1) {
            return;
        }
        const startPos = editor.document.positionAt(index);
        const endPos = editor.document.positionAt(index + original.length);
        const range = new vscode.Range(startPos, endPos);
        // Scroll the editor to make the highlighted region visible
        editor.revealRange(range, vscode.TextEditorRevealType.InCenterIfOutsideViewport);
        editor.setDecorations(this._removedDecoration, [range]);
        editor.setDecorations(this._addedDecoration, []);
    }
    async runGeminiAnalysis(webview) {
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            vscode.window.showErrorMessage('Gemini API key is not set. Please add it to your .env file.');
            return;
        }
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            webview.postMessage({ command: 'analysisError', error: 'No file open to analyse.' });
            return;
        }
        const code = editor.document.getText();
        const docPath = vscode.Uri.joinPath(this._extensionUri, 'css', 'Web_Design_guidelines.md');
        const documentation = fs.readFileSync(docPath.fsPath, 'utf-8');
        try {
            const { GoogleGenAI } = await import('@google/genai');
            const genAI = new GoogleGenAI({ apiKey });
            const response = await genAI.models.generateContent({
                model: 'gemini-3-flash-preview',
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
            const text = (response.text || '').trim(); //trim removes spaces and useless newlines. || '' is a precaution in case response.text==null
            const clean = text.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim(); //replaces ```json and ``` (Alt+96), trim for safety 
            let violations = [];
            try {
                violations = JSON.parse(clean);
                if (!Array.isArray(violations)) {
                    violations = [];
                }
            }
            catch {
                webview.postMessage({ command: 'analysisError', error: 'Could not parse Gemini response.' });
                return;
            }
            webview.postMessage({ command: 'analysisResult', violations });
        }
        catch (err) {
            webview.postMessage({ command: 'analysisError', error: err.message });
        }
    }
    resolveWebviewView(webviewView, _context, _token) {
        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [this._extensionUri]
        };
        const styleUri = webviewView.webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'css', 'styles.css'));
        webviewView.webview.html = this.getWebviewContent(webviewView.webview, styleUri);
        console.log('Analysis view resolved');
        // Listen for messages coming from the webview
        webviewView.webview.onDidReceiveMessage(async (message) => {
            if (message.command === 'runAnalysis') {
                await this.runGeminiAnalysis(webviewView.webview);
            }
            // Highlight the original lines red in the editor when the user hovers/clicks a card
            if (message.command === 'highlightOriginal') {
                const editor = vscode.window.activeTextEditor;
                if (!editor) {
                    return;
                }
                let original = message.original.replace(/\\n/g, '\n').replace(/\\t/g, '\t');
                const eol = editor.document.eol === vscode.EndOfLine.CRLF ? '\r\n' : '\n';
                original = original.replace(/\r?\n/g, eol);
                this.highlightOriginal(original);
                // const original = message.original
                //  .replace(/\\n/g, '\n') //replaces \n with real newlines
                //  .replace(/\\t/g, '\t') //replaces \t with real tabs
                // // .replace(/ +/g, ' '); //replaces multiple spaces with a single space (just in case)
                // this.highlightOriginal(original);
            }
            if (message.command === 'clearHighlight') {
                this.clearDecorations();
            }
            if (message.command === 'revealGuideline') {
                this._docProvider.revealGuideline(message.title);
            }
            if (message.command === 'acceptSuggestion') { //Takes the open document in the editor and search "original" with indexOf
                const editor = vscode.window.activeTextEditor;
                if (!editor) {
                    return;
                }
                const document = editor.document;
                const fullText = document.getText();
                const eol = document.eol === vscode.EndOfLine.CRLF ? '\r\n' : '\n';
                let searchStringOriginal = message.original.replace(/\\n/g, '\n').replace(/\\t/g, '\t');
                searchStringOriginal = searchStringOriginal.replace(/\r?\n/g, eol);
                let searchStringSuggested = message.suggested.replace(/\\n/g, '\n').replace(/\\t/g, '\t');
                searchStringSuggested = searchStringSuggested.replace(/\r?\n/g, eol);
                const index = fullText.indexOf(searchStringOriginal);
                if (index === -1) {
                    vscode.window.showErrorMessage('Could not find the original code in the file.');
                    return;
                }
                const startPos = document.positionAt(index); //Converts numerical index in a position in the document (line and column)
                const endPos = document.positionAt(index + searchStringOriginal.length);
                const range = new vscode.Range(startPos, endPos); //piece of text to substitute
                const edit = new vscode.WorkspaceEdit();
                edit.replace(document.uri, range, searchStringSuggested); //replace the original code with the suggested one
                await vscode.workspace.applyEdit(edit);
                // After applying, briefly highlight the newly inserted lines green,
                // then clear all decorations so the editor goes back to normal.
                const newStartPos = editor.document.positionAt(index);
                const newEndPos = editor.document.positionAt(index + searchStringSuggested.length);
                const newRange = new vscode.Range(newStartPos, newEndPos);
                editor.setDecorations(this._removedDecoration, []);
                editor.setDecorations(this._addedDecoration, [newRange]);
                editor.revealRange(newRange, vscode.TextEditorRevealType.InCenterIfOutsideViewport);
                // Fade the green highlight out after 10 seconds
                setTimeout(() => this.clearDecorations(), 10000);
                // Tell the webview to hide the Accept button for this card
                webviewView.webview.postMessage({ command: 'suggestionAccepted', cardId: message.cardId });
                vscode.window.showInformationMessage('Substitution applied successfully!');
            }
        });
    }
    getWebviewContent(webview, styleUri) {
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
        <div>
            <button id="run-analysis">Run Analysis</button>
        </div>
        <div id="status"></div>
        <div id="results"></div>
    </div>

    <script>
    const vscode = acquireVsCodeApi();
	let cardCounter = 0; // Counter to assign unique IDs to cards
	let _analysisInterval; // Store the interval ID for the animated dots

    document.getElementById('run-analysis').addEventListener('click', () => {
        
        document.getElementById('results').innerHTML = '';

		// Animated dots
		let dots = 0;
		const statusEl = document.getElementById('status');
		statusEl.textContent = 'Running analysis, please wait.';
		const interval = setInterval(() => {
			dots = (dots + 1) % 3;
			statusEl.textContent = 'Running analysis, please wait' + '.'.repeat(dots + 1);
		}, 500);

		// Store interval id so we can clear it when analysis finishes
		_analysisInterval = interval;

        vscode.postMessage({ command: 'runAnalysis' });
    });

    window.addEventListener('message', event => {
        const message = event.data;

		// Stop the dot animation whenever a response arrives
    	clearInterval(_analysisInterval);
		document.getElementById('status').textContent = '';

        if (message.command === 'analysisResult') {
            const results = document.getElementById('results');

            if (!message.violations || message.violations.length === 0) {  //if the message doesn't contain any violations or the size is zero
                results.innerHTML = '<p>No violations found!</p>';
                return;
            }

            message.violations.forEach(v => {   //Build a card for each violation
			    const cardId = 'card-' + (cardCounter++); // Unique ID for the card
                const card = document.createElement('div');
                card.className = 'violation-card';
				card.id = cardId; // Set the ID of the card element

                const removedLines = v.original.split('\\n')
                    .map(line => '<span class="diff-removed">- ' + escHtml(line) + '</span>') 
                    .join('');
                const addedLines = v.suggested.split('\\n')
                    .map(line => '<span class="diff-added">+ ' + escHtml(line) + '</span>')
                    .join('');
				//compose each card with title, rationale and diff
                card.innerHTML =
				'<div class="violation-label">Rule Violated</div>' +
   			    '<div class="violation-title" style="cursor: pointer; color: var(--vscode-textLink-foreground); text-decoration: underline;" title="Click to open documentation">' + escHtml(v.title) + '</div>' +
    		    '<div class="violation-label">Rationale</div>' +
    			'<div class="violation-rationale">' + escHtml(v.rationale) + '</div>' +
    			'<div class="violation-label">Suggestion</div>' +
    			'<div class="diff-block">' + removedLines + addedLines + '</div>' +
    			'<button class="accept-btn">Accept</button>';		//Button implementation
				results.appendChild(card);

				const titleElement = card.querySelector('.violation-title');
				titleElement.addEventListener('click', () => {		//When the title is clicked, the documentation view is opened with the guideline related to the violation
					vscode.postMessage({ command: 'revealGuideline', title: v.title });
				});

				card.addEventListener('mouseenter', () => {
                    vscode.postMessage({ command: 'highlightOriginal', original: v.original });
                });

				card.addEventListener('mouseleave', () => {
    				vscode.postMessage({ command: 'clearHighlight' });
				});

				card.querySelector('.accept-btn').addEventListener('click', (e) => {  		//querySelector finds the button inside each card
				 	e.stopPropagation(); 	// prevent the card click from firing again
    				vscode.postMessage({	//sends a message to TypeScript with the command "acceptSuggestion"
        				command: 'acceptSuggestion',
        				original: v.original,
        				suggested: v.suggested,
						cardId: cardId
    				});
				});
			}); // chiude il forEach
		
		} else if (message.command === 'suggestionAccepted') {
			const card = document.getElementById(message.cardId);
			if (card) {
				const btn = card.querySelector('.accept-btn');
				if (btn) { btn.remove(); }
				// Add a small "Applied" badge so the user knows it's done
				const badge = document.createElement('span');
				badge.className = 'accepted-badge';
				badge.textContent = '✓ Applied';
				card.appendChild(badge);
			}
		

		} else if (message.command === 'analysisError') {
				document.getElementById('results').textContent = 'Error: ' + message.error;
		}
	});

    function escHtml(str) { //useful in order to substitute special characters into their safe equivalents
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
// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
function activate(context) {
    dotenv.config({ path: path.join(context.extensionPath, '.env') }); //put in process.env the API key
    // Use the console to output diagnostic information (console.log) and errors (console.error)
    // This line of code will only be executed once when your extension is activated
    console.log('Congratulations, your extension "accessibility-assistant" is now active!');
    // Register webview view providers for both sidebar views
    const docProvider = new DocumentationViewProvider(context.extensionUri);
    console.log('Registering DocumentationViewProvider with view type:');
    context.subscriptions.push(vscode.window.registerWebviewViewProvider(DocumentationViewProvider.viewType, docProvider));
    const analysisProvider = new AnalysisViewProvider(context.extensionUri, context, docProvider);
    context.subscriptions.push(vscode.window.registerWebviewViewProvider(AnalysisViewProvider.viewType, analysisProvider));
    // The command has been defined in the package.json file
    // Now provide the implementation of the command with registerCommand
    // The commandId parameter must match the command field in package.json
    const disposable = vscode.commands.registerCommand('accessibility-assistant.helloWorld', () => {
        // The code you place here will be executed every time your command is executed
        // Display a message box to the user
        vscode.window.showInformationMessage('Hi there! Accessibility Assistant is here to help you. Let\'s get started!');
        var panel = vscode.window.createWebviewPanel('accessibilityAssistant', // Identifies the type of the webview. Used internally
        'Accessibility Assistant', // Title of the panel displayed to the user
        vscode.ViewColumn.One, // Editor column to show the new webview panel in.
        {
            enableScripts: true, // Enable scripts in the webview
            localResourceRoots: [vscode.Uri.joinPath(context.extensionUri, 'css')] // Restrict the webview to only load resources from the css directory
        });
        //
        const onDiskPath = vscode.Uri.file(path.join(context.extensionPath, 'css', 'styles.css'));
        const cssUri = panel.webview.asWebviewUri(onDiskPath);
        panel.webview.html = getWebviewContent(cssUri);
    });
    context.subscriptions.push(disposable);
    console.log('Extension activation complete');
}
function getWebviewContent(cssUri) {
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
// This method is called when your extension is deactivated
function deactivate() { }
//# sourceMappingURL=extension.js.map