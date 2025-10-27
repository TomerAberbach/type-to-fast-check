import { fc, test } from '@fast-check/vitest'
import { expect } from 'vitest'
import type { Arbitrary } from './arbitrary.ts'
import {
  anythingArbitrary,
  arrayArbitrary,
  assignArbitrary,
  bigIntArbitrary,
  booleanArbitrary,
  constantArbitrary,
  constantFromArbitrary,
  dictionaryArbitrary,
  doubleArbitrary,
  funcArbitrary,
  integerArbitrary,
  mapStringArbitrary,
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
  Omit<
    {
      [Type in Arbitrary[`type`]]: FilterByType<Arbitrary, Type>
    },
    `mutable` | `tie` | `meta`
  > & { arbitrary: Arbitrary }
>(tie => ({
  arbitrary: fc.oneof(
    { depthIdentifier },
    tie(`never`),
    tie(`constant`),
    tie(`option`),
    tie(`boolean`),
    tie(`integer`),
    tie(`double`),
    tie(`bigInt`),
    tie(`string`),
    tie(`template`),
    tie(`mapString`),
    tie(`symbol`),
    tie(`tuple`),
    tie(`array`),
    tie(`record`),
    tie(`dictionary`),
    tie(`object`),
    tie(`func`),
    tie(`constantFrom`),
    tie(`oneof`),
    tie(`assign`),
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
  integer: fc.constant(integerArbitrary()),
  double: fc.constant(doubleArbitrary()),
  bigInt: fc.constant(bigIntArbitrary()),
  string: fc.constant(stringArbitrary()),
  template: fc
    .array(fc.oneof({ depthIdentifier }, fc.string(), tie(`arbitrary`)), {
      depthIdentifier,
    })
    .map(templateArbitrary),
  mapString: fc
    .record(
      {
        arbitrary: tie(`arbitrary`),
        operation: fc.constantFrom(
          `uppercase`,
          `lowercase`,
          `capitalize`,
          `uncapitalize`,
        ),
      },
      { noNullPrototype: true },
    )
    .map(mapStringArbitrary),
  symbol: fc.constant(symbolArbitrary()),
  tuple: fc
    .array(
      fc.oneof(
        fc.record(
          { arbitrary: tie(`arbitrary`), rest: fc.constant(false) },
          { noNullPrototype: true },
        ),
        fc.record(
          { arbitrary: tie(`array`), rest: fc.constant(true) },
          { noNullPrototype: true },
        ),
      ),
      { minLength: 1, depthIdentifier },
    )
    .map(tupleArbitrary),
  array: tie(`arbitrary`).map(arrayArbitrary),
  record: fc
    .uniqueArray(
      fc.tuple(
        fc.string(),
        fc.record(
          { required: fc.boolean(), arbitrary: tie(`arbitrary`) },
          { noNullPrototype: true },
        ),
      ),
      { selector: ([name]) => name, depthIdentifier },
    )
    .map(entries => recordArbitrary(new Map(entries))),
  dictionary: fc
    .record(
      { key: tie(`arbitrary`), value: tie(`arbitrary`) },
      { noNullPrototype: true },
    )
    .map(dictionaryArbitrary),
  object: fc.constant(objectArbitrary()),
  func: tie(`arbitrary`).map(funcArbitrary),
  constantFrom: fc
    .array(fc.jsonValue(), { minLength: 1, depthIdentifier })
    .map(constantFromArbitrary),
  oneof: fc
    .array(tie(`arbitrary`), { minLength: 1, depthIdentifier })
    .map(oneofArbitrary),
  assign: fc.array(tie(`arbitrary`), { depthIdentifier }).map(assignArbitrary),
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
