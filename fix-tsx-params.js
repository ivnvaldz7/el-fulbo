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
    } else if (file.endsWith('.tsx')) {
      results.push(file);
    }
  });
  return results;
}

const files = walk('src/app');

let count = 0;
for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  let changed = false;

  // Case 1: Inline params
  const regexInline = /export default async function ([a-zA-Z0-9_]+)\(\{\s*params\s*\}\s*:\s*\{\s*params\s*:\s*\{([^}]+)\}\s*\}\s*,?\s*\)\s*\{/g;
  content = content.replace(regexInline, (match, funcName, paramType) => {
    changed = true;
    return `export default async function ${funcName}(props: { params: Promise<{ ${paramType.trim()} }> }) {\n  const params = await props.params;`;
  });

  // Case 2: Interface with params
  const regexInterface = /interface\s+([a-zA-Z0-9_]+)\s*\{\s*params\s*:\s*\{([^}]+)\}\s*;/g;
  content = content.replace(regexInterface, (match, interfaceName, paramType) => {
    changed = true;
    return `interface ${interfaceName} {\n  params: Promise<{ ${paramType.trim()} }>;`;
  });

  // Case 3: Function using interface
  // Wait, if we change the interface to Promise, we also need to await it in the function body.
  const regexFuncWithInterface = /export default async function ([a-zA-Z0-9_]+)\(\{\s*params\s*\}\s*:\s*([a-zA-Z0-9_]+)\s*\)\s*\{/g;
  content = content.replace(regexFuncWithInterface, (match, funcName, interfaceName) => {
    changed = true;
    return `export default async function ${funcName}(props: ${interfaceName}) {\n  const params = await props.params;`;
  });
  
  // Case 4: Layout with children and params inline
  const regexLayoutInline = /export default async function ([a-zA-Z0-9_]+)\(\{\s*children,\s*params\s*,?\s*\}\s*:\s*\{\s*children\s*:\s*React\.ReactNode;\s*params\s*:\s*\{([^}]+)\}\s*;?\s*\}\s*\)\s*\{/g;
  content = content.replace(regexLayoutInline, (match, funcName, paramType) => {
    changed = true;
    return `export default async function ${funcName}(props: { children: React.ReactNode; params: Promise<{ ${paramType.trim()} }> }) {\n  const { children } = props;\n  const params = await props.params;`;
  });

  // Also match reversed order: params, children
  const regexLayoutInlineRev = /export default async function ([a-zA-Z0-9_]+)\(\{\s*params,\s*children\s*,?\s*\}\s*:\s*\{\s*params\s*:\s*\{([^}]+)\}\s*;\s*children\s*:\s*React\.ReactNode\s*;?\s*\}\s*\)\s*\{/g;
  content = content.replace(regexLayoutInlineRev, (match, funcName, paramType) => {
    changed = true;
    return `export default async function ${funcName}(props: { children: React.ReactNode; params: Promise<{ ${paramType.trim()} }> }) {\n  const { children } = props;\n  const params = await props.params;`;
  });

  if (changed) {
    fs.writeFileSync(file, content);
    count++;
  }
}
console.log('Fixed TSX files:', count);
