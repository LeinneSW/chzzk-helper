export const dateToString = (tempData: string | number | Date, full: boolean = false): string => {
    const date = typeof tempData !== 'object' ? new Date(tempData || 0) : tempData
    let output = `${date.getFullYear()}-${(date.getMonth() + 1 + '').padStart(2, '0')}-${(date.getDate() + '').padStart(2, '0')}`
    if(full){
        output += ` ${(date.getHours() + '').padStart(2, '0')}:${(date.getMinutes() + '').padStart(2, '0')}:${(date.getSeconds() + '').padStart(2, '0')}`
    }
    return output
}