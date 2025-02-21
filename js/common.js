import { auth, db, doc, getDoc, collection, getDocs, updateDoc, serverTimestamp, onSnapshot } from './firebase-config.js';
import { checkCurrentRoomPatients } from './room.js';

// 전역 변수로 리스너 해제 함수 저장
let userStatusUnsubscribe = null;


// 리스너 설정 함수를 하나로 통합하고 export ///////////////////////////////////////////////////////////////////////////////////////////////////////////
export function setupUserStatusListener(user) {
    const [hospitalName] = user.email.split('@')[0].split('.');
    const userRef = doc(db, 'hospitals', hospitalName, 'staff', user.email);
    
    return onSnapshot(userRef, (snapshot) => {
        if (snapshot.exists()) {
            const userData = snapshot.data();
            // 모든 .user-name 요소 업데이트
            document.querySelectorAll('.user-name').forEach(element => {
                element.textContent = userData.name;
            });
            // 모든 상태 아이콘 업데이트
            document.querySelectorAll('.current-status img').forEach(icon => {
                icon.src = `image/${userData.work}.png`;
                icon.alt = userData.work;
            });
        }
    });
}

// displayUserName 함수 유지 (다른 곳에서 사용 중)
export async function displayUserName(user) {
    try {
        if (userStatusUnsubscribe) {
            userStatusUnsubscribe();
        }
        userStatusUnsubscribe = setupUserStatusListener(user);
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
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////


//닫기 버튼 클릭 이벤트 처리/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
export function setupCloseButtons() {
    const closeButtons = document.querySelectorAll('.close-button');
    closeButtons.forEach(button => {
        const container = button.closest('.content-container, .content-container-2');
        if (container && 
            !container.classList.contains('reservation-container') && 
            !container.classList.contains('desk-container-right') &&
            !container.classList.contains('prescription-container') &&
            !container.matches('.desk-container')) {
            
            button.addEventListener('click', function() {
                if (container) {
                    container.style.display = 'none';
                }
                
                // 관련된 메뉴 아이템의 active 상태 제거
                const menuItems = document.querySelectorAll('.menu-item');
                menuItems.forEach(item => item.classList.remove('active'));
            });
        } else {
            // 해당 컨테이너들의 Close 버튼 숨기기
            button.style.display = 'none';
        }
    });
}
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// 로고 클릭 이벤트 핸들러////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
export function setupLogoLogout() {
    const logoContainer = document.querySelector('.logo-container');
    if (logoContainer) {
        logoContainer.addEventListener('click', async () => {
            try {
                const user = auth.currentUser;
                if (!user) return;

                const [hospitalName, role] = user.email.split('@')[0].split('.');
                
                // 로그아웃 시 의사인 경우 room 내부 환자 체크
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
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// 상태 선택기 초기화 ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
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
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// 확대/축소 방지 기능 초기화 ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
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