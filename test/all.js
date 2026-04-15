const { execSync } = require('child_process');

const tests = [
    'test/login.js',
    'test/register.js',
    'test/search.js',
    'test/profile.js',
    'test/stats.js',
    'test/items.js'
];

console.log("Running all tests sequentially...\n");

for (const testFile of tests) {
    const testName = testFile.split('/')[1];
    console.log(`-------------- ${testName}:`);

    try {
        execSync(`node ${testFile}`, { stdio: 'inherit' });
        console.log("\n");
    } catch (error) {
        console.error(`[!] Test ${testName} failed.`);
        process.exit(1);
    }
}

console.log("All tests passed successfully!");
