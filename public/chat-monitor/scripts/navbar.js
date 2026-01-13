import {currentLiveInfo} from "./chat.js";
import {showToast} from "./toast.js";
import {ttsSettings} from "./tts.js";

const toggleState = (button) => {
    for(const child of button.children){
        child.classList.toggle('hide');
    }
}

window.addEventListener("load", () => {
    // 토글 버튼 초기화
    const buttonList = document.querySelectorAll('.button.toggle');
    buttonList.forEach(button => {
        const saveName = button.dataset.saveName
        if(saveName && localStorage.getItem(saveName) !== '0'){
            toggleState(button)
        }
        button.addEventListener('click', () => toggleState(button))
    })

    // TTS 활성화 전환 버튼
    const ttsButton = document.getElementById('tts-button');
    ttsButton.addEventListener('click', () => {
        ttsSettings.enabled = !ttsSettings.enabled;
        showToast(ttsSettings.enabled ? 'TTS 기능이 활성화 되었습니다' : 'TTS 기능이 비활성화 되었습니다.')
    })

    // 공지 등록 기능
    const chatContainer = document.getElementById('chat-container');
    const noticeButton = document.getElementById('notice-button');
    noticeButton.addEventListener('click', () => {
        chatContainer.classList.toggle('select-notice');
        if(chatContainer.classList.contains('select-notice')){
            showToast('고정을 원하는 메시지를 선택해주세요');
            chatContainer.onclick = (e) => {
                const messageBox = e.target.closest('.message-box'); // 가장 가까운 .message-box 탐색
                if(!messageBox) return;

                toggleState(noticeButton)
                chatContainer.onclick = () => {}
                chatContainer.classList.remove('select-notice')
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
            chatContainer.onclick = () => {}
        }
    })

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