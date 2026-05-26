const fs = require('fs');
const path = require('path');

describe('functions/index.js error response shape', () => {
    const source = fs.readFileSync(
        path.join(__dirname, '../functions/index.js'), 'utf8'
    );
    const lines = source.split('\n');
    const nonCommentLines = lines.filter(l => !l.trim().startsWith('//'));
    const nonCommentSource = nonCommentLines.join('\n');

    test('no res.status(N).send() in error paths', () => {
        const matches = nonCommentSource.match(/res\.status\(\d+\)\.send\(/g) || [];
        expect(matches).toHaveLength(0);
    });
});
