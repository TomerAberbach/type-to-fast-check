import { test } from '@fast-check/vitest'
import typeToArb from 'type-to-fast-check'
import { expect } from 'vitest'

const arb = typeToArb<{ a: number; b: string }>()

test.prop([arb])(`the arb arbs`, ({ a, b }) => {
  expect(typeof a).toBe(`number`)
  expect(typeof b).toBe(`string`)
})
