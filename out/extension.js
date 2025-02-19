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
const generateCode_1 = require("./generateCode");
const generateProject_1 = require("./generateProject");
const generateConfig_1 = require("./generateConfig");
const generateConfigContainer_1 = require("./generateConfigContainer");
const generateProjectByForm_1 = require("./generateProjectByForm");
const generateCodeContainer_1 = require("./generateCodeContainer");
const generateProjectContainer_1 = require("./generateProjectContainer");
function activate(context) {
    (0, generateCode_1.activate)(context);
    (0, generateProject_1.activate)(context);
    (0, generateConfig_1.activate)(context);
    (0, generateConfigContainer_1.activate)(context);
    (0, generateProjectByForm_1.activate)(context);
    (0, generateCodeContainer_1.activate)(context);
    (0, generateProjectContainer_1.activate)(context);
    context.subscriptions.push(vscode.commands.registerCommand('extension.openPackageSettings', async () => {
        const config = vscode.workspace.getConfiguration('egovframeInitializr');
        const currentValue = config.get('defaultPackageName', 'egovframework.example.sample');
        const newValue = await vscode.window.showInputBox({
            prompt: 'Enter default package name',
            placeHolder: 'e.g., egovframework.example.sample',
            value: currentValue
        });
        if (newValue !== undefined) {
            await config.update('defaultPackageName', newValue, vscode.ConfigurationTarget.Global);
            vscode.window.showInformationMessage(`Default package name updated to: ${newValue}`);
        }
    }));
}
function deactivate() { }
//# sourceMappingURL=extension.js.map