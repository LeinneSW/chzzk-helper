const setInputValue = (input, suffix = '') => {
    input.nextElementSibling.textContent = input.value + suffix
    const customCss = input.dataset.customCss
    customCss && document.documentElement.style.setProperty(customCss, input.value + suffix)
}

const showTooltip = (tipElement) => {
    const description = tipElement.dataset.description
    if(!description){
        return
    }

    const tooltip = document.createElement('div')
    tooltip.className = 'tooltip'
    tooltip.innerHTML = description.replaceAll('\\n', '<br>')
    tipElement.appendChild(tooltip)

    // 위치 계산
    const ttRect  = tooltip.getBoundingClientRect()
    const tipRect = tipElement.getBoundingClientRect()

    const top  = tipRect.top - ttRect.height // 기본 좌표: 항목 위에 뜨도록
    tooltip.style.top = `${(top > 0 ? top : tipRect.bottom)  + window.scrollY}px`

    let left = tipRect.left // 기본 좌표: 좌측 정렬
    if(left + ttRect.width > window.innerWidth){ // 오른쪽 넘침
        left = window.innerWidth - ttRect.width
    }
    tooltip.style.left = `${left + window.scrollX - 3}px`
}

const hideTooltip = (tipElement) => {
    tipElement.querySelectorAll('.tooltip').forEach(tooltip => tooltip.remove())
}

window.addEventListener('load', () => {
    document.querySelectorAll('.settings .slider-container > .slider').forEach(slider => {
        const saveName = slider.dataset.saveName
        slider.value = (saveName && localStorage.getItem(saveName)) || slider.value
        setInputValue(slider, slider.dataset.suffix)
        slider.addEventListener('input', () => {
            setInputValue(slider, slider.dataset.suffix)
            const saveName = slider.dataset.saveName
            saveName && localStorage.setItem(saveName, slider.value + '')
        })
    })

    document.querySelectorAll('.settings .option-input').forEach(input => {
        const key = input.dataset.saveName
        if(!key){
            return
        }

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
        let handler
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
        input.addEventListener('input', () => {
            const customCss = input.dataset.customCss
            if(customCss){
                document.documentElement.style.setProperty(customCss, input.value)
            }
        })
    })

    // 툴팁
    const tipElements = document.querySelectorAll(`[data-description]`)
    for(const tipElement of tipElements){
        tipElement.addEventListener('mouseenter', () => showTooltip(tipElement))
        tipElement.addEventListener('mouseleave', () => hideTooltip(tipElement))
    }
})