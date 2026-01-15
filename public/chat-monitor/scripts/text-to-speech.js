import {ttsSettings} from "./setting-controller.js";

const EMOJI_REGEX = /\p{Extended_Pictographic}/gu; // 이모지 구분 정규식

const ttsQueue = [];
let isPlaying = false;

// 반복 단어 파악(도배 방지를 위해 추가)
function normalizeRepeatedText(text){
    const len = Math.floor(text.length / 4);
    for(let i = 1; i <= len; ++i){ // 문자열의 길이의 1/4 까지만 확인(4회이상 반복하는지 파악)
        let index = 0, count = 1;
        const substring = text.substring(0, i);
        while((index = text.indexOf(substring, index + i)) !== -1){
            ++count;
        }
        if(count > 3 && count * substring.length === text.length){
            const isEmoji = EMOJI_REGEX.test(substring);
            return substring.repeat(isEmoji || substring.length >= 3 ? 3 : Math.min(count, 8));
        }
    }
    return text;
}

export function pushTextToSpeech(text, nickname = 'Administrator'){
    if(!ttsSettings.enabled){
        return;
    }

    if(
        (ttsSettings.ignoreName.enabled && ttsSettings.ignoreName.regex.test(nickname)) || // 닉네임 무시
        (ttsSettings.ignoreMessage.enabled && ttsSettings.ignoreMessage.regex.test(text)) // 메시지 무시
    ){
        return;
    }

    if(ttsSettings.filterMessage.enabled){
        text = text.replace(ttsSettings.filterMessage.regex, '');
    }

    ttsQueue.push(normalizeRepeatedText(text));
    processQueue();
}

// 큐의 첫 번째 항목을 가져와 TTS 실행
function processQueue(){
    if(ttsQueue.length > 0 && !isPlaying){
        playTextToSpeech(ttsQueue.shift());
    }
}

// 텍스트를 음성으로 불러와 재생
const playTextToSpeech = (text) => {
    let ttsUrl;
    try{
        let urlData = localStorage.getItem('ttsURL') || '';
        ttsUrl = new URL(urlData);
    }catch{
        ttsUrl = new URL(location.origin + "/text-to-speech");
    }
    ttsUrl.searchParams.append('text', text);

    // 초기 설정
    isPlaying = true;
    let currentVolume = ttsSettings.volume / 100;
    const audio = new Audio(ttsUrl.toString());
    audio.volume = currentVolume;

    // 다음 재생을 위한 정리 함수
    const playNext = () => {
        if(!isPlaying) return; // 중복 실행 방지

        isPlaying = false;
        audio.onended = null;
        audio.pause();
        processQueue();
    };

    audio.onended = playNext;

    // --- 최대 재생 시간 제한 로직 ---
    const maxTime = ttsSettings.maximumPlayTime;
    if(maxTime <= 0){
        audio.play().catch(playNext);
        return;
    }

    // 0.5초 동안 서서히 볼륨 축소
    let fadeDuration = 0.5;
    audio.addEventListener('loadedmetadata', () => {
        // 오디오가 제한 시간보다 짧으면 간섭하지 않음
        if(audio.duration !== Infinity){
            fadeDuration = Math.min(0.5, audio.duration - maxTime);
        }
    });

    audio.addEventListener('playing', () => {
        if(fadeDuration <= 0) return;

        let startFadeTime = maxTime - fadeDuration;
        if(startFadeTime < 0) startFadeTime = 0;

        setTimeout(() => {
            if(audio.paused || !isPlaying) return;

            const intervalTime = 20; // 20ms(50fps) 씩 volume 감소
            const steps = (fadeDuration * 1000) / intervalTime;
            const volumeStep = currentVolume / steps;

            const fadeInterval = setInterval(() => {
                if(!isPlaying || audio.paused){
                    clearInterval(fadeInterval);
                    return;
                }

                if(audio.volume > volumeStep){
                    audio.volume -= volumeStep;
                }else{
                    audio.volume = 0;
                    clearInterval(fadeInterval);
                    playNext(); // 종료 및 다음 큐 실행
                }
            }, intervalTime);

        }, startFadeTime * 1000);
    });
}