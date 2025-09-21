import { defaultExclude, defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: `node`,
    setupFiles: [`vitest.setup.ts`],
    coverage: {
      include: [`src`],
    },
    exclude: [...defaultExclude, `.rollup.cache`],
    watchTriggerPatterns: [
      {
        pattern: /\/src\/fixtures\/test-cases.ts$/u,
        testsToRun: () => `./src/index.test.ts`,
      },
    ],
  },
})
