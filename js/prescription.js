// Prescription 컨테이너 초기화
export function initializePrescription() {
    const prescriptionTitle = document.querySelector('#prescription-content .content-title-prescription');
    const patientSelectWrapper = document.querySelector('#prescription-content .patient-select-wrapper');
    const prescriptionBody = document.querySelector('#prescription-content .content-body-prescription');
    const prescriptionBody2 = document.querySelector('#prescription-content .content-body-prescription2');
    const prescriptionFooter = document.querySelector('#prescription-content .content-footer-prescription');

    // Room의 환자 클릭 이벤트에 대한 처리
    document.addEventListener('prescriptionPatientSelected', (e) => {
        const { name, age } = e.detail;
        if (prescriptionTitle) {
            prescriptionTitle.textContent = `${name} Prescription`;
        }
        
        // 메시지 컨테이너 숨기고 레이아웃 표시
        patientSelectWrapper.style.display = 'none';
        prescriptionBody.style.display = 'block';
        prescriptionBody2.style.display = 'block';
        prescriptionFooter.style.display = 'flex';

        // 현재 room 이름 업데이트
        updateCurrentRoomName();
    });
}

// 현재 room 이름 업데이트 함수
async function updateCurrentRoomName() {
    const currentRoomName = document.querySelector('.current-room-name');
    const [hospitalName] = auth.currentUser.email.split('@')[0].split('.');
    
    const roomsRef = collection(db, 'hospitals', hospitalName, 'treatment.room');
    const roomsSnapshot = await getDocs(roomsRef);
    
    // 현재 의사의 이름 가져오기
    const userRef = doc(db, 'hospitals', hospitalName, 'staff', auth.currentUser.email);
    const userDoc = await getDoc(userRef);
    const doctorName = userDoc.data().name;

    // 의사가 있는 room 찾기
    roomsSnapshot.forEach(roomDoc => {
        if (roomDoc.data().doctor === doctorName) {
            currentRoomName.textContent = roomDoc.id;
        }
    });
}
