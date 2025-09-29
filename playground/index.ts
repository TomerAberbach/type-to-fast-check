import * as fc from 'fast-check'
import typeToArb from 'type-to-fast-check'

const arb = typeToArb<{ a: number; b: string }>()
console.log(fc.sample(arb, 10))
