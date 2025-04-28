let client;

const getRequestUrl = () => window.localStorage.getItem('wsURL') || location.host

const escapeHTML = (text) => text.replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

const addMessageBox = (profile, message, date = Date.now(), colorData = 'white', emojiList = {}, badgeList = []) => {
    const messageBoxDiv = document.createElement('div')
    messageBoxDiv.className = 'message-box'
    messageBoxDiv.id = date + ''
    messageBoxDiv.dataset.userIdHash = profile.userIdHash
    document.body.appendChild(messageBoxDiv)

    setTimeout(() => messageBoxDiv.style.opacity = '1', 50)

    for(const badgeUrl of badgeList){
        const badgeImg = document.createElement('img')
        badgeImg.alt = 'badge'
        badgeImg.src = badgeUrl
        badgeImg.className = 'badge'
        messageBoxDiv.appendChild(badgeImg)
    }

    const userSpan = document.createElement('span');
    userSpan.className = 'nickname';
    const effectType = typeof colorData === 'string' ? 'NORMAL' : colorData.effectType;
    if(effectType !== 'GRADATION'){
        userSpan.textContent = profile.nickname;
        switch(effectType){
            case 'HIGHLIGHT':
                userSpan.style.color = colorData.lightRgbValue;
                userSpan.style.backgroundColor = colorData.effectValue.lightRgbBackgroundValue;
                break;
            case 'STEALTH':
                userSpan.style.color = 'transparent';
                break;
            default:
                userSpan.style.color = colorData;
                userSpan.className += ' text-shadow';
                break;
        }
    }else{
        // 그라데이션일 때만 shadow + gradient로 분리
        const shadowSpan = document.createElement('span');
        shadowSpan.className = 'text-shadow';
        shadowSpan.textContent = profile.nickname;

        const gradientSpan = document.createElement('span');
        gradientSpan.textContent = profile.nickname;

        const direction = colorData.effectValue.direction.toLowerCase();
        const startColor = colorData.lightRgbValue;
        const endColor = colorData.effectValue.lightRgbEndValue;
        gradientSpan.style.backgroundImage = `linear-gradient(to ${direction}, ${startColor}, ${endColor})`;
        gradientSpan.style.backgroundClip = 'text';
        gradientSpan.style.webkitBackgroundClip = 'text';
        gradientSpan.style.color = 'transparent';

        userSpan.appendChild(shadowSpan);
        userSpan.appendChild(gradientSpan);
    }
    messageBoxDiv.appendChild(userSpan);

    const messageSpan = document.createElement('span')
    messageSpan.className = 'message text-shadow'

    message = escapeHTML(message)
    for(const emojiName in emojiList){
        message = message.replaceAll(`{:${emojiName}:}`, `<img class='emoji' src='${emojiList[emojiName]}' alt="emoji">`)
    }
    messageSpan.innerHTML = ` : ${message}`
    messageBoxDiv.appendChild(messageSpan)
}

const connect = () => {
    if(client?.readyState === WebSocket.OPEN){
        return;
    }
    client = new WebSocket(`ws://${getRequestUrl()}/ws`)
    client.onopen = () => client.send(`CHATTING`)
    client.onmessage = e => {
        try{
            const {profile, message, date, colorData, emojiList, badgeList} = JSON.parse(e.data.toString())
            addMessageBox(profile, message, date, colorData, emojiList, badgeList)
        }catch{}
    }
    client.onclose = () => setTimeout(() => connect(), 1000)
}

window.addEventListener('load', () => {
    connect()
    setInterval(() => {
        const current = Date.now()
        const messageRemainSeconds = (localStorage.getItem('messageRemainSeconds') || 0) * 1000
        if(messageRemainSeconds < 1){
            return
        }

        const messageBoxList = document.querySelectorAll(`body > .message-box`)
        for(let i = 0; i < messageBoxList.length - 30; ++i){
            const box = messageBoxList[i];
            box.style.opacity = '0'
            setTimeout(() => box?.remove(), 1000);
        }
        for(const box of messageBoxList){
            if(current - box.id >= messageRemainSeconds){
                box.style.opacity = '0'
            }
        }
    }, 50)
})