export function hasProperty<K extends string>(data: unknown, key: K): data is Record<K, unknown> {
    return data !== null && typeof data === 'object' && key in data;
}

export function hasDataProperty<T>(data: unknown): data is { data: T } {
    return hasProperty(data, 'data');
}

export function hasResultProperty<T>(data: unknown): data is { result: T } {
    return hasProperty(data, 'result');
}

export function isArrayWithProperty<K extends string>(
    data: unknown,
    key: K
): data is Array<Record<K, unknown>> {
    return Array.isArray(data) && (data.length === 0 || hasProperty(data[0], key));
}
