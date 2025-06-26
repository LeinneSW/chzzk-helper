import path from "path";
import {app} from "electron";
import {mkdir, readFile, writeFile} from "fs/promises";
import fsExists from "fs.promises.exists";

export const APP_ICON_PATH = (() => path.join(app.getAppPath(), 'resources/icon.png'))();

export const getResourcePath = (fileOrDir: string = ''): string => {
    return path.join(app.getPath('userData'), 'resources', fileOrDir)
}

export const readResource = (fileName: string): Promise<string> => {
    return readFile(getResourcePath(fileName), 'utf-8')
}

export const saveResource = async (fileName: string, data: Record<string, any> | string, dir: string = ''): Promise<void> => {
    dir = getResourcePath(dir)
    if(!await fsExists(dir)){
        await mkdir(dir, {recursive: true})
    }
    await writeFile(path.join(dir, fileName), typeof data === 'string' ? data : JSON.stringify(data, null, 4), 'utf-8')
}