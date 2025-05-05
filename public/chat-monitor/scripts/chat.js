let client;

const getRequestUrl = () => window.localStorage.getItem('wsURL') || location.host

const connect = () => {
    if(client?.readyState === WebSocket.OPEN){
        return;
    }
    let connectTime = 0
    client = new WebSocket(`ws://${getRequestUrl()}/ws`)
    client.onopen = () => {
        clearChatBox();
        connectTime = Date.now();
        client.send(`CHATTING`)
    }
    client.onmessage = e => {
        try{
            const {chat, notice, liveInfo} = JSON.parse(e.data.toString());
            updateLiveInfo(liveInfo);
            if(chat && typeof chat === 'object'){
                const {profile, message, date, colorData, emojiList, badgeList} = chat;
                if(connectTime < date){
                    addTTSQueue(message, profile)
                }
                addMessageBox(profile, message, date, colorData, emojiList, badgeList)
            }
            if(typeof notice !== 'object') { // null or object
                return;
            }

            const noticeContainer = document.getElementById('notice-container');
            if(!notice){
                noticeContainer.classList.add('hide');
            }else{
                noticeContainer.classList.remove('hide');
                noticeContainer.innerHTML = `<div>${notice.registerProfile.nickname}님이 고정</div><div>${notice.message}</div>`;
                noticeContainer.onclick = () => {
                    fetch('/notice', {
                        method: "DELETE",
                        headers: {
                            "Content-Type": "application/json",
                        },
                        body: JSON.stringify({
                            channelId: currentLiveInfo.chatChannelId,
                        })
                    })
                        .then(async (res) => {
                            const data = await res.json();
                            if(res.ok && data.code === 200){
                                noticeContainer.onclick = () => {};
                            }else{
                                showToast('공지 제거 실패! 권한이 없습니다.')
                            }
                        })
                        .catch(() => showToast('공지 제거 실패! 권한이 없습니다.'))
                }
            }
        }catch(e){
            console.error(e);
        }
    }
    client.onclose = () => setTimeout(() => connect(), 1000)
}

window.addEventListener('load', async () => {
    document.onclick = () => {
        addTTSQueue('TTS 활성화');
        document.onclick = () => {};
    }

    // 채널명, 프사 취득하기
    const user = await (await fetch('/user-info')).json();
    const nickname = document.getElementById('streamer-name');
    const avatar = document.getElementById('streamer-avatar');
    const defaultURL = avatar.src;
    avatar.src = user.profileImageUrl || defaultURL;
    avatar.onerror = () => {
        avatar.src = defaultURL;
    };
    nickname.textContent = user.nickname;
    connect();
});