import { auth, db, doc, getDoc, onSnapshot, updateDoc, serverTimestamp, collection, getDocs } from '../firebase-config.js';

// 사용자 이메일과 상태 표시 함수
export async function displayUserEmail(user) {
    try {
        const email = user.email;
        const [pharmacyName] = email.split('@')[0].split('.');
        const userRef = doc(db, 'pharmacy', pharmacyName, 'staff', user.email);
        const userDoc = await getDoc(userRef);

        if (userDoc.exists()) {
            const userData = userDoc.data();
            // 이메일 표시
            document.querySelector('.user-email').textContent = user.email;
            
            // 현재 work 상태에 따라 상태 아이콘 업데이트
            const statusIcon = document.querySelector('.current-status img');
            statusIcon.src = `image/${userData.work || 'login'}.png`;
            statusIcon.alt = userData.work || 'login';
        }
    } catch (error) {
        console.error('Error displaying user email:', error);
    }
}

// 사용자 상태 변경 감지를 위한 리스너 설정
export function setupUserStatusListener(user) {
    if (!user) return null;
    
    const [pharmacyName] = user.email.split('@')[0].split('.');
    const userRef = doc(db, 'pharmacy', pharmacyName, 'staff', user.email);
    
    return onSnapshot(userRef, (snapshot) => {
        if (snapshot.exists()) {
            const userData = snapshot.data();
            // 이메일 표시는 변경되지 않음
            
            // 상태 아이콘 업데이트
            const statusIcon = document.querySelector('.current-status img');
            statusIcon.src = `image/${userData.work || 'login'}.png`;
            statusIcon.alt = userData.work || 'login';
        }
    });
}

// 상태 선택기 초기화 함수
function initializeStatusSelector() {
    const currentStatus = document.querySelector('.current-status');
    const dropdown = document.querySelector('.status-dropdown');
    
    if (currentStatus && dropdown) {
        dropdown.style.display = 'none';  // 초기 상태 명시적 설정
        currentStatus.addEventListener('click', (e) => {
            dropdown.style.display = dropdown.style.display === 'none' ? 'block' : 'none';
            e.stopPropagation();
        });

        // 상태 옵션 클릭 이벤트
        document.querySelectorAll('.status-option').forEach(option => {
            option.addEventListener('click', async function() {
                const status = this.dataset.status;
                const statusIcon = document.querySelector('.current-status img');
                
                if (status === 'end') {
                    try {
                        const user = auth.currentUser;
                        if (!user) return;
                        
                        const [pharmacyName, role] = user.email.split('@')[0].split('.');
                        
                        // 로그아웃 확인
                        if (!confirm('Do you want to logout?')) {
                            dropdown.style.display = 'none';
                            return;
                        }

                        // 공통 로그아웃 처리 - staff 문서 업데이트
                        const userRef = doc(db, 'pharmacy', pharmacyName, 'staff', user.email);
                        await updateDoc(userRef, {
                            work: 'logout',
                            lastUpdated: serverTimestamp()
                        });
                        
                        await auth.signOut();
                        window.location.href = 'main.html';
                    } catch (error) {
                        console.error('Logout error:', error);
                        alert('Logout failed: ' + error.message);
                    }
                    return;
                }

                try {
                    // work 상태 업데이트
                    const user = auth.currentUser;
                    if (!user) return;
                    
                    const [pharmacyName] = user.email.split('@')[0].split('.');
                    const userRef = doc(db, 'pharmacy', pharmacyName, 'staff', user.email);
                    
                    await updateDoc(userRef, {
                        work: status,
                        lastUpdated: serverTimestamp()
                    });

                    // 상태 아이콘 변경
                    statusIcon.src = `image/${status}.png`;
                    statusIcon.alt = status;
                    
                    // 드롭다운 닫기
                    dropdown.style.display = 'none';
                } catch (error) {
                    console.error('Error updating work status:', error);
                    alert('Failed to update status');
                }
            });
        });

        document.addEventListener('click', () => {
            dropdown.style.display = 'none';
        });
    }
}

// 초기화 함수
export function initializeTopBar() {
    // 현재 로그인된 사용자 확인 및 이메일 표시
    const currentUser = auth.currentUser;
    if (currentUser) {
        displayUserEmail(currentUser);
        // 상태 변경 감지 리스너 설정
        setupUserStatusListener(currentUser);
    }

    // auth 상태 변경 감지
    auth.onAuthStateChanged(user => {
        if (user) {
            displayUserEmail(user);
            setupUserStatusListener(user);
        }
    });

    // 상태 선택기 초기화
    initializeStatusSelector();
} 