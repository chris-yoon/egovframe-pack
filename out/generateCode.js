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
const Handlebars = __importStar(require("handlebars"));
const path = __importStar(require("path"));
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
// DatabaseDefinition 클래스를 이용해 데이터베이스 데이터 타입을 Java 타입으로 변환한다.
function getJavaClassName(dataType) {
    const databaseDefinition = new DatabaseDefinition();
    return databaseDefinition.getPredefinedDataTypeDefinition(dataType);
}
// Handlebars 헬퍼 등록
Handlebars.registerHelper('empty', function (value) {
    return value === null || value === '';
});
Handlebars.registerHelper('eq', function (a, b) {
    return a === b;
});
Handlebars.registerHelper('hasError', function (fieldName) {
    // 에러가 있는지 확인하는 로직을 추가
    // 이 예에서는 항상 false를 반환
    return false;
});
Handlebars.registerHelper("setVar", function (varName, varValue, options) {
    options.data.root[varName] = varValue;
});
Handlebars.registerHelper('concat', function (...args) {
    // 마지막 인자는 options 객체이므로, 이를 제거하고 나머지 인자들을 합칩니다.
    return args.slice(0, -1).join('');
});
// 생성된 파일 목록을 사용자에게 보여주고, 생성할 파일을 선택하도록 한다.
async function showFileList(files) {
    const quickPickItems = files.map(file => ({
        label: path.basename(file.filePath), // Show the filename first
        description: file.filePath.replace(vscode.workspace.rootPath || '', ''), // Show the relative folder path
        filePath: file.filePath,
        picked: true
    }));
    const selectedItems = await vscode.window.showQuickPick(quickPickItems, {
        canPickMany: true,
        placeHolder: 'Select the files to be generated'
    });
    if (!selectedItems) {
        vscode.window.showErrorMessage('No files selected.');
        return [];
    }
    return selectedItems.map(item => item.filePath);
}
// 이 함수는 VSCode 확장이 활성화될 때 호출된다.
function activate(context) {
    // generateCode 명령: 사용자가 DDL을 입력하면, 이를 파싱하여 템플릿 파일을 렌더링하고 파일을 생성한다.
    let generateCodeDisposable = vscode.commands.registerCommand('extension.generateCode', async () => {
        const editor = vscode.window.activeTextEditor;
        let ddl = editor?.document.getText(editor.selection);
        if (!ddl) {
            ddl = await showDDLInputWebview(context);
            if (!ddl) {
                vscode.window.showErrorMessage('No DDL statement provided.');
                return;
            }
        }
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
        const baseJavaPath = path.join(folderPath, 'src', 'main', 'java');
        const defaultPackageName = vscode.workspace.getConfiguration('egovframeInitializr').get('defaultPackageName', 'egovframework.example.sample');
        const packagePath = defaultPackageName.replace(/\./g, path.sep);
        let targetPackagePath = folderPath;
        let targetMapperPath = folderPath;
        let targetJspPath = folderPath;
        let targetThymeleafPath = folderPath;
        let targetControllerPath = folderPath;
        let targetServicePath = folderPath;
        let targetServiceImplPath = folderPath;
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
        try {
            const { tableName, attributes, pkAttributes } = parseDDL(ddl);
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
            const filesToGenerate = Object.keys(fileContents).map(fileName => ({
                filePath: getFilePathForOutput(folderPath, tableName, fileName),
                content: fileContents[fileName],
            }));
            const selectedFilePaths = await showFileList(filesToGenerate);
            for (const file of filesToGenerate) {
                if (selectedFilePaths.includes(file.filePath)) {
                    await fs.outputFile(file.filePath, file.content);
                }
            }
            vscode.window.showInformationMessage('Selected files generated successfully.');
        }
        catch (error) {
            vscode.window.showErrorMessage(`Error: ${error instanceof Error ? error.message : 'An unknown error occurred.'}`);
        }
    });
    context.subscriptions.push(generateCodeDisposable);
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
// renderTemplate 함수는 Handlebars를 사용하여 템플릿을 렌더링한다.
async function renderTemplate(templateFilePath, context) {
    const templateContent = await fs.readFile(templateFilePath, 'utf-8');
    const template = Handlebars.compile(templateContent);
    return template(context);
}
// showDDLInputWebview 함수: 사용자가 DDL을 입력할 수 있는 Webview를 제공한다.
async function showDDLInputWebview(context) {
    const panel = vscode.window.createWebviewPanel('ddlInput', // panel의 identifier
    'Input DDL Statement', // panel의 title
    vscode.ViewColumn.One, // panel의 위치
    {
        enableScripts: true, // scripts를 사용할 수 있도록 설정
    });
    panel.webview.html = getDDLInputHtml(); // DDL 입력 Webview에 표시할 HTML
    return new Promise((resolve) => {
        panel.webview.onDidReceiveMessage(// Webview의 메시지를 수신하는 함수
        // Webview의 메시지를 수신하는 함수
        message => {
            if (message.command === 'submitDDL') { // 'submitDDL' 메시지를 받은 경우
                resolve(message.ddl); // DDL를 반환하고 Webview를 종료합니다.
                panel.dispose();
            }
            else if (message.command === 'cancel') { // 'cancel' 메시지를 받은 경우
                resolve(undefined); // undefined을 반환하고 Webview를 종료합니다. 
                panel.dispose();
            }
        }, undefined, context.subscriptions);
    });
}
// getDDLInputHtml 함수는 DDL 입력 Webview의 HTML를 생성하는 함수입니다.
// acquireVsCodeApi 함수는 VS Code의 API를 가져오는 함수입니다.
// vscode.postMessage 함수는 VS Code의 메시지 전달 함수로 command와 data를 메시지로 전달합니다.
function getDDLInputHtml() {
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
// 기타 도우미 함수들: getTemplateContext, parseDDL 등...
// generates a context object for the template based on the provided tableName, attributes, and pkAttributes
function getTemplateContext(tableName, attributes, pkAttributes) {
    const config = vscode.workspace.getConfiguration('egovframeInitializr'); // vs code extension의 설정을 가져오는 함수
    const defaultPackageName = config.get('defaultPackageName', 'egovframework.example.sample'); // default package name
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
// DDL를 parsing하는 함수
function parseDDL(ddl) {
    // Normalize the input by replacing multiple spaces with a single space
    ddl = ddl.replace(/\s+/g, ' ');
    const tableNameMatch = ddl.match(/CREATE TABLE (\w+)/); // table name를 찾는 함수
    if (!tableNameMatch) {
        throw new Error('Unable to parse table name from DDL');
    }
    var tableName = convertCamelcaseToPascalcase(tableNameMatch[1].toLowerCase()); // table name를 Pascal Case로 변환
    const columnDefinitionsMatch = ddl.match(/\((.*)\)/); // column definitions를 찾는 함수
    if (!columnDefinitionsMatch) {
        throw new Error('Unable to parse column definitions from DDL');
    }
    const columnDefinitions = columnDefinitionsMatch[1];
    const columnsArray = columnDefinitions.split(/,(?![^\(]*\))/).map(column => column.trim());
    const attributes = [];
    const pkAttributes = [];
    // Parse each column definition and create a Column object
    columnsArray.map(columnDef => {
        const parts = columnDef.split(' ');
        const columnName = parts[0];
        const rawDataType = parts[1];
        const dataType = rawDataType.match(/^\w+/)?.[0] || rawDataType;
        const isPrimaryKey = columnDef.includes('PRIMARY KEY');
        const ccName = convertToCamelCase(columnName);
        const column = {
            ccName,
            columnName,
            isPrimaryKey,
            pcName: convertCamelcaseToPascalcase(ccName),
            dataType,
            javaType: getJavaClassName(dataType)
        };
        attributes.push(column);
        if (isPrimaryKey) {
            pkAttributes.push(column);
        }
    });
    return { tableName, attributes, pkAttributes };
}
// camel case를 pascal case로 변환하는 함수
function convertCamelcaseToPascalcase(name) {
    if (!name || name.length === 0) { // name이 비어있으면 그대로 반환
        return name;
    }
    return name.charAt(0).toUpperCase() + name.slice(1); // 첫 글자를 대문자로 변환하고 나머지 글자를 그대로 반환
}
// camel case로 변환하는 함수
function convertToCamelCase(str) {
    if (str.includes('_')) { // '_'가 포함되어 있으면 '_'를 기준으로 나누고 각 단어의 첫 글자를 대문자로 변환한 뒤 합침
        return convertUnderscoreNameToCamelcase(str);
    }
    else {
        return toCamelCase(str);
    }
}
// 모든 글자가 대문자이면 소문자로 변환하고, 그렇지 않으면 첫 글자를 소문자로 변환하고 나머지 글자를 그대로 반환
function toCamelCase(str) {
    if (str === str.toUpperCase()) {
        return str.toLowerCase();
    }
    return str.charAt(0).toLowerCase() + str.slice(1);
}
// '_'를 기준으로 나누고 각 단어의 첫 글자를 대문자로 변환한 뒤 합침
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
function deactivate() { }
//# sourceMappingURL=generateCode.js.map