const Mocha = require('mocha');
const path = require('path');
const fs = require('fs');

// Create a new Mocha instance
const mocha = new Mocha({
  ui: 'tdd',
  color: true
});

// Get the test directory
const testDir = path.join(__dirname, '../out/test/suite');

// Add the basic test file
mocha.addFile(path.join(testDir, 'basic.test.js'));

// Run the tests
mocha.run(failures => {
  process.exit(failures ? 1 : 0);
}); 