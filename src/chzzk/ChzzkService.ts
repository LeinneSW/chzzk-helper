import mitt from "mitt";
import {ChzzkChat, ChzzkClient} from "chzzk";
import {delay} from "../utils/system";
import express from "express";
import {Server} from "http";
import {WebSocketServer} from "ws";
import path from "path";
import {ChzzkEvents} from "./ChzzkEvents";
import {LiveInfo} from "./LiveInfo";

export class ChzzkService{
    readonly client: ChzzkClient

    readonly app = express();
    readonly server: Server;
    readonly socket: WebSocketServer;

    private _chat: ChzzkChat | undefined
    private _liveInfo: LiveInfo = {
        title: '',
        channelId: '',
        chatChannelId: '',
        viewership: 0,
        isLive: false,
        category: {
            id: '',
            type: '',
            name: '',
        }
    };
    private readonly emitter = mitt<ChzzkEvents>()

    // event listener
    readonly on = this.emitter.on;

    constructor(nidAuth: string, nidSession: string){
        this.client = new ChzzkClient({nidAuth, nidSession})

        this.app.use(express.json())
        this.app.use('/', express.static(path.join(__dirname , './../../public/')))

        this.server = this.app.listen(54321)
        this.socket = new WebSocketServer({server: this.server, path: '/ws'})
    }

    async start(){
        let channelId = ''
        let errorCount = 0
        for(; errorCount < 5 && !channelId; errorCount++){
            try{
                channelId = (await this.client.user()).userIdHash
            }catch{
                await delay(1000)
            }
        }
        if(channelId.length !== 32){
            return false
        }
        this._liveInfo.channelId = channelId
        await this.refreshLiveStatus()
        setInterval(async () => this.refreshLiveStatus(), 10 * 1000);
        return true
    }

    private async refreshLiveStatus(){
        const liveStatus = await this.client.live.status(this._liveInfo.channelId);
        if(!liveStatus){
            return;
        }

        // 19세 등의 이유로 chatChannelId가 null이 될 가능성이 있음
        if(liveStatus.chatChannelId && liveStatus.chatChannelId !== this._liveInfo.chatChannelId){
            if(this._chat?.connected){
                await this._chat.disconnect()
            }
            const chatClient = this.client.chat(liveStatus.chatChannelId);
            this._chat = chatClient
            this.emitter.emit('chat', chatClient)

            chatClient.on('connect', () => chatClient.requestRecentChat(100))
            chatClient.connect().catch((e) => console.error(e))
        }

        const newLiveInfo = {
            title: liveStatus.liveTitle,
            channelId: this._liveInfo.channelId,
            chatChannelId: liveStatus.chatChannelId || this._liveInfo.chatChannelId,
            viewership: liveStatus.concurrentUserCount,
            isLive: liveStatus.status === 'OPEN',
            category: {
                id: liveStatus.liveCategory || null,
                type: liveStatus.categoryType,
                name: liveStatus.liveCategoryValue || null,
            }
        }
        if(JSON.stringify(newLiveInfo) !== JSON.stringify(this._liveInfo)){
            this._liveInfo = newLiveInfo;
            this.emitter.emit('liveInfo', this._liveInfo)
        }
    }

    get chat(): ChzzkChat{
        return this._chat!
    }

    get liveInfo(): LiveInfo{
        return {...this._liveInfo} // 데이터 조작 방지를 위해 복제
    }
}