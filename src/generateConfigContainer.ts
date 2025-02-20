import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs-extra";
import { 
    GroupedTemplates, 
    groupTemplates, 
    createConfigWebview,
    TemplateConfig
} from "./utils/configGeneratorUtils";

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

// Activation function
export function activate(context: vscode.ExtensionContext) {
  const configFilePath = path.join(context.extensionPath, "templates-context-xml.json");
  const templates: TemplateConfig[] = JSON.parse(fs.readFileSync(configFilePath, "utf8"));

  // Group templates by prefix if they have a common root, otherwise leave them as standalone
  const groupedTemplates: GroupedTemplates[] = groupTemplates(templates);

  const templateTreeDataProvider = new TemplateTreeDataProvider(groupedTemplates);
  vscode.window.createTreeView("egovframeConfigView", {
    treeDataProvider: templateTreeDataProvider,
  });

  let generateConfig = vscode.commands.registerCommand(
    "extension.generateConfigContainer",
    async (template: TemplateConfig) => {
      await createConfigWebview(
        context,
        template.displayName,
        template.webView,
        template.templateFolder,
        template.templateFile,
        undefined,
        template.fileNameProperty,
        template.javaConfigTemplate
      );
    }
  );

  context.subscriptions.push(generateConfig);
}

export function deactivate(): void {
  // Clean up resources and perform any necessary deactivation tasks
  // Currently no cleanup is needed, but we explicitly declare return type
  // to satisfy the linter and maintain good practices
}
