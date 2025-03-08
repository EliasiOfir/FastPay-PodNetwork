export function throwIfEmpty(value: string | undefined, err: string): string {

    return value || (() => {
        throw new Error(err)
    })();
}

export const ENV_PARAMS = {
    PORT_:'PORT_'
}