import { auth, db, doc, getDoc, collection, getDocs, deleteDoc, updateDoc, query, where } from './firebase-config.js';

//------------------------------------------ 우측 상단에 표시되는 이름 조정 함수----------------------------------------- 
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

// Update 버튼 초기화 및 이벤트 처리
export function initializeTopBar() {
    const updateButton = document.getElementById('update-button');
    if (updateButton) {
        // 기존에 등록된 이벤트 리스너 제거
        updateButton.removeEventListener('click', handleUpdateButtonClick);
        // 새로운 이벤트 리스너 등록
        updateButton.addEventListener('click', handleUpdateButtonClick);
    }
    
    // refresh-button에 대한 이벤트 리스너 추가
    const refreshButton = document.getElementById('refresh-button');
    if (refreshButton) {
        // 기존에 등록된 이벤트 리스너 제거
        refreshButton.removeEventListener('click', handleUpdateButtonClick);
        // 새로운 이벤트 리스너 등록
        refreshButton.addEventListener('click', handleUpdateButtonClick);
    }
}

// Update 버튼 클릭 핸들러
async function handleUpdateButtonClick(event) {
    // 이벤트 전파 중지
    event.stopPropagation();
    
    // 클릭된 버튼 요소 가져오기
    const clickedButton = event.currentTarget;
    
    // 이미 처리 중인지 확인
    if (clickedButton.disabled) return;
    
    // 확인 대화상자 표시 (window.confirm 사용)
    if (window.confirm('This will clean up previous data. Continue?')) {
        // 처리 중 상태로 변경
        clickedButton.disabled = true;
        
        // 로딩 표시 추가
        const originalContent = clickedButton.innerHTML;
        clickedButton.innerHTML = '<div class="loading-spinner"></div>';
        
        // 초기화 함수 실행 (타임아웃 추가)
        try {
            // 타임아웃 프로미스 (30초)
            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error('Operation timed out after 30 seconds')), 30000);
            });
            
            // 데이터 정리 프로미스
            const cleanupPromise = cleanupAllData();
            
            // 둘 중 먼저 완료되는 작업 처리
            const success = await Promise.race([cleanupPromise, timeoutPromise]);
            
            // 결과 알림
            if (success) {
                window.alert('Data cleanup completed successfully.');
            } else {
                window.alert('Failed to clean up data. Please try again.');
            }
        } catch (error) {
            console.error('Error during data cleanup:', error);
            window.alert('An error occurred during data cleanup: ' + (error.message || 'Unknown error'));
        } finally {
            // 원래 버튼 상태로 복원
            clickedButton.innerHTML = originalContent;
            clickedButton.disabled = false;
        }
    }
}

// 데이터 초기화 함수
async function cleanupAllData() {
    try {
        const [hospitalName] = auth.currentUser.email.split('@')[0].split('.');
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // 1. 이전 날짜의 waiting/reservation/payment 문서 정리
        const datesRef = collection(db, 'hospitals', hospitalName, 'dates');
        const datesSnapshot = await getDocs(datesRef);
        
        for (const dateDoc of datesSnapshot.docs) {
            const dateStr = dateDoc.id;
            const dateTimestamp = new Date(dateStr);
            
            // 이전 날짜의 데이터만 처리
            if (dateTimestamp < today) {
                // waiting 컬렉션 삭제
                const waitingRef = collection(dateDoc.ref, 'waiting');
                const waitingDocs = await getDocs(waitingRef);
                for (const doc of waitingDocs.docs) {
                    await deleteDoc(doc.ref);
                }

                // reservation 컬렉션 삭제
                const reservationRef = collection(dateDoc.ref, 'reservation');
                const reservationDocs = await getDocs(reservationRef);
                for (const doc of reservationDocs.docs) {
                    await deleteDoc(doc.ref);
                }

                // payment 컬렉션 삭제
                const paymentRef = collection(dateDoc.ref, 'payment');
                const paymentDocs = await getDocs(paymentRef);
                for (const doc of paymentDocs.docs) {
                    await deleteDoc(doc.ref);
                }
                
                // active 컬렉션 삭제
                const activeRef = collection(dateDoc.ref, 'active');
                const activeDocs = await getDocs(activeRef);
                for (const doc of activeDocs.docs) {
                    await deleteDoc(doc.ref);
                }
            }
        }

        // 2. treatment.room의 patients 배열 정리
        const roomsRef = collection(db, 'hospitals', hospitalName, 'treatment.room');
        const roomSnapshot = await getDocs(roomsRef);

        for (const roomDoc of roomSnapshot.docs) {
            const patients = roomDoc.data().patients || [];
            const updatedPatients = patients.filter(patient => {
                // timestamp나 rsvdTime이 오늘 이후인 환자만 유지
                if (patient.timestamp) {
                    const patientDate = patient.timestamp.toDate ? 
                        patient.timestamp.toDate() : new Date(patient.timestamp);
                    return patientDate >= today;
                }
                if (patient.rsvdTime) {
                    const rsvdDate = patient.rsvdTime.toDate ? 
                        patient.rsvdTime.toDate() : new Date(patient.rsvdTime);
                    return rsvdDate >= today;
                }
                return false;  // timestamp나 rsvdTime이 없으면 제거
            });

            if (updatedPatients.length !== patients.length) {
                await updateDoc(roomDoc.ref, {
                    patients: updatedPatients
                });
            }
        }
        
        // 3. desk의 patients 배열 정리
        const desksRef = collection(db, 'hospitals', hospitalName, 'desk');
        const deskSnapshot = await getDocs(desksRef);

        for (const deskDoc of deskSnapshot.docs) {
            const patients = deskDoc.data().patients || [];
            const updatedPatients = patients.filter(patient => {
                // timestamp나 rsvdTime이 오늘 이후인 환자만 유지
                if (patient.timestamp) {
                    const patientDate = patient.timestamp.toDate ? 
                        patient.timestamp.toDate() : new Date(patient.timestamp);
                    return patientDate >= today;
                }
                if (patient.rsvdTime) {
                    const rsvdDate = patient.rsvdTime.toDate ? 
                        patient.rsvdTime.toDate() : new Date(patient.rsvdTime);
                    return rsvdDate >= today;
                }
                return false;  // timestamp나 rsvdTime이 없으면 제거
            });

            if (updatedPatients.length !== patients.length) {
                await updateDoc(deskDoc.ref, {
                    patients: updatedPatients
                });
            }
        }
        
        return true; // 성공적으로 완료됨
    } catch (error) {
        console.error('Error in cleanupAllData:', error);
        return false; // 오류 발생
    }
}

//------------------------------------------ 우측 상단에 표시되는 이름 조정 함수----------------------------------------- 