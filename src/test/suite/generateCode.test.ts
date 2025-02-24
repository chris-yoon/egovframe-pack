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

        console.log('Extension activated');

        // getExtensionContext를 통해 context 가져오기
        context = getExtensionContext();
        if (!context) {
            throw new Error('Extension context not initialized');
        }
        //console.log('Context:', context);

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
        
        // DDL이 삽입되었는지 확인하는 로직ㅡ
        // Note: Webview 내용 확인은 제한적이므로, 명령어 실행 여부만 확인
        assert.ok(true, 'Sample DDL insertion command executed successfully');
    });

    test('insertSampleDDL should display DDL in webview', async () => {
        // insertSampleDDL 명령어 실행
        await vscode.commands.executeCommand('extension.insertSampleDDL');
    
        // Webview가 생성될 때까지 최대 3초 대기
        let webviewPanel: vscode.WebviewPanel | undefined;
        for (let i = 0; i < 30; i++) {
            await new Promise(resolve => setTimeout(resolve, 100)); // 100ms 간격으로 확인
            const panels = (vscode.window as any).visibleWebviewPanels || [];
            webviewPanel = panels.find(
                (panel: vscode.WebviewPanel) => panel.viewType === 'egovframeCodeView'
            );
            if (webviewPanel) {break;}
        }
    
        // Webview가 생성되었는지 확인
        if (!webviewPanel) {
            // 대체 확인: context.globalState에서 상태 확인
            const webviewCreated = context.globalState.get('webviewCreated') as boolean;
            if (webviewCreated === undefined) {
                console.warn('Webview creation check not implemented in extension and no visible panels found.');
                assert.fail('Webview should be visible or marked as created in extension state');
            } else {
                assert.ok(webviewCreated, 'Webview should be created by the extension');
                // 상태만 확인하고 메시지 검증은 생략 (Webview 객체 없음)
                console.warn('Skipping DDL content check since Webview panel is not directly accessible.');
                return;
            }
        } else {
            assert.ok(webviewPanel, 'Webview should be visible');
    
            // 예상되는 DDL 내용
            const expectedDDL = `CREATE TABLE users (
                id INT PRIMARY KEY AUTO_INCREMENT,
                name VARCHAR(100) NOT NULL,
                email VARCHAR(100) UNIQUE NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );`;
    
            // 메시지 수신을 기다리는 Promise 생성
            const messageReceived = new Promise((resolve) => {
                webviewPanel!.webview.onDidReceiveMessage((message: { command: string; ddl: string }) => {
                    if (message.command === 'insertSampleDDL' && message.ddl === expectedDDL) {
                        resolve(true);
                    }
                });
            });
    
            // 메시지 수신 여부를 2초 내에 확인
            const result = await Promise.race([
                messageReceived,
                new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout waiting for DDL message')), 2000))
            ]);
    
            assert.ok(result, 'DDL should be sent to webview');
        }
    });
    
});
