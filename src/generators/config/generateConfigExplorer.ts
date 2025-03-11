import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs-extra";
import { 
    GroupedTemplates, 
    groupTemplates, 
    createConfigWebview,
    TemplateConfig
} from "../../utils/configGeneratorUtils";

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
                command: "extension.generateConfigExplorer",
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
                command: "extension.generateConfigExplorer",
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
export function registerGenerateConfigExplorer(context: vscode.ExtensionContext) {
  const configFilePath = path.join(context.extensionPath, "templates-context-xml.json");
  const templates: TemplateConfig[] = JSON.parse(fs.readFileSync(configFilePath, "utf8"));

  // Group templates by prefix if they have a common root, otherwise leave them as standalone
  const groupedTemplates: GroupedTemplates[] = groupTemplates(templates);

  const templateTreeDataProvider = new TemplateTreeDataProvider(groupedTemplates);
  const treeView = vscode.window.createTreeView("egovframeConfigView", {
    treeDataProvider: templateTreeDataProvider,
    showCollapseAll: true
  });

  // Collapse All 명령어 등록
  let collapseAll = vscode.commands.registerCommand("extension.collapseAllConfigs", () => {
    vscode.commands.executeCommand("workbench.actions.treeView.egovframeConfigView.collapseAll");
  });

  // Config 생성 명령어 등록
  let generateConfig = vscode.commands.registerCommand(
    "extension.generateConfigExplorer",
    async (template: TemplateConfig) => {
      try {
        await createConfigWebview(
          context,
          {
            title: template.displayName,
            htmlFileName: template.webView,
            templateFolder: template.templateFolder,
            templateFile: template.templateFile,
            initialPath: undefined,
            fileNameProperty: template.fileNameProperty,
            javaConfigTemplate: template.javaConfigTemplate,
            yamlTemplate: template.yamlTemplate,
            propertiesTemplate: template.propertiesTemplate
          }
        );
      } catch (error) {
        vscode.window.showErrorMessage(`Error generating config: ${error}`);
      }
    }
  );

  // 명령어들을 context.subscriptions에 추가
  context.subscriptions.push(
    treeView,
    generateConfig,
    collapseAll
  );
}

export function deactivate(): void {
  // Clean up resources
}
