import typescript from '@rollup/plugin-typescript'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: `node`,
  },
  plugins: [typescript()],
})
