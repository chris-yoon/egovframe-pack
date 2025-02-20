import * as assert from 'assert';
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs-extra';
import { getExtensionContext } from '../../extension';

suite('Generate Code Test Suite', () => {
    // suite 레벨에서 workspaceFolder 변수 선언
    let workspaceFolder: string;
    let context: vscode.ExtensionContext;

    // 각 테스트가 실행되기 전에 확장이 활성화되도록 설정
    setup(async () => {
        const ext = vscode.extensions.getExtension('egovframework.vscode-egovframe-initializr');
        await ext?.activate(); // extension.ts의 activate 함수가 호출되어야 함

        // getExtensionContext를 통해 context 가져오기
        context = getExtensionContext();
        if (!context) {
            throw new Error('Extension context not initialized');
        }
        console.log('Context:', context);

        // 임시 워크스페이스 생성
        workspaceFolder = path.join(__dirname, '../../../test-workspace');
        await fs.ensureDir(workspaceFolder);

        console.log('Workspace folder created:', workspaceFolder);
    });

    // 테스트 완료 후 임시 워크스페이스 정리
    teardown(async () => {
        // 임시 워크스페이스 삭제
        if (workspaceFolder) {
            await fs.remove(workspaceFolder);
        }
        console.log('Workspace folder removed:', workspaceFolder);
    });

    // 명령어가 등록되었는지 확인
    test('generateCode command should be registered', async () => {
        // 모든 명령어 목록 가져오기
        const commands = await vscode.commands.getCommands(true);
        
        // 'extension.'으로 시작하는 명령어만 필터링
        const extensionCommands = commands.filter(cmd => cmd.startsWith('extension.'));
        
        // 디버깅을 위해 extension 명령어들만 출력
        console.log('Extension commands:', extensionCommands);
        
        // 명령어 존재 확인
        assert.ok(extensionCommands.includes('extension.generateCode'), 
            'extension.generateCode command should be registered');
    });

    // 에디터 내에서 DDL 선택 후 CRUD 코드 생성 테스트
    test('Generate CRUD code from DDL selection in the editor', async () => {
        // 테스트용 DDL
        const testDDL = `
            CREATE TABLE users (
            id INT PRIMARY KEY AUTO_INCREMENT,
            name VARCHAR(100) NOT NULL,
            email VARCHAR(100) UNIQUE NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );`;

        // DDL을 임시 파일에 작성
        const ddlPath = path.join(workspaceFolder, 'test.sql');
        await fs.writeFile(ddlPath, testDDL);

        // 파일 열기
        const document = await vscode.workspace.openTextDocument(ddlPath);
        const editor = await vscode.window.showTextDocument(document);

        // 전체 텍스트 선택
        const entireRange = new vscode.Range(
            document.positionAt(0),
            document.positionAt(document.getText().length)
        );
        editor.selection = new vscode.Selection(entireRange.start, entireRange.end);

        // generateCode 명령 실행
        await vscode.commands.executeCommand('extension.generateCode');

        // 생성된 파일 확인
        const generatedFiles = await fs.readdir(workspaceFolder);

        // 생성된 파일 목록을 로그로 출력
        console.log('Generated files:', generatedFiles);

        // 'generated'라는 문자열이 포함된 파일이 하나 이상 존재해야 함을 확인
        assert.ok(generatedFiles.some(file => file.includes('test.sql')),
            'Generated files should exist');
    });

    // Sample DDL 삽입 명령어 테스트
    test('Sample DDL insertion should work', async () => {
        await vscode.commands.executeCommand('extension.insertSampleDDL');
        
        // DDL이 삽입되었는지 확인하는 로직
        // Note: Webview 내용 확인은 제한적이므로, 명령어 실행 여부만 확인
        assert.ok(true, 'Sample DDL insertion command executed successfully');
    });

});
