import * as path from 'path';
import Mocha from 'mocha';
import { glob } from 'glob';

export function run(): Promise<void> {
  const mocha = new Mocha({
    ui: 'tdd',
    color: true,
    timeout: 60000,  // 타임아웃 증가
    retries: 1,      // 실패시 재시도
    bail: false      // 실패해도 계속 진행
  });

  const testsRoot = path.resolve(__dirname, '..');

  return new Promise<void>(async (c, e) => {
    try {
      // 테스트 파일들을 특정 순서로 로드
      const files = await glob('**/**.test.js', { cwd: testsRoot });
      
      // 테스트 파일 순서 정렬
      const orderedFiles = files.sort((a, b) => {
        // generateProject.test.js를 먼저 실행
        if (a.includes('generateProject.test.js')) return -1;
        if (b.includes('generateProject.test.js')) return 1;
        return a.localeCompare(b);
      });

      // 테스트 파일 추가
      orderedFiles.forEach(f => {
        console.log(`Adding test file: ${f}`);
        mocha.addFile(path.resolve(testsRoot, f));
      });

      try {
        // 테스트 실행
        mocha.run(failures => {
          if (failures > 0) {
            e(new Error(`${failures} tests failed.`));
          } else {
            c();
          }
        });
      } catch (err) {
        console.error('Mocha run failed:', err);
        e(err);
      }
    } catch (err) {
      console.error('Test setup failed:', err);
      e(err instanceof Error ? err : new Error(String(err)));
    }
  });
} 
