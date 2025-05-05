window.addEventListener("load", () => {
    // TTS 활성화 전환 버튼
    const updateButton = () => {
        if(localStorage.getItem('enableTTS') === '0'){ // TTS 비활성화
            document.querySelector('.bi.bi-megaphone').style.display = ''
            document.querySelector('.bi.bi-megaphone-fill').style.display = 'none'
        }else{ // TTS 활성화
            document.querySelector('.bi.bi-megaphone').style.display = 'none'
            document.querySelector('.bi.bi-megaphone-fill').style.display = ''
        }
    }

    updateButton()
    const ttsButton = document.getElementById('tts-button');
    ttsButton.onclick = () => {
        const enabled = localStorage.getItem('enableTTS') || '1'
        localStorage.setItem('enableTTS', (+enabled + 1) % 2 + '')
        showToast(enabled === '1' ? 'TTS 기능이 비활성화 되었습니다.' : 'TTS 기능이 활성화 되었습니다')
        updateButton()
    }

    // 공지 등록 기능
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
                fetch('/notice', {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        channelId: currentLiveInfo?.chatChannelId,
                        messageTime: +messageBox.id,
                        messageUserIdHash: messageBox.dataset.userIdHash,
                        streamingChannelId: currentLiveInfo?.channelId
                    })
                })
                    .then(async (res) => {
                        const data = await res.json();
                        if(!res.ok || data.code !== 200){
                            showToast('공지 등록 실패! 권한이 없습니다.')
                        }
                    })
                    .catch(() => showToast('공지 등록 실패! 권한이 없습니다.'))
            };
        }else{
            chatContainer.onclick = () => {};
        }
    }

    // 설정 모달 버튼
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
})