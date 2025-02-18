"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
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
}
function deactivate() { }
//# sourceMappingURL=extension.js.map