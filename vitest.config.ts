import { defaultExclude, defaultInclude, defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: `node`,
    setupFiles: [`vitest.setup.ts`],
    coverage: {
      include: [`src`],
    },
    include: defaultInclude.map(include => `src/${include}`),
    exclude: [...defaultExclude, `.rollup.cache`],
    watchTriggerPatterns: [
      {
        pattern: /\/src\/fixtures\/test-cases.ts$/u,
        testsToRun: () => `./src/index.test.ts`,
      },
    ],
    testTimeout: 20_000,
    // https://github.com/vitest-dev/vitest/discussions/6511#discussioncomment-13171598
    pool: process.env.GITHUB_ACTIONS === `true` ? `threads` : undefined,
  },
})
