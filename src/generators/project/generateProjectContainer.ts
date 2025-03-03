import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs-extra";
import { Template, generateProject, getProjectConfig } from "../../utils/projectGeneratorUtils";

interface GroupedTemplates {
  groupName: string | null;
  templates: Template[];
}

class TemplateTreeItem extends vscode.TreeItem {
  constructor(
    public readonly label: string,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState,
    public readonly template?: Template,
    public readonly command?: vscode.Command
  ) {
    super(label, collapsibleState);
    this.tooltip = template ? `${this.label}` : undefined;
    this.description = template ? template.displayName : undefined;
    this.command = command;
  }
}

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
            : new TemplateTreeItem(
                group.templates[0].displayName,
                vscode.TreeItemCollapsibleState.None,
                group.templates[0],
                {
                  command: "extension.generateProjectContainer",
                  title: "Generate Project",
                  arguments: [group.templates[0]],
                }
              )
        )
      );
    } else if (element.label) {
      const group = this.templates.find((group) => group.groupName === element.label);
      if (group && group.groupName) {
        return Promise.resolve(
          group.templates.map(
            (template) =>
              new TemplateTreeItem(
                template.displayName.split(" > ").pop() || template.displayName,
                vscode.TreeItemCollapsibleState.None,
                template,
                {
                  command: "extension.generateProjectContainer",
                  title: "Generate Project",
                  arguments: [template],
                }
              )
          )
        );
      }
    }
    return Promise.resolve([]);
  }
}

function groupTemplates(templates: Template[]): GroupedTemplates[] {
  const groups: { [key: string]: Template[] } = {};
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
      groupedTemplates.push({
        groupName: null,
        templates: [template],
      });
    }
  });

  return groupedTemplates;
}

export function registerGenerateProjectContainerCommand(context: vscode.ExtensionContext) {
  const configFilePath = path.join(context.extensionPath, "templates-projects.json");
  const templates: Template[] = JSON.parse(fs.readFileSync(configFilePath, "utf8"));
  const groupedTemplates: GroupedTemplates[] = groupTemplates(templates);

  const templateTreeDataProvider = new TemplateTreeDataProvider(groupedTemplates);
  vscode.window.registerTreeDataProvider("egovframeProjectView", templateTreeDataProvider);

  let collapseAll = vscode.commands.registerCommand("extension.collapseAllProjects", async () => {
    vscode.commands.executeCommand("workbench.actions.treeView.egovframeProjectView.collapseAll");
  });

  let generateProjectCmd = vscode.commands.registerCommand(
    "extension.generateProjectContainer",
    async (template: Template) => {
      try {
        const extensionPath = vscode.extensions.getExtension(
          "egovframework.vscode-egovframe-initializr"
        )?.extensionPath;
        if (!extensionPath) {
          vscode.window.showErrorMessage("Extension path not found");
          return;
        }

        const config = await getProjectConfig();
        if (!config) {return;}

        await generateProject(template, config, extensionPath);
      } catch (error) {
        if (error instanceof Error) {
          vscode.window.showErrorMessage(`Error: ${error.message}`);
        } else {
          vscode.window.showErrorMessage("An unknown error occurred");
        }
      }
    }
  );

  context.subscriptions.push(generateProjectCmd, collapseAll);
}

export function deactivate(): void {
  // Clean up resources and perform any necessary deactivation tasks
  // Currently no cleanup is needed, but we explicitly declare return type
  // to satisfy the linter and maintain good practices
}
