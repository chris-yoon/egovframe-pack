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
            let selectedFolderPath: string;

            if (uri) {
                const stats = await fs.stat(uri.fsPath);
                selectedFolderPath = stats.isFile() ? path.dirname(uri.fsPath) : uri.fsPath;
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
                selectedFolderPath = folderUri[0].fsPath;
            }

            const options: TemplateQuickPickItem[] = templates.map((template) => ({
                label: template.displayName,
                template: template,
            }));

            const selectedOption = await vscode.window.showQuickPick(options, {
                placeHolder: "Select Config Generation Type",
            });

            if (selectedOption?.template) {
                await createConfigWebview(
                    context,
                    selectedOption.template.displayName,
                    selectedOption.template.webView,
                    selectedOption.template.vmFolder,
                    selectedOption.template.vmFile,
                    selectedFolderPath,
                    selectedOption.template.fileNameProperty,
                    selectedOption.template.javaConfigVmFile
                );
            }
        }
    );

    context.subscriptions.push(generateConfig);
}

export function deactivate() {}
