import fs from 'fs';
import path from 'path';
import * as parser from '@babel/parser';
import traverseModule from '@babel/traverse';
import generateModule from '@babel/generator';
import * as t from '@babel/types';

const traverse = (traverseModule as any).default || traverseModule;
const generate = (generateModule as any).default || generateModule;

const SRC_DIR = path.resolve(process.cwd(), 'src');
const LOCALES_DIR = path.resolve(SRC_DIR, 'locales/en');
const TRANSLATION_PATH = path.resolve(LOCALES_DIR, 'translation.json');

const BLACKLISTED_ATTRS = new Set([
  'className', 'id', 'src', 'href', 'target', 'rel', 'type', 'key', 'ref', 'name', 'variant', 'size', 'color', 'icon', 'role', 'aria-hidden'
]);

const TRANSLATABLE_ATTRS = new Set([
  'placeholder', 'title', 'label', 'description', 'alt'
]);

interface ExtractedString {
  value: string;
  filePath: string;
  line: number;
  column: number;
}

const extractedStrings: ExtractedString[] = [];
let translations: Record<string, string> = {};

if (fs.existsSync(TRANSLATION_PATH)) {
  try {
    translations = JSON.parse(fs.readFileSync(TRANSLATION_PATH, 'utf-8'));
  } catch (e) {
    console.error(`Error reading ${TRANSLATION_PATH}:`, e);
  }
}

function getFiles(dir: string): string[] {
  let results: string[] = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const fullPath = path.resolve(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat && stat.isDirectory()) {
      // Exclude node_modules, tests, and UI components
      if (!fullPath.includes('node_modules') && 
          !fullPath.includes('.test.') && 
          !fullPath.includes('__tests__') && 
          !fullPath.includes('src/components/ui')) {
        results = results.concat(getFiles(fullPath));
      }
    } else {
      if (fullPath.match(/\.(tsx|ts)$/) && !fullPath.includes('.test.')) {
        results.push(fullPath);
      }
    }
  });
  return results;
}

function generateKey(str: string): string {
  // Simple key generator: prefix with 'auto.', lowercase, replace non-alphanumeric with underscore, truncate
  const slug = str.toLowerCase()
    .replace(/[^a-z0-9]/g, '_')
    .replace(/_+/g, '_')
    .substring(0, 30)
    .replace(/^_|_$/g, '');
  
  return `auto.${slug || 'string'}`;
}

function processFile(filePath: string, mode: 'scan' | 'replace' | 'check'): boolean {
  const code = fs.readFileSync(filePath, 'utf-8');
  let ast: any;
  try {
    ast = parser.parse(code, {
      sourceType: 'module',
      plugins: ['jsx', 'typescript'],
    });
  } catch (e) {
    console.error(`Error parsing ${filePath}:`, e);
    return false;
  }

  let fileChanged = false;
  let hasUseTranslationImport = false;
  let hasTFunction = false;
  let needsTFunction = false;

  const localExtracted: ExtractedString[] = [];

  const visitor = {
    ImportDeclaration(path: any) {
      if (path.node.source.value === 'react-i18next') {
        if (path.node.specifiers.some((s: any) => s.imported?.name === 'useTranslation')) {
          hasUseTranslationImport = true;
        }
      }
    },
    VariableDeclarator(path: any) {
      if (
        t.isObjectPattern(path.node.id) &&
        path.node.id.properties.some((p: any) => t.isObjectProperty(p) && t.isIdentifier(p.key) && p.key.name === 't') &&
        t.isCallExpression(path.node.init) &&
        t.isIdentifier(path.node.init.callee) &&
        path.node.init.callee.name === 'useTranslation'
      ) {
        hasTFunction = true;
      }
    },
    JSXText(path: any) {
      const value = path.node.value.trim();
      if (value && !/^[0-9\W]+$/.test(value)) {
        localExtracted.push({ value, filePath, line: path.node.loc.start.line, column: path.node.loc.start.column });
        if (mode === 'replace') {
          let key = Object.keys(translations).find(k => translations[k] === value);
          if (!key) {
            key = generateKey(value);
            while (translations[key] && translations[key] !== value) {
              key = `${key}_${Math.floor(Math.random() * 1000)}`;
            }
            translations[key] = value;
          }
          path.replaceWith(t.jsxExpressionContainer(t.callExpression(t.identifier('t'), [t.stringLiteral(key)])));
          fileChanged = true;
          needsTFunction = true;
        }
      }
    },
    JSXAttribute(path: any) {
      const name = path.node.name.name;
      if (TRANSLATABLE_ATTRS.has(name) || (!BLACKLISTED_ATTRS.has(name) && typeof name === 'string')) {
        const valueNode = path.node.value;
        if (t.isStringLiteral(valueNode)) {
          const value = valueNode.value.trim();
          if (value && !/^[0-9\W]+$/.test(value)) {
            localExtracted.push({ value, filePath, line: valueNode.loc.start.line, column: valueNode.loc.start.column });
            if (mode === 'replace') {
              let key = Object.keys(translations).find(k => translations[k] === value);
              if (!key) {
                key = generateKey(value);
                while (translations[key] && translations[key] !== value) {
                  key = `${key}_${Math.floor(Math.random() * 1000)}`;
                }
                translations[key] = value;
              }
              path.get('value').replaceWith(t.jsxExpressionContainer(t.callExpression(t.identifier('t'), [t.stringLiteral(key)])));
              fileChanged = true;
              needsTFunction = true;
            }
          }
        }
      }
    },
    StringLiteral(path: any) {
      // Avoid strings inside imports, exports, and blacklisted attributes
      if (t.isImportDeclaration(path.parent) || t.isExportDeclaration(path.parent) || t.isJSXAttribute(path.parent)) return;
      
      const value = path.node.value.trim();
      if (value && !/^[0-9\W]+$/.test(value) && !path.node.value.includes('\n')) {
        // This might catch too much, but let's see. Typically we want strings in JSX expressions or return statements.
        // For now, let's limit to strings that are likely UI text.
        if (t.isJSXExpressionContainer(path.parent) || t.isReturnStatement(path.parent) || t.isConditionalExpression(path.parent)) {
          localExtracted.push({ value, filePath, line: path.node.loc.start.line, column: path.node.loc.start.column });
          if (mode === 'replace') {
            let key = Object.keys(translations).find(k => translations[k] === value);
            if (!key) {
              key = generateKey(value);
              while (translations[key] && translations[key] !== value) {
                key = `${key}_${Math.floor(Math.random() * 1000)}`;
              }
              translations[key] = value;
            }
            path.replaceWith(t.callExpression(t.identifier('t'), [t.stringLiteral(key)]));
            fileChanged = true;
            needsTFunction = true;
          }
        }
      }
    },
    TemplateLiteral(path: any) {
      if (path.node.expressions.length === 0) {
        const value = path.node.quasis[0].value.cooked.trim();
        if (value && !/^[0-9\W]+$/.test(value)) {
          localExtracted.push({ value, filePath, line: path.node.loc.start.line, column: path.node.loc.start.column });
          if (mode === 'replace') {
            let key = Object.keys(translations).find(k => translations[k] === value);
            if (!key) {
              key = generateKey(value);
              while (translations[key] && translations[key] !== value) {
                key = `${key}_${Math.floor(Math.random() * 1000)}`;
              }
              translations[key] = value;
            }
            path.replaceWith(t.callExpression(t.identifier('t'), [t.stringLiteral(key)]));
            fileChanged = true;
            needsTFunction = true;
          }
        }
      }
    }
  };

  traverse(ast, visitor);

  if (mode === 'replace' && fileChanged) {
    if (needsTFunction && !hasTFunction) {
      // Add const { t } = useTranslation(); to the first functional component found
      let hookAdded = false;
      traverse(ast, {
        FunctionDeclaration(path: any) {
          if (hookAdded) return;
          const body = path.node.body.body;
          body.unshift(
            t.variableDeclaration('const', [
              t.variableDeclarator(
                t.objectPattern([t.objectProperty(t.identifier('t'), t.identifier('t'), false, true)]),
                t.callExpression(t.identifier('useTranslation'), [])
              )
            ])
          );
          hookAdded = true;
        },
        ArrowFunctionExpression(path: any) {
          if (hookAdded) return;
          if (t.isVariableDeclarator(path.parent) && t.isBlockStatement(path.node.body)) {
            const body = path.node.body.body;
            body.unshift(
              t.variableDeclaration('const', [
                t.variableDeclarator(
                  t.objectPattern([t.objectProperty(t.identifier('t'), t.identifier('t'), false, true)]),
                  t.callExpression(t.identifier('useTranslation'), [])
                )
              ])
            );
            hookAdded = true;
          }
        }
      });
    }

    if (needsTFunction && !hasUseTranslationImport) {
      const importNode = t.importDeclaration(
        [t.importSpecifier(t.identifier('useTranslation'), t.identifier('useTranslation'))],
        t.stringLiteral('react-i18next')
      );
      ast.program.body.unshift(importNode);
    }

    const output = generate(ast, { retainLines: true, jscsEnabled: false }, code);
    fs.writeFileSync(filePath, output.code);
  }

  extractedStrings.push(...localExtracted);
  return localExtracted.length > 0;
}

const args = process.argv.slice(2);
const mode = args.includes('--replace') ? 'replace' : args.includes('--check') ? 'check' : 'scan';

const files = getFiles(SRC_DIR);
let foundAny = false;

files.forEach(file => {
  if (processFile(file, mode)) {
    foundAny = true;
  }
});

if (mode === 'scan') {
  extractedStrings.forEach(s => {
    console.log(`${s.filePath}:${s.line}:${s.column} - "${s.value}"`);
  });
  console.log(`Found ${extractedStrings.length} hardcoded strings.`);
} else if (mode === 'replace') {
  if (!fs.existsSync(LOCALES_DIR)) {
    fs.mkdirSync(LOCALES_DIR, { recursive: true });
  }
  fs.writeFileSync(TRANSLATION_PATH, JSON.stringify(translations, null, 2));
  console.log(`Updated ${TRANSLATION_PATH} and source files.`);
} else if (mode === 'check') {
  if (foundAny) {
    console.error(`Found ${extractedStrings.length} hardcoded strings.`);
    process.exit(1);
  } else {
    console.log('No hardcoded strings found.');
  }
}
