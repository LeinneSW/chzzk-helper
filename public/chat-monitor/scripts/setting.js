const setInputValue = (input, suffix = '') => {
    input.nextElementSibling.textContent = input.value + suffix
    const customCss = input.dataset.customCss
    customCss && document.documentElement.style.setProperty(customCss, input.value + 'px')
}

const showTooltip = (option) => {
    if(option.nextElementSibling.classList.contains('tooltip')){
        // 모종의 이유로 툴팁이 삭제되지 않은경우
        return
    }

    const description = option.dataset.description
    if(!description){
        return
    }


    const tooltip = document.createElement('div')
    tooltip.className = 'tooltip'
    tooltip.innerHTML = description.replaceAll('\\n', '<br>')
    option.parentNode.insertBefore(tooltip, option.nextElementSibling)
    tooltip.style.top = (option.getBoundingClientRect().top - tooltip.offsetHeight) + 'px'
}

const hideTooltip = (option) => {
    const tooltip = option.nextElementSibling
    if(tooltip.classList.contains('tooltip')){
        tooltip.remove()
    }
}

window.addEventListener('load', () => {
    const sliders = document.querySelectorAll('.settings .slider-container > .slider')
    for(const slider of sliders){
        const saveName = slider.dataset.saveName
        slider.value = (saveName && localStorage.getItem(saveName)) || slider.value
        setInputValue(slider, slider.dataset.suffix)
        slider.addEventListener('input', () => {
            setInputValue(slider, slider.dataset.suffix)
            const saveName = slider.dataset.saveName
            saveName && localStorage.setItem(saveName, slider.value + '')
        })
    }

    const inputList = document.querySelectorAll('.settings .option-input')
    for(const input of inputList){
        const key = input.dataset.saveName
        if(!key) continue

        // 저장된 값 불러오기
        const storedValue = localStorage.getItem(key);
        if(storedValue !== null){
            switch(input.type){
                case 'checkbox':
                    input.checked = storedValue === 'true'
                    break;
                case 'radio':
                    if(input.value === storedValue) input.checked = true
                    break;
                default:
                    input.value = storedValue
                    break;
            }
        }

        // 이벤트 핸들러 등록 (type별 분기)
        let handler = null;
        switch(input.type){
            case 'checkbox':
                handler = () => localStorage.setItem(key, input.checked.toString())
                break;
            case 'radio':
                handler = () => input.checked && localStorage.setItem(key, input.value)
                break;
            default:
                handler = () =>  localStorage.setItem(key, input.value)
                break;
        }
        input.addEventListener('input', handler)
    }

    // 툴팁
    const optionList = document.querySelectorAll(`.settings .option-title`)
    for(const option of optionList){
        option.addEventListener('mouseenter', () => showTooltip(option))
        option.addEventListener('mouseleave', () => hideTooltip(option))
    }
})