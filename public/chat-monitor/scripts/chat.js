let client;

const getRequestUrl = () => window.localStorage.getItem('wsURL') || location.host

const sendChat = async (event) => {
    if(client?.readyState !== WebSocket.OPEN){
        showToast('치지직 도우미가 종료된것 같습니다. 치지직 도우미를 켠 후 다시 시도해주세요.')
        return
    }

    let input = event instanceof KeyboardEvent ? event.target : null
    if(input && event.key !== 'Enter'){
        return;
    }else if(!input){
        input = document.getElementById(`message-input`)
    }

    if(!input.value){
        return;
    }

    client.send(JSON.stringify({
        type: `SEND_MESSAGE`,
        message: input.value
    }))
    input.value = ''
    input.focus()
}

const connect = () => {
    if(client?.readyState === WebSocket.OPEN){
        return;
    }
    let connectTime = 0
    client = new WebSocket(`ws://${getRequestUrl()}/ws`)
    client.onopen = () => {
        clearChatBox()
        updateNotice(null)
        connectTime = Date.now()
        client.send(`CHATTING`)
    }
    client.onmessage = e => {
        try{
            const {chat, blind, notice, liveInfo} = JSON.parse(e.data.toString());
            updateLiveInfo(liveInfo);
            if(chat && typeof chat === 'object'){
                const {profile, message, date, colorData, emojiList, badgeList} = chat;
                if(connectTime < date){
                    addTTSQueue(profile, message)
                }
                addMessageBox(profile, message, date, colorData, emojiList, badgeList)
                removeMessageBox(blind)
            }
            updateNotice(notice)
        }catch(e){
            console.error(e);
        }
    }
    client.onclose = () => setTimeout(() => connect(), 1000)
}

// 채널명, 프사 취득하기
const updateSteamerInfo = async () => {
    let user
    while(!user){
        user = await (await fetch('/user-info')).json();
        if(!user){
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    }

    const nickname = document.getElementById('streamer-name');
    const avatar = document.getElementById('streamer-avatar');
    const defaultURL = avatar.src;
    avatar.src = user.profileImageUrl || defaultURL;
    avatar.onerror = () => avatar.src = defaultURL;
    nickname.textContent = user.nickname;
}

window.addEventListener('load', () => {
    const messageInput = document.getElementById('message-input');
    messageInput.addEventListener('keydown', sendChat)
    const sendBtn = document.getElementById('send-button')
    sendBtn.addEventListener('click', sendChat)

    updateSteamerInfo().catch(console.error);
    connect();
});