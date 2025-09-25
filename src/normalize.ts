import { SameValueSet } from 'svkc'
import {
  arrayArbitrary,
  booleanArbitrary,
  constantArbitrary,
  constantFromArbitrary,
  funcArbitrary,
  neverArbitrary,
  oneofArbitrary,
  optionArbitrary,
  recordArbitrary,
  tupleArbitrary,
} from './arbitrary.ts'
import type {
  Arbitrary,
  ArrayArbitrary,
  ConstantFromArbitrary,
  FuncArbitrary,
  OneofArbitrary,
  OptionArbitrary,
  RecordArbitrary,
  TupleArbitrary,
} from './arbitrary.ts'
import { compareConstants } from './sort.ts'

const normalizeArbitrary = (arbitrary: Arbitrary): Arbitrary => {
  switch (arbitrary.type) {
    case `never`:
    case `constant`:
    case `boolean`:
    case `double`:
    case `bigInt`:
    case `string`:
    case `stringMatching`:
    case `symbol`:
    case `object`:
    case `anything`:
      return arbitrary
    case `option`:
      return normalizeOptionArbitrary(arbitrary)
    case `array`:
      return normalizeArrayArbitrary(arbitrary)
    case `tuple`:
      return normalizeTupleArbitrary(arbitrary)
    case `record`:
      return normalizeRecordArbitrary(arbitrary)
    case `func`:
      return normalizeFuncArbitrary(arbitrary)
    case `constantFrom`:
      return normalizeConstantFromArbitrary(arbitrary)
    case `oneof`:
      return normalizeOneofArbitrary(arbitrary)
  }
}

const normalizeOptionArbitrary = (arbitrary: OptionArbitrary): Arbitrary =>
  normalizeArbitrary(oneofArbitrary(spreadUnionArbitraries(arbitrary)))

const normalizeArrayArbitrary = (arbitrary: ArrayArbitrary): Arbitrary =>
  arrayArbitrary(normalizeArbitrary(arbitrary.items))

const normalizeTupleArbitrary = (arbitrary: TupleArbitrary): Arbitrary =>
  tupleArbitrary(arbitrary.elements.map(normalizeArbitrary))

const normalizeRecordArbitrary = (arbitrary: RecordArbitrary): Arbitrary =>
  recordArbitrary(
    new Map(
      Array.from(arbitrary.properties, ([name, { required, arbitrary }]) => [
        name,
        { required, arbitrary: normalizeArbitrary(arbitrary) },
      ]),
    ),
  )

const normalizeFuncArbitrary = (arbitrary: FuncArbitrary): Arbitrary =>
  funcArbitrary(normalizeArbitrary(arbitrary.result))

const normalizeConstantFromArbitrary = (
  arbitrary: ConstantFromArbitrary,
): Arbitrary => {
  const constants = new SameValueSet(
    arbitrary.constants.toSorted(compareConstants),
  )
  switch (constants.size) {
    case 0:
      return neverArbitrary()
    case 1:
      return constantArbitrary(constants.values().next().value)
    default:
      if (constants.has(undefined) && !constants.has(null)) {
        constants.delete(undefined)
        return optionArbitrary({
          arbitrary: normalizeArbitrary(constantFromArbitrary([...constants])),
          nil: undefined,
        })
      }

      if (constants.has(null) && !constants.has(undefined)) {
        constants.delete(null)
        return optionArbitrary({
          arbitrary: normalizeArbitrary(constantFromArbitrary([...constants])),
          nil: null,
        })
      }

      if (constants.has(false) && constants.has(true)) {
        constants.delete(false)
        constants.delete(true)
        return constants.size === 0
          ? booleanArbitrary()
          : normalizeArbitrary(
              oneofArbitrary([
                booleanArbitrary(),
                constantFromArbitrary([...constants]),
              ]),
            )
      }

      return constantFromArbitrary([...constants])
  }
}

const normalizeOneofArbitrary = (arbitrary: OneofArbitrary): Arbitrary => {
  const variants = new Set<Arbitrary>(
    arbitrary.variants.flatMap(variant =>
      spreadUnionArbitraries(normalizeArbitrary(variant)),
    ),
  )

  const falseConstant = constantArbitrary(false)
  const trueConstant = constantArbitrary(true)
  if (variants.has(falseConstant) && variants.has(trueConstant)) {
    variants.add(booleanArbitrary())
  }
  if (variants.has(booleanArbitrary())) {
    // The set of possible boolean values is so small that there's no point in
    // biasing a union towards `true` or `false`.
    variants.delete(falseConstant)
    variants.delete(trueConstant)
  }

  switch (variants.size) {
    case 0:
      return neverArbitrary()
    case 1:
      return variants.values().next().value!
    default:
      break
  }

  const constants = new SameValueSet<unknown>()
  for (const variant of variants) {
    if (variant.type === `constant`) {
      constants.add(variant.value)
      variants.delete(variant)
    }
  }

  const undefinedConstant = constantArbitrary(undefined)
  const nullConstant = constantArbitrary(null)
  if (constants.has(undefined) && !constants.has(null)) {
    constants.delete(undefined)
    variants.add(undefinedConstant)
  } else if (constants.has(null) && !constants.has(undefined)) {
    constants.delete(null)
    variants.add(nullConstant)
  }

  if (constants.size === 1) {
    variants.add(constantArbitrary(constants.values().next().value))
  } else if (constants.size > 1) {
    const arbitrary = normalizeArbitrary(constantFromArbitrary([...constants]))
    if (variants.size === 0) {
      return arbitrary
    }
    variants.add(arbitrary)
  }

  if (variants.delete(undefinedConstant)) {
    return optionArbitrary({
      arbitrary: normalizeArbitrary(oneofArbitrary([...variants])),
      nil: undefined,
    })
  }
  if (variants.delete(nullConstant)) {
    return optionArbitrary({
      arbitrary: normalizeArbitrary(oneofArbitrary([...variants])),
      nil: null,
    })
  }

  return oneofArbitrary([...variants])
}

const spreadUnionArbitraries = (arbitrary: Arbitrary): Arbitrary[] => {
  switch (arbitrary.type) {
    case `constant`:
    case `boolean`:
    case `double`:
    case `bigInt`:
    case `string`:
    case `stringMatching`:
    case `symbol`:
    case `array`:
    case `tuple`:
    case `record`:
    case `object`:
    case `func`:
    case `anything`:
      return [arbitrary]
    case `never`:
      return []
    case `option`:
      return [
        ...spreadUnionArbitraries(arbitrary.arbitrary),
        constantArbitrary(arbitrary.nil),
      ]
    case `constantFrom`:
      return arbitrary.constants.map(constantArbitrary)
    case `oneof`:
      return arbitrary.variants.flatMap(spreadUnionArbitraries)
  }
}

export default normalizeArbitrary
