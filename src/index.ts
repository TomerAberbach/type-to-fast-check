import type { Arbitrary } from 'fast-check'

const typeToArb = <T>(): Arbitrary<T> => {
  throw new Error(
    `typeToArb<T>() should be transformed by the TypeScript transformer`,
  )
}

export default typeToArb
