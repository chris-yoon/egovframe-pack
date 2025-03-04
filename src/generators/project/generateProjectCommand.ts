import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs-extra";
import { Template, generateProject, getProjectConfig } from "../../utils/projectGeneratorUtils";

export function registerGenerateProjectCommand(context: vscode.ExtensionContext) {
  let disposable = vscode.commands.registerCommand("extension.generateProjectCommand", async () => {
    const extensionPath = vscode.extensions.getExtension(
      "egovframework.vscode-egovframe-initializr"
    )?.extensionPath;
    if (!extensionPath) {
      vscode.window.showErrorMessage("Extension path not found");
      return;
    }

    try {
      const templatesPath = path.join(extensionPath, "templates-projects.json");
      const templates: Template[] = await fs.readJSON(templatesPath);

      const quickPickTemplates = templates.map(template => ({
        label: template.displayName,
        description: path.join(extensionPath, "examples", template.fileName),
        template: template
      }));

      const selected = await vscode.window.showQuickPick(quickPickTemplates, {
        canPickMany: false,
        placeHolder: "Select a template"
      });
      if (!selected) {return;}

      const config = await getProjectConfig();
      if (!config) {return;}

      await generateProject(selected.template, config, extensionPath);
    } catch (error) {
      if (error instanceof Error) {
        vscode.window.showErrorMessage(`Error: ${error.message}`);
      } else {
        vscode.window.showErrorMessage("An unknown error occurred");
      }
    }
  });

  context.subscriptions.push(disposable);
}

export function deactivate(): void {
  // Clean up resources and perform any necessary deactivation tasks
  // Currently no cleanup is needed, but we explicitly declare return type
  // to satisfy the linter and maintain good practices
}
