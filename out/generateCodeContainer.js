"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(require("vscode"));
const fs = __importStar(require("fs-extra"));
const path = __importStar(require("path"));
const Handlebars = __importStar(require("handlebars"));
// 데이터베이스의 다양한 데이터 타입을 Java의 데이터 타입으로 매핑하는 기능을 제공하는 클래스
class DatabaseDefinition {
    predefinedDataTypes;
    constructor() {
        this.predefinedDataTypes = {
            'VARCHAR': 'java.lang.String',
            'CHAR': 'java.lang.String',
            'TEXT': 'java.lang.String',
            'INT': 'java.lang.Integer',
            'BIGINT': 'java.lang.Long',
            'SMALLINT': 'java.lang.Short',
            'TINYINT': 'java.lang.Byte',
            'DECIMAL': 'java.math.BigDecimal',
            'NUMERIC': 'java.math.BigDecimal',
            'FLOAT': 'java.lang.Float',
            'REAL': 'java.lang.Double',
            'DOUBLE': 'java.lang.Double',
            'DATE': 'java.sql.Date',
            'TIME': 'java.sql.Time',
            'DATETIME': 'java.util.Date',
            'TIMESTAMP': 'java.sql.Timestamp',
            'BOOLEAN': 'java.lang.Boolean',
            'BIT': 'java.lang.Boolean',
            'MEDIUMTEXT': 'java.lang.String'
        };
    }
    getPredefinedDataTypeDefinition(dataType) {
        return this.predefinedDataTypes[dataType.toUpperCase()] || 'java.lang.Object';
    }
}
// 데이터베이스 데이터 타입을 Java 타입으로 변환하는 함수
function getJavaClassName(dataType) {
    const databaseDefinition = new DatabaseDefinition();
    return databaseDefinition.getPredefinedDataTypeDefinition(dataType);
}
function convertCamelcaseToPascalcase(name) {
    if (!name || name.length === 0) {
        return name;
    }
    return name.charAt(0).toUpperCase() + name.slice(1);
}
function convertToCamelCase(str) {
    if (str.includes('_')) {
        return convertUnderscoreNameToCamelcase(str);
    }
    else {
        return toCamelCase(str);
    }
}
function toCamelCase(str) {
    if (str === str.toUpperCase()) {
        return str.toLowerCase();
    }
    return str.charAt(0).toLowerCase() + str.slice(1);
}
function convertUnderscoreNameToCamelcase(name) {
    let result = '';
    let nextIsUpper = false;
    if (name && name.length > 0) {
        if (name.length > 1 && name.charAt(1) === '_') {
            result += name.charAt(0).toUpperCase();
        }
        else {
            result += name.charAt(0).toLowerCase();
        }
        for (let i = 1; i < name.length; i++) {
            const s = name.charAt(i);
            if (s === '_') {
                nextIsUpper = true;
            }
            else {
                if (nextIsUpper) {
                    result += s.toUpperCase();
                    nextIsUpper = false;
                }
                else {
                    result += s.toLowerCase();
                }
            }
        }
    }
    return result;
}
// DDL 파싱 함수
function parseDDL(ddl) {
    ddl = ddl.replace(/\s+/g, ' ');
    const tableNameMatch = ddl.match(/CREATE TABLE (\w+)/i);
    if (!tableNameMatch) {
        throw new Error('Unable to parse table name from DDL');
    }
    const tableName = convertCamelcaseToPascalcase(tableNameMatch[1].toLowerCase());
    const columnDefinitionsMatch = ddl.match(/\((.*)\)/);
    if (!columnDefinitionsMatch) {
        throw new Error('Unable to parse column definitions from DDL');
    }
    const columnDefinitions = columnDefinitionsMatch[1];
    const columnsArray = columnDefinitions.split(/,(?![^\(]*\))/).map(column => column.trim());
    const attributes = [];
    const pkAttributes = [];
    columnsArray.forEach(columnDef => {
        const parts = columnDef.split(' ');
        const columnName = parts[0];
        const rawDataType = parts[1];
        const dataType = rawDataType.match(/^\w+/)?.[0] || rawDataType;
        const isPrimaryKey = columnDef.includes('PRIMARY KEY');
        const ccName = convertToCamelCase(columnName);
        const column = {
            ccName: ccName,
            columnName,
            isPrimaryKey,
            pcName: convertCamelcaseToPascalcase(ccName),
            dataType: dataType,
            javaType: getJavaClassName(dataType)
        };
        attributes.push(column);
        if (isPrimaryKey) {
            pkAttributes.push(column);
        }
    });
    return { tableName, attributes, pkAttributes };
}
// TemplateContext 생성 함수
function getTemplateContext(tableName, attributes, pkAttributes) {
    const config = vscode.workspace.getConfiguration('egovframeInitializr');
    const defaultPackageName = config.get('defaultPackageName', 'egovframework.example.sample');
    return {
        namespace: `${defaultPackageName}.service.impl.${tableName}Mapper`,
        resultMapId: `${tableName}`,
        resultMapType: `${defaultPackageName}.service.${tableName}VO`,
        tableName,
        attributes,
        pkAttributes,
        parameterType: `${defaultPackageName}.service.${tableName}VO`,
        resultType: 'egovMap',
        sortOrder: 'SORT_ORDR',
        searchKeyword: '',
        searchCondition: 0,
        packageName: `${defaultPackageName}`,
        className: `${tableName}`,
        classNameFirstCharLower: `${tableName[0].toLowerCase()}${tableName.slice(1)}`,
        author: 'author',
        date: new Date().toISOString().split('T')[0],
        version: '1.0.0'
    };
}
async function renderTemplate(templateFilePath, context) {
    const template = await fs.readFile(templateFilePath, 'utf-8');
    const compiledTemplate = Handlebars.compile(template);
    return compiledTemplate(context);
}
function getFilePathForOutput(folderPath, tableName, fileName) {
    const baseJavaPath = path.join(folderPath, 'src', 'main', 'java');
    const defaultPackageName = vscode.workspace.getConfiguration('egovframeInitializr').get('defaultPackageName', 'egovframework.example.sample');
    const packagePath = defaultPackageName.replace(/\./g, path.sep);
    let outputPath = path.join(folderPath, fileName);
    if (fs.existsSync(baseJavaPath)) {
        if (fileName.endsWith('_Mapper.xml')) {
            outputPath = path.join(folderPath, 'src', 'main', 'resources', 'mappers', fileName);
        }
        else if (fileName.endsWith('Controller.java')) {
            outputPath = path.join(baseJavaPath, packagePath, 'web', fileName);
        }
        else if (fileName.endsWith('Service.java') || fileName.endsWith('VO.java') || fileName.endsWith('DefaultVO.java')) {
            outputPath = path.join(baseJavaPath, packagePath, 'service', fileName);
        }
        else if (fileName.endsWith('ServiceImpl.java') || fileName.endsWith('Mapper.java') || fileName.endsWith('DAO.java')) {
            outputPath = path.join(baseJavaPath, packagePath, 'service', 'impl', fileName);
        }
        else if (fileName.endsWith('.jsp')) {
            outputPath = path.join(folderPath, 'src', 'main', 'webapp', 'views', fileName);
        }
        else if (fileName.endsWith('.html')) {
            outputPath = path.join(folderPath, 'src', 'main', 'resources', 'templates', 'thymeleaf', fileName);
        }
    }
    return outputPath;
}
function activate(context) {
    const myWebviewProvider = new MyWebviewViewProvider(context);
    context.subscriptions.push(vscode.window.registerWebviewViewProvider('egovframeCodeView', myWebviewProvider));
    // 명령어를 등록하여 Sidebar Toolbar 아이콘 클릭 시 웹뷰로 메시지를 보냄
    context.subscriptions.push(vscode.commands.registerCommand('extension.insertSampleDDL', () => {
        myWebviewProvider.insertSampleDDL();
    }));
}
//사용자가 DDL을 입력할 수 있는 웹 인터페이스를 제공한다.
class MyWebviewViewProvider {
    context;
    webviewView;
    constructor(context) {
        this.context = context;
        console.log('MyWebviewViewProvider constructor called');
    }
    resolveWebviewView(webviewView, context, token) {
        this.webviewView = webviewView;
        webviewView.webview.options = {
            enableScripts: true,
        };
        webviewView.webview.html = this.getHtmlForWebview(webviewView.webview);
        webviewView.webview.onDidReceiveMessage(async (message) => {
            const ddl = message.ddl;
            switch (message.command) {
                case 'generateCode':
                    await this.generateCode(ddl);
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
    insertSampleDDL() {
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
    getHtmlForWebview(webview) {
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
    async generateCode(ddl) {
        const selectedFolder = await vscode.window.showOpenDialog({
            title: 'Select Folder to Save Generated Files',
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
            const templateContext = getTemplateContext(tableName, attributes, pkAttributes);
            const filesToGenerate = {
                [`${tableName}_Mapper.xml`]: await renderTemplate(path.join(this.context.extensionUri.fsPath, 'templates', 'code', 'sample-mapper-template.hbs'), templateContext),
                [`${tableName}List.jsp`]: await renderTemplate(path.join(this.context.extensionUri.fsPath, 'templates', 'code', 'sample-jsp-list.hbs'), templateContext),
                [`${tableName}Register.jsp`]: await renderTemplate(path.join(this.context.extensionUri.fsPath, 'templates', 'code', 'sample-jsp-register.hbs'), templateContext),
                [`${tableName}List.html`]: await renderTemplate(path.join(this.context.extensionUri.fsPath, 'templates', 'code', 'sample-thymeleaf-list.hbs'), templateContext),
                [`${tableName}Register.html`]: await renderTemplate(path.join(this.context.extensionUri.fsPath, 'templates', 'code', 'sample-thymeleaf-register.hbs'), templateContext),
                [`${tableName}Controller.java`]: await renderTemplate(path.join(this.context.extensionUri.fsPath, 'templates', 'code', 'sample-controller-template.hbs'), templateContext),
                [`${tableName}Service.java`]: await renderTemplate(path.join(this.context.extensionUri.fsPath, 'templates', 'code', 'sample-service-template.hbs'), templateContext),
                [`${tableName}DefaultVO.java`]: await renderTemplate(path.join(this.context.extensionUri.fsPath, 'templates', 'code', 'sample-default-vo-template.hbs'), templateContext),
                [`${tableName}VO.java`]: await renderTemplate(path.join(this.context.extensionUri.fsPath, 'templates', 'code', 'sample-vo-template.hbs'), templateContext),
                [`${tableName}ServiceImpl.java`]: await renderTemplate(path.join(this.context.extensionUri.fsPath, 'templates', 'code', 'sample-service-impl-template.hbs'), templateContext),
                [`${tableName}Mapper.java`]: await renderTemplate(path.join(this.context.extensionUri.fsPath, 'templates', 'code', 'sample-mapper-interface-template.hbs'), templateContext),
                [`${tableName}DAO.java`]: await renderTemplate(path.join(this.context.extensionUri.fsPath, 'templates', 'code', 'sample-dao-template.hbs'), templateContext)
            };
            for (const fileName in filesToGenerate) {
                const filePath = getFilePathForOutput(folderPath, tableName, fileName);
                await fs.outputFile(filePath, filesToGenerate[fileName]);
            }
            vscode.window.showInformationMessage('Selected files generated successfully.');
        }
        catch (error) {
            if (error instanceof Error) {
                vscode.window.showErrorMessage(`Error: ${error.message}`);
            }
            else {
                vscode.window.showErrorMessage('An unknown error occurred.');
            }
        }
    }
    async uploadTemplates(ddl) {
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
            }
            catch (error) {
                if (error instanceof Error) {
                    vscode.window.showErrorMessage(`Error: ${error.message}`);
                }
                else {
                    vscode.window.showErrorMessage('An unknown error occurred.');
                }
            }
        }
    }
    async downloadTemplateContext(ddl) {
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
        }
        catch (error) {
            if (error instanceof Error) {
                vscode.window.showErrorMessage(`Error: ${error.message}`);
            }
            else {
                vscode.window.showErrorMessage('An unknown error occurred.');
            }
        }
    }
}
function getNonce() {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < 32; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}
function deactivate() { }
//# sourceMappingURL=generateCodeContainer.js.map