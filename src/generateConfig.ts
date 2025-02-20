import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs-extra";
import { TemplateConfig, createConfigWebview } from "./utils/configGeneratorUtils";

interface TemplateQuickPickItem extends vscode.QuickPickItem {
    template: TemplateConfig;
}

export function activate(context: vscode.ExtensionContext) {
    const configFilePath = path.join(context.extensionPath, "templates-context-xml.json");
    const templates: TemplateConfig[] = JSON.parse(fs.readFileSync(configFilePath, "utf8"));

    let generateConfig = vscode.commands.registerCommand(
        "extension.generateConfig",
        async (uri: vscode.Uri) => {
            const options: TemplateQuickPickItem[] = templates.map((template) => ({
                label: template.displayName,
                template: template,
            }));

            const selectedOption = await vscode.window.showQuickPick(options, {
                placeHolder: "Select Config Generation Type",
            });

            if (selectedOption?.template) {
                let selectedFolderPath: string | undefined;
                
                await createConfigWebview(
                    context,
                    selectedOption.template.displayName,
                    selectedOption.template.webView,
                    selectedOption.template.templateFolder,
                    selectedOption.template.templateFile,
                    uri?.fsPath,
                    selectedOption.template.fileNameProperty,
                    selectedOption.template.javaConfigTemplate
                );
            }
        }
    );

    context.subscriptions.push(generateConfig);
}

export function deactivate(): void {
    // Clean up resources and perform any necessary deactivation tasks
    // Currently no cleanup is needed, but we explicitly declare return type
    // to satisfy the linter and maintain good practices
}
