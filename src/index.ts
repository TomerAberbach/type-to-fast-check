// The code in this file always gets replaced by the transformer.
/* c8 ignore start */

import type { Arbitrary } from 'fast-check'

export type * from './meta-types.ts'

const typeToArb = <T>(): Arbitrary<T> => {
  throw new Error(
    [
      `typeToArb<T>() should have been transformed by the TypeScript transformer`,
      `You may have missed some configuration: https://github.com/TomerAberbach/type-to-fast-check#configure`,
    ].join(`\n`),
  )
}

export default typeToArb
