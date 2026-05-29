const fs = require('fs');
const path = require('path');

const OLD_DOMAIN = 'cyberscryb.com';
const NEW_DOMAIN = 'cyberscryb.com';

function replaceInFile(filePath) {
    const content = fs.readFileSync(filePath, 'utf-8');
    if (content.includes(OLD_DOMAIN)) {
        const updated = content.split(OLD_DOMAIN).join(NEW_DOMAIN);
        fs.writeFileSync(filePath, updated, 'utf-8');
        console.log(`  ✅ ${path.relative(process.cwd(), filePath)}`);
        return true;
    }
    return false;
}

function walkDir(dir, extensions) {
    let count = 0;
    const items = fs.readdirSync(dir, { withFileTypes: true });
    for (const item of items) {
        const fullPath = path.join(dir, item.name);
        if (item.isDirectory() && !item.name.startsWith('.') && item.name !== 'node_modules') {
            count += walkDir(fullPath, extensions);
        } else if (item.isFile() && extensions.some(ext => item.name.endsWith(ext))) {
            if (replaceInFile(fullPath)) count++;
        }
    }
    return count;
}

console.log(`\n🔄 Replacing "${OLD_DOMAIN}" → "${NEW_DOMAIN}"\n`);
const count = walkDir(process.cwd(), ['.html', '.js', '.json', '.xml', '.css']);
console.log(`\n✅ Updated ${count} files\n`);
