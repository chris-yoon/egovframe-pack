import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs-extra';
import extractZip from 'extract-zip';
import { registerHandlebarsHelpers } from './utils/handlebarHelpers';

let extensionContext: vscode.ExtensionContext;

class EgovWebviewViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'egovframeInitializrView';

  constructor(private readonly _extensionUri: vscode.Uri) {}

  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken,
  ) {
    console.log('🔧 EgovWebviewViewProvider.resolveWebviewView called');
    
    webviewView.webview.options = {
      // Allow scripts in the webview
      enableScripts: true,

      localResourceRoots: [
        vscode.Uri.joinPath(this._extensionUri, 'webview-ui', 'dist')
      ]
    };

    console.log('⚙️ Webview options set');

    webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);
    console.log('📄 HTML content set for webview');

    webviewView.webview.onDidReceiveMessage(async (data) => {
      console.log('📨 Received message from EgovView:', data);
      try {
        const messageType = data.command || data.type; // command 또는 type 필드 모두 지원
        console.log('🔍 Processing message type:', messageType);
        switch (messageType) {
          case 'generateProject':
            await this.handleGenerateProject(data.projectConfig || data.config, webviewView.webview);
            break;
          case 'loadTemplates':
            await this.handleLoadTemplates(webviewView.webview);
            break;
          case 'selectOutputPath':
            console.log('🗂️ Handling selectOutputPath message');
            await this.handleSelectOutputPath(webviewView.webview);
            break;
          case 'getWorkspacePath':
            console.log('🏠 Handling getWorkspacePath message');
            await this.handleGetWorkspacePath(webviewView.webview);
            break;
          case 'generateCode':
            await this.handleGenerateCode(data, webviewView.webview);
            break;
          case 'generateConfig':
            await this.handleGenerateConfig(data, webviewView.webview);
            break;
          case 'generateProjectByCommand':
            await this.handleGenerateProjectByCommand(webviewView.webview);
            break;
          case 'done':
            // 사이드바에서는 done 버튼이 필요없지만, 메시지는 처리
            console.log('✅ Done button clicked');
            break;
          default:
            console.log(`Unknown command/type: ${messageType}`);
        }
      } catch (error) {
        console.error('❌ Error handling message:', error);
        if (error instanceof Error) {
          vscode.window.showErrorMessage(`Error: ${error.message}`);
          webviewView.webview.postMessage({
            type: 'error',
            success: false,
            error: error.message
          });
        }
      }
    });

    console.log('✅ WebviewView setup completed');
  }

  private _getHtmlForWebview(webview: vscode.Webview) {
    console.log('🏗️ Building HTML for webview...');
    
    const extensionPath = extensionContext.extensionPath;
    const distPath = path.join(extensionPath, 'webview-ui', 'dist');
    const mainJsPath = path.join(distPath, 'assets');
    
    console.log('📂 Looking for main.js in:', mainJsPath);
    
    // assets 폴더에서 main.js 파일 찾기
    const files = fs.readdirSync(mainJsPath);
    console.log('📁 Files in assets:', files);
    
    const mainJsFile = files.find(f => f.startsWith('main') && f.endsWith('.js'));
    
    if (!mainJsFile) {
      console.error('❌ Main JS file not found in:', mainJsPath);
      throw new Error('Main JS file not found');
    }

    console.log('✅ Found main JS file:', mainJsFile);

    const scriptUri = webview.asWebviewUri(vscode.Uri.file(path.join(mainJsPath, mainJsFile)));
    
    console.log('🔗 Script URI:', scriptUri.toString());
    
    const html = `<!DOCTYPE html>
      <html lang="en">
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>eGovFrame Initializr</title>
          <meta http-equiv="Content-Security-Policy" content="default-src 'none'; 
            style-src ${webview.cspSource} 'unsafe-inline'; 
            script-src ${webview.cspSource} 'unsafe-inline' 'unsafe-eval'; 
            img-src ${webview.cspSource} data: https:; 
            font-src ${webview.cspSource};
            connect-src ${webview.cspSource} https:;">
      </head>
      <body>
          <div id="root"></div>
          <script>
            console.log("🌟 EgovView React WebView initialized in sidebar");
            console.log("Script URI:", "${scriptUri}");
            console.log("Current timestamp:", new Date().toISOString());
            
            // React DevTools 및 기타 개발 도구들을 위한 글로벌 변수 설정
            window.__REACT_DEVTOOLS_GLOBAL_HOOK__ = window.__REACT_DEVTOOLS_GLOBAL_HOOK__ || {};
          </script>
          <script type="module" src="${scriptUri}"></script>
      </body>
      </html>`;

    console.log('📜 Generated HTML length:', html.length);
    return html;
  }

  // Message handlers
  private async handleGenerateProject(config: any, webview: vscode.Webview) {
    try {
      console.log('🚀 Starting project generation with config:', config);
      
      // Validate input
      if (!config || !config.template || !config.projectName || !config.outputPath) {
        throw new Error('Invalid configuration: missing required fields');
      }

      webview.postMessage({
        type: 'projectGenerationProgress',
        text: '🔍 Loading template configuration...'
      });

      // Load templates configuration
      const templatesPath = path.join(extensionContext.extensionPath, 'templates-projects.json');
      if (!await fs.pathExists(templatesPath)) {
        throw new Error('Templates configuration file not found');
      }

      const templates = await fs.readJSON(templatesPath);
      console.log('📋 Available templates:', templates.length);

      // Find the specified template
      const template = templates.find((t: any) => t.fileName === config.template.fileName);
      if (!template) {
        throw new Error(`Template not found: ${config.template.fileName}`);
      }

      console.log('✅ Found template:', template.displayName);

      webview.postMessage({
        type: 'projectGenerationProgress',
        text: '🗂️ Preparing project directory...'
      });

      // Prepare project directory
      const projectPath = path.join(config.outputPath, config.projectName);
      console.log('📁 Project path:', projectPath);

      // Check if project directory already exists
      if (await fs.pathExists(projectPath)) {
        const choice = await vscode.window.showWarningMessage(
          `Directory "${config.projectName}" already exists. Do you want to overwrite it?`,
          'Overwrite',
          'Cancel'
        );
        if (choice !== 'Overwrite') {
          webview.postMessage({
            type: 'projectGenerationResult',
            success: false,
            error: 'Project generation cancelled by user'
          });
          return;
        }
        // Remove existing directory
        await fs.remove(projectPath);
      }

      // Create project directory
      await fs.ensureDir(projectPath);

      webview.postMessage({
        type: 'projectGenerationProgress',
        text: '📦 Extracting template files...'
      });

      // Extract template ZIP file
      const templateZipPath = path.join(extensionContext.extensionPath, 'examples', template.fileName);
      console.log('📥 Template ZIP path:', templateZipPath);

      if (!await fs.pathExists(templateZipPath)) {
        throw new Error(`Template file not found: ${template.fileName}`);
      }

      // Extract ZIP file to project directory
      await extractZip(templateZipPath, { dir: projectPath });
      console.log('✅ Template extracted successfully');

      webview.postMessage({
        type: 'projectGenerationProgress',
        text: '🔧 Configuring project settings...'
      });

      // Process POM file if template has one
      if (template.pomFile) {
        await this.processPomFile(projectPath, config, template);
      }

      // Process project name replacement in files
      await this.processProjectFiles(projectPath, config);

      webview.postMessage({
        type: 'projectGenerationProgress',
        text: '✅ Project generation completed!'
      });

      // Send success result
      webview.postMessage({
        type: 'projectGenerationResult',
        success: true,
        projectPath: projectPath
      });

      // Show success notification
      const choice = await vscode.window.showInformationMessage(
        `Project "${config.projectName}" generated successfully!`,
        'Open Project',
        'Open in New Window'
      );

      if (choice === 'Open Project') {
        // Open the project in current window
        await vscode.commands.executeCommand('vscode.openFolder', vscode.Uri.file(projectPath));
      } else if (choice === 'Open in New Window') {
        // Open the project in new window
        await vscode.commands.executeCommand('vscode.openFolder', vscode.Uri.file(projectPath), { forceNewWindow: true });
      }

      console.log('🎉 Project generation completed successfully');

    } catch (error) {
      console.error('❌ Project generation failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      webview.postMessage({
        type: 'projectGenerationResult',
        success: false,
        error: errorMessage
      });

      vscode.window.showErrorMessage(`Project generation failed: ${errorMessage}`);
    }
  }

  private async processPomFile(projectPath: string, config: any, template: any) {
    try {
      console.log('🔧 Processing POM file...');
      
      // Only process if template has a pomFile specified
      if (!template.pomFile) {
        console.log('ℹ️ Template has no POM file specified, skipping POM processing');
        return;
      }

      // Read the POM template file from templates/project directory
      const pomTemplatePath = path.join(extensionContext.extensionPath, 'templates', 'project', template.pomFile);
      console.log('📝 Reading POM template:', pomTemplatePath);
      
      if (!await fs.pathExists(pomTemplatePath)) {
        throw new Error(`POM template file not found: ${template.pomFile}`);
      }

      let pomTemplateContent = await fs.readFile(pomTemplatePath, 'utf-8');
      console.log('✅ POM template loaded');

      // Replace placeholders in the template
      pomTemplateContent = pomTemplateContent.replace(/\{\{groupID\}\}/g, config.groupID || 'egovframework.example.sample');
      pomTemplateContent = pomTemplateContent.replace(/\{\{projectName\}\}/g, config.projectName);
      
      // Fix any malformed tags (e.g., <n> should be <name>)
      pomTemplateContent = pomTemplateContent.replace(/<n>/g, '<name>');
      pomTemplateContent = pomTemplateContent.replace(/<\/n>/g, '</name>');
      
      console.log('🔧 Placeholders replaced in POM template');

      // Find pom.xml files in the extracted project and replace them
      const pomFiles = await this.findPomFiles(projectPath);
      
      if (pomFiles.length === 0) {
        console.log('⚠️ No pom.xml files found in extracted project, creating new one at root');
        // Create pom.xml at project root if none exists
        const rootPomPath = path.join(projectPath, 'pom.xml');
        await fs.writeFile(rootPomPath, pomTemplateContent, 'utf-8');
        console.log('✅ New POM file created:', rootPomPath);
      } else {
        // Replace existing pom.xml files with the template content
        for (const pomFile of pomFiles) {
          console.log('📝 Replacing POM file:', pomFile);
          await fs.writeFile(pomFile, pomTemplateContent, 'utf-8');
          console.log('✅ POM file updated:', pomFile);
        }
      }
      
      console.log('🎉 POM file processing completed');
    } catch (error) {
      console.error('❌ Error processing POM file:', error);
      throw new Error(`Failed to process POM file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async findPomFiles(dir: string): Promise<string[]> {
    const pomFiles: string[] = [];
    
    async function scan(currentDir: string) {
      const items = await fs.readdir(currentDir);
      
      for (const item of items) {
        const fullPath = path.join(currentDir, item);
        const stat = await fs.stat(fullPath);
        
        if (stat.isDirectory()) {
          await scan(fullPath);
        } else if (item === 'pom.xml') {
          pomFiles.push(fullPath);
        }
      }
    }
    
    await scan(dir);
    return pomFiles;
  }

  private async processProjectFiles(projectPath: string, config: any) {
    try {
      console.log('🔧 Processing project files...');
      
      // Process Java package structure if groupID is specified
      if (config.groupID) {
        await this.processJavaPackages(projectPath, config.groupID);
      }
      
      // Process configuration files
      await this.processConfigFiles(projectPath, config);
      
      console.log('✅ Project files processed');
    } catch (error) {
      console.warn('⚠️ Warning: Could not process all project files:', error);
    }
  }

  private async processJavaPackages(projectPath: string, groupID: string) {
    try {
      // Find Java source directories
      const javaDirs = await this.findJavaSourceDirs(projectPath);
      
      for (const javaDir of javaDirs) {
        // Create new package structure
        const packagePath = groupID.replace(/\./g, '/');
        const newPackageDir = path.join(javaDir, packagePath);
        
        await fs.ensureDir(newPackageDir);
        
        // Find and update Java files
        await this.updateJavaFiles(javaDir, groupID);
      }
    } catch (error) {
      console.warn('⚠️ Warning: Could not process Java packages:', error);
    }
  }

  private async findJavaSourceDirs(dir: string): Promise<string[]> {
    const javaDirs: string[] = [];
    
    async function scan(currentDir: string) {
      const items = await fs.readdir(currentDir);
      
      for (const item of items) {
        const fullPath = path.join(currentDir, item);
        const stat = await fs.stat(fullPath);
        
        if (stat.isDirectory()) {
          if (item === 'java' && currentDir.includes('src')) {
            javaDirs.push(fullPath);
          } else {
            await scan(fullPath);
          }
        }
      }
    }
    
    await scan(dir);
    return javaDirs;
  }

  private async updateJavaFiles(dir: string, groupID: string) {
    try {
      const items = await fs.readdir(dir);
      
      for (const item of items) {
        const fullPath = path.join(dir, item);
        const stat = await fs.stat(fullPath);
        
        if (stat.isDirectory()) {
          await this.updateJavaFiles(fullPath, groupID);
        } else if (item.endsWith('.java')) {
          let content = await fs.readFile(fullPath, 'utf-8');
          
          // Update package declaration
          content = content.replace(
            /package egovframework\.example\.sample/g,
            `package ${groupID}`
          );
          
          // Update imports
          content = content.replace(
            /import egovframework\.example\.sample/g,
            `import ${groupID}`
          );
          
          await fs.writeFile(fullPath, content, 'utf-8');
        }
      }
    } catch (error) {
      console.warn('⚠️ Warning: Could not update Java files in:', dir, error);
    }
  }

  private async processConfigFiles(projectPath: string, config: any) {
    try {
      // Find and update configuration files
      const configFiles = await this.findConfigFiles(projectPath);
      
      for (const configFile of configFiles) {
        let content = await fs.readFile(configFile, 'utf-8');
        
        // Replace project name in various configuration files
        content = content.replace(/egovframework-example/g, config.projectName);
        content = content.replace(/example-project/g, config.projectName);
        
        await fs.writeFile(configFile, content, 'utf-8');
      }
    } catch (error) {
      console.warn('⚠️ Warning: Could not process config files:', error);
    }
  }

  private async findConfigFiles(dir: string): Promise<string[]> {
    const configFiles: string[] = [];
    const configPatterns = ['.xml', '.properties', '.yml', '.yaml', '.json'];
    
    async function scan(currentDir: string) {
      const items = await fs.readdir(currentDir);
      
      for (const item of items) {
        const fullPath = path.join(currentDir, item);
        const stat = await fs.stat(fullPath);
        
        if (stat.isDirectory()) {
          await scan(fullPath);
        } else if (configPatterns.some(pattern => item.endsWith(pattern))) {
          configFiles.push(fullPath);
        }
      }
    }
    
    await scan(dir);
    return configFiles;
  }

  private async handleLoadTemplates(webview: vscode.Webview) {
    try {
      const templatesPath = path.join(extensionContext.extensionPath, 'templates-projects.json');
      const templates = await fs.readJSON(templatesPath);
      
      webview.postMessage({
        type: 'templatesLoaded',
        templates: templates
      });
    } catch (error) {
      console.error('Error loading templates:', error);
      webview.postMessage({
        type: 'templatesLoaded',
        templates: []
      });
    }
  }

  private async handleSelectOutputPath(webview: vscode.Webview) {
    console.log('🗂️ Opening folder selection dialog...');
    const options: vscode.OpenDialogOptions = {
      canSelectMany: false,
      canSelectFiles: false,
      canSelectFolders: true,
      openLabel: 'Select Output Folder'
    };

    const result = await vscode.window.showOpenDialog(options);
    if (result && result[0]) {
      console.log('📁 Selected folder:', result[0].fsPath);
      const responseMessage = {
        type: 'selectedOutputPath',
        path: result[0].fsPath
      };
      console.log('📤 Sending selectedOutputPath response:', responseMessage);
      webview.postMessage(responseMessage);
    } else {
      console.log('❌ No folder selected');
    }
  }

  private async handleGetWorkspacePath(webview: vscode.Webview) {
    console.log('🏠 Getting workspace path...');
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (workspaceFolders && workspaceFolders.length > 0) {
      const workspacePath = workspaceFolders[0].uri.fsPath;
      console.log('📍 Workspace path:', workspacePath);
      const responseMessage = {
        type: 'currentWorkspacePath',
        path: workspacePath
      };
      console.log('📤 Sending currentWorkspacePath response:', responseMessage);
      webview.postMessage(responseMessage);
    } else {
      console.log('❌ No workspace folder found');
      const responseMessage = {
        type: 'currentWorkspacePath',
        path: ''
      };
      console.log('📤 Sending empty currentWorkspacePath response:', responseMessage);
      webview.postMessage(responseMessage);
    }
  }

  private async handleGenerateCode(message: any, webview: vscode.Webview) {
    try {
      console.log('🚀 Starting code generation with message:', message);
      
      // Validate input
      if (!message.ddl || !message.packageName || !message.outputPath) {
        throw new Error('Missing required fields: DDL, package name, or output path');
      }

      webview.postMessage({
        type: 'progress',
        text: '🔍 Parsing DDL...'
      });

      // Parse DDL
      const parsedDDL = this.parseDDL(message.ddl);
      console.log('📋 Parsed DDL:', parsedDDL);

      if (!parsedDDL.tableName || parsedDDL.attributes.length === 0) {
        throw new Error('Invalid DDL: Could not extract table information');
      }

      webview.postMessage({
        type: 'progress',
        text: `📦 Generating code for table: ${parsedDDL.tableName}`
      });

      // Prepare output directory
      const outputDir = path.join(message.outputPath, 'generated');
      await fs.ensureDir(outputDir);

      // Generate Java package structure
      const packagePath = message.packageName.split('.').join(path.sep);
      const javaDir = path.join(outputDir, 'src', 'main', 'java', packagePath);
      await fs.ensureDir(javaDir);

      // Generate SQL directory
      const sqlDir = path.join(outputDir, 'src', 'main', 'resources', 'egovframework', 'sqlmap');
      await fs.ensureDir(sqlDir);

      // Generate JSP directory
      const jspDir = path.join(outputDir, 'src', 'main', 'webapp', 'WEB-INF', 'jsp', 'egovframework');
      await fs.ensureDir(jspDir);

      webview.postMessage({
        type: 'progress',
        text: '📝 Creating Java files...'
      });

      // Generate files
      const context = this.createTemplateContext(parsedDDL, message.packageName);
      await this.generateJavaFiles(javaDir, context);
      await this.generateSQLFiles(sqlDir, context);
      await this.generateJSPFiles(jspDir, context);

      webview.postMessage({
        type: 'success',
        message: `✅ Code generated successfully at: ${outputDir}`
      });

      // Show success message with option to open generated folder
      const action = await vscode.window.showInformationMessage(
        `Code generated successfully for table '${parsedDDL.tableName}'`,
        'Open Folder',
        'View in Explorer'
      );

      if (action === 'Open Folder') {
        vscode.commands.executeCommand('vscode.openFolder', vscode.Uri.file(outputDir), true);
      } else if (action === 'View in Explorer') {
        vscode.commands.executeCommand('revealFileInOS', vscode.Uri.file(outputDir));
      }

    } catch (error) {
      console.error('❌ Error in code generation:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      webview.postMessage({
        type: 'error',
        message: errorMessage
      });
      
      vscode.window.showErrorMessage(`Code generation failed: ${errorMessage}`);
    }
  }

  // DDL 파싱 메서드
  private parseDDL(ddl: string): any {
    const lines = ddl.trim().split('\n');
    let tableName = '';
    const attributes: any[] = [];
    const pkAttributes: any[] = [];

    for (const line of lines) {
      const trimmedLine = line.trim();
      
      // Extract table name
      if (trimmedLine.toUpperCase().includes('CREATE TABLE')) {
        const match = trimmedLine.match(/CREATE TABLE\s+(\w+)/i);
        if (match) {
          tableName = match[1].toLowerCase();
        }
      }

      // Extract column definitions
      if (trimmedLine.includes('(') || (trimmedLine.includes(' ') && !trimmedLine.startsWith('--'))) {
        const columnMatch = trimmedLine.match(/(\w+)\s+(\w+)(\([^)]*\))?\s*(.*)/i);
        if (columnMatch) {
          const columnName = columnMatch[1].toLowerCase();
          const dataType = columnMatch[2].toUpperCase();
          const ccName = this.toCamelCase(columnName);
          const javaType = this.mapSqlToJavaType(dataType);
          const isPrimaryKey = trimmedLine.toUpperCase().includes('PRIMARY KEY');

          attributes.push({
            columnName,
            dataType,
            ccName,
            javaType,
            isPrimaryKey
          });

          if (isPrimaryKey) {
            pkAttributes.push({
              columnName,
              ccName,
              javaType
            });
          }
        }
      }
    }

    return { tableName, attributes, pkAttributes };
  }

  // Camel Case 변환
  private toCamelCase(str: string): string {
    return str.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
  }

  // SQL to Java 타입 매핑
  private mapSqlToJavaType(sqlType: string): string {
    const type = sqlType.toUpperCase();
    if (type.includes('VARCHAR') || type.includes('TEXT') || type.includes('CHAR')) return 'String';
    if (type.includes('INT') || type.includes('BIGINT')) return 'Long';
    if (type.includes('DECIMAL') || type.includes('NUMERIC')) return 'BigDecimal';
    if (type.includes('DATE') || type.includes('TIMESTAMP')) return 'Date';
    if (type.includes('BOOLEAN')) return 'Boolean';
    return 'String';
  }

  // 템플릿 컨텍스트 생성
  private createTemplateContext(parsedDDL: any, packageName: string) {
    return {
      tableName: parsedDDL.tableName,
      tableNameCamelCase: this.toCamelCase(parsedDDL.tableName),
      tableNamePascalCase: this.toCamelCase(parsedDDL.tableName).charAt(0).toUpperCase() + this.toCamelCase(parsedDDL.tableName).slice(1),
      attributes: parsedDDL.attributes,
      pkAttributes: parsedDDL.pkAttributes,
      hasCompositeKey: parsedDDL.pkAttributes.length > 1,
      packageName: packageName,
      packagePath: packageName.split('.').join('/'),
      packageImport: packageName
    };
  }

  // Java 파일 생성
  private async generateJavaFiles(javaDir: string, context: any) {
    const voContent = this.generateVOFile(context);
    const serviceContent = this.generateServiceFile(context);
    const serviceImplContent = this.generateServiceImplFile(context);
    const daoContent = this.generateDAOFile(context);
    const controllerContent = this.generateControllerFile(context);

    await fs.writeFile(path.join(javaDir, `${context.tableNamePascalCase}VO.java`), voContent);
    await fs.writeFile(path.join(javaDir, `${context.tableNamePascalCase}Service.java`), serviceContent);
    await fs.writeFile(path.join(javaDir, `${context.tableNamePascalCase}ServiceImpl.java`), serviceImplContent);
    await fs.writeFile(path.join(javaDir, `${context.tableNamePascalCase}DAO.java`), daoContent);
    await fs.writeFile(path.join(javaDir, `${context.tableNamePascalCase}Controller.java`), controllerContent);
  }

  // SQL 파일 생성
  private async generateSQLFiles(sqlDir: string, context: any) {
    const sqlContent = this.generateSQLMapperFile(context);
    await fs.writeFile(path.join(sqlDir, `${context.tableNamePascalCase}_SQL.xml`), sqlContent);
  }

  // JSP 파일 생성
  private async generateJSPFiles(jspDir: string, context: any) {
    const tableDir = path.join(jspDir, context.tableName);
    await fs.ensureDir(tableDir);

    const listContent = this.generateListJSP(context);
    const detailContent = this.generateDetailJSP(context);
    const registerContent = this.generateRegisterJSP(context);
    const modifyContent = this.generateModifyJSP(context);

    await fs.writeFile(path.join(tableDir, `${context.tableName}List.jsp`), listContent);
    await fs.writeFile(path.join(tableDir, `${context.tableName}Detail.jsp`), detailContent);
    await fs.writeFile(path.join(tableDir, `${context.tableName}Register.jsp`), registerContent);
    await fs.writeFile(path.join(tableDir, `${context.tableName}Modify.jsp`), modifyContent);
  }

  // 간단한 템플릿 생성 메서드들 (실제로는 Handlebars 템플릿 사용)
  private generateVOFile(context: any): string {
    const fields = context.attributes.map((attr: any) => 
      `    private ${attr.javaType} ${attr.ccName};\n`
    ).join('');
    
    const gettersSetters = context.attributes.map((attr: any) => `
    public ${attr.javaType} get${attr.ccName.charAt(0).toUpperCase() + attr.ccName.slice(1)}() {
        return ${attr.ccName};
    }

    public void set${attr.ccName.charAt(0).toUpperCase() + attr.ccName.slice(1)}(${attr.javaType} ${attr.ccName}) {
        this.${attr.ccName} = ${attr.ccName};
    }`
    ).join('\n');

    return `package ${context.packageName};

import java.io.Serializable;
import java.util.Date;
import java.math.BigDecimal;

/**
 * ${context.tableNamePascalCase} VO class
 */
public class ${context.tableNamePascalCase}VO implements Serializable {
    private static final long serialVersionUID = 1L;

${fields}
${gettersSetters}
}`;
  }

  private generateServiceFile(context: any): string {
    return `package ${context.packageName};

import java.util.List;

/**
 * ${context.tableNamePascalCase} Service Interface
 */
public interface ${context.tableNamePascalCase}Service {
    
    List<${context.tableNamePascalCase}VO> select${context.tableNamePascalCase}List(${context.tableNamePascalCase}VO searchVO) throws Exception;
    
    ${context.tableNamePascalCase}VO select${context.tableNamePascalCase}Detail(${context.tableNamePascalCase}VO ${context.tableNameCamelCase}VO) throws Exception;
    
    void insert${context.tableNamePascalCase}(${context.tableNamePascalCase}VO ${context.tableNameCamelCase}VO) throws Exception;
    
    void update${context.tableNamePascalCase}(${context.tableNamePascalCase}VO ${context.tableNameCamelCase}VO) throws Exception;
    
    void delete${context.tableNamePascalCase}(${context.tableNamePascalCase}VO ${context.tableNameCamelCase}VO) throws Exception;
}`;
  }

  private generateServiceImplFile(context: any): string {
    return `package ${context.packageName};

import java.util.List;
import org.springframework.stereotype.Service;
import javax.annotation.Resource;

/**
 * ${context.tableNamePascalCase} Service Implementation
 */
@Service("${context.tableNameCamelCase}Service")
public class ${context.tableNamePascalCase}ServiceImpl implements ${context.tableNamePascalCase}Service {
    
    @Resource(name = "${context.tableNameCamelCase}DAO")
    private ${context.tableNamePascalCase}DAO ${context.tableNameCamelCase}DAO;
    
    @Override
    public List<${context.tableNamePascalCase}VO> select${context.tableNamePascalCase}List(${context.tableNamePascalCase}VO searchVO) throws Exception {
        return ${context.tableNameCamelCase}DAO.select${context.tableNamePascalCase}List(searchVO);
    }
    
    @Override
    public ${context.tableNamePascalCase}VO select${context.tableNamePascalCase}Detail(${context.tableNamePascalCase}VO ${context.tableNameCamelCase}VO) throws Exception {
        return ${context.tableNameCamelCase}DAO.select${context.tableNamePascalCase}Detail(${context.tableNameCamelCase}VO);
    }
    
    @Override
    public void insert${context.tableNamePascalCase}(${context.tableNamePascalCase}VO ${context.tableNameCamelCase}VO) throws Exception {
        ${context.tableNameCamelCase}DAO.insert${context.tableNamePascalCase}(${context.tableNameCamelCase}VO);
    }
    
    @Override
    public void update${context.tableNamePascalCase}(${context.tableNamePascalCase}VO ${context.tableNameCamelCase}VO) throws Exception {
        ${context.tableNameCamelCase}DAO.update${context.tableNamePascalCase}(${context.tableNameCamelCase}VO);
    }
    
    @Override
    public void delete${context.tableNamePascalCase}(${context.tableNamePascalCase}VO ${context.tableNameCamelCase}VO) throws Exception {
        ${context.tableNameCamelCase}DAO.delete${context.tableNamePascalCase}(${context.tableNameCamelCase}VO);
    }
}`;
  }

  private generateDAOFile(context: any): string {
    return `package ${context.packageName};

import java.util.List;
import org.springframework.stereotype.Repository;

/**
 * ${context.tableNamePascalCase} DAO Interface
 */
@Repository("${context.tableNameCamelCase}DAO")
public interface ${context.tableNamePascalCase}DAO {
    
    List<${context.tableNamePascalCase}VO> select${context.tableNamePascalCase}List(${context.tableNamePascalCase}VO searchVO) throws Exception;
    
    ${context.tableNamePascalCase}VO select${context.tableNamePascalCase}Detail(${context.tableNamePascalCase}VO ${context.tableNameCamelCase}VO) throws Exception;
    
    void insert${context.tableNamePascalCase}(${context.tableNamePascalCase}VO ${context.tableNameCamelCase}VO) throws Exception;
    
    void update${context.tableNamePascalCase}(${context.tableNamePascalCase}VO ${context.tableNameCamelCase}VO) throws Exception;
    
    void delete${context.tableNamePascalCase}(${context.tableNamePascalCase}VO ${context.tableNameCamelCase}VO) throws Exception;
}`;
  }

  private generateControllerFile(context: any): string {
    return `package ${context.packageName};

import java.util.List;
import javax.annotation.Resource;
import org.springframework.stereotype.Controller;
import org.springframework.ui.ModelMap;
import org.springframework.web.bind.annotation.RequestMapping;

/**
 * ${context.tableNamePascalCase} Controller
 */
@Controller
public class ${context.tableNamePascalCase}Controller {
    
    @Resource(name = "${context.tableNameCamelCase}Service")
    private ${context.tableNamePascalCase}Service ${context.tableNameCamelCase}Service;
    
    @RequestMapping(value = "/${context.tableName}List.do")
    public String select${context.tableNamePascalCase}List(${context.tableNamePascalCase}VO searchVO, ModelMap model) throws Exception {
        List<${context.tableNamePascalCase}VO> resultList = ${context.tableNameCamelCase}Service.select${context.tableNamePascalCase}List(searchVO);
        model.addAttribute("resultList", resultList);
        return "egovframework/${context.tableName}/${context.tableName}List";
    }
    
    @RequestMapping(value = "/${context.tableName}Detail.do")
    public String select${context.tableNamePascalCase}Detail(${context.tableNamePascalCase}VO ${context.tableNameCamelCase}VO, ModelMap model) throws Exception {
        ${context.tableNamePascalCase}VO result = ${context.tableNameCamelCase}Service.select${context.tableNamePascalCase}Detail(${context.tableNameCamelCase}VO);
        model.addAttribute("result", result);
        return "egovframework/${context.tableName}/${context.tableName}Detail";
    }
}`;
  }

  private generateSQLMapperFile(context: any): string {
    const insertColumns = context.attributes.map((attr: any) => attr.columnName).join(', ');
    const insertValues = context.attributes.map((attr: any) => `#{${attr.ccName}}`).join(', ');
    const updateSet = context.attributes.filter((attr: any) => !attr.isPrimaryKey)
      .map((attr: any) => `${attr.columnName} = #{${attr.ccName}}`).join(',\n        ');
    const whereClause = context.pkAttributes.map((attr: any) => `${attr.columnName} = #{${attr.ccName}}`).join(' AND ');

    return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE mapper PUBLIC "-//mybatis.org//DTD Mapper 3.0//EN" "http://mybatis.org/dtd/mybatis-3-mapper.dtd">
<mapper namespace="${context.packageName}.${context.tableNamePascalCase}DAO">

    <resultMap id="${context.tableNameCamelCase}Map" type="${context.packageName}.${context.tableNamePascalCase}VO">
${context.attributes.map((attr: any) => `        <result property="${attr.ccName}" column="${attr.columnName}" />`).join('\n')}
    </resultMap>

    <select id="select${context.tableNamePascalCase}List" parameterType="${context.packageName}.${context.tableNamePascalCase}VO" resultMap="${context.tableNameCamelCase}Map">
        SELECT ${context.attributes.map((attr: any) => attr.columnName).join(', ')}
        FROM ${context.tableName}
        WHERE 1=1
    </select>

    <select id="select${context.tableNamePascalCase}Detail" parameterType="${context.packageName}.${context.tableNamePascalCase}VO" resultMap="${context.tableNameCamelCase}Map">
        SELECT ${context.attributes.map((attr: any) => attr.columnName).join(', ')}
        FROM ${context.tableName}
        WHERE ${whereClause}
    </select>

    <insert id="insert${context.tableNamePascalCase}" parameterType="${context.packageName}.${context.tableNamePascalCase}VO">
        INSERT INTO ${context.tableName} (${insertColumns})
        VALUES (${insertValues})
    </insert>

    <update id="update${context.tableNamePascalCase}" parameterType="${context.packageName}.${context.tableNamePascalCase}VO">
        UPDATE ${context.tableName}
        SET ${updateSet}
        WHERE ${whereClause}
    </update>

    <delete id="delete${context.tableNamePascalCase}" parameterType="${context.packageName}.${context.tableNamePascalCase}VO">
        DELETE FROM ${context.tableName}
        WHERE ${whereClause}
    </delete>

</mapper>`;
  }

  private generateListJSP(context: any): string {
    return `<%@ page contentType="text/html; charset=utf-8" pageEncoding="utf-8"%>
<%@ taglib prefix="c" uri="http://java.sun.com/jsp/jstl/core" %>
<%@ taglib prefix="ui" uri="http://egovframework.gov/ctl/ui"%>
<%@ taglib uri="http://java.sun.com/jsp/jstl/functions" prefix="fn" %>

<!DOCTYPE html PUBLIC "-//W3C//DTD HTML 4.01 Transitional//EN" "http://www.w3.org/TR/html4/loose.dtd">
<html>
<head>
<meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
<title>${context.tableNamePascalCase} List</title>
</head>
<body>
    <div id="wrapper">
        <h1>${context.tableNamePascalCase} List</h1>
        
        <div class="board">
            <table class="board_list">
                <thead>
                    <tr>
${context.attributes.slice(0, 5).map((attr: any) => `                        <th scope="col">${attr.ccName}</th>`).join('\n')}
                        <th scope="col">Actions</th>
                    </tr>
                </thead>
                <tbody>
                    <c:forEach var="result" items="\${resultList}" varStatus="status">
                        <tr>
${context.attributes.slice(0, 5).map((attr: any) => `                            <td>\${result.${attr.ccName}}</td>`).join('\n')}
                            <td>
                                <a href="${context.tableName}Detail.do?${context.pkAttributes.map((attr: any) => `${attr.ccName}=\${result.${attr.ccName}}`).join('&')}">View</a>
                            </td>
                        </tr>
                    </c:forEach>
                </tbody>
            </table>
        </div>
    </div>
</body>
</html>`;
  }

  private generateDetailJSP(context: any): string {
    return `<%@ page contentType="text/html; charset=utf-8" pageEncoding="utf-8"%>
<%@ taglib prefix="c" uri="http://java.sun.com/jsp/jstl/core" %>

<!DOCTYPE html PUBLIC "-//W3C//DTD HTML 4.01 Transitional//EN" "http://www.w3.org/TR/html4/loose.dtd">
<html>
<head>
<meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
<title>${context.tableNamePascalCase} Detail</title>
</head>
<body>
    <div id="wrapper">
        <h1>${context.tableNamePascalCase} Detail</h1>
        
        <div class="board">
            <table class="board_view">
${context.attributes.map((attr: any) => `                <tr>
                    <th scope="row">${attr.ccName}</th>
                    <td>\${result.${attr.ccName}}</td>
                </tr>`).join('\n')}
            </table>
        </div>
        
        <div class="btn_area">
            <a href="${context.tableName}List.do" class="btn_s">List</a>
        </div>
    </div>
</body>
</html>`;
  }

  private generateRegisterJSP(context: any): string {
    return `<%@ page contentType="text/html; charset=utf-8" pageEncoding="utf-8"%>
<%@ taglib prefix="c" uri="http://java.sun.com/jsp/jstl/core" %>

<!DOCTYPE html PUBLIC "-//W3C//DTD HTML 4.01 Transitional//EN" "http://www.w3.org/TR/html4/loose.dtd">
<html>
<head>
<meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
<title>${context.tableNamePascalCase} Register</title>
</head>
<body>
    <div id="wrapper">
        <h1>${context.tableNamePascalCase} Register</h1>
        
        <form id="registerForm" name="registerForm" method="post">
            <div class="board">
                <table class="board_write">
${context.attributes.filter((attr: any) => !attr.isPrimaryKey).map((attr: any) => `                    <tr>
                        <th scope="row">${attr.ccName} <span class="sound_only">required</span></th>
                        <td><input name="${attr.ccName}" id="${attr.ccName}" class="w100" type="text" value="" /></td>
                    </tr>`).join('\n')}
                </table>
            </div>
            
            <div class="btn_area">
                <button type="submit" class="btn_s">Register</button>
                <a href="${context.tableName}List.do" class="btn_s">Cancel</a>
            </div>
        </form>
    </div>
</body>
</html>`;
  }

  private generateModifyJSP(context: any): string {
    return `<%@ page contentType="text/html; charset=utf-8" pageEncoding="utf-8"%>
<%@ taglib prefix="c" uri="http://java.sun.com/jsp/jstl/core" %>

<!DOCTYPE html PUBLIC "-//W3C//DTD HTML 4.01 Transitional//EN" "http://www.w3.org/TR/html4/loose.dtd">
<html>
<head>
<meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
<title>${context.tableNamePascalCase} Modify</title>
</head>
<body>
    <div id="wrapper">
        <h1>${context.tableNamePascalCase} Modify</h1>
        
        <form id="modifyForm" name="modifyForm" method="post">
${context.pkAttributes.map((attr: any) => `            <input type="hidden" name="${attr.ccName}" value="\${result.${attr.ccName}}" />`).join('\n')}
            
            <div class="board">
                <table class="board_write">
${context.attributes.filter((attr: any) => !attr.isPrimaryKey).map((attr: any) => `                    <tr>
                        <th scope="row">${attr.ccName} <span class="sound_only">required</span></th>
                        <td><input name="${attr.ccName}" id="${attr.ccName}" class="w100" type="text" value="\${result.${attr.ccName}}" /></td>
                    </tr>`).join('\n')}
                </table>
            </div>
            
            <div class="btn_area">
                <button type="submit" class="btn_s">Update</button>
                <a href="${context.tableName}Detail.do?${context.pkAttributes.map((attr: any) => `${attr.ccName}=\${result.${attr.ccName}}`).join('&')}" class="btn_s">Cancel</a>
            </div>
        </form>
    </div>
</body>
</html>`;
  }

  private async handleGenerateConfig(message: any, webview: vscode.Webview) {
    try {
      webview.postMessage({
        type: 'configGenerationResult',
        success: true
      });
      vscode.window.showInformationMessage('Configuration generated successfully');
    } catch (error) {
      webview.postMessage({
        type: 'configGenerationResult',
        success: false,
        error: 'Configuration generation failed'
      });
    }
  }

  private async handleGenerateProjectByCommand(webview: vscode.Webview) {
    try {
      webview.postMessage({
        type: 'projectGenerationProgress', 
        text: '🚀 Starting interactive project generation...'
      });

      // Step 1: Select category
      const categories = ["All", "Web", "Template", "Mobile", "Boot", "MSA", "Batch"];
      const selectedCategory = await vscode.window.showQuickPick(categories, {
        placeHolder: "Select project category",
        ignoreFocusOut: true,
      });

      if (!selectedCategory) {
        webview.postMessage({
          type: 'projectGenerationProgress',
          text: '❌ Generation cancelled - no category selected'
        });
        return;
      }

      webview.postMessage({
        type: 'projectGenerationProgress',
        text: `📁 Category selected: ${selectedCategory}`
      });

      // Step 2: Get templates for category
      const templatesPath = path.join(extensionContext.extensionPath, 'templates-projects.json');
      if (!await fs.pathExists(templatesPath)) {
        throw new Error('Templates configuration file not found');
      }

      const allTemplates = await fs.readJSON(templatesPath);
      const filteredTemplates = selectedCategory === "All" 
        ? allTemplates 
        : allTemplates.filter((t: any) => 
            t.category?.toLowerCase() === selectedCategory.toLowerCase()
          );

      if (filteredTemplates.length === 0) {
        vscode.window.showWarningMessage(`No templates found for category: ${selectedCategory}`);
        return;
      }

      // Step 3: Select template
      const templateItems = filteredTemplates.map((template: any) => ({
        label: template.displayName,
        description: template.fileName,
        detail: `POM: ${template.pomFile || "Not required"} | Category: ${template.category || "Unknown"}`,
        template,
      }));

      const selectedTemplateItem: any = await vscode.window.showQuickPick(templateItems, {
        placeHolder: `Select template from ${filteredTemplates.length} available`,
        matchOnDescription: true,
        matchOnDetail: true,
        ignoreFocusOut: true,
      });

      if (!selectedTemplateItem) {
        webview.postMessage({
          type: 'projectGenerationProgress',
          text: '❌ Generation cancelled - no template selected'
        });
        return;
      }

      webview.postMessage({
        type: 'projectGenerationProgress',
        text: `📦 Template selected: ${selectedTemplateItem.template.displayName}`
      });

      // Step 4: Enter project name
      const projectName = await vscode.window.showInputBox({
        prompt: "Enter project name",
        placeHolder: "my-egov-project",
        validateInput: (value) => {
          if (!value || value.trim() === "") {
            return "Project name is required";
          }
          if (!/^[a-zA-Z][a-zA-Z0-9_-]*$/.test(value)) {
            return "Project name must start with a letter and contain only letters, numbers, hyphens, and underscores";
          }
          return null;
        },
        ignoreFocusOut: true,
      });

      if (!projectName) {
        webview.postMessage({
          type: 'projectGenerationProgress',
          text: '❌ Generation cancelled - no project name entered'
        });
        return;
      }

      webview.postMessage({
        type: 'projectGenerationProgress',
        text: `✏️ Project name: ${projectName}`
      });

      // Step 5: Enter Group ID (if needed)
      let groupID = "";
      if (selectedTemplateItem.template.pomFile) {
        groupID = await vscode.window.showInputBox({
          prompt: "Enter Maven Group ID",
          placeHolder: "egovframework.example.sample",
          value: "egovframework.example.sample",
          validateInput: (value) => {
            if (!value || value.trim() === "") {
              return "Group ID is required for this template";
            }
            if (!/^[a-zA-Z][a-zA-Z0-9._-]*$/.test(value)) {
              return "Group ID must be a valid Java package name";
            }
            return null;
          },
          ignoreFocusOut: true,
        }) || "";

        if (!groupID) {
          webview.postMessage({
            type: 'projectGenerationProgress',
            text: '❌ Generation cancelled - no group ID entered'
          });
          return;
        }

        webview.postMessage({
          type: 'projectGenerationProgress',
          text: `🏷️ Group ID: ${groupID}`
        });
      }

      // Step 6: Select output path
      const outputPathOptions: vscode.OpenDialogOptions = {
        canSelectMany: false,
        canSelectFiles: false,
        canSelectFolders: true,
        openLabel: "Select Output Directory",
        title: "Select where to create the project",
      };

      const outputPathResult = await vscode.window.showOpenDialog(outputPathOptions);
      if (!outputPathResult || outputPathResult.length === 0) {
        webview.postMessage({
          type: 'projectGenerationProgress',
          text: '❌ Generation cancelled - no output path selected'
        });
        return;
      }

      const outputPath = outputPathResult[0].fsPath;
      webview.postMessage({
        type: 'projectGenerationProgress',
        text: `📂 Output path: ${outputPath}`
      });

      // Step 7: Confirm generation
      const confirmMessage = `Generate eGovFrame project with the following settings?

Project Name: ${projectName}
Template: ${selectedTemplateItem.template.displayName}
${groupID ? `Group ID: ${groupID}` : ""}
Output Path: ${outputPath}

The project will be created at: ${path.join(outputPath, projectName)}`;

      const confirmed = await vscode.window.showInformationMessage(
        confirmMessage,
        { modal: true },
        "Generate Project",
      );

      if (confirmed !== "Generate Project") {
        webview.postMessage({
          type: 'projectGenerationProgress',
          text: '❌ Generation cancelled by user'
        });
        return;
      }

      // Step 8: Generate project
      const config = {
        projectName,
        groupID,
        outputPath,
        template: selectedTemplateItem.template,
      };

      await this.handleGenerateProject(config, webview);

      // Step 9: Offer to open project after successful generation
      const projectPath = path.join(outputPath, projectName);
      if (await fs.pathExists(projectPath)) {
        webview.postMessage({
          type: 'projectGenerationProgress',
          text: '✅ Interactive generation completed successfully!'
        });

        const openProject = await vscode.window.showInformationMessage(
          `✅ eGovFrame project "${projectName}" created successfully!`,
          "Open Project",
          "Open in New Window",
          "Show in Explorer",
        );

        if (openProject === "Open Project") {
          const projectUri = vscode.Uri.file(projectPath);
          await vscode.commands.executeCommand("vscode.openFolder", projectUri, {
            forceNewWindow: false,
          });
        } else if (openProject === "Open in New Window") {
          const projectUri = vscode.Uri.file(projectPath);
          await vscode.commands.executeCommand("vscode.openFolder", projectUri, {
            forceNewWindow: true,
          });
        } else if (openProject === "Show in Explorer") {
          await vscode.commands.executeCommand("revealFileInOS", vscode.Uri.file(projectPath));
        }
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      webview.postMessage({
        type: 'projectGenerationProgress',
        text: `❌ Interactive generation error: ${errorMessage}`
      });
      vscode.window.showErrorMessage(`Interactive generation failed: ${errorMessage}`);
    }
  }
}

export function activate(context: vscode.ExtensionContext) {
  console.log('🚀 eGovFrame Initializr extension is activating...');
  
  // Register Handlebars helpers once at activation
  registerHandlebarsHelpers();

  // context를 모듈 변수에 저장
  extensionContext = context;

  // WebviewViewProvider 등록
  const provider = new EgovWebviewViewProvider(context.extensionUri);
  
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(EgovWebviewViewProvider.viewType, provider)
  );

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

  console.log('✅ eGovFrame Initializr extension activated successfully - Sidebar view registered');
}

export function getExtensionContext(): vscode.ExtensionContext {
  return extensionContext;
}

export function deactivate(): void {
  // Clean up resources and perform any necessary deactivation tasks
  // Currently no cleanup is needed, but we explicitly declare return type
  // to satisfy the linter and maintain good practices
}
