import * as vscode from 'vscode';
import { activate as activateGenerateCode } from './generateCode';
import { activate as activateGenerateProject } from './generateProject';
import { activate as activategenerateConfig } from './generateConfig';
import { activate as activategenerateConfigContainer } from './generateConfigContainer';
import { activate as activateGenerateProjectByForm } from './generateProjectByForm';
import { activate as activategenerateCodeContainer } from './generateCodeContainer';
import { activate as activategenerateProjectContainer } from './generateProjectContainer';

export function activate(context: vscode.ExtensionContext) {
  activateGenerateCode(context);
  activateGenerateProject(context);
  activategenerateConfig(context);
  activategenerateConfigContainer(context);
  activateGenerateProjectByForm(context);
  activategenerateCodeContainer(context);
  activategenerateProjectContainer(context);
}

export function deactivate() {}
