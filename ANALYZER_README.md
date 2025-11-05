# Codebase Feature Analyzer

A powerful Node.js script that analyzes your codebase using AST (Abstract Syntax Tree) parsing to identify and extract advanced functions, classes, and features related to Cloud Connect, Glytch, and Go High Level CRM platforms.

## Quick Start

### 1. Install Dependencies

You have two options:

**Option A: Using the provided package.json**
```bash
npm install --prefix . glob @babel/parser @babel/traverse
```

**Option B: Manual installation**
```bash
npm install glob @babel/parser @babel/traverse
```

### 2. Run the Analyzer

```bash
node analyze_codebase.js
```

### 3. View Results

The analysis results will be saved to `feature_report.json` in the current directory.

## Configuration

You can customize the analysis by editing the configuration variables at the top of `analyze_codebase.js`:

```javascript
const START_DIRECTORY = './';  // Root directory to scan
const FILE_EXTENSIONS = ['.js', '.jsx', '.ts', '.tsx'];  // File types to analyze
const OUTPUT_FILE = './feature_report.json';  // Output report path
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
```

### Customization Options

- **START_DIRECTORY**: Change to scan a different directory (e.g., `'./src'`)
- **FILE_EXTENSIONS**: Add or remove file types (e.g., add `'.vue'` for Vue files)
- **OUTPUT_FILE**: Change the output file name or location
- **KEYWORD_TRIGGERS**: Add your own keywords to search for
- **MIN_PARAMS_FOR_COMPLEXITY**: Adjust parameter count threshold (default: 3)
- **MIN_LINES_FOR_COMPLEXITY**: Adjust line count threshold (default: 25)

## Analysis Heuristics

The script flags functions, classes, and methods based on the following criteria:

### 1. **Keyword Matching**
- Function/class name contains a keyword (case-insensitive)
- Function/class body contains a keyword

### 2. **Special Comments**
Functions/classes marked with:
- `@advanced`
- `@feature`
- `@CloudConnect`
- `@Glytch`

Example:
```javascript
// @advanced
// @CloudConnect
function syncToCloudConnect(data) {
  // ...
}
```

### 3. **Complexity Metrics**
- Functions with more than 3 parameters
- Functions with more than 25 lines of code

### 4. **API Calls**
Functions containing:
- `fetch()` calls
- `axios.get()`, `axios.post()`, etc.
- `http.get()`, `https.request()`, etc.

## Output Format

The script generates a JSON file with the following structure:

```json
[
  {
    "filePath": "src/services/cloudConnect.js",
    "type": "Function",
    "name": "syncCloudConnectData",
    "line": 42,
    "reason": "Name contains keyword: CloudConnect | Contains API calls: fetch",
    "codeSnippet": "function syncCloudConnectData(userId, data) {\n  const response = await fetch('/api/sync');\n  // ...\n}"
  }
]
```

### Field Descriptions

- **filePath**: Relative path to the file
- **type**: Function, Class, or Method
- **name**: Name of the function/class
- **line**: Starting line number
- **reason**: Why it was flagged (may contain multiple reasons separated by `|`)
- **codeSnippet**: First 10 lines of code (or full code if shorter)

## Examples

### Example 1: Analyze Current Directory

```bash
node analyze_codebase.js
```

### Example 2: Analyze Specific Directory

Edit `analyze_codebase.js`:
```javascript
const START_DIRECTORY = './src/integrations';
```

Then run:
```bash
node analyze_codebase.js
```

### Example 3: Add Custom Keywords

Edit `analyze_codebase.js`:
```javascript
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
  'pipeline',
  'MyCustomKeyword',  // Add your own
  'AnotherKeyword'
];
```

## Console Output

During execution, you'll see progress updates:

```
[INFO] Starting codebase analysis...
[INFO] Scanning directory: /home/user/project
[INFO] Looking for extensions: .js, .jsx, .ts, .tsx
[INFO] Keywords: CloudConnect, Glytch, GoHighLevel, ...

[INFO] Found 156 files to analyze

[PROGRESS] Analyzing files: 156/156

[SUCCESS] Analysis complete. 47 features found.
[SUCCESS] Report saved to /home/user/project/feature_report.json

=== SUMMARY ===
Functions: 32
Methods: 12
Class: 3

Top 5 files with most features:
  src/services/cloudConnect.js: 8 features
  src/integrations/ghl.js: 6 features
  src/utils/webhooks.js: 5 features
  src/api/automation.js: 4 features
  src/components/Glytch.jsx: 3 features
```

## Error Handling

The script includes robust error handling:

- **Parse Errors**: Files that can't be parsed are skipped with an error message
- **Invalid Files**: Non-existent or unreadable files are logged and skipped
- **Syntax Errors**: Modern JavaScript/TypeScript syntax is supported through Babel plugins

## Excluded Directories

The following directories are automatically excluded from analysis:
- `node_modules/`
- `dist/`
- `build/`
- `.git/`

## Troubleshooting

### Problem: "Cannot find module 'glob'"

**Solution**: Install dependencies:
```bash
npm install glob @babel/parser @babel/traverse
```

### Problem: Parse errors on TypeScript files

**Solution**: The script already includes TypeScript support. If you encounter issues, ensure your TypeScript syntax is valid.

### Problem: No features found

**Solution**:
1. Check that `START_DIRECTORY` points to the correct location
2. Verify `FILE_EXTENSIONS` includes your file types
3. Add more keywords to `KEYWORD_TRIGGERS`
4. Lower the complexity thresholds

### Problem: Too many results

**Solution**:
1. Increase `MIN_PARAMS_FOR_COMPLEXITY` and `MIN_LINES_FOR_COMPLEXITY`
2. Remove generic keywords from `KEYWORD_TRIGGERS`
3. Add more specific keywords

## Advanced Usage

### Programmatic Usage

You can import and modify the script:

```javascript
const analyzer = require('./analyze_codebase.js');

// Modify configuration
// Run analysis
// Process results
```

### Integration with CI/CD

Add to your CI pipeline:

```yaml
# .github/workflows/analyze.yml
name: Code Analysis
on: [push]
jobs:
  analyze:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - run: npm install glob @babel/parser @babel/traverse
      - run: node analyze_codebase.js
      - uses: actions/upload-artifact@v2
        with:
          name: feature-report
          path: feature_report.json
```

## License

MIT

## Support

For issues or questions, please refer to the script's inline comments or modify the configuration as needed.
