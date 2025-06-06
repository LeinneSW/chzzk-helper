import {contextBridge, ipcRenderer} from "electron";
import {User} from "chzzk/dist/api/user";
import {LiveInfo} from "./chzzk/LiveInfo";

contextBridge.exposeInMainWorld('electron', {
    getUserStatus: (): Promise<User> => ipcRenderer.invoke('getUserStatus'),
    getLiveInfo: (): Promise<LiveInfo> => ipcRenderer.invoke('getLiveInfo'),
    sendTestNotification: (type: string): Promise<void> => ipcRenderer.invoke('sendTestNotification', type),
});