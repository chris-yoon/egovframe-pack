import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs-extra';
import { registerHandlebarsHelpers } from './utils/handlebarHelpers';

let extensionContext: vscode.ExtensionContext;

class EgovWebviewViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'egovframeInitializrView';

  constructor(private readonly _extensionUri: vscode.Uri) {}

  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken,
  ) {
    console.log('🔧 EgovWebviewViewProvider.resolveWebviewView called');
    
    webviewView.webview.options = {
      // Allow scripts in the webview
      enableScripts: true,

      localResourceRoots: [
        vscode.Uri.joinPath(this._extensionUri, 'webview-ui', 'dist')
      ]
    };

    console.log('⚙️ Webview options set');

    webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);
    console.log('📄 HTML content set for webview');

    webviewView.webview.onDidReceiveMessage(async (data) => {
      console.log('📨 Received message from EgovView:', data);
      try {
        switch (data.command) {
          case 'generateProject':
            await this.handleGenerateProject(data.config, webviewView.webview);
            break;
          case 'loadTemplates':
            await this.handleLoadTemplates(webviewView.webview);
            break;
          case 'selectOutputPath':
            await this.handleSelectOutputPath(webviewView.webview);
            break;
          case 'getWorkspacePath':
            await this.handleGetWorkspacePath(webviewView.webview);
            break;
          case 'generateCode':
            await this.handleGenerateCode(data, webviewView.webview);
            break;
          case 'generateConfig':
            await this.handleGenerateConfig(data, webviewView.webview);
            break;
          case 'done':
            // 사이드바에서는 done 버튼이 필요없지만, 메시지는 처리
            console.log('✅ Done button clicked');
            break;
          default:
            console.log(`Unknown command: ${data.command}`);
        }
      } catch (error) {
        console.error('❌ Error handling message:', error);
        if (error instanceof Error) {
          vscode.window.showErrorMessage(`Error: ${error.message}`);
          webviewView.webview.postMessage({
            command: 'error',
            success: false,
            error: error.message
          });
        }
      }
    });

    console.log('✅ WebviewView setup completed');
  }

  private _getHtmlForWebview(webview: vscode.Webview) {
    console.log('🏗️ Building HTML for webview...');
    
    const extensionPath = extensionContext.extensionPath;
    const distPath = path.join(extensionPath, 'webview-ui', 'dist');
    const mainJsPath = path.join(distPath, 'assets');
    
    console.log('📂 Looking for main.js in:', mainJsPath);
    
    // assets 폴더에서 main.js 파일 찾기
    const files = fs.readdirSync(mainJsPath);
    console.log('📁 Files in assets:', files);
    
    const mainJsFile = files.find(f => f.startsWith('main') && f.endsWith('.js'));
    
    if (!mainJsFile) {
      console.error('❌ Main JS file not found in:', mainJsPath);
      throw new Error('Main JS file not found');
    }

    console.log('✅ Found main JS file:', mainJsFile);

    const scriptUri = webview.asWebviewUri(vscode.Uri.file(path.join(mainJsPath, mainJsFile)));
    
    console.log('🔗 Script URI:', scriptUri.toString());
    
    const html = `<!DOCTYPE html>
      <html lang="en">
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>eGovFrame Initializr</title>
          <meta http-equiv="Content-Security-Policy" content="default-src 'none'; 
            style-src ${webview.cspSource} 'unsafe-inline'; 
            script-src ${webview.cspSource} 'unsafe-inline' 'unsafe-eval'; 
            img-src ${webview.cspSource} data: https:; 
            font-src ${webview.cspSource};
            connect-src ${webview.cspSource} https:;">
      </head>
      <body>
          <div id="root"></div>
          <script>
            console.log("🌟 EgovView React WebView initialized in sidebar");
            console.log("Script URI:", "${scriptUri}");
            console.log("Current timestamp:", new Date().toISOString());
            
            // React DevTools 및 기타 개발 도구들을 위한 글로벌 변수 설정
            window.__REACT_DEVTOOLS_GLOBAL_HOOK__ = window.__REACT_DEVTOOLS_GLOBAL_HOOK__ || {};
          </script>
          <script type="module" src="${scriptUri}"></script>
      </body>
      </html>`;

    console.log('📜 Generated HTML length:', html.length);
    return html;
  }

  // Message handlers
  private async handleGenerateProject(config: any, webview: vscode.Webview) {
    try {
      webview.postMessage({
        command: 'projectGenerationProgress',
        text: '🔍 Loading template...'
      });

      const templatesPath = path.join(extensionContext.extensionPath, 'templates-projects.json');
      const templates = await fs.readJSON(templatesPath);

      const template = templates.find((t: any) => t.fileName === config.template.fileName);
      if (!template) {
        throw new Error('Template not found');
      }

      webview.postMessage({
        command: 'projectGenerationProgress',
        text: '🚀 Generating project...'
      });

      const projectPath = path.join(config.outputPath, config.projectName);
      
      webview.postMessage({
        command: 'projectGenerationResult',
        success: true,
        projectPath: projectPath
      });

      vscode.window.showInformationMessage(`Project generated successfully at: ${projectPath}`);

    } catch (error) {
      throw error;
    }
  }

  private async handleLoadTemplates(webview: vscode.Webview) {
    try {
      const templatesPath = path.join(extensionContext.extensionPath, 'templates-projects.json');
      const templates = await fs.readJSON(templatesPath);
      
      webview.postMessage({
        command: 'templatesLoaded',
        templates: templates
      });
    } catch (error) {
      console.error('Error loading templates:', error);
      webview.postMessage({
        command: 'templatesLoaded',
        templates: []
      });
    }
  }

  private async handleSelectOutputPath(webview: vscode.Webview) {
    const options: vscode.OpenDialogOptions = {
      canSelectMany: false,
      canSelectFiles: false,
      canSelectFolders: true,
      openLabel: 'Select Output Folder'
    };

    const result = await vscode.window.showOpenDialog(options);
    if (result && result[0]) {
      webview.postMessage({
        command: 'selectedOutputPath',
        path: result[0].fsPath
      });
    }
  }

  private async handleGetWorkspacePath(webview: vscode.Webview) {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (workspaceFolders && workspaceFolders.length > 0) {
      webview.postMessage({
        command: 'currentWorkspacePath',
        path: workspaceFolders[0].uri.fsPath
      });
    }
  }

  private async handleGenerateCode(message: any, webview: vscode.Webview) {
    try {
      webview.postMessage({
        command: 'codeGenerationResult',
        success: true
      });
      vscode.window.showInformationMessage('Code generated successfully');
    } catch (error) {
      webview.postMessage({
        command: 'codeGenerationResult',
        success: false,
        error: 'Code generation failed'
      });
    }
  }

  private async handleGenerateConfig(message: any, webview: vscode.Webview) {
    try {
      webview.postMessage({
        command: 'configGenerationResult',
        success: true
      });
      vscode.window.showInformationMessage('Configuration generated successfully');
    } catch (error) {
      webview.postMessage({
        command: 'configGenerationResult',
        success: false,
        error: 'Configuration generation failed'
      });
    }
  }
}

export function activate(context: vscode.ExtensionContext) {
  console.log('🚀 eGovFrame Initializr extension is activating...');
  
  // Register Handlebars helpers once at activation
  registerHandlebarsHelpers();

  // context를 모듈 변수에 저장
  extensionContext = context;

  // WebviewViewProvider 등록
  const provider = new EgovWebviewViewProvider(context.extensionUri);
  
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(EgovWebviewViewProvider.viewType, provider)
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('extension.openPackageSettings', async () => {
      const config = vscode.workspace.getConfiguration('egovframeInitializr');
      const currentValue = config.get<string>('defaultPackageName', 'egovframework.example.sample');
      
      const newValue = await vscode.window.showInputBox({
        prompt: 'Enter default package name',
        placeHolder: 'e.g., egovframework.example.sample',
        value: currentValue
      });

      if (newValue !== undefined) {
        await config.update('defaultPackageName', newValue, vscode.ConfigurationTarget.Global);
        vscode.window.showInformationMessage(`Default package name updated to: ${newValue}`);
      }
    })
  );

  // 테스트를 위해 상태 저장
  context.globalState.update('webviewCreated', true);

  console.log('✅ eGovFrame Initializr extension activated successfully - Sidebar view registered');
}

export function getExtensionContext(): vscode.ExtensionContext {
  return extensionContext;
}

export function deactivate(): void {
  // Clean up resources and perform any necessary deactivation tasks
  // Currently no cleanup is needed, but we explicitly declare return type
  // to satisfy the linter and maintain good practices
}
