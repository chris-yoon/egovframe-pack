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
const velocityjs_1 = require("velocityjs");
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
            await fillList(context, message.data);
            panel.dispose(); // Close the webview panel after processing
        }
        else if (message.command === "loadTemplates") {
            const extensionPath = vscode.extensions.getExtension("egovframework.egovframe-initializr")?.extensionPath;
            if (!extensionPath) {
                vscode.window.showErrorMessage("Extension path not found");
                return;
            }
            const templatesPath = path.join(extensionPath, "templates.json");
            const templates = await fs.readJSON(templatesPath);
            panel.webview.postMessage({
                command: 'loadTemplates',
                templates: templates
            });
        }
    }, undefined, context.subscriptions);
}
async function fillList(context, data) {
    try {
        const extensionPath = vscode.extensions.getExtension("egovframework.egovframe-initializr")?.extensionPath;
        if (!extensionPath) {
            vscode.window.showErrorMessage("Extension path not found");
            return;
        }
        const templatesPath = path.join(extensionPath, "templates.json");
        const templates = await fs.readJSON(templatesPath);
        const selectedTemplate = templates.find(template => template.fileName === data.template);
        if (!selectedTemplate) {
            vscode.window.showErrorMessage("Template not found");
            return;
        }
        const zipFilePath = path.join(extensionPath, "examples", selectedTemplate.fileName);
        const projectRoot = path.join(vscode.workspace.rootPath || "", data.projectName);
        await fs.ensureDir(projectRoot);
        // Extract the entire ZIP file to the project root
        await (0, extract_zip_1.default)(zipFilePath, { dir: projectRoot });
        const templatePath = path.join(extensionPath, "templates", selectedTemplate.pomFile);
        const outputPath = path.join(projectRoot, `pom.xml`);
        const template = fs.readFileSync(templatePath, "utf-8");
        const templateContext = {
            groupID: data.groupID,
            projectName: data.projectName
        };
        const renderedCode = (0, velocityjs_1.render)(template, templateContext);
        fs.writeFileSync(outputPath, renderedCode);
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
function deactivate() { }
//# sourceMappingURL=generateProjectByForm%20copy.js.map