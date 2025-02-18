import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs-extra";
import * as Handlebars from 'handlebars';

// Define a simple TreeItem for the Template Tree View
class TemplateTreeItem extends vscode.TreeItem {
  constructor(
    public readonly label: string,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState,
    public readonly template?: TemplateConfig,
    public readonly command?: vscode.Command
  ) {
    super(label, collapsibleState);
    this.tooltip = template ? `${this.label}` : undefined;
    this.description = template ? template.displayName : undefined;
    this.command = command;
  }
}

// Implement TreeDataProvider for the Template Tree View
class TemplateTreeDataProvider implements vscode.TreeDataProvider<TemplateTreeItem> {
  private _onDidChangeTreeData: vscode.EventEmitter<TemplateTreeItem | undefined | void> = new vscode.EventEmitter<TemplateTreeItem | undefined | void>();
  readonly onDidChangeTreeData: vscode.Event<TemplateTreeItem | undefined | void> = this._onDidChangeTreeData.event;

  constructor(private templates: GroupedTemplates[]) {}

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: TemplateTreeItem): vscode.TreeItem {
    return element;
  }

  getChildren(element?: TemplateTreeItem): Thenable<TemplateTreeItem[]> {
    if (!element) {
      return Promise.resolve(
        this.templates.map((group) =>
          group.groupName
            ? new TemplateTreeItem(group.groupName, vscode.TreeItemCollapsibleState.Collapsed)
            : new TemplateTreeItem(group.templates[0].displayName, vscode.TreeItemCollapsibleState.None, group.templates[0], {
                command: "extension.generateConfigContainer",
                title: "Generate Config",
                arguments: [group.templates[0]],
              })
        )
      );
    } else if (element.label) {
      const group = this.templates.find((group) => group.groupName === element.label);
      if (group && group.groupName) {
        return Promise.resolve(
          group.templates.map(
            (template) =>
              new TemplateTreeItem(template.displayName.split(" > ").pop() || template.displayName, vscode.TreeItemCollapsibleState.None, template, {
                command: "extension.generateConfigContainer",
                title: "Generate Config",
                arguments: [template],
              })
          )
        );
      }
    }
    return Promise.resolve([]);
  }
}

// Template interface
interface TemplateConfig {
  displayName: string;
  vmFolder: string;
  vmFile: string;
  webView: string;
  fileNameProperty: string;
  javaConfigVmFile?: string;
}

// GroupedTemplates interface to group templates under a group name
interface GroupedTemplates {
  groupName: string | null;
  templates: TemplateConfig[];
}

// Activation function
export function activate(context: vscode.ExtensionContext) {
  const configFilePath = path.join(context.extensionPath, "templates-context-xml.json");
  const templates: TemplateConfig[] = JSON.parse(fs.readFileSync(configFilePath, "utf8"));

  // Group templates by prefix if they have a common root, otherwise leave them as standalone
  const groupedTemplates: GroupedTemplates[] = groupTemplates(templates);

  const templateTreeDataProvider = new TemplateTreeDataProvider(groupedTemplates);
  const treeView = vscode.window.createTreeView("egovframeConfigView", {
    treeDataProvider: templateTreeDataProvider,
  });

  vscode.window.registerTreeDataProvider("egovframeConfigView", templateTreeDataProvider);

  let generateConfig = vscode.commands.registerCommand("extension.generateConfigContainer", async (template: TemplateConfig) => {

    createWebview(context, template.displayName, template.webView, template.vmFolder, template.vmFile, template.fileNameProperty, template.javaConfigVmFile);
  });

  // Register collapseAll command to collapse all nodes in the tree
  let collapseAll = vscode.commands.registerCommand("extension.collapseAllConfigs", async () => {
    vscode.commands.executeCommand("workbench.actions.treeView.egovframeConfigView.collapseAll");
  });

  context.subscriptions.push(generateConfig, collapseAll);
}

function createWebview(
  context: vscode.ExtensionContext,
  title: string,
  htmlFileName: string,
  vmFolder: string,
  vmFileName: string,
  fileNameProperty: string,
  javaConfigVmFileName?: string
) {
  const panel = vscode.window.createWebviewPanel("generateXml", title, vscode.ViewColumn.One, {
    enableScripts: true,
  });

  const htmlTemplatePath = path.join(context.extensionPath, "webviews", htmlFileName);
  const htmlContent = fs.readFileSync(htmlTemplatePath, "utf8");

  panel.webview.html = htmlContent;

  panel.webview.onDidReceiveMessage(async (message) => {

    let selectedFolderPath: string;

    const uri = await vscode.window.showOpenDialog({
      canSelectFolders: true,
      canSelectFiles: false,
      openLabel: "Select folder to generate config",
    });

    if (uri && uri.length > 0) {
      selectedFolderPath = uri[0].fsPath;
    } else {
      vscode.window.showWarningMessage("No folder selected. Please select a folder.");
      return;
    }

    if (message.command === "generateXml") {
      await generateXmlFile(message.data, context, vmFolder, vmFileName, selectedFolderPath, fileNameProperty);
      panel.dispose();
    } else if (message.command === "generateJavaConfigByForm") {
      if (javaConfigVmFileName) {
        await generateJavaConfigFile(message.data, context, vmFolder, javaConfigVmFileName, selectedFolderPath, fileNameProperty);
        panel.dispose();
      } else {
        vscode.window.showErrorMessage("JavaConfig template not defined for this generation type.");
      }
    }
  }, undefined, context.subscriptions);
}

async function generateXmlFile(data: any, context: vscode.ExtensionContext, vmFolder: string, vmFileName: string, outputFolderPath: string, fileNameProperty: string) {
  const xmlTemplatePath = path.join(context.extensionPath, "templates", "config", vmFolder, vmFileName);
  const xmlContent = await renderTemplate(xmlTemplatePath, data);

  let fileName = data[fileNameProperty] || "default_filename";
  fileName += ".xml";
  const outputPath = path.join(outputFolderPath, fileName);

  await fs.writeFile(outputPath, xmlContent);
  vscode.window.showInformationMessage(`XML file created: ${outputPath}`);

  const document = await vscode.workspace.openTextDocument(outputPath);
  await vscode.window.showTextDocument(document);
}

async function generateJavaConfigFile(data: any, context: vscode.ExtensionContext, vmFolder: string, vmFileName: string, outputFolderPath: string, fileNameProperty: string) {
  const javaConfigTemplatePath = path.join(context.extensionPath, "templates", "config", vmFolder, vmFileName);
  const javaConfigContent = await renderTemplate(javaConfigTemplatePath, data);

  let fileName = data[fileNameProperty] || "default_filename";
  fileName += ".java";
  const outputPath = path.join(outputFolderPath, fileName);

  await fs.writeFile(outputPath, javaConfigContent);
  vscode.window.showInformationMessage(`JavaConfig file created: ${outputPath}`);

  const document = await vscode.workspace.openTextDocument(outputPath);
  await vscode.window.showTextDocument(document);
}

async function renderTemplate(templateFilePath: string, context: any): Promise<string> {
  let template = await fs.readFile(templateFilePath, "utf-8");

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

// Function to group templates by prefix if they share the same prefix (e.g., "New Template Project > ...")
function groupTemplates(templates: TemplateConfig[]): GroupedTemplates[] {
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
      groupedTemplates.push({ groupName: template.displayName, templates: [template] });
    }
  });

  return groupedTemplates;
}

export function deactivate() {}
