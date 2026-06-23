const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach((file) => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
    } else if (file.endsWith('route.ts')) {
      results.push(file);
    }
  });
  return results;
}

const files = walk('src/app/api');

let count = 0;
for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  let changed = false;

  const regex = /export async function ([A-Z]+)\(([^,]+),\s*\{\s*params\s*\}\s*:\s*\{\s*params\s*:\s*\{([^}]+)\}\s*\}\s*,?\s*\)\s*\{/g;
  
  const newContent = content.replace(regex, (match, method, req, paramType) => {
    changed = true;
    return `export async function ${method}(${req}, props: { params: Promise<{ ${paramType.trim()} }> }) {\n  const params = await props.params;`;
  });

  if (changed) {
    fs.writeFileSync(file, newContent);
    count++;
  }
}
console.log('Fixed files:', count);
