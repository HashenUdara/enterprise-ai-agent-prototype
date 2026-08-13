export const DEFAULT_SEARCH_LIMIT = 20
export const MAX_SEARCH_LIMIT = 50

export function normalizeLimit(limit?: number) {
  const normalized = limit ?? DEFAULT_SEARCH_LIMIT

  if (
    !Number.isInteger(normalized) ||
    normalized < 1 ||
    normalized > MAX_SEARCH_LIMIT
  ) {
    throw new Error(
      `limit must be an integer between 1 and ${MAX_SEARCH_LIMIT}.`
    )
  }

  return normalized
}

export function normalizeIds(
  values: Array<string | undefined> | undefined,
  fieldName: string
) {
  if (!values) {
    return []
  }

  const normalized = [
    ...new Set(
      values
        .filter((value): value is string => value !== undefined)
        .map((value) => value.trim())
        .filter(Boolean)
    ),
  ]

  if (normalized.length > MAX_SEARCH_LIMIT) {
    throw new Error(`${fieldName} accepts at most ${MAX_SEARCH_LIMIT} IDs.`)
  }

  return normalized
}

export function normalizeOptionalText(value?: string) {
  const normalized = value?.trim()
  return normalized || undefined
}

export function escapeLikePattern(value: string) {
  return value.replace(/[\\%_]/g, "\\$&")
}
