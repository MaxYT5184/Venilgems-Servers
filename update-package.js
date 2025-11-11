const fs = require('fs');
const path = require('path');

// Read package.json
const packagePath = path.join(__dirname, 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));

// Add new dependencies
packageJson.dependencies = {
  ...packageJson.dependencies,
  "express": "^4.18.2",
  "express-session": "^1.17.3",
  "bcrypt": "^5.1.0",
  "ejs": "^3.1.9"
};

// Add dashboard script
packageJson.scripts = {
  ...packageJson.scripts,
  "dashboard": "node dashboard.js"
};

// Write updated package.json
fs.writeFileSync(packagePath, JSON.stringify(packageJson, null, 2));

console.log('package.json updated successfully!');
