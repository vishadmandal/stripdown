# stripdown

> **Kill your dependency bloat.** A Node.js tool that analyzes your actual code usage and strips packages down to only the functions you need.

---

## The Problem

When you `npm install lodash` just to use `map()`, you get:

- **1,400+** lodash functions you'll never call
- **30+** sub-dependencies pulled in
- **500MB+** of total `node_modules`

You ship a mountain of code to do a molehill of work.

---

## The Solution

`stripdown` analyzes your project's source files, figures out exactly which functions from which packages you actually use, and generates a single wrapper package called `stripdown` that re-exports only those.

**Before:**
```js
const { map, filter } = require('lodash');
const axios = require('axios');
const { config } = require('dotenv');
```

**After:**
```js
const { map, filter, get, config } = require('stripdown');
```

Same behavior. Fraction of the footprint.

---

## How It Works

```
Your Source Files
      │
      ▼
  [scanner.js]  ──── Walks file system, finds all require()/import statements
      │
      ▼
  [analyzer.js] ──── Builds a map: { 'lodash': ['map','filter'], 'axios': ['get'] }
      │
      ▼
  [wrapper.js]  ──── Writes node_modules/stripdown/index.js that re-exports everything
      │
      ▼
  node_modules/
  └── stripdown/
      ├── index.js              ← your new unified import target
      ├── package.json
      └── .stripdown-manifest.json  ← debug manifest of what was included
```

---

## Project Structure

```
stripdown/
├── bin/
│   └── stripdown.js          # CLI entry point (analyze + compile commands)
├── lib/
│   ├── scanner.js            # File walker + import/require extractor
│   ├── analyzer.js           # AST-based function usage tracker
│   ├── wrapper.js            # Generates node_modules/stripdown/index.js
│   └── utils.js              # Shared helpers (path detection, file walking)
├── tests/
│   ├── utils.test.js
│   └── fixtures/             # Sample apps for integration testing
├── plan.md                   # Full design doc and roadmap
├── package.json
└── README.md
```

---

## Usage

### Analyze (dry run — shows what's used, writes nothing)
```bash
node bin/stripdown.js analyze --src ./src
```

Example output:
```
✔ Analysis complete! Found 3 external packages.

Usage Report:
=============
lodash: map, filter, reduce
axios: get, post
dotenv: config
```

### Compile (generates the stripdown wrapper)
```bash
node bin/stripdown.js compile --src ./src --target .
```

This writes `node_modules/stripdown/index.js` into your project. Then update your imports to `require('stripdown')`.

---

## Dependencies Used

| Package | Role |
|---|---|
| `@babel/parser` | Parse JS/TS source into AST |
| `@babel/traverse` | Walk the AST to find usage |
| `fs-extra` | File system operations |
| `commander` | CLI argument parsing |
| `chalk` | Colored terminal output |
| `ora` | Spinner animations |

---

## Roadmap

### ✅ Phase 1 — MVP (Complete)
The full analysis and wrapper-generation pipeline is built.

- [x] **scanner.js** — walks source files, extracts all `import`/`require` statements (including `export ... from`, dynamic imports, scoped packages)
- [x] **analyzer.js** — AST-based analysis that tracks *which specific exports* are used per package (named imports, destructuring, namespace access, chained calls like `require('dotenv').config()`)
- [x] **wrapper.js** — generates `node_modules/stripdown/index.js` with collision handling and a debug manifest
- [x] **utils.js** — shared helpers for path detection, recursive file discovery, and byte formatting
- [x] **bin/stripdown.js** — CLI with `analyze` and `compile` commands

### 🔲 Phase 2 — Smart Stripping (Up Next)
Actually delete unused files from packages to reclaim disk space.

- [ ] **stripper.js** — physically remove unused files from stripped packages
- [ ] Circular dependency detection and handling
- [ ] `.stripdown-keep` safety markers
- [ ] Fallback: if a package can't be safely stripped, keep it intact

### 🔲 Phase 3 — User Experience
- [ ] `--dry-run` flag on `compile`
- [ ] `stripdown-update` command (recompile on dependency changes)
- [ ] `.stripdownconfig.json` for package-level overrides (blacklist/whitelist)
- [ ] Report generation — size saved, what was stripped
- [ ] Optional: auto-rewrite user imports to `require('stripdown')`

### 🔲 Phase 4 — Advanced
- [ ] Warn on dynamic `require()` patterns that can't be statically analyzed
- [ ] Version management — recompile when `package-lock.json` changes
- [ ] Incremental updates — only recompile what changed
- [ ] Standalone compiled bundle output option

---

## Current Status

**Phase 1 is complete. The tool can:**
1. Walk a project's source directory
2. Parse every JS/TS file with Babel
3. Build an accurate map of `{ package → [used functions] }`
4. Generate a working `node_modules/stripdown/` wrapper package

**What's pending before Phase 2:**
- Wire `"bin"` entry in `package.json` so the CLI is accessible via `npx`
- Run against a real fixture app to validate end-to-end output
- Add `--dry-run` to `compile` for safe inspection

---

## Technical Assumptions

- Node.js 14+
- npm 6+ (yarn/pnpm compatible)
- Source code lives in a `src/`, `lib/`, or similar directory
- Most dependencies are "well-behaved" (standard CommonJS/ESM modules, not heavily dynamic)

**Not in scope (by design):**
- Modifying `package.json` files inside `node_modules`
- Rewriting the internal structure of packages
- Handling all edge cases perfectly — safe degradation is the fallback

---

## Contributing / Notes

This is experimental. The `stripdown` wrapper approach works because Node's module resolution finds `node_modules/stripdown` as a normal package. No monkey-patching, no bundler tricks.

If stripping breaks something, the fallback is always to keep the full original package — safety first.

---

*Full design document and implementation plan: [`plan.md`](./plan.md)*
