let client;

const getRequestUrl = () => window.localStorage.getItem('wsURL') || location.host

const connect = () => {
    if(client?.readyState === WebSocket.OPEN){
        return;
    }
    client = new WebSocket(`ws://${getRequestUrl()}/ws`)
    client.onopen = () => {
        clearChatBox();
        client.send(`CHATTING`)
    }
    client.onmessage = e => {
        try{
            const {chat, notice, liveInfo} = JSON.parse(e.data.toString());
            updateLiveInfo(liveInfo);
            if(chat && typeof chat === 'object'){
                const {profile, message, date, colorData, emojiList, badgeList} = chat;
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
                            channelId: chzzkChat?.chatChannelId,
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

    // Modal UI
    const modal = document.getElementById('settings-modal');
    const settingsButton = document.getElementById('settings-button');
    settingsButton.onclick = () => {
        modal.classList.add('show');
    };
    modal.onclick = (e) => {
        if(e.target === modal){
            modal.classList.remove('show');
        }
    }

    // 공지 기능
    const chatContainer = document.getElementById('chat-container');
    const noticeButton = document.getElementById('notice-button');
    noticeButton.onclick = () => {
        chatContainer.classList.toggle('select-notice');
        if(chatContainer.classList.contains('select-notice')){
            showToast('고정을 원하는 메시지를 선택해주세요');
            chatContainer.onclick = (e) => {
                const messageBox = e.target.closest('.message-box'); // 가장 가까운 .message-box 탐색
                if(!messageBox) return;

                chatContainer.onclick = () => {};
                chatContainer.classList.remove('select-notice');
                /*fetch('/notice', {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        channelId: chzzkChat?.chatChannelId,
                        messageTime: +messageBox.id,
                        messageUserIdHash: messageBox.dataset.userIdHash,
                        streamingChannelId: liveInfo?.channelId
                    })
                })
                    .then(async (res) => {
                        const data = await res.json();
                        if(!res.ok || data.code !== 200){
                            showToast('공지 등록 실패! 권한이 없습니다.')
                        }
                    })
                    .catch(() => showToast('공지 등록 실패! 권한이 없습니다.'))*/
            };
        }else{
            chatContainer.onclick = () => {};
        }
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