import {contextBridge, ipcRenderer} from "electron";
import {User} from "chzzk/dist/api/user";
import {LiveInfo} from "./chzzk/types";

contextBridge.exposeInMainWorld('electron', {
    getUserStatus: (): Promise<User> => ipcRenderer.invoke('getUserStatus'),
    getLiveInfo: (): Promise<LiveInfo> => ipcRenderer.invoke('getLiveInfo')
});