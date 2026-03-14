// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as path from 'path';
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as dotenv from 'dotenv';
// Import marked for markdown parsing


// WEBVIEW PROVIDER FOR DOCUMENTATION VIEW
class DocumentationViewProvider implements vscode.WebviewViewProvider {

	public static readonly viewType = 'documentation'; //type of the sidebar, same of what is written in the JSON

	constructor(private readonly _extensionUri: vscode.Uri) {					  //extensionUri: route of the extension's folder, useful to find CSS and markdown
		console.log('DocumentationViewProvider initialized with extension URI:'); //DEBUG
	}

	// This method is called when the webview view is resolved
	public async resolveWebviewView(
		webviewView: vscode.WebviewView,
		_context: vscode.WebviewViewResolveContext,
		_token: vscode.CancellationToken
	) {
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
		const sections: { title: string; html: string }[] = []; //each element of the array contains title (of the guideline) and html (the content of the guideline in HTML)
		let currentTitle = ''; //variable that is the title we are analysing 
		let currentTokens: any[] = []; //array filled with tokens of the current guideline

		for (const token of tokens) {
    	const isDetailsHeading = token.type === 'html' && token.raw.includes('<details'); //for the 3 first guidelines: HTML token which contains <details>
    	const isMarkdownHeading = token.type === 'heading' && token.depth === 3; //heading type token with ### (4-12)

    	if (isDetailsHeading || isMarkdownHeading) {
        if (currentTitle != '') { //Each time a title is found, the previous section is finished so it's saved in sections. Marked.parser reassemble the tokens
            sections.push({
                title: currentTitle,
                html: marked.parser(currentTokens as any) 
            });
        }
        if (isDetailsHeading) { 
            const titleMatch = token.raw.match(/<h3[^>]*>(.*?)<\/h3>/s);//regex, more info https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_expressions
            currentTitle = titleMatch ? titleMatch[1].trim() : 'Guideline'; //trim removes spaces and newlines, titleMatch[0]=='<h3>Keyboard Navigation</h3>', titleMatch[1]=='Keyboard Navigation'
            currentTokens = [];
        } else {
            currentTitle = token.text;
            currentTokens = [];
        }
    	} else {
        	currentTokens.push(token); //if currentTokens isn't a title
    	}
	}

		// Push last section that isn't saved inside the loop because the loop is closed when the token are finished
		if (currentTitle) {
    	sections.push({
        	title: currentTitle,
        	html: marked.parser(currentTokens as any)
    		});
		}

		const htmlContent = sections.map(s => ` 																					<!-- each sections become a HTML string -->
    	<details class="guideline-card" data-title="${s.title.toLowerCase()}">														<!-- data-title is an hidden attribute, toLowercase is useful for the search-bar -->
        <summary class="guideline-header">${s.title}</summary>
        <div class="guideline-body">${s.html.replace(/<details[^>]*>[\s\S]*?<\/summary>/g, '').replace(/<\/details>/g, '')}</div> 
    	</details>		
		`).join('');
		webviewView.webview.html = this.getWebviewContent(webviewView.webview, styleUri, htmlContent as string);
		console.log('Documentation view resolved');
	}

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
    document.addEventListener('DOMContentLoaded', () => {					//HTML has to be loaded
        const searchBar = document.getElementById('search-bar');    		//Takes the input in the search-bar
        
        searchBar.addEventListener('input', () => {							//Listen the event input
            const query = searchBar.value.toLowerCase();					//the typed text is converted to lowercase
            const cards = document.querySelectorAll('.guideline-card');		//Takes the card of the HTML
            cards.forEach(card => {											
                const title = card.getAttribute('data-title');				//Takes the title of the card
                if (title.includes(query)) {								//if the title contains the input of the search-bar the card remains visible, otherwise is hidden
                    card.style.display = '';
                } else {
                    card.style.display = 'none';
                }
            });
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
class AnalysisViewProvider implements vscode.WebviewViewProvider {

	public static readonly viewType = 'analysis';

	constructor(
		private readonly _extensionUri: vscode.Uri,
		private readonly _context: vscode.ExtensionContext
	) {}

	private async runGeminiAnalysis(webview: vscode.Webview) {
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
			You provide your suggestions based on the documentation provided and nothing else. You generate the analysis based on this format:
			1. Title of the guideline violated
			2. Rationale: explain why you are proposing this suggestion based on the guidelines present in the documentation
			3. Suggestion: shown in a diff format

			IMPORTANT: Respond with ONLY a valid JSON array — no markdown, no explanation, no code fences.
			Each element must follow this exact schema:
			{
  				"title": "<title of the guideline violated>",
  				"rationale": "<why this code violates the guideline>",
  				"original": "<the exact lines of code containing the violation>",
  				"suggested": "<the corrected version of those lines>"
			}

			If no violations are found, return an empty array: []

			=== DOCUMENTATION ===
			${documentation}

			=== CODE TO ANALYSE ===
			${code}`
        	});

        	const text = (response.text || '').trim();  									//trim removes spaces and useless newlines. || '' is a precaution in case response.text==null
        	const clean = text.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim();   //replaces ```json and ``` (Alt+96), trim for safety 

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
        		webview.postMessage({ command: 'analysisError', error: err.message });
    		}
		}

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

		// Listen for messages coming from the webview
    	webviewView.webview.onDidReceiveMessage(async (message) => {
        	if (message.command === 'runAnalysis') {
            	await this.runGeminiAnalysis(webviewView.webview);
        	}
			if (message.command === 'acceptSuggestion') {         //Takes the open document in the editor and search "original" with indexOf
   				const editor = vscode.window.activeTextEditor;
    			if (!editor) { return; }
				const document = editor.document;
    			const fullText = document.getText();
    			const index = fullText.indexOf(message.original);

    			if (index === -1) {
        			vscode.window.showErrorMessage('Could not find the original code in the file.');
        			return;
    			}

				const startPos = document.positionAt(index);                              //Converts numerical index in a position in the document (line and column)
				const endPos = document.positionAt(index + message.original.length);
				const range = new vscode.Range(startPos, endPos);						  //piece of text to substitute
				const edit = new vscode.WorkspaceEdit();
				edit.replace(document.uri, range, message.suggested);
				await vscode.workspace.applyEdit(edit);
				vscode.window.showInformationMessage('Substitution applied successfully!');
			}
    	});

	}

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
        <div>
            <button id="run-analysis">Run Analysis</button>
        </div>
        <div id="status"></div>
        <div id="results"></div>
    </div>

    <script>
    const vscode = acquireVsCodeApi();

    document.getElementById('run-analysis').addEventListener('click', () => {
        document.getElementById('status').textContent = 'Running analysis, please wait...';
        document.getElementById('results').innerHTML = '';
        vscode.postMessage({ command: 'runAnalysis' });
    });

    window.addEventListener('message', event => {
        const message = event.data;
        if (message.command === 'analysisResult') {
            document.getElementById('status').textContent = '';
            const results = document.getElementById('results');

            if (!message.violations || message.violations.length === 0) {  //if the message doesn't contain any violations or the size is zero
                results.innerHTML = '<p>No violations found!</p>';
                return;
            }

            message.violations.forEach(v => {   //Build a card for each violation
                const card = document.createElement('div');
                card.className = 'violation-card';

                const removedLines = v.original.split('\\n')
                    .map(line => '<span class="diff-removed">- ' + escHtml(line) + '</span>') 
                    .join('');
                const addedLines = v.suggested.split('\\n')
                    .map(line => '<span class="diff-added">+ ' + escHtml(line) + '</span>')
                    .join('');
				//compose each card with title, rationale and diff
                card.innerHTML =
   			    '<div class="violation-title">' + escHtml(v.title) + '</div>' +
    		    '<div class="violation-label">Rationale</div>' +
    			'<div class="violation-rationale">' + escHtml(v.rationale) + '</div>' +
    			'<div class="violation-label">Suggestion</div>' +
    			'<div class="diff-block">' + removedLines + addedLines + '</div>' +
    			'<button class="accept-btn">Accept</button>';												//Button implementation
				results.appendChild(card);
				card.querySelector('.accept-btn').addEventListener('click', () => {  						//querySelector finds the button inside each card
    				vscode.postMessage({																	//sends a message to TypeScript with the command "acceptSuggestion"
        				command: 'acceptSuggestion',
        				original: v.original,
        				suggested: v.suggested
    				});
				});
			}); // chiude il forEach

        } else if (message.command === 'analysisError') {
            document.getElementById('status').textContent = '';
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
export function activate(context: vscode.ExtensionContext) {

	dotenv.config({ path: path.join(context.extensionPath, '.env') }); //put in process.env the API key

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "accessibility-assistant" is now active!');

	// Register webview view providers for both sidebar views
	const docProvider = new DocumentationViewProvider(context.extensionUri);
	console.log('Registering DocumentationViewProvider with view type:');
	context.subscriptions.push(
		vscode.window.registerWebviewViewProvider(DocumentationViewProvider.viewType, docProvider)
	);

	const analysisProvider = new AnalysisViewProvider(context.extensionUri, context);
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
				localResourceRoots: [vscode.Uri.joinPath(context.extensionUri, 'css')] // Restrict the webview to only load resources from the css directory
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



// This method is called when your extension is deactivated
export function deactivate() {}