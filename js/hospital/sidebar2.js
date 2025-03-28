import { auth, db, collection, query, getDocs, orderBy, doc, getDoc, updateDoc } from '../firebase-config.js';

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
            document.querySelector('.chat-list-container').style.display = 'none';
            
            // 선택된 메뉴에 따라 해당 컨테이너만 표시
            const menuText = this.textContent.trim();
            if (menuText === 'Examine') {
                document.querySelector('.patient-list-container').style.display = 'block';
            } else if (menuText === 'Done') {
                document.querySelector('.done-list-container').style.display = 'block';
                // Done 메뉴 클릭 시 treatment room에서 complete 상태 환자 모두 제거 후 목록 로드
                removeCompletedPatientsFromRooms().then(() => {
                    loadCompletedPatients();
                });
            } else if (menuText === 'Chat') {
                document.querySelector('.chat-list-container').style.display = 'block';
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

// 완료된 환자 목록 로드 함수
async function loadCompletedPatients() {
    const doneContainer = document.querySelector('.done-list-container');
    if (!doneContainer) return;
    
    const user = auth.currentUser;
    if (!user) return;
    
    const [hospitalName] = user.email.split('@')[0].split('.');
    
    try {
        // 오늘 날짜 가져오기
        const today = new Date();
        const formattedDate = today.toLocaleDateString('en-GB', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        }).replace(/ /g, '.');
        
        // complete 컬렉션 쿼리
        const completeRef = collection(db, 'hospitals', hospitalName, 'dates', formattedDate, 'complete');
        const completeSnapshot = await getDocs(completeRef);
        
        // 완료된 환자가 없는 경우
        if (completeSnapshot.empty) {
            doneContainer.innerHTML = '<div class="empty-message">No completed patients for today</div>';
            return;
        }
        
        // 완료된 환자 정보 수집
        const completedPatients = [];
        
        for (const docSnapshot of completeSnapshot.docs) {
            const patientId = docSnapshot.id;
            const patientData = docSnapshot.data();
            
            // 환자 기본 정보 가져오기
            const patientRef = doc(db, 'hospitals', hospitalName, 'patient', patientId);
            const patientDoc = await getDoc(patientRef);
            
            if (patientDoc.exists()) {
                const patientInfo = patientDoc.data().info;
                
                // 완료 시간 포맷팅
                let completeTime = '';
                if (patientData.completeTime) {
                    const date = patientData.completeTime.toDate();
                    const hours = date.getHours().toString().padStart(2, '0');
                    const minutes = date.getMinutes().toString().padStart(2, '0');
                    completeTime = `${hours}:${minutes}`;
                }
                
                completedPatients.push({
                    id: patientId,
                    name: patientInfo.patientName || patientId.split('.')[0],
                    doctor: patientData.doctor || '',
                    completeTime: completeTime,
                    payment: patientData.payment || {}
                });
            }
        }
        
        // 시간순으로 정렬 (최근 완료된 환자가 위에 오도록)
        completedPatients.sort((a, b) => {
            if (!a.completeTime) return 1;
            if (!b.completeTime) return -1;
            return b.completeTime.localeCompare(a.completeTime);
        });
        
        // 환자 목록 HTML 생성
        let html = '';
        completedPatients.forEach(patient => {
            // 결제 정보 추출
            const paymentMethod = patient.payment.method || '';
            const paymentAmount = patient.payment.amount ? `${patient.payment.amount.toLocaleString()} KRW` : '';
            
            html += `
                <div class="room-patient-item complete-patient" data-patient-id="${patient.id}">
                    <div class="complete-patient-header">
                        <div class="patient-name">${patient.name}</div>
                        <div class="doctor-name">${patient.doctor}</div>
                    </div>
                    <div class="payment-info">
                        <div class="payment-method-amount">
                            <span class="payment-method">${paymentMethod}</span>
                            <span class="payment-amount-done">${paymentAmount}</span>
                        </div>
                        <div class="complete-time">${patient.completeTime}</div>
                    </div>
                </div>
            `;
        });
        
        // HTML 삽입
        doneContainer.innerHTML = html;
        
    } catch (error) {
        console.error('Error loading completed patients:', error);
        doneContainer.innerHTML = '<div class="error-message">Error loading completed patients</div>';
    }
}

// treatment room에서 complete 상태 환자 제거 함수
export async function removeCompletedPatientsFromRooms() {
    try {
        const user = auth.currentUser;
        if (!user) return;
        
        const [hospitalName] = user.email.split('@')[0].split('.');
        
        // treatment.room 컬렉션 참조
        const roomsRef = collection(db, 'hospitals', hospitalName, 'treatment.room');
        const roomsSnapshot = await getDocs(roomsRef);
        
        // 각 room 순회
        for (const roomDoc of roomsSnapshot.docs) {
            const roomData = roomDoc.data();
            
            // room에 환자가 있는지 확인
            if (!roomData.patients || roomData.patients.length === 0) continue;
            
            // 환자 목록에서 complete 상태 환자 필터링
            const initialLength = roomData.patients.length;
            const updatedPatients = roomData.patients.filter(patient => patient.progress !== 'complete');
            
            // 환자 목록이 변경되었으면 업데이트
            if (updatedPatients.length !== initialLength) {
                await updateDoc(roomDoc.ref, { patients: updatedPatients });
            }
        }
    } catch (error) {
        console.error('Error removing completed patients from rooms:', error);
    }
}
