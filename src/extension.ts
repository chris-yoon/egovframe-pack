import * as vscode from 'vscode';
import { registerHandlebarsHelpers } from './utils/handlebarHelpers';
import { registerGenerateCodeCommand } from './generators/code/generateCodeCommand';
import { registerGenerateCodeExplorer } from './generators/code/generateCodeExplorer';
import { registerGenerateConfigCommand } from './generators/config/generateConfigCommand';
import { registerGenerateConfigExplorer } from './generators/config/generateConfigExplorer';
import { registerGenerateProjectCommand } from './generators/project/generateProjectCommand';
import { registerGenerateProjectWebview } from './generators/project/generateProjectWebview';
import { registerGenerateProjectExplorer } from './generators/project/generateProjectExplorer';

let extensionContext: vscode.ExtensionContext;

export function activate(context: vscode.ExtensionContext) {
  // Register Handlebars helpers once at activation
  registerHandlebarsHelpers();

  // 각각의 기능을 활성화합니다.
  registerGenerateCodeCommand(context);
  registerGenerateCodeExplorer(context);
  registerGenerateProjectCommand(context);
  registerGenerateConfigCommand(context);
  registerGenerateConfigExplorer(context);
  registerGenerateProjectWebview(context);
  registerGenerateProjectExplorer(context);
  
  context.subscriptions.push(
    vscode.commands.registerCommand('extension.openPackageSettings', async () => {
      const config = vscode.workspace.getConfiguration('egovframeInitializr');
      const currentValue = config.get<string>('defaultPackageName', 'egovframework.example.sample');
      
      const newValue = await vscode.window.showInputBox({
        prompt: 'Enter default package name',
        placeHolder: 'e.g., egovframework.example.sample',
        value: currentValue
      });

      if (newValue !== undefined) {
        await config.update('defaultPackageName', newValue, vscode.ConfigurationTarget.Global);
        vscode.window.showInformationMessage(`Default package name updated to: ${newValue}`);
      }
    })
  );

  // 테스트를 위해 상태 저장
  context.globalState.update('webviewCreated', true);

  // context를 모듈 변수에 저장
  extensionContext = context;

}

export function getExtensionContext(): vscode.ExtensionContext {
  return extensionContext;
}

export function deactivate(): void {
  // Clean up resources and perform any necessary deactivation tasks
  // Currently no cleanup is needed, but we explicitly declare return type
  // to satisfy the linter and maintain good practices
}
