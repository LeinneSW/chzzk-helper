import {mkdir, readFile, writeFile} from "fs/promises";
import fsExists from "fs.promises.exists";
import path from "path";
import {app} from "electron";

export interface JSONData{
    [key: string | number]: any;
}

const tier2ColorList: JSONData = {}
const cheatKeyColorList: JSONData = {}

const nicknameColors = [
    "#EEA05D", "#EAA35F", "#E98158", "#E97F58",
    "#E76D53", "#E66D5F", "#E16490", "#E481AE",
    "#E481AE", "#D25FAC", "#D263AE", "#D66CB4",
    "#D071B6", "#AF71B5", "#A96BB2", "#905FAA",
    "#B38BC2", "#9D78B8", "#8D7AB8", "#7F68AE",
    "#9F99C8", "#717DC6", "#7E8BC2", "#5A90C0",
    "#628DCC", "#81A1CA", "#ADD2DE", "#83C5D6",
    "#8BC8CB", "#91CBC6", "#83C3BB", "#7DBFB2",
    "#AAD6C2", "#84C194", "#92C896", "#94C994",
    "#9FCE8E", "#A6D293", "#ABD373", "#BFDE73"
]

export const initNicknameColorData = async () => {
    const colorCodeRes = await fetch(
        'https://api.chzzk.naver.com/service/v2/nickname/color/codes',
        {
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
            }
        }
    );
    const jsonData = await colorCodeRes.json();
    const colorCodes = jsonData.content?.codeList || [];
    for(const index in colorCodes){
        const colorData = colorCodes[index];
        switch(colorData.availableScope){
            case 'CHEATKEY':
                cheatKeyColorList[colorData.code] = colorData.lightRgbValue;
                break;
            case 'SUBSCRIPTION_TIER2':
                tier2ColorList[colorData.code] = colorData;
                break;
        }
    }
}

export const getUserColor = (seed: string): string => {
    const index = seed.split("")
        .map((c) => c.charCodeAt(0))
        .reduce((a, b) => a + b, 0) % nicknameColors.length
    return nicknameColors[index]
}

export const convertColorCode = (colorCode: string, userId: string, chatChannelId: string): string => {
    if(colorCode.startsWith('CC')){
        return cheatKeyColorList[colorCode] || getUserColor(userId + chatChannelId)
    }
    return tier2ColorList[colorCode]
}

export const delay = (value: number) => new Promise((res, _) => setTimeout(res, value))
export const isObject = (data: any): boolean => !!data && typeof data === 'object';
export const isArray = (data: any): boolean => isObject(data) && data.constructor === Array
export const isNumeric = (data: any): boolean => {
    typeof data === 'number' || (data = parseInt(data))
    return !isNaN(data) && isFinite(data)
}

export const dateToString = (tempData: string | number | Date, full: boolean = false): string => {
    const date = typeof tempData !== 'object' ? new Date(tempData || 0) : tempData
    let output = `${date.getFullYear()}-${(date.getMonth() + 1 + '').padStart(2, '0')}-${(date.getDate() + '').padStart(2, '0')}`
    if(full){
        output += ` ${(date.getHours() + '').padStart(2, '0')}:${(date.getMinutes() + '').padStart(2, '0')}:${(date.getSeconds() + '').padStart(2, '0')}`
    }
    return output
}

export const getResourcePath = (fileOrDir: string = ''): string => path.join(app.getPath('userData'), 'resources', fileOrDir)

export const readResource = (fileName: string): Promise<string> => readFile(getResourcePath(fileName), 'utf-8')

export const saveResource = async (fileName: string, data: JSONData | string, dir: string = ''): Promise<void> => {
    dir = getResourcePath(dir)
    if(!await fsExists(dir)){
        await mkdir(dir, {recursive: true})
    }
    await writeFile(path.join(dir, fileName), typeof data === 'string' ? data : JSON.stringify(data, null, 4), 'utf-8')
}