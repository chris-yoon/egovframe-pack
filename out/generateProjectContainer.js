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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(require("vscode"));
const path = __importStar(require("path"));
const fs = __importStar(require("fs-extra"));
const yauzl = __importStar(require("yauzl"));
const extract_zip_1 = __importDefault(require("extract-zip"));
const Handlebars = __importStar(require("handlebars"));
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
                    command: "extension.generateProjectContainer",
                    title: "Generate Project",
                    arguments: [group.templates[0]],
                })));
        }
        else if (element.label) {
            const group = this.templates.find((group) => group.groupName === element.label);
            if (group && group.groupName) {
                return Promise.resolve(group.templates.map((template) => new TemplateTreeItem(template.displayName.split(" > ").pop() || template.displayName, vscode.TreeItemCollapsibleState.None, template, {
                    command: "extension.generateProjectContainer",
                    title: "Generate Project",
                    arguments: [template],
                })));
            }
        }
        return Promise.resolve([]);
    }
}
// Activation function
function activate(context) {
    const configFilePath = path.join(context.extensionPath, "templates-projects.json");
    const templates = JSON.parse(fs.readFileSync(configFilePath, "utf8"));
    // Group templates by prefix if they have a common root, otherwise leave them as standalone
    const groupedTemplates = groupTemplates(templates);
    const templateTreeDataProvider = new TemplateTreeDataProvider(groupedTemplates);
    vscode.window.registerTreeDataProvider("egovframeProjectView", templateTreeDataProvider);
    // Register collapse all command
    let collapseAll = vscode.commands.registerCommand("extension.collapseAllProjects", async () => {
        vscode.commands.executeCommand("workbench.actions.treeView.egovframeProjectView.collapseAll");
    });
    let generateProject = vscode.commands.registerCommand("extension.generateProjectContainer", async (template) => {
        const extensionPath = vscode.extensions.getExtension("egovframework.vscode-egovframe-initializr")?.extensionPath;
        if (!extensionPath) {
            vscode.window.showErrorMessage("Extension path not found");
            return;
        }
        const zipFilePath = path.join(extensionPath, "examples", template.fileName);
        const selectedPomFile = template.pomFile;
        // Check if the selected template is "New Web Project"
        if (template.displayName !== "eGovFrame Web Project") {
            const projectName = await vscode.window.showInputBox({
                prompt: "Enter project name",
                placeHolder: "ProjectName",
            });
            if (!projectName) {
                return;
            }
            const groupID = await vscode.window.showInputBox({
                prompt: "Enter group ID",
                placeHolder: "GroupID",
            });
            if (!groupID) {
                return;
            }
            const projectRoot = path.join(vscode.workspace.rootPath || "", projectName);
            await fs.ensureDir(projectRoot);
            // Extract the entire ZIP file
            await (0, extract_zip_1.default)(zipFilePath, { dir: projectRoot });
            if (selectedPomFile !== "") {
                const templatePath = path.join(extensionPath, "templates", "project", selectedPomFile);
                const outputPath = path.join(projectRoot, `pom.xml`);
                // Read the template
                const templateContent = fs.readFileSync(templatePath, "utf-8");
                // Define the context
                const templateContext = {
                    groupID,
                    projectName,
                };
                // Render the template using Handlebars
                const compiledTemplate = Handlebars.compile(templateContent);
                const renderedCode = compiledTemplate(templateContext);
                // Write the output to a file
                fs.writeFileSync(outputPath, renderedCode);
                // Open the newly created file in the editor
                const document = await vscode.workspace.openTextDocument(outputPath);
                await vscode.window.showTextDocument(document);
            }
            vscode.window.showInformationMessage(`Project ${projectName} created successfully`);
        }
        else {
            // For "New Web Project", use yauzl to select specific files
            const items = await readZipFile(zipFilePath);
            const quickPickItems = items.map((item) => ({
                label: item.fileName,
                description: item.filePath,
            }));
            const selectedItems = await vscode.window.showQuickPick(quickPickItems, {
                canPickMany: true,
            });
            if (!selectedItems) {
                return;
            }
            const projectName = await vscode.window.showInputBox({
                prompt: "Enter project name",
                placeHolder: "ProjectName",
            });
            if (!projectName) {
                return;
            }
            const groupID = await vscode.window.showInputBox({
                prompt: "Enter group ID",
                placeHolder: "GroupID",
            });
            if (!groupID) {
                return;
            }
            const projectRoot = path.join(vscode.workspace.rootPath || "", projectName);
            await fs.ensureDir(projectRoot);
            for (const selectedItem of selectedItems) {
                const item = items.find((i) => i.fileName === selectedItem.label &&
                    i.filePath === selectedItem.description);
                if (item) {
                    const destFilePath = path.join(projectRoot, item.filePath, item.fileName);
                    await extractFileFromZip(zipFilePath, path.posix.join(item.filePath, item.fileName), destFilePath);
                }
            }
            const templatePath = path.join(extensionPath, "templates", "project", selectedPomFile);
            const outputPath = path.join(projectRoot, `pom.xml`);
            // Read the template
            const templateContent = fs.readFileSync(templatePath, "utf-8");
            // Define the context
            const templateContext = {
                groupID,
                projectName,
            };
            // Render the template using Handlebars
            const compiledTemplate = Handlebars.compile(templateContent);
            const renderedCode = compiledTemplate(templateContext);
            // Write the output to a file
            fs.writeFileSync(outputPath, renderedCode);
            vscode.window.showInformationMessage(`Project ${projectName} created successfully`);
            // Open the newly created file in the editor
            const document = await vscode.workspace.openTextDocument(outputPath);
            await vscode.window.showTextDocument(document);
        }
    });
    context.subscriptions.push(generateProject, collapseAll);
}
// Function to group templates by prefix if they share the same prefix (e.g., "New Template Project > ...")
function groupTemplates(templates) {
    const groups = {};
    const groupedTemplates = [];
    // 그룹화된 템플릿을 순서대로 배열에 추가
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
            // 단일 템플릿은 바로 추가
            groupedTemplates.push({
                groupName: template.displayName,
                templates: [template],
            });
        }
    });
    return groupedTemplates;
}
// Read the zip file and list its contents
function readZipFile(zipFilePath) {
    return new Promise((resolve, reject) => {
        yauzl.open(zipFilePath, { lazyEntries: true }, (err, zipFile) => {
            if (err) {
                return reject(err);
            }
            const items = [];
            zipFile.readEntry();
            zipFile.on("entry", (entry) => {
                if (/\/$/.test(entry.fileName)) {
                    // Directory
                    zipFile.readEntry();
                }
                else {
                    const entryName = entry.fileName;
                    const lastIndex = entryName.lastIndexOf("/");
                    const item = {
                        fileName: lastIndex < 0 ? entryName : entryName.substring(lastIndex + 1),
                        filePath: lastIndex < 0 ? "" : entryName.substring(0, lastIndex),
                    };
                    items.push(item);
                    zipFile.readEntry();
                }
            });
            zipFile.on("end", () => {
                resolve(items);
            });
            zipFile.on("error", (error) => {
                reject(error);
            });
        });
    });
}
// Extract a specific file from the zip
function extractFileFromZip(zipFilePath, internalPath, destFilePath) {
    return new Promise((resolve, reject) => {
        yauzl.open(zipFilePath, { lazyEntries: true }, (err, zipFile) => {
            if (err) {
                return reject(err);
            }
            zipFile.on("entry", (entry) => {
                const entryFileName = entry.fileName.replace(/\\/g, "/"); // Ensure POSIX style
                const normalizedInternalPath = internalPath.replace(/\\/g, "/"); // Ensure POSIX style
                if (entryFileName === normalizedInternalPath) {
                    zipFile.openReadStream(entry, (err, readStream) => {
                        if (err) {
                            return reject(err);
                        }
                        fs.ensureDir(path.dirname(destFilePath), (err) => {
                            if (err) {
                                return reject(err);
                            }
                            readStream
                                .pipe(fs.createWriteStream(destFilePath))
                                .on("close", resolve);
                        });
                    });
                }
                else {
                    zipFile.readEntry();
                }
            });
            zipFile.readEntry();
        });
    });
}
function deactivate() { }
//# sourceMappingURL=generateProjectContainer.js.map