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
    const sliders = document.querySelectorAll('.slider-container > .slider')
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
    const radioList = document.querySelectorAll('input[type=radio]')
    for(const radio of radioList){
        const saveName = radio.dataset.saveName
        radio.checked = (saveName && radio.value === localStorage.getItem(saveName)) || radio.checked
        radio.addEventListener('input', () => {
            const saveName = radio.dataset.saveName
            saveName && localStorage.setItem(saveName, radio.value + '')
        })
    }
    const optionList = document.querySelectorAll(`.option-title`)
    for(const option of optionList){
        option.addEventListener('mouseenter', () => showTooltip(option))
        option.addEventListener('mouseleave', () => hideTooltip(option))
    }
})