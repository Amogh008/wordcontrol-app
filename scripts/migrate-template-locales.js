const fs = require('fs');
const path = require('path');
const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;
const generate = require('@babel/generator').default;
const t = require('@babel/types');

const sourceRoot = path.join(__dirname, '..', 'src');
function files(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) return entry.name === 'locales' ? [] : files(target);
    return target.endsWith('.js') ? [target] : [];
  });
}

for (const filename of files(sourceRoot)) {
  const source = fs.readFileSync(filename, 'utf8');
  const ast = parser.parse(source, { sourceType: 'module', plugins: ['jsx'] });
  let changed = false;
  traverse(ast, { CallExpression(ref) {
    if (!t.isIdentifier(ref.node.callee, { name: 'localize' })) return;
    const template = ref.node.arguments[0];
    if (!t.isTemplateLiteral(template)) return;
    const key = template.quasis.map((quasi, index) => `${quasi.value.cooked}${index < template.expressions.length ? `{${index}}` : ''}`).join('');
    ref.replaceWith(t.callExpression(t.identifier('localizeFormat'), [
      t.stringLiteral(key),
      t.arrayExpression(template.expressions),
    ]));
    changed = true;
  } });
  if (!changed) continue;
  for (const statement of ast.program.body) {
    if (!t.isImportDeclaration(statement) || !statement.specifiers.some((item) =>
      t.isImportSpecifier(item) && item.imported.name === 'localize')) continue;
    statement.specifiers.push(t.importSpecifier(t.identifier('localizeFormat'), t.identifier('localizeFormat')));
    break;
  }
  fs.writeFileSync(filename, `${generate(ast, { retainLines: true }, source).code}\n`);
}
