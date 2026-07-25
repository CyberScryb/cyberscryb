const fs = require('fs');
const p = require('path').join(__dirname, '..', 'tools', 'humanizer', 'index.html');
let c = fs.readFileSync(p, 'utf8');
c = c.replace(/humanizer\.js\?v=[^"]+/g, 'humanizer.js?v=20260719n');
c = c.replace(/humanizer\/style\.css\?v=[^"]+/g, 'humanizer/style.css?v=20260719n');
fs.writeFileSync(p, c);
console.log('bumped humanizer assets');
