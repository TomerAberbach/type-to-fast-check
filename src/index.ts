import type { Arbitrary } from 'fast-check'

const typeToArbitrary = <T>(): Arbitrary<T> => {
  throw new Error(
    `typeToArbitrary<T>() should be transformed by the TypeScript transformer`,
  )
}

export default typeToArbitrary
