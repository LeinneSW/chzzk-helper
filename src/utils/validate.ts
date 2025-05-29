export const isObject = (data: any) => {
    return !!data && typeof data === 'object';
}

export const isArray = (data: any) => {
    return isObject(data) && data.constructor === Array
}

export const isNumeric = (data: any) => {
    typeof data === 'number' || (data = parseInt(data))
    return !isNaN(data) && isFinite(data)
}