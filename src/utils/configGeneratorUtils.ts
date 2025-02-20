import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs-extra";
import * as Handlebars from "handlebars";

// Define an interface for your template configuration
// 각 템플릿의 설정을 정의하는 인터페이스
export interface TemplateConfig {
    displayName: string;
    vmFolder: string;
    vmFile: string;
    webView: string;
    fileNameProperty: string;
    javaConfigVmFile?: string;
}

export interface GroupedTemplates {
    groupName: string | null;
    templates: TemplateConfig[];
}

export async function renderTemplate(templateFilePath: string, context: any): Promise<string> {
    let template = await fs.readFile(templateFilePath, "utf-8");

    // Handle #parse directive for included templates
    const parseRegex = /#parse\("(.+)"\)/g;
    let match;
    while ((match = parseRegex.exec(template)) !== null) {
        const includeFilePath = path.join(path.dirname(templateFilePath), match[1]);
        const includeTemplate = await fs.readFile(includeFilePath, "utf-8");
        template = template.replace(match[0], includeTemplate);
    }

    const compiledTemplate = Handlebars.compile(template);
    return compiledTemplate(context);
}

export async function generateFile(
    data: any,
    context: vscode.ExtensionContext,
    vmFolder: string,
    vmFileName: string,
    outputFolderPath: string,
    fileNameProperty: string,
    fileExtension: string
): Promise<void> {
    const templatePath = path.join(
        context.extensionPath,
        "templates",
        "config",
        vmFolder,
        vmFileName
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

export async function createConfigWebview(
    context: vscode.ExtensionContext,
    title: string,
    htmlFileName: string,
    vmFolder: string,
    vmFileName: string,
    initialPath: string | undefined,
    fileNameProperty: string,
    javaConfigVmFileName?: string
): Promise<void> {
    const panel = vscode.window.createWebviewPanel(
        "generateConfig",
        title,
        vscode.ViewColumn.One,
        { enableScripts: true }
    );

    const htmlTemplatePath = path.join(context.extensionPath, "webviews", htmlFileName);
    const htmlContent = fs.readFileSync(htmlTemplatePath, "utf8");

    panel.webview.html = htmlContent;

    panel.webview.onDidReceiveMessage(
        async (message) => {
            try {
                if (message.command === "generateXml" || message.command === "generateJavaConfigByForm") {
                    let outputFolderPath: string;
                    
                    if (initialPath) {
                        const stats = await fs.stat(initialPath);
                        outputFolderPath = stats.isFile() ? path.dirname(initialPath) : initialPath;
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

                    if (message.command === "generateXml") {
                        await generateFile(message.data, context, vmFolder, vmFileName, outputFolderPath, fileNameProperty, "xml");
                    } else {
                        await generateFile(message.data, context, vmFolder, javaConfigVmFileName!, outputFolderPath, fileNameProperty, "java");
                    }
                    panel.dispose();
                }
            } catch (error) {
                vscode.window.showErrorMessage(`Error generating config: ${error}`);
            }
        }
    );
}
