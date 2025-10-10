import type { Arbitrary } from 'fast-check'

export type * from './meta-types.ts'

const typeToArb = <T>(): Arbitrary<T> => {
  throw new Error(
    `typeToArb<T>() should be transformed by the TypeScript transformer`,
  )
}

export default typeToArb
