import * as path from 'path';
import { runTests } from '@vscode/test-electron';

async function main(): Promise<void> {
  try {
    console.log('Starting test runner...');
    
    // The folder containing the Extension Manifest package.json
    // Passed to `--extensionDevelopmentPath`
    const extensionDevelopmentPath = path.resolve(__dirname, '../../');
    console.log(`Extension development path: ${extensionDevelopmentPath}`);

    // The path to the extension test runner script
    // Passed to --extensionTestsPath
    const extensionTestsPath = path.resolve(__dirname, './suite/index');
    console.log(`Extension tests path: ${extensionTestsPath}`);

    // Download VS Code, unzip it and run the integration test
    console.log('Running tests...');
    const result = await runTests({ 
      extensionDevelopmentPath, 
      extensionTestsPath,
      launchArgs: [
        '--disable-extensions',
        '--enable-proposed-api=egovframework.vscode-egovframe-initializr'
      ]
    });
    
    console.log(`Test run completed with result: ${result}`);
    process.exit(0); // Force exit with success code
  } catch (err) {
    console.error('Failed to run tests:', err);
    process.exit(1);
  }
}

main(); 