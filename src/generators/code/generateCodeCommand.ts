import * as vscode from 'vscode';
import * as fs from 'fs-extra';
import { 
  generateCrudFromDDL,
  getTemplateContext,
  renderTemplate
} from '../../utils/codeGeneratorUtils';
import { registerHandlebarsHelpers } from '../../utils/handlebarHelpers';
import { parseDDL } from '../../utils/ddlParser';

// 이 함수는 VSCode 확장이 활성화될 때 호출된다.
export function registerGenerateCodeCommand(context: vscode.ExtensionContext) {
  registerHandlebarsHelpers();

  // 기존 generateCode 명령어
  let generateCodeDisposable = vscode.commands.registerCommand('extension.generateCodeCommand', async () => {
    const editor = vscode.window.activeTextEditor;
    let ddl = editor?.document.getText(editor.selection);

    if (!ddl) {
      ddl = await showDDLInputWebview(context);

      if (!ddl) {
        vscode.window.showErrorMessage('No DDL statement provided.');
        return;
      }
    }

    await generateCrudFromDDL(ddl, context);
  });

  // Upload Templates 명령어
  let uploadTemplatesDisposable = vscode.commands.registerCommand('extension.uploadTemplates', async () => {
    const editor = vscode.window.activeTextEditor;
    let ddl = editor?.document.getText(editor?.selection);

    if (!ddl) {
      ddl = await showDDLInputWebview(context);
      if (!ddl) {
        vscode.window.showErrorMessage('No DDL statement provided.');
        return;
      }
    }

    const selectedFiles = await vscode.window.showOpenDialog({
      canSelectFiles: true,
      canSelectFolders: false,
      canSelectMany: true,
      filters: {
        'Handlebars Templates': ['hbs'],
        'All Files': ['*']
      },
      title: 'Select Template Files'
    });

    if (selectedFiles && selectedFiles.length > 0) {
      try {
        for (const file of selectedFiles) {
          const { tableName, attributes, pkAttributes } = parseDDL(ddl);
          const templateContext = getTemplateContext(tableName, attributes, pkAttributes);
          const renderedContent = await renderTemplate(file.fsPath, templateContext);
          
          const outputPath = file.fsPath.replace('.hbs', '.generated');
          await fs.writeFile(outputPath, renderedContent);
          
          const doc = await vscode.workspace.openTextDocument(outputPath);
          await vscode.window.showTextDocument(doc);
        }
        vscode.window.showInformationMessage('Templates generated successfully');
      } catch (error) {
        vscode.window.showErrorMessage(`Failed to process templates: ${error}`);
      }
    }
  });

  // Download Template Context 명령어
  let downloadTemplateContextDisposable = vscode.commands.registerCommand('extension.downloadTemplateContext', async () => {
    const editor = vscode.window.activeTextEditor;
    let ddl = editor?.document.getText(editor?.selection);

    if (!ddl) {
      ddl = await showDDLInputWebview(context);
      if (!ddl) {
        vscode.window.showErrorMessage('No DDL statement provided.');
        return;
      }
    }

    const saveLocation = await vscode.window.showSaveDialog({
      filters: {
        'JSON files': ['json']
      },
      saveLabel: 'Save Template Context',
      title: 'Save Template Context As'
    });

    if (saveLocation) {
      try {
        const { tableName, attributes, pkAttributes } = parseDDL(ddl);
        const templateContext = getTemplateContext(tableName, attributes, pkAttributes);
        const jsonContent = JSON.stringify(templateContext, null, 2);
        
        await fs.writeFile(saveLocation.fsPath, jsonContent);
        
        const doc = await vscode.workspace.openTextDocument(saveLocation.fsPath);
        await vscode.window.showTextDocument(doc);
        
        vscode.window.showInformationMessage('Template context saved successfully');
      } catch (error) {
        vscode.window.showErrorMessage(`Failed to save template context: ${error}`);
      }
    }
  });

  // 모든 명령어를 context.subscriptions에 추가
  context.subscriptions.push(
    generateCodeDisposable,
    uploadTemplatesDisposable,
    downloadTemplateContextDisposable
  );
}

// showDDLInputWebview 함수: 사용자가 DDL을 입력할 수 있는 Webview를 제공한다.
async function showDDLInputWebview(context: vscode.ExtensionContext): Promise<string | undefined> {
  const panel = vscode.window.createWebviewPanel(
    'ddlInput', // panel의 identifier
    'Input DDL Statement', // panel의 title
    vscode.ViewColumn.One, // panel의 위치
    {
      enableScripts: true, // scripts를 사용할 수 있도록 설정
    }
  );

  panel.webview.html = getDDLInputHtml(); // DDL 입력 Webview에 표시할 HTML

  return new Promise((resolve) => {
    panel.webview.onDidReceiveMessage( // Webview의 메시지를 수신하는 함수
      message => {
        if (message.command === 'submitDDL') { // 'submitDDL' 메시지를 받은 경우
          resolve(message.ddl); // DDL를 반환하고 Webview를 종료합니다.
          panel.dispose();
        } else if (message.command === 'cancel') { // 'cancel' 메시지를 받은 경우
          resolve(undefined); // undefined을 반환하고 Webview를 종료합니다. 
          panel.dispose();
        }
      },
      undefined,
      context.subscriptions
    );
  });
}

// getDDLInputHtml 함수는 DDL 입력 Webview의 HTML를 생성하는 함수입니다.
// acquireVsCodeApi 함수는 VS Code의 API를 가져오는 함수입니다.
// vscode.postMessage 함수는 VS Code의 메시지 전달 함수로 command와 data를 메시지로 전달합니다.
function getDDLInputHtml(): string {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Input DDL</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 10px; }
        textarea { width: 100%; height: 150px; }
        .buttons { margin-top: 10px; }
        button { margin-right: 5px; }
      </style>
    </head>
    <body>
      <h3>Enter DDL Statement</h3>
      <textarea id="ddl-input"></textarea>
      <div class="buttons">
        <button id="submit">Submit</button>
        <button id="cancel">Cancel</button>
      </div>
      <script>
        const vscode = acquireVsCodeApi();
        document.getElementById('submit').addEventListener('click', () => {
          const ddl = document.getElementById('ddl-input').value;
          vscode.postMessage({ command: 'submitDDL', ddl });
        });
        document.getElementById('cancel').addEventListener('click', () => {
          vscode.postMessage({ command: 'cancel' });
        });
      </script>
    </body>
    </html>
  `;
}

export function deactivate(): void {
  // Clean up resources and perform any necessary deactivation tasks
  // Currently no cleanup is needed, but we explicitly declare return type
  // to satisfy the linter and maintain good practices
}
