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
function activate(context) {
    const configFilePath = path.join(context.extensionPath, "templates-context-xml.json");
    const templates = JSON.parse(fs.readFileSync(configFilePath, "utf8"));
    let generateXmlByForm = vscode.commands.registerCommand("extension.generateXmlByForm", async (uri) => {
        let selectedFolderPath;
        if (uri) {
            // If the selected resource is a file, use its directory; if it's a folder, use the folder itself.
            const stats = await fs.stat(uri.fsPath);
            if (stats.isFile()) {
                selectedFolderPath = path.dirname(uri.fsPath);
            }
            else {
                selectedFolderPath = uri.fsPath;
            }
        }
        else {
            vscode.window.showWarningMessage('No folder or file selected. Please select a file or folder in the Explorer.');
            return;
        }
        // Step 2: Ask the user to select an XML generation type
        const options = templates.map((template) => ({
            label: template.displayName,
            template: template, // Attach the template object
        }));
        const selectedOption = await vscode.window.showQuickPick(options, {
            placeHolder: "Select XML Generation Type",
        });
        if (selectedOption && selectedOption.template) {
            createWebview(context, selectedOption.template.displayName, selectedOption.template.webView, selectedOption.template.vmFolder, selectedOption.template.vmFile, selectedFolderPath, // Pass the selected folder path
            selectedOption.template.fileNameProperty, // Pass the fileNameProperty
            selectedOption.template.javaConfigVmFile // Pass the JavaConfig VM file if exists
            );
        }
    });
    context.subscriptions.push(generateXmlByForm);
}
function createWebview(context, title, htmlFileName, vmFolder, vmFileName, outputFolderPath, // Add the output folder path as a parameter
fileNameProperty, // Add fileNameProperty as a parameter
javaConfigVmFileName // Optional JavaConfig VM file
) {
    const panel = vscode.window.createWebviewPanel("generateXml", title, vscode.ViewColumn.One, {
        enableScripts: true,
    });
    const htmlTemplatePath = path.join(context.extensionPath, "webviews", htmlFileName);
    const htmlContent = fs.readFileSync(htmlTemplatePath, "utf8");
    panel.webview.html = htmlContent;
    panel.webview.onDidReceiveMessage(async (message) => {
        if (message.command === "generateXmlByForm") {
            await generateXmlFile(message.data, context, vmFolder, vmFileName, outputFolderPath, fileNameProperty);
            panel.dispose(); // Close the webview panel after processing
        }
        else if (message.command === "generateJavaConfigByForm") {
            if (javaConfigVmFileName) {
                await generateJavaConfigFile(message.data, context, vmFolder, javaConfigVmFileName, outputFolderPath, fileNameProperty);
                panel.dispose(); // Close the webview panel after processing
            }
            else {
                vscode.window.showErrorMessage('JavaConfig template not defined for this generation type.');
            }
        }
    }, undefined, context.subscriptions);
}
async function generateXmlFile(data, context, vmFolder, vmFileName, outputFolderPath, // Use the selected folder path
fileNameProperty // Use the fileNameProperty
) {
    const xmlTemplatePath = path.join(context.extensionPath, "templates", vmFolder, vmFileName);
    const xmlContent = await renderTemplate(xmlTemplatePath, data);
    // Dynamically use the property specified by fileNameProperty
    let fileName = data[fileNameProperty] || 'default_filename';
    fileName += '.xml'; // Ensure the filename has a .xml extension
    const outputPath = path.join(outputFolderPath, fileName); // Use the selected folder
    await fs.writeFile(outputPath, xmlContent);
    vscode.window.showInformationMessage(`XML file created: ${outputPath}`);
}
async function generateJavaConfigFile(data, context, vmFolder, vmFileName, outputFolderPath, // Use the selected folder path
fileNameProperty // Use the fileNameProperty
) {
    const javaConfigTemplatePath = path.join(context.extensionPath, "templates", vmFolder, vmFileName);
    const javaConfigContent = await renderTemplate(javaConfigTemplatePath, data);
    // Dynamically use the property specified by fileNameProperty
    let fileName = data[fileNameProperty] || 'default_filename';
    fileName += '.java'; // Ensure the filename has a .java extension
    const outputPath = path.join(outputFolderPath, fileName); // Use the selected folder
    await fs.writeFile(outputPath, javaConfigContent);
    vscode.window.showInformationMessage(`JavaConfig file created: ${outputPath}`);
}
async function renderTemplate(templateFilePath, context) {
    let template = await fs.readFile(templateFilePath, "utf-8");
    // Handle #parse directives manually
    const parseRegex = /#parse\("(.+)"\)/g;
    let match;
    while ((match = parseRegex.exec(template)) !== null) {
        const includeFilePath = path.join(path.dirname(templateFilePath), match[1]);
        const includeTemplate = await fs.readFile(includeFilePath, "utf-8");
        template = template.replace(match[0], includeTemplate);
    }
    return (0, velocityjs_1.render)(template, context);
}
function deactivate() { }
//# sourceMappingURL=generateXmlByForm.js.map