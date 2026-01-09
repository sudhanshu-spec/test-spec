/**
 * @fileoverview Vitest configuration for frontend testing infrastructure
 * @see Section 0.5.3 and Section 0.9.2 of Agent Action Plan
 */
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Enable global test functions (describe, it, expect)
    globals: true,
    
    // DOM environment for component testing
    environment: 'jsdom',
    
    // Global test setup file
    setupFiles: ['./src/__tests__/setup.ts'],
    
    // Test file patterns
    include: ['src/**/*.test.{ts,tsx}'],
    exclude: ['node_modules', 'dist'],
    
    // Coverage configuration using V8
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      reportsDirectory: 'coverage',
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/**/*.test.{ts,tsx}',
        'src/__tests__/**',
        'src/vite-env.d.ts'
      ],
      thresholds: {
        branches: 80,
        functions: 85,
        lines: 85,
        statements: 85
      }
    },
    
    // Test timeout (match jest.config.js)
    testTimeout: 10000,
    
    // Reporters
    reporters: ['default'],
    
    // Parallel execution
    pool: 'threads',
    
    // Test isolation
    isolate: true
  },
  
  // Resolve aliases for test imports
  resolve: {
    alias: {
      '@/': './src/'
    }
  }
});
