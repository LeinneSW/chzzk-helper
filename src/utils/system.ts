export const delay = (value: number) =>{
    return new Promise((res, _) => setTimeout(res, value))
}