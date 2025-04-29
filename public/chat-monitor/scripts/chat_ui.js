let liveInfo;

const escapeHTML = (text) => text.replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

const formatTime = (msecs) => {
    msecs = new Date(msecs)
    const h = String(msecs.getHours()).padStart(2, '0')
    const m = String(msecs.getMinutes()).padStart(2, '0')
    return `[${h}:${m}]`
}

const addMessageBox = (profile, message, msecs = Date.now(), colorData = 'white', emojiList = {}, badgeList = []) => {
    const chatBox = document.getElementById('chat-container');
    const messageBoxDiv = document.createElement('div')
    messageBoxDiv.id = msecs + ''
    messageBoxDiv.dataset.userIdHash = profile.userIdHash
    messageBoxDiv.className = 'message-box'
    chatBox.appendChild(messageBoxDiv)

    const timeSpan = document.createElement('span')
    timeSpan.className = 'time'
    timeSpan.textContent = formatTime(msecs);
    messageBoxDiv.appendChild(timeSpan);

    for(const badgeUrl of badgeList){
        const badgeImg = document.createElement('img')
        badgeImg.alt = 'badge'
        badgeImg.src = badgeUrl
        badgeImg.className = 'badge'
        messageBoxDiv.appendChild(badgeImg)
    }

    const userSpan = document.createElement('span')
    userSpan.className = 'nickname'
    userSpan.textContent = profile.nickname
    if(typeof colorData === 'string'){
        userSpan.style.color = colorData
    }else{
        switch(colorData.effectType){
            case 'GRADATION':
                const direction = colorData.effectValue.direction.toLowerCase();
                const startColor = colorData.darkRgbValue;
                const endColor = colorData.effectValue.darkRgbEndValue;
                userSpan.style.backgroundImage = `linear-gradient(to ${direction}, ${startColor}, ${endColor})`;
                userSpan.style.backgroundClip = 'text';
                userSpan.style.webkitBackgroundClip = 'text';
                userSpan.style.color = 'transparent';
                break;
            case 'HIGHLIGHT':
                userSpan.style.color = colorData.darkRgbValue;
                userSpan.style.backgroundColor = colorData.effectValue.darkRgbBackgroundValue;
                break;
            case 'STEALTH':
                userSpan.style.color = 'transparent';
                break;
        }
    }
    messageBoxDiv.appendChild(userSpan)

    const messageSpan = document.createElement('span')
    messageSpan.className = 'message'

    message = escapeHTML(message)
    for(const emojiName in emojiList){
        message = message.replaceAll(`{:${emojiName}:}`, `<img class='emoji' src='${emojiList[emojiName]}' alt="emoji">`)
    }
    messageSpan.innerHTML = ` : ${message}`
    messageBoxDiv.appendChild(messageSpan)

    const threshold = 10; // 오차 허용값 (px)
    if(chatBox.scrollHeight - (chatBox.scrollTop + chatBox.clientHeight + messageBoxDiv.clientHeight) <= threshold){
        chatBox.scrollTop = chatBox.scrollHeight;
    }
}

const updateLiveInfo = (newLiveInfo) => {
    if(!newLiveInfo || typeof newLiveInfo !== 'object'){
        return;
    }

    if(liveInfo?.chatChannelId && newLiveInfo.chatChannelId && newLiveInfo.chatChannelId !== liveInfo?.chatChannelId){
        // 채팅 ID가 달라진 경우 새 채팅 채널에 접속했다는 뜻임
        document.querySelectorAll('.message-box').forEach(element => element.remove())
    }

    liveInfo = newLiveInfo;
    const avatar = document.getElementById('streamer-avatar');
    avatar.className = liveInfo.isLive ? '' : 'offline';

    const divider = document.getElementById('divider');
    const userCount = document.getElementById('user-count');
    const liveTitle = document.getElementById('live-title');
    const liveCategory = document.getElementById('live-category');
    if(liveInfo.isLive){
        divider.textContent = '|';
        liveTitle.textContent = liveInfo.title;
        liveCategory.textContent = liveInfo.category.name;
        userCount.innerHTML = `<div></div>${liveInfo.viewership}`;
    }else{
        divider.textContent = '';
        liveTitle.textContent = '';
        liveCategory.textContent = '';
        userCount.innerHTML = '';
    }
}

const clearChatBox = () => {
    const chatBox = document.getElementById('chat-container');
    while(chatBox.firstChild){
        chatBox.removeChild(chatBox.firstChild);
    }
}