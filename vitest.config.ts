import { defineConfig } from 'vitest/config'
import tsconfigPaths from 'vite-tsconfig-paths'
import { fileURLToPath } from 'node:url'

const wixSecretsTestStub = fileURLToPath(new URL('./src/backend/__tests__/mocks/wix-secrets-backend.ts', import.meta.url))

export default defineConfig({
  resolve: {
    // Wix runtime modules are provided by the hosted platform, not npm.
    // Use an absolute test-only alias so Vitest can resolve the module before vi.mock replaces it.
    alias: {
      'wix-secrets-backend': wixSecretsTestStub,
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
