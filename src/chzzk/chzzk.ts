import {ChzzkChat, ChzzkClient, Followers, LiveStatus} from "chzzk";
import {delay} from "../utils/utils";
import {LiveInfo} from "./types";

export class Chzzk{
    private static _instance: Chzzk

    static get instance(): Chzzk{
        if(!this._instance){
            throw new Error('Chzzk.setAuth()가 실행되기전엔 접근이 불가능합니다.')
        }
        return this._instance
    }

    static async setAuth(nidAuth: string, nidSession: string): Promise<boolean>{
        if(nidAuth && nidSession){
            let channelId = ''
            const client = new ChzzkClient({nidAuth, nidSession})
            while(!channelId){
                try{
                    channelId = (await client.user()).userIdHash
                }catch{
                    await delay(1000)
                }
            }

            let liveStatus: LiveStatus | undefined;
            while(!liveStatus){
                try{
                    liveStatus = await client.live.status(channelId)
                }catch{
                    await delay(1000)
                }
            }

            const chat = client.chat(liveStatus.chatChannelId)
            chat.on('connect', () => chat.requestRecentChat(50));
            await chat.connect()
            this._instance = new Chzzk(channelId, liveStatus, chat, client)
            return true
        }
        return false
    }

    static isSameLiveInfo(a: LiveInfo, b: LiveInfo): boolean{
        return (
            a.title === b.title &&
            a.channelId === b.channelId &&
            a.chatChannelId === b.chatChannelId &&
            a.viewership === b.viewership &&
            a.isLive === b.isLive &&
            a.category.id === b.category.id &&
            a.category.type === b.category.type &&
            a.category.name === b.category.name
        );
    }

    public readonly changeLiveInfoListener: (() => void)[] = [];
    public readonly connectChatListener: ((chat: ChzzkChat) => void)[] = [];

    private _liveInfo: LiveInfo;
    private chatInterval: NodeJS.Timeout;

    private constructor(
        channelId: string,
        liveStatus: LiveStatus,
        private _chat: ChzzkChat,
        public readonly client: ChzzkClient,
    ){
        this._liveInfo = {
            title: liveStatus.liveTitle,
            channelId,
            chatChannelId: liveStatus.chatChannelId,
            viewership: liveStatus.concurrentUserCount,
            isLive: liveStatus.status === 'OPEN',
            category: {
                id: liveStatus.liveCategory || null,
                type: liveStatus.categoryType,
                name: liveStatus.liveCategoryValue || null,
            }
        }
        this.chatInterval = setInterval(async () => {
            const liveStatus = await client.live.status(channelId);
            if(!liveStatus){
                return;
            }
            if(liveStatus.chatChannelId && liveStatus.chatChannelId !== this._liveInfo.chatChannelId){
                if(this._chat.connected){
                    this.chat.disconnect().catch((e) => console.error(e))
                }
                this._chat = client.chat(liveStatus.chatChannelId)
                this._chat.on('connect', () => this._chat.requestRecentChat(50));
                this._chat.connect().catch((e) => console.error(e))

                for(const listener of this.connectChatListener){
                    listener(this._chat)
                }
            }

            const newLiveInfo = {
                title: liveStatus.liveTitle,
                channelId,
                chatChannelId: liveStatus.chatChannelId,
                viewership: liveStatus.concurrentUserCount,
                isLive: liveStatus.status === 'OPEN',
                category: {
                    id: liveStatus.liveCategory || null,
                    type: liveStatus.categoryType,
                    name: liveStatus.liveCategoryValue || null,
                }
            }
            if(!Chzzk.isSameLiveInfo(newLiveInfo, this._liveInfo)){
                this._liveInfo = newLiveInfo;
                for(const listener of this.changeLiveInfoListener){
                    listener()
                }
            }
        }, 10 * 1000);
    }

    get chat(): ChzzkChat{
        return this._chat
    }

    get liveInfo(): LiveInfo{
        return {...this._liveInfo} // 데이터 조작 방지를 위해 복제
    }

    async getFollowerData(size: number = 10): Promise<Followers>{
        try{
            const data = await this.client.manage.followers(this.liveInfo.channelId, {size})
            if(data){
                return data
            }
        }catch{}
        return {
            page: 0,
            size: 0,
            totalCount: 0,
            totalPages: 0,
            data: []
        }
    }
}