# 247 Terminal v2.0 - Setup & Feature Inventory

**Date:** 2025-01-09
**Status:** Planning Phase

---

## Quick Reference Paths

### Project Locations
| Project | Full Path |
|---------|-----------|
| **v1 (Current)** | `/Users/matthewkriel/Documents/247terminal/247-terminal-pwa` |
| **v2 (New)** | `/Users/matthewkriel/Documents/247terminal/247-terminal-v2` |
| **Documentation** | `/Users/matthewkriel/Documents/247terminal/247-terminal-pwa/_documentation` |

### v1 Key Files (Reference)
| File | Full Path |
|------|-----------|
| Main Terminal | `/Users/matthewkriel/Documents/247terminal/247-terminal-pwa/src/pages/terminal.page.js` |
| Login Page | `/Users/matthewkriel/Documents/247terminal/247-terminal-pwa/src/pages/login.page.js` |
| Settings Page | `/Users/matthewkriel/Documents/247terminal/247-terminal-pwa/src/pages/settings.page.js` |
| Auth Service | `/Users/matthewkriel/Documents/247terminal/247-terminal-pwa/src/modules/auth/auth.service.js` |
| HWID Service | `/Users/matthewkriel/Documents/247terminal/247-terminal-pwa/src/modules/core/hwid.service.js` |
| Terminal State | `/Users/matthewkriel/Documents/247terminal/247-terminal-pwa/src/modules/core/terminal-state.service.js` |
| Exchange Worker | `/Users/matthewkriel/Documents/247terminal/247-terminal-pwa/src/workers/exchange.worker.js` |
| News Worker | `/Users/matthewkriel/Documents/247terminal/247-terminal-pwa/src/workers/news-websocket.worker.js` |
| Chart Service | `/Users/matthewkriel/Documents/247terminal/247-terminal-pwa/src/modules/chart/chart.service.js` |
| Chart Manager | `/Users/matthewkriel/Documents/247terminal/247-terminal-pwa/src/modules/chart/chart-manager.js` |
| Orders Service | `/Users/matthewkriel/Documents/247terminal/247-terminal-pwa/src/modules/trading/orders.service.js` |
| Positions Service | `/Users/matthewkriel/Documents/247terminal/247-terminal-pwa/src/modules/trading/positions.service.js` |
| Wallet Service | `/Users/matthewkriel/Documents/247terminal/247-terminal-pwa/src/modules/trading/wallet.service.js` |
| PnL Service | `/Users/matthewkriel/Documents/247terminal/247-terminal-pwa/src/modules/trading/pnl.service.js` |
| History Service | `/Users/matthewkriel/Documents/247terminal/247-terminal-pwa/src/modules/trading/history.service.js` |
| News Stream | `/Users/matthewkriel/Documents/247terminal/247-terminal-pwa/src/modules/news/news-stream.service.js` |
| News Render | `/Users/matthewkriel/Documents/247terminal/247-terminal-pwa/src/modules/news/news-render.service.js` |
| News Scroller | `/Users/matthewkriel/Documents/247terminal/247-terminal-pwa/src/modules/news/news-scroller.component.js` |
| News WebSocket | `/Users/matthewkriel/Documents/247terminal/247-terminal-pwa/src/modules/news/news-websocket.service.js` |
| Chat UI | `/Users/matthewkriel/Documents/247terminal/247-terminal-pwa/src/modules/chat/chat-ui.module.js` |
| Chat WebSocket | `/Users/matthewkriel/Documents/247terminal/247-terminal-pwa/src/modules/chat/chat-websocket.module.js` |
| Settings Manager | `/Users/matthewkriel/Documents/247terminal/247-terminal-pwa/src/modules/settings/settings-manager.service.js` |
| Settings Exchange | `/Users/matthewkriel/Documents/247terminal/247-terminal-pwa/src/modules/settings/settings-exchange.component.js` |
| Settings Keywords | `/Users/matthewkriel/Documents/247terminal/247-terminal-pwa/src/modules/settings/settings-keywords.component.js` |
| API Client | `/Users/matthewkriel/Documents/247terminal/247-terminal-pwa/src/modules/api/api.client.js` |
| Tickers Service | `/Users/matthewkriel/Documents/247terminal/247-terminal-pwa/src/modules/data/tickers.service.js` |
| Trading Constants | `/Users/matthewkriel/Documents/247terminal/247-terminal-pwa/src/modules/data/trading-constants.js` |
| UI Helpers | `/Users/matthewkriel/Documents/247terminal/247-terminal-pwa/src/modules/ui/ui-helpers.service.js` |
| Sound Service | `/Users/matthewkriel/Documents/247terminal/247-terminal-pwa/src/modules/ui/sound.service.js` |
| Ticker Search | `/Users/matthewkriel/Documents/247terminal/247-terminal-pwa/src/modules/ui/ticker-search.service.js` |
| Layout Manager | `/Users/matthewkriel/Documents/247terminal/247-terminal-pwa/src/modules/layout/layout-manager.module.js` |
| Storage Service | `/Users/matthewkriel/Documents/247terminal/247-terminal-pwa/src/modules/storage/persistent-storage.service.js` |
| Drawing Tools | `/Users/matthewkriel/Documents/247terminal/247-terminal-pwa/src/modules/chart/drawing-tools.service.js` |
| Measurement | `/Users/matthewkriel/Documents/247terminal/247-terminal-pwa/src/modules/chart/measurement.service.js` |
| Mini Chart | `/Users/matthewkriel/Documents/247terminal/247-terminal-pwa/src/modules/chart/minichart.service.js` |

### v1 Worker Modules
| File | Full Path |
|------|-----------|
| Trading Module | `/Users/matthewkriel/Documents/247terminal/247-terminal-pwa/src/workers/exchange/trading.js` |
| Charts Module | `/Users/matthewkriel/Documents/247terminal/247-terminal-pwa/src/workers/exchange/charts.js` |
| Markets Module | `/Users/matthewkriel/Documents/247terminal/247-terminal-pwa/src/workers/exchange/markets.js` |
| Symbols Module | `/Users/matthewkriel/Documents/247terminal/247-terminal-pwa/src/workers/exchange/symbols.js` |
| State Module | `/Users/matthewkriel/Documents/247terminal/247-terminal-pwa/src/workers/exchange/state.js` |

### v1 Utility Files
| File | Full Path |
|------|-----------|
| String Utils | `/Users/matthewkriel/Documents/247terminal/247-terminal-pwa/src/modules/utils/string.util.js` |
| Time Utils | `/Users/matthewkriel/Documents/247terminal/247-terminal-pwa/src/modules/utils/time.util.js` |
| Format Utils | `/Users/matthewkriel/Documents/247terminal/247-terminal-pwa/src/modules/utils/format.utils.js` |
| General Utils | `/Users/matthewkriel/Documents/247terminal/247-terminal-pwa/src/modules/utils/general.util.js` |
| Terminal Utils | `/Users/matthewkriel/Documents/247terminal/247-terminal-pwa/src/modules/utils/terminal.util.js` |
| DEX Utils | `/Users/matthewkriel/Documents/247terminal/247-terminal-pwa/src/modules/utils/dex.util.js` |
| DEX Tokens | `/Users/matthewkriel/Documents/247terminal/247-terminal-pwa/src/modules/utils/dex-tokens.service.js` |
| News Dedup | `/Users/matthewkriel/Documents/247terminal/247-terminal-pwa/src/modules/utils/news-deduplication.util.js` |
| OCR Service | `/Users/matthewkriel/Documents/247terminal/247-terminal-pwa/src/modules/utils/ocr.service.js` |
| Translate | `/Users/matthewkriel/Documents/247terminal/247-terminal-pwa/src/modules/utils/translate.service.js` |

### Documentation Files
| Document | Full Path |
|----------|-----------|
| Codebase Analysis | `/Users/matthewkriel/Documents/247terminal/247-terminal-pwa/_documentation/codebase_analysis.md` |
| v2 Rewrite Plan | `/Users/matthewkriel/Documents/247terminal/247-terminal-pwa/_documentation/v2_rewrite_plan.md` |
| This Document | `/Users/matthewkriel/Documents/247terminal/247-terminal-pwa/_documentation/v2_setup_and_features.md` |

---

## Part 1: Project Setup Instructions

### 1.1 Prerequisites

```bash
# Required
node >= 20.x
npm >= 10.x

# Recommended
nvm (for Node version management)
```

### 1.2 Create New Repository

```bash
# Navigate to parent directory
cd /Users/matthewkriel/Documents/247terminal

# Create new project with Vite + Preact + TypeScript
npm create vite@latest 247-terminal-v2 -- --template preact-ts

# Enter project
cd 247-terminal-v2

# Install core dependencies
npm install

# Install additional dependencies
npm install @preact/signals lightweight-charts rxjs

# Install dev dependencies (Tailwind v4 uses @tailwindcss/vite plugin, no PostCSS needed)
npm install -D @tailwindcss/vite tailwindcss daisyui vitest @testing-library/preact jsdom eslint prettier eslint-config-prettier @typescript-eslint/eslint-plugin @typescript-eslint/parser
```

### 1.3 Configure Tailwind CSS v4 + DaisyUI v5

**Note:** Tailwind CSS v4 uses CSS-based configuration instead of `tailwind.config.js`. No `postcss.config.js` is needed when using the Vite plugin.

Update `src/index.css` with Tailwind and DaisyUI configuration.

**Note:** Colors are sourced from `247-terminal-website/src/styles/global.css` to ensure consistency across the product suite.

```css
@import "tailwindcss";

@plugin "daisyui";

/* Terminal Dark Theme - matches 247-terminal-website */
@plugin "daisyui/theme" {
  name: "terminal-dark";
  default: true;
  prefersdark: true;
  color-scheme: dark;

  /* Backgrounds - from website global.css */
  --color-base-100: #09090b;
  --color-base-200: #18181b;
  --color-base-300: #27272a;
  --color-base-content: #fafafa;

  /* Primary - red accent */
  --color-primary: #ef4444;
  --color-primary-content: #ffffff;

  /* Secondary - muted gray */
  --color-secondary: #27272a;
  --color-secondary-content: #fafafa;

  /* Accent - lighter red */
  --color-accent: #f87171;
  --color-accent-content: #000000;

  /* Neutral - for cards, modals */
  --color-neutral: #18181b;
  --color-neutral-content: #a1a1aa;

  /* Semantic colors */
  --color-info: #3b82f6;
  --color-info-content: #ffffff;

  --color-success: #22c55e;
  --color-success-content: #000000;

  --color-warning: #f59e0b;
  --color-warning-content: #000000;

  --color-error: #ef4444;
  --color-error-content: #ffffff;

  /* Design tokens */
  --radius-selector: 0.5rem;
  --radius-field: 0.25rem;
  --radius-box: 0.5rem;
  --border: 1px;
  --depth: 1;
  --noise: 0;
}

/* Terminal Light Theme */
@plugin "daisyui/theme" {
  name: "terminal-light";
  default: false;
  prefersdark: false;
  color-scheme: light;

  --color-base-100: #ffffff;
  --color-base-200: #f4f4f5;
  --color-base-300: #e4e4e7;
  --color-base-content: #09090b;

  --color-primary: #dc2626;
  --color-primary-content: #ffffff;

  --color-secondary: #e4e4e7;
  --color-secondary-content: #09090b;

  --color-accent: #ef4444;
  --color-accent-content: #ffffff;

  --color-neutral: #f4f4f5;
  --color-neutral-content: #71717a;

  --color-info: #2563eb;
  --color-info-content: #ffffff;

  --color-success: #16a34a;
  --color-success-content: #ffffff;

  --color-warning: #ca8a04;
  --color-warning-content: #ffffff;

  --color-error: #dc2626;
  --color-error-content: #ffffff;

  --radius-selector: 0.5rem;
  --radius-field: 0.25rem;
  --radius-box: 0.5rem;
  --border: 1px;
  --depth: 1;
  --noise: 0;
}

/* Global styles */
:root {
  font-family: system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
}

* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

/* Custom utility classes matching website */
.text-muted {
  color: #71717a;
}

.border-subtle {
  border-color: rgba(255, 255, 255, 0.08);
}

.border-subtle-light {
  border-color: rgba(255, 255, 255, 0.12);
}

.glow-accent {
  box-shadow: 0 0 20px rgba(239, 68, 68, 0.15);
}

.glow-accent-strong {
  box-shadow: 0 0 30px rgba(239, 68, 68, 0.3);
}
```

Update `index.html` to set the default theme:
```html
<!DOCTYPE html>
<html lang="en" data-theme="terminal-dark">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>247 Terminal</title>
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

### 1.4 Configure TypeScript

Vite 7.x uses a split tsconfig structure. The root `tsconfig.json` just references other configs:

```json
{
  "files": [],
  "references": [
    { "path": "./tsconfig.app.json" },
    { "path": "./tsconfig.node.json" }
  ]
}
```

Update `tsconfig.app.json` to add the `@/*` path alias:
```json
{
  "compilerOptions": {
    "tsBuildInfoFile": "./node_modules/.tmp/tsconfig.app.tsbuildinfo",
    "target": "ES2022",
    "useDefineForClassFields": true,
    "module": "ESNext",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "types": ["vite/client"],
    "skipLibCheck": true,
    "paths": {
      "react": ["./node_modules/preact/compat/"],
      "react-dom": ["./node_modules/preact/compat/"],
      "@/*": ["./src/*"]
    },

    /* Bundler mode */
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "verbatimModuleSyntax": true,
    "moduleDetection": "force",
    "noEmit": true,
    "jsx": "react-jsx",
    "jsxImportSource": "preact",

    /* Linting */
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "erasableSyntaxOnly": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedSideEffectImports": true
  },
  "include": ["src"]
}
```

**Note:** The `@/*` alias lets you import like `import { foo } from '@/services/auth'` instead of relative paths.

### 1.5 Configure Vite

Update `vite.config.ts` to include the Tailwind CSS v4 plugin:
```typescript
import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';
import tailwindcss from '@tailwindcss/vite';
import { resolve } from 'path';

export default defineConfig({
  plugins: [
    preact(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000,
    host: true,
  },
  build: {
    target: 'es2020',
    sourcemap: true,
  },
  worker: {
    format: 'es',
  },
});
```

### 1.6 Configure ESLint

Create `eslint.config.js`:
```javascript
import eslint from '@eslint/js';
import tseslint from '@typescript-eslint/eslint-plugin';
import tsparser from '@typescript-eslint/parser';
import prettier from 'eslint-config-prettier';

export default [
  eslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
    },
    plugins: {
      '@typescript-eslint': tseslint,
    },
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/no-explicit-any': 'warn',
      'no-console': ['warn', { allow: ['warn', 'error'] }],
    },
  },
  prettier,
];
```

### 1.7 Configure Prettier

Create `.prettierrc`:
```json
{
  "semi": true,
  "singleQuote": true,
  "tabWidth": 4,
  "trailingComma": "es5",
  "printWidth": 100
}
```

### 1.8 Configure Vitest

Create `vitest.config.ts`:
```typescript
import { defineConfig } from 'vitest/config';
import preact from '@preact/preset-vite';

export default defineConfig({
  plugins: [preact()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
  },
});
```

Create `src/test/setup.ts`:
```typescript
import '@testing-library/preact';
```

### 1.9 Update package.json Scripts

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "test": "vitest",
    "test:coverage": "vitest --coverage",
    "lint": "eslint src --ext .ts,.tsx",
    "lint:fix": "eslint src --ext .ts,.tsx --fix",
    "type-check": "tsc --noEmit",
    "format": "prettier --write \"src/**/*.{ts,tsx,css}\""
  }
}
```

### 1.10 Create Directory Structure

```bash
mkdir -p src/{components,services,workers,stores,hooks,utils,types,config,test}
mkdir -p src/components/{layout,chart,trading,news,chat,auth,settings,common}
mkdir -p src/services/{trading,exchange,news,chat,auth,history,notification,storage,settings}
mkdir -p tests/{services,components,utils}
```

### 1.11 Final package.json Dependencies

```json
{
  "name": "247-terminal-v2",
  "private": true,
  "version": "2.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview",
    "test": "vitest",
    "test:coverage": "vitest --coverage",
    "lint": "eslint src --ext .ts,.tsx",
    "lint:fix": "eslint src --ext .ts,.tsx --fix",
    "type-check": "tsc --noEmit",
    "format": "prettier --write \"src/**/*.{ts,tsx,css}\""
  },
  "dependencies": {
    "preact": "^10.x",
    "@preact/signals": "^2.x",
    "lightweight-charts": "^5.x",
    "rxjs": "^7.x"
  },
  "devDependencies": {
    "@preact/preset-vite": "^2.x",
    "@tailwindcss/vite": "^4.x",
    "@testing-library/preact": "^3.x",
    "@typescript-eslint/eslint-plugin": "^8.x",
    "@typescript-eslint/parser": "^8.x",
    "daisyui": "^5.x",
    "eslint": "^9.x",
    "eslint-config-prettier": "^10.x",
    "jsdom": "^27.x",
    "prettier": "^3.x",
    "tailwindcss": "^4.x",
    "typescript": "^5.x",
    "vite": "^7.x",
    "vitest": "^4.x"
  }
}
```

**Note:** Tailwind CSS v4 does not require `postcss` or `autoprefixer` when using the `@tailwindcss/vite` plugin.

### 1.12 DaisyUI Component Reference

DaisyUI provides pre-styled components using semantic class names. Here are examples for common terminal UI patterns:

```tsx
// Buttons
<button class="btn btn-primary">Buy</button>
<button class="btn btn-error">Sell</button>
<button class="btn btn-ghost btn-sm">Cancel</button>

// Cards (for positions, orders)
<div class="card bg-base-200 shadow-xl">
  <div class="card-body p-4">
    <h2 class="card-title text-success">BTCUSDT</h2>
    <p>Entry: $42,500</p>
    <div class="card-actions justify-end">
      <button class="btn btn-error btn-sm">Close</button>
    </div>
  </div>
</div>

// Badges (for position side, status)
<span class="badge badge-success">LONG</span>
<span class="badge badge-error">SHORT</span>
<span class="badge badge-warning">PENDING</span>

// Inputs
<input type="text" placeholder="Search..." class="input input-bordered w-full" />
<input type="number" class="input input-bordered input-sm" />

// Tabs (for timeframes, panels)
<div class="tabs tabs-boxed">
  <a class="tab">1m</a>
  <a class="tab tab-active">5m</a>
  <a class="tab">1h</a>
</div>

// Stats (for balance, P&L)
<div class="stats shadow">
  <div class="stat">
    <div class="stat-title">Balance</div>
    <div class="stat-value text-success">$12,345</div>
  </div>
</div>

// Toasts/Alerts
<div class="alert alert-success">
  <span>Order filled successfully</span>
</div>

// Modal
<dialog class="modal">
  <div class="modal-box">
    <h3 class="font-bold text-lg">Settings</h3>
    <div class="modal-action">
      <button class="btn">Close</button>
    </div>
  </div>
</dialog>
```

**DaisyUI Theme Colors (available via CSS variables):**
- `primary`, `secondary`, `accent` - Brand colors
- `success` - Green (profit, long, buy)
- `error` - Red (loss, short, sell)
- `warning` - Yellow (pending, caution)
- `info` - Blue (informational)
- `base-100`, `base-200`, `base-300` - Background layers
- `base-content` - Text color

**Documentation:** https://daisyui.com/components/

### 1.13 Theme Switching Implementation

Create a theme toggle hook that respects system preference and persists user choice:

```typescript
// src/hooks/use_theme.ts
import { signal, effect } from '@preact/signals';

type Theme = 'terminal-dark' | 'terminal-light';

const STORAGE_KEY = '247-terminal-theme';

function get_initial_theme(): Theme {
  const stored = localStorage.getItem(STORAGE_KEY) as Theme | null;
  if (stored) return stored;

  const prefers_dark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  return prefers_dark ? 'terminal-dark' : 'terminal-light';
}

export const current_theme = signal<Theme>(get_initial_theme());

effect(() => {
  document.documentElement.setAttribute('data-theme', current_theme.value);
  localStorage.setItem(STORAGE_KEY, current_theme.value);
});

export function toggle_theme() {
  current_theme.value = current_theme.value === 'terminal-dark'
    ? 'terminal-light'
    : 'terminal-dark';
}

export function set_theme(theme: Theme) {
  current_theme.value = theme;
}
```

Theme toggle component:

```tsx
// src/components/common/theme_toggle.tsx
import { current_theme, toggle_theme } from '@/hooks/use_theme';

export function ThemeToggle() {
  const is_dark = current_theme.value === 'terminal-dark';

  return (
    <label class="swap swap-rotate">
      <input
        type="checkbox"
        checked={!is_dark}
        onChange={toggle_theme}
      />
      {/* Sun icon */}
      <svg class="swap-on fill-current w-5 h-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
        <path d="M5.64,17l-.71.71a1,1,0,0,0,0,1.41,1,1,0,0,0,1.41,0l.71-.71A1,1,0,0,0,5.64,17ZM5,12a1,1,0,0,0-1-1H3a1,1,0,0,0,0,2H4A1,1,0,0,0,5,12Zm7-7a1,1,0,0,0,1-1V3a1,1,0,0,0-2,0V4A1,1,0,0,0,12,5ZM5.64,7.05a1,1,0,0,0,.7.29,1,1,0,0,0,.71-.29,1,1,0,0,0,0-1.41l-.71-.71A1,1,0,0,0,4.93,6.34Zm12,.29a1,1,0,0,0,.7-.29l.71-.71a1,1,0,1,0-1.41-1.41L17,5.64a1,1,0,0,0,0,1.41A1,1,0,0,0,17.66,7.34ZM21,11H20a1,1,0,0,0,0,2h1a1,1,0,0,0,0-2Zm-9,8a1,1,0,0,0-1,1v1a1,1,0,0,0,2,0V20A1,1,0,0,0,12,19ZM18.36,17A1,1,0,0,0,17,18.36l.71.71a1,1,0,0,0,1.41,0,1,1,0,0,0,0-1.41ZM12,6.5A5.5,5.5,0,1,0,17.5,12,5.51,5.51,0,0,0,12,6.5Zm0,9A3.5,3.5,0,1,1,15.5,12,3.5,3.5,0,0,1,12,15.5Z"/>
      </svg>
      {/* Moon icon */}
      <svg class="swap-off fill-current w-5 h-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
        <path d="M21.64,13a1,1,0,0,0-1.05-.14,8.05,8.05,0,0,1-3.37.73A8.15,8.15,0,0,1,9.08,5.49a8.59,8.59,0,0,1,.25-2A1,1,0,0,0,8,2.36,10.14,10.14,0,1,0,22,14.05,1,1,0,0,0,21.64,13Zm-9.5,6.69A8.14,8.14,0,0,1,7.08,5.22v.27A10.15,10.15,0,0,0,17.22,15.63a9.79,9.79,0,0,0,2.1-.22A8.11,8.11,0,0,1,12.14,19.73Z"/>
      </svg>
    </label>
  );
}
```

**Theme Color Summary (matches 247-terminal-website):**

| Color | terminal-dark | terminal-light | Usage |
|-------|---------------|----------------|-------|
| base-100 | `#09090b` | `#ffffff` | Main background |
| base-200 | `#18181b` | `#f4f4f5` | Surface/cards |
| base-300 | `#27272a` | `#e4e4e7` | Elevated/borders |
| base-content | `#fafafa` | `#09090b` | Primary text |
| primary | `#ef4444` | `#dc2626` | Red accent, branding |
| accent | `#f87171` | `#ef4444` | Lighter red |
| neutral-content | `#a1a1aa` | `#71717a` | Secondary text |
| success | `#22c55e` | `#16a34a` | Profit, long, buy |
| error | `#ef4444` | `#dc2626` | Loss, short, sell |
| warning | `#f59e0b` | `#ca8a04` | Pending, caution |
| info | `#3b82f6` | `#2563eb` | Informational |

**Custom Utility Classes:**
| Class | Value | Usage |
|-------|-------|-------|
| `.text-muted` | `#71717a` | Tertiary/disabled text |
| `.border-subtle` | `rgba(255,255,255,0.08)` | Subtle borders |
| `.border-subtle-light` | `rgba(255,255,255,0.12)` | Slightly visible borders |
| `.glow-accent` | `rgba(239,68,68,0.15)` | Red glow on hover |
| `.glow-accent-strong` | `rgba(239,68,68,0.3)` | Stronger red glow |

**Color Source:** `247-terminal-website/src/styles/global.css`

---

## Part 2: Complete Feature Inventory

### Priority Legend
- **P0** - MVP Required (must have for launch)
- **P1** - High Priority (needed shortly after MVP)
- **P2** - Medium Priority (nice to have)
- **P3** - Low Priority (future enhancement)

---

## 2.1 Authentication & Session (Login Component)

| Feature | Priority | Description | v1 File Reference |
|---------|----------|-------------|-------------------|
| License key validation | P0 | Validate license against backend API | `auth.service.js` |
| HWID generation | P0 | Generate hardware ID for device binding | `hwid.service.js` |
| Session token management | P0 | Store/retrieve session tokens | `auth.service.js` |
| Auto-login | P1 | Remember credentials for auto-login | `auth.service.js` |
| Session recovery | P1 | Background retry on disconnect | `auth.service.js` |
| Admin flag tracking | P2 | Track admin status from license | `auth.service.js` |
| Membership status | P2 | Track subscription tier | `auth.service.js` |
| Settings restore on login | P1 | Pull settings from server on first login | `settings-manager.service.js` |

### Login Component Structure
```
src/components/auth/
├── login_page.tsx           # Main login page
├── license_input.tsx        # License key input field
└── login_status.tsx         # Connection/validation status
```

---

## 2.2 Settings Component

| Feature | Priority | Description | v1 File Reference |
|---------|----------|-------------|-------------------|
| **Exchange Settings** |
| API key/secret per exchange | P0 | Store encrypted credentials | `settings-exchange.component.js` |
| Enable/disable exchanges | P0 | Toggle which exchanges are active | `settings-exchange.component.js` |
| Default exchange selection | P0 | Set primary trading exchange | `settings-exchange.component.js` |
| Credential validation | P1 | Test API credentials | `settings-exchange.component.js` |
| **Trading Settings** |
| USDT size tiers (4 levels) | P0 | Configure order sizes | `settings.page.js` |
| Slippage percentage | P0 | Set max slippage | `settings.page.js` |
| Order cooldown | P1 | Prevent rapid orders | `settings.page.js` |
| Default leverage | P0 | Set leverage per exchange | `settings.page.js` |
| Margin mode (cross/isolated) | P0 | Configure margin type | `settings.page.js` |
| **Keyboard Shortcuts** |
| Buy shortcuts (S/M/L/XL) | P0 | Configure buy hotkeys | `settings.page.js` |
| Sell shortcuts (S/M/L/XL) | P0 | Configure sell hotkeys | `settings.page.js` |
| Nuke shortcut | P0 | Close all positions hotkey | `settings.page.js` |
| Modifier keys config | P1 | CTRL/SHIFT combinations | `settings.page.js` |
| **Chart Settings** |
| Default timeframe | P1 | Set startup timeframe | `settings.page.js` |
| UTC/Local time toggle | P1 | Time display mode | `settings.page.js` |
| Grid line colors | P2 | Customize chart appearance | `settings.page.js` |
| **News Settings** |
| Source filtering | P1 | Enable/disable news sources | `settings.page.js` |
| Blacklisted sources | P1 | Block specific accounts | `settings-keywords.component.js` |
| Blacklisted coins | P1 | Filter out coins | `settings-keywords.component.js` |
| Critical keywords | P1 | Highlight important terms | `settings-keywords.component.js` |
| Custom keywords | P2 | User-defined highlights | `settings-keywords.component.js` |
| Translation language | P2 | Auto-translate target | `settings.page.js` |
| **UI Settings** |
| Desktop notifications | P1 | Enable browser notifications | `settings.page.js` |
| Sound alerts | P1 | Enable audio notifications | `settings.page.js` |
| Privacy mode | P1 | Hide sensitive values | `settings.page.js` |
| Theme selection | P2 | Color theme options | `settings.page.js` |
| **Settings Sync** |
| Encrypt settings | P0 | AES-256-GCM encryption | `settings-manager.service.js` |
| Server sync | P1 | Backup to server | `settings-manager.service.js` |
| Import/export | P2 | Manual backup/restore | `settings-manager.service.js` |

### Settings Component Structure
```
src/components/settings/
├── settings_page.tsx           # Main settings page
├── exchange_settings.tsx       # API credentials section
├── trading_settings.tsx        # Order size/leverage section
├── keyboard_settings.tsx       # Hotkey configuration
├── chart_settings.tsx          # Chart preferences
├── news_settings.tsx           # News filtering
├── ui_settings.tsx             # UI preferences
└── settings_sync.tsx           # Backup/restore controls
```

---

## 2.3 Terminal (Main App)

### 2.3.1 Trading Features

| Feature | Priority | Description | v1 File Reference |
|---------|----------|-------------|-------------------|
| **Order Management** |
| Market orders | P0 | Execute at market price | `orders.service.js` |
| Limit orders | P0 | Execute at specific price | `orders.service.js` |
| Stop-loss orders | P0 | Protective stop orders | `orders.service.js` |
| Take-profit orders | P0 | Profit target orders | `orders.service.js` |
| Cancel single order | P0 | Cancel specific order | `orders.service.js` |
| Cancel all orders | P0 | Bulk cancel | `orders.service.js` |
| Order status tracking | P0 | Real-time order updates | `orders.service.js` |
| Order history | P1 | View past orders | `orders.service.js` |
| Order retry logic | P1 | Exponential backoff | `orders.service.js` |
| Post-only orders | P2 | Maker-only orders | `orders.service.js` |
| **Position Management** |
| View open positions | P0 | Real-time position list | `positions.service.js` |
| Close position | P0 | Market close | `positions.service.js` |
| Position P&L display | P0 | Unrealized profit/loss | `positions.service.js` |
| Liquidation price | P0 | Show liq price | `positions.service.js` |
| Entry price display | P0 | Show avg entry | `positions.service.js` |
| Privacy mode | P1 | Hide amounts | `positions.service.js` |
| Hedge mode support | P1 | Long/short positions | `positions.service.js` |
| **Wallet/Balance** |
| Account balance | P0 | Show USDT balance | `wallet.service.js` |
| Multi-exchange balance | P1 | Aggregate balances | `wallet.service.js` |
| Dynamic sizing | P1 | Size based on market cap | `wallet.service.js` |
| **P&L Tools** |
| P&L calculation | P0 | Calculate position P&L | `pnl.service.js` |
| P&L preview modal | P2 | Visual P&L card | `pnl.service.js` |
| QR code generation | P3 | Share P&L | `pnl.service.js` |
| **Trade History** |
| Closed trade log | P1 | View past trades | `history.service.js` |
| Trade logging to server | P1 | Analytics tracking | `history.service.js` |

### 2.3.2 Chart Features

| Feature | Priority | Description | v1 File Reference |
|---------|----------|-------------|-------------------|
| **Core Chart** |
| Candlestick display | P0 | OHLCV chart | `chart-instance.js` |
| Real-time updates | P0 | Live price updates | `chart-instance.js` |
| Volume histogram | P0 | Volume bars below chart | `chart-instance.js` |
| Multiple timeframes | P0 | 1m to 1M | `chart-instance.js` |
| Timeframe switching | P0 | Change intervals | `chart-instance.js` |
| **Multi-Chart** |
| Up to 4 charts | P1 | Split view | `chart-manager.js` |
| Active chart switching | P1 | Select focused chart | `chart-manager.js` |
| **Price Lines** |
| Entry price line | P0 | Show position entry | `chart.service.js` |
| Liquidation line | P0 | Show liq price | `chart.service.js` |
| Order lines | P1 | Show pending orders | `chart.service.js` |
| **Drawing Tools** |
| Line drawing | P2 | Trend lines | `drawing-tools.service.js` |
| Rectangle drawing | P2 | Support/resistance zones | `drawing-tools.service.js` |
| Shape selection/delete | P2 | Edit drawings | `drawing-tools.service.js` |
| **Measurement** |
| Price/time measurement | P2 | Ruler tool | `measurement.service.js` |
| **Mini Charts** |
| Hover preview charts | P2 | Quick price view | `minichart.service.js` |

### 2.3.3 News Features

| Feature | Priority | Description | v1 File Reference |
|---------|----------|-------------|-------------------|
| **News Sources** |
| Tree (Twitter/X) | P0 | Twitter feed | `news-stream.service.js` |
| Phoenix | P0 | Phoenix news | `news-stream.service.js` |
| TFS (247 Terminal) | P0 | Internal feed | `news-stream.service.js` |
| Synoptic | P1 | Synoptic feed | `news-stream.service.js` |
| **News Display** |
| Real-time streaming | P0 | Live news updates | `news-websocket.service.js` |
| Virtual scrolling | P0 | Performance for long lists | `news-scroller.component.js` |
| Source filtering | P0 | Show/hide sources | `news-scroller.component.js` |
| Search functionality | P1 | Search news | `news-scroller.component.js` |
| News freezing/pause | P1 | Stop updates temporarily | `news-scroller.component.js` |
| **News Rendering** |
| Text formatting | P0 | HTML rendering | `news-render.service.js` |
| Link detection | P0 | Clickable links | `news-render.service.js` |
| Keyword highlighting | P0 | Highlight critical terms | `news-render.service.js` |
| Directional highlighting | P1 | Buy/sell indicators | `news-render.service.js` |
| Coin detection | P1 | Identify mentioned coins | `news-render.service.js` |
| Image display | P1 | Show embedded images | `news-render.service.js` |
| Timestamp display | P0 | Relative times | `news-render.service.js` |
| **News Processing** |
| Deduplication | P1 | Remove duplicate news | `news-deduplication.util.js` |
| Blacklist filtering | P1 | Block sources/keywords | `news-deduplication.util.js` |
| **Advanced** |
| Translation | P2 | Auto-translate | `translate.service.js` |
| OCR for images | P3 | Text from screenshots | `ocr.service.js` |
| DEX token detection | P2 | Identify contract addresses | `dex-tokens.service.js` |
| Preset execution | P2 | One-click trade from news | `news-render.service.js` |

### 2.3.4 Chat Features

| Feature | Priority | Description | v1 File Reference |
|---------|----------|-------------|-------------------|
| WebSocket connection | P1 | Real-time chat | `chat-websocket.module.js` |
| Message display | P1 | Show chat messages | `chat-ui.module.js` |
| Message input | P1 | Send messages | `chat-ui.module.js` |
| User list | P2 | Online users | `chat-ui.module.js` |
| Image upload | P2 | Share images | `chat-upload.module.js` |
| User count | P2 | Show online count | `chat-websocket.module.js` |
| Rate limit handling | P1 | Handle 4008 errors | `chat-websocket.module.js` |

### 2.3.5 Exchange Integration

| Feature | Priority | Description | v1 File Reference |
|---------|----------|-------------|-------------------|
| **Supported Exchanges** |
| Binance | P0 | Full trading support | `exchange.worker.js` |
| Bybit | P0 | Full trading support | `exchange.worker.js` |
| Hyperliquid | P0 | Full trading support | `exchange.worker.js` |
| Blofin | P2 | Trading support | `exchange.worker.js` |
| **Data Streams** |
| Real-time tickers | P0 | Live prices | `tickers.service.js` |
| Bid/ask updates | P0 | Order book top | `tickers.service.js` |
| Candle streaming | P0 | Chart data | `charts.js` |
| Position updates | P0 | Position changes | `trading.js` |
| Order updates | P0 | Order status | `trading.js` |
| Balance updates | P0 | Wallet changes | `trading.js` |
| Funding rates | P2 | Show funding | `tickers.service.js` |
| **Market Data** |
| Symbol info cache | P0 | Precision, limits | `markets.js` |
| Trading pair list | P0 | Available symbols | `symbols.js` |
| Market cap data | P2 | FMP API integration | `tickers.service.js` |

### 2.3.6 UI Components

| Feature | Priority | Description | v1 File Reference |
|---------|----------|-------------|-------------------|
| **Notifications** |
| Toast messages | P0 | In-app notifications | `ui-helpers.service.js` |
| Desktop notifications | P1 | Browser notifications | `ui-helpers.service.js` |
| Sound alerts | P1 | Audio notifications | `sound.service.js` |
| Ntfy.sh push | P2 | External push | `ui-helpers.service.js` |
| **Modals** |
| Settings modal | P0 | Quick settings access | `settings-ui.component.js` |
| P&L preview modal | P2 | P&L card display | `pnl.service.js` |
| Builder approval modal | P2 | Hyperliquid specific | UI component |
| **Search** |
| Ticker search | P0 | Find trading pairs | `ticker-search.service.js` |
| Exchange search | P1 | Switch exchanges | `exchange-search.service.js` |
| Keyboard navigation | P0 | Arrow keys + enter | Search components |
| **Layout** |
| Dashboard grid | P0 | Widget arrangement | `layout-manager.module.js` |
| Widget toggle | P1 | Show/hide panels | `layout-manager.module.js` |
| Responsive layout | P1 | Mobile support | `layout-manager.module.js` |
| Layout persistence | P1 | Remember arrangement | `layout-manager.module.js` |
| **Status Display** |
| Connection status | P0 | Exchange/news status | `terminal-ui.service.js` |
| Latency display | P1 | Show delays | `terminal-ui.service.js` |
| Current time (UTC/local) | P1 | Time display | `terminal-ui.service.js` |

### 2.3.7 Keyboard Shortcuts

| Shortcut | Priority | Action | Default Key |
|----------|----------|--------|-------------|
| Buy Small | P0 | Place small buy | B |
| Buy Medium | P0 | Place medium buy | B + Shift |
| Buy Large | P0 | Place large buy | B + Ctrl |
| Buy XL | P0 | Place XL buy | B + Ctrl+Shift |
| Sell Small | P0 | Place small sell | S |
| Sell Medium | P0 | Place medium sell | S + Shift |
| Sell Large | P0 | Place large sell | S + Ctrl |
| Sell XL | P0 | Place XL sell | S + Ctrl+Shift |
| Nuke | P0 | Close all positions | N |
| Pause/Resume | P1 | Toggle pause | Ctrl |
| Search | P1 | Open ticker search | / |
| Close modal | P0 | Close dialogs | Escape |

---

## 2.4 Services Layer

| Service | Priority | Description |
|---------|----------|-------------|
| `auth.service.ts` | P0 | Authentication & license validation |
| `order.service.ts` | P0 | Order placement & management |
| `position.service.ts` | P0 | Position tracking |
| `wallet.service.ts` | P0 | Balance management |
| `ticker.service.ts` | P0 | Price data management |
| `chart_data.service.ts` | P0 | Candle data management |
| `news_stream.service.ts` | P0 | News WebSocket handling |
| `settings.service.ts` | P0 | Settings management |
| `api.client.ts` | P0 | Backend API client |
| `notification.service.ts` | P1 | Toast/desktop notifications |
| `sound.service.ts` | P1 | Audio alerts |
| `storage.service.ts` | P0 | IndexedDB/localStorage |
| `encryption.service.ts` | P0 | AES-256-GCM for settings |

---

## 2.5 Workers

| Worker | Priority | Description |
|--------|----------|-------------|
| `exchange.worker.ts` | P0 | Exchange API operations, WebSocket streams |
| `news.worker.ts` | P0 | News WebSocket connections |

---

## Part 3: MVP Scope Definition

### MVP Features (P0 Only)

**Authentication:**
- License validation
- Session management
- HWID tracking

**Trading:**
- Market/limit orders
- Position view & close
- Order cancel
- Balance display
- P&L display

**Chart:**
- Candlestick chart
- Real-time updates
- Volume
- Timeframe switching
- Entry/liquidation lines

**News:**
- Real-time streaming (Tree, Phoenix, TFS)
- Basic rendering
- Keyword highlighting
- Virtual scrolling

**UI:**
- Toast notifications
- Ticker search
- Dashboard layout
- Connection status

**Keyboard:**
- Buy/sell shortcuts
- Nuke shortcut
- Search shortcut

**Exchanges:**
- Binance
- Bybit
- Hyperliquid

---

## Part 4: Recommended Implementation Order

### Phase 1: Foundation
1. Project setup (this document)
2. Type definitions
3. Basic routing (login → terminal)
4. Auth service + login page
5. Storage service (IndexedDB)
6. API client

### Phase 2: Core Data
1. Exchange worker (TypeScript port)
2. Ticker service + store
3. WebSocket connection management
4. Basic terminal layout

### Phase 3: Trading
1. Position service + store
2. Order service + store
3. Wallet service
4. Trading UI components

### Phase 4: Chart
1. Lightweight Charts wrapper
2. Candle data service
3. Real-time updates
4. Price lines (entry, liquidation)

### Phase 5: News
1. News WebSocket worker
2. News stream service
3. News rendering
4. News scroller component

### Phase 6: Settings
1. Settings service
2. Settings page
3. Exchange credentials
4. Keyboard shortcuts
5. Server sync

### Phase 7: Polish
1. Keyboard shortcut system
2. Notifications (toast, desktop, sound)
3. Chat (if time permits)
4. Drawing tools (if time permits)
5. Testing & bug fixes

---

## Part 5: File Checklist (v2 Full Paths)

**Base Path:** `/Users/matthewkriel/Documents/247terminal/247-terminal-v2`

### Types (create first)
- [ ] `/Users/matthewkriel/Documents/247terminal/247-terminal-v2/src/types/trading.types.ts`
- [ ] `/Users/matthewkriel/Documents/247terminal/247-terminal-v2/src/types/market.types.ts`
- [ ] `/Users/matthewkriel/Documents/247terminal/247-terminal-v2/src/types/exchange.types.ts`
- [ ] `/Users/matthewkriel/Documents/247terminal/247-terminal-v2/src/types/news.types.ts`
- [ ] `/Users/matthewkriel/Documents/247terminal/247-terminal-v2/src/types/websocket.types.ts`
- [ ] `/Users/matthewkriel/Documents/247terminal/247-terminal-v2/src/types/api.types.ts`
- [ ] `/Users/matthewkriel/Documents/247terminal/247-terminal-v2/src/types/settings.types.ts`

### Stores
- [ ] `/Users/matthewkriel/Documents/247terminal/247-terminal-v2/src/stores/auth.store.ts`
- [ ] `/Users/matthewkriel/Documents/247terminal/247-terminal-v2/src/stores/trading.store.ts`
- [ ] `/Users/matthewkriel/Documents/247terminal/247-terminal-v2/src/stores/ticker.store.ts`
- [ ] `/Users/matthewkriel/Documents/247terminal/247-terminal-v2/src/stores/news.store.ts`
- [ ] `/Users/matthewkriel/Documents/247terminal/247-terminal-v2/src/stores/settings.store.ts`
- [ ] `/Users/matthewkriel/Documents/247terminal/247-terminal-v2/src/stores/ui.store.ts`

### Services - Auth
- [ ] `/Users/matthewkriel/Documents/247terminal/247-terminal-v2/src/services/auth/auth.service.ts`
- [ ] `/Users/matthewkriel/Documents/247terminal/247-terminal-v2/src/services/auth/hwid.service.ts`

### Services - Trading
- [ ] `/Users/matthewkriel/Documents/247terminal/247-terminal-v2/src/services/trading/order.service.ts`
- [ ] `/Users/matthewkriel/Documents/247terminal/247-terminal-v2/src/services/trading/position.service.ts`
- [ ] `/Users/matthewkriel/Documents/247terminal/247-terminal-v2/src/services/trading/wallet.service.ts`

### Services - Exchange
- [ ] `/Users/matthewkriel/Documents/247terminal/247-terminal-v2/src/services/exchange/exchange.service.ts`
- [ ] `/Users/matthewkriel/Documents/247terminal/247-terminal-v2/src/services/exchange/binance.adapter.ts`
- [ ] `/Users/matthewkriel/Documents/247terminal/247-terminal-v2/src/services/exchange/bybit.adapter.ts`
- [ ] `/Users/matthewkriel/Documents/247terminal/247-terminal-v2/src/services/exchange/hyperliquid.adapter.ts`

### Services - News
- [ ] `/Users/matthewkriel/Documents/247terminal/247-terminal-v2/src/services/news/news_stream.service.ts`

### Services - Chat
- [ ] `/Users/matthewkriel/Documents/247terminal/247-terminal-v2/src/services/chat/chat.service.ts`
- [ ] `/Users/matthewkriel/Documents/247terminal/247-terminal-v2/src/services/chat/chat_websocket.service.ts`

### Services - History
- [ ] `/Users/matthewkriel/Documents/247terminal/247-terminal-v2/src/services/history/trade_history.service.ts`
- [ ] `/Users/matthewkriel/Documents/247terminal/247-terminal-v2/src/services/history/position_history.service.ts`

### Services - Settings
- [ ] `/Users/matthewkriel/Documents/247terminal/247-terminal-v2/src/services/settings/settings.service.ts`
- [ ] `/Users/matthewkriel/Documents/247terminal/247-terminal-v2/src/services/settings/encryption.service.ts`

### Services - API & Storage
- [ ] `/Users/matthewkriel/Documents/247terminal/247-terminal-v2/src/services/api/api.client.ts`
- [ ] `/Users/matthewkriel/Documents/247terminal/247-terminal-v2/src/services/storage/storage.service.ts`

### Services - Notification
- [ ] `/Users/matthewkriel/Documents/247terminal/247-terminal-v2/src/services/notification/notification.service.ts`
- [ ] `/Users/matthewkriel/Documents/247terminal/247-terminal-v2/src/services/notification/sound.service.ts`

### Workers
- [ ] `/Users/matthewkriel/Documents/247terminal/247-terminal-v2/src/workers/exchange.worker.ts`
- [ ] `/Users/matthewkriel/Documents/247terminal/247-terminal-v2/src/workers/news.worker.ts`

### Components - Auth
- [ ] `/Users/matthewkriel/Documents/247terminal/247-terminal-v2/src/components/auth/login_page.tsx`
- [ ] `/Users/matthewkriel/Documents/247terminal/247-terminal-v2/src/components/auth/license_input.tsx`

### Components - Layout
- [ ] `/Users/matthewkriel/Documents/247terminal/247-terminal-v2/src/components/layout/app_layout.tsx`
- [ ] `/Users/matthewkriel/Documents/247terminal/247-terminal-v2/src/components/layout/terminal_layout.tsx`
- [ ] `/Users/matthewkriel/Documents/247terminal/247-terminal-v2/src/components/layout/header.tsx`
- [ ] `/Users/matthewkriel/Documents/247terminal/247-terminal-v2/src/components/layout/sidebar.tsx`

### Components - Trading
- [ ] `/Users/matthewkriel/Documents/247terminal/247-terminal-v2/src/components/trading/order_panel.tsx`
- [ ] `/Users/matthewkriel/Documents/247terminal/247-terminal-v2/src/components/trading/position_list.tsx`
- [ ] `/Users/matthewkriel/Documents/247terminal/247-terminal-v2/src/components/trading/position_row.tsx`
- [ ] `/Users/matthewkriel/Documents/247terminal/247-terminal-v2/src/components/trading/order_list.tsx`
- [ ] `/Users/matthewkriel/Documents/247terminal/247-terminal-v2/src/components/trading/wallet_display.tsx`

### Components - Chart
- [ ] `/Users/matthewkriel/Documents/247terminal/247-terminal-v2/src/components/chart/trading_chart.tsx`
- [ ] `/Users/matthewkriel/Documents/247terminal/247-terminal-v2/src/components/chart/chart_controls.tsx`
- [ ] `/Users/matthewkriel/Documents/247terminal/247-terminal-v2/src/components/chart/timeframe_selector.tsx`

### Components - News
- [ ] `/Users/matthewkriel/Documents/247terminal/247-terminal-v2/src/components/news/news_feed.tsx`
- [ ] `/Users/matthewkriel/Documents/247terminal/247-terminal-v2/src/components/news/news_item.tsx`
- [ ] `/Users/matthewkriel/Documents/247terminal/247-terminal-v2/src/components/news/news_filters.tsx`

### Components - Settings
- [ ] `/Users/matthewkriel/Documents/247terminal/247-terminal-v2/src/components/settings/settings_page.tsx`
- [ ] `/Users/matthewkriel/Documents/247terminal/247-terminal-v2/src/components/settings/exchange_settings.tsx`
- [ ] `/Users/matthewkriel/Documents/247terminal/247-terminal-v2/src/components/settings/trading_settings.tsx`
- [ ] `/Users/matthewkriel/Documents/247terminal/247-terminal-v2/src/components/settings/keyboard_settings.tsx`

### Components - Common
- [ ] `/Users/matthewkriel/Documents/247terminal/247-terminal-v2/src/components/common/theme_toggle.tsx`
- [ ] `/Users/matthewkriel/Documents/247terminal/247-terminal-v2/src/components/common/toast.tsx`
- [ ] `/Users/matthewkriel/Documents/247terminal/247-terminal-v2/src/components/common/modal.tsx`
- [ ] `/Users/matthewkriel/Documents/247terminal/247-terminal-v2/src/components/common/search_input.tsx`
- [ ] `/Users/matthewkriel/Documents/247terminal/247-terminal-v2/src/components/common/ticker_search.tsx`
- [ ] `/Users/matthewkriel/Documents/247terminal/247-terminal-v2/src/components/common/button.tsx`
- [ ] `/Users/matthewkriel/Documents/247terminal/247-terminal-v2/src/components/common/input.tsx`

### Hooks
- [ ] `/Users/matthewkriel/Documents/247terminal/247-terminal-v2/src/hooks/use_theme.ts`
- [ ] `/Users/matthewkriel/Documents/247terminal/247-terminal-v2/src/hooks/use_websocket.ts`
- [ ] `/Users/matthewkriel/Documents/247terminal/247-terminal-v2/src/hooks/use_trading.ts`
- [ ] `/Users/matthewkriel/Documents/247terminal/247-terminal-v2/src/hooks/use_chart_data.ts`
- [ ] `/Users/matthewkriel/Documents/247terminal/247-terminal-v2/src/hooks/use_keyboard_shortcuts.ts`

### Utils
- [ ] `/Users/matthewkriel/Documents/247terminal/247-terminal-v2/src/utils/formatting.ts`
- [ ] `/Users/matthewkriel/Documents/247terminal/247-terminal-v2/src/utils/validation.ts`
- [ ] `/Users/matthewkriel/Documents/247terminal/247-terminal-v2/src/utils/time.ts`
- [ ] `/Users/matthewkriel/Documents/247terminal/247-terminal-v2/src/utils/string.ts`

### Config
- [ ] `/Users/matthewkriel/Documents/247terminal/247-terminal-v2/src/config/app.config.ts`
- [ ] `/Users/matthewkriel/Documents/247terminal/247-terminal-v2/src/config/exchanges.config.ts`

### Root Config Files
- [ ] `/Users/matthewkriel/Documents/247terminal/247-terminal-v2/vite.config.ts`
- [ ] `/Users/matthewkriel/Documents/247terminal/247-terminal-v2/tsconfig.json`
- [ ] `/Users/matthewkriel/Documents/247terminal/247-terminal-v2/eslint.config.js`
- [ ] `/Users/matthewkriel/Documents/247terminal/247-terminal-v2/.prettierrc`
- [ ] `/Users/matthewkriel/Documents/247terminal/247-terminal-v2/vitest.config.ts`
- [ ] `/Users/matthewkriel/Documents/247terminal/247-terminal-v2/package.json`
- [ ] `/Users/matthewkriel/Documents/247terminal/247-terminal-v2/index.html`

**Note:** `tailwind.config.js` and `postcss.config.js` are not needed with Tailwind CSS v4 - configuration is done in `src/index.css`.

### Test Setup
- [ ] `/Users/matthewkriel/Documents/247terminal/247-terminal-v2/src/test/setup.ts`

---

## Part 6: Quick Start Commands

```bash
# After setup, verify everything works:

# Start development server
npm run dev

# Run type checking
npm run type-check

# Run linter
npm run lint

# Run tests
npm run test

# Build for production
npm run build
```
