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
const fs = __importStar(require("fs-extra"));
const path = __importStar(require("path"));
const velocityjs_1 = require("velocityjs");
function activate(context) {
    let disposable = vscode.commands.registerCommand('extension.generateXml', async () => {
        const panel = vscode.window.createWebviewPanel('xmlGenerator', 'XML Generator', vscode.ViewColumn.One, {
            enableScripts: true
        });
        // Load the HTML content from the Velocity template
        const htmlTemplatePath = path.join(context.extensionPath, 'webviews', 'generateXmlByForm.html');
        const htmlContent = await renderTemplate(htmlTemplatePath, {});
        panel.webview.html = htmlContent;
        panel.webview.onDidReceiveMessage(message => {
            if (message.command === 'generateXml') {
                generateXmlFile(message.data, context);
            }
        }, undefined, context.subscriptions);
    });
    context.subscriptions.push(disposable);
}
async function generateXmlFile(data, context) {
    const xmlTemplatePath = path.join(context.extensionPath, 'templates', 'beanTemplate.vm');
    const xmlContent = await renderTemplate(xmlTemplatePath, data);
    const folderPath = vscode.workspace.rootPath || '';
    const outputPath = path.join(folderPath, `${data.beanName}.xml`);
    await fs.writeFile(outputPath, xmlContent);
    vscode.window.showInformationMessage(`XML file created: ${outputPath}`);
}
async function renderTemplate(templatePath, context) {
    const template = await fs.readFile(templatePath, 'utf-8');
    return (0, velocityjs_1.render)(template, context);
}
function deactivate() { }
//# sourceMappingURL=generateXml.js.map