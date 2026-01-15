import {createSetting, toBoolean} from "./utils.js";

export const ttsSettings = {
    get enabled(){
        return toBoolean(localStorage.getItem('enableTTS'))
    },
    set enabled(value){
        debugger;
        localStorage.setItem('enableTTS', toBoolean(value) + '');
    },

    get maximumPlayTime(){
        return +localStorage.getItem('ttsMaxTime') || 0
    },
    set maximumPlayTime(value){
        localStorage.setItem('ttsMaxTime', (+value || 0) + '');
    },

    get volume(){
        return +localStorage.getItem('ttsVolume') || 100;
    },
    set volume(value){
        localStorage.setItem('ttsVolume', (+value || 0) + '');
    },

    // 닉네임 무시 (해당되는 닉네임의 채팅 안읽음)
    ignoreName: createSetting('ttsIgnoreName', /^.*(봇|bot)$/i),
    // 메시지 무시 (해당되는 메시지 안읽음)
    ignoreMessage: createSetting('ttsIgnoreMessage', /^[!$/].*$/u),
    // 메시지 필터링 (특정 문자를 ''로 치환)
    filterMessage: createSetting('ttsFilterMessage', /\p{Extended_Pictographic}|\{:.*:\}/gu),
};

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

const updateCssStyle = (element) => {
    const suffix = element.dataset.suffix || ''
    if(element.type === 'range'){
        const labelElement = element.labels?.[0];     // NodeList → 첫 번째만 사용
        if(labelElement){
            labelElement.textContent = element.value + suffix
        }
    }
    const customCss = element.dataset.customCss
    if(!customCss){
        return
    }

    if(element.type !== 'radio' || element.checked){
        let value = element.value + suffix
        if(element.type === 'checkbox' && !element.checked){
            value = ''
        }
        document.documentElement.style.setProperty(customCss, value)
    }
}

export function initSettings(){
    document.querySelectorAll('.settings .slider-container > .slider').forEach(slider => {
        const saveName = slider.dataset.saveName
        slider.value = (saveName && localStorage.getItem(saveName)) || slider.value
        updateCssStyle(slider)

        slider.addEventListener('input', () => {
            updateCssStyle(slider)
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
        updateCssStyle(input)

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
        input.addEventListener('input', () => {
            handler()
            updateCssStyle(input)
        })
    })

    // 툴팁
    const tipElements = document.querySelectorAll(`[data-description]`)
    for(const tipElement of tipElements){
        tipElement.addEventListener('mouseenter', () => showTooltip(tipElement))
        tipElement.addEventListener('mouseleave', () => hideTooltip(tipElement))
    }
}