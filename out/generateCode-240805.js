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
function activate(context) {
    let disposable = vscode.commands.registerCommand('extension.generateCode', async () => {
        const ddl = await vscode.window.showInputBox({
            prompt: 'Enter DDL statement',
            placeHolder: 'CREATE TABLE ...'
        });
        if (!ddl) {
            vscode.window.showErrorMessage('DDL statement is required');
            return;
        }
        const selectedFolder = await vscode.window.showOpenDialog({
            title: 'Select Folder to Save Generated Mapper File',
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
            // Ensure the target package path exists
            await fs.ensureDir(targetPackagePath);
            await fs.ensureDir(targetMapperPath);
            await fs.ensureDir(targetJspPath);
            await fs.ensureDir(targetThymeleafPath);
            await fs.ensureDir(targetControllerPath);
            await fs.ensureDir(targetServicePath);
            await fs.ensureDir(targetServiceImplPath);
        }
        const mapperTemplateFilePath = vscode.Uri.joinPath(context.extensionUri, 'templates', 'sample-mapper-template.vm').fsPath;
        const jspListTemplateFilePath = vscode.Uri.joinPath(context.extensionUri, 'templates', 'sample-jsp-list.vm').fsPath;
        const jspRegisterTemplateFilePath = vscode.Uri.joinPath(context.extensionUri, 'templates', 'sample-jsp-register.vm').fsPath;
        const thymeleafListTemplateFilePath = vscode.Uri.joinPath(context.extensionUri, 'templates', 'sample-thymeleaf-list.vm').fsPath;
        const thymeleafRegisterTemplateFilePath = vscode.Uri.joinPath(context.extensionUri, 'templates', 'sample-thymeleaf-register.vm').fsPath;
        const controllerTemplateFilePath = vscode.Uri.joinPath(context.extensionUri, 'templates', 'sample-controller-template.vm').fsPath;
        const serviceTemplateFilePath = vscode.Uri.joinPath(context.extensionUri, 'templates', 'sample-service-template.vm').fsPath;
        const defaultVoTemplateFilePath = vscode.Uri.joinPath(context.extensionUri, 'templates', 'sample-default-vo-template.vm').fsPath;
        const voTemplateFilePath = vscode.Uri.joinPath(context.extensionUri, 'templates', 'sample-vo-template.vm').fsPath;
        const serviceImplTemplateFilePath = vscode.Uri.joinPath(context.extensionUri, 'templates', 'sample-service-impl-template.vm').fsPath;
        const mapperInterfaceTemplateFilePath = vscode.Uri.joinPath(context.extensionUri, 'templates', 'sample-mapper-interface-template.vm').fsPath;
        const daoTemplateFilePath = vscode.Uri.joinPath(context.extensionUri, 'templates', 'sample-dao-template.vm').fsPath;
        try {
            const { tableName, attributes, pkAttributes } = parseDDL(ddl);
            const outputMapperFilePath = vscode.Uri.joinPath(vscode.Uri.file(targetMapperPath), `${tableName}_Mapper.xml`).fsPath;
            const outputJspListFilePath = vscode.Uri.joinPath(vscode.Uri.file(targetJspPath), `${tableName}List.jsp`).fsPath;
            const outputJspRegisterFilePath = vscode.Uri.joinPath(vscode.Uri.file(targetJspPath), `${tableName}Register.jsp`).fsPath;
            const outputThymeleafListFilePath = vscode.Uri.joinPath(vscode.Uri.file(targetThymeleafPath), `${tableName}List.html`).fsPath;
            const outputThymeleafRegisterFilePath = vscode.Uri.joinPath(vscode.Uri.file(targetThymeleafPath), `${tableName}Register.html`).fsPath;
            const outputControllerFilePath = vscode.Uri.joinPath(vscode.Uri.file(targetControllerPath), `${tableName}Controller.java`).fsPath;
            const outputServiceFilePath = vscode.Uri.joinPath(vscode.Uri.file(targetServicePath), `${tableName}Service.java`).fsPath;
            const outputDefaultVoFilePath = vscode.Uri.joinPath(vscode.Uri.file(targetServicePath), `${tableName}DefaultVO.java`).fsPath;
            const outputVoFilePath = vscode.Uri.joinPath(vscode.Uri.file(targetServicePath), `${tableName}VO.java`).fsPath;
            const outputServiceImplFilePath = vscode.Uri.joinPath(vscode.Uri.file(targetServiceImplPath), `${tableName}ServiceImpl.java`).fsPath;
            const outputMapperInterfaceImplFilePath = vscode.Uri.joinPath(vscode.Uri.file(targetServiceImplPath), `${tableName}Mapper.java`).fsPath;
            const outputDaoImplFilePath = vscode.Uri.joinPath(vscode.Uri.file(targetServiceImplPath), `${tableName}DAO.java`).fsPath;
            const context = {
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
            await generateFile(context, mapperTemplateFilePath, outputMapperFilePath);
            await generateFile(context, jspListTemplateFilePath, outputJspListFilePath);
            await generateFile(context, jspRegisterTemplateFilePath, outputJspRegisterFilePath);
            await generateFile(context, thymeleafListTemplateFilePath, outputThymeleafListFilePath);
            await generateFile(context, thymeleafRegisterTemplateFilePath, outputThymeleafRegisterFilePath);
            await generateFile(context, controllerTemplateFilePath, outputControllerFilePath);
            await generateFile(context, serviceTemplateFilePath, outputServiceFilePath);
            await generateFile(context, defaultVoTemplateFilePath, outputDefaultVoFilePath);
            await generateFile(context, voTemplateFilePath, outputVoFilePath);
            await generateFile(context, serviceImplTemplateFilePath, outputServiceImplFilePath);
            await generateFile(context, mapperInterfaceTemplateFilePath, outputMapperInterfaceImplFilePath);
            await generateFile(context, daoTemplateFilePath, outputDaoImplFilePath);
            vscode.window.showInformationMessage(`Mapper file generated successfully at ${outputMapperFilePath}`);
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
async function generateFile(context, templateFilePath, outputFilePath) {
    try {
        const template = await fs.readFile(templateFilePath, 'utf-8');
        const renderedContent = (0, velocityjs_1.render)(template, context);
        await fs.writeFile(outputFilePath, renderedContent);
    }
    catch (error) {
        if (error instanceof Error) {
            throw new Error('Error generating file: ' + error.message);
        }
        else {
            throw new Error('An unknown error occurred while generating the mapper file.');
        }
    }
}
function deactivate() { }
//# sourceMappingURL=generateCode-240805.js.map