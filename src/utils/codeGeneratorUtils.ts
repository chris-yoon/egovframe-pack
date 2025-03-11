import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs-extra';
import * as Handlebars from 'handlebars';
import { registerHandlebarsHelpers } from "./handlebarHelpers";
import { parseDDL } from './ddlParser';

// Register common Handlebars helpers
registerHandlebarsHelpers();

// 데이터베이스 컬럼의 정보를 담는 인터페이스
export interface Column {
    ccName: string;      // camelCase name
    columnName: string;  // original column name
    isPrimaryKey: boolean;
    pcName: string;      // PascalCase name
    dataType: string;    // SQL data type
    javaType: string;    // Java type
}

// 템플릿 렌더링에 필요한 컨텍스트 정보를 담는 인터페이스
export interface TemplateContext {
    namespace: string;
    resultMapId: string;
    resultMapType: string;
    tableName: string;
    attributes: Column[];
    pkAttributes: Column[];
    parameterType: string;
    resultType: string;
    sortOrder: string;
    searchKeyword: string;
    searchCondition: number;
    packageName: string;
    className: string;
    classNameFirstCharLower: string;
    author: string;
    date: string;
    version: string;
}

// 데이터베이스의 다양한 데이터 타입을 Java의 데이터 타입으로 매핑하는 기능을 제공하는 클래스
class DatabaseDefinition {
    private readonly predefinedDataTypes: { [key: string]: string };

    // 생성자에서 데이터베이스 데이터 타입과 Java 데이터 타입의 매핑을 정의한다.
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

    public getPredefinedDataTypeDefinition(dataType: string): string {
        return this.predefinedDataTypes[dataType.toUpperCase()] || 'java.lang.Object';
    }
}

// renderTemplate 함수는 Handlebars를 사용하여 템플릿을 렌더링한다.
export async function renderTemplate(templateFilePath: string, context: TemplateContext): Promise<string> {
    const template = await fs.readFile(templateFilePath, 'utf-8');
    const compiledTemplate = Handlebars.compile(template);
    return compiledTemplate(context);
}

// DatabaseDefinition 클래스를 이용해 데이터베이스 데이터 타입을 Java 타입으로 변환한다.
export function getJavaClassName(dataType: string): string {
    const databaseDefinition = new DatabaseDefinition();
    return databaseDefinition.getPredefinedDataTypeDefinition(dataType);
}

// getFilePathForOutput 함수는 생성된 파일의 경로를 반환한다.
export function getFilePathForOutput(folderPath: string, tableName: string, fileName: string): string {
    const baseJavaPath = path.join(folderPath, 'src', 'main', 'java');
    const defaultPackageName = vscode.workspace.getConfiguration('egovframeInitializr').get<string>('defaultPackageName', 'egovframework.example.sample');
    const packagePath = defaultPackageName.replace(/\./g, path.sep);
    let outputPath = path.join(folderPath, fileName);

    if (fs.existsSync(baseJavaPath)) {
        if (fileName.endsWith('_Mapper.xml')) {
            outputPath = path.join(folderPath, 'src', 'main', 'resources', 'mappers', fileName);
        } else if (fileName.endsWith('Controller.java')) {
            outputPath = path.join(baseJavaPath, packagePath, 'web', fileName);
        } else if (fileName.endsWith('Service.java') || fileName.endsWith('VO.java') || fileName.endsWith('DefaultVO.java')) {
            outputPath = path.join(baseJavaPath, packagePath, 'service', fileName);
        } else if (fileName.endsWith('ServiceImpl.java') || fileName.endsWith('Mapper.java') || fileName.endsWith('DAO.java')) {
            outputPath = path.join(baseJavaPath, packagePath, 'service', 'impl', fileName);
        } else if (fileName.endsWith('.jsp')) {
            outputPath = path.join(folderPath, 'src', 'main', 'webapp', 'views', fileName);
        } else if (fileName.endsWith('.html')) {
            outputPath = path.join(folderPath, 'src', 'main', 'resources', 'templates', 'thymeleaf', fileName);
        }
    }

    return outputPath;
}

// showFileList 함수는 생성된 파일 목록을 사용자에게 보여주고, 생성할 파일을 선택하도록 한다.
export async function showFileList(files: { filePath: string, content: string }[]) {
    const quickPickItems = files.map(file => ({
        label: path.basename(file.filePath),
        description: file.filePath.replace(vscode.workspace.workspaceFolders?.[0]?.uri.fsPath ?? '', ''),
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

// generates a context object for the template based on the provided tableName, attributes, and pkAttributes
export function getTemplateContext(tableName: string, attributes: Column[], pkAttributes: Column[]): TemplateContext {
    const defaultPackageName = vscode.workspace.getConfiguration('egovframeInitializr').get<string>('defaultPackageName', 'egovframework.example.sample');
    
    return {
        namespace: `${defaultPackageName}.${tableName}Mapper`,
        resultMapId: `${tableName}Result`,
        resultMapType: `${defaultPackageName}.service.${tableName}VO`,
        tableName,
        attributes,
        pkAttributes,
        parameterType: `${defaultPackageName}.service.${tableName}VO`,
        resultType: 'egovMap',
        sortOrder: 'SORT_ORDR',
        searchKeyword: '',
        searchCondition: 0,
        packageName: defaultPackageName,
        className: tableName,
        classNameFirstCharLower: `${tableName[0].toLowerCase()}${tableName.slice(1)}`,
        author: 'author',
        date: new Date().toISOString().split('T')[0],
        version: '1.0.0'
    };
}

export async function generateCrudFromDDL(ddl: string, context: vscode.ExtensionContext): Promise<void> {
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
    const defaultPackageName = vscode.workspace.getConfiguration('egovframeInitializr').get<string>('defaultPackageName', 'egovframework.example.sample');
    const packagePath = defaultPackageName.replace(/\./g, path.sep);

    await setupProjectPaths(folderPath, baseJavaPath, packagePath);
    const templateFilePaths = getTemplateFilePaths(context);

    try {
        const { tableName, attributes, pkAttributes } = parseDDL(ddl);
        const fileContents = await generateFileContents(tableName, attributes, pkAttributes, templateFilePaths);
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
    } catch (error) {
        vscode.window.showErrorMessage(`Error: ${error instanceof Error ? error.message : 'An unknown error occurred.'}`);
    }
}

async function setupProjectPaths(folderPath: string, baseJavaPath: string, packagePath: string) {
    const paths = {
        targetPackagePath: folderPath,
        targetMapperPath: folderPath,
        targetJspPath: folderPath,
        targetThymeleafPath: folderPath,
        targetControllerPath: folderPath,
        targetServicePath: folderPath,
        targetServiceImplPath: folderPath
    };

    if (await fs.pathExists(baseJavaPath)) {
        paths.targetPackagePath = path.join(baseJavaPath, packagePath);
        paths.targetMapperPath = path.join(folderPath, 'src', 'main', 'resources', 'mappers');
        paths.targetJspPath = path.join(folderPath, 'src', 'main', 'webapp', 'views');
        paths.targetThymeleafPath = path.join(folderPath, 'src', 'main', 'resources', 'templates', 'thymeleaf');
        paths.targetControllerPath = path.join(baseJavaPath, packagePath, 'web');
        paths.targetServicePath = path.join(baseJavaPath, packagePath, 'service');
        paths.targetServiceImplPath = path.join(baseJavaPath, packagePath, 'service', 'impl');

        await Promise.all([
            fs.ensureDir(paths.targetPackagePath),
            fs.ensureDir(paths.targetMapperPath),
            fs.ensureDir(paths.targetJspPath),
            fs.ensureDir(paths.targetThymeleafPath),
            fs.ensureDir(paths.targetControllerPath),
            fs.ensureDir(paths.targetServicePath),
            fs.ensureDir(paths.targetServiceImplPath)
        ]);
    }

    return paths;
}

function getTemplateFilePaths(context: vscode.ExtensionContext) {
    return {
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
}

async function generateFileContents(
    tableName: string, 
    attributes: Column[], 
    pkAttributes: Column[], 
    templateFilePaths: {[key: string]: string}
): Promise<{[key: string]: string}> {
    const context = getTemplateContext(tableName, attributes, pkAttributes);
    
    return {
        [`${tableName}_Mapper.xml`]: await renderTemplate(templateFilePaths.mapperTemplateFilePath, context),
        [`${tableName}List.jsp`]: await renderTemplate(templateFilePaths.jspListTemplateFilePath, context),
        [`${tableName}Register.jsp`]: await renderTemplate(templateFilePaths.jspRegisterTemplateFilePath, context),
        [`${tableName}List.html`]: await renderTemplate(templateFilePaths.thymeleafListTemplateFilePath, context),
        [`${tableName}Register.html`]: await renderTemplate(templateFilePaths.thymeleafRegisterTemplateFilePath, context),
        [`${tableName}Controller.java`]: await renderTemplate(templateFilePaths.controllerTemplateFilePath, context),
        [`${tableName}Service.java`]: await renderTemplate(templateFilePaths.serviceTemplateFilePath, context),
        [`DefaultVO.java`]: await renderTemplate(templateFilePaths.defaultVoTemplateFilePath, context),
        [`${tableName}VO.java`]: await renderTemplate(templateFilePaths.voTemplateFilePath, context),
        [`${tableName}ServiceImpl.java`]: await renderTemplate(templateFilePaths.serviceImplTemplateFilePath, context),
        [`${tableName}Mapper.java`]: await renderTemplate(templateFilePaths.mapperInterfaceTemplateFilePath, context),
        [`${tableName}DAO.java`]: await renderTemplate(templateFilePaths.daoTemplateFilePath, context)
    };
}
