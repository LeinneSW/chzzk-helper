import {pushTextToSpeech} from "./text-to-speech.js";
import {connectServer} from "./chzzk-chat.js";
import {updateStreamerInfo} from "./ui-controller.js";
import {initSettings, ttsSettings} from "./setting-controller.js";
import {initNavbar} from "./navbar.js";

window.addEventListener('load', () => {
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