import { auth, db, doc, getDoc, collection, getDocs, updateDoc, serverTimestamp } from './firebase-config.js';
import { checkCurrentRoomPatients } from './room.js';

// 닫기 버튼 클릭 이벤트 처리
export function setupCloseButtons() {
    const closeButtons = document.querySelectorAll('.close-button');
            closeButtons.forEach(button => {
                button.addEventListener('click', function() {
                    // 현재 버튼이 속한 content-container를 찾아서 숨김
                    const contentContainer = this.closest('.content-container, .content-container-2');
                    if (contentContainer) {
                        contentContainer.style.display = 'none';
                    }
                    
                    // 관련된 메뉴 아이템의 active 상태 제거
                    const menuItems = document.querySelectorAll('.menu-item');
                    menuItems.forEach(item => item.classList.remove('active'));
                });
            });
        }

// 로고 클릭 이벤트 핸들러
export function setupLogoLogout() {
    const logoContainer = document.querySelector('.logo-container');
    if (logoContainer) {
        logoContainer.addEventListener('click', async () => {
            try {
                const user = auth.currentUser;
                if (!user) return;

                const [hospitalName, role] = user.email.split('@')[0].split('.');
                
                // 의사인 경우 환자 체크
                if (role === 'doctor') {
                    const staffRef = doc(db, 'hospitals', hospitalName, 'staff', user.email);
                    const staffDoc = await getDoc(staffRef);
                    const doctorName = staffDoc.data().name;

                    // 환자 체크
                    const canLogout = await checkCurrentRoomPatients(hospitalName, doctorName);
                    if (!canLogout) return;

                    // 환자가 없는 경우 로그아웃 확인
                    if (!confirm('Do you want to logout?')) return;

                    // 의사가 배정된 진료실 찾아서 초기화
                    const roomsRef = collection(db, 'hospitals', hospitalName, 'treatment.room');
                    const roomsSnapshot = await getDocs(roomsRef);
                    for (const roomDoc of roomsSnapshot.docs) {
                        const roomData = roomDoc.data();
                        if (roomData.doctor === doctorName) {
                            await updateDoc(doc(roomsRef, roomDoc.id), {
                                doctor: null,
                                work: null
                            });
                        }
                    }

                    // 의사 work 상태를 logout으로 변경
                    await updateDoc(staffRef, {
                        work: 'logout',
                        lastUpdated: serverTimestamp()
                    });
                }

                await auth.signOut();
                window.location.href = 'main.html';
            } catch (error) {
                console.error('Error during logout:', error);
            }
        });
    }
}

// 상태 선택기 초기화
export function initializeStatusSelector() {
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
                
                // End Work 선택 시 로그아웃
                if (status === 'end') {
                    try {
                        const user = auth.currentUser;
                        if (!user) return;
                        
                        const [hospitalName, role] = user.email.split('@')[0].split('.');
                        
                        // 의사인 경우 환자 체크
                        if (role === 'doctor') {
                            const staffRef = doc(db, 'hospitals', hospitalName, 'staff', user.email);
                            const staffDoc = await getDoc(staffRef);
                            const doctorName = staffDoc.data().name;

                            // 환자 체크
                            const canLogout = await checkCurrentRoomPatients(hospitalName, doctorName);
                            if (!canLogout) return;

                            // 환자가 없는 경우 로그아웃 확인
                            if (!confirm('Do you want to logout?')) return;

                            // 의사가 배정된 진료실 찾아서 초기화
                            const roomsRef = collection(db, 'hospitals', hospitalName, 'treatment.room');
                            const roomsSnapshot = await getDocs(roomsRef);
                            for (const roomDoc of roomsSnapshot.docs) {
                                const roomData = roomDoc.data();
                                if (roomData.doctor === doctorName) {
                                    await updateDoc(doc(roomsRef, roomDoc.id), {
                                        doctor: null,
                                        work: null
                                    });
                                }
                            }
                        }
                        
                        const userRef = doc(db, 'hospitals', hospitalName, 'staff', user.email);
                        
                        // work 상태를 'logout'으로 업데이트
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
                    
                    const [hospitalName] = user.email.split('@')[0].split('.');
                    const userRef = doc(db, 'hospitals', hospitalName, 'staff', user.email);
                    
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

// 확대/축소 방지 기능 초기화
export function initializeZoomPrevention() {
    // 키보드로 확대/축소 방지
    document.addEventListener('keydown', function(e) {
        if (e.ctrlKey && (e.key === '+' || e.key === '-' || e.key === '=')) {
            e.preventDefault();
        }
    });
    
    // 휠로 확대/축소 방지
    document.addEventListener('wheel', function(e) {
        if (e.ctrlKey) {
            e.preventDefault();
        }
    }, { passive: false });
}

   
export async function displayUserName(user) {
    try {
        const [hospitalName] = user.email.split('@')[0].split('.');
        const userRef = doc(db, 'hospitals', hospitalName, 'staff', user.email);
        const userDoc = await getDoc(userRef);

        if (userDoc.exists()) {
            const userData = userDoc.data();
            document.querySelector('.user-name').textContent = userData.name;
            // 현재 work 상태에 따라 상태 아이콘 업데이트
            const statusIcon = document.querySelector('.current-status img');
            statusIcon.src = `image/${userData.work}.png`;
            statusIcon.alt = userData.work;
        }
    } catch (error) {
        console.error('Error displaying user name:', error);
    }
}

// 현재 사용자 이름 초기화
export function initializeUserName() {
    // 현재 로그인된 사용자 확인 및 이름 표시
    const currentUser = auth.currentUser;
    if (currentUser) {
        displayUserName(currentUser);
    }

    // auth 상태 변경 감지
    auth.onAuthStateChanged(user => {
        if (user) {
            displayUserName(user);
        }
    });
}
//------------------------------------------ 우측 상단에 표시되는 이름 조정 함수----------------------------------------- 