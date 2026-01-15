import {showToast} from "../../assets/js/toast.js";
import {pushTextToSpeech} from "./text-to-speech.js";
import {addMessageBox, clearChatBox, removeMessageBox, updateLiveInfoUi, updateNotice} from './ui-controller.js'
import {ttsSettings} from "./setting-controller.js";

let client;
export let currentLiveInfo;

export const connectServer = () => {
    if(client?.readyState === WebSocket.OPEN){
        return;
    }
    let connectTime = 0
    let wsUrl = window.localStorage.getItem('wsURL') || location.host;
    client = new WebSocket(`ws://${wsUrl}/ws`)
    client.onopen = () => {
        clearChatBox()
        updateNotice(null)
        connectTime = Date.now()
        client.send(`CHATTING`)
    }
    client.onmessage = e => {
        try{
            const {chat, blind, notice, liveInfo} = JSON.parse(e.data.toString());
            removeMessageBox(blind)
            updateLiveInfo(liveInfo);
            if(chat && typeof chat === 'object'){
                const {profile, message, date, colorData, emojiList, badgeList} = chat;
                if(profile.userRoleCode === 'streamer' && message.startsWith('!tts')){
                    ttsSettings.enabled = message.split(' ')[1]?.toLowerCase() === 'on'
                }
                if(connectTime < date){
                    pushTextToSpeech(message, profile.nickname)
                }
                addMessageBox(profile, message, date, colorData, emojiList, badgeList)
            }
            updateNotice(notice)
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

const updateLiveInfo = (newLiveInfo) => {
    if(!newLiveInfo || typeof newLiveInfo !== 'object'){
        return;
    }

    updateLiveInfoUi(newLiveInfo)
    currentLiveInfo = newLiveInfo;
}