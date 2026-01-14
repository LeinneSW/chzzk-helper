export function showToast(msg){
    // 컨테이너 없으면 생성
    let box = document.querySelector('.toast-container');
    if(!box){
        box = document.createElement('div');
        box.className = 'toast-container';
        document.body.appendChild(box);
    }

    const t = document.createElement('div');
    t.className = 'toast';
    t.textContent = msg;
    box.appendChild(t);

    // duration 이후 제거
    setTimeout(()=> t.remove(), 3000);
}