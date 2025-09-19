import { bench } from 'vitest'
import typescriptFastCheck from './index.ts'

bench(`typescriptFastCheck`, () => {
  typescriptFastCheck()
})
