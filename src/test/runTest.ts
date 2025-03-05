import * as path from 'path';
import { runTests } from '@vscode/test-electron';

async function main(): Promise<void> {
  try {
    const extensionDevelopmentPath = path.resolve(__dirname, '../../');
    const extensionTestsPath = path.resolve(__dirname, './suite/index');

    // runTests는 새로운 VS Code 인스턴스를 실행함
    const result = await runTests({ 
      extensionDevelopmentPath, 
      extensionTestsPath,
      // VS Code 인스턴스 설정
      launchArgs: [
        '--disable-extensions',  // 다른 확장기능들을 비활성화
        '--enable-proposed-api=egovframework.vscode-egovframe-initializr',
        '--verbose',
        // 워크스페이스 설정 추가
        '--new-window',  // 새 창에서 실행
        '--workspace', path.join(__dirname, '../../test-workspace')  // 워크스페이스 경로 지정
      ],
      // 환경 변수 설정
      extensionTestsEnv: {
        VSCODE_TEST_LOG_LEVEL: 'debug',
        EXTENSION_TEST_MODE: 'true'  // 테스트 모드 표시
      }
    });

    if (result !== 0) {
      throw new Error(`Tests failed with code: ${result}`);
    }
  } catch (err) {
    console.error('Test execution error:', err);
    process.exit(1);
  }
}

main(); 
