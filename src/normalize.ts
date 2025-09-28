import { SameValueSet } from 'svkc'
import {
  arrayArbitrary,
  booleanArbitrary,
  constantArbitrary,
  constantFromArbitrary,
  doubleArbitrary,
  funcArbitrary,
  neverArbitrary,
  oneofArbitrary,
  optionArbitrary,
  recordArbitrary,
  templateArbitrary,
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
  TemplateArbitrary,
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
    case `symbol`:
    case `object`:
    case `anything`:
      return arbitrary
    case `option`:
      return normalizeOptionArbitrary(arbitrary)
    case `template`:
      return normalizeTemplateArbitrary(arbitrary)
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

const normalizeTemplateArbitrary = (
  arbitrary: TemplateArbitrary,
): Arbitrary => {
  const flattenedSegments: (string | Arbitrary)[] = []
  for (let segment of arbitrary.segments) {
    if (typeof segment !== `string`) {
      segment = normalizeArbitrary(segment)
      switch (segment.type) {
        case `never`:
          return neverArbitrary()
        case `constant`:
          segment = String(segment.value)
          break
        case `template`:
          flattenedSegments.push(...segment.segments)
          break
        case `double`:
          segment = doubleArbitrary({
            ...segment.constraints,
            noDefaultInfinity: true,
            noNaN: true,
          })
          break
        case `option`:
        case `boolean`:
        case `bigInt`:
        case `string`:
        case `symbol`:
        case `array`:
        case `tuple`:
        case `record`:
        case `object`:
        case `func`:
        case `constantFrom`:
        case `oneof`:
        case `anything`:
          break
      }
    }

    flattenedSegments.push(segment)
  }

  const normalizedSegments: (string | Arbitrary)[] = []
  for (const segment of flattenedSegments) {
    if (typeof segment !== `string`) {
      normalizedSegments.push(segment)
      continue
    }

    if (!segment) {
      continue
    }

    if (normalizedSegments.length === 0) {
      normalizedSegments.push(segment)
      continue
    }

    const lastSegment = normalizedSegments.at(-1)
    if (typeof lastSegment === `string`) {
      normalizedSegments[normalizedSegments.length - 1] = lastSegment + segment
    } else {
      normalizedSegments.push(segment)
    }
  }

  switch (normalizedSegments.length) {
    case 0:
      return constantArbitrary(``)
    case 1: {
      const segment = normalizedSegments[0]!
      return typeof segment === `string` ? constantArbitrary(segment) : segment
    }
    default:
      return templateArbitrary(normalizedSegments)
  }
}

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
    case `template`:
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
