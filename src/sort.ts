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
    case `symbol`:
      return (constant1.description ?? ``).localeCompare(
        (constant2 as symbol).description ?? ``,
      )
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
    case `function`:
      throw new Error(`Unsupported type`)
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
    case `symbol`:
      return 6
    case `object`:
      return constant === null ? 1 : 7
    case `function`:
      throw new Error(`Unsupported type`)
  }
}
