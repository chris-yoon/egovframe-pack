import * as vscode from 'vscode';
import { activate as activateGenerateCode } from './generateCode';
import { activate as activateGenerateProject } from './generateProject';
import { activate as activategenerateConfig } from './generateConfig';
import { activate as activategenerateConfigContainer } from './generateConfigContainer';
import { activate as activateGenerateProjectByForm } from './generateProjectByForm';
import { activate as activategenerateCodeContainer } from './generateCodeContainer';
import { activate as activategenerateProjectContainer } from './generateProjectContainer';

let extensionContext: vscode.ExtensionContext;

export function activate(context: vscode.ExtensionContext) {

  // 각각의 기능을 활성화합니다.
  activateGenerateCode(context);
  activateGenerateProject(context);
  activategenerateConfig(context);
  activategenerateConfigContainer(context);
  activateGenerateProjectByForm(context);
  activategenerateCodeContainer(context);
  activategenerateProjectContainer(context);

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
