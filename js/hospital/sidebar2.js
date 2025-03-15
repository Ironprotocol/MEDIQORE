export function initializeSubmenuEvents() {
    document.querySelectorAll('.submenu-item').forEach(item => {
        item.addEventListener('click', function() {
            // 모든 메뉴 비활성화
            document.querySelectorAll('.submenu-item').forEach(menu => {
                menu.classList.remove('active');
            });
            
            // 클릭된 메뉴 활성화
            this.classList.add('active');
            
            // 모든 컨테이너 숨기기
            document.querySelector('.patient-list-container').style.display = 'none';
            document.querySelector('.done-list-container').style.display = 'none';
            document.querySelector('.memo-list-container').style.display = 'none';
            
            // 선택된 메뉴에 따라 해당 컨테이너만 표시
            const menuText = this.textContent.trim();
            if (menuText === 'Examine') {
                document.querySelector('.patient-list-container').style.display = 'block';
            } else if (menuText === 'Done') {
                document.querySelector('.done-list-container').style.display = 'block';
            } else if (menuText === 'Memo') {
                document.querySelector('.memo-list-container').style.display = 'block';
            }
        });
    });
}

// submenu 아이템 클릭 이벤트 초기화
export function initializeSubmenuItemEvents() {
    const submenuItems = document.querySelectorAll('.submenu-item');
    submenuItems.forEach(item => {
        item.addEventListener('click', function() {
            // 다른 모든 submenu 아이템에서 active 클래스 제거
            submenuItems.forEach(i => i.classList.remove('active'));
            // 클릭된 아이템에 active 클래스 추가
            this.classList.add('active');
        });
    });
}
