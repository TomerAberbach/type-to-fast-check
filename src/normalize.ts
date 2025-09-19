import { SameValueSet } from 'svkc'
import {
  booleanArbitrary,
  constantArbitrary,
  constantFromArbitrary,
  oneofArbitrary,
  optionArbitrary,
  recordArbitrary,
} from './arbitrary.ts'
import type {
  Arbitrary,
  ConstantFromArbitrary,
  OneofArbitrary,
  RecordArbitrary,
} from './arbitrary.ts'
import { compareConstants } from './sort.ts'

const normalizeArbitrary = (arbitrary: Arbitrary): Arbitrary => {
  switch (arbitrary.type) {
    case `constant`:
    case `boolean`:
    case `double`:
    case `bigInt`:
    case `string`:
    case `symbol`:
    case `object`:
    case `option`:
    case `anything`:
      return arbitrary
    case `record`:
      return normalizeRecordArbitrary(arbitrary)
    case `constantFrom`:
      return normalizeConstantFromArbitrary(arbitrary)
    case `oneof`:
      return normalizeOneofArbitrary(arbitrary)
  }
}

const normalizeRecordArbitrary = (arbitrary: RecordArbitrary): Arbitrary =>
  recordArbitrary(
    Object.fromEntries(
      Object.entries(arbitrary.properties).map(
        ([name, { required, arbitrary }]) => [
          name,
          { required, arbitrary: normalizeArbitrary(arbitrary) },
        ],
      ),
    ),
  )

const normalizeConstantFromArbitrary = (
  arbitrary: ConstantFromArbitrary,
): Arbitrary => {
  const constants = new SameValueSet(
    arbitrary.constants.toSorted(compareConstants),
  )
  switch (constants.size) {
    case 0:
      throw new Error(`Unexpected number of constants`)
    case 1:
      return constantArbitrary(constants.values().next().value)
    default:
      if (!constants.has(null)) {
        return constantFromArbitrary([...constants])
      }
      constants.delete(null)
      return optionArbitrary(
        normalizeArbitrary(constantFromArbitrary([...constants])),
      )
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
      throw new Error(`Unexpected number of variants`)
    case 1:
      return variants.values().next().value!
    default:
      break
  }

  const nullConstant = constantArbitrary(null)
  const constants = new SameValueSet<unknown>()
  for (const variant of variants) {
    if (variant.type === `constant` && variant !== nullConstant) {
      constants.add(variant.value)
      variants.delete(variant)
    }
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

  if (!variants.has(nullConstant)) {
    return oneofArbitrary([...variants])
  }

  variants.delete(nullConstant)
  return optionArbitrary(normalizeArbitrary(oneofArbitrary([...variants])))
}

const spreadUnionArbitraries = (arbitrary: Arbitrary): Arbitrary[] => {
  switch (arbitrary.type) {
    case `constant`:
    case `boolean`:
    case `double`:
    case `bigInt`:
    case `string`:
    case `symbol`:
    case `record`:
    case `object`:
    case `option`:
    case `anything`:
      return [arbitrary]
    case `constantFrom`:
      return arbitrary.constants.map(constantArbitrary)
    case `oneof`:
      return arbitrary.variants.flatMap(spreadUnionArbitraries)
  }
}

export default normalizeArbitrary
