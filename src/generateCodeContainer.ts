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

export function activate(context: vscode.ExtensionContext) {
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
          await this.generateCode(ddl, this.context);
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

  private async generateCode(ddl: string, context: vscode.ExtensionContext) {
    // 사용자에게 생성된 파일을 저장할 폴더를 선택하도록 한다.
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

export function deactivate() {}
