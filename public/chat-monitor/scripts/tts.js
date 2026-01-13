const ttsQueue = [];
let isPlaying = false;

const emojiRegex = /\p{Extended_Pictographic}/gu; // 이모지 구분 정규식
export const ttsSettings = {
    get enabled(){
        return toBoolean(localStorage.getItem('enableTTS'))
    },
    set enabled(value){
        localStorage.setItem('enableTTS', toBoolean(value) + '');
    },

    get maximumPlayTime(){
        return +localStorage.getItem('ttsMaxTime') || 0
    },
    set maximumPlayTime(value){
        localStorage.setItem('ttsMaxTime', (+value || 0) + '');
    },

    get volume(){
        return +localStorage.getItem('ttsVolume') || 100;
    },
    set volume(value){
        localStorage.setItem('ttsVolume', (+value || 0) + '');
    },

    // 닉네임 무시 (해당되는 닉네임의 채팅 안읽음)
    ignoreName: createSetting('ttsIgnoreName', /^.*(봇|bot)$/i),
    // 메시지 무시 (해당되는 메시지 안읽음)
    ignoreMessage: createSetting('ttsIgnoreMessage', /^[!$/].*$/u),
    // 메시지 필터링 (특정 문자를 ''로 치환)
    filterMessage: createSetting('ttsFilterMessage', /\p{Extended_Pictographic}|\{:.*:\}/gu),
};

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
            const isEmoji = emojiRegex.test(substring);
            return substring.repeat(isEmoji || substring.length >= 3 ? 3 : Math.min(count, 8));
        }
    }
    return text;
}

export function addTTSQueue(profile, text){
    if(!ttsSettings.enabled){
        return;
    }

    if(
        (ttsSettings.ignoreName.enabled && ttsSettings.ignoreName.regex.test(profile.nickname)) || // 닉네임 무시
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
const processQueue = ()  => {
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
    isPlaying = true;
    const audio = new Audio(ttsUrl.toString());
    const volume = +localStorage.getItem('ttsVolume') || 100;
    audio.volume = volume / 100;
    const playNext = () => {
        isPlaying = false;
        processQueue();
    }
    audio.onended = playNext;
    audio.play().catch(playNext);
}

// 내부적으로 Google API를 사용중일때엔 CORS에대한 위험이 없음
const playTTSByGoogle = async (text) => {
    isPlaying = true;
    try{
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const res = await fetch(`/text-to-speech?text=${encodeURIComponent(text)}`);
        const arrayBuffer = await res.arrayBuffer();
        const audioBuffer = await ctx.decodeAudioData(arrayBuffer);

        const maxTime = (+ttsSettings.maximumPlayTime || 0);
        const duration = audioBuffer.duration;

        const gainNode = ctx.createGain();
        gainNode.gain.value = 1;

        const audioBufferSource = ctx.createBufferSource();
        audioBufferSource.buffer = audioBuffer;
        audioBufferSource.connect(gainNode).connect(ctx.destination);

        // fade-out 조건: 실제 길이가 maxTime보다 길 경우에만 적용
        if(duration > maxTime){
            const fadeTime = 0.4; // 줄어들게될 시간, secs
            const fadeOutStart = maxTime - .5;
            setTimeout(() => {
                const interval = 50; // 간격, msecs
                const steps = Math.ceil(fadeTime * 100 / interval);
                let currentStep = 0;
                const volumeFade = setInterval(() => {
                    currentStep++;
                    gainNode.gain.value = 1 - (currentStep / steps);
                    if(currentStep >= steps){
                        clearInterval(volumeFade);
                    }
                }, interval);
            }, fadeOutStart * 1000);

            // 최대 재생 시간 경과 후 중단
            setTimeout(() => {
                audioBufferSource.stop();
                ctx.close();
                isPlaying = false;
                processQueue();
            }, maxTime * 1000);
        }else{
            audioBufferSource.onended = () => {
                ctx.close();
                isPlaying = false;
                processQueue();
            };
        }
        audioBufferSource.start();
    }catch(error){
        isPlaying = false;
        processQueue();
    }
}

window.addEventListener('load', () => {
    document.onclick = () => {
        if(localStorage.getItem('enableTTS') === '0'){
            return;
        }

        playTextToSpeech('TTS 활성화');
        document.onclick = () => {};
    }
})