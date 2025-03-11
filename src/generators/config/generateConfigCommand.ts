import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs-extra";
import { TemplateConfig, createConfigWebview } from "../../utils/configGeneratorUtils";

interface TemplateQuickPickItem extends vscode.QuickPickItem {
    template: TemplateConfig;
}

export function registerGenerateConfigCommand(context: vscode.ExtensionContext) {
    // 설정 파일 경로 확인
    const configFilePath = path.join(context.extensionPath, "templates-context-xml.json");
    
    // 파일 존재 여부 확인
    if (!fs.existsSync(configFilePath)) {
        vscode.window.showErrorMessage(`Configuration file not found: ${configFilePath}`);
        return;
    }

    // 템플릿 설정 로드
    const templates: TemplateConfig[] = JSON.parse(fs.readFileSync(configFilePath, "utf8"));

    let generateConfig = vscode.commands.registerCommand(
        "extension.generateConfigCommand",
        async (uri?: vscode.Uri) => {
            try {
                // QuickPick 옵션 생성
                const options: TemplateQuickPickItem[] = templates.map((template) => ({
                    label: template.displayName,
                    template: template,
                }));

                // 템플릿 선택
                const selectedOption = await vscode.window.showQuickPick(options, {
                    placeHolder: "Select Config Generation Type",
                });

                if (!selectedOption?.template) {
                    return;
                }

                // 초기 경로 설정
                let initialPath: string | undefined;
                if (uri?.fsPath) {
                    // URI가 제공된 경우 해당 경로 사용
                    initialPath = uri.fsPath;
                } else if (vscode.window.activeTextEditor?.document.uri.fsPath) {
                    // 현재 열린 편집기의 경로 사용
                    initialPath = vscode.window.activeTextEditor.document.uri.fsPath;
                } else if (vscode.workspace.workspaceFolders?.[0]) {
                    // 워크스페이스 루트 경로 사용
                    initialPath = vscode.workspace.workspaceFolders[0].uri.fsPath;
                }

                // Webview 생성
                await createConfigWebview(
                    context,
                    {
                        title: selectedOption.template.displayName,
                        htmlFileName: selectedOption.template.webView,
                        templateFolder: selectedOption.template.templateFolder,
                        templateFile: selectedOption.template.templateFile,
                        initialPath: initialPath,
                        fileNameProperty: selectedOption.template.fileNameProperty,
                        javaConfigTemplate: selectedOption.template.javaConfigTemplate,
                        yamlTemplate: selectedOption.template.yamlTemplate,
                        propertiesTemplate: selectedOption.template.propertiesTemplate
                    }
                );
            } catch (error) {
                vscode.window.showErrorMessage(`Error generating config: ${error}`);
            }
        }
    );

    context.subscriptions.push(generateConfig);
}

export function deactivate(): void {
    // Clean up resources
}
