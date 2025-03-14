import { auth, db, doc, updateDoc, serverTimestamp } from '../firebase-config.js';

// 메뉴 클릭 이벤트 처리
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM Content Loaded - pharmacy_menu.js');
    
    // 로고 클릭 시 로그아웃 이벤트 설정
    setupLogoLogout();
    
    // 모든 메뉴 아이템과 컨텐츠 컨테이너 가져오기
    const menuItems = document.querySelectorAll('.menu-item');
    const contentContainers = document.querySelectorAll('.content-container');
    
    // 초기에는 Home 컨테이너 보이기
    document.getElementById('home-content').style.display = 'block';
    document.getElementById('home-menu').classList.add('active');
    
    // 메뉴 아이템 클릭 이벤트
    menuItems.forEach(item => {
        item.addEventListener('click', function() {
            // 모든 메뉴 아이템에서 active 클래스 제거
            menuItems.forEach(menuItem => {
                menuItem.classList.remove('active');
            });
            
            // 클릭된 메뉴 아이템에 active 클래스 추가
            this.classList.add('active');
            
            // 모든 컨텐츠 컨테이너 숨기기
            contentContainers.forEach(container => {
                container.style.display = 'none';
            });
            
            // 클릭된 메뉴에 해당하는 컨텐츠 컨테이너 보이기
            const menuId = this.id;
            const contentId = menuId.replace('menu', 'content');
            document.getElementById(contentId).style.display = 'block';
        });
    });
    
    // 닫기 버튼 클릭 이벤트
    const closeButtons = document.querySelectorAll('.close-button');
    closeButtons.forEach(button => {
        button.addEventListener('click', function() {
            const container = this.closest('.content-container');
            container.style.display = 'none';
        });
    });
});

// 로고 클릭 시 로그아웃 기능
function setupLogoLogout() {
    console.log('Setting up logo logout handler');
    const logoContainer = document.querySelector('.logo-container');
    if (logoContainer) {
        console.log('Logo container found');
        logoContainer.addEventListener('click', async () => {
            console.log('Logo clicked!');
            try {
                const user = auth.currentUser;
                if (!user) {
                    console.log('No user is logged in');
                    return;
                }
                
                console.log('Current user:', user.email);
                
                // 로그아웃 확인
                if (!confirm('Do you want to logout?')) {
                    console.log('Logout cancelled');
                    return;
                }
                
                console.log('Logging out...');
                
                // 공통 로그아웃 처리
                const [pharmacyName] = user.email.split('@')[0].split('.');
                const userRef = doc(db, 'pharmacy', pharmacyName, 'staff', user.email);
                
                // 상태 업데이트
                await updateDoc(userRef, {
                    work: 'logout',
                    lastUpdated: serverTimestamp()
                });
                
                console.log('Status updated, signing out...');
                
                // 로그아웃 처리
                await auth.signOut();
                window.location.href = 'main.html';
            } catch (error) {
                console.error('Error during logout:', error);
                alert('Failed to logout: ' + error.message);
            }
        });
    } else {
        console.warn('Logo container not found!');
    }
} 