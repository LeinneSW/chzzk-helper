import {app, BrowserWindow, Tray, dialog, Menu, ipcMain} from "electron";
import {WebSocket} from 'ws'
import path from 'path'
import {Chzzk} from "./chzzk/chzzk";
import {convertColorCode, initNicknameColorData, readResource, saveResource} from "./utils/utils";
import {Web} from "./web/web";
import electronShortCut from 'electron-localshortcut';
import windowStateKeeper from "electron-window-state";

const voteSocket: WebSocket[] = []
const createVoteTask = () => {
    Web.instance.socket.on('connection', client => client.on('message', data => {
        const message = data.toString('utf-8')
        if(message === 'VOTE' && !voteSocket.includes(client)){
            voteSocket.push(client)
            client.onclose = () => voteSocket.splice(voteSocket.indexOf(client), 1)
            return
        }
    }))
    Chzzk.instance.chat.on('chat', chat => {
        const jsonData = JSON.stringify({
            user: chat.profile,
            message: chat.message,
        })
        for(const client of voteSocket){
            client.send(jsonData)
        }
    })
}

const emojiSocket: WebSocket[] = []
const createEmojiTask = () => {
    Web.instance.app.post('/req/test_emoji', (req, res) => {
        res.sendStatus(200)
        const jsonData = JSON.stringify({
            emojiList: new Array(5).fill('d_47'),
            emojiUrlList: {'d_47': 'https://ssl.pstatic.net/static/nng/glive/icon/b_07.gif'},
        })
        for(const client of emojiSocket){
            client.send(jsonData)
        }
    })
    Web.instance.socket.on('connection', client => client.on('message', data => {
        if(data.toString('utf-8') === 'SHOW_EMOJI' && !emojiSocket.includes(client)){
            emojiSocket.push(client)
            client.on('close', () => emojiSocket.splice(emojiSocket.indexOf(client), 1))
        }
    }))
    Chzzk.instance.chat.on('chat', chat => {
        const emojiUrlList = chat.extras?.emojis
        if(!emojiUrlList || Object.keys(emojiUrlList).length < 1){
            return
        }

        let match
        const emojiList = []
        const regex = /{:([\w]*):}/g
        while((match = regex.exec(chat.message)) !== null){
            emojiList.push(match[1])
        }

        const jsonData = JSON.stringify({emojiList, emojiUrlList})
        for(const client of emojiSocket){
            client.send(jsonData)
        }
    })
}

const chattingSocket: WebSocket[] = []
const createChattingTask = () => {
    let history: string[] = [];
    Web.instance.socket.on('connection', client => client.on('message', data => {
        const message = data.toString('utf-8')
        if(message === 'CHATTING' && !chattingSocket.includes(client)){
            chattingSocket.push(client)
            for(const h of history){
                client.send(h);
            }
            client.onclose = () => chattingSocket.splice(chattingSocket.indexOf(client), 1)
            return
        }
    }))
    Chzzk.instance.chat.on('chat', chat => {
        let colorData;
        const streamingProperty = chat.profile.streamingProperty;
        if(chat.profile.title){ // 스트리머, 매니저 등 특수 역할
            colorData = chat.profile.title.color;
        }else{
            colorData = convertColorCode(
                streamingProperty.nicknameColor.colorCode,
                chat.profile.userIdHash,
                Chzzk.instance.chat.chatChannelId
            );
        }

        let emojiList = chat.extras?.emojis;
        if(!emojiList || typeof emojiList !== 'object'){
            emojiList = {};
        }

        const badgeList: string[] = []
        if(chat.profile?.badge?.imageUrl){
            badgeList.push(chat.profile.badge.imageUrl)
        }
        if(chat.profile.streamingProperty?.realTimeDonationRanking?.badge?.imageUrl){
            badgeList.push(chat.profile.streamingProperty.realTimeDonationRanking.badge.imageUrl)
        }
        if(chat.profile.streamingProperty?.subscription?.badge?.imageUrl){
            badgeList.push(chat.profile.streamingProperty.subscription.badge.imageUrl)
        }
        // @ts-ignore
        for(const viewerBadge of chat.profile.viewerBadges){
            badgeList.push(viewerBadge.badge.imageUrl)
        }

        if(history.length >= 50){
            history.shift();
        }
        const jsonStr = JSON.stringify({
            profile: {
                nickname: chat.profile.nickname,
                userIdHash: chat.profile.userIdHash,
            },
            colorData,
            message: chat.message,
            emojiList,
            badgeList,
            date: chat.time
        })
        history.push(jsonStr)
        for(const client of chattingSocket){
            client.send(jsonStr)
        }
    })
}

let followCount: number = 0;
let followList: string[] = [];
const alertSocket: WebSocket[] = [];
const followGoalSocket: WebSocket[] = [];
const createCheckFollowTask = async () => {
    Web.instance.socket.on('connection', client => {
        client.on('message', data => {
            const message = data.toString('utf-8')
            switch(message){
                case 'ALERT':
                    if(!alertSocket.includes(client)){
                        alertSocket.push(client);
                        client.onclose = () => alertSocket.splice(alertSocket.indexOf(client), 1);
                    }
                    break;
                case 'FOLLOW_GOAL':
                    if(!followGoalSocket.includes(client)){
                        client.send(followCount + '');
                        followGoalSocket.push(client);
                        client.onclose = () => followGoalSocket.splice(followGoalSocket.indexOf(client), 1);
                    }
                    break;
            }
        });
    });
    Web.instance.app.post('/req/test_alert', (_, res) => {
        res.sendStatus(200);
        const json = JSON.stringify({
            type: `팔로우`,
            user: {
                nickname: '테스트'
            },
        });
        for(const client of alertSocket){
            client.send(json);
        }
    });

    try{
        const file = await readResource(`follow.txt`);
        for(let data of file.split('\n')){
            data = data.trim().replace(/\s/g, '');
            if(!data){
                continue;
            }
            if(data.startsWith('$<FOLLOW_COUNT>:')){
                followCount = +data.split(':')[1];
            }else{
                followList.push(data);
            }
        }
    }catch{
        const list = [];
        const followData = await Chzzk.instance.getFollowerData(10000);
        followCount = followData.totalCount;
        for(const user of followData.data){
            list.push(user.user.userIdHash)
        }
        await saveResource('follow.txt', list.join('\n') + `\n$<FOLLOW_COUNT>:${followCount}`);
    }
    setInterval(async () => {
        let isAdded = false;
        const followData = await Chzzk.instance.getFollowerData(10);
        followCount = followData.totalCount;
        for(const user of followData.data){
            if(!followList.includes(user.user.userIdHash)){
                isAdded = true
                followList.push(user.user.userIdHash)
                const json = JSON.stringify({type: '팔로우', user: user.user});
                for(const client of alertSocket){
                    client.send(json);
                }
            }
        }
        if(isAdded){
            for(const client of followGoalSocket){
                client.send(followCount + '');
            }
            await saveResource('follow.txt', followList.join('\n') + `\n$<FOLLOW_COUNT>:${followCount}`);
        }
    }, 10000);
}

const acquireAuthPhase = async (session: Electron.Session): Promise<boolean> => {
    const nidAuth = (await session.cookies.get({name: 'NID_AUT'}))[0]?.value || ''
    const nidSession = (await session.cookies.get({name: 'NID_SES'}))[0]?.value || ''
    if(!await Chzzk.setAuth(nidAuth, nidSession)){
        return false
    }
    
    Web.instance.socket.on('connection', client => client.on('message', data => {
        try{
            const json = JSON.parse(data.toString('utf-8'))
            switch(json.type){
                case 'SEND_MESSAGE':
                    json.message && Chzzk.instance.chat.sendChat(json.message, json.emojis)
                    break;
            }
            return
        }catch{}
    }))

    createVoteTask()
    createEmojiTask()
    createChattingTask()
    createCheckFollowTask()
    
    const icon = path.join(__dirname, '../resources/icon.png')
    const windowState = windowStateKeeper({
        defaultWidth: 1600,
        defaultHeight: 900,
    })
    const window = new BrowserWindow({
        x: windowState.x,
        y: windowState.y,
        width: windowState.width,
        height: windowState.height,
        icon,
        show: false,
        webPreferences: {
            contextIsolation: true,
            nodeIntegration: false,
            defaultEncoding: 'utf-8',
            preload: path.join(__dirname, 'preload.js')
        },
    })
    window.setMenu(null)
    windowState.manage(window)
    electronShortCut.register(window, ['Ctrl+R', 'F5'], () => window.webContents.reload())
    electronShortCut.register(window, 'Ctrl+Shift+I', () => window.webContents.toggleDevTools())
    electronShortCut.register(window, 'Ctrl+Shift+R', () => window.webContents.reloadIgnoringCache())

    const tray = new Tray(icon)
    tray.setToolTip('치지직 도우미')
    tray.on('double-click', () => window.show())
    const trayMenu = Menu.buildFromTemplate([
        {label: '설정', type: 'normal', click: () => {
            dialog.showMessageBoxSync(window, {
                type: 'info',
                title: `준비중인 기능`,
                message: '아직 구현되지 않은 기능입니다.'
            })
        }},
        {label: '프로그램 종료', type: 'normal', click: () => window.destroy()},
    ]);
    tray.setContextMenu(trayMenu)

    window.on('minimize', () => window.hide())
    window.on('close', event => {
        const response = dialog.showMessageBoxSync(window, {
            type: 'question',
            buttons: ['아니오', '트레이로 이동', '프로그램 종료'],
            title: `치지직 도우미 종료`,
            message: '치치직 도우미를 종료하시겠습니까?\n(OBS에 추가한 브라우저 위젯들은 도우미가 켜져있어야 동작합니다.)'
        })
        switch(response){
            case 1:
                window.hide()
            case 0:
                event.preventDefault()
                break
            default:
                window.destroy()
                break
        }
    })
    await window.loadURL('http://127.0.0.1:54321/')
    window.show()
    return true
}

app.whenReady().then(async () => {
    await initNicknameColorData();
    const window = new BrowserWindow({
        width: 800,
        height: 600,
        show: false,
        resizable: false,
        webPreferences: {
            nodeIntegration: true,
            defaultEncoding: 'utf-8',
        },
        icon: path.join(__dirname, '../resources/icon.png')
    })
    window.setMenu(null)

    await window.loadURL(`https://chzzk.naver.com/`)
    if(await acquireAuthPhase(window.webContents.session)){
        window.destroy()
        return
    }

    await window.loadURL(`https://nid.naver.com/nidlogin.login?url=https://chzzk.naver.com/`)
    window.webContents.on('did-navigate', async (_: any, newUrl: string) => {
        const url = new URL(newUrl)
        if(url.hostname === 'chzzk.naver.com' && url.pathname === '/'){ // 로그인 성공
            if(!await acquireAuthPhase(window.webContents.session)){
                dialog.showMessageBox(window, {
                    type: 'error',
                    title: '로그인 도중 문제 발생',
                    message: '로그인 도중 알 수 없는 문제가 발견되었습니다. 프로그램을 다시 실행해주세요.'
                })
            }
            window.destroy()
        }
    })
    window.show()
    
    dialog.showMessageBox(window, {
        type: 'info',
        title: '네이버 로그인 필요',
        message: '로그인이 필요한 서비스입니다.\n로그인 후 진행해주세요.'
    })
})
ipcMain.on('alert', (_, message: string = '', title?: string) => dialog.showMessageBox({type: 'info', title, message}))