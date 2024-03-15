import {app, BrowserWindow, Tray, dialog} from "electron";
import express from 'express';
import {WebSocket, WebSocketServer} from 'ws'
import path from 'path'
import { Chzzk } from "./chzzk/chzzk";
import fsExists from "fs.promises.exists";
import { readFile, writeFile } from "fs/promises";
import { JSONData, delay, isNumeric, saveFile } from "./utils/utils";
import { ChzzkClient } from "chzzk";

let followList: string[] = []
const alertSocket: WebSocket[] = []

const voteSocket: WebSocket[] = []

const web = express()
web.use('/', express.static(path.join(__dirname , '/../public/')))
web.get('/alert', (_, res) => {
    res.sendFile(path.join(__dirname, '/../public/alert.html'))
})

const acquireAuthPhase = async (cookies: Electron.Cookie[]): Promise<boolean> => {
    const nidAuth = cookies.find(v => v.name === 'NID_AUT')?.value || ''
    const nidSession = cookies.find(v => v.name === 'NID_SES')?.value || ''
    if(!Chzzk.setAuth(nidAuth, nidSession)){
        return false
    }

    //window.webContents.executeJavaScript('window')
    const filePath = path.join(app.getPath('userData'), 'follow.txt')
    fsExists(filePath).then(async v => {
        if(!v){
            const list = [];
            for(const user of await Chzzk.getFollowerList(10000)){
                list.push(user.user.userIdHash)
            }
            saveFile(app.getPath('userData'), 'follow.txt', list.join('\n'))
        }else{
            followList = (await readFile(filePath, 'utf-8')).split('\n').map(v => v.trim()).filter(v => !!v)
        }
    })

    const server = web.listen(54321, () => {})
    setInterval(async () => {
        for(const followData of (await Chzzk.getFollowerList(10)).filter(user => !followList.includes(user.user.userIdHash))){
            const json = JSON.stringify({type: '팔로우', user: followData.user});
            for(const client of alertSocket){
                client.send(json)
            }
        }
    }, 10000)
    new WebSocketServer({server, path: '/ws'}).on('connection', async client => {
        client.onmessage = data => {
            const message = data.data.toString('utf-8')
            switch(message){
                case 'VOTE':
                    voteSocket.push(client)
                    client.onclose = () => voteSocket.splice(voteSocket.indexOf(client), 1)
                    return;
                case 'ALERT':
                    alertSocket.push(client)
                    client.onclose = () => alertSocket.splice(alertSocket.indexOf(client), 1)
                    return;
                default:
            }
        }
    });
    
    (async () => {
        while(!Chzzk.userId){
            await delay(100)
        }
        const chzzkChat = new ChzzkClient({nidAuth, nidSession}).chat({
            channelId: Chzzk.userId,
            pollInterval: 20 * 1000 // 20초
        })
        chzzkChat.on('chat', chat => {
            for(const client of voteSocket){
                client.send(JSON.stringify({
                    user: chat.profile,
                    message: chat.message,
                }))
            }
        })
        chzzkChat.connect()
    })()
    
    const icon = path.join(__dirname, '../resources/icon.png')
    const window = new BrowserWindow({
        width: 1280,
        height: 720,
        show: false,
        webPreferences: {
            nodeIntegration: true,
            defaultEncoding: 'utf-8',
        },
        autoHideMenuBar: true,
        icon
    })
    const tray = new Tray(icon)
    tray.setToolTip('치지직 도우미')
    tray.on('double-click', () => window.show())

    window.on('minimize', () => window.hide())
    window.on('close', event => {
        let response = dialog.showMessageBoxSync(window, {
            type: 'question',
            buttons: ['예', '아니오'],
            title: `치지직 도우미 종료`,
            message: '치치직 도우미를 종료하시겠습니까?\n(프로그램이 켜져있어야 알리미가 동작합니다.)'
        })
        if(response === 1){
            event.preventDefault()
        }
    })
    await window.loadFile(path.join(__dirname, '../public/index.html'))
    window.show()
    return true
}

app.whenReady().then(async () => {
    const window = new BrowserWindow({
        width: 800,
        height: 600,
        show: false,
        webPreferences: {
            nodeIntegration: true,
            defaultEncoding: 'utf-8',
        },
        autoHideMenuBar: true,
        icon: path.join(__dirname, '../resources/icon.png')
    })

    await window.loadURL(`https://chzzk.naver.com/`)
    if(!await acquireAuthPhase(await window.webContents.session.cookies.get({}))){
        const listener = async (_: any, newUrl: string) => {
            const url = new URL(newUrl)
            if(url.hostname === 'chzzk.naver.com' && url.pathname === '/'){ // 로그인 성공
                await delay(200)
                if(await acquireAuthPhase(await window.webContents.session.cookies.get({}))){
                    window.close()
                }else{
                    dialog.showMessageBox(window, {
                        type: 'error',
                        title: '로그인 도중 문제 발생',
                        message: '로그인 도중 알 수 없는 문제가 발견되었습니다. 프로그램을 다시 실행해주세요.'
                    })
                    window.close()
                }
            }
        }
        window.webContents.on('did-navigate', listener)
        await window.loadURL(`https://nid.naver.com/nidlogin.login?url=https://chzzk.naver.com/`)
        window.show()
        
        dialog.showMessageBox(window, {
            type: 'info',
            title: '네이버 로그인 필요',
            message: '로그인이 필요한 서비스입니다.\n로그인 후 진행해주세요.'
        })
    }else{
        window.close()
    }
})