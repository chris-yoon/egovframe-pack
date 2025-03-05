// 테스트에 필요한 모듈 가져오기
import * as assert from 'assert';
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs-extra';
import * as sinon from 'sinon';
import { Template } from '../../utils/projectGeneratorUtils';
import { getExtensionContext } from '../../extension';

// QuickPickItem을 확장한 커스텀 인터페이스 추가
interface TemplateQuickPickItem extends vscode.QuickPickItem {
    template: Template;
}

suite('Generate Project Test Suite', () => {
    // suite 레벨에서 workspaceFolder 변수 선언
    let workspaceFolder: string;
    let context: vscode.ExtensionContext;
    let templatesPath: string;
    let sandbox: sinon.SinonSandbox;

    // 각 테스트가 실행되기 전에 확장이 활성화되도록 설정
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
        
        // 디렉토리가 실제로 생성되었는지 확인
        await new Promise(resolve => setTimeout(resolve, 100)); // 파일 시스템 동기화를 위한 짧은 대기
        
        // 디렉토리 존재 확인
        const exists = await fs.pathExists(workspaceFolder);
        if (!exists) {
            throw new Error(`Failed to create workspace directory: ${workspaceFolder}`);
        }

        // templates-projects.json 경로 설정
        templatesPath = path.join(context.extensionPath, 'templates-projects.json');

        // VS Code 워크스페이스 설정
        await vscode.workspace.updateWorkspaceFolders(0, 0, { uri: vscode.Uri.file(workspaceFolder) });

        console.log('Workspace folder created:', workspaceFolder);
    });

    // 테스트 완료 후 임시 워크스페이스 정리
    teardown(async () => {
        sandbox.restore();
        if (workspaceFolder) {
            await fs.remove(workspaceFolder);
        }
        console.log('Workspace folder removed:', workspaceFolder);
    });

    // generateProject 명령어 등록 확인
    test('generateProjectCommand should be registered', async () => {
        const commands = await vscode.commands.getCommands(true);
        assert.ok(
            commands.includes('extension.generateProjectCommand'),
            'extension.generateProjectCommand should be registered'
        );
    });

    // templates-projects.json 유효성 검사
    test('templates-projects.json should be valid', async () => {
        assert.ok(await fs.pathExists(templatesPath), 'templates-projects.json should exist');
        
        const templates: Template[] = await fs.readJSON(templatesPath);
        assert.ok(Array.isArray(templates), 'templates should be an array');

        console.log('Templates:', templates);
        
        templates.forEach(template => {
            assert.ok(template.displayName, 'template should have displayName');
            assert.ok(template.fileName, 'template should have fileName');
            assert.ok('pomFile' in template, 'template should have pomFile property');
        });
    });

    // 프로젝트 생성 테스트
    test('project generation with valid input', async () => {
        const testProjectName = 'test-project';
        const testGroupId = 'com.test';

        // sandbox.stub을 사용하여 vscode.window.showQuickPick과 vscode.window.showInputBox를 가로채기
        // 실제 Quick Pick UI를 띄우지 않고, 테스트에서 바로 결과를 얻음
        const quickPickStub = sandbox.stub(vscode.window, 'showQuickPick');
        quickPickStub.resolves({
            label: 'eGovFrame Boot Web Project', // Quick Pick UI에서 사용자에게 보여질 항목의 이름, 드롭다운 메뉴에서 "eGovFrame Boot Web Project"로 표시됨
            description: path.join(context.extensionPath, 'examples', 'example-boot-web.zip'), // examples/example-boot-web.zip 파일의 전체 경로
            template: { 
                // 이 객체는 선택된 템플릿에 대한 정보를 담고 있으며, generateProject 함수에서 사용된다.
                displayName: 'eGovFrame Boot Web Project',
                fileName: 'example-boot-web.zip',
                pomFile: 'example-boot-web-pom.xml'
            }
        } as TemplateQuickPickItem);

        // showInputBox를 가로채기
        const inputBoxStub = sandbox.stub(vscode.window, 'showInputBox');
        inputBoxStub.onFirstCall().resolves(testProjectName);
        inputBoxStub.onSecondCall().resolves(testGroupId);

        // generateProject 명령 실행
        await vscode.commands.executeCommand('extension.generateProjectCommand');

        // 생성된 프로젝트 확인
        const projectPath = path.join(workspaceFolder, testProjectName);
        assert.ok(await fs.pathExists(projectPath), 'Project directory should be created');
        assert.ok(
            await fs.pathExists(path.join(projectPath, 'pom.xml')),
            'pom.xml should be generated'
        );

        // 생성된 파일 목록을 재귀적으로 가져와서 로그로 표시
        const getFilesRecursively = async (dir: string): Promise<string[]> => {
            const files = await fs.readdir(dir);
            const filePaths = await Promise.all(
                files.map(async file => {
                    const filePath = path.join(dir, file);
                    const stats = await fs.stat(filePath);
                    if (stats.isDirectory()) {
                        return getFilesRecursively(filePath);
                    } else {
                        return filePath;
                    }
                })
            );
            return filePaths.flat();
        };

        const files = await getFilesRecursively(projectPath);
        console.log('Generated project files:');
        files.forEach(file => {
            console.log('  -', path.relative(projectPath, file));
        });
    });

    // 취소 처리 테스트
    test('project generation should handle cancellation', async () => {
        const quickPickStub = sandbox.stub(vscode.window, 'showQuickPick');
        quickPickStub.resolves(undefined);

        await vscode.commands.executeCommand('extension.generateProjectCommand');

        const files = await fs.readdir(workspaceFolder);
        assert.strictEqual(files.length, 0, 'No files should be created when cancelled');
    });

    // 오류 처리 테스트
    test('project generation should handle errors', async () => {
        const errorMessageStub = sandbox.stub(vscode.window, 'showErrorMessage');
        
        const quickPickStub = sandbox.stub(vscode.window, 'showQuickPick');
        quickPickStub.resolves({
            label: 'Invalid Template',
            description: 'invalid/path',
            template: {
                displayName: 'Invalid Template',
                fileName: 'non-existent.zip',
                pomFile: 'non-existent-pom.xml'
            }
        } as TemplateQuickPickItem);

        const inputBoxStub = sandbox.stub(vscode.window, 'showInputBox');
        inputBoxStub.onFirstCall().resolves('error-test-project');
        inputBoxStub.onSecondCall().resolves('com.error.test');

        await vscode.commands.executeCommand('extension.generateProjectCommand');

        assert.ok(errorMessageStub.called, 'Error message should be shown');
    });

    // extension 경로 확인
    test('extension path should be available', async () => {
        const extensionPath = vscode.extensions.getExtension(
            'egovframework.vscode-egovframe-initializr'
        )?.extensionPath;

        assert.ok(extensionPath, 'Extension path should be available');
        assert.ok(
            await fs.pathExists(path.join(extensionPath, 'templates-projects.json')),
            'templates-projects.json should exist in extension path'
        );
    });
});
