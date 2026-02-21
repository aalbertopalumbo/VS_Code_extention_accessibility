// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as path from 'path';
import * as vscode from 'vscode';
import * as fs from 'fs';
// Import marked for markdown parsing

// WEBVIEW PROVIDER FOR DOCUMENTATION VIEW
class DocumentationViewProvider implements vscode.WebviewViewProvider {

	public static readonly viewType = 'documentation';

	constructor(private readonly _extensionUri: vscode.Uri) {
		console.log('DocumentationViewProvider initialized with extension URI:');
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

		// read the markdown file and convert it to HTML
		const markdownContent = fs.readFileSync(docPath.fsPath, 'utf-8');
		const { marked } = await import('marked');
		const htmlContent = marked.parse(markdownContent);


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


	<body>
	<div class ="container">
		<h1>Documentation</h1>
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

	constructor(private readonly _extensionUri: vscode.Uri) {}

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
	<div class ="container">
		<h1>Analysis</h1>
		<p>Code analysis tools and results will appear here.</p>
	</div>
	</body>

	</html>`;
	
	}
}




// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "accessibility-assistant" is now active!');

	// Register webview view providers for both sidebar views
	const docProvider = new DocumentationViewProvider(context.extensionUri);
	console.log('Registering DocumentationViewProvider with view type:');
	context.subscriptions.push(
		vscode.window.registerWebviewViewProvider(DocumentationViewProvider.viewType, docProvider)
	);

	const analysisProvider = new AnalysisViewProvider(context.extensionUri);
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
