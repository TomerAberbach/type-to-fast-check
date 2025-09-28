import { fc, test } from '@fast-check/vitest'
import { expect } from 'vitest'
import type { Arbitrary } from './arbitrary.ts'
import {
  anythingArbitrary,
  arrayArbitrary,
  bigIntArbitrary,
  booleanArbitrary,
  constantArbitrary,
  constantFromArbitrary,
  doubleArbitrary,
  funcArbitrary,
  neverArbitrary,
  objectArbitrary,
  oneofArbitrary,
  optionArbitrary,
  recordArbitrary,
  stringArbitrary,
  symbolArbitrary,
  templateArbitrary,
  tupleArbitrary,
} from './arbitrary.ts'
import normalizeArbitrary from './normalize.ts'

type FilterByType<T, K> = T extends { type: K } ? T : never

const depthIdentifier = fc.createDepthIdentifier()
const arbitraryArb = fc.letrec<
  {
    [Type in Arbitrary[`type`]]: FilterByType<Arbitrary, Type>
  } & {
    arbitrary: Arbitrary
  }
>(tie => ({
  arbitrary: fc.oneof(
    { depthIdentifier },
    tie(`never`),
    tie(`constant`),
    tie(`option`),
    tie(`boolean`),
    tie(`double`),
    tie(`bigInt`),
    tie(`string`),
    tie(`template`),
    tie(`symbol`),
    tie(`array`),
    tie(`tuple`),
    tie(`record`),
    tie(`object`),
    tie(`func`),
    tie(`constantFrom`),
    tie(`oneof`),
    tie(`anything`),
  ),
  never: fc.constant(neverArbitrary()),
  constant: fc.jsonValue().map(constantArbitrary),
  option: fc
    .record({
      arbitrary: tie(`arbitrary`),
      nil: fc.constantFrom(undefined, null),
    })
    .map(optionArbitrary),
  boolean: fc.constant(booleanArbitrary()),
  double: fc.constant(doubleArbitrary()),
  bigInt: fc.constant(bigIntArbitrary()),
  string: fc.constant(stringArbitrary()),
  template: fc
    .array(fc.oneof({ depthIdentifier }, fc.string(), tie(`arbitrary`)), {
      depthIdentifier,
    })
    .map(templateArbitrary),
  symbol: fc.constant(symbolArbitrary()),
  array: tie(`arbitrary`).map(arrayArbitrary),
  tuple: fc
    .array(tie(`arbitrary`), { minLength: 1, depthIdentifier })
    .map(tupleArbitrary),
  record: fc
    .uniqueArray(
      fc.tuple(
        fc.string(),
        fc.record(
          { required: fc.boolean(), arbitrary: tie(`arbitrary`) },
          { noNullPrototype: true },
        ),
      ),
      { selector: ([name]) => name },
    )
    .map(entries => recordArbitrary(new Map(entries))),
  object: fc.constant(objectArbitrary()),
  func: tie(`arbitrary`).map(funcArbitrary),
  constantFrom: fc
    .array(fc.jsonValue(), { minLength: 1 })
    .map(constantFromArbitrary),
  oneof: fc
    .array(tie(`arbitrary`), { minLength: 1, depthIdentifier })
    .map(oneofArbitrary),
  anything: fc.constant(anythingArbitrary()),
})).arbitrary

test.prop([arbitraryArb])(`normalizeArbitrary does not mutate`, arbitrary => {
  const arbitraryCopy = structuredClone(arbitrary)

  normalizeArbitrary(arbitrary)

  expect(arbitrary).toStrictEqual(arbitraryCopy)
})

test.prop([arbitraryArb])(`normalizeArbitrary is idempotent`, arbitrary => {
  const normalizedArbitrary = normalizeArbitrary(arbitrary)

  const doubleNormalizedArbitrary = normalizeArbitrary(normalizedArbitrary)

  expect(doubleNormalizedArbitrary).toStrictEqual(normalizedArbitrary)
})
