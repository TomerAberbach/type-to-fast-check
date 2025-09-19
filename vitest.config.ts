import typescript from '@rollup/plugin-typescript'
import { defaultExclude, defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: `jsdom`,
    setupFiles: [`vitest.setup.ts`],
    coverage: {
      include: [`src`],
    },
    exclude: [...defaultExclude, `.rollup.cache`],
    watch: false,
  },
  plugins: [
    typescript({
      tsconfig: `./tsconfig.json`,
      compilerOptions: {
        plugins: [
          {
            transform: `./dist/transformer.js`,
            type: `program`,
          },
        ],
      },
    }),
  ],
})
