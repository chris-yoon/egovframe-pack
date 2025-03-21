import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs-extra";
import * as Handlebars from "handlebars";
import { registerHandlebarsHelpers } from "./handlebarHelpers";

// Register common Handlebars helpers
registerHandlebarsHelpers();

// Define an interface for your template configuration
// 각 템플릿의 설정을 정의하는 인터페이스
export interface TemplateConfig {
    displayName: string;
    templateFolder: string;
    templateFile: string;
    webView: string;
    fileNameProperty: string;
    javaConfigTemplate?: string;
    yamlTemplate?: string;
    propertiesTemplate?: string;
}

export interface GroupedTemplates {
    groupName: string | null;
    templates: TemplateConfig[];
}

export async function renderTemplate(templateFilePath: string, context: any): Promise<string> {
    // 기본 패키지명을 설정에서 가져옴
    const defaultPackageName = vscode.workspace.getConfiguration('egovframeInitializr')
        .get<string>('defaultPackageName', 'egovframework.example.sample');

    // context에 defaultPackageName 추가
    const enrichedContext = {
        ...context,
        defaultPackageName
    };

    let template = await fs.readFile(templateFilePath, "utf-8");
    const parseRegex = /#parse\("(.+)"\)/g;
    let match;
    while ((match = parseRegex.exec(template)) !== null) {
        const includeFilePath = path.join(path.dirname(templateFilePath), match[1]);
        const includeTemplate = await fs.readFile(includeFilePath, "utf-8");
        template = template.replace(match[0], includeTemplate);
    }

    const compiledTemplate = Handlebars.compile(template);
    return compiledTemplate(enrichedContext);
}

export async function generateFile(
    data: any,
    context: vscode.ExtensionContext,
    templateFolder: string,
    templateFile: string,
    outputFolderPath: string,
    fileNameProperty: string,
    fileExtension: string
): Promise<void> {
    const templatePath = path.join(
        context.extensionPath,
        "templates",
        "config",
        templateFolder,
        templateFile
    );
    
    const content = await renderTemplate(templatePath, data);
    
    let fileName = data[fileNameProperty] || 'default_filename';
    fileName += `.${fileExtension}`;
    const outputPath = path.join(outputFolderPath, fileName);

    await fs.writeFile(outputPath, content);
    vscode.window.showInformationMessage(`${fileExtension.toUpperCase()} file created: ${outputPath}`);

    const document = await vscode.workspace.openTextDocument(outputPath);
    await vscode.window.showTextDocument(document);
}

export function groupTemplates(templates: TemplateConfig[]): GroupedTemplates[] {
    const groups: { [key: string]: TemplateConfig[] } = {};
    const groupedTemplates: GroupedTemplates[] = [];

    templates.forEach((template) => {
        const parts = template.displayName.split(" > ");
        if (parts.length > 1) {
            const groupName = parts[0];
            if (!groups[groupName]) {
                groups[groupName] = [];
                groupedTemplates.push({ groupName, templates: groups[groupName] });
            }
            groups[groupName].push(template);
        } else {
            groupedTemplates.push({ groupName: null, templates: [template] });
        }
    });

    return groupedTemplates;
}

interface ConfigWebviewOptions {
    title: string;
    htmlFileName: string;
    templateFolder: string;
    templateFile: string;
    initialPath?: string;
    fileNameProperty: string;
    javaConfigTemplate?: string;
    yamlTemplate?: string;
    propertiesTemplate?: string;
}

export async function createConfigWebview(
    context: vscode.ExtensionContext,
    options: ConfigWebviewOptions
): Promise<void> {
    const panel = vscode.window.createWebviewPanel(
        "generateConfig",
        options.title,
        vscode.ViewColumn.One,
        { enableScripts: true }
    );

    const htmlTemplatePath = path.join(context.extensionPath, "webviews", options.htmlFileName);
    const htmlContent = fs.readFileSync(htmlTemplatePath, "utf8");

    panel.webview.html = htmlContent;

    panel.webview.onDidReceiveMessage(
        async (message) => {
            try {
                if (message.command === "generateXml" || message.command === "generateYaml" || message.command === "generateProperties" || message.command === "generateJavaConfigByForm") {
                    let outputFolderPath: string;
                    
                    if (options.initialPath) {
                        const stats = await fs.stat(options.initialPath);
                        outputFolderPath = stats.isFile() ? path.dirname(options.initialPath) : options.initialPath;
                    } else {
                        const folderUri = await vscode.window.showOpenDialog({
                            canSelectFolders: true,
                            canSelectFiles: false,
                            openLabel: "Select folder to generate config",
                        });

                        if (!folderUri || folderUri.length === 0) {
                            vscode.window.showWarningMessage('No folder selected. Please select a folder.');
                            return;
                        }
                        outputFolderPath = folderUri[0].fsPath;
                    }

                    switch (message.command) {
                        case "generateXml":
                            await generateFile(message.data, context, options.templateFolder, options.templateFile, outputFolderPath, options.fileNameProperty, "xml");
                            break;
                        case "generateJavaConfigByForm":
                            await generateFile(message.data, context, options.templateFolder, options.javaConfigTemplate!, outputFolderPath, options.fileNameProperty, "java");
                            break;
                        case "generateYaml":
                            await generateFile(message.data, context, options.templateFolder, options.yamlTemplate!, outputFolderPath, options.fileNameProperty, "yaml");
                            break;
                        case "generateProperties":
                            await generateFile(message.data, context, options.templateFolder, options.propertiesTemplate!, outputFolderPath, options.fileNameProperty, "properties");
                            break;
                    }

                    panel.dispose();
                }
            } catch (error) {
                vscode.window.showErrorMessage(`Error generating config: ${error}`);
            }
        }
    );
}
