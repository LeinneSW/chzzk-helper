import mitt from "mitt";
import {ChzzkChat, ChzzkClient, Followers, LiveStatus} from "chzzk";
import {delay} from "../utils";
import {LiveInfo} from "../models/LiveInfo";

export type ChzzkEvents = {
    chat: ChzzkChat;
    liveInfo: LiveInfo;
};

export class ChzzkService{
    static async setAuth(nidAuth: string, nidSession: string): Promise<ChzzkService>{
        const client = new ChzzkClient({nidAuth, nidSession})

        // TODO: error count check
        let channelId = ''
        while(!channelId){
            try{
                channelId = (await client.user()).userIdHash
            }catch{
                await delay(1000)
            }
        }

        let liveStatus: LiveStatus | undefined;
        while(!liveStatus?.chatChannelId){
            try{
                liveStatus = await client.live.status(channelId)
            }catch{
                await delay(1000)
            }
        }

        const chat = client.chat(liveStatus.chatChannelId)
        chat.on('connect', () => chat.requestRecentChat(50));
        await chat.connect()
        return new ChzzkService(channelId, liveStatus, chat, client)
    }

    private _liveInfo: LiveInfo;
    private poll: NodeJS.Timeout;
    private readonly emitter = mitt<ChzzkEvents>();

    // event listener
    readonly on = this.emitter.on;

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
        this.poll = setInterval(async () => this.refreshLiveStatus(), 10 * 1000);
    }

    private async refreshLiveStatus(){
        const liveStatus = await this.client.live.status(this._liveInfo.channelId);
        if(!liveStatus){
            return;
        }

        // 19세 등의 이유로 chatChannelId가 null이 될 가능성이 있음
        if(liveStatus.chatChannelId && liveStatus.chatChannelId !== this._liveInfo.chatChannelId){
            if(this._chat.connected){
                await this._chat.disconnect()
            }
            this._chat = this.client.chat(liveStatus.chatChannelId)
            this.emitter.emit('chat', this._chat)

            this._chat.on('connect', () => this._chat.requestRecentChat(50));
            this._chat.connect().catch((e) => console.error(e))
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
        return this._chat
    }

    get liveInfo(): LiveInfo{
        return {...this._liveInfo} // 데이터 조작 방지를 위해 복제
    }

    async getFollowerData(size: number = 10): Promise<Followers>{
        let data: Followers | undefined;
        try{
            data = await this.client.manage.followers(this.liveInfo.channelId, {size})
        }catch{}
        return data || {page: 0, size: 0, totalCount: 0, totalPages: 0, data: []}
    }
}