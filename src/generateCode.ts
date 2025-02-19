import * as vscode from 'vscode';
import * as fs from 'fs-extra';
import * as path from 'path';
import { 
  getFilePathForOutput,
  getTemplateContext,
  renderTemplate,
  showFileList,
  registerHandlebarsHelpers
} from './utils/codeGeneratorUtils';
import { parseDDL } from './utils/ddlParser';

// 이 함수는 VSCode 확장이 활성화될 때 호출된다.
export function activate(context: vscode.ExtensionContext) {
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

    // 사용자에게 생성된 파일을 저장할 폴더를 선택하도록 요청한다.
    const selectedFolder = await vscode.window.showOpenDialog({
      title: 'Select Folder to Save Generated Files',
      canSelectFolders: true,
      canSelectFiles: false,
      canSelectMany: false,
      openLabel: 'Select Folder'
    });

    // 선택된 폴더가 없으면 오류 메시지를 표시하고 종료한다.
    if (!selectedFolder || selectedFolder.length === 0) {
      vscode.window.showErrorMessage('No folder selected.');
      return;
    }

    // 선택된 폴더의 경로를 가져온다.
    const folderPath = selectedFolder[0].fsPath;
    // src/main/java 경로를 생성한다.
    const baseJavaPath = path.join(folderPath, 'src', 'main', 'java');
    // 기본 패키지 이름을 가져온다.
    const defaultPackageName = vscode.workspace.getConfiguration('egovframeInitializr').get<string>('defaultPackageName', 'egovframework.example.sample');
    // 패키지 경로를 생성한다.
    const packagePath = defaultPackageName.replace(/\./g, path.sep);

    // 생성된 파일을 저장할 경로로 초기화한다.
    let targetPackagePath = folderPath;
    let targetMapperPath = folderPath;
    let targetJspPath = folderPath;
    let targetThymeleafPath = folderPath;
    let targetControllerPath = folderPath;
    let targetServicePath = folderPath;
    let targetServiceImplPath = folderPath;

    // 선택된 폴더에 src/main/java가 있는지 확인하고, 있다면 해당 경로를 사용한다.
    if (await fs.pathExists(baseJavaPath)) {
      targetPackagePath = path.join(baseJavaPath, packagePath);
      targetMapperPath = path.join(folderPath, 'src', 'main', 'resources', 'mappers');
      targetJspPath = path.join(folderPath, 'src', 'main', 'webapp', 'views');
      targetThymeleafPath = path.join(folderPath, 'src', 'main', 'resources', 'templates', 'thymeleaf');
      targetControllerPath = path.join(baseJavaPath, packagePath, 'web');
      targetServicePath = path.join(baseJavaPath, packagePath, 'service');
      targetServiceImplPath = path.join(baseJavaPath, packagePath, 'service', 'impl');
      await fs.ensureDir(targetPackagePath);
      await fs.ensureDir(targetMapperPath);
      await fs.ensureDir(targetJspPath);
      await fs.ensureDir(targetThymeleafPath);
      await fs.ensureDir(targetControllerPath);
      await fs.ensureDir(targetServicePath);
      await fs.ensureDir(targetServiceImplPath);
    }

    // 템플릿 파일의 경로를 정의한다.
    const templateFilePaths = {
      mapperTemplateFilePath: vscode.Uri.joinPath(context.extensionUri, 'templates', 'code', 'sample-mapper-template.hbs').fsPath,
      jspListTemplateFilePath: vscode.Uri.joinPath(context.extensionUri, 'templates', 'code', 'sample-jsp-list.hbs').fsPath,
      jspRegisterTemplateFilePath: vscode.Uri.joinPath(context.extensionUri, 'templates', 'code', 'sample-jsp-register.hbs').fsPath,
      thymeleafListTemplateFilePath: vscode.Uri.joinPath(context.extensionUri, 'templates', 'code', 'sample-thymeleaf-list.hbs').fsPath,
      thymeleafRegisterTemplateFilePath: vscode.Uri.joinPath(context.extensionUri, 'templates', 'code', 'sample-thymeleaf-register.hbs').fsPath,
      controllerTemplateFilePath: vscode.Uri.joinPath(context.extensionUri, 'templates', 'code', 'sample-controller-template.hbs').fsPath,
      serviceTemplateFilePath: vscode.Uri.joinPath(context.extensionUri, 'templates', 'code', 'sample-service-template.hbs').fsPath,
      defaultVoTemplateFilePath: vscode.Uri.joinPath(context.extensionUri, 'templates', 'code', 'sample-default-vo-template.hbs').fsPath,
      voTemplateFilePath: vscode.Uri.joinPath(context.extensionUri, 'templates', 'code', 'sample-vo-template.hbs').fsPath,
      serviceImplTemplateFilePath: vscode.Uri.joinPath(context.extensionUri, 'templates', 'code', 'sample-service-impl-template.hbs').fsPath,
      mapperInterfaceTemplateFilePath: vscode.Uri.joinPath(context.extensionUri, 'templates', 'code', 'sample-mapper-interface-template.hbs').fsPath,
      daoTemplateFilePath: vscode.Uri.joinPath(context.extensionUri, 'templates', 'code', 'sample-dao-template.hbs').fsPath
    };

    // DDL을 파싱하고, 템플릿 파일을 렌더링한다.
    try {
      // DDL을 파싱한다.
      const { tableName, attributes, pkAttributes } = parseDDL(ddl);

      // 렌더링된 템플릿 파일의 내용을 저장한다.
      const fileContents = {
        [`${tableName}_Mapper.xml`]: await renderTemplate(templateFilePaths.mapperTemplateFilePath, getTemplateContext(tableName, attributes, pkAttributes)),
        [`${tableName}List.jsp`]: await renderTemplate(templateFilePaths.jspListTemplateFilePath, getTemplateContext(tableName, attributes, pkAttributes)),
        [`${tableName}Register.jsp`]: await renderTemplate(templateFilePaths.jspRegisterTemplateFilePath, getTemplateContext(tableName, attributes, pkAttributes)),
        [`${tableName}List.html`]: await renderTemplate(templateFilePaths.thymeleafListTemplateFilePath, getTemplateContext(tableName, attributes, pkAttributes)),
        [`${tableName}Register.html`]: await renderTemplate(templateFilePaths.thymeleafRegisterTemplateFilePath, getTemplateContext(tableName, attributes, pkAttributes)),
        [`${tableName}Controller.java`]: await renderTemplate(templateFilePaths.controllerTemplateFilePath, getTemplateContext(tableName, attributes, pkAttributes)),
        [`${tableName}Service.java`]: await renderTemplate(templateFilePaths.serviceTemplateFilePath, getTemplateContext(tableName, attributes, pkAttributes)),
        [`${tableName}DefaultVO.java`]: await renderTemplate(templateFilePaths.defaultVoTemplateFilePath, getTemplateContext(tableName, attributes, pkAttributes)),
        [`${tableName}VO.java`]: await renderTemplate(templateFilePaths.voTemplateFilePath, getTemplateContext(tableName, attributes, pkAttributes)),
        [`${tableName}ServiceImpl.java`]: await renderTemplate(templateFilePaths.serviceImplTemplateFilePath, getTemplateContext(tableName, attributes, pkAttributes)),
        [`${tableName}Mapper.java`]: await renderTemplate(templateFilePaths.mapperInterfaceTemplateFilePath, getTemplateContext(tableName, attributes, pkAttributes)),
        [`${tableName}DAO.java`]: await renderTemplate(templateFilePaths.daoTemplateFilePath, getTemplateContext(tableName, attributes, pkAttributes))
      };

      // 파일 생성을 선택하는 다이얼로그를 표시한다.
      const filesToGenerate = Object.keys(fileContents).map(fileName => ({
        filePath: getFilePathForOutput(folderPath, tableName, fileName),
        content: fileContents[fileName],
      }));

      // 생성할 파일목록을 보여주고 선택한 파일을 반환한다.
      const selectedFilePaths = await showFileList(filesToGenerate);

      // 선택된 파일을 생성한다.
      for (const file of filesToGenerate) {
        if (selectedFilePaths.includes(file.filePath)) {
          await fs.outputFile(file.filePath, file.content);
        }
      }

      vscode.window.showInformationMessage('Selected files generated successfully.');
    } catch (error) {
      vscode.window.showErrorMessage(`Error: ${error instanceof Error ? error.message : 'An unknown error occurred.'}`);
    }
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

export function deactivate() {}
