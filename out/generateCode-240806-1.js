"use strict";
// DDL 입력 방식을 Active Editor 에서 선택한 DDL 텍스트를 기반하여 Context Menu() 또는 키보드 단축키(Ctrl+Shift+g)를 사용하여 코드를 생성합니다.
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
const velocityjs_1 = require("velocityjs");
const path = __importStar(require("path"));
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
            // Add more mappings as needed
        };
    }
    getPredefinedDataTypeDefinition(dataType) {
        return this.predefinedDataTypes[dataType.toUpperCase()] || 'java.lang.Object';
    }
}
function getJavaClassName(dataType) {
    const databaseDefinition = new DatabaseDefinition();
    return databaseDefinition.getPredefinedDataTypeDefinition(dataType);
}
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
function activate(context) {
    let disposable = vscode.commands.registerCommand('extension.generateCode', async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showErrorMessage('No active text editor found.');
            return;
        }
        const ddl = editor.document.getText(editor.selection);
        if (!ddl) {
            vscode.window.showErrorMessage('No DDL statement selected.');
            return;
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
        let targetPackagePath = folderPath;
        let targetMapperPath = folderPath;
        let targetJspPath = folderPath;
        let targetThymeleafPath = folderPath;
        let targetControllerPath = folderPath;
        let targetServicePath = folderPath;
        let targetServiceImplPath = folderPath;
        if (await fs.pathExists(baseJavaPath)) {
            targetPackagePath = path.join(baseJavaPath, 'egovframework', 'example', 'sample');
            targetMapperPath = path.join(folderPath, 'src', 'main', 'resources', 'mappers');
            targetJspPath = path.join(folderPath, 'src', 'main', 'webapp', 'views');
            targetThymeleafPath = path.join(folderPath, 'src', 'main', 'resources', 'templates', 'thymeleaf');
            targetControllerPath = path.join(baseJavaPath, 'egovframework', 'example', 'sample', 'web');
            targetServicePath = path.join(baseJavaPath, 'egovframework', 'example', 'sample', 'service');
            targetServiceImplPath = path.join(baseJavaPath, 'egovframework', 'example', 'sample', 'service', 'impl');
            await fs.ensureDir(targetPackagePath);
            await fs.ensureDir(targetMapperPath);
            await fs.ensureDir(targetJspPath);
            await fs.ensureDir(targetThymeleafPath);
            await fs.ensureDir(targetControllerPath);
            await fs.ensureDir(targetServicePath);
            await fs.ensureDir(targetServiceImplPath);
        }
        const templateFilePaths = {
            mapperTemplateFilePath: vscode.Uri.joinPath(context.extensionUri, 'templates', 'sample-mapper-template.vm').fsPath,
            jspListTemplateFilePath: vscode.Uri.joinPath(context.extensionUri, 'templates', 'sample-jsp-list.vm').fsPath,
            jspRegisterTemplateFilePath: vscode.Uri.joinPath(context.extensionUri, 'templates', 'sample-jsp-register.vm').fsPath,
            thymeleafListTemplateFilePath: vscode.Uri.joinPath(context.extensionUri, 'templates', 'sample-thymeleaf-list.vm').fsPath,
            thymeleafRegisterTemplateFilePath: vscode.Uri.joinPath(context.extensionUri, 'templates', 'sample-thymeleaf-register.vm').fsPath,
            controllerTemplateFilePath: vscode.Uri.joinPath(context.extensionUri, 'templates', 'sample-controller-template.vm').fsPath,
            serviceTemplateFilePath: vscode.Uri.joinPath(context.extensionUri, 'templates', 'sample-service-template.vm').fsPath,
            defaultVoTemplateFilePath: vscode.Uri.joinPath(context.extensionUri, 'templates', 'sample-default-vo-template.vm').fsPath,
            voTemplateFilePath: vscode.Uri.joinPath(context.extensionUri, 'templates', 'sample-vo-template.vm').fsPath,
            serviceImplTemplateFilePath: vscode.Uri.joinPath(context.extensionUri, 'templates', 'sample-service-impl-template.vm').fsPath,
            mapperInterfaceTemplateFilePath: vscode.Uri.joinPath(context.extensionUri, 'templates', 'sample-mapper-interface-template.vm').fsPath,
            daoTemplateFilePath: vscode.Uri.joinPath(context.extensionUri, 'templates', 'sample-dao-template.vm').fsPath
        };
        try {
            const { tableName, attributes, pkAttributes } = parseDDL(ddl);
            const fileContents = {
                [`${tableName}_Mapper.xml`]: await renderTemplate(templateFilePaths.mapperTemplateFilePath, {
                    ...getTemplateContext(tableName, attributes, pkAttributes)
                }),
                [`${tableName}List.jsp`]: await renderTemplate(templateFilePaths.jspListTemplateFilePath, {
                    ...getTemplateContext(tableName, attributes, pkAttributes)
                }),
                [`${tableName}Register.jsp`]: await renderTemplate(templateFilePaths.jspRegisterTemplateFilePath, {
                    ...getTemplateContext(tableName, attributes, pkAttributes)
                }),
                [`${tableName}List.html`]: await renderTemplate(templateFilePaths.thymeleafListTemplateFilePath, {
                    ...getTemplateContext(tableName, attributes, pkAttributes)
                }),
                [`${tableName}Register.html`]: await renderTemplate(templateFilePaths.thymeleafRegisterTemplateFilePath, {
                    ...getTemplateContext(tableName, attributes, pkAttributes)
                }),
                [`${tableName}Controller.java`]: await renderTemplate(templateFilePaths.controllerTemplateFilePath, {
                    ...getTemplateContext(tableName, attributes, pkAttributes)
                }),
                [`${tableName}Service.java`]: await renderTemplate(templateFilePaths.serviceTemplateFilePath, {
                    ...getTemplateContext(tableName, attributes, pkAttributes)
                }),
                [`${tableName}DefaultVO.java`]: await renderTemplate(templateFilePaths.defaultVoTemplateFilePath, {
                    ...getTemplateContext(tableName, attributes, pkAttributes)
                }),
                [`${tableName}VO.java`]: await renderTemplate(templateFilePaths.voTemplateFilePath, {
                    ...getTemplateContext(tableName, attributes, pkAttributes)
                }),
                [`${tableName}ServiceImpl.java`]: await renderTemplate(templateFilePaths.serviceImplTemplateFilePath, {
                    ...getTemplateContext(tableName, attributes, pkAttributes)
                }),
                [`${tableName}Mapper.java`]: await renderTemplate(templateFilePaths.mapperInterfaceTemplateFilePath, {
                    ...getTemplateContext(tableName, attributes, pkAttributes)
                }),
                [`${tableName}DAO.java`]: await renderTemplate(templateFilePaths.daoTemplateFilePath, {
                    ...getTemplateContext(tableName, attributes, pkAttributes)
                })
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
            if (error instanceof Error) {
                vscode.window.showErrorMessage(`Error: ${error.message}`);
            }
            else {
                vscode.window.showErrorMessage('An unknown error occurred.');
            }
        }
    });
    context.subscriptions.push(disposable);
}
function getFilePathForOutput(folderPath, tableName, fileName) {
    const baseJavaPath = path.join(folderPath, 'src', 'main', 'java');
    let outputPath = path.join(folderPath, fileName);
    if (fs.existsSync(baseJavaPath)) {
        if (fileName.endsWith('_Mapper.xml')) {
            outputPath = path.join(folderPath, 'src', 'main', 'resources', 'mappers', fileName);
        }
        else if (fileName.endsWith('Controller.java')) {
            outputPath = path.join(baseJavaPath, 'egovframework', 'example', 'sample', 'web', fileName);
        }
        else if (fileName.endsWith('Service.java') || fileName.endsWith('VO.java') || fileName.endsWith('DefaultVO.java')) {
            outputPath = path.join(baseJavaPath, 'egovframework', 'example', 'sample', 'service', fileName);
        }
        else if (fileName.endsWith('ServiceImpl.java') || fileName.endsWith('Mapper.java') || fileName.endsWith('DAO.java')) {
            outputPath = path.join(baseJavaPath, 'egovframework', 'example', 'sample', 'service', 'impl', fileName);
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
async function renderTemplate(templateFilePath, context) {
    const template = await fs.readFile(templateFilePath, 'utf-8');
    return (0, velocityjs_1.render)(template, context);
}
function getTemplateContext(tableName, attributes, pkAttributes) {
    return {
        namespace: `egovframework.example.sample.service.impl.${tableName}Mapper`,
        resultMapId: `${tableName}`,
        resultMapType: `egovframework.example.sample.service.${tableName}VO`,
        tableName,
        attributes,
        pkAttributes,
        parameterType: `egovframework.example.sample.service.${tableName}VO`,
        resultType: 'egovMap',
        sortOrder: 'SORT_ORDR',
        searchKeyword: '',
        searchCondition: 0,
        packageName: 'egovframework.example.sample',
        className: `${tableName}`,
        classNameFirstCharLower: `${tableName[0].toLowerCase()}${tableName.slice(1)}`,
        author: 'author',
        date: new Date().toISOString().split('T')[0],
        version: '1.0.0'
    };
}
function parseDDL(ddl) {
    // Normalize the input by replacing multiple spaces with a single space
    ddl = ddl.replace(/\s+/g, ' ');
    const tableNameMatch = ddl.match(/CREATE TABLE (\w+)/);
    if (!tableNameMatch) {
        throw new Error('Unable to parse table name from DDL');
    }
    var tableName = convertCamelcaseToPascalcase(tableNameMatch[1].toLowerCase());
    // Extract the column definitions
    const columnDefinitionsMatch = ddl.match(/\((.*)\)/);
    if (!columnDefinitionsMatch) {
        throw new Error('Unable to parse column definitions from DDL');
    }
    const columnDefinitions = columnDefinitionsMatch[1];
    // Split the column definitions by commas, ensuring not to split inside parentheses
    const columnsArray = columnDefinitions.split(/,(?![^\(]*\))/).map(column => column.trim());
    const attributes = [];
    const pkAttributes = [];
    columnsArray.map(columnDef => {
        const parts = columnDef.split(' ');
        const columnName = parts[0];
        const rawDataType = parts[1];
        const dataType = rawDataType.match(/^\w+/)?.[0] || rawDataType; // Extract the base type (e.g., CHAR from CHAR(30))
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
    // Check if all characters are uppercase
    if (str === str.toUpperCase()) {
        return str.toLowerCase();
    }
    // Convert the first character to lowercase
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
function deactivate() { }
//# sourceMappingURL=generateCode-240806-1.js.map