const fs = require('fs');
const path = require('path');

describe('Cloud Functions and the deploy workflow use Node 22', () => {
  test('functions/package.json engines.node is 22', () => {
    const pkg = JSON.parse(
      fs.readFileSync(path.join(__dirname, '..', 'functions', 'package.json'), 'utf8')
    );
    expect(pkg.engines.node).toBe('22');
  });

  test('deploy.yml sets up Node 22', () => {
    const workflow = fs.readFileSync(
      path.join(__dirname, '..', '.github', 'workflows', 'deploy.yml'),
      'utf8'
    );
    expect(workflow).toMatch(/node-version:\s*['"]22['"]/);
    expect(workflow).not.toMatch(/node-version:\s*['"]20['"]/);
  });
});
