import { defaultExclude, defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: `jsdom`,
    setupFiles: [`vitest.setup.ts`],
    coverage: {
      include: [`src`],
    },
    exclude: [...defaultExclude, `.rollup.cache`],
  },
})
