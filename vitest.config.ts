import { defineConfig } from 'vitest/config'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  resolve: {
    // Wix runtime modules are provided by the hosted platform, not npm.
    // This alias is test-only and allows Vitest to resolve the module before vi.mock replaces it.
    alias: {
      'wix-secrets-backend': './src/backend/__tests__/mocks/wix-secrets-backend.ts',
    },
  },
  // @ts-expect-error - vite-tsconfig-paths is not typed correctly
  plugins: [tsconfigPaths()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
  },
  esbuild: {
    target: 'node20',
  },
})