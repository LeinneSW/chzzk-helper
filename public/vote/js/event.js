const random = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min

const showAlertModal = (title, message) => {
    document.getElementById('alertTitle').innerText = title
    document.getElementById('modalContext').innerText = message
    new bootstrap.Modal(document.getElementById('alertModal')).show()
}

const addVoteItem = (input) => {
    const voteContext = input.value
    if(!voteContext){
        return
    }

    const list = document.querySelectorAll('#vote-item-list > li > input')
    if(list[list.length - 1] === input){
        input.value = ''
        const element = input.parentElement.cloneNode(true)
        input.parentElement.parentElement.appendChild(element)
        input.value = voteContext
        element.children[0].focus()

        const span = input.parentElement.children[1]
        span.innerHTML = 'X'
        span.style.cursor = 'pointer'
        span.onclick = (event) => {event.target.parentElement.remove()}
    }
}

const focusEvent = (event) => {
    if(document.getElementById('startBtn').disabled){
        return
    }
    addVoteItem(event.target)
}

window.addEventListener('load', () => {
    const chattingInput = document.getElementById('chatting-input')
    chattingInput.addEventListener('keydown', sendChat)
    const sendBtn = document.getElementById('send-button')
    sendBtn.addEventListener('click', sendChat)
})