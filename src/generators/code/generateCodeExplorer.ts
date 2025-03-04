import * as vscode from 'vscode';
import * as fs from 'fs-extra';
import * as path from 'path';
import { 
  getTemplateContext,
  renderTemplate,
  generateCrudFromDDL
} from '../../utils/codeGeneratorUtils';
import { parseDDL } from '../../utils/ddlParser';
import { registerHandlebarsHelpers } from '../../utils/handlebarHelpers';

export function registerGenerateCodeExplorer(context: vscode.ExtensionContext) {
  registerHandlebarsHelpers();

  // 웹뷰를 생성하고 등록한다.
  const myWebviewProvider = new MyWebviewViewProvider(context);

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      'egovframeCodeView',
      myWebviewProvider
    )
  );

  // 명령어를 등록하여 Sidebar Toolbar 아이콘 클릭 시 웹뷰로 메시지를 보냄
  context.subscriptions.push(
    vscode.commands.registerCommand('extension.insertSampleDDL', () => {
      myWebviewProvider.insertSampleDDL();
    })
  );
}

//사용자가 DDL을 입력할 수 있는 웹 인터페이스를 제공한다.
class MyWebviewViewProvider implements vscode.WebviewViewProvider {
  private webviewView: vscode.WebviewView | undefined;

  constructor(private readonly context: vscode.ExtensionContext) {
    console.log('MyWebviewViewProvider constructor called');
  }

  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    context: vscode.WebviewViewResolveContext,
    token: vscode.CancellationToken
  ) {
    this.webviewView = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
    };

    webviewView.webview.html = this.getHtmlForWebview(webviewView.webview);

    webviewView.webview.onDidReceiveMessage(async (message) => {
      const ddl = message.ddl;

      switch (message.command) {
        case 'generateCode':
          await generateCrudFromDDL(ddl, this.context);
          break;
        case 'uploadTemplates':
          await this.uploadTemplates(ddl);
          break;
        case 'downloadTemplateContext':
          await this.downloadTemplateContext(ddl);
          break;
      }
    });
  }

  // 이 메서드는 명령어가 호출될 때 웹뷰에 메시지를 보냅니다.
  public insertSampleDDL() {
    if (this.webviewView) {
      this.webviewView.webview.postMessage({
        command: 'insertSampleDDL',
        ddl: `CREATE TABLE users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);`
      });
    }
  }

  private getHtmlForWebview(webview: vscode.Webview): string {
    const nonce = getNonce();
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>eGovFrame Code Generator</title>
  <style>
    body, html {
      height: 100%;
      margin: 5px 0;
      font-family: Arial, sans-serif;
      background-color: transparent; /* 배경을 투명하게 설정 */
      color: var(--vscode-editor-foreground);
      display: flex;
      flex-direction: column;
    }

    h3 {
      margin: 20px 0 10px 0;
      font-size: 1.5em;
      color: var(--vscode-editor-foreground);
    }

    .container {
      flex: 1;
      display: flex;
      flex-direction: column;
      padding: 3px;
      box-sizing: border-box;
      background-color: transparent; /* 배경을 투명하게 설정 */
    }

    textarea {
      flex: 1;
      width: 100%;
      padding: 10px;
      border: 1px solid var(--vscode-input-border);
      border-radius: 4px;
      box-sizing: border-box;
      font-size: 1em;
      resize: none; /* 사용자 조정 불가 */
      margin-bottom: 20px;
      background-color: var(--vscode-input-background);
      color: var(--vscode-input-foreground);
    }

    .buttons {
      display: flex;
      flex-direction: column; /* 버튼을 수직으로 배치 */
      gap: 10px;
    }

    button {
      padding: 10px 20px;
      font-size: 1em;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      background-color: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
      transition: background-color 0.3s ease;
      width: 100%; /* 버튼이 부모의 가로 크기 전체를 차지하도록 설정 */
    }

    button:hover {
      background-color: var(--vscode-button-hoverBackground);
    }

    button:active {
      background-color: var(--vscode-button-hoverBackground);
    }
  </style>
</head>
<body>
  <div class="container">
    <textarea id="ddl-input" placeholder="Enter your DDL statement here..."></textarea>
    <div class="buttons">
      <button id="generateCode">Generate CRUD Code</button>
      <button id="uploadTemplates">Generate Code via Your Handlebar template</button>
      <button id="downloadTemplateContext">Download Template Context</button>
    </div>
  </div>
  <script nonce="${nonce}">
    const vscode = acquireVsCodeApi();
    document.getElementById('generateCode').addEventListener('click', () => {
      const ddl = document.getElementById('ddl-input').value;
      vscode.postMessage({ command: 'generateCode', ddl });
    });
    document.getElementById('uploadTemplates').addEventListener('click', () => {
      const ddl = document.getElementById('ddl-input').value;
      vscode.postMessage({ command: 'uploadTemplates', ddl });
    });
    document.getElementById('downloadTemplateContext').addEventListener('click', () => {
      const ddl = document.getElementById('ddl-input').value;
      vscode.postMessage({ command: 'downloadTemplateContext', ddl });
    });

    // 명령어 실행 시 DDL 삽입
    window.addEventListener('message', event => {
      const message = event.data;
      if (message.command === 'insertSampleDDL') {
        document.getElementById('ddl-input').value = message.ddl;
      }
    });
  </script>
</body>
</html>

`;
  }

  private async uploadTemplates(ddl: string) {
    const selectedFiles = await vscode.window.showOpenDialog({
      title: 'Select HBS Template Files to Upload',
      canSelectFolders: false,
      canSelectFiles: true,
      canSelectMany: true,
      filters: { 'Handlebars Templates': ['hbs'], 'All Files': ['*'] }
    });

    if (!selectedFiles || selectedFiles.length === 0) {
      vscode.window.showErrorMessage('No files selected.');
      return;
    }

    const selectedFolderPath = path.dirname(selectedFiles[0].fsPath);

    for (const file of selectedFiles) {
      const templatePath = file.fsPath;
      const outputPath = path.join(selectedFolderPath, path.basename(file.fsPath, '.hbs') + '.generated');

      try {
        const { tableName, attributes, pkAttributes } = parseDDL(ddl);
        const context = getTemplateContext(tableName, attributes, pkAttributes);
        const renderedContent = await renderTemplate(templatePath, context);
        await fs.writeFile(outputPath, renderedContent);
        vscode.window.showInformationMessage(`Custom template saved successfully to ${outputPath}`);

        // Open the newly created file in the editor
        const document = await vscode.workspace.openTextDocument(outputPath);
        await vscode.window.showTextDocument(document);
        
      } catch (error) {
        if (error instanceof Error) {
          vscode.window.showErrorMessage(`Error: ${error.message}`);
        } else {
          vscode.window.showErrorMessage('An unknown error occurred.');
        }
      }
    }
  }

  private async downloadTemplateContext(ddl: string) {
    const selectedFolder = await vscode.window.showOpenDialog({
      title: 'Select Folder to Save JSON',
      canSelectFolders: true,
      canSelectFiles: false,
      canSelectMany: false,
      openLabel: 'Select Folder'
    });

    if (!selectedFolder || selectedFolder.length === 0) {
      vscode.window.showErrorMessage('No folder selected.');
      return;
    }

    const folderPath = selectedFolder[0].fsPath;

    try {
      const { tableName, attributes, pkAttributes } = parseDDL(ddl);
      const context = getTemplateContext(tableName, attributes, pkAttributes);
      const jsonContent = JSON.stringify(context, null, 2);
      const outputPath = path.join(folderPath, `${tableName}_TemplateContext.json`);
      await fs.writeFile(outputPath, jsonContent);
      vscode.window.showInformationMessage(`TemplateContext JSON saved successfully to ${outputPath}`);

      // Open the newly created file in the editor
      const document = await vscode.workspace.openTextDocument(outputPath);
      await vscode.window.showTextDocument(document);

    } catch (error) {
      if (error instanceof Error) {
        vscode.window.showErrorMessage(`Error: ${error.message}`);
      } else {
        vscode.window.showErrorMessage('An unknown error occurred.');
      }
    }
  }
}

function getNonce() {
  let text = '';
  const possible =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}

export function deactivate(): void {
  // Clean up resources and perform any necessary deactivation tasks
  // Currently no cleanup is needed, but we explicitly declare return type
  // to satisfy the linter and maintain good practices
}
