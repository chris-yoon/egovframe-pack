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
const yauzl = __importStar(require("yauzl"));
const velocityjs_1 = require("velocityjs");
async function selectInputResourceType() {
    const inputResourceType = await vscode.window.showQuickPick(['File(SAM): File to File / File to DB', 'Database: DB to File / DB to DB'], {
        placeHolder: 'Select the Batch Input Resource Type',
    });
    return inputResourceType;
}
async function selectExecutionType() {
    const executionType = await vscode.window.showQuickPick(['Scheduler', 'Command Line', 'Web'], {
        placeHolder: 'Select the Execution Type',
    });
    return executionType;
}
function activate(context) {
    let disposable = vscode.commands.registerCommand("extension.generateBatchProject", async () => {
        try {
            const extensionPath = vscode.extensions.getExtension("egovframework.egovframe-initializr")?.extensionPath;
            if (!extensionPath) {
                vscode.window.showErrorMessage("Extension path not found");
                return;
            }
            const inputResourceType = await selectInputResourceType();
            if (!inputResourceType) {
                vscode.window.showErrorMessage("Batch Input Resource Type not selected");
                return;
            }
            const executionType = await selectExecutionType();
            if (!executionType) {
                vscode.window.showErrorMessage("Batch Execution Type not selected");
                return;
            }
            const fileType = inputResourceType.toLowerCase().startsWith('file') ? 'sam' : 'db';
            const scheduler = executionType.toLowerCase().replace(' ', '');
            const fileName = `egovframework.rte.bat.template.${fileType}.${scheduler}.zip`;
            const zipFilePath = path.join(extensionPath, "examples", fileName);
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
            const items = await readZipFile(zipFilePath);
            for (const item of items) {
                const destFilePath = path.join(projectRoot, item.filePath, item.fileName);
                await extractFileFromZip(zipFilePath, path.posix.join(item.filePath, item.fileName), destFilePath);
            }
            const templatePath = path.join(extensionPath, "templates", "pomTemplate.xml");
            const outputPath = path.join(projectRoot, `pom.xml`);
            // Read the template
            const template = fs.readFileSync(templatePath, "utf-8");
            // Define the context
            const templateContext = {
                groupID,
                projectName,
            };
            // Render the template
            const renderedCode = (0, velocityjs_1.render)(template, templateContext);
            // Write the output to a file
            fs.writeFileSync(outputPath, renderedCode);
            vscode.window.showInformationMessage(`Batch Project ${projectName} created successfully`);
        }
        catch (error) {
            if (error instanceof Error) {
                vscode.window.showErrorMessage(`Error: ${error.message}`);
            }
            else {
                vscode.window.showErrorMessage("An unknown error occurred");
            }
        }
    });
    context.subscriptions.push(disposable);
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
function extractFileFromZip(zipFilePath, internalPath, destFilePath) {
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
//# sourceMappingURL=generateBatchProject-unused.js.map