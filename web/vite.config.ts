import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@shared': path.resolve(__dirname, '../shared'),
      'react': path.resolve(__dirname, '../node_modules/react'),
      'react-dom': path.resolve(__dirname, '../node_modules/react-dom'),
      'react-router-dom': path.resolve(__dirname, './node_modules/react-router-dom'),
      'react/jsx-runtime': path.resolve(__dirname, '../node_modules/react/jsx-runtime.js'),
      'react/jsx-dev-runtime': path.resolve(__dirname, '../node_modules/react/jsx-dev-runtime.js'),
    },
    dedupe: ['react', 'react-dom', 'react-router-dom'],
  },
  server: {
    port: 3000,
    open: true,
    host: '127.0.0.1',
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          // Vendor chunks for better caching
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'query-vendor': ['@tanstack/react-query'],
          'chart-vendor': ['recharts'],
          'table-vendor': ['@tanstack/react-table', '@tanstack/react-virtual'],
          'map-vendor': ['@react-google-maps/api'],
        },
      },
    },
    // Optimize chunk size
    chunkSizeWarningLimit: 1000,
    // Enable compression
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    css: true,
    alias: {
      react: path.resolve(__dirname, '../node_modules/react'),
      'react-dom': path.resolve(__dirname, '../node_modules/react-dom'),
      'react-router-dom': path.resolve(__dirname, './node_modules/react-router-dom'),
      'react/jsx-runtime': path.resolve(__dirname, '../node_modules/react/jsx-runtime.js'),
      'react/jsx-dev-runtime': path.resolve(__dirname, '../node_modules/react/jsx-dev-runtime.js'),
    },
    server: {
      deps: {
        inline: [
          'react',
          'react-dom',
          'react-router-dom',
          '@tanstack/react-query',
          'zustand',
        ],
      },
    },
  },
});
