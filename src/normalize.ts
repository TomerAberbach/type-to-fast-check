import { SameValueSet } from 'svkc'
import {
  arrayArbitrary,
  assignArbitrary,
  booleanArbitrary,
  collectTieArbitraries,
  constantArbitrary,
  constantFromArbitrary,
  dictionaryArbitrary,
  doubleArbitrary,
  funcArbitrary,
  mapStringArbitrary,
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
  AssignArbitrary,
  ConstantFromArbitrary,
  DictionaryArbitrary,
  FuncArbitrary,
  MapStringArbitrary,
  MutableArbitrary,
  OneofArbitrary,
  OptionArbitrary,
  RecordArbitrary,
  TemplateArbitrary,
  TieArbitrary,
  TupleArbitrary,
} from './arbitrary.ts'
import { compareConstants } from './sort.ts'

const normalizeArbitrary = (arbitrary: Arbitrary): Arbitrary => {
  const tieArbitraries = collectTieArbitraries(arbitrary)
  const arbitraryTieArbitraries = new Map<Arbitrary, Set<TieArbitrary>>()
  for (const tieArbitrary of tieArbitraries) {
    let arbitraries = arbitraryTieArbitraries.get(tieArbitrary.arbitrary)
    if (!arbitraries) {
      arbitraries = new Set()
      arbitraryTieArbitraries.set(tieArbitrary.arbitrary, arbitraries)
    }
    arbitraries.add(tieArbitrary)
  }

  return normalizeArbitraryInternal(arbitrary, arbitraryTieArbitraries)
}

const normalizeArbitraryInternal = (
  arbitrary: Arbitrary,
  arbitraryTieArbitraries: Map<Arbitrary, Set<TieArbitrary>>,
): Arbitrary => {
  let normalizedArbitrary: Arbitrary
  switch (arbitrary.type) {
    case `mutable`:
      normalizedArbitrary = normalizeMutableArbitrary(
        arbitrary,
        arbitraryTieArbitraries,
      )
      break
    case `tie`:
      normalizedArbitrary = normalizeTieArbitrary(
        arbitrary,
        arbitraryTieArbitraries,
      )
      break
    case `never`:
    case `constant`:
    case `boolean`:
    case `double`:
    case `bigInt`:
    case `string`:
    case `symbol`:
    case `object`:
    case `anything`:
      normalizedArbitrary = arbitrary
      break
    case `option`:
      normalizedArbitrary = normalizeOptionArbitrary(
        arbitrary,
        arbitraryTieArbitraries,
      )
      break
    case `template`:
      normalizedArbitrary = normalizeTemplateArbitrary(
        arbitrary,
        arbitraryTieArbitraries,
      )
      break
    case `mapString`:
      normalizedArbitrary = normalizeMapStringArbitrary(
        arbitrary,
        arbitraryTieArbitraries,
      )
      break
    case `array`:
      normalizedArbitrary = normalizeArrayArbitrary(
        arbitrary,
        arbitraryTieArbitraries,
      )
      break
    case `tuple`:
      normalizedArbitrary = normalizeTupleArbitrary(
        arbitrary,
        arbitraryTieArbitraries,
      )
      break
    case `record`:
      normalizedArbitrary = normalizeRecordArbitrary(
        arbitrary,
        arbitraryTieArbitraries,
      )
      break
    case `dictionary`:
      normalizedArbitrary = normalizeDictionaryArbitrary(
        arbitrary,
        arbitraryTieArbitraries,
      )
      break
    case `func`:
      normalizedArbitrary = normalizeFuncArbitrary(
        arbitrary,
        arbitraryTieArbitraries,
      )
      break
    case `constantFrom`:
      normalizedArbitrary = normalizeConstantFromArbitrary(
        arbitrary,
        arbitraryTieArbitraries,
      )
      break
    case `oneof`:
      normalizedArbitrary = normalizeOneofArbitrary(
        arbitrary,
        arbitraryTieArbitraries,
      )
      break
    case `assign`:
      normalizedArbitrary = normalizeAssignArbitrary(
        arbitrary,
        arbitraryTieArbitraries,
      )
      break
  }

  const tieArbitrary = arbitraryTieArbitraries
    .get(arbitrary)
    ?.values()
    .next().value
  if (tieArbitrary) {
    tieArbitrary.arbitrary = normalizedArbitrary
    return tieArbitrary
  }

  return normalizedArbitrary
}

const normalizeMutableArbitrary = (
  arbitrary: MutableArbitrary,
  arbitraryTieArbitraries: Map<Arbitrary, Set<TieArbitrary>>,
): Arbitrary => {
  if (!arbitrary.value) {
    throw new Error(`Mutable arbitrary not set`)
  }

  return normalizeArbitraryInternal(arbitrary.value, arbitraryTieArbitraries)
}

const normalizeTieArbitrary = (
  arbitrary: TieArbitrary,
  arbitraryTieArbitraries: Map<Arbitrary, Set<TieArbitrary>>,
): Arbitrary =>
  // Canonicalize to tie arbitraries based on their constituent.
  arbitraryTieArbitraries.get(arbitrary.arbitrary)!.values().next().value!

const normalizeOptionArbitrary = (
  arbitrary: OptionArbitrary,
  arbitraryTieArbitraries: Map<Arbitrary, Set<TieArbitrary>>,
): Arbitrary =>
  normalizeArbitraryInternal(
    oneofArbitrary(spreadUnionArbitraries(arbitrary)),
    arbitraryTieArbitraries,
  )

const normalizeTemplateArbitrary = (
  arbitrary: TemplateArbitrary,
  arbitraryTieArbitraries: Map<Arbitrary, Set<TieArbitrary>>,
): Arbitrary => {
  const flattenedSegments: (string | Arbitrary)[] = []
  for (let segment of arbitrary.segments) {
    if (typeof segment !== `string`) {
      segment = normalizeArbitraryInternal(segment, arbitraryTieArbitraries)
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
        case `mutable`:
        case `tie`:
        case `option`:
        case `boolean`:
        case `bigInt`:
        case `string`:
        case `symbol`:
        case `mapString`:
        case `array`:
        case `tuple`:
        case `record`:
        case `dictionary`:
        case `object`:
        case `func`:
        case `constantFrom`:
        case `oneof`:
        case `assign`:
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

const normalizeMapStringArbitrary = (
  arbitrary: MapStringArbitrary,
  arbitraryTieArbitraries: Map<Arbitrary, Set<TieArbitrary>>,
): Arbitrary =>
  mapStringArbitrary({
    arbitrary: normalizeArbitraryInternal(
      arbitrary.arbitrary,
      arbitraryTieArbitraries,
    ),
    operation: arbitrary.operation,
  })

const normalizeArrayArbitrary = (
  arbitrary: ArrayArbitrary,
  arbitraryTieArbitraries: Map<Arbitrary, Set<TieArbitrary>>,
): Arbitrary =>
  arrayArbitrary(
    normalizeArbitraryInternal(arbitrary.items, arbitraryTieArbitraries),
  )

const normalizeTupleArbitrary = (
  arbitrary: TupleArbitrary,
  arbitraryTieArbitraries: Map<Arbitrary, Set<TieArbitrary>>,
): Arbitrary => {
  const normalizedElements = arbitrary.elements.map(({ arbitrary, rest }) => ({
    arbitrary: normalizeArbitraryInternal(arbitrary, arbitraryTieArbitraries),
    rest,
  }))

  const constantElements: unknown[] = []
  for (const { arbitrary, rest } of normalizedElements) {
    if (arbitrary.type === `constant`) {
      if (rest) {
        constantElements.push(...(arbitrary.value as unknown[]))
      } else {
        constantElements.push(arbitrary.value)
      }
    } else {
      return tupleArbitrary(normalizedElements)
    }
  }

  return constantArbitrary(constantElements)
}

const normalizeRecordArbitrary = (
  arbitrary: RecordArbitrary,
  arbitraryTieArbitraries: Map<Arbitrary, Set<TieArbitrary>>,
): Arbitrary => {
  const normalizedProperties = new Map(
    Array.from(arbitrary.properties, ([name, { required, arbitrary }]) => [
      name,
      {
        required,
        arbitrary: normalizeArbitraryInternal(
          arbitrary,
          arbitraryTieArbitraries,
        ),
      },
    ]),
  )

  const constantProperties = Object.create(null) as Record<PropertyKey, unknown>
  for (const [name, { required, arbitrary }] of normalizedProperties) {
    const isConstant = required && arbitrary.type === `constant`
    if (isConstant) {
      constantProperties[name] = arbitrary.value
    } else {
      return recordArbitrary(normalizedProperties)
    }
  }
  return constantArbitrary(constantProperties)
}

const normalizeDictionaryArbitrary = (
  arbitrary: DictionaryArbitrary,
  arbitraryTieArbitraries: Map<Arbitrary, Set<TieArbitrary>>,
): Arbitrary =>
  dictionaryArbitrary({
    key: normalizeArbitraryInternal(arbitrary.key, arbitraryTieArbitraries),
    value: normalizeArbitraryInternal(arbitrary.value, arbitraryTieArbitraries),
  })

const normalizeFuncArbitrary = (
  arbitrary: FuncArbitrary,
  arbitraryTieArbitraries: Map<Arbitrary, Set<TieArbitrary>>,
): Arbitrary =>
  funcArbitrary(
    normalizeArbitraryInternal(arbitrary.result, arbitraryTieArbitraries),
  )

const normalizeConstantFromArbitrary = (
  arbitrary: ConstantFromArbitrary,
  arbitraryTieArbitraries: Map<Arbitrary, Set<TieArbitrary>>,
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
          arbitrary: normalizeArbitraryInternal(
            constantFromArbitrary([...constants]),
            arbitraryTieArbitraries,
          ),
          nil: undefined,
        })
      }

      if (constants.has(null) && !constants.has(undefined)) {
        constants.delete(null)
        return optionArbitrary({
          arbitrary: normalizeArbitraryInternal(
            constantFromArbitrary([...constants]),
            arbitraryTieArbitraries,
          ),
          nil: null,
        })
      }

      if (constants.has(false) && constants.has(true)) {
        constants.delete(false)
        constants.delete(true)
        return constants.size === 0
          ? booleanArbitrary()
          : normalizeArbitraryInternal(
              oneofArbitrary([
                booleanArbitrary(),
                constantFromArbitrary([...constants]),
              ]),
              arbitraryTieArbitraries,
            )
      }

      return constantFromArbitrary([...constants])
  }
}

const normalizeOneofArbitrary = (
  arbitrary: OneofArbitrary,
  arbitraryTieArbitraries: Map<Arbitrary, Set<TieArbitrary>>,
): Arbitrary => {
  const variants = new Set<Arbitrary>(
    arbitrary.variants.flatMap(variant =>
      spreadUnionArbitraries(
        normalizeArbitraryInternal(variant, arbitraryTieArbitraries),
      ),
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
    const arbitrary = normalizeArbitraryInternal(
      constantFromArbitrary([...constants]),
      arbitraryTieArbitraries,
    )
    if (variants.size === 0) {
      return arbitrary
    }
    variants.add(arbitrary)
  }

  if (variants.delete(undefinedConstant)) {
    return optionArbitrary({
      arbitrary: normalizeArbitraryInternal(
        oneofArbitrary([...variants]),
        arbitraryTieArbitraries,
      ),
      nil: undefined,
    })
  }
  if (variants.delete(nullConstant)) {
    return optionArbitrary({
      arbitrary: normalizeArbitraryInternal(
        oneofArbitrary([...variants]),
        arbitraryTieArbitraries,
      ),
      nil: null,
    })
  }

  return oneofArbitrary([...variants])
}

const spreadUnionArbitraries = (arbitrary: Arbitrary): Arbitrary[] => {
  switch (arbitrary.type) {
    case `mutable`:
    case `tie`:
    case `constant`:
    case `boolean`:
    case `double`:
    case `bigInt`:
    case `string`:
    case `template`:
    case `mapString`:
    case `symbol`:
    case `array`:
    case `tuple`:
    case `record`:
    case `dictionary`:
    case `object`:
    case `func`:
    case `assign`:
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

const normalizeAssignArbitrary = (
  arbitrary: AssignArbitrary,
  arbitraryTieArbitraries: Map<Arbitrary, Set<TieArbitrary>>,
): Arbitrary => {
  const normalizedArbitraries = arbitrary.arbitraries
    .flatMap(arbitrary => {
      const normalizedArbitrary = normalizeArbitraryInternal(
        arbitrary,
        arbitraryTieArbitraries,
      )
      return normalizedArbitrary.type === `assign`
        ? normalizedArbitrary.arbitraries
        : [normalizedArbitrary]
    })
    // Exclude trailing empty objects because they are no-ops.
    .filter(
      (arbitrary, index) => index === 0 || !isEmptyObjectArbitrary(arbitrary),
    )
  switch (normalizedArbitraries.length) {
    case 0:
      return neverArbitrary()
    case 1:
      return normalizedArbitraries[0]!
    default:
      return assignArbitrary(normalizedArbitraries)
  }
}

const isEmptyObjectArbitrary = (arbitrary: Arbitrary): boolean =>
  arbitrary.type === `constant` &&
  typeof arbitrary.value === `object` &&
  arbitrary.value !== null &&
  Object.keys(arbitrary.value).length === 0

export default normalizeArbitrary
