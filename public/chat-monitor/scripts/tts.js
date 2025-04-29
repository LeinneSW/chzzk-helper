const ttsQueue = [];
let isPlaying = false;

const emojiRegex = /\p{Extended_Pictographic}/gu; // 이모지 구분 정규식
const options = (() => {
    const defaultOptions = {
        name: { // 이름 필터링(특정 규칙의 이름은 TTS가 읽지 않음)
            enabled: true,
            regex: /^.*(봇|bot)$/i,
        },
        message: { // 문자열 필터링(특정 채팅 생략되어 재생되는 기능)
            enabled: false,
            regex: /\p{Extended_Pictographic}|\{:.*:\}/gu,
        },
        messageSkip: { // 문자열 스킵(특정 규칙의 채팅은 아예 TTS로 읽지 않음)
            enabled: true,
            regex: /^[!$/].*$/u, // 각종 명령어들 TTS 제외처리
        },
        maximumPlayTime: 0, // 1회 채팅당 최대 재생 시간, 초단위
    };
    try{
        const {name, message, messageSkip, maximumPlayTime} = JSON.parse(localStorage.getItem('options') || '{}');
        typeof name?.enabled == 'boolean' && (defaultOptions.name.enabled = name.enabled);
        typeof name?.regex == 'string' && (defaultOptions.name.regex = name.regex);

        typeof message?.enabled == 'boolean' && (defaultOptions.message.enabled = message.enabled);
        typeof message?.regex == 'string' && (defaultOptions.message.regex = message.regex);

        typeof messageSkip?.enabled == 'boolean' && (defaultOptions.messageSkip.enabled = messageSkip.enabled);
        typeof messageSkip?.regex == 'string' && (defaultOptions.messageSkip.regex = messageSkip.regex);

        maximumPlayTime != null && (defaultOptions.maximumPlayTime = +maximumPlayTime || defaultOptions.maximumPlayTime);
    }catch(e){
        console.error(e);
    }
    return defaultOptions;
})();

const saveOptions = () => {
    try{
        localStorage.setItem('options', JSON.stringify(options));
    }catch(e){
        console.error(e);
    }
}

// 반복 단어 파악(도배 방지를 위해 추가)
const normalizeRepeatedText = (text) => {
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

const addTTSQueue = (text, nickname) => {
    if(localStorage.getItem('enableTTS') !== '1'){
        return;
    }

    // 특정 닉네임, 문자열 제외 기능
    if(
        (options.name.enabled && nickname != null && options.name.regex.test(nickname)) ||
        (options.messageSkip.enabled && options.messageSkip.regex.test(text))
    ){
        return;
    }

    if(options.message.enabled){
        text = text.replace(options.message.regex, '');
    }

    ttsQueue.push(normalizeRepeatedText(text));
    processQueue();
}

// 큐의 첫 번째 항목을 가져와 TTS 실행
const processQueue = ()  => {
    if(ttsQueue.length > 0 && !isPlaying){
        playTTS(ttsQueue.shift());
    }
}

// 텍스트를 음성으로 불러와 재생
const playTTS = (text) => {
    let ttsUrl;
    try{
        let urlData = localStorage.getItem('ttsURL') || '';
        ttsUrl = new URL(urlData);
    }catch{
        ttsUrl = new URL(location.origin + "/text-to-speech");
    }
    ttsUrl.searchParams.append('text', text);
    // TODO: maximumPlayTime 기능 구현
    /*const maxTime = (+options.maximumPlayTime || 0);
    if(maxTime > 0){
        playTTSByGoogle(text);
    }*/
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

        const maxTime = (+options.maximumPlayTime || 0);
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
};