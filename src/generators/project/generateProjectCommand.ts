import * as vscode from "vscode";

export function registerGenerateProjectCommand(context: vscode.ExtensionContext) {
  let disposable = vscode.commands.registerCommand("extension.generateProjectCommand", async () => {
    console.log("🔄 Redirecting to React WebView...");
    
    // React 기반 webview를 호출
    vscode.commands.executeCommand("extension.generateProjectWebview");
  });

  context.subscriptions.push(disposable);
}

export function deactivate(): void {
  // Clean up resources and perform any necessary deactivation tasks
  // Currently no cleanup is needed, but we explicitly declare return type
  // to satisfy the linter and maintain good practices
}
