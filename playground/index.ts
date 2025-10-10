import * as fc from 'fast-check'
import type { Double } from 'type-to-fast-check'
import typeToArb from 'type-to-fast-check'

const arb = typeToArb<number & Double<{ min: 0; max: 1 }>>()
console.log(fc.sample(arb, 5))
