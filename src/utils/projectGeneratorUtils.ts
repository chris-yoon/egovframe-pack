import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs-extra";
import * as yauzl from "yauzl";
import extract from "extract-zip";
import * as Handlebars from "handlebars";

export interface Template {
  displayName: string;
  fileName: string;
  pomFile: string;
}

export interface SourceItem {
  fileName: string;
  filePath: string;
}

export interface ProjectConfig {
  projectName: string;
  groupID: string;
}

export async function getProjectConfig(): Promise<ProjectConfig | undefined> {
  const projectName = await vscode.window.showInputBox({
    prompt: "Enter project name",
    placeHolder: "ProjectName",
  });
  if (!projectName) {return;}

  const groupID = await vscode.window.showInputBox({
    prompt: "Enter group ID",
    placeHolder: "GroupID",
  });
  if (!groupID) {return;}

  return { projectName, groupID };
}

export async function generateProject(
  template: Template,
  config: ProjectConfig,
  extensionPath: string
): Promise<void> {
  const zipFilePath = path.join(extensionPath, "examples", template.fileName);
  const projectRoot = path.join(vscode.workspace.workspaceFolders?.[0]?.uri.fsPath ?? "", config.projectName);
  
  await fs.ensureDir(projectRoot);

  if (template.displayName === "eGovFrame Web Project") {
    await handleWebProject(zipFilePath, projectRoot, template, config, extensionPath);
  } else {
    await handleStandardProject(zipFilePath, projectRoot, template, config, extensionPath);
  }

  vscode.window.showInformationMessage(
    `Project ${config.projectName} created successfully`
  );
}

async function handleWebProject(
  zipFilePath: string,
  projectRoot: string,
  template: Template,
  config: ProjectConfig,
  extensionPath: string
): Promise<void> {
  const items = await readZipFile(zipFilePath);
  const selectedItems = await selectFiles(items);
  if (!selectedItems) {return;}

  for (const selectedItem of selectedItems) {
    const item = items.find(
      (i) => i.fileName === selectedItem.label && i.filePath === selectedItem.description
    );
    if (item) {
      await extractFileFromZip(
        zipFilePath,
        path.posix.join(item.filePath, item.fileName),
        path.join(projectRoot, item.filePath, item.fileName)
      );
    }
  }

  await generatePomFile(template, config, extensionPath, projectRoot);
}

async function handleStandardProject(
  zipFilePath: string,
  projectRoot: string,
  template: Template,
  config: ProjectConfig,
  extensionPath: string
): Promise<void> {
  await extract(zipFilePath, { dir: projectRoot });
  await generatePomFile(template, config, extensionPath, projectRoot);
}

async function generatePomFile(
  template: Template,
  config: ProjectConfig,
  extensionPath: string,
  projectRoot: string
): Promise<void> {
  if (template.pomFile === "") {return;}

  const templatePath = path.join(extensionPath, "templates", "project", template.pomFile);
  const outputPath = path.join(projectRoot, "pom.xml");

  const templateContent = fs.readFileSync(templatePath, "utf-8");
  const renderedCode = Handlebars.compile(templateContent)({
    groupID: config.groupID,
    projectName: config.projectName,
  });

  await fs.writeFile(outputPath, renderedCode);
  const document = await vscode.workspace.openTextDocument(outputPath);
  await vscode.window.showTextDocument(document);
}

export async function readZipFile(zipFilePath: string): Promise<SourceItem[]> {
  return new Promise((resolve, reject) => {
    yauzl.open(zipFilePath, { lazyEntries: true }, (err, zipFile) => {
      if (err) {return reject(err);}

      const items: SourceItem[] = [];
      zipFile.readEntry();
      zipFile.on("entry", (entry) => {
        if (entry.fileName.endsWith('/')) {
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
      zipFile.on("end", () => resolve(items));
    });
  });
}

async function selectFiles(items: SourceItem[]): Promise<vscode.QuickPickItem[] | undefined> {
  const quickPickItems = items.map((item) => ({
    label: item.fileName,
    description: item.filePath,
  }));

  return vscode.window.showQuickPick(quickPickItems, {
    canPickMany: true,
  });
}

export async function extractFileFromZip(
  zipPath: string,
  entryPath: string,
  outputPath: string
): Promise<void> {
  await fs.ensureDir(path.dirname(outputPath));
  return new Promise((resolve, reject) => {
    yauzl.open(zipPath, { lazyEntries: true }, (err, zipfile) => {
      if (err) {return reject(err);}
      zipfile.on("entry", (entry) => {
        if (entry.fileName === entryPath) {
          zipfile.openReadStream(entry, (err, readStream) => {
            if (err) {return reject(err);}
            const writeStream = fs.createWriteStream(outputPath);
            readStream.pipe(writeStream);
            writeStream.on("close", resolve);
          });
        } else {
          zipfile.readEntry();
        }
      });
      zipfile.readEntry();
    });
  });
}
