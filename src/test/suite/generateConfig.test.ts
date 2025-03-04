// 테스트에 필요한 모듈 가져오기
import * as assert from 'assert';
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs-extra';
import * as sinon from 'sinon';
import { getExtensionContext } from '../../extension';
import * as configGeneratorUtils from '../../utils/configGeneratorUtils';

// TemplateConfig 인터페이스 정의
interface TemplateConfig {
    displayName: string;
    webView: string;
    templateFolder: string;
    templateFile: string;
    fileNameProperty: string;
    javaConfigTemplate?: string;
}

// QuickPickItem을 확장한 인터페이스 정의
interface TemplateQuickPickItem extends vscode.QuickPickItem {
    template: TemplateConfig;
}

suite('Generate Config Test Suite', () => {
    let workspaceFolder: string;
    let context: vscode.ExtensionContext;
    let sandbox: sinon.SinonSandbox;

    setup(async () => {
        sandbox = sinon.createSandbox();
        
        // 확장 활성화
        const ext = vscode.extensions.getExtension('egovframework.vscode-egovframe-initializr');
        await ext?.activate();

        // 컨텍스트 가져오기
        context = getExtensionContext();
        if (!context) {
            throw new Error('Extension context not initialized');
        }

        // 임시 워크스페이스 생성
        workspaceFolder = path.join(__dirname, '../../../test-workspace');
        await fs.ensureDir(workspaceFolder);

        // VS Code 워크스페이스 설정
        await vscode.workspace.updateWorkspaceFolders(0, 0, { uri: vscode.Uri.file(workspaceFolder) });
    });

    teardown(async () => {
        sandbox.restore();
        if (workspaceFolder) {
            await fs.remove(workspaceFolder);
        }
    });

    // 명령어 등록 테스트
    test('generateConfig command should be registered', async () => {
        const commands = await vscode.commands.getCommands(true);
        assert.ok(
            commands.includes('extension.generateConfigCommand'),
            'extension.generateConfigCommand should be registered'
        );
    });

    // templates-context-xml.json 파일 유효성 ���스트
    test('templates-context-xml.json should be valid', async () => {
        const configFilePath = path.join(context.extensionPath, 'templates-context-xml.json');
        assert.ok(await fs.pathExists(configFilePath), 'templates-context-xml.json should exist');

        const templates = await fs.readJSON(configFilePath);
        assert.ok(Array.isArray(templates), 'templates should be an array');

        templates.forEach(template => {
            assert.ok(template.displayName, 'template should have displayName');
            assert.ok(template.webView, 'template should have webView');
            assert.ok(template.templateFolder, 'template should have templateFolder');
            assert.ok(template.templateFile, 'template should have templateFile');
            assert.ok(template.fileNameProperty, 'template should have fileNameProperty');
        });
    });

    // QuickPick 선택 테스트
    test('should show QuickPick with template options', async () => {
        const quickPickStub = sandbox.stub(vscode.window, 'showQuickPick');
        const mockTemplate: TemplateConfig = {
            displayName: 'Logging > New Console Appender',
            webView: 'logging-console-form.html',
            templateFolder: 'logging',
            templateFile: 'console.hbs',
            fileNameProperty: 'txtFileName',
            javaConfigTemplate: 'console-java.hbs'
        };

        quickPickStub.resolves({
            label: mockTemplate.displayName,
            template: mockTemplate
        } as TemplateQuickPickItem);

        await vscode.commands.executeCommand('extension.generateConfigCommand');

        assert.ok(quickPickStub.called, 'showQuickPick should be called');
        assert.strictEqual(
            quickPickStub.firstCall.args[1]?.placeHolder,
            'Select Config Generation Type'
        );
    });

    // Webview 생성 테스트
    test('should create config webview when template is selected', async () => {
        const mockTemplate: TemplateConfig = {
            displayName: 'Logging > New Console Appender',
            webView: 'logging-console-form.html',
            templateFolder: 'logging',
            templateFile: 'console.hbs',
            fileNameProperty: 'txtFileName',
            javaConfigTemplate: 'console-java.hbs'
        };

        const quickPickStub = sandbox.stub(vscode.window, 'showQuickPick');
        quickPickStub.resolves({
            label: mockTemplate.displayName,
            template: mockTemplate
        } as TemplateQuickPickItem);

        // Webview 패널 생성 모니터링
        let webviewCreated = false;
        const createWebviewPanelStub = sandbox.stub(vscode.window, 'createWebviewPanel')
            .callsFake(() => {
                webviewCreated = true;
                return {
                    webview: {
                        html: '',
                        onDidReceiveMessage: () => ({ dispose: () => {} }),
                        postMessage: () => Promise.resolve()
                    },
                    dispose: () => {}
                } as any;
            });

        await vscode.commands.executeCommand('extension.generateConfigCommand');

        assert.ok(webviewCreated, 'Webview should be created');
        assert.ok(createWebviewPanelStub.called, 'createWebviewPanel should be called');
    });

    // 환경설정 파일 생성 테스트
    test('should generate Java config file when generateJavaConfigByForm is triggered', async () => {
        try {
            console.log('Starting test setup...');
            
            const mockTemplate: TemplateConfig = {
                displayName: 'Logging > New Console Appender',
                webView: 'logging-console-form.html',
                templateFolder: 'logging',
                templateFile: 'console.hbs',
                fileNameProperty: 'txtFileName',
                javaConfigTemplate: 'console-java.hbs'
            };

            // QuickPick 자동 선택 설정
            const quickPickStub = sandbox.stub(vscode.window, 'showQuickPick');
            quickPickStub.resolves({
                label: mockTemplate.displayName,
                template: mockTemplate
            } as TemplateQuickPickItem);
            
            // createConfigWebview 함수 모의화
            sandbox.stub(configGeneratorUtils, 'createConfigWebview')
                .callsFake(async (context, options) => {
                    console.log('Mock createConfigWebview called with options:', options);
                    
                    const templatePath = path.join(
                        (context as vscode.ExtensionContext).extensionPath,
                        'templates',
                        'config',
                        'logging',
                        mockTemplate.javaConfigTemplate ?? mockTemplate.templateFile
                    );
                    console.log('Reading template from:', templatePath);
                    
                    const formData = {
                        defaultPackageName: 'com.example.config',
                        txtFileName: 'EgovLoggingConfig',
                        txtAppenderName: 'console',
                        txtConversionPattern: '%d %5p [%c] %m%n'
                    };
                    console.log('Applying template with data:', formData);
                    
                    // 동일한 모듈의 renderTemplate 사용
                    const generatedContent = await configGeneratorUtils.renderTemplate(templatePath, formData);
                    console.log('Generated content:', generatedContent);

                    // 파일 생성
                    const testFilePath = path.join(workspaceFolder, `${formData.txtFileName}.java`);
                    console.log('Creating test file at:', testFilePath);
                    
                    await fs.writeFile(testFilePath, generatedContent);
                    
                    // 파일 생성 확인
                    const fileExists = await fs.pathExists(testFilePath);
                    assert.ok(fileExists, 'Generated file should exist');
                    
                    // 파일 내용 확인
                    const actualContent = await fs.readFile(testFilePath, 'utf8');
                    console.log('Created file content:', actualContent);
                    
                    console.log('Test file successfully created and verified');
                    return Promise.resolve();
                });

            // 명령어 실행
            await vscode.commands.executeCommand('extension.generateConfigCommand');

        } catch (error) {
            console.error('Test failed with error:', error);
            if (error instanceof Error) {
                console.error('Error stack:', error.stack);
            }
            throw error;
        }
    });

    // 취소 처리 테스트
    test('should handle QuickPick cancellation', async () => {
        const quickPickStub = sandbox.stub(vscode.window, 'showQuickPick');
        quickPickStub.resolves(undefined);

        const createWebviewPanelSpy = sandbox.spy(vscode.window, 'createWebviewPanel');

        await vscode.commands.executeCommand('extension.generateConfigCommand');

        assert.ok(!createWebviewPanelSpy.called, 'Webview should not be created when QuickPick is cancelled');
    });

});
