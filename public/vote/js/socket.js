let client
let voteMap = {}
let countVisible = true
let currentUserListIndex = -1

const getRequestUrl = () => window.localStorage.getItem('wsURL') || location.host

const startVote = (event) => {
    if(event.target.disabled){
        return
    }

    const elements = document.querySelectorAll('ol > li > input')
    if(elements.length < 2){
        showAlertModal('항목 없음', '투표할 항목을 입력해주세요')
        return
    }

    window.onbeforeunload = () => {
        showAlertModal('투표 진행중', '투표가 진행중입니다. 다른화면으로 이동하려면 투표를 마감해주세요.')
        return ''
    }

    
    event.target.disabled = true
    document.getElementById('endBtn').disabled = false
    document.getElementById('hideBtn').disabled = false
    document.getElementById('vote-title').innerText = '투표 - 진행중'

    const last = elements[elements.length - 1]
    last.parentElement.remove()
    for(let i = 0; i < elements.length - 1; ++i){
        const input = elements[i]
        input.readOnly = true
        input.style.cursor = 'pointer'

        const span = input.parentElement.children[1]
        span.style.cursor = ''
        span.onclick = () => {}

        const li = input.parentElement
        li.style.cursor = 'pointer'
        li.onclick = () => {
            if(currentUserListIndex === i){
                li.style.boxShadow = ''
                li.style.borderColor = '#0000'
                changeUserListIndex(-1)
            }else{
                li.style.borderColor = '#24fd24'
                li.style.boxShadow = '0px 1px 4px rgba(0, 0, 0, 0.6)'
                if(currentUserListIndex !== -1){
                    const beforeSelectedLi = document.querySelectorAll(`ol > li`)[currentUserListIndex]
                    beforeSelectedLi.style.boxShadow = ''
                    beforeSelectedLi.style.borderColor = '#0000'
                }
                changeUserListIndex(i)
            }
        }
    }
    updateVoteCount()
}

const endVote = (event) => {
    event.target.disabled = true
    window.onbeforeunload = null
    document.getElementById(`hideBtn`).disabled = true
    document.getElementById('vote-title').innerText = '투표 - 마감'
    if(!countVisible){
        countVisible = true
        updateVoteCount()
    }
}

const updateVoteCount = (elements) => {
    if(!document.getElementById('startBtn').disabled){
        return
    }

    elements = elements || document.querySelectorAll('ol > li > span')
    const totalCount = new Array(elements.length).fill(0)
    for(const id in voteMap){
        ++totalCount[voteMap[id].index]
    }
    for(const index in elements){
        elements[index].innerHTML = (countVisible ? totalCount[index] : '?') + '명'
    }
    document.getElementById('user-total-count').innerText = `(총 ${totalCount.reduce((a, c) => a + c)}명)`
}

const changeUserListIndex = (index) => {
    if(currentUserListIndex === index){
        return
    }

    currentUserListIndex = index
    const userList = document.getElementById('user-list')
    while(userList.lastChild){
        userList.removeChild(userList.lastChild)
    }

    let current = 0
    for(const userId in voteMap){
        const voteData = voteMap[userId]
        if(voteData.index !== index && index !== -1){
            continue
        }
        ++current
        const element = document.createElement('div')
        element.id = voteData.user.userIdHash
        element.innerText = voteData.user.nickname
        element.classList.add('user')
        userList.appendChild(element)
    }
    document.getElementById('user-current-count').innerText = current + '명'
}

const addVoteData = (user, index) => {
    if(typeof index !== 'number' || isNaN(index) || !isFinite(index)){
        return
    }

    const elements = document.querySelectorAll('ol > li > span')
    if(0 > index || index > elements.length){
        return
    }

    const before = voteMap[user.userIdHash]
    voteMap[user.userIdHash] = {user, index}
    updateVoteCount(elements)

    if(index !== currentUserListIndex && currentUserListIndex !== -1){
        before && document.getElementById(user.userIdHash)?.remove()
        return
    }

    if(document.getElementById(user.userIdHash)){
        return
    }
    const userDiv = document.createElement('div')
    userDiv.id = user.userIdHash
    userDiv.innerText = user.nickname
    userDiv.classList.add('user')
    document.getElementById('user-list').appendChild(userDiv)
    
    const voteCurrent = document.getElementById('user-current-count')
    voteCurrent.innerText = (parseInt(voteCurrent.innerText) + 1) + '명'
}

const changeCountVisibility = (event) => {
    countVisible = !countVisible
    event.target.innerText = countVisible ? '숨기기' : '보이기'
    updateVoteCount()
}

const sendChat = async (event) => {
    if(client?.readyState !== WebSocket.OPEN){
        showAlertModal('연결 실패', '서버와의 연결이 끊긴것 같습니다. 잠시 후 다시 시도해주세요.')
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
        return
    }

    client?.close()
    client = new WebSocket(`ws://${getRequestUrl()}/ws`)
    client.onopen = () => client.send('VOTE')
    client.onmessage = (e) => {
        try{
            const data = JSON.parse(e.data.toString())

            const chat = document.createElement('div')
            chat.style = 'margin: 0 20px'
            chat.innerText = data.user.nickname + ' : ' + data.message // TODO: show emoji

            const chatBox = document.getElementById('chatting-context-container')
            chatBox.appendChild(chat)
            chatBox.scrollTop = chatBox.scrollHeight // chat auto scroll

            if(
                document.getElementById('startBtn').disabled &&
                !document.getElementById('endBtn').disabled &&
                data.message.startsWith('!투표')
            ){
                addVoteData(data.user, parseInt(data.message.split(' ')[1] || '') - 1)
            }
        }catch(e){
            console.log(e)
        }
    }
    client.onclose = () => setTimeout(() => connect(), 1000)
}