import type {
  Arbitrary,
  ArrayArbitrary,
  AssignArbitrary,
  BigIntArrayArbitrary,
  ConstantArbitrary,
  ConstantFromArbitrary,
  DictionaryArbitrary,
  FloatArrayArbitrary,
  FuncArbitrary,
  IntArrayArbitrary,
  MapStringArbitrary,
  OneofArbitrary,
  RecordArbitrary,
  TemplateArbitrary,
  TieArbitrary,
  TupleArbitrary,
} from './arbitrary.ts'

export const compareArbitraries = (
  arbitrary1: Arbitrary,
  arbitrary2: Arbitrary,
): number => {
  const priorityDiff =
    arbitraryPriority(arbitrary1) - arbitraryPriority(arbitrary2)
  if (priorityDiff !== 0) {
    return priorityDiff
  }

  if (arbitrary1.type === `meta` && arbitrary2.type === `meta`) {
    return compareConstants(
      arbitrary1.meta.constraints,
      arbitrary2.meta.constraints,
    )
  } else if (arbitrary1.type === `meta`) {
    return -1
  } else if (arbitrary2.type === `meta`) {
    return 1
  }

  if (arbitrary1.type === `option` && arbitrary2.type === `option`) {
    return compareConstants(arbitrary1.nil, arbitrary2.nil)
  } else if (arbitrary1.type === `option`) {
    return 1
  } else if (arbitrary2.type === `option`) {
    return -1
  }

  switch (arbitrary1.type) {
    case `mutable`:
      throw new Error(`Unsupported type`)
    case `tie`:
      return compareArbitraries(
        arbitrary1.arbitrary,
        (arbitrary2 as TieArbitrary).arbitrary,
      )
    case `constant`:
      return compareConstants(
        arbitrary1.value,
        (arbitrary2 as ConstantArbitrary).value,
      )
    case `template`: {
      const templateArbitrary2 = arbitrary2 as TemplateArbitrary
      for (
        let i = 0;
        i <
        Math.max(
          arbitrary1.segments.length,
          templateArbitrary2.segments.length,
        );
        i++
      ) {
        const segment1 = arbitrary1.segments[i]
        const segment2 = templateArbitrary2.segments[i]
        if (segment1 === undefined) {
          return -1
        } else if (segment2 === undefined) {
          return 1
        }

        if (typeof segment1 === `string` && typeof segment2 === `string`) {
          const segmentDiff = compareConstants(segment1, segment2)
          if (segmentDiff !== 0) {
            return segmentDiff
          }
        } else if (typeof segment1 === `string`) {
          return -1
        } else if (typeof segment2 === `string`) {
          return 1
        } else {
          const segmentDiff = compareArbitraries(segment1, segment2)
          if (segmentDiff !== 0) {
            return segmentDiff
          }
        }
      }
      return 0
    }
    case `mapString`: {
      const mapStringArbitrary2 = arbitrary2 as MapStringArbitrary
      const operationDiff =
        mapStringOperationPriority(arbitrary1.operation) -
        mapStringOperationPriority(mapStringArbitrary2.operation)
      if (operationDiff !== 0) {
        return operationDiff
      }
      return compareArbitraries(
        arbitrary1.arbitrary,
        mapStringArbitrary2.arbitrary,
      )
    }
    case `intArray`: {
      const intArrayArbitrary2 = arbitrary2 as IntArrayArbitrary
      return (
        compareConstants(arbitrary1.bits, intArrayArbitrary2.bits) ||
        compareConstants(arbitrary1.signed, intArrayArbitrary2.signed) ||
        compareConstants(arbitrary1.clamped, intArrayArbitrary2.clamped)
      )
    }
    case `bigIntArray`: {
      const bigIntArrayArbitrary2 = arbitrary2 as BigIntArrayArbitrary
      return compareConstants(arbitrary1.signed, bigIntArrayArbitrary2.signed)
    }
    case `floatArray`: {
      const floatArrayArbitrary2 = arbitrary2 as FloatArrayArbitrary
      return compareConstants(arbitrary1.bits, floatArrayArbitrary2.bits)
    }
    case `tuple`: {
      const tupleArbitrary2 = arbitrary2 as TupleArbitrary
      const diff = arbitrary1.elements.length - tupleArbitrary2.elements.length
      if (diff !== 0) {
        return diff
      }

      for (const [index, element1] of arbitrary1.elements.entries()) {
        const element2 = tupleArbitrary2.elements[index]!
        const restDiff = compareConstants(element1.rest, element2.rest)
        if (restDiff !== 0) {
          return restDiff
        }

        const arbitraryDiff = compareArbitraries(
          element1.arbitrary,
          element2.arbitrary,
        )
        if (arbitraryDiff !== 0) {
          return arbitraryDiff
        }
      }

      return 0
    }
    case `array`:
      return compareArbitraries(
        arbitrary1.items,
        (arbitrary2 as ArrayArbitrary).items,
      )
    case `record`: {
      const entries1 = [...arbitrary1.properties]
      const entries2 = [...(arbitrary2 as RecordArbitrary).properties]

      const entryCountDiff = entries1.length - entries2.length
      if (entryCountDiff !== 0) {
        return entryCountDiff
      }

      for (let i = 0; i < entries1.length; i++) {
        const [key1, property1] = entries1[i]!
        const [key2, property2] = entries2[i]!
        const keyDiff = compareConstants(key1, key2)
        if (keyDiff !== 0) {
          return keyDiff
        }

        const requiredDiff = -compareConstants(
          property1.required,
          property2.required,
        )
        if (requiredDiff !== 0) {
          return requiredDiff
        }

        const arbitraryDiff = compareArbitraries(
          property1.arbitrary,
          property2.arbitrary,
        )
        if (arbitraryDiff !== 0) {
          return arbitraryDiff
        }
      }

      return 0
    }
    case `dictionary`: {
      const dictionaryArbitrary2 = arbitrary2 as DictionaryArbitrary
      const keyDiff = compareArbitraries(
        arbitrary1.key,
        dictionaryArbitrary2.key,
      )
      if (keyDiff !== 0) {
        return keyDiff
      }

      const valueDiff = compareArbitraries(
        arbitrary1.value,
        dictionaryArbitrary2.value,
      )
      if (valueDiff !== 0) {
        return valueDiff
      }

      return 0
    }
    case `func`:
      return compareArbitraries(
        arbitrary1.result,
        (arbitrary2 as FuncArbitrary).result,
      )
    case `constantFrom`:
      return compareConstants(
        arbitrary1.constants,
        (arbitrary2 as ConstantFromArbitrary).constants,
      )
    case `oneof`: {
      const oneofArbitrary2 = arbitrary2 as OneofArbitrary
      const diff = arbitrary1.variants.length - oneofArbitrary2.variants.length
      if (diff !== 0) {
        return diff
      }

      for (const [index, variant1] of arbitrary1.variants.entries()) {
        const variant2 = oneofArbitrary2.variants[index]!
        const arbitraryDiff = compareArbitraries(variant1, variant2)
        if (arbitraryDiff !== 0) {
          return arbitraryDiff
        }
      }

      return 0
    }
    case `assign`: {
      const assignArbitrary2 = arbitrary2 as AssignArbitrary
      const diff = arbitrary1.arbitraries.length - arbitrary1.arbitraries.length
      if (diff !== 0) {
        return diff
      }

      for (const [index, innerArbitrary1] of arbitrary1.arbitraries.entries()) {
        const innerArbitrary2 = assignArbitrary2.arbitraries[index]!
        const arbitraryDiff = compareArbitraries(
          innerArbitrary1,
          innerArbitrary2,
        )
        if (arbitraryDiff !== 0) {
          return arbitraryDiff
        }
      }

      return 0
    }
    case `never`:
    case `boolean`:
    case `integer`:
    case `double`:
    case `bigInt`:
    case `string`:
    case `symbol`:
    case `object`:
    case `anything`:
      return 0
  }
}

const arbitraryPriority = (arbitrary: Arbitrary): number => {
  switch (arbitrary.type) {
    case `mutable`:
      throw new Error(`Unsupported type`)
    case `tie`:
      return 0
    case `meta`:
    case `option`:
      return arbitraryPriority(arbitrary.arbitrary)
    case `never`:
      return 1
    case `constant`:
      return 2
    case `boolean`:
      return 3
    case `integer`:
      return 4
    case `double`:
      return 5
    case `bigInt`:
      return 6
    case `string`:
      return 7
    case `template`:
      return 8
    case `mapString`:
      return 9
    case `symbol`:
      return 10
    case `intArray`:
      return 11
    case `bigIntArray`:
      return 12
    case `floatArray`:
      return 13
    case `tuple`:
      return 14
    case `array`:
      return 15
    case `record`:
      return 16
    case `dictionary`:
      return 17
    case `object`:
      return 18
    case `func`:
      return 19
    case `constantFrom`:
      return 20
    case `oneof`:
      return 21
    case `assign`:
      return 22
    case `anything`:
      return 23
  }
}

const mapStringOperationPriority = (
  operation: MapStringArbitrary[`operation`],
): number => {
  switch (operation) {
    case `lowercase`:
      return 0
    case `uppercase`:
      return 1
    case `uncapitalize`:
      return 2
    case `capitalize`:
      return 3
  }
}

export const compareConstants = (
  constant1: unknown,
  constant2: unknown,
): number => {
  const priorityDiff = constantPriority(constant1) - constantPriority(constant2)
  if (priorityDiff !== 0) {
    return priorityDiff
  }

  switch (typeof constant1) {
    case `undefined`:
      return 0
    case `boolean`:
      return Number(constant1) - Number(constant2)
    case `number`:
      return constant1 - (constant2 as number)
    case `bigint`: {
      const bigint2 = constant2 as bigint
      if (constant1 < bigint2) {
        return -1
      } else if (constant1 > bigint2) {
        return 1
      } else {
        return 0
      }
    }
    case `string`:
      return constant1.localeCompare(constant2 as string)
    case `object`: {
      if (constant1 === null) {
        return 0
      }
      const entries1: [string, unknown][] = Object.entries(constant1)
      const entries2: [string, unknown][] = Object.entries(constant2 as object)
      const entryCountDiff = entries1.length - entries2.length
      if (entryCountDiff !== 0) {
        return entryCountDiff
      }

      for (let i = 0; i < entries1.length; i++) {
        const [key1, value1] = entries1[i]!
        const [key2, value2] = entries2[i]!
        const keyDiff = key1.localeCompare(key2)
        if (keyDiff !== 0) {
          return keyDiff
        }

        const valueDiff = compareConstants(value1, value2)
        if (valueDiff !== 0) {
          return valueDiff
        }
      }

      return 0
    }
    /* c8 ignore start */
    case `symbol`:
    case `function`:
      throw new Error(`Unsupported type`)
    /* c8 ignore end */
  }
}

const constantPriority = (constant: unknown): number => {
  switch (typeof constant) {
    case `undefined`:
      return 0
    case `boolean`:
      return 2
    case `number`:
      return 3
    case `bigint`:
      return 4
    case `string`:
      return 5
    case `object`:
      return constant === null ? 1 : 6
    /* c8 ignore start */
    case `symbol`:
    case `function`:
      throw new Error(`Unsupported type`)
    /* c8 ignore end */
  }
}
