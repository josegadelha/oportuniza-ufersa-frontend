export function readMockState<T>(
  key: string,
  initialValue: T,
  isValid: (value: unknown) => value is T,
): T {
  const storedValue = localStorage.getItem(key)
  if (storedValue === null) return structuredClone(initialValue)

  let parsedValue: unknown
  try {
    parsedValue = JSON.parse(storedValue)
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error(`O estado mockado armazenado em "${key}" não é um JSON válido.`)
    }
    throw error
  }
  if (!isValid(parsedValue)) {
    throw new Error(`O estado mockado armazenado em "${key}" possui um formato inválido.`)
  }

  return parsedValue
}

export function writeMockState<T>(key: string, value: T) {
  localStorage.setItem(key, JSON.stringify(value))
}

export function isArrayOf<T>(
  value: unknown,
  isItem: (item: unknown) => item is T,
): value is T[] {
  return Array.isArray(value) && value.every(isItem)
}
