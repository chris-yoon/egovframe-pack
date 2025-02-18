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
const extract_zip_1 = __importDefault(require("extract-zip"));
const yauzl = __importStar(require("yauzl"));
const Handlebars = __importStar(require("handlebars"));
function activate(context) {
    let disposable = vscode.commands.registerCommand("extension.generateProjectByForm", () => {
        createWebview(context);
    });
    context.subscriptions.push(disposable);
}
function createWebview(context) {
    const panel = vscode.window.createWebviewPanel("generateProject", "Generate Project", vscode.ViewColumn.One, {
        enableScripts: true,
    });
    const htmlTemplatePath = path.join(context.extensionPath, "webviews", "generateProjectByForm.html");
    const htmlContent = fs.readFileSync(htmlTemplatePath, "utf8");
    panel.webview.html = htmlContent;
    panel.webview.onDidReceiveMessage(async (message) => {
        if (message.command === "generateProjectByForm") {
            await handleProjectGeneration(context, message.data);
            panel.dispose(); // Close the webview panel after processing
        }
        else if (message.command === "loadTemplates") {
            const extensionPath = vscode.extensions.getExtension("egovframework.vscode-egovframe-initializr")?.extensionPath;
            if (!extensionPath) {
                vscode.window.showErrorMessage("Extension path not found");
                return;
            }
            const templatesPath = path.join(extensionPath, "templates-projects.json");
            const templates = await fs.readJSON(templatesPath);
            panel.webview.postMessage({
                command: 'loadTemplates',
                templates: templates
            });
        }
    }, undefined, context.subscriptions);
}
async function handleProjectGeneration(context, data) {
    try {
        const extensionPath = vscode.extensions.getExtension("egovframework.vscode-egovframe-initializr")?.extensionPath;
        if (!extensionPath) {
            vscode.window.showErrorMessage("Extension path not found");
            return;
        }
        const templatesPath = path.join(extensionPath, "templates-projects.json");
        const templates = await fs.readJSON(templatesPath);
        const selectedTemplate = templates.find(template => template.fileName === data.template);
        if (!selectedTemplate) {
            vscode.window.showErrorMessage("Template not found");
            return;
        }
        const zipFilePath = path.join(extensionPath, "examples", selectedTemplate.fileName);
        const projectRoot = path.join(vscode.workspace.rootPath || "", data.projectName);
        await fs.ensureDir(projectRoot);
        if (selectedTemplate.displayName === "eGovFrame Web Project") {
            // Handle "eGovFrame Web Template" by showing file list and letting the user select specific files to extract
            const items = await readZipFile(zipFilePath);
            const quickPickItems = items.map(item => ({
                label: item.fileName,
                description: item.filePath,
            }));
            const selectedItems = await vscode.window.showQuickPick(quickPickItems, {
                canPickMany: true,
            });
            if (!selectedItems) {
                return;
            }
            for (const selectedItem of selectedItems) {
                const item = items.find(i => i.fileName === selectedItem.label && i.filePath === selectedItem.description);
                if (item) {
                    const destFilePath = path.join(projectRoot, item.filePath, item.fileName);
                    await extractSingleFileFromZip(zipFilePath, path.posix.join(item.filePath, item.fileName), destFilePath);
                }
            }
        }
        else {
            // For other templates, extract the entire ZIP file to the project root
            await (0, extract_zip_1.default)(zipFilePath, { dir: projectRoot });
        }
        if (selectedTemplate.pomFile !== "") {
            const templatePath = path.join(extensionPath, "templates", "project", selectedTemplate.pomFile);
            const outputPath = path.join(projectRoot, `pom.xml`);
            const template = fs.readFileSync(templatePath, "utf-8");
            const templateContext = {
                groupID: data.groupID,
                projectName: data.projectName
            };
            // Render the template using Handlebars
            const compiledTemplate = Handlebars.compile(template);
            const renderedCode = compiledTemplate(templateContext);
            fs.writeFileSync(outputPath, renderedCode);
        }
        vscode.window.showInformationMessage(`Project ${data.projectName} created successfully`);
    }
    catch (error) {
        if (error instanceof Error) {
            vscode.window.showErrorMessage(`Error: ${error.message}`);
        }
        else {
            vscode.window.showErrorMessage("An unknown error occurred");
        }
    }
}
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
function extractSingleFileFromZip(zipFilePath, internalPath, destFilePath) {
    return new Promise((resolve, reject) => {
        yauzl.open(zipFilePath, { lazyEntries: true }, (err, zipFile) => {
            if (err) {
                return reject(err);
            }
            zipFile.on("entry", (entry) => {
                const entryFileName = entry.fileName.replace(/\\/g, '/'); // Ensure POSIX style
                const normalizedInternalPath = internalPath.replace(/\\/g, '/'); // Ensure POSIX style
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
//# sourceMappingURL=generateProjectByForm.js.map