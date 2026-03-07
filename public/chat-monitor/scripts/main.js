import {pushTextToSpeech} from "./text-to-speech.js";
import {connectServer, onBlindCallbacks, onChatCallbacks, onLiveInfoCallbacks, onNoticeCallbacks} from "./chzzk-chat.js";
import {addMessageBox, removeMessageBox, updateLiveInfo, updateNotice, updateStreamerInfo} from "./ui-controller.js";
import {initSettings, ttsSettings} from "./setting-controller.js";
import {initNavbar} from "./navbar.js";

window.addEventListener('load', () => {
    onChatCallbacks.push((chat, connectTime) => {
        const {profile, message, date, colorData, emojiList, badgeList} = chat;
        if(connectTime < date){
            pushTextToSpeech(message, profile.nickname);
            const [command, ...args] = message.trim().split(' ');
            if(profile.userRoleCode === 'streamer' && command === '!tts'){
                ttsSettings.enabled = args[1]?.toLowerCase() === 'on'
            }
        }
        addMessageBox(profile, message, date, colorData, emojiList, badgeList);
    })
    onNoticeCallbacks.push(updateNotice)
    onBlindCallbacks.push(removeMessageBox)
    onLiveInfoCallbacks.push(updateLiveInfo)

    initNavbar();
    initSettings();
    connectServer(); // chzzk-helper server 접속
    updateStreamerInfo() // profile update

    // TTS 활성화(최소 1회 이상 클릭이 되어야 정책 위반 안됨)
    document.onclick = () => {
        if(ttsSettings.enabled){
            pushTextToSpeech('TTS 활성화');
            document.onclick = () => {};
        }
    }
})