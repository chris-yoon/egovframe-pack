import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs-extra";
import extract from "extract-zip";
import * as yauzl from "yauzl";
import * as Handlebars from "handlebars";

// Define the SourceItem interface
interface SourceItem {
  fileName: string;
  filePath: string;
}

interface Template {
  displayName: string;
  fileName: string;
  pomFile: string;
}

export function activate(context: vscode.ExtensionContext) {
  let disposable = vscode.commands.registerCommand("extension.generateProjectByForm", () => {
    createWebview(context);
  });

  context.subscriptions.push(disposable);
}

function createWebview(context: vscode.ExtensionContext) {
  const panel = vscode.window.createWebviewPanel(
    "generateProject",
    "Generate Project",
    vscode.ViewColumn.One,
    {
      enableScripts: true,
    }
  );

  const htmlTemplatePath = path.join(context.extensionPath, "webviews", "generateProjectByForm.html");
  const htmlContent = fs.readFileSync(htmlTemplatePath, "utf8");

  panel.webview.html = htmlContent;

  panel.webview.onDidReceiveMessage(
    async (message) => {
      if (message.command === "generateProjectByForm") {
        await handleProjectGeneration(context, message.data);
        panel.dispose(); // Close the webview panel after processing
      } else if (message.command === "loadTemplates") {
        const extensionPath = vscode.extensions.getExtension(
          "egovframework.vscode-egovframe-initializr"
        )?.extensionPath;
        if (!extensionPath) {
          vscode.window.showErrorMessage("Extension path not found");
          return;
        }

        const templatesPath = path.join(extensionPath, "templates-projects.json");
        const templates: Template[] = await fs.readJSON(templatesPath);

        panel.webview.postMessage({
          command: 'loadTemplates',
          templates: templates
        });
      }
    },
    undefined,
    context.subscriptions
  );
}

async function handleProjectGeneration(context: vscode.ExtensionContext, data: { template: string, projectName: string, groupID: string }) {
  try {
    const extensionPath = vscode.extensions.getExtension(
      "egovframework.vscode-egovframe-initializr"
    )?.extensionPath;
    if (!extensionPath) {
      vscode.window.showErrorMessage("Extension path not found");
      return;
    }

    const templatesPath = path.join(extensionPath, "templates-projects.json");
    const templates: Template[] = await fs.readJSON(templatesPath);

    const selectedTemplate = templates.find(template => template.fileName === data.template);
    if (!selectedTemplate) {
      vscode.window.showErrorMessage("Template not found");
      return;
    }

    const zipFilePath = path.join(extensionPath, "examples", selectedTemplate.fileName);
    const projectRoot = path.join(vscode.workspace.rootPath || "", data.projectName);
    await fs.ensureDir(projectRoot);

    if (selectedTemplate.displayName === "eGovFrame Web Project") {
      // Handle "eGovFrame Web Template" by showing file list and letting the user select specific files to extract
      const items = await readZipFile(zipFilePath);
      
      const quickPickItems = items.map(item => ({
        label: item.fileName,
        description: item.filePath,
      }));

      const selectedItems = await vscode.window.showQuickPick(quickPickItems, {
        canPickMany: true,
      });

      if (!selectedItems) {
        return;
      }

      for (const selectedItem of selectedItems) {
        const item = items.find(i => i.fileName === selectedItem.label && i.filePath === selectedItem.description);
        if (item) {
          const destFilePath = path.join(projectRoot, item.filePath, item.fileName);
          await extractSingleFileFromZip(zipFilePath, path.posix.join(item.filePath, item.fileName), destFilePath);
        }
      }
    } else {
      // For other templates, extract the entire ZIP file to the project root
      await extract(zipFilePath, { dir: projectRoot });
    }

    if (selectedTemplate.pomFile !== "") {
      const templatePath = path.join(extensionPath, "templates", "project", selectedTemplate.pomFile);
      const outputPath = path.join(projectRoot, `pom.xml`);
  
      const template = fs.readFileSync(templatePath, "utf-8");
  
      const templateContext = {
        groupID: data.groupID,
        projectName: data.projectName
      };
  
      // Render the template using Handlebars
      const compiledTemplate = Handlebars.compile(template);
      const renderedCode = compiledTemplate(templateContext);
  
      fs.writeFileSync(outputPath, renderedCode);
    }

    vscode.window.showInformationMessage(
      `Project ${data.projectName} created successfully`
    );
  } catch (error) {
    if (error instanceof Error) {
      vscode.window.showErrorMessage(`Error: ${error.message}`);
    } else {
      vscode.window.showErrorMessage("An unknown error occurred");
    }
  }
}

function readZipFile(zipFilePath: string): Promise<SourceItem[]> {
  return new Promise((resolve, reject) => {
    yauzl.open(zipFilePath, { lazyEntries: true }, (err, zipFile) => {
      if (err) { return reject(err); }

      const items: SourceItem[] = [];

      zipFile.readEntry();
      zipFile.on("entry", (entry) => {
        if (/\/$/.test(entry.fileName)) {
          // Directory
          zipFile.readEntry();
        } else {
          const entryName = entry.fileName;
          const lastIndex = entryName.lastIndexOf("/");
          const item: SourceItem = {
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

function extractSingleFileFromZip(
  zipFilePath: string,
  internalPath: string,
  destFilePath: string
): Promise<void> {
  return new Promise((resolve, reject) => {
    yauzl.open(zipFilePath, { lazyEntries: true }, (err, zipFile) => {
      if (err) { return reject(err); }

      zipFile.on("entry", (entry) => {
        const entryFileName = entry.fileName.replace(/\\/g, '/'); // Ensure POSIX style
        const normalizedInternalPath = internalPath.replace(/\\/g, '/'); // Ensure POSIX style
        if (entryFileName === normalizedInternalPath) {
          zipFile.openReadStream(entry, (err, readStream) => {
            if (err) { return reject(err); }

            fs.ensureDir(path.dirname(destFilePath), (err) => {
              if (err) { return reject(err); }

              readStream
                .pipe(fs.createWriteStream(destFilePath))
                .on("close", resolve);
            });
          });
        } else {
          zipFile.readEntry();
        }
      });

      zipFile.readEntry();
    });
  });
}

export function deactivate() {}
