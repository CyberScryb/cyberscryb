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

  test('firebase.json names the default Hosting site', () => {
    const cfg = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'firebase.json'), 'utf8'));
    expect(cfg.hosting.site).toBe('gen-lang-client-0384486156');
    expect(cfg.hosting.target).toBeUndefined();
  });

  test('deploy.yml pins firebase-tools to the last CLI that resolved this site', () => {
    const workflow = fs.readFileSync(
      path.join(__dirname, '..', '.github', 'workflows', 'deploy.yml'),
      'utf8'
    );
    expect(workflow).toMatch(/npm install -g firebase-tools@15\.31\.0/);
    expect(workflow).not.toMatch(/npm install -g firebase-tools\s*(?:\n|$)/);
  });
});
