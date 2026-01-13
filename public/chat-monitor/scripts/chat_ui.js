import {escapeHTML, formatTime} from "./utils.js";
import {currentLiveInfo} from "./chat.js";
import {showToast} from "./toast.js";

const MAX_MESSAGES = 1000;
const HEIGHT_THRESHOLD = 8; // 스크롤 여유 픽셀

const updateScrollButton = (isAtBottom) => {
    const button  = document.getElementById('scroll-button');
    if(typeof isAtBottom !== 'boolean'){
        const chat = document.getElementById('chat-container');
        isAtBottom = chat.scrollTop + chat.clientHeight >= chat.scrollHeight - HEIGHT_THRESHOLD;
    }
    if(isAtBottom){
        button.classList.add('hide');
    }else{
        button.classList.remove('hide');
    }
}

/**
 * @param {Record<string, any>} profile
 * @param {string} message
 * @param {number} msecs
 * @param {string|Record<string, any>} colorData
 * @param {Record<string, string>} emojiList
 * @param {string[]} badgeList
 */
export const addMessageBox = (profile, message, msecs = Date.now(), colorData = 'white', emojiList = {}, badgeList = []) => {
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

    while(chatBox.childElementCount > MAX_MESSAGES){
        chatBox.firstElementChild.remove();
    }

    const isAtBottom = chatBox.scrollHeight - (chatBox.scrollTop + chatBox.clientHeight + messageBoxDiv.clientHeight) <= HEIGHT_THRESHOLD;
    if(isAtBottom){
        chatBox.scrollTop = chatBox.scrollHeight;
    }
    updateScrollButton(isAtBottom);
}
export const removeMessageBox = (msecs) => {
    if(!Number.isFinite(msecs)) return;
    document.getElementById(msecs + '')?.remove();
}

export const updateNotice = (notice) => {
    if(typeof notice !== 'object') { // notice: null(제거) or object(공지)
        return;
    }

    const noticeContainer = document.getElementById('notice-container');
    if(!notice){
        noticeContainer.classList.add('hide');
    }else{
        noticeContainer.classList.remove('hide');
        noticeContainer.innerHTML = `<div>${notice.registerProfile.nickname}님이 고정</div><div>${notice.message}</div>`;

        let clickTimer;
        noticeContainer.onclick = (e) => {
            if(e.detail === 1){
                // 더블클릭이 아닌경우 내용 복제(dblclick은 약 200ms 뒤 실행되므로 200보다 소폭높은 timeout을 건다)
                clickTimer = setTimeout(async () => {
                    try{
                        await navigator.clipboard.writeText(notice.message)
                        showToast('내용이 복사되었습니다.')
                    }catch(e){
                        console.error(e)
                        showToast(e.toString())
                    }
                }, 400)
            }
        }
        noticeContainer.ondblclick = () => {
            clearTimeout(clickTimer);
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
                        noticeContainer.dblclick = () => {};
                    }else{
                        showToast('공지 제거 실패! 권한이 없습니다.')
                    }
                })
                .catch(() => showToast('공지 제거 실패! 권한이 없습니다.'))
        }
    }
}

export const updateLiveInfoUi = (newLiveInfo) => {
    // 채팅 ID가 달라진 경우(방송 시작등)
    if(currentLiveInfo?.chatChannelId && newLiveInfo.chatChannelId && newLiveInfo.chatChannelId !== currentLiveInfo?.chatChannelId){
        updateNotice(null); // 채널이 변경된 경우 공지는 자동으로 제거됨
        document.querySelectorAll('.message-box').forEach(element => element.remove())
    }

    const avatar = document.getElementById('streamer-avatar');
    avatar.className = newLiveInfo.isLive ? '' : 'offline';

    const divider = document.getElementById('divider');
    const userCount = document.getElementById('user-count');
    const liveTitle = document.getElementById('live-title');
    const liveCategory = document.getElementById('live-category');
    if(newLiveInfo.isLive){
        divider.textContent = '|';
        liveTitle.textContent = newLiveInfo.title;
        liveCategory.textContent = newLiveInfo.category.name;
        userCount.innerHTML = `<div></div>${newLiveInfo.viewership}`;
    }else{
        divider.textContent = '';
        liveTitle.textContent = '';
        liveCategory.textContent = '';
        userCount.innerHTML = '';
    }
}

export const clearChatBox = () => {
    const chatBox = document.getElementById('chat-container');
    while(chatBox.firstChild){
        chatBox.removeChild(chatBox.firstChild);
    }
}

window.addEventListener('DOMContentLoaded', () => {
    const chat = document.getElementById('chat-container');
    chat.addEventListener('scroll', updateScrollButton);

    const button  = document.getElementById('scroll-button');
    button.addEventListener('click', () => {
        chat.scrollTo({top: chat.scrollHeight, behavior: 'smooth'});
    });
});
