import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';
import tailwindcss from '@tailwindcss/vite';
import { nodePolyfills } from 'vite-plugin-node-polyfills';
import { resolve } from 'path';

const nodePolyfillsConfig = {
    globals: {
        Buffer: true,
        global: true,
        process: true,
    },
    protocolImports: true,
    overrides: {
        net: resolve(__dirname, './src/workers/stubs/net.ts'),
        tls: resolve(__dirname, './src/workers/stubs/empty.ts'),
        dns: resolve(__dirname, './src/workers/stubs/empty.ts'),
    },
};

export default defineConfig({
    plugins: [preact(), tailwindcss(), nodePolyfills(nodePolyfillsConfig)],
    resolve: {
        alias: {
            '@': resolve(__dirname, './src'),
            'socks-proxy-agent': resolve(__dirname, './src/workers/stubs/empty.ts'),
            'https-proxy-agent': resolve(__dirname, './src/workers/stubs/empty.ts'),
            'http-proxy-agent': resolve(__dirname, './src/workers/stubs/empty.ts'),
            // Direct CCXT imports for tree-shaking (only bundle used exchanges)
            // REST API versions (for validators)
            'ccxt/js/src/binanceusdm.js': resolve(__dirname, './node_modules/ccxt/js/src/binanceusdm.js'),
            'ccxt/js/src/blofin.js': resolve(__dirname, './node_modules/ccxt/js/src/blofin.js'),
            'ccxt/js/src/bybit.js': resolve(__dirname, './node_modules/ccxt/js/src/bybit.js'),
            'ccxt/js/src/hyperliquid.js': resolve(__dirname, './node_modules/ccxt/js/src/hyperliquid.js'),
            // Pro/WebSocket versions (for worker)
            'ccxt/js/src/pro/binanceusdm.js': resolve(__dirname, './node_modules/ccxt/js/src/pro/binanceusdm.js'),
            'ccxt/js/src/pro/blofin.js': resolve(__dirname, './node_modules/ccxt/js/src/pro/blofin.js'),
            'ccxt/js/src/pro/bybit.js': resolve(__dirname, './node_modules/ccxt/js/src/pro/bybit.js'),
            'ccxt/js/src/pro/hyperliquid.js': resolve(__dirname, './node_modules/ccxt/js/src/pro/hyperliquid.js'),
        },
    },
    server: {
        port: 3000,
        host: true,
    },
    build: {
        target: 'es2020',
        sourcemap: true,
        rollupOptions: {
            onwarn(warning, warn) {
                if (warning.code === 'CIRCULAR_DEPENDENCY' && warning.message.includes('ccxt')) {
                    return;
                }
                warn(warning);
            },
        },
    },
    worker: {
        format: 'es',
        plugins: () => [nodePolyfills(nodePolyfillsConfig)],
    },
    optimizeDeps: {
        esbuildOptions: {
            define: {
                global: 'globalThis',
            },
        },
    },
    define: {
        'process.env': {},
        global: 'globalThis',
    },
});
