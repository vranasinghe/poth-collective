// Syntax-checks every backend source file (node --check only parses the one file it is given).
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const skip = new Set(['node_modules', 'coverage']);
const files = [];
const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        if (skip.has(entry.name)) continue;
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) walk(full);
        else if (entry.name.endsWith('.js')) files.push(full);
    }
};
walk(root);

let failed = 0;
for (const file of files) {
    try {
        execFileSync(process.execPath, ['--check', file], { stdio: 'pipe' });
    } catch (err) {
        failed += 1;
        console.error(`Syntax error in ${path.relative(root, file)}:\n${err.stderr.toString()}`);
    }
}
console.log(`Checked ${files.length} files, ${failed} failed`);
process.exit(failed ? 1 : 0);
