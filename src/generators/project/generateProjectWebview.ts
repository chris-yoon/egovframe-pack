import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs-extra";
import { Template, generateProject } from "../../utils/projectGeneratorUtils";

export function registerGenerateProjectWebview(context: vscode.ExtensionContext) {
  let disposable = vscode.commands.registerCommand("extension.generateProjectWebview", () => {
    console.log("🚀 Creating React-based WebView...");
    createWebview(context);
  });

  context.subscriptions.push(disposable);
}

function createWebview(context: vscode.ExtensionContext) {
  console.log("📱 Creating WebView Panel...");
  
  const panel = vscode.window.createWebviewPanel(
    "generateProject",
    "eGovFrame Initializr (React)",
    vscode.ViewColumn.One,
    { 
      enableScripts: true,
      localResourceRoots: [
        vscode.Uri.file(path.join(context.extensionPath, 'webview-ui', 'dist'))
      ]
    }
  );

  console.log("🔧 Setting up React WebView HTML...");
  
  // React 앱의 HTML을 설정
  try {
    panel.webview.html = getWebviewContent(panel.webview, context.extensionPath);
    console.log("✅ React WebView HTML set successfully");
  } catch (error) {
    console.error("❌ Error setting WebView HTML:", error);
    vscode.window.showErrorMessage(`Failed to load React WebView: ${error}`);
  }

  panel.webview.onDidReceiveMessage(
    async (message) => {
      console.log("📨 Received message from React app:", message);
      try {
        switch (message.command) {
          case "generateProject":
            await handleGenerateProject(message.config, context.extensionPath, panel);
            break;
          case "loadTemplates":
            await handleLoadTemplates(context.extensionPath, panel);
            break;
          case "selectOutputPath":
            await handleSelectOutputPath(panel);
            break;
          case "getWorkspacePath":
            await handleGetWorkspacePath(panel);
            break;
          case "done":
          panel.dispose();
            break;
          default:
            console.log(`Unknown command: ${message.command}`);
        }
      } catch (error) {
        console.error("❌ Error handling message:", error);
        if (error instanceof Error) {
          vscode.window.showErrorMessage(`Error: ${error.message}`);
          panel.webview.postMessage({
            command: "projectGenerationResult",
            success: false,
            error: error.message
          });
        } else {
          vscode.window.showErrorMessage("An unknown error occurred");
          panel.webview.postMessage({
            command: "projectGenerationResult",
            success: false,
            error: "An unknown error occurred"
          });
        }
      }
    },
    undefined,
    context.subscriptions
  );
}

function getWebviewContent(webview: vscode.Webview, extensionPath: string): string {
  const distPath = path.join(extensionPath, 'webview-ui', 'dist');
  const mainJsPath = path.join(distPath, 'assets');
  
  console.log("📂 Looking for main.js in:", mainJsPath);
  
  // assets 폴더에서 main.js 파일 찾기
  const files = fs.readdirSync(mainJsPath);
  console.log("📁 Files in assets:", files);
  
  const mainJsFile = files.find(f => f.startsWith('main') && f.endsWith('.js'));
  
  if (!mainJsFile) {
    console.error("❌ Main JS file not found in:", mainJsPath);
    throw new Error('Main JS file not found');
  }

  console.log("✅ Found main JS file:", mainJsFile);

  const scriptUri = webview.asWebviewUri(vscode.Uri.file(path.join(mainJsPath, mainJsFile)));
  
  console.log("🔗 Script URI:", scriptUri.toString());
  
  const html = `<!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>eGovFrame Initializr (React)</title>
        <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src ${webview.cspSource};">
    </head>
    <body>
        <div id="root"></div>
        <script>
          console.log("🌟 React WebView initialized");
        </script>
        <script type="module" src="${scriptUri}"></script>
    </body>
    </html>`;
    
  console.log("📄 Generated HTML:", html);
  return html;
}

async function handleGenerateProject(config: any, extensionPath: string, panel: vscode.WebviewPanel) {
  try {
    // 프로젝트 생성 진행 상황 알림
    panel.webview.postMessage({
      command: "projectGenerationProgress",
      text: "🔍 Loading template..."
    });

    const templatesPath = path.join(extensionPath, "templates-projects.json");
    const templates: Template[] = await fs.readJSON(templatesPath);

    const template = templates.find(t => t.fileName === config.template.fileName);
    if (!template) {
      throw new Error("Template not found");
    }

    panel.webview.postMessage({
      command: "projectGenerationProgress",
      text: "🚀 Generating project..."
    });

    await generateProject(
      template,
      {
        projectName: config.projectName,
        groupID: config.groupID,
        outputPath: config.outputPath
      },
      extensionPath
    );

    const projectPath = path.join(config.outputPath, config.projectName);
    
    panel.webview.postMessage({
      command: "projectGenerationResult",
      success: true,
      projectPath: projectPath
    });

    vscode.window.showInformationMessage(`Project generated successfully at: ${projectPath}`);

  } catch (error) {
    throw error;
  }
}

async function handleLoadTemplates(extensionPath: string, panel: vscode.WebviewPanel) {
  try {
    const templatesPath = path.join(extensionPath, "templates-projects.json");
    const templates: Template[] = await fs.readJSON(templatesPath);
    
    panel.webview.postMessage({
      command: "templatesLoaded",
      templates: templates
    });
  } catch (error) {
    console.error("Error loading templates:", error);
    panel.webview.postMessage({
      command: "templatesLoaded",
      templates: []
    });
  }
}

async function handleSelectOutputPath(panel: vscode.WebviewPanel) {
  const options: vscode.OpenDialogOptions = {
    canSelectMany: false,
    canSelectFiles: false,
    canSelectFolders: true,
    openLabel: 'Select Output Folder'
  };

  const result = await vscode.window.showOpenDialog(options);
  if (result && result[0]) {
    panel.webview.postMessage({
      command: "selectedOutputPath",
      path: result[0].fsPath
    });
  }
}

async function handleGetWorkspacePath(panel: vscode.WebviewPanel) {
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (workspaceFolders && workspaceFolders.length > 0) {
    panel.webview.postMessage({
      command: "currentWorkspacePath",
      path: workspaceFolders[0].uri.fsPath
    });
  }
}

export function deactivate(): void {
  // Clean up resources and perform any necessary deactivation tasks
  // Currently no cleanup is needed, but we explicitly declare return type
  // to satisfy the linter and maintain good practices
}
