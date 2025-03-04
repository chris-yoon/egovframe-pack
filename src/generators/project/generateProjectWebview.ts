import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs-extra";
import { Template, generateProject } from "../../utils/projectGeneratorUtils";

export function registerGenerateProjectWebview(context: vscode.ExtensionContext) {
  let disposable = vscode.commands.registerCommand("extension.generateProjectWebview", () => {
    createWebview(context);
  });

  context.subscriptions.push(disposable);
}

function createWebview(context: vscode.ExtensionContext) {
  const panel = vscode.window.createWebviewPanel(
    "generateProject",
    "Generate Project",
    vscode.ViewColumn.One,
    { enableScripts: true }
  );

  const htmlTemplatePath = path.join(context.extensionPath, "webviews", "generateProjectWebview.html");
  panel.webview.html = fs.readFileSync(htmlTemplatePath, "utf8");

  panel.webview.onDidReceiveMessage(
    async (message) => {
      try {
        if (message.command === "generateProjectWebview") {
          const extensionPath = vscode.extensions.getExtension(
            "egovframework.vscode-egovframe-initializr"
          )?.extensionPath;
          if (!extensionPath) {
            vscode.window.showErrorMessage("Extension path not found");
            return;
          }

          const templatesPath = path.join(extensionPath, "templates-projects.json");
          const templates: Template[] = await fs.readJSON(templatesPath);

          const template = templates.find(t => t.fileName === message.data.template);
          if (!template) {
            vscode.window.showErrorMessage("Template not found");
            return;
          }

          await generateProject(
            template,
            {
              projectName: message.data.projectName,
              groupID: message.data.groupID
            },
            extensionPath
          );

          panel.dispose();
        } else if (message.command === "loadTemplates") {
          const templatesPath = path.join(context.extensionPath, "templates-projects.json");
          const templates: Template[] = await fs.readJSON(templatesPath);
          panel.webview.postMessage({
            command: 'loadTemplates',
            templates: templates
          });
        }
      } catch (error) {
        if (error instanceof Error) {
          vscode.window.showErrorMessage(`Error: ${error.message}`);
        } else {
          vscode.window.showErrorMessage("An unknown error occurred");
        }
      }
    },
    undefined,
    context.subscriptions
  );
}

export function deactivate(): void {
  // Clean up resources and perform any necessary deactivation tasks
  // Currently no cleanup is needed, but we explicitly declare return type
  // to satisfy the linter and maintain good practices
}
