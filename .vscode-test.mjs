import { defineConfig } from '@vscode/test-cli';

export default defineConfig({
	files: 'out/test/**/*.test.js',
	workspaceFolder: 'test-workspace',
	mocha: {
		ui: 'tdd',
		timeout: 20000
	},
	// VS Code 다운로드 제어
	vscodeVersion: 'stable', // 또는 'insiders' 또는 특정 버전 번호
	reuseMachineInstall: true, // 이미 설치된 VS Code 재사용
	launchArgs: [
		'--disable-extensions', // 다른 확장 비활성화
		'--enable-proposed-api=egovframework.vscode-egovframe-initializr'
	]
});
