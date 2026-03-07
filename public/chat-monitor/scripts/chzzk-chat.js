import {showToast} from "../../assets/js/toast.js";
import {clearChatBox, updateNotice} from "./ui-controller.js";

let client;
export let currentLiveInfo;

export const onChatCallbacks = [];
export const onBlindCallbacks = [];
export const onNoticeCallbacks = [];
export const onLiveInfoCallbacks = [];

export const connectServer = () => {
    if(client?.readyState === WebSocket.OPEN){
        return;
    }
    let connectTime = 0
    let wsUrl = window.localStorage.getItem('wsURL') || location.host;
    client = new WebSocket(`ws://${wsUrl}/ws`)
    client.onopen = () => {
        // -------------- TODO: HACK --------------
        clearChatBox()
        updateNotice(null)
        // -------------- TODO: HACK --------------
        connectTime = Date.now()
        client.send(`CHATTING`)
    }
    client.onmessage = e => {
        try{
            const {chat, blind, notice, liveInfo} = JSON.parse(e.data.toString());
            if(chat && typeof chat === 'object'){
                onChatCallbacks.forEach(func => func(chat, connectTime));
            }
            if(blind) onBlindCallbacks.forEach(func => func(blind));
            onNoticeCallbacks.forEach(func => func(notice));
            if(liveInfo) {
                const before = currentLiveInfo;
                currentLiveInfo = liveInfo;
                onLiveInfoCallbacks.forEach(func => func(before, liveInfo));
            }
        }catch(e){
            console.error(e);
        }
    }
    client.onclose = () => setTimeout(() => connectServer(), 1000)
}

export async function sendChat(input){
    if(client?.readyState !== WebSocket.OPEN){
        showToast('치지직 도우미가 종료된것 같습니다. 치지직 도우미를 켠 후 다시 시도해주세요.')
        return
    }

    if(!input?.value){
        return;
    }

    client.send(JSON.stringify({type: `SEND_MESSAGE`, message: input.value}))
    input.value = ''
    input.focus()
}