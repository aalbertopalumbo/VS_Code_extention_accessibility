# Accessibility Assistant

A Visual Studio Code extension that reads your web code, checks it against a set of accessibility guidelines, and suggests concrete improvements — powered by Google Gemini AI.

---

## What does this extension do?

When you are building a website or web application, it can be hard to know whether your code is accessible to all users (for example, people who use screen readers or keyboard-only navigation). This extension automates that check.

You open an HTML file in VS Code, click a button, and the extension:
1. Sends your code to Google Gemini along with a set of accessibility rules
2. Gets back a list of problems found in your code, each with an explanation and a suggested fix
3. Lets you apply any fix with a single click, directly in your file

There is also a built-in Documentation panel where you can read all the accessibility guidelines at any time, with a search bar to find what you need quickly.

---

## What you need before starting

Before installing the extension, make sure you have the following installed on your computer.

### 1. Visual Studio Code
VS Code is the code editor this extension runs inside.

- Download it for free at: https://code.visualstudio.com
- Run the installer and follow the on-screen steps
- Once installed, open VS Code, you should see a welcome screen

### 2. Node.js
Node.js is a tool that runs JavaScript on your computer. The extension needs it to work.

- Download it at: https://nodejs.org
- Choose the version marked **LTS** (Long Term Support), this is the most stable one
- Run the installer and follow the on-screen steps
- To verify the installation worked, open a terminal (see note below) and type:
  ```
  node --version
  ```
  You should see a version number printed (e.g. `v20.11.0`). If you see an error instead, try restarting your computer and running the command again.

> **How to open a terminal:**
> - On **Windows**: Press `Win + R`, type `cmd`, and press Enter. Or search for "Command Prompt" in the Start menu.
> - On **Mac**: Press `Cmd + Space`, type `Terminal`, and press Enter.

### 3. A Google Gemini API key
The extension uses Google Gemini AI to analyse your code. To use it, you need a free API key.

- Go to: https://aistudio.google.com/app/apikey
- Sign in with a Google account
- Click **Create API key**
- Copy the key and save it somewhere safe, you will need it during setup

---

## Installation

### Step 1 — Download the extension files

From GitHub, click the green **Code** button on the repository page, then click **Download ZIP**, and extract the downloaded archive or clone the repository inside one of your directories.

### Step 2 — Open the folder in VS Code

1. Open VS Code
2. In the top menu, click **File → Open Folder…**
3. Navigate to the folder you just extracted and click **Select Folder** (or **Open** on Mac)
4. The folder's contents should now be visible in the left sidebar of VS Code

### Step 3 — Open the integrated terminal in VS Code    

VS Code has a built-in terminal so you do not need to leave the application.

- In the top menu, click **Terminal → New Terminal**
- A panel will open at the bottom of the screen with a command prompt

### Step 4 — Install the extension's dependencies

In the terminal at the bottom of VS Code, type the following command and press Enter:

```
npm install
```

This downloads all the packages the extension needs to run. It may take a minute or two. You will see a lot of text scroll by — that is normal. Wait until the prompt reappears before continuing.

### Step 5 — Add your Gemini API key

The extension needs your API key to communicate with Google Gemini. You will store it in a small configuration file called `.env`.

1. In the VS Code sidebar (the file list on the left), right-click in an empty area and choose **New File**
2. Name the file exactly `.env` (including the dot at the beginning)
3. Open the file and type the following line, replacing `your_api_key_here` with the key you copied earlier:
   ```
   GEMINI_API_KEY=your_api_key_here
   ```
4. Save the file with `Ctrl + S` on Windows or `Cmd + S` on Mac

> **Important:** Do not share this file or upload it anywhere. It contains your private API key.

### Step 6 — Compile the extension

The extension is written in TypeScript, which needs to be converted into JavaScript before it can run. In the terminal, type:

```
npm run compile
```

Wait for the command to finish. If you see errors printed in red, double-check that you completed the previous steps correctly (especially that Node.js is installed and the `.env` file is saved).

### Step 7 — Launch the extension

Press the **F5** key on your keyboard, or go to **Run → Start Debugging** in the top menu.

A new VS Code window will open, this is called the **Extension Development Host**. This is the window where the extension is active and ready to use. Do all your work in this new window.

---

## How to use the extension

### Opening the panels

The extension adds a new panel to the VS Code sidebar (the vertical bar on the left side of the screen) with the accessibility icon.

Click on it to open the extention bar and you will be able to see two windows opening: **Documentation** and **Analysis**. If you cannot find the icon in the sidebar, try clicking the **Extensions** icon (it looks like four squares) and look for "Accessibility Assistant" in the list of installed extensions.

---

### Running an analysis

1. In the Extension Development Host window, open the file you want to check via **File → Open File…**
2. Click the **Analysis** panel icon in the sidebar
3. Click the **Run Analysis** button
4. A loading indicator will appear while the extension contacts Gemini. This usually takes between 30 seconds up to a couple minutes, depending on your internet connection and the size of the file
5. When the analysis is complete, the results appear as cards — one card per problem found

If no problems are found, the panel will display "No violations found!"

If there are errors with the communication with Gemini you will see the type of error on the screen.

---

### Reading the results

Each result card contains three parts:

- **Rule Violated** — the name of the accessibility guideline your code is breaking
- **Rationale** — a plain-English explanation of why this is a problem
- **Suggestion** — a diff showing the proposed change. Lines starting with `−` shown in red are what will be removed; lines starting with `+` shown in green are what will be added

---

### Seeing where the problem is in your file

Hover your mouse over any result card. The affected lines in your code will be highlighted in red in the editor so you can immediately see what the suggestion refers to. Move your mouse away from the card to clear the highlight.

---

### Reading the full guideline

At the top of each card, the name of the violated rule appears as a clickable link (underlined, in blue). Click it to open the **Documentation panel**, which will automatically scroll to and highlight the corresponding guideline so you can read the full explanation.

---

### Applying a fix

If you agree with a suggestion, click the **Accept** button at the bottom of the card.

The extension will:
1. Find the original code in your file
2. Replace it with the suggested code
3. Highlight the newly inserted lines in green for a few seconds so you can see exactly what changed
4. Mark the card with a ✓ Applied badge and remove the Accept button.

The change is applied directly to your file in the editor. 
You can undo it at any time clicking on the **undo** button and you will also be able to reapply the change

At the bottom of the panel you will also be able to look at the history of changes you have done during the session made by the extention.

---

### Using the Documentation panel

Click the **Documentation** panel icon in the sidebar to open it at any time, independently of the analysis.

- All accessibility guidelines are shown as expandable cards. Click on a card's title bar to expand it and read the full content
- Use the **search bar** at the top to filter cards by keyword. Type any word and only the cards that contain that text will show. Clear the search bar to show all cards again

---

## Troubleshooting

**The terminal shows an error after `npm install`**
Make sure Node.js is installed correctly. Run `node --version` in the terminal. If nothing appears or you see an error, reinstall Node.js from https://nodejs.org and restart your computer before trying again.

**The analysis returns "Gemini API key is not set"**
Open the `.env` file and check that the line reads exactly `GEMINI_API_KEY=your_actual_key` with no extra spaces, quotation marks, or line breaks.

**The Accept button shows "Could not find the original code in the file"**
This happens if you edited the file after running the analysis. Save your file and run the analysis again to get fresh suggestions based on the current code.

**On Windows, `npm run compile` fails with an "execution policy" error**
Open PowerShell as Administrator (search for "PowerShell" in the Start menu, right-click it, and choose "Run as administrator"), then run:
```
Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
```
Type `Y` and press Enter to confirm. Then go back to the VS Code terminal and try `npm run compile` again.

**The extension panels do not appear in the sidebar**
Make sure you are working in the **Extension Development Host** window (the new window that opened when you pressed F5), not the original VS Code window where you did the setup.

---

## License

MIT