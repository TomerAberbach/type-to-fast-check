import { fc, test } from '@fast-check/vitest'
import { expect } from 'vitest'
import type {
  AnythingArbitrary,
  Arbitrary,
  BigIntArbitrary,
  BooleanArbitrary,
  ConstantArbitrary,
  ConstantFromArbitrary,
  DoubleArbitrary,
  ObjectArbitrary,
  OneofArbitrary,
  OptionArbitrary,
  RecordArbitrary,
  StringArbitrary,
  SymbolArbitrary,
} from './arbitrary.ts'
import {
  anythingArbitrary,
  bigIntArbitrary,
  booleanArbitrary,
  constantArbitrary,
  constantFromArbitrary,
  doubleArbitrary,
  objectArbitrary,
  oneofArbitrary,
  optionArbitrary,
  recordArbitrary,
  stringArbitrary,
  symbolArbitrary,
} from './arbitrary.ts'
import normalizeArbitrary from './normalize.ts'

const depthIdentifier = fc.createDepthIdentifier()
const arbitraryArb = fc.letrec<{
  arbitrary: Arbitrary
  constant: ConstantArbitrary
  option: OptionArbitrary
  boolean: BooleanArbitrary
  double: DoubleArbitrary
  bigInt: BigIntArbitrary
  string: StringArbitrary
  symbol: SymbolArbitrary
  record: RecordArbitrary
  object: ObjectArbitrary
  constantFrom: ConstantFromArbitrary
  oneof: OneofArbitrary
  anything: AnythingArbitrary
}>(tie => ({
  arbitrary: fc.oneof(
    { depthIdentifier },
    tie(`constant`),
    tie(`option`),
    tie(`boolean`),
    tie(`double`),
    tie(`string`),
    tie(`symbol`),
    tie(`record`),
    tie(`object`),
    tie(`constantFrom`),
    tie(`oneof`),
    tie(`anything`),
  ),
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
  symbol: fc.constant(symbolArbitrary()),
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
