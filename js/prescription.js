import { auth, db, doc, getDoc, setDoc, collection, getDocs, serverTimestamp, updateDoc, deleteDoc } from './firebase-config.js';
import { initializePrescriptionHistory } from './prescriptHistory.js';

// Prescription 컨테이너 초기화
export function initializePrescription() {
    const prescriptionTitle = document.querySelector('#prescription-content .content-title-prescription');
    const patientSelectWrapper = document.querySelector('#prescription-content .patient-select-wrapper');
    const prescriptionBody = document.querySelector('#prescription-content .content-body-prescription');
    const prescriptionBody2 = document.querySelector('#prescription-content .content-body-prescription2');
    const prescriptionFooter = document.querySelector('#prescription-content .content-footer-prescription');

    let currentPatientId = null;
    let currentRegisterDate = null;

    // Close 버튼 추가
    const closeButton = document.createElement('button');
    closeButton.className = 'close-button';
    document.querySelector('.content-header-prescription').appendChild(closeButton);

    // Close 버튼 클릭 이벤트
    closeButton.addEventListener('click', () => {
        prescriptionBody.style.display = 'none';
        prescriptionBody2.style.display = 'none';
        prescriptionFooter.style.display = 'none';
        patientSelectWrapper.style.display = 'flex';
        document.querySelector('#prescription-content').style.display = 'none';
    });

    // 처방전 내용 초기화 함수 추가
    function clearPrescriptionForm() {
        // CC 항목 초기화
        const ccItemsContainer = document.querySelector('.cc-items-container');
        if (ccItemsContainer) {
            ccItemsContainer.innerHTML = '';
        }
        
        // Medicine 항목 초기화
        const medicineItemsContainer = document.querySelector('.medicine-items-container');
        if (medicineItemsContainer) {
            medicineItemsContainer.innerHTML = '';
        }
        
        // 입력 필드 초기화
        document.querySelectorAll('.cc-search-input, .medicine-search-input, .symptoms-input, .location-input, .treatment-details-input').forEach(element => {
            element.value = '';
        });
        
        // Canvas 초기화
        const canvas = document.querySelector('.tooth-chart-canvas');
        if (canvas) {
            const ctx = canvas.getContext('2d');
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            initializeCanvas(); // 캔버스 다시 초기화
        }
    }

    // Room의 환자 클릭 이벤트에 대한 처리
    document.addEventListener('prescriptionPatientSelected', (e) => {
        const { name, gender, birthDate, age, patientId, registerDate } = e.detail;
        
        // 환자가 변경되었을 때 처방전 내용 초기화
        clearPrescriptionForm();
        
        // 현재 환자 정보 저장
        currentPatientId = patientId;
        currentRegisterDate = registerDate;
        
        // 먼저 UI를 표시
        if (prescriptionTitle) {
            // 날짜 포맷팅
            const formattedDate = birthDate.toLocaleDateString('en-GB', {
                day: '2-digit',
                month: 'short',
                year: 'numeric'
            }).replace(/ /g, ' ');

            // 타이틀 HTML 구성
            prescriptionTitle.innerHTML = `
                <span style="font-size: 16px; color: black; font-weight: bold;">${name}</span>
                <img src="image/${gender || 'unknown'}.png" alt="${gender}" class="gender-icon" style="margin: 0 5px;">
                <span style="margin-right: 5px;">${age}y</span>
                <span style="color: #666;">(${formattedDate})</span>
            `;
        }
        
        // 메시지 컨테이너 숨기고 레이아웃 표시
        patientSelectWrapper.style.display = 'none';
        prescriptionBody.style.display = 'block';
        prescriptionBody2.style.display = 'block';
        prescriptionFooter.style.display = 'flex';

        // 현재 room 이름 업데이트
        updateCurrentRoomName();

        // Canvas 초기화
        initializeCanvas();

        // 처방전 히스토리 초기화
        initializePrescriptionHistory(patientId);
        
        // UI가 생성된 후에 비활성화 처리
        requestAnimationFrame(() => {
            // 모든 입력 필드 비활성화
            document.querySelectorAll('.cc-search-input, .medicine-search-input, .symptoms-input, .location-input, .treatment-details-input').forEach(element => {
                element.disabled = true;
            });
            
            // Canvas 비활성화
            document.querySelector('.tooth-chart-canvas').style.pointerEvents = 'none';
            
            // Clear 버튼 비활성화
            document.querySelector('.clear-btn').disabled = true;
        });
        
        // 초기 상태는 저장되지 않은 상태로 설정
        updateButtonStates(false);
    });

    // 처방전 히스토리 선택 이벤트 처리 - 히스토리 선택 시에도 폼 초기화
    document.addEventListener('prescriptionHistorySelected', () => {
        // 히스토리 선택 시에도 폼 초기화
        clearPrescriptionForm();
    });

    // 프린터 버튼 생성
    const printBtn = document.createElement('button');
    printBtn.className = 'print-btn';
    document.querySelector('.content-footer-prescription').appendChild(printBtn);

    // Save 버튼 추가 (프린터 버튼 왼쪽에)
    const saveBtn = document.createElement('button');
    saveBtn.className = 'save-btn';
    saveBtn.textContent = 'Save';
    document.querySelector('.content-footer-prescription').insertBefore(saveBtn, printBtn);

    // 수납실 선택 드롭다운 추가
    const deskSelect = document.createElement('select');
    deskSelect.className = 'desk-select';

    // 수납실 목록 가져오기
    const [hospitalName] = auth.currentUser.email.split('@')[0].split('.');
    const desksRef = collection(db, 'hospitals', hospitalName, 'desk');
    getDocs(desksRef).then(snapshot => {
        const desks = [];
        snapshot.forEach(doc => desks.push(doc.id));
        desks.sort();
        
        desks.forEach(deskId => {
            const option = document.createElement('option');
            option.value = deskId;
            option.textContent = deskId;
            deskSelect.appendChild(option);
        });
    });

    document.querySelector('.content-footer-prescription').appendChild(deskSelect);

    // content-footer-prescription에 Send 버튼 추가
    const sendBtn = document.createElement('button');
    sendBtn.className = 'send-btn';
    sendBtn.textContent = 'Send';
    document.querySelector('.content-footer-prescription').appendChild(sendBtn);

    // Save 버튼 클릭 이벤트 추가
    saveBtn.addEventListener('click', async () => {
        try {
            if (!currentPatientId || !currentRegisterDate) {
                throw new Error('Patient information not found');
            }

            // 필수 입력 항목 체크
            const symptoms = document.querySelector('.symptoms-input').value.trim();
            const location = document.querySelector('.location-input').value.trim();
            const treatmentDetails = document.querySelector('.treatment-details-input').value.trim();
            const ccItems = Array.from(document.querySelectorAll('.cc-item .cc-item-text'));

            // 빈 항목 체크
            const emptyFields = [];
            if (!symptoms) emptyFields.push('Symptoms');
            if (!location) emptyFields.push('Location');
            if (!treatmentDetails) emptyFields.push('Treatment Details');
            if (ccItems.length === 0) emptyFields.push('CC');

            // 빈 항목이 있으면 알림 표시하고 중단
            if (emptyFields.length > 0) {
                alert(`Please fill in the following required fields:\n${emptyFields.join('\n')}`);
                return;
            }

            const [hospitalName] = auth.currentUser.email.split('@')[0].split('.');
            
            // Medicine 항목들 수집 (선택사항)
            const medicineItems = Array.from(document.querySelectorAll('.medicine-item')).map(item => ({
                name: item.querySelector('.medicine-item-text').textContent,
                perDose: item.querySelector('.medicine-dropdown:nth-child(1) button').textContent,
                perDay: item.querySelector('.medicine-dropdown:nth-child(2) button').textContent,
                days: item.querySelector('.medicine-dropdown:nth-child(3) button').textContent
            }));

            // Canvas 이미지 데이터 가져오기
            const canvas = document.querySelector('.tooth-chart-canvas');
            const chartImage = canvas.toDataURL('image/png');

            // 1. register.date 문서의 progress 업데이트
            await updateDoc(doc(db, 'hospitals', hospitalName, 'patient', currentPatientId, 'register.date', currentRegisterDate), {
                progress: 'payment'
            });

            // 2. dates 컬렉션 처리
            const today = new Date();
            const currentDate = today.toLocaleDateString('en-GB', {
                day: '2-digit',
                month: 'short',
                year: 'numeric'
            }).replace(/ /g, '.');

            // 기존 상태 문서 찾기 및 이동
            const collections = ['waiting', 'reservation', 'active'];
            for (const collectionName of collections) {
                const docRef = doc(db, 'hospitals', hospitalName, 'dates', currentDate, collectionName, currentPatientId);
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    const patientData = docSnap.data();
                    // 기존 문서 삭제
                    await deleteDoc(docRef);
                    // payment 컬렉션으로 이동
                    await setDoc(doc(db, 'hospitals', hospitalName, 'dates', currentDate, 'payment', currentPatientId), {
                        ...patientData,
                        progress: 'payment'
                    });
                    break;
                }
            }

            // 3. treatment.room의 patients 배열 업데이트
            const roomsRef = collection(db, 'hospitals', hospitalName, 'treatment.room');
            const roomsSnapshot = await getDocs(roomsRef);
            
            for (const roomDoc of roomsSnapshot.docs) {
                const roomData = roomDoc.data();
                if (roomData.patients) {
                    const updatedPatients = roomData.patients.map(patient => {
                        if (patient.id === currentPatientId) {
                            return { ...patient, progress: 'payment' };
                        }
                        return patient;
                    });

                    if (JSON.stringify(roomData.patients) !== JSON.stringify(updatedPatients)) {
                        await updateDoc(roomDoc.ref, { patients: updatedPatients });
                    }
                }
            }

            // 기존 문서에 prescription 데이터 추가하기 전에 추가
            // 하지만 새로운 처방전 저장 시에는 형식 통일 필요
            const now = new Date();
            const dateId = `${now.toLocaleDateString('en-GB', {
                day: '2-digit',
                month: 'short',
                year: 'numeric'
            }).replace(/ /g, '.')}_${now.getHours().toString().padStart(2,'0')}${now.getMinutes().toString().padStart(2,'0')}${now.getSeconds().toString().padStart(2,'0')}`;

            // 기존 문서에 prescription 데이터 추가
            const prescriptionRef = doc(db, 'hospitals', hospitalName, 'patient', currentPatientId, 'register.date', currentRegisterDate);
            
            await updateDoc(prescriptionRef, {
                prescription: {
                    symptoms,
                    location,
                    treatmentDetails,
                    cc: ccItems.map(item => item.textContent),
                    medicines: medicineItems
                },
                chartImage,
                progress: 'payment'
            });

            // 저장 성공 후 History UI 즉시 업데이트
            await initializePrescriptionHistory(currentPatientId);
            
            // 저장 성공 후 버튼 상태 업데이트
            updateButtonStates(true);
            
            // 저장 성공 메시지
            alert('Prescription saved successfully!');
            
            // 폼 초기화
            document.querySelector('.symptoms-input').value = '';
            document.querySelector('.location-input').value = '';
            document.querySelector('.treatment-details-input').value = '';
            document.querySelectorAll('.cc-item').forEach(item => item.remove());
            document.querySelectorAll('.medicine-item').forEach(item => item.remove());
            
            // Canvas 초기화
            const ctx = canvas.getContext('2d');
            ctx.clearRect(0, 0, canvas.width, canvas.height);

        } catch (error) {
            console.error('Failed to save prescription:', error);
            alert(`Failed to save prescription: ${error.message}`);
        }
    });

    // Send 버튼 클릭 이벤트 수정
    sendBtn.addEventListener('click', async () => {
        try {
            // 처방전이 저장되지 않은 상태면 알림 표시
            if (!sendBtn.disabled) {
                // 확인 팝업 표시
                if (confirm('Would you like to send this prescription?')) {
                    if (!currentPatientId || !currentRegisterDate) {
                        throw new Error('Patient information not found');
                    }

                    const [hospitalName] = auth.currentUser.email.split('@')[0].split('.');
                    
                    // 선택된 수납실 가져오기
                    const deskSelect = document.querySelector('.desk-select');
                    const selectedDesk = deskSelect.value;
                    
                    if (!selectedDesk) {
                        alert('Please select a desk');
                        return;
                    }
                    
                    // 1. 현재 환자가 있는 진료실 찾기
                    const roomsRef = collection(db, 'hospitals', hospitalName, 'treatment.room');
                    const roomsSnapshot = await getDocs(roomsRef);
                    
                    let currentRoom = null;
                    let patientData = null;
                    
                    for (const roomDoc of roomsSnapshot.docs) {
                        const roomData = roomDoc.data();
                        if (roomData.patients) {
                            const patientIndex = roomData.patients.findIndex(p => p.id === currentPatientId);
                            if (patientIndex !== -1) {
                                currentRoom = roomDoc;
                                patientData = roomData.patients[patientIndex];
                                break;
                            }
                        }
                    }
                    
                    if (!currentRoom) {
                        throw new Error('Patient not found in any room');
                    }
                    
                    // 2. 진료실에서 환자 제거
                    const updatedRoomPatients = currentRoom.data().patients.filter(p => p.id !== currentPatientId);
                    await updateDoc(currentRoom.ref, {
                        patients: updatedRoomPatients
                    });
                    
                    // 3. 수납실에 환자 추가
                    const deskRef = doc(db, 'hospitals', hospitalName, 'desk', selectedDesk);
                    const deskDoc = await getDoc(deskRef);
                    
                    if (deskDoc.exists()) {
                        const deskData = deskDoc.data();
                        const deskPatients = deskData.patients || [];
                        
                        // 환자 데이터 준비 (progress를 payment로 설정)
                        const patientToAdd = {
                            id: patientData.id,
                            name: patientData.name,
                            progress: 'payment'
                        };
                        
                        // 중복 방지를 위해 기존 환자 확인
                        const existingIndex = deskPatients.findIndex(p => p.id === currentPatientId);
                        if (existingIndex !== -1) {
                            deskPatients[existingIndex] = patientToAdd;
                        } else {
                            deskPatients.push(patientToAdd);
                        }
                        
                        await updateDoc(deskRef, {
                            patients: deskPatients
                        });
                        
                        alert('Patient has been sent to the selected desk');
                        
                        // 처방전 컨테이너 닫기
                        document.querySelector('.close-button').click();
                    } else {
                        throw new Error('Selected desk not found');
                    }
                }
            }
        } catch (error) {
            console.error('Error sending patient to desk:', error);
            alert(`Failed to send patient: ${error.message}`);
        }
    });

    // prescription-center-bottom에 CC 검색 폼 추가
    const ccSearchContainer = document.createElement('div');
    ccSearchContainer.className = 'cc-search-container';
    ccSearchContainer.innerHTML = `
        <input type="text" class="cc-search-input" placeholder="CC...">
    `;
    document.querySelector('.prescription-center-bottom').appendChild(ccSearchContainer);

    // CC 검색 초기화 호출 추가
    initializeCCSearch();

    // prescription-center-bottom에 Medicine 검색 폼 추가
    const medicineSearchContainer = document.createElement('div');
    medicineSearchContainer.className = 'medicine-search-container';
    medicineSearchContainer.innerHTML = `
        <input type="text" class="medicine-search-input" placeholder="Medicines...">
    `;
    document.querySelector('.prescription-center-bottom').appendChild(medicineSearchContainer);

    // Medicine 검색 초기화
    initializeMedicineSearch();

    // 히스토리 선택 이벤트 리스너 추가
    document.addEventListener('prescriptionHistorySelected', (e) => {
        const { prescriptionData, registerDate, doctor } = e.detail;
        
        // 기본 입력 필드 데이터 표시
        document.querySelector('.symptoms-input').value = prescriptionData.symptoms || '';
        document.querySelector('.location-input').value = prescriptionData.location || '';
        document.querySelector('.treatment-details-input').value = prescriptionData.treatmentDetails || '';

        // CC 목록 표시
        const ccContainer = document.querySelector('.cc-items-container');
        ccContainer.innerHTML = '';
        prescriptionData.cc.forEach(cc => {
            const ccItem = document.createElement('div');
            ccItem.className = 'cc-item';
            ccItem.innerHTML = `
                <span class="cc-item-text">${cc}</span>
            `;
            ccContainer.appendChild(ccItem);
        });

        // 약 처방 목록 표시
        const medicineContainer = document.querySelector('.medicine-items-container');
        medicineContainer.innerHTML = '';
        if (prescriptionData.medicines) {
            prescriptionData.medicines.forEach(medicine => {
                const medicineItem = document.createElement('div');
                medicineItem.className = 'medicine-item';
                medicineItem.innerHTML = `
                    <span class="medicine-item-text">${medicine.name}</span>
                    <div class="medicine-controls">
                        <div class="medicine-dropdown">
                            <button class="medicine-dropdown-button">${medicine.perDose}</button>
                        </div>
                        <div class="medicine-dropdown">
                            <button class="medicine-dropdown-button">${medicine.perDay}</button>
                        </div>
                        <div class="medicine-dropdown">
                            <button class="medicine-dropdown-button">${medicine.days}</button>
                        </div>
                    </div>
                `;
                medicineContainer.appendChild(medicineItem);
            });
        }

        // 치아 차트 데이터 표시
        const canvas = document.querySelector('.tooth-chart-canvas');
        const ctx = canvas.getContext('2d');
        if (e.detail.chartImage) {
            const img = new Image();
            img.onload = () => {
                // 캔버스의 실제 크기를 저장
                const canvasWidth = canvas.offsetWidth;
                const canvasHeight = canvas.offsetHeight;
                
                // 캔버스의 drawing buffer 크기를 설정
                canvas.width = canvasWidth;
                canvas.height = canvasHeight;
                
                // 컨텍스트 초기화
                ctx.clearRect(0, 0, canvasWidth, canvasHeight);
                
                // 이미지를 캔버스 크기에 맞게 그리기
                ctx.drawImage(img, 0, 0, canvasWidth, canvasHeight);
            };
            img.src = e.detail.chartImage;

            // 브라우저 리사이즈 이벤트 처리
            window.addEventListener('resize', () => {
                if (img.complete) {  // 이미지가 로드된 경우에만
                    const canvasWidth = canvas.offsetWidth;
                    const canvasHeight = canvas.offsetHeight;
                    
                    canvas.width = canvasWidth;
                    canvas.height = canvasHeight;
                    
                    ctx.clearRect(0, 0, canvasWidth, canvasHeight);
                    ctx.drawImage(img, 0, 0, canvasWidth, canvasHeight);
                }
            });
        }

        // 모든 입력 필드와 버튼 비활성화
        document.querySelectorAll('.cc-search-input, .medicine-search-input, .symptoms-input, .location-input, .treatment-details-input, .clear-btn').forEach(element => {
            element.disabled = true;
        });

        // 드롭다운 버튼 비활성화
        document.querySelectorAll('.medicine-dropdown-button').forEach(button => {
            button.disabled = true;
        });

        // Canvas 비활성화
        canvas.style.pointerEvents = 'none';

        // 히스토리에서 선택한 경우 저장된 상태로 설정
        updateButtonStates(true);
    });

    // New Chart 버튼 클릭 시 초기화할 때는 다시 활성화
    document.querySelector('.new-chart-btn').addEventListener('click', async () => {
        try {
            const [hospitalName] = auth.currentUser.email.split('@')[0].split('.');
            
            // 1. Prescription History UI 선택 해제
            document.querySelectorAll('.prescript-history-record.selected').forEach(item => {
                item.classList.remove('selected');
            });

            // 2. 처방전 입력 폼 완전 초기화
            // CC, Medicine 컨테이너 초기화
            document.querySelector('.cc-items-container').innerHTML = '';
            document.querySelector('.medicine-items-container').innerHTML = '';
            
            // 입력 필드 초기화
            document.querySelector('.symptoms-input').value = '';
            document.querySelector('.location-input').value = '';
            document.querySelector('.treatment-details-input').value = '';
            
            // Canvas 초기화
            const canvas = document.querySelector('.tooth-chart-canvas');
            const ctx = canvas.getContext('2d');
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            // 모든 입력 요소 활성화
            document.querySelectorAll('.cc-search-input, .medicine-search-input, .symptoms-input, .location-input, .treatment-details-input, .clear-btn').forEach(element => {
                element.disabled = false;
            });
            canvas.style.pointerEvents = 'auto';

            // 3. 환자 상태 변경
            const currentDate = new Date().toLocaleDateString('en-GB', {
                day: '2-digit',
                month: 'short',
                year: 'numeric'
            }).replace(/ /g, '.');

            // waiting 문서에서 환자 데이터 가져오기
            const waitingRef = doc(db, 'hospitals', hospitalName, 'dates', currentDate, 'waiting', currentPatientId);
            const waitingDoc = await getDoc(waitingRef);
            
            if (waitingDoc.exists()) {
                const patientData = waitingDoc.data();
                
                // active 컬렉션에 환자 데이터 복사하며 progress 변경
                const activeRef = doc(db, 'hospitals', hospitalName, 'dates', currentDate, 'active', currentPatientId);
                await setDoc(activeRef, {
                    ...patientData,
                    progress: 'active'
                });

                // waiting 문서 삭제
                await deleteDoc(waitingRef);

                // treatment.room의 patients 배열 업데이트
                const roomsRef = collection(db, 'hospitals', hospitalName, 'treatment.room');
                const roomsSnapshot = await getDocs(roomsRef);
                
                roomsSnapshot.forEach(async (roomDoc) => {
                    const roomData = roomDoc.data();
                    if (roomData.patients) {
                        const updatedPatients = roomData.patients.map(patient => {
                            if (patient.id === currentPatientId) {
                                return { ...patient, progress: 'active' };
                            }
                            return patient;
                        });
                        
                        await updateDoc(roomDoc.ref, { patients: updatedPatients });
                    }
                });

                // register.date 문서 업데이트
                const registerDateRef = doc(db, 'hospitals', hospitalName, 'patient', currentPatientId, 'register.date', currentRegisterDate);
                await updateDoc(registerDateRef, {
                    progress: 'active'
                });

                // 4. UI 상태 아이콘 업데이트
                // Room UI의 환자 아이콘 업데이트 (47px × 20px)
                document.querySelectorAll(`.room-patient-item[data-patient-id="${currentPatientId}"] .patient-status-icon`).forEach(icon => {
                    icon.src = 'image/active.png';
                    icon.style.width = '47px';
                    icon.style.height = '20px';
                });

                // Patient List UI의 환자 아이콘 업데이트 (73px × 30.5px)
                document.querySelectorAll(`.patient-info-container[data-patient-id="${currentPatientId}"] .progress-span img`).forEach(icon => {
                    icon.src = 'image/active.png';
                    icon.style.width = '73px';
                    icon.style.height = '30.5px';
                });
            }
        } catch (error) {
            console.error('Error in New Chart:', error);
            alert('Failed to initialize new chart');
        }
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

// Canvas 관련 기능 초기화
function initializeCanvas() {
    const canvas = document.querySelector('.tooth-chart-canvas');
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    let isDrawing = false;
    let lastX = 0;
    let lastY = 0;
    const drawHistory = [];
    let currentDrawing = null;
    let isNewPatient = true;  // 새 환자 여부를 추적하는 플래그 추가

    // 폼이 없을 때만 생성
    if (!document.querySelector('.symptoms-form')) {
        createForms();
    }

    // Canvas 초기화
    clearCanvas();
    
    // 기존 컨트롤 버튼들 제거
    const existingControls = document.querySelector('.chart-controls');
    if (existingControls) {
        existingControls.remove();
    }

    // 컨트롤 버튼 추가
    const controlsDiv = document.createElement('div');
    controlsDiv.className = 'chart-controls';
    controlsDiv.innerHTML = `
        <button class="undo-btn">Undo</button>
        <button class="clear-btn">Clear</button>
    `;
    document.querySelector('.prescription-center-top').appendChild(controlsDiv);

    // 이벤트 리스너 설정 - 직접 버튼 요소 가져오기
    const undoBtn = controlsDiv.querySelector('.undo-btn');
    const clearBtn = controlsDiv.querySelector('.clear-btn');

    undoBtn.addEventListener('click', undo);
    clearBtn.addEventListener('click', clearCanvas);

    // Canvas 크기 조정 함수
    function resizeCanvas() {
        const img = document.querySelector('.tooth-chart-img');
        const rect = img.getBoundingClientRect();
        
        // 현재 캔버스 상태 저장
        const tempDrawing = isNewPatient ? null : canvas.toDataURL();
        
        // Canvas 크기 조정
        canvas.style.width = `${rect.width}px`;
        canvas.style.height = `${rect.height}px`;
        canvas.width = rect.width;
        canvas.height = rect.height;
        
        // 컨텍스트 설정
        ctx.strokeStyle = '#FF0000';
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        
        // 새 환자가 아닐 때만 그림 복원
        if (tempDrawing && !isNewPatient) {
            const img = new Image();
            img.onload = () => {
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                drawHistory.push(ctx.getImageData(0, 0, canvas.width, canvas.height));
            };
            img.src = tempDrawing;
        }
    }

    // prescriptionPatientSelected 이벤트 리스너 추가
    document.addEventListener('prescriptionPatientSelected', () => {
        isNewPatient = true;  // 새 환자 선택 시 플래그 설정
        clearCanvas();
        currentDrawing = null;
        drawHistory.length = 0;
    });

    // prescriptionHistorySelected 이벤트 리스너 추가
    document.addEventListener('prescriptionHistorySelected', () => {
        isNewPatient = false;  // 히스토리 선택 시 플래그 해제
    });

    // 초기 크기 설정
    resizeCanvas();

    // 윈도우 리사이즈 이벤트에 대응
    window.addEventListener('resize', resizeCanvas);

    // 마우스 이벤트 핸들러
    function getMousePos(e) {
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        return {
            x: (e.clientX - rect.left) * scaleX,
            y: (e.clientY - rect.top) * scaleY
        };
    }

    function startDrawing(e) {
        isDrawing = true;
        const pos = getMousePos(e);
        [lastX, lastY] = [pos.x, pos.y];
        drawHistory.push(ctx.getImageData(0, 0, canvas.width, canvas.height));
    }

    function stopDrawing() {
        isDrawing = false;
    }

    function draw(e) {
        if (!isDrawing) return;
        const pos = getMousePos(e);
        ctx.beginPath();
        ctx.moveTo(lastX, lastY);
        ctx.lineTo(pos.x, pos.y);
        ctx.stroke();
        [lastX, lastY] = [pos.x, pos.y];
    }

    function undo() {
        if (drawHistory.length > 0) {
            ctx.putImageData(drawHistory.pop(), 0, 0);
        }
    }

    function clearCanvas() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        drawHistory.length = 0;
        
        // 입력 폼 초기화
        document.querySelector('.symptoms-input').value = '';
        document.querySelector('.location-input').value = '';
        document.querySelector('.treatment-details-input').value = '';
    }

    canvas.addEventListener('mousedown', startDrawing);
    canvas.addEventListener('mouseup', stopDrawing);
    canvas.addEventListener('mouseleave', stopDrawing);
    canvas.addEventListener('mousemove', draw);

    // tooth chart 크기에 따라 입력폼 너비 조정
    function updateFormWidth() {
        const chartWidth = document.querySelector('.tooth-chart-img').offsetWidth;
        document.documentElement.style.setProperty('--chart-width', `${chartWidth}px`);

        // 상단 폼들의 전체 높이 계산 (margin 포함)
        const symptomsHeight = document.querySelector('.symptoms-form').offsetHeight;
        const locationHeight = document.querySelector('.location-form').offsetHeight;
        const totalUpperHeight = symptomsHeight + locationHeight + 65;  // Medical Records 타이틀(50px) + 하단 여백(15px) 포함
        
        document.documentElement.style.setProperty('--upper-forms-height', `${totalUpperHeight}px`);
    }

    // 초기 설정 및 리사이즈 이벤트에 연결
    updateFormWidth();
    window.addEventListener('resize', updateFormWidth);
}

// 폼 생성 함수 분리
function createForms() {
    // Symptoms 입력 폼 추가
    const formDiv = document.createElement('div');
    formDiv.className = 'symptoms-form';
    formDiv.innerHTML = `
        <div class="symptoms-label">Symptoms</div>
        <textarea class="symptoms-input"></textarea>
    `;
    document.querySelector('.prescription-center-top').appendChild(formDiv);

    // Location 입력 폼 추가
    const locationFormDiv = document.createElement('div');
    locationFormDiv.className = 'location-form';
    locationFormDiv.innerHTML = `
        <div class="location-label">Location</div>
        <textarea class="location-input"></textarea>
    `;
    document.querySelector('.prescription-center-top').appendChild(locationFormDiv);

    // Treatment Details 입력 폼 추가
    const treatmentDetailsFormDiv = document.createElement('div');
    treatmentDetailsFormDiv.className = 'treatment-details-form';
    treatmentDetailsFormDiv.innerHTML = `
        <div class="treatment-details-label">Treatment Details</div>
        <textarea class="treatment-details-input"></textarea>
    `;
    document.querySelector('.prescription-center-top').appendChild(treatmentDetailsFormDiv);

    // 컨트롤 버튼 추가
    const controlsDiv = document.createElement('div');
    controlsDiv.className = 'chart-controls';
    controlsDiv.innerHTML = `
        <button class="undo-btn">Undo</button>
        <button class="clear-btn">Clear</button>
    `;
    document.querySelector('.prescription-center-top').appendChild(controlsDiv);
}

// CC 검색 및 자동완성 기능
async function initializeCCSearch() {
    const ccSearchInput = document.querySelector('.cc-search-input');
    const ccItemsContainer = document.createElement('div');
    ccItemsContainer.className = 'cc-items-container';
    document.querySelector('.prescription-center-bottom').appendChild(ccItemsContainer);

    // 병원 타입 가져오기 (한 번만 실행)
    const [hospitalName] = auth.currentUser.email.split('@')[0].split('.');
    const hospitalDoc = await getDoc(doc(db, 'hospitals', hospitalName));
    const hospitalType = hospitalDoc.data().info.type;

    // 자동완성 컨테이너
    const autocompleteContainer = document.createElement('div');
    autocompleteContainer.className = 'cc-autocomplete';
    ccSearchInput.parentNode.appendChild(autocompleteContainer);

    // CC 검색 처리
    ccSearchInput.addEventListener('input', async (e) => {
        const searchText = e.target.value.trim().toLowerCase();

        if (!searchText) {
            autocompleteContainer.style.display = 'none';
            return;
        }

        try {
            // CC 검색
            const ccDoc = await getDoc(doc(db, 'cc', 'cc'));
            const ccItems = ccDoc.data()[hospitalType] || [];

            const matches = ccItems.filter(item => 
                item.toLowerCase().startsWith(searchText)
            );

            // 자동완성 목록 표시
            autocompleteContainer.innerHTML = matches
                .map(item => `<div class="cc-autocomplete-item">${item}</div>`)
                .join('');
            
            autocompleteContainer.style.display = matches.length ? 'block' : 'none';
        } catch (error) {
            console.error('CC 검색 중 오류:', error);  // 오류 발생 시 확인
        }
    });

    // CC 항목 추가 함수
    function addCCItem(text) {
        const ccItem = document.createElement('div');
        ccItem.className = 'cc-item';
        ccItem.innerHTML = `
            <img src="image/cc.png" alt="CC">
            <span class="cc-item-text">${text}</span>
            <span class="cc-item-remove">×</span>
        `;
        ccItemsContainer.appendChild(ccItem);

        // X 버튼 클릭 이벤트
        ccItem.querySelector('.cc-item-remove').addEventListener('click', () => {
            ccItem.remove();
        });

        ccSearchInput.value = '';
        autocompleteContainer.style.display = 'none';
    }

    // 자동완성 항목 선택
    autocompleteContainer.addEventListener('click', (e) => {
        if (e.target.classList.contains('cc-autocomplete-item')) {
            addCCItem(e.target.textContent);
        }
    });

    // 엔터 키 처리
    ccSearchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && ccSearchInput.value.trim()) {
            addCCItem(ccSearchInput.value.trim());
            e.preventDefault();
        }
    });

    setupKeyboardNavigation(ccSearchInput, autocompleteContainer, addCCItem);
}

// Medicine 검색 초기화
async function initializeMedicineSearch() {
    const medicineSearchInput = document.querySelector('.medicine-search-input');
    const medicineItemsContainer = document.createElement('div');
    medicineItemsContainer.className = 'medicine-items-container';
    document.querySelector('.prescription-center-bottom').appendChild(medicineItemsContainer);

    // 자동완성 컨테이너
    const autocompleteContainer = document.createElement('div');
    autocompleteContainer.className = 'medicine-autocomplete';
    medicineSearchInput.parentNode.appendChild(autocompleteContainer);

    // Medicine 검색 처리
    medicineSearchInput.addEventListener('input', async (e) => {
        const searchText = e.target.value.trim().toLowerCase();
        
        if (searchText.length < 3) {  // 3글자 미만이면 검색하지 않음
            autocompleteContainer.style.display = 'none';
            return;
        }

        try {
            // Medicine 문서 가져오기
            const medicineDoc = await getDoc(doc(db, 'medicine', 'medicine'));
            const medicineData = medicineDoc.data();
            
            let matches = [];
            
            // 모든 약물 필드를 순회
            Object.entries(medicineData).forEach(([drugName, medicines]) => {
                // 약물명이나 실제 약 이름이 검색어로 시작하는 경우
                if (drugName.toLowerCase().startsWith(searchText)) {
                    // 해당 약물의 모든 실제 약 이름을 matches에 추가
                    Object.keys(medicines).forEach(medicineName => {
                        matches.push(medicineName);
                    });
                } else {
                    // 실제 약 이름으로 검색
                    Object.keys(medicines).forEach(medicineName => {
                        if (medicineName.toLowerCase().startsWith(searchText)) {
                            matches.push(medicineName);
                        }
                    });
                }
            });

            // 자동완성 목록 표시
            autocompleteContainer.innerHTML = matches
                .map(item => `<div class="medicine-autocomplete-item">${item}</div>`)
                .join('');
            
            autocompleteContainer.style.display = matches.length ? 'block' : 'none';
        } catch (error) {
            console.error('Medicine 검색 중 오류:', error);
        }
    });

    // Medicine 항목 추가 함수
    function addMedicineItem(text) {
        const medicineItem = document.createElement('div');
        medicineItem.className = 'medicine-item';
        medicineItem.innerHTML = `
            <img src="image/medicine.png" alt="Medicine">
            <span class="medicine-item-text">${text}</span>
            <div class="medicine-controls">
                <div class="medicine-dropdown">
                    <button class="medicine-dropdown-button">p/dose</button>
                    <div class="medicine-dropdown-content">
                        ${Array.from({length: 7}, (_, i) => 
                            `<div class="medicine-dropdown-item">${i + 1}/per</div>`
                        ).join('')}
                    </div>
                </div>
                <div class="medicine-dropdown">
                    <button class="medicine-dropdown-button">p/day</button>
                    <div class="medicine-dropdown-content">
                        ${Array.from({length: 7}, (_, i) => 
                            `<div class="medicine-dropdown-item">${i + 1}/d</div>`
                        ).join('')}
                    </div>
                </div>
                <div class="medicine-dropdown">
                    <button class="medicine-dropdown-button">days</button>
                    <div class="medicine-dropdown-content">
                        ${Array.from({length: 30}, (_, i) => 
                            `<div class="medicine-dropdown-item">${i + 1}days</div>`
                        ).join('')}
                    </div>
                </div>
            </div>
            <span class="medicine-item-remove">×</span>
        `;
        medicineItemsContainer.appendChild(medicineItem);

        // 삭제 버튼 이벤트 리스너 추가
        const removeButton = medicineItem.querySelector('.medicine-item-remove');
        removeButton.addEventListener('click', () => {
            medicineItem.remove();
        });

        // 드롭다운 이벤트 처리
        setupDropdowns(medicineItem);

        medicineSearchInput.value = '';
        autocompleteContainer.style.display = 'none';
    }

    function setupDropdowns(medicineItem) {
        const dropdowns = medicineItem.querySelectorAll('.medicine-dropdown');
        
        // 현재 열린 드롭다운을 추적
        let openDropdown = null;

        dropdowns.forEach(dropdown => {
            const button = dropdown.querySelector('.medicine-dropdown-button');
            const content = dropdown.querySelector('.medicine-dropdown-content');

            button.addEventListener('click', (e) => {
                e.stopPropagation();
                
                // 다른 열린 드롭다운 닫기
                if (openDropdown && openDropdown !== content) {
                    openDropdown.style.display = 'none';
                }

                // 현재 드롭다운 토글
                content.style.display = content.style.display === 'block' ? 'none' : 'block';
                openDropdown = content.style.display === 'block' ? content : null;
            });

            // 드롭다운 항목 선택
            content.addEventListener('click', (e) => {
                if (e.target.classList.contains('medicine-dropdown-item')) {
                    button.textContent = e.target.textContent;
                    content.style.display = 'none';
                    openDropdown = null;
                }
            });
        });

        // 다른 영역 클릭 시 드롭다운 닫기
        document.addEventListener('click', () => {
            if (openDropdown) {
                openDropdown.style.display = 'none';
                openDropdown = null;
            }
        });
    }

    // 자동완성 항목 선택
    autocompleteContainer.addEventListener('click', (e) => {
        if (e.target.classList.contains('medicine-autocomplete-item')) {
            addMedicineItem(e.target.textContent);
        }
    });

    // 엔터 키 처리
    medicineSearchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && medicineSearchInput.value.trim()) {
            addMedicineItem(medicineSearchInput.value.trim());
            e.preventDefault();
        }
    });

    setupKeyboardNavigation(medicineSearchInput, autocompleteContainer, addMedicineItem);
}

function setupKeyboardNavigation(searchInput, autocompleteContainer, addItemFunction) {
    let selectedIndex = -1;
    let items = [];

    searchInput.addEventListener('keydown', (e) => {
        items = autocompleteContainer.querySelectorAll('.cc-autocomplete-item, .medicine-autocomplete-item');
        
        switch(e.key) {
            case 'ArrowDown':
                e.preventDefault();
                selectedIndex = Math.min(selectedIndex + 1, items.length - 1);
                updateSelection();
                break;
                
            case 'ArrowUp':
                e.preventDefault();
                selectedIndex = Math.max(selectedIndex - 1, -1);
                updateSelection();
                break;
                
            case 'Enter':
                if (selectedIndex >= 0 && items[selectedIndex]) {
                    e.preventDefault();
                    addItemFunction(items[selectedIndex].textContent);
                    selectedIndex = -1;
                } else if (searchInput.value.trim()) {
                    // 선택된 항목이 없고 입력값이 있을 때
                    e.preventDefault();
                    addItemFunction(searchInput.value.trim());
                }
                break;
        }
    });

    // 마우스가 움직일 때도 선택 상태 업데이트
    autocompleteContainer.addEventListener('mousemove', (e) => {
        if (e.target.matches('.cc-autocomplete-item, .medicine-autocomplete-item')) {
            selectedIndex = Array.from(items).indexOf(e.target);
            updateSelection();
        }
    });

    function updateSelection() {
        items.forEach((item, index) => {
            item.classList.toggle('selected', index === selectedIndex);
            if (index === selectedIndex) {
                item.scrollIntoView({ block: 'nearest' });
            }
        });
    }

    // 검색어가 변경될 때마다 선택 초기화
    searchInput.addEventListener('input', () => {
        selectedIndex = -1;
    });
}

// 버튼 상태 관리 함수 추가
function updateButtonStates(isSaved) {
    const saveBtn = document.querySelector('.save-btn');
    const sendBtn = document.querySelector('.send-btn');
    
    if (isSaved) {
        // 저장된 처방전인 경우
        saveBtn.disabled = true;
        saveBtn.classList.add('disabled');
        
        sendBtn.disabled = false;
        sendBtn.classList.remove('disabled');
    } else {
        // 저장되지 않은 처방전인 경우
        saveBtn.disabled = false;
        saveBtn.classList.remove('disabled');
        
        sendBtn.disabled = true;
        sendBtn.classList.add('disabled');
    }
}