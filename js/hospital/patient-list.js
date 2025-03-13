import {  auth, db, collection, query, where, getDocs, 
    doc, getDoc, setDoc, serverTimestamp, Timestamp,
    onSnapshot, orderBy, updateDoc, deleteDoc } from '../firebase-config.js';

// 전역 상태로 환자 목록 관리
let allPatients = [];

// 전역 이벤트 리스너 등록 (한 번만)
window.addEventListener('click', () => {
    document.querySelectorAll('.doctor-options').forEach(options => {
        options.style.display = 'none';
    });
});

// 환자 요소 생성 함수 (기존 로직 재사용)
async function createPatientElement(hospitalName, patientData, patientId, type, currentDate) {
    const patientRef = doc(db, 'hospitals', hospitalName, 'patient', patientId);
    const patientDoc = await getDoc(patientRef);
    
    if (!patientDoc.exists()) return null;

    const birthDate = patientDoc.data().info.birthDate.toDate();
    const age = new Date().getFullYear() - birthDate.getFullYear();
    
    const patientElement = document.createElement('div');
    patientElement.className = 'patient-info-container';
    patientElement.dataset.type = type;  // waiting 또는 reservation
    
    // 이름 길이 처리 함수
    function formatPatientId(id) {
        const maxLength = 10; // 10글자로 제한
        const namePart = id.split('.')[0]; // 점(.) 앞부분만 추출
        
        if (namePart.length > maxLength) {
            return namePart.slice(0, maxLength) + '...';
        }
        return namePart; // ID 번호 부분 제외하고 이름만 반환
    }

    // 증상 길이 처리 함수 수정
    function formatComplaint(complaint) {
        // null, undefined 체크
        if (!complaint) return '';
        
        const maxLength = 15; // swollen_gums 길이
        if (complaint.length > maxLength) {
            return complaint.slice(0, maxLength - 3) + '...';
        }
        return complaint;
    }

    // 시간 포맷팅 함수 수정
    function formatTime(timestamp) {
        // timestamp가 null이거나 undefined인 경우 처리
        if (!timestamp) return '';
        
        try {
            const date = timestamp.toDate();
            const hours = date.getHours().toString().padStart(2, '0');
            const minutes = date.getMinutes().toString().padStart(2, '0');
            return `${hours}:${minutes}`;
        } catch (error) {
            console.error('Error formatting time:', error);
            return '';
        }
    }

    // 시간 정보 가져오기
    let timeString = '';
    if (type === 'waiting') {
        timeString = formatTime(patientData.timestamp);
    } else if (type === 'reservation') {
        timeString = formatTime(patientData.rsvdTime);
    }

    patientElement.innerHTML = `
        <span class="patient-id-span">
            <img src="image/${patientDoc.data().info.gender || 'unknown'}.png" 
                 alt="${patientDoc.data().info.gender || 'unknown'}" 
                 class="gender-icon">
            ${formatPatientId(patientId)}
        </span>
        <span class="age-span">${age}years</span>
        <span class="complaint-span">${formatComplaint(patientData.primaryComplaint)}</span>
        <span class="time-span">${timeString}</span>
        <span class="progress-span">
            <img src="image/${type === 'reservation' ? 'rsvd' : 
                            type === 'active' ? 'active' : 
                            type === 'payment' ? 'payment' : 
                            patientData.progress}.png" 
                 alt="${type === 'reservation' ? 'rsvd' : 
                      type === 'active' ? 'active' : 
                      type === 'payment' ? 'payment' : 
                      patientData.progress}" 
                 style="width: 73px; height: 30.5px; object-fit: contain;">
        </span>
        <span class="doctor-dropdown-span">
            <div class="doctor-select-container">
                <select class="doctor-select" style="display: none;">
                    <option value="">Choose a doctor</option>
                </select>
                <div class="doctor-dropdown">
                    <div class="doctor-selected" style="color: ${patientData.doctor ? '#000000' : 'rgb(110, 110, 124)'}">
                        ${patientData.doctor || 'Choose a doctor'}
                    </div>
                    <div class="doctor-options" style="display: none;"></div>
                </div>
            </div>
        </span>
        <button class="delete-patient-btn">×</button>
    `;

    // 의사 목록 로드 및 드롭다운 이벤트 설정
    const doctorContainer = patientElement.querySelector('.doctor-select-container');
    const doctorSelect = doctorContainer.querySelector('.doctor-select');
    const doctorDropdown = doctorContainer.querySelector('.doctor-dropdown');
    const doctorSelected = doctorContainer.querySelector('.doctor-selected');
    const doctorOptions = doctorContainer.querySelector('.doctor-options');

    // 드롭다운 초기 상태 설정 //2024-02-13 15:55
    if (patientData.doctor) {
        doctorSelected.textContent = patientData.doctor;
        doctorSelected.style.color = '#000000';  // 의사가 선택된 경우 검은색
    } else {
        doctorSelected.textContent = 'Choose a doctor';
        doctorSelected.style.color = 'rgb(110, 110, 124)';  // 선택되지 않은 경우 회색
    }

    // 의사 목록 로드
    const staffRef = collection(db, 'hospitals', hospitalName, 'staff');
    const q = query(staffRef, where('role', '==', 'doctor'));
    const querySnapshot = await getDocs(q);
    
    // 드롭다운 옵션 생성
    // 'Choose a doctor' 옵션 먼저 추가
    const defaultOption = document.createElement('div');
    defaultOption.className = `doctor-option${patientData.doctor ? ' disabled' : ''}`; // 의사가 이미 선택된 경우만 비활성화
    defaultOption.dataset.value = '';
    defaultOption.innerHTML = `
        <div class="doctor-option-content">
            <span class="${patientData.doctor ? 'disabled' : ''}">Choose a doctor</span>
        </div>
    `;
    doctorOptions.appendChild(defaultOption);

    // 의사 목록 추가 (기존 로직 유지)
    querySnapshot.forEach(doc => {
        const doctorData = doc.data();
        const option = document.createElement('div');
        option.className = `doctor-option${doctorData.work === 'logout' ? ' disabled' : ''}`; // 로그아웃 상태의 의사만 비활성화
        option.dataset.value = doc.id;
        option.innerHTML = `
            <div class="doctor-option-content">
                <span class="${doctorData.work === 'logout' ? 'disabled' : ''}">${doctorData.name}</span>
                <img src="image/${doctorData.work}.png" alt="${doctorData.work}" class="status-icon">
            </div>
        `;
        doctorOptions.appendChild(option);

        // select 엘리먼트에도 옵션 추가
        const selectOption = document.createElement('option');
        selectOption.value = doc.id;
        selectOption.textContent = doctorData.name;
        doctorSelect.appendChild(selectOption);
    });

    // 드롭다운 토글 및 의사 목록 새로고침
    doctorSelected.addEventListener('click', async (e) => {
        e.stopPropagation(); // 이벤트 버블링 방지
        
      // 다른 열린 드롭다운 모두 닫기
      document.querySelectorAll('.doctor-options').forEach(dropdown => {
            if (dropdown !== doctorOptions) {
                dropdown.style.display = 'none';
            }
        });

        // 의사 목록 새로 불러오기
        const staffRef = collection(db, 'hospitals', hospitalName, 'staff');
        const q = query(staffRef, where('role', '==', 'doctor'));
        const querySnapshot = await getDocs(q);
        
        // 기존 옵션 제거
        doctorOptions.innerHTML = '';
        
        // 'Choose a doctor' 옵션 먼저 추가
        const defaultOption = document.createElement('div');
        defaultOption.className = `doctor-option${patientData.doctor ? ' disabled' : ''}`; // 의사가 이미 선택된 경우만 비활성화
        defaultOption.dataset.value = '';
        defaultOption.innerHTML = `
            <div class="doctor-option-content">
                <span class="${patientData.doctor ? 'disabled' : ''}">Choose a doctor</span>
            </div>
        `;
        doctorOptions.appendChild(defaultOption);
        
        // 새로운 의사 목록으로 드롭다운 옵션 생성
        querySnapshot.forEach(doc => {
            const doctorData = doc.data();
            const option = document.createElement('div');
            option.className = `doctor-option${doctorData.work === 'logout' ? ' disabled' : ''}`; // 로그아웃 상태의 의사만 비활성화
            option.dataset.value = doc.id;
            option.innerHTML = `
                <div class="doctor-option-content">
                    <span class="${doctorData.work === 'logout' ? 'disabled' : ''}">${doctorData.name}</span>
                    <img src="image/${doctorData.work}.png" alt="${doctorData.work}" class="status-icon">
                </div>
            `;
            doctorOptions.appendChild(option);
        });

        // 드롭다운 표시/숨김 토글
        doctorOptions.style.display = doctorOptions.style.display === 'none' ? 'block' : 'none';
    });

    // 의사 선택 이벤트
    doctorOptions.addEventListener('click', async (e) => {
        e.stopPropagation();
        const option = e.target.closest('.doctor-option');
        if (option && !option.classList.contains('disabled')) {
            const doctorId = option.dataset.value;
            
            // waitingRef 정의 시 currentDate 사용
            const waitingRef = collection(db, 'hospitals', hospitalName, 'dates', currentDate, 'waiting');

            // Choose a doctor 선택한 경우
            if (!doctorId) {
                const waitingDocRef = doc(waitingRef, patientId);
                await updateDoc(waitingDocRef, {
                    doctor: null
                });

                doctorSelected.style.color = 'rgb(110, 110, 124)';
                doctorSelected.textContent = 'Choose a doctor';
            } else {
                const doctorRef = doc(db, 'hospitals', hospitalName, 'staff', doctorId);
                const doctorDoc = await getDoc(doctorRef);
                const doctorData = doctorDoc.data();

                // 의사가 login 상태일 때 처리
                if (doctorData.work === 'login') {
                    alert('Doctor is not ready for patients.');
                    return;
                }

                // 의사의 현재 room 찾기
                const roomsRef = collection(db, 'hospitals', hospitalName, 'treatment.room');
                const roomsSnapshot = await getDocs(roomsRef);
                let doctorRoom = null;
                let currentRoom = null;

                // 환자가 현재 있는 room과 새로 배정될 room 찾기
                roomsSnapshot.forEach(roomDoc => {
                    const roomData = roomDoc.data();
                    if (roomData.doctor === doctorData.name) {
                        doctorRoom = { id: roomDoc.id, ...roomData };
                    }
                    if (roomData.patients?.some(patient => patient.id === patientId)) {
                        currentRoom = { id: roomDoc.id, ...roomData };
                    }
                });

                if (!doctorRoom) {
                    alert('Cannot find doctor\'s room.');
                    return;
                }

                // 같은 의사를 다시 선택한 경우
                if (currentRoom && currentRoom.id === doctorRoom.id) {
                    doctorOptions.style.display = 'none';
                    return;
                }

                // 다른 의사로 재배정하는 경우 확인 메시지
                if (currentRoom && !confirm(`Reassign to Dr. ${doctorData.name}?`)) {
                    doctorOptions.style.display = 'none';
                    return;
                }

                try {
                    // 현재 room에서 환자 제거 (이미 room에 있는 경우)
                    if (currentRoom) {
                        const updatedPatients = currentRoom.patients.filter(
                            patient => patient.id !== patientId
                        );
                        await updateDoc(doc(roomsRef, currentRoom.id), {
                            patients: updatedPatients
                        });
                    }

                    // register.date 문서 업데이트
                    const registerDateRef = collection(db, 'hospitals', hospitalName, 'patient', patientId, 'register.date');
                    const registerQuery = query(registerDateRef, where('timestamp', '>=', new Date(currentDate)));
                    const registerSnapshot = await getDocs(registerQuery);
                    
                    if (!registerSnapshot.empty) {
                        // 해당 날짜의 문서 업데이트
                        await updateDoc(registerSnapshot.docs[0].ref, {
                            doctor: doctorData.name // 새로 선택된 의사 이름으로 업데이트
                        });
                    }

                    // reservation 환자인 경우 추가 처리
                    if (type === 'reservation') {
                        // 1. register.date 문서 찾기
                        const registerDateRef = collection(db, 'hospitals', hospitalName, 'patient', patientId, 'register.date');
                        const registerQuery = query(registerDateRef, where('timestamp', '>=', new Date(currentDate)));
                        const registerSnapshot = await getDocs(registerQuery);
                        
                        if (!registerSnapshot.empty) {
                            // 해당 날짜의 문서 업데이트
                            await updateDoc(registerSnapshot.docs[0].ref, {
                                progress: 'waiting'
                            });
                        }

                        // 2. waiting 문서 생성
                        await setDoc(doc(waitingRef, patientId), {
                            doctor: doctorData.name,
                            progress: 'waiting',
                            primaryComplaint: patientData.primaryComplaint,
                            timestamp: serverTimestamp(),
                            gender: patientData.gender  // reservation의 gender 필드 가져오기
                        });

                        // 3. reservation 문서 삭제
                        const reservationRef = doc(db, 'hospitals', hospitalName, 'dates', currentDate, 'reservation', patientId);
                        await deleteDoc(reservationRef);
                    }

                    // 새로운 room에 환자 추가
                    const currentPatients = doctorRoom.patients || [];

                    // 환자의 register.date에서 원본 timestamp 가져오기
                    // 경로: /hospitals/병원명/patient/회원이름.idnumber/register.date/날짜
                    let originalTimestamp = null;
                    try {
                        const patientRegisterRef = collection(db, 'hospitals', hospitalName, 'patient', patientId, 'register.date');
                        const registerQuery = query(patientRegisterRef, where('timestamp', '>=', new Date(currentDate)));
                        const registerDocs = await getDocs(registerQuery);
                        
                        if (!registerDocs.empty) {
                            const registerData = registerDocs.docs[0].data();
                            originalTimestamp = registerData.timestamp;
                        }
                    } catch (error) {
                        console.error('Error getting original timestamp:', error);
                    }
                    
                    // 환자 정보에 timestamp 추가하여 room에 저장
                    await updateDoc(doc(roomsRef, doctorRoom.id), {
                        patients: [...currentPatients, {
                            id: patientId,
                            name: patientId.split('.')[0],
                            progress: type === 'reservation' ? 'waiting' : type,
                            timestamp: originalTimestamp // 원본 timestamp 추가
                        }]
                    });

                    // waiting 문서 업데이트 (waiting 환자인 경우)
                    if (type === 'waiting') {
                        const waitingDocRef = doc(waitingRef, patientId);
                        await updateDoc(waitingDocRef, {
                            doctor: doctorData.name
                        });
                    }

                    doctorSelected.style.color = '#000000';
                    doctorSelected.textContent = doctorData.name;

                } catch (error) {
                    console.error('Error updating patient status:', error);
                    alert('Failed to update patient status');
                }
            }
            
            doctorOptions.style.display = 'none';
        }
    });

    // 클릭 이벤트 추가
    patientElement.addEventListener('click', (e) => {
        // 이미 선택된 요소를 다시 클릭한 경우
        if (patientElement.classList.contains('selected')) {
            patientElement.classList.remove('selected');
            
            // 환자 선택 해제 이벤트 발생
            const deselectEvent = new CustomEvent('patientDeselected');
            document.dispatchEvent(deselectEvent);
            
            return;
        }

        // 다른 모든 환자 정보 UI의 selected 클래스 제거
        document.querySelectorAll('.patient-info-container').forEach(container => {
            container.classList.remove('selected');
        });
        
        // 클릭된 환자 정보 UI에 selected 클래스 추가
        patientElement.classList.add('selected');
        
        // 처방전 결제 컨테이너에 환자 정보 전달
        const event = new CustomEvent('patientSelectedForPayment', {
            detail: {
                patientId: patientId
            }
        });
        document.dispatchEvent(event);
    });

    // 삭제 버튼 이벤트 리스너 추가
    const deleteBtn = patientElement.querySelector('.delete-patient-btn');
    deleteBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        
        // 첫 번째 확인 창
        if (confirm('Are you sure you want to delete this patient?')) {
            // 두 번째 확인 창 - 커스텀 모달 사용
            const confirmed = await showWarningModal(
                'When deleting a registered patient, you will need to re-register them in the patient list.',
                'Warning'
            );
            
            if (confirmed) {
                try {
                    // 환자 문서 삭제
                    if (type === 'waiting') {
                        const waitingRef = doc(db, 'hospitals', hospitalName, 'dates', currentDate, 'waiting', patientId);
                        await deleteDoc(waitingRef);
                    } else if (type === 'reservation') {
                        const reservationRef = doc(db, 'hospitals', hospitalName, 'dates', currentDate, 'reservation', patientId);
                        await deleteDoc(reservationRef);
                    } else if (type === 'active') {
                        const activeRef = doc(db, 'hospitals', hospitalName, 'dates', currentDate, 'active', patientId);
                        await deleteDoc(activeRef);
                    } else if (type === 'payment') {  // payment 상태 추가
                        const paymentRef = doc(db, 'hospitals', hospitalName, 'dates', currentDate, 'payment', patientId);
                        await deleteDoc(paymentRef);
                    }

                    // Room에서 환자 정보 삭제 //이 로직은 추후 삭제될수있음 2025-02-14
                    const roomsRef = collection(db, 'hospitals', hospitalName, 'treatment.room');
                    const roomsSnapshot = await getDocs(roomsRef);
                    
                    roomsSnapshot.forEach(async roomDoc => {
                        const roomData = roomDoc.data();
                        if (roomData.patients) {
                            // 삭제된 환자를 제외한 환자 목록 생성
                            const updatedPatients = roomData.patients.filter(
                                patient => patient.id !== patientId
                            );
                            
                            // 환자 목록이 변경된 경우에만 업데이트
                            if (updatedPatients.length !== roomData.patients.length) {
                                await updateDoc(doc(roomsRef, roomDoc.id), {
                                    patients: updatedPatients
                                });
                            }
                        }
                    });

                    // 환자 삭제 이벤트 발생 - Payment 컨테이너와 Prescription 화면 초기화를 위해
                    const patientDeletedEvent = new CustomEvent('patientDeleted', {
                        detail: {
                            patientId: patientId
                        }
                    });
                    document.dispatchEvent(patientDeletedEvent);

                } catch (error) {
                    console.error('Error deleting patient:', error);
                    alert('Failed to delete patient');
                }
            }
        }
    });

    return patientElement;
}

export async function initializePatientList(hospitalName, currentDate) {
    const patientListBody = document.querySelector('#desk-content .content-body');
    if (!patientListBody) return;

    // 컬렉션 참조 - payment 추가
    const waitingRef = collection(db, 'hospitals', hospitalName, 'dates', currentDate, 'waiting');
    const reservationRef = collection(db, 'hospitals', hospitalName, 'dates', currentDate, 'reservation');
    const activeRef = collection(db, 'hospitals', hospitalName, 'dates', currentDate, 'active');
    const paymentRef = collection(db, 'hospitals', hospitalName, 'dates', currentDate, 'payment'); // 추가

    // 쿼리 설정 - payment 추가
    const waitingQuery = query(waitingRef, orderBy('timestamp', 'asc'));
    const reservationQuery = query(reservationRef, orderBy('rsvdTime', 'asc'));
    const activeQuery = query(activeRef, orderBy('timestamp', 'asc'));
    const paymentQuery = query(paymentRef, orderBy('timestamp', 'asc')); // 추가

    // 환자 목록 업데이트 및 정렬
    function updatePatientList() {
        const patientListBody = document.querySelector('#desk-content .content-body');
        if (!patientListBody) return;
        
        patientListBody.innerHTML = '';
        
        // 중복 제거를 위해 Set 사용
        const uniquePatients = new Map();
        
        allPatients.forEach(patient => {
            const key = `${patient.type}-${patient.element.querySelector('.patient-id-span').textContent}`;
            uniquePatients.set(key, patient);
        });
        
        // 중복이 제거된 환자 목록을 다시 배열로 변환하여 정렬
        Array.from(uniquePatients.values())
            .sort((a, b) => {
                // payment 상태 추가
                if (a.type === 'waiting' && b.type === 'waiting') {
                    return a.timestamp - b.timestamp;
                }
                if (a.type === 'reservation' && b.type === 'reservation') {
                    return a.rsvdTime - b.rsvdTime;
                }
                if (a.type === 'payment' && b.type === 'payment') { // 추가
                    return a.timestamp - b.timestamp;
                }
                // 정렬 순서: waiting -> active -> payment -> reservation
                if (a.type === 'waiting') return -1;
                if (b.type === 'waiting') return 1;
                if (a.type === 'active') return -1;
                if (b.type === 'active') return 1;
                if (a.type === 'payment') return -1; // 추가
                if (b.type === 'payment') return 1; // 추가
                return 1;
            })
            .forEach(patient => {
                if (patient.element) {
                    patientListBody.appendChild(patient.element);
                }
            });
    }

    // waiting 리스너
    const unsubscribeWaiting = onSnapshot(waitingQuery, async (snapshot) => {
        allPatients = allPatients.filter(p => p.type !== 'waiting');
        
        for (const doc of snapshot.docs) {
            const patientData = doc.data();
            const element = await createPatientElement(hospitalName, patientData, doc.id, 'waiting', currentDate);
            if (element) {
                allPatients.push({
                    type: 'waiting',
                    timestamp: patientData.timestamp,
                    element: element
                });
            }
        }
        updatePatientList();
    });

    // reservation 리스너
    const unsubscribeReservation = onSnapshot(reservationQuery, async (snapshot) => {
        allPatients = allPatients.filter(p => p.type !== 'reservation');
        
        for (const doc of snapshot.docs) {
            const patientData = doc.data();
            const element = await createPatientElement(hospitalName, patientData, doc.id, 'reservation', currentDate);
            if (element) {
                allPatients.push({
                    type: 'reservation',
                    rsvdTime: patientData.rsvdTime,
                    element: element
                });
            }
        }
        updatePatientList();
    });

    // active 리스너 추가
    const unsubscribeActive = onSnapshot(activeQuery, async (snapshot) => {
        allPatients = allPatients.filter(p => p.type !== 'active');
        
        for (const doc of snapshot.docs) {
            const patientData = doc.data();
            const element = await createPatientElement(hospitalName, patientData, doc.id, 'active', currentDate);
            if (element) {
                allPatients.push({
                    type: 'active',
                    timestamp: patientData.timestamp,
                    element: element
                });
            }
        }
        updatePatientList();
    });

    // payment 리스너 추가
    const unsubscribePayment = onSnapshot(paymentQuery, async (snapshot) => {
        allPatients = allPatients.filter(p => p.type !== 'payment');
        
        for (const doc of snapshot.docs) {
            const patientData = doc.data();
            const element = await createPatientElement(hospitalName, patientData, doc.id, 'payment', currentDate);
            if (element) {
                allPatients.push({
                    type: 'payment',
                    timestamp: patientData.timestamp,
                    element: element
                });
            }
        }
        updatePatientList();
    });

    return () => {
        unsubscribeWaiting();
        unsubscribeReservation();
        unsubscribeActive();
        unsubscribePayment(); // 추가
    };
}

// desk-menu.js의 메뉴 클릭 이벤트에서 selected 상태를 초기화하는 코드 추가
export function clearPatientSelection() {
    document.querySelectorAll('.patient-info-container').forEach(container => {
        container.classList.remove('selected');
    });
}

// 커스텀 경고 모달 함수 추가
function showWarningModal(message, title = 'Warning') {
    return new Promise((resolve) => {
        // 기존 모달이 있으면 제거
        const existingModal = document.getElementById('warning-modal');
        if (existingModal) {
            existingModal.remove();
        }

        // 모달 컨테이너 생성
        const modalContainer = document.createElement('div');
        modalContainer.id = 'warning-modal';
        modalContainer.style.position = 'fixed';
        modalContainer.style.top = '0';
        modalContainer.style.left = '0';
        modalContainer.style.width = '100%';
        modalContainer.style.height = '100%';
        modalContainer.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
        modalContainer.style.display = 'flex';
        modalContainer.style.justifyContent = 'center';
        modalContainer.style.alignItems = 'center';
        modalContainer.style.zIndex = '9999';

        // 모달 콘텐츠 생성
        const modalContent = document.createElement('div');
        modalContent.style.backgroundColor = 'white';
        modalContent.style.padding = '20px';
        modalContent.style.borderRadius = '5px';
        modalContent.style.width = '400px';
        modalContent.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.2)';

        // 제목 생성
        const titleElement = document.createElement('h3');
        titleElement.textContent = title;
        titleElement.style.color = '#d9534f'; // 빨간색 경고 색상
        titleElement.style.textAlign = 'center';
        titleElement.style.margin = '0 0 20px 0';
        titleElement.style.fontWeight = 'bold';

        // 메시지 생성
        const messageElement = document.createElement('p');
        messageElement.textContent = message;
        messageElement.style.textAlign = 'center';
        messageElement.style.margin = '0 0 20px 0';

        // 버튼 컨테이너
        const buttonContainer = document.createElement('div');
        buttonContainer.style.display = 'flex';
        buttonContainer.style.justifyContent = 'center';
        buttonContainer.style.gap = '10px';

        // Yes 버튼
        const yesButton = document.createElement('button');
        yesButton.textContent = 'Yes';
        yesButton.style.padding = '8px 16px';
        yesButton.style.backgroundColor = '#d9534f';
        yesButton.style.color = 'white';
        yesButton.style.border = 'none';
        yesButton.style.borderRadius = '4px';
        yesButton.style.cursor = 'pointer';

        // No 버튼
        const noButton = document.createElement('button');
        noButton.textContent = 'No';
        noButton.style.padding = '8px 16px';
        noButton.style.backgroundColor = '#f0f0f0';
        noButton.style.border = 'none';
        noButton.style.borderRadius = '4px';
        noButton.style.cursor = 'pointer';

        // 이벤트 리스너 추가
        yesButton.addEventListener('click', () => {
            modalContainer.remove();
            resolve(true);
        });

        noButton.addEventListener('click', () => {
            modalContainer.remove();
            resolve(false);
        });

        // 모달 외부 클릭 시 닫기
        modalContainer.addEventListener('click', (e) => {
            if (e.target === modalContainer) {
                modalContainer.remove();
                resolve(false);
            }
        });

        // 요소 조립
        buttonContainer.appendChild(noButton);
        buttonContainer.appendChild(yesButton);
        
        modalContent.appendChild(titleElement);
        modalContent.appendChild(messageElement);
        modalContent.appendChild(buttonContainer);
        
        modalContainer.appendChild(modalContent);
        
        // 모달을 body에 추가
        document.body.appendChild(modalContainer);
    });
}
