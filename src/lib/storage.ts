export function readStorageList<T>(key: string): T[] {
  if (typeof window === "undefined") {
    return [];
  }

  const rawValue = window.localStorage.getItem(key);

  if (!rawValue) {
    return [];
  }

  try {
    const parsedValue: unknown = JSON.parse(rawValue);
    return Array.isArray(parsedValue) ? (parsedValue as T[]) : [];
  } catch {
    return [];
  }
}

export function writeStorageList<T>(key: string, value: T[]) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(key, JSON.stringify(value));
}
