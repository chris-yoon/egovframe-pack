const path = require('path');
const { runTests } = require('@vscode/test-electron');

async function main() {
  try {
    console.log('Starting test runner...');
    
    // The folder containing the Extension Manifest package.json
    const extensionDevelopmentPath = path.resolve(__dirname, '../');
    console.log(`Extension development path: ${extensionDevelopmentPath}`);

    // The path to the extension test runner script
    const extensionTestsPath = path.resolve(__dirname, '../out/test/suite/index');
    console.log(`Extension tests path: ${extensionTestsPath}`);

    // Download VS Code, unzip it and run the integration test
    console.log('Running tests...');
    await runTests({ 
      extensionDevelopmentPath, 
      extensionTestsPath,
      launchArgs: [
        '--disable-extensions',
        '--enable-proposed-api=egovframework.vscode-egovframe-initializr'
      ]
    });
    
    console.log('Tests completed successfully');
    process.exit(0);
  } catch (err) {
    console.error('Failed to run tests:', err);
    process.exit(1);
  }
}

main(); 