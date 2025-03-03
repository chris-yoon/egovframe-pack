import * as vscode from 'vscode';
import { 
  generateCrudFromDDL
} from '../../utils/codeGeneratorUtils';
import { registerHandlebarsHelpers } from '../../utils/handlebarHelpers';

// 이 함수는 VSCode 확장이 활성화될 때 호출된다.
export function registerGenerateCodeCommand(context: vscode.ExtensionContext) {
  registerHandlebarsHelpers();
  // generateCode 명령: 사용자가 DDL을 입력하면, 이를 파싱하여 템플릿 파일을 렌더링하고 파일을 생성한다.
  let generateCodeDisposable = vscode.commands.registerCommand('extension.generateCode', async () => {
    // 현재 활성화된 텍스트 에디터를 가져온다.
    const editor = vscode.window.activeTextEditor;
    // 선택된 텍스트를 DDL로 사용한다.
    let ddl = editor?.document.getText(editor.selection);

    // DDL이 선택되지 않은 경우, Webview를 통해 입력받는다.
    if (!ddl) {
      ddl = await showDDLInputWebview(context);

      // Webview를 통해 입력받은 DDL이 없으면 오류 메시지를 표시하고 종료한다.
      if (!ddl) {
        vscode.window.showErrorMessage('No DDL statement provided.');
        return;
      }
    }

    await generateCrudFromDDL(ddl, context);
  });

  context.subscriptions.push(generateCodeDisposable);
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
