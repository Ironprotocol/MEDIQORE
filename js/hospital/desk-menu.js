import { auth, db, doc, getDoc } from '../firebase-config.js';
import { CustomCalendar, updateSchedulerReservations } from './calendar.js';
import { clearPatientSelection } from './patient-list.js';

// months 배열 추가 ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// 사용자 권한 체크 함수를 별도로 분리 ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
export async function checkUserPermissions(user) {
    try {
        const email = user.email;
        const [hospitalName, role] = email.split('@')[0].split('.');
        
        console.log('Checking permissions for:', email);
        console.log('Hospital:', hospitalName);
        console.log('Role:', role);

        // role이 chemist면 pharmacy 컬렉션에서, 아니면 hospitals 컬렉션에서 확인
        const collectionName = role === 'chemist' ? 'pharmacy' : 'hospitals';
        console.log('Collection:', collectionName);

        // hospitals/병원명/staff/이메일 또는 pharmacy/약국명/staff/이메일 에서 사용자 정보 확인
        const userRef = doc(db, collectionName, hospitalName, 'staff', email);
        const userDoc = await getDoc(userRef);

        if (!userDoc.exists()) {
            console.log('User document not found for:', email);
            throw new Error('User document not found');
        }

        const userData = userDoc.data();
        console.log('User data:', userData);
        if (userData.status !== 'active') {
            await auth.signOut();
            window.location.href = 'main.html';
            return;
        }

        // 메뉴 접근 권한 적용
        const menuItems = document.querySelectorAll('.menu-item');
        menuItems.forEach(item => {
            const menuName = item.textContent.trim().toLowerCase();

            // 모든 메뉴 먼저 숨기기
            item.style.display = 'none';

            // Data 메뉴는 항상 표시
            if (menuName === 'data') {
                item.style.display = 'block';
                return;
            }

            // 나머지 메뉴는 역할에 따라 표시
            switch (role) {
                case 'doctor':
                    if (menuName !== 'pharmacy') {
                        item.style.display = 'block';
                    }
                    break;
                case 'desk':
                    if (menuName === 'desk' || menuName === 'reservation') {
                        item.style.display = 'block';
                    }
                    break;
                case 'chemist':
                    if (menuName === 'pharmacy') {
                        item.style.display = 'block';
                    }
                    break;
            }
        });

    } catch (error) {
        console.error('Error checking user permissions:', error.message);
        throw error;
    }
}

// 메뉴 클릭 이벤트 초기화
export function initializeMenuEvents() {
    const menuItems = document.querySelectorAll('.menu-item');
    const contentContainers = document.querySelectorAll('.content-container, .content-container-2');
    const mainContent = document.querySelector('.main-content');
    const prescriptionContent = document.querySelector('.main-content-prescription');

    menuItems.forEach(item => {
        item.addEventListener('click', async function() {
            menuItems.forEach(i => i.classList.remove('active'));
            this.classList.add('active');

            const menuText = this.textContent.trim().toLowerCase();
            
            // Prescription 메뉴 처리
            if (menuText === 'prescription') {
                mainContent.style.display = 'none';
                prescriptionContent.style.display = 'flex';
                document.getElementById('prescription-content').style.display = 'block';
                return;
            }

            // 다른 메뉴들 처리
            mainContent.style.display = 'flex';
            prescriptionContent.style.display = 'none';
            contentContainers.forEach(container => {
                container.style.display = 'none';
            });

            // 메뉴 매핑 업데이트 - Data 메뉴 추가
            const menuToContainer = {
                'home': 'home-content',
                'reservation': 'reservation-content',
                'pharmacy': 'pharmacy-content',
                'desk': ['desk-content', 'desk-content-right'],
                'data': 'data-content'  // Data 메뉴 추가
            };
            
            // Reservation 메뉴 클릭 시 특별 처리
            if (menuText === 'reservation') {
                const content = document.getElementById('reservation-content');
                if (content) {
                    content.style.display = 'block';
                    
                    // 달력 초기화 및 오늘 날짜 설정
                    new CustomCalendar();
                    
                    // 오늘 날짜로 스케줄러 업데이트
                    const today = new Date();
                    const formattedDate = `${String(today.getDate()).padStart(2, '0')}.${months[today.getMonth()]}.${today.getFullYear()}`;
                    document.querySelector('.scheduler-header .current-date').textContent = formattedDate;
                    
                    // 스케줄러 예약 정보 업데이트
                    const user = auth.currentUser;
                    if (user) {
                        updateSchedulerReservations(formattedDate);
                    }
                }
                return;
            }

            // 다른 메뉴들
            const contentIds = menuToContainer[menuText];
            if (Array.isArray(contentIds)) {  // desk 메뉴인 경우
                contentIds.forEach(id => {
                    document.getElementById(id).style.display = 'block';
                });
                
                // Desk 메뉴 클릭 시 환자 선택 상태 초기화
                clearPatientSelection();
                
                // 처방전 노출 상태 초기화를 위한 이벤트 발생
                document.dispatchEvent(new CustomEvent('patientDeselected'));
                
                return;
            } else {
                const content = document.getElementById(contentIds);
                if (content) {
                    content.style.display = 'block';
                }
            }

            // 메뉴 변경 시 환자 선택 상태 초기화
            clearPatientSelection();
        });
    });
}

// 페이지 로드 시 Home 메뉴 초기화 함수
export function initializeHomePage() {
    // Home 메뉴 활성화 (초기에 홈 메뉴가 보이도록)
    document.addEventListener('DOMContentLoaded', function() {
        // Home 컨텐츠 표시
        const homeContent = document.getElementById('home-content');
        if (homeContent) {
            // 다른 콘텐츠 모두 숨기기
            const contentContainers = document.querySelectorAll('.content-container, .content-container-2');
            contentContainers.forEach(container => {
                container.style.display = 'none';
            });
            
            // Home 콘텐츠 표시
            homeContent.style.display = 'block';
            
            // 메인 콘텐츠 영역 표시
            const mainContent = document.querySelector('.main-content');
            if (mainContent) {
                mainContent.style.display = 'flex';
            }
            
            // 처방전 콘텐츠 숨기기
            const prescriptionContent = document.querySelector('.main-content-prescription');
            if (prescriptionContent) {
                prescriptionContent.style.display = 'none';
            }
            
            // Home 메뉴 항목에 active 클래스 추가
            const menuItems = document.querySelectorAll('.menu-item');
            menuItems.forEach(item => {
                item.classList.remove('active');
                if (item.textContent.trim().toLowerCase() === 'home') {
                    item.classList.add('active');
                }
            });
        }
    });
}