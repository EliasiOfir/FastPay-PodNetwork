export function throwIfEmpty(value: string | undefined, err: string): string {
    return value || (() => {
        throw new Error(err)
    })();
}