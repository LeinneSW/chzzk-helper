import {ChzzkChat, ChzzkClient, Followers} from "chzzk";
import {delay} from "../utils/utils";

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
            const chat = client.chat({channelId, pollInterval: 10 * 1000})
            let once = false;
            chat.on('connect', () => {
                if(!once){
                    once = true;
                    chat.requestRecentChat(50);
                }
            });
            await chat.connect()
            this._instance = new Chzzk(chat, client, channelId)
            return true
        }
        return false
    }

    private constructor(
        public readonly chat: ChzzkChat,
        public readonly client: ChzzkClient,
        public readonly channelId: string
    ){}

    async getFollowerData(size: number = 10): Promise<Followers>{
        try{
            const data = await this.client.manage.followers(this.channelId, {size})
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