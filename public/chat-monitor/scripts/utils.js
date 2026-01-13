/**
 * @param {any} value
 * @return {boolean}
 */
export function toBoolean(value){
    if(typeof value === 'string'){
        const normalizedValue = value.trim().toLowerCase();
        return ['true', '1', 'on'].includes(normalizedValue);
    }
    return !!value;
}

/**
 * @param {string} key - localStorage에 저장될 키
 * @param {RegExp} defaultRegex - 기본 정규식 패턴
 */
export const createSetting = (key, defaultRegex) => ({
    get enabled(){
        return toBoolean(localStorage.getItem(key));
    },
    set enabled(value){
        localStorage.setItem(key, toBoolean(value) + '');
    },
    get regex(){
        try{
            const {source, flags} = JSON.parse(localStorage.getItem(key + 'Regex'));
            if(source != null && flags != null) return new RegExp(source, flags);
        }catch{}
        this.regex = defaultRegex;
        return defaultRegex;
    },
    set regex(value){
        if(!(value instanceof RegExp)) return;
        localStorage.setItem(key + 'Regex', JSON.stringify({source: value.source, flags: value.flags}));
    }
});

export const escapeHTML = (text) => text.replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

export const formatTime = (msecs) => {
    msecs = new Date(msecs)
    const h = String(msecs.getHours()).padStart(2, '0')
    const m = String(msecs.getMinutes()).padStart(2, '0')
    return `[${h}:${m}]`
}