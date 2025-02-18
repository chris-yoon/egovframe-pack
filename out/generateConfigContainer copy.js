"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(require("vscode"));
const path = __importStar(require("path"));
const fs = __importStar(require("fs-extra"));
const velocityjs_1 = require("velocityjs");
// Define a simple TreeItem for the Template Tree View
class TemplateTreeItem extends vscode.TreeItem {
    label;
    collapsibleState;
    template;
    command;
    constructor(label, collapsibleState, template, command) {
        super(label, collapsibleState);
        this.label = label;
        this.collapsibleState = collapsibleState;
        this.template = template;
        this.command = command;
        this.tooltip = template ? `${this.label}` : undefined;
        this.description = template ? template.displayName : undefined;
        this.command = command;
    }
}
// Implement TreeDataProvider for the Template Tree View
class TemplateTreeDataProvider {
    templates;
    _onDidChangeTreeData = new vscode.EventEmitter();
    onDidChangeTreeData = this._onDidChangeTreeData.event;
    constructor(templates) {
        this.templates = templates;
    }
    refresh() {
        this._onDidChangeTreeData.fire();
    }
    getTreeItem(element) {
        return element;
    }
    getChildren(element) {
        if (!element) {
            return Promise.resolve(this.templates.map((group) => group.groupName
                ? new TemplateTreeItem(group.groupName, vscode.TreeItemCollapsibleState.Collapsed)
                : new TemplateTreeItem(group.templates[0].displayName, vscode.TreeItemCollapsibleState.None, group.templates[0], {
                    command: "extension.generateConfigContainer",
                    title: "Generate Config",
                    arguments: [group.templates[0]],
                })));
        }
        else if (element.label) {
            const group = this.templates.find((group) => group.groupName === element.label);
            if (group && group.groupName) {
                return Promise.resolve(group.templates.map((template) => new TemplateTreeItem(template.displayName.split(" > ").pop() || template.displayName, vscode.TreeItemCollapsibleState.None, template, {
                    command: "extension.generateConfigContainer",
                    title: "Generate Config",
                    arguments: [template],
                })));
            }
        }
        return Promise.resolve([]);
    }
}
// Activation function
function activate(context) {
    const configFilePath = path.join(context.extensionPath, "templates-context-xml.json");
    const templates = JSON.parse(fs.readFileSync(configFilePath, "utf8"));
    // Group templates by prefix if they have a common root, otherwise leave them as standalone
    const groupedTemplates = groupTemplates(templates);
    const templateTreeDataProvider = new TemplateTreeDataProvider(groupedTemplates);
    const treeView = vscode.window.createTreeView("egovframeConfigView", {
        treeDataProvider: templateTreeDataProvider,
    });
    vscode.window.registerTreeDataProvider("egovframeConfigView", templateTreeDataProvider);
    let generateConfig = vscode.commands.registerCommand("extension.generateConfigContainer", async (template) => {
        let selectedFolderPath;
        const uri = await vscode.window.showOpenDialog({
            canSelectFolders: true,
            canSelectFiles: false,
            openLabel: "Select folder to generate config",
        });
        if (uri && uri.length > 0) {
            selectedFolderPath = uri[0].fsPath;
        }
        else {
            vscode.window.showWarningMessage("No folder selected. Please select a folder.");
            return;
        }
        createWebview(context, template.displayName, template.webView, template.vmFolder, template.vmFile, selectedFolderPath, template.fileNameProperty, template.javaConfigVmFile);
    });
    // Register collapseAll command to collapse all nodes in the tree
    let collapseAll = vscode.commands.registerCommand("extension.collapseAllConfigs", async () => {
        vscode.commands.executeCommand("workbench.actions.treeView.egovframeConfigView.collapseAll");
    });
    context.subscriptions.push(generateConfig, collapseAll);
}
function createWebview(context, title, htmlFileName, vmFolder, vmFileName, outputFolderPath, fileNameProperty, javaConfigVmFileName) {
    const panel = vscode.window.createWebviewPanel("generateXml", title, vscode.ViewColumn.One, {
        enableScripts: true,
    });
    const htmlTemplatePath = path.join(context.extensionPath, "webviews", htmlFileName);
    const htmlContent = fs.readFileSync(htmlTemplatePath, "utf8");
    panel.webview.html = htmlContent;
    panel.webview.onDidReceiveMessage(async (message) => {
        if (message.command === "generateXml") {
            await generateXmlFile(message.data, context, vmFolder, vmFileName, outputFolderPath, fileNameProperty);
            panel.dispose();
        }
        else if (message.command === "generateJavaConfigByForm") {
            if (javaConfigVmFileName) {
                await generateJavaConfigFile(message.data, context, vmFolder, javaConfigVmFileName, outputFolderPath, fileNameProperty);
                panel.dispose();
            }
            else {
                vscode.window.showErrorMessage("JavaConfig template not defined for this generation type.");
            }
        }
    }, undefined, context.subscriptions);
}
async function generateXmlFile(data, context, vmFolder, vmFileName, outputFolderPath, fileNameProperty) {
    const xmlTemplatePath = path.join(context.extensionPath, "templates", vmFolder, vmFileName);
    const xmlContent = await renderTemplate(xmlTemplatePath, data);
    let fileName = data[fileNameProperty] || "default_filename";
    fileName += ".xml";
    const outputPath = path.join(outputFolderPath, fileName);
    await fs.writeFile(outputPath, xmlContent);
    vscode.window.showInformationMessage(`XML file created: ${outputPath}`);
    const document = await vscode.workspace.openTextDocument(outputPath);
    await vscode.window.showTextDocument(document);
}
async function generateJavaConfigFile(data, context, vmFolder, vmFileName, outputFolderPath, fileNameProperty) {
    const javaConfigTemplatePath = path.join(context.extensionPath, "templates", vmFolder, vmFileName);
    const javaConfigContent = await renderTemplate(javaConfigTemplatePath, data);
    let fileName = data[fileNameProperty] || "default_filename";
    fileName += ".java";
    const outputPath = path.join(outputFolderPath, fileName);
    await fs.writeFile(outputPath, javaConfigContent);
    vscode.window.showInformationMessage(`JavaConfig file created: ${outputPath}`);
    const document = await vscode.workspace.openTextDocument(outputPath);
    await vscode.window.showTextDocument(document);
}
async function renderTemplate(templateFilePath, context) {
    let template = await fs.readFile(templateFilePath, "utf-8");
    const parseRegex = /#parse\("(.+)"\)/g;
    let match;
    while ((match = parseRegex.exec(template)) !== null) {
        const includeFilePath = path.join(path.dirname(templateFilePath), match[1]);
        const includeTemplate = await fs.readFile(includeFilePath, "utf-8");
        template = template.replace(match[0], includeTemplate);
    }
    return (0, velocityjs_1.render)(template, context);
}
// Function to group templates by prefix if they share the same prefix (e.g., "New Template Project > ...")
function groupTemplates(templates) {
    const groups = {};
    const groupedTemplates = [];
    templates.forEach((template) => {
        const parts = template.displayName.split(" > ");
        if (parts.length > 1) {
            const groupName = parts[0];
            if (!groups[groupName]) {
                groups[groupName] = [];
                groupedTemplates.push({ groupName, templates: groups[groupName] });
            }
            groups[groupName].push(template);
        }
        else {
            groupedTemplates.push({ groupName: template.displayName, templates: [template] });
        }
    });
    return groupedTemplates;
}
function deactivate() { }
//# sourceMappingURL=generateConfigContainer%20copy.js.map