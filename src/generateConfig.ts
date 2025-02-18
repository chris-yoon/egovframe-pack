import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs-extra";
import * as Handlebars from "handlebars";
import helpers from 'handlebars-helpers';

// handlebars-helpers 등록
helpers({ handlebars: Handlebars });

// Define an interface for your template configuration
//각 템플릿의 설정을 정의하는 인터페이스
interface TemplateConfig {
  displayName: string;
  vmFolder: string;
  vmFile: string;
  webView: string;
  fileNameProperty: string;  // Add fileNameProperty to the interface
  javaConfigVmFile?: string;  // Add javaConfigVmFile to handle JavaConfig template
}

// Define an interface that extends QuickPickItem to include the template
//QuickPick에서 사용할 수 있는 아이템을 정의하는 인터페이스
interface TemplateQuickPickItem extends vscode.QuickPickItem {
  template: TemplateConfig;
}

export function activate(context: vscode.ExtensionContext) {
  const configFilePath = path.join(context.extensionPath, "templates-context-xml.json");
  const templates: TemplateConfig[] = JSON.parse(fs.readFileSync(configFilePath, "utf8"));

  let generateConfig = vscode.commands.registerCommand(
    "extension.generateConfig",
    async (uri: vscode.Uri) => {
      let selectedFolderPath: string;

      if (uri) {
        // If the selected resource is a file, use its directory; if it's a folder, use the folder itself.
        const stats = await fs.stat(uri.fsPath);
        if (stats.isFile()) {
          selectedFolderPath = path.dirname(uri.fsPath);
        } else {
          selectedFolderPath = uri.fsPath;
        }
      } else {
        // If no URI is provided, show a folder selection dialog
        const folderUri = await vscode.window.showOpenDialog({
          canSelectFolders: true,
          canSelectFiles: false,
          openLabel: "Select folder to generate config",
        });

        if (folderUri && folderUri.length > 0) {
          selectedFolderPath = folderUri[0].fsPath;
        } else {
          vscode.window.showWarningMessage('No folder selected. Please select a folder.');
          return;
        }
      }

      // Step 2: Ask the user to select an XML generation type
      const options: TemplateQuickPickItem[] = templates.map((template: TemplateConfig) => ({
        label: template.displayName,
        template: template, // Attach the template object
      }));

      const selectedOption = await vscode.window.showQuickPick(options, {
        placeHolder: "Select Config Generation Type",
      });

      if (selectedOption && selectedOption.template) {
        createWebview(
          context,
          selectedOption.template.displayName,
          selectedOption.template.webView,
          selectedOption.template.vmFolder,
          selectedOption.template.vmFile,
          selectedFolderPath, // Pass the selected folder path
          selectedOption.template.fileNameProperty, // Pass the fileNameProperty
          selectedOption.template.javaConfigVmFile // Pass the JavaConfig VM file if exists
        );
      }
    }
  );

  context.subscriptions.push(generateConfig);
}

// 웹뷰를 생성하여 사용자가 템플릿에 필요한 데이터를 입력할 수 있도록 한다.
// 사용자가 입력한 데이터를 바탕으로 XML 또는 Java 설정 파일을 생성한다.
function createWebview(
  context: vscode.ExtensionContext,
  title: string,
  htmlFileName: string,
  vmFolder: string,
  vmFileName: string,
  outputFolderPath: string, // Add the output folder path as a parameter
  fileNameProperty: string,  // Add fileNameProperty as a parameter
  javaConfigVmFileName?: string // Optional JavaConfig VM file
) {
  const panel = vscode.window.createWebviewPanel(
    "generateXml",
    title,
    vscode.ViewColumn.One,
    {
      enableScripts: true,
    }
  );

  const htmlTemplatePath = path.join(
    context.extensionPath,
    "webviews",
    htmlFileName
  );
  const htmlContent = fs.readFileSync(htmlTemplatePath, "utf8");

  panel.webview.html = htmlContent;

  panel.webview.onDidReceiveMessage(
    async (message) => {
      if (message.command === "generateXml") {
        await generateXmlFile(message.data, context, vmFolder, vmFileName, outputFolderPath, fileNameProperty);
        panel.dispose(); // Close the webview panel after processing
      } else if (message.command === "generateJavaConfigByForm") {
        if (javaConfigVmFileName) {
          await generateJavaConfigFile(message.data, context, vmFolder, javaConfigVmFileName, outputFolderPath, fileNameProperty);
          panel.dispose(); // Close the webview panel after processing
        } else {
          vscode.window.showErrorMessage('JavaConfig template not defined for this generation type.');
        }
      }
    },
    undefined,
    context.subscriptions
  );
}

// 사용자가 입력한 데이터를 바탕으로 XML 설정 파일을 생성한다.
// 템플릿 파일을 읽고, Handlebars를 사용하여 데이터를 렌더링한 후, 결과 파일을 사용자가 선택한 디렉토리에 저장한다.
async function generateXmlFile(
  data: any,
  context: vscode.ExtensionContext,
  vmFolder: string,
  vmFileName: string,
  outputFolderPath: string, // Use the selected folder path
  fileNameProperty: string  // Use the fileNameProperty
) {
  const xmlTemplatePath = path.join(
    context.extensionPath,
    "templates",
    "config",
    vmFolder,
    vmFileName
  );
  const xmlContent = await renderTemplate(xmlTemplatePath, data);

  // Dynamically use the property specified by fileNameProperty
  let fileName = data[fileNameProperty] || 'default_filename';
  fileName += '.xml'; // Ensure the filename has a .xml extension
  const outputPath = path.join(outputFolderPath, fileName); // Use the selected folder

  await fs.writeFile(outputPath, xmlContent);
  vscode.window.showInformationMessage(`XML file created: ${outputPath}`);

  // Open the newly created file in the editor
  const document = await vscode.workspace.openTextDocument(outputPath);
  await vscode.window.showTextDocument(document);
}

// XML 파일과 비슷한 방식으로 Java 설정 파일을 생성한다.
async function generateJavaConfigFile(
  data: any,
  context: vscode.ExtensionContext,
  vmFolder: string,
  vmFileName: string,
  outputFolderPath: string, // Use the selected folder path
  fileNameProperty: string  // Use the fileNameProperty
) {
  const javaConfigTemplatePath = path.join(
    context.extensionPath,
    "templates",
    "config",
    vmFolder,
    vmFileName
  );
  const javaConfigContent = await renderTemplate(javaConfigTemplatePath, data);

  // Dynamically use the property specified by fileNameProperty
  let fileName = data[fileNameProperty] || 'default_filename';
  fileName += '.java'; // Ensure the filename has a .java extension
  const outputPath = path.join(outputFolderPath, fileName); // Use the selected folder

  await fs.writeFile(outputPath, javaConfigContent);
  vscode.window.showInformationMessage(`JavaConfig file created: ${outputPath}`);

  // Open the newly created file in the editor
  const document = await vscode.workspace.openTextDocument(outputPath);
  await vscode.window.showTextDocument(document);
}

// Handlebars를 사용하여 템플릿을 렌더링하는 함수
async function renderTemplate(templateFilePath: string, context: any): Promise<string> {
  const template = await fs.readFile(templateFilePath, "utf-8");
  const compiledTemplate = Handlebars.compile(template);
  return compiledTemplate(context);
}

export function deactivate() {}
