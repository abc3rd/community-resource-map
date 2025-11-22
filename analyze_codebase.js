// Dependencies: npm install glob @babel/parser @babel/traverse
// Usage: node analyze_codebase.js

const fs = require('fs');
const path = require('path');
const { glob } = require('glob');
const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;

// ==================== CONFIGURATION ====================
// Modify these variables to customize the analysis

const START_DIRECTORY = './'; // Root directory to scan
const FILE_EXTENSIONS = ['.js', '.jsx', '.ts', '.tsx']; // File types to analyze
const OUTPUT_FILE = './feature_report.json'; // Output JSON report path
const KEYWORD_TRIGGERS = [
  'CloudConnect',
  'Glytch',
  'GoHighLevel',
  'GHL',
  'CRM',
  'webhook',
  'automation',
  'workflow',
  'API',
  'integration',
  'pipeline'
];

// Heuristic thresholds
const MIN_PARAMS_FOR_COMPLEXITY = 3; // Functions with > this many params are flagged
const MIN_LINES_FOR_COMPLEXITY = 25; // Functions with > this many lines are flagged

// ==================== SCRIPT START ====================

console.log('[INFO] Starting codebase analysis...');
console.log(`[INFO] Scanning directory: ${path.resolve(START_DIRECTORY)}`);
console.log(`[INFO] Looking for extensions: ${FILE_EXTENSIONS.join(', ')}`);
console.log(`[INFO] Keywords: ${KEYWORD_TRIGGERS.join(', ')}`);
console.log('');

const results = [];

/**
 * Get leading comments for a node
 */
function getLeadingComments(node) {
  if (node.leadingComments) {
    return node.leadingComments.map(c => c.value).join('\n');
  }
  return '';
}

/**
 * Check if text contains any of the keyword triggers (case-insensitive)
 */
function containsKeyword(text) {
  if (!text) return null;
  const lowerText = text.toLowerCase();
  for (const keyword of KEYWORD_TRIGGERS) {
    if (lowerText.includes(keyword.toLowerCase())) {
      return keyword;
    }
  }
  return null;
}

/**
 * Check if comments contain special markers
 */
function hasSpecialComment(comments) {
  const markers = ['@advanced', '@feature', '@CloudConnect', '@Glytch'];
  for (const marker of markers) {
    if (comments.includes(marker)) {
      return marker;
    }
  }
  return null;
}

/**
 * Check if node contains API calls (fetch, axios, etc.)
 */
function findApiCalls(node, code) {
  const apiCalls = [];

  try {
    traverse(node, {
      CallExpression(path) {
        const callee = path.node.callee;

        // Check for fetch()
        if (callee.type === 'Identifier' && callee.name === 'fetch') {
          apiCalls.push('fetch');
        }

        // Check for axios.get, axios.post, etc.
        if (callee.type === 'MemberExpression') {
          const obj = callee.object;
          const prop = callee.property;

          if (obj.type === 'Identifier' && obj.name === 'axios') {
            apiCalls.push(`axios.${prop.name || 'call'}`);
          }

          // Check for http.get, http.post, etc.
          if (obj.type === 'Identifier' && (obj.name === 'http' || obj.name === 'https')) {
            apiCalls.push(`${obj.name}.${prop.name || 'call'}`);
          }
        }
      }
    }, null, {});
  } catch (e) {
    // Ignore traversal errors
  }

  return apiCalls;
}

/**
 * Extract code snippet (first 10 lines or full code if shorter)
 */
function getCodeSnippet(code, startLine, endLine) {
  const lines = code.split('\n');
  const relevantLines = lines.slice(startLine - 1, endLine);
  const snippetLines = relevantLines.slice(0, 10);

  if (relevantLines.length > 10) {
    return snippetLines.join('\n') + '\n// ... (truncated)';
  }
  return snippetLines.join('\n');
}

/**
 * Analyze a function or method node
 */
function analyzeFunction(node, filePath, code, type, name) {
  const reasons = [];
  const loc = node.loc;

  if (!loc) return null;

  const line = loc.start.line;
  const lineCount = loc.end.line - loc.start.line;

  // Get node code
  const nodeCode = code.substring(node.start, node.end);

  // Check 1: Keyword in name
  const nameKeyword = containsKeyword(name);
  if (nameKeyword) {
    reasons.push(`Name contains keyword: ${nameKeyword}`);
  }

  // Check 2: Keyword in body
  const bodyKeyword = containsKeyword(nodeCode);
  if (bodyKeyword) {
    reasons.push(`Body contains keyword: ${bodyKeyword}`);
  }

  // Check 3: Special comments
  const comments = getLeadingComments(node);
  const specialComment = hasSpecialComment(comments);
  if (specialComment) {
    reasons.push(`Special comment: ${specialComment}`);
  }

  // Check 4: High parameter count
  const params = node.params || [];
  if (params.length > MIN_PARAMS_FOR_COMPLEXITY) {
    reasons.push(`High parameter count: ${params.length} parameters`);
  }

  // Check 5: High line count
  if (lineCount > MIN_LINES_FOR_COMPLEXITY) {
    reasons.push(`High complexity: ${lineCount} lines`);
  }

  // Check 6: API calls
  const apiCalls = findApiCalls(node, nodeCode);
  if (apiCalls.length > 0) {
    reasons.push(`Contains API calls: ${apiCalls.join(', ')}`);
  }

  // If any reason was found, add to results
  if (reasons.length > 0) {
    return {
      filePath: path.relative(process.cwd(), filePath),
      type,
      name,
      line,
      reason: reasons.join(' | '),
      codeSnippet: getCodeSnippet(code, loc.start.line, loc.end.line)
    };
  }

  return null;
}

/**
 * Analyze a class node
 */
function analyzeClass(node, filePath, code) {
  const reasons = [];
  const loc = node.loc;

  if (!loc) return null;

  const line = loc.start.line;
  const className = node.id ? node.id.name : 'AnonymousClass';

  // Get node code
  const nodeCode = code.substring(node.start, node.end);

  // Check 1: Keyword in name
  const nameKeyword = containsKeyword(className);
  if (nameKeyword) {
    reasons.push(`Name contains keyword: ${nameKeyword}`);
  }

  // Check 2: Keyword in body
  const bodyKeyword = containsKeyword(nodeCode);
  if (bodyKeyword) {
    reasons.push(`Body contains keyword: ${bodyKeyword}`);
  }

  // Check 3: Special comments
  const comments = getLeadingComments(node);
  const specialComment = hasSpecialComment(comments);
  if (specialComment) {
    reasons.push(`Special comment: ${specialComment}`);
  }

  // Check 4: API calls in class
  const apiCalls = findApiCalls(node, nodeCode);
  if (apiCalls.length > 0) {
    reasons.push(`Contains API calls: ${apiCalls.join(', ')}`);
  }

  // If any reason was found, add to results
  if (reasons.length > 0) {
    return {
      filePath: path.relative(process.cwd(), filePath),
      type: 'Class',
      name: className,
      line,
      reason: reasons.join(' | '),
      codeSnippet: getCodeSnippet(code, loc.start.line, loc.end.line)
    };
  }

  return null;
}

/**
 * Analyze a single file
 */
function analyzeFile(filePath) {
  try {
    const code = fs.readFileSync(filePath, 'utf-8');

    // Parse with permissive settings
    const ast = parser.parse(code, {
      sourceType: 'module',
      plugins: [
        'jsx',
        'typescript',
        'classProperties',
        'decorators-legacy',
        'dynamicImport',
        'objectRestSpread',
        'asyncGenerators',
        'optionalChaining',
        'nullishCoalescingOperator',
        'optionalCatchBinding'
      ],
      errorRecovery: true,
      attachComment: true
    });

    // Traverse the AST
    traverse(ast, {
      // Function Declarations
      FunctionDeclaration(path) {
        const node = path.node;
        const name = node.id ? node.id.name : 'anonymous';
        const result = analyzeFunction(node, filePath, code, 'Function', name);
        if (result) results.push(result);
      },

      // Arrow Functions and Function Expressions assigned to variables
      VariableDeclarator(path) {
        const node = path.node;
        const init = node.init;

        if (init && (init.type === 'ArrowFunctionExpression' || init.type === 'FunctionExpression')) {
          const name = node.id ? node.id.name : 'anonymous';
          const result = analyzeFunction(init, filePath, code, 'Function', name);
          if (result) results.push(result);
        }
      },

      // Class Methods
      ClassMethod(path) {
        const node = path.node;
        const name = node.key ? node.key.name || 'anonymous' : 'anonymous';
        const result = analyzeFunction(node, filePath, code, 'Method', name);
        if (result) results.push(result);
      },

      // Object Methods
      ObjectMethod(path) {
        const node = path.node;
        const name = node.key ? node.key.name || node.key.value || 'anonymous' : 'anonymous';
        const result = analyzeFunction(node, filePath, code, 'Method', name);
        if (result) results.push(result);
      },

      // Class Declarations
      ClassDeclaration(path) {
        const node = path.node;
        const result = analyzeClass(node, filePath, code);
        if (result) results.push(result);
      },

      // Class Expressions
      ClassExpression(path) {
        const node = path.node;
        const result = analyzeClass(node, filePath, code);
        if (result) results.push(result);
      }
    });

  } catch (error) {
    console.error(`[ERROR] Failed to parse file: ${filePath}`);
    console.error(`[ERROR] ${error.message}`);
    console.error('Skipping...\n');
  }
}

/**
 * Main execution
 */
async function main() {
  try {
    // Build glob pattern
    const patterns = FILE_EXTENSIONS.map(ext =>
      `${START_DIRECTORY}/**/*${ext}`
    );

    // Find all matching files
    let files = [];
    for (const pattern of patterns) {
      const matched = await glob(pattern, {
        ignore: ['**/node_modules/**', '**/dist/**', '**/build/**', '**/.git/**'],
        nodir: true
      });
      files = files.concat(matched);
    }

    // Remove duplicates
    files = [...new Set(files)];

    console.log(`[INFO] Found ${files.length} files to analyze\n`);

    if (files.length === 0) {
      console.log('[WARNING] No files found matching the criteria.');
      console.log('[INFO] Exiting...');
      return;
    }

    // Analyze each file
    let processedCount = 0;
    for (const file of files) {
      processedCount++;
      if (processedCount % 10 === 0 || processedCount === files.length) {
        process.stdout.write(`\r[PROGRESS] Analyzing files: ${processedCount}/${files.length}`);
      }
      analyzeFile(file);
    }

    console.log('\n');

    // Write results to file
    const outputPath = path.resolve(OUTPUT_FILE);
    fs.writeFileSync(outputPath, JSON.stringify(results, null, 2), 'utf-8');

    console.log(`[SUCCESS] Analysis complete. ${results.length} features found.`);
    console.log(`[SUCCESS] Report saved to ${outputPath}`);

    // Print summary statistics
    console.log('\n=== SUMMARY ===');
    const typeCount = results.reduce((acc, r) => {
      acc[r.type] = (acc[r.type] || 0) + 1;
      return acc;
    }, {});

    Object.keys(typeCount).forEach(type => {
      console.log(`${type}s: ${typeCount[type]}`);
    });

    // Print top files with most features
    const fileCount = results.reduce((acc, r) => {
      acc[r.filePath] = (acc[r.filePath] || 0) + 1;
      return acc;
    }, {});

    const topFiles = Object.entries(fileCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    if (topFiles.length > 0) {
      console.log('\nTop 5 files with most features:');
      topFiles.forEach(([file, count]) => {
        console.log(`  ${file}: ${count} features`);
      });
    }

  } catch (error) {
    console.error('[FATAL ERROR]', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run the script
main();
