import { auth, db, doc, getDoc, setDoc, collection, getDocs, serverTimestamp, updateDoc, deleteDoc, deleteField, EmailAuthProvider, reauthenticateWithCredential } from './firebase-config.js';
import { initializePrescriptionHistory } from './prescriptHistory.js';
import { initializeCanvas, clearCanvas, enableDrawing, clearSVG, disableDrawing } from './prescription_canvas.js';
import { printPrescription } from './prescription_print.js';

// Prescription 컨테이너 초기화
export function initializePrescription() {
    const prescriptionTitle = document.querySelector('#prescription-content .content-title-prescription');
    const patientSelectWrapper = document.querySelector('#prescription-content .patient-select-wrapper');
    const prescriptionBody = document.querySelector('#prescription-content .content-body-prescription');
    const prescriptionBody2 = document.querySelector('#prescription-content .content-body-prescription2');
    const prescriptionFooter = document.querySelector('#prescription-content .content-footer-prescription');

    let currentPatientId = null;
    let currentRegisterDate = null;
    
    // 이미지 캐시 변수는 prescription_canvas.js에서 관리함
    
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
    async function clearPrescriptionForm() {
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
        
        // Canvas 및 SVG 초기화 - prescription_canvas.js의 함수 사용
        try {
            // 캔버스가 존재하는지 확인
            const canvas = document.querySelector('.tooth-chart-canvas');
            if (canvas) {
                // currentPatientId와 currentRegisterDate 값이 있는 경우에만 캔버스 초기화
                if (typeof currentPatientId !== 'undefined' && typeof currentRegisterDate !== 'undefined') {
                    // prescription_canvas.js의 함수 가져오기
                    const { clearCanvas, clearSVG, initializeCanvas } = await import('./prescription_canvas.js');
                    
                    // 초기화 함수 호출
                    clearCanvas(canvas);
                    clearSVG(); // SVG 초기화 추가
                    requestAnimationFrame(() => {
                        initializeCanvas(currentPatientId, currentRegisterDate);
                    });
                } else {
                    console.warn('clearPrescriptionForm: 환자 ID 또는 등록 날짜가 없어 캔버스 초기화를 건너뜁니다');
                }
            }
        } catch (error) {
            console.error('캔버스/SVG 초기화 중 오류:', error);
        }
    }
    
    // 처방전 화면 초기화 함수
    async function resetPrescriptionView() {
        // 현재 환자 정보 초기화
        currentPatientId = null;
        currentRegisterDate = null;
        
        // 처방전 내용 초기화
        await clearPrescriptionForm();
        
        // 처방전 화면 숨기기
        prescriptionBody.style.display = 'none';
        prescriptionBody2.style.display = 'none';
        prescriptionFooter.style.display = 'none';
        
        // 환자 선택 메시지 표시
        patientSelectWrapper.style.display = 'flex';
        
        // 처방전 타이틀 초기화
        if (prescriptionTitle) {
            prescriptionTitle.innerHTML = '';
        }
    }

    // 환자 삭제 이벤트 리스너 등록
    document.addEventListener('patientDeleted', async (e) => {
        const { patientId } = e.detail;
        // 현재 표시 중인 환자가 삭제된 환자인 경우에만 초기화
        if (patientId === currentPatientId) {
            await resetPrescriptionView();
        }
    });

    // Room의 환자 클릭 이벤트에 대한 처리
    document.addEventListener('prescriptionPatientSelected', async (e) => {
        const { name, gender, birthDate, age, patientId, registerDate } = e.detail;
        
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

        // 모든 입력 필드 초기화
        document.querySelectorAll('.cc-search-input, .medicine-search-input, .symptoms-input, .location-input, .treatment-details-input').forEach(element => {
            element.value = '';
        });
        
        // 환자가 변경되었을 때 현재 처방전 내용 초기화
        await clearPrescriptionForm();
        
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
            
            // SVG 비활성화
            const svgElement = document.querySelector('.tooth-chart-svg');
            if (svgElement) {
                svgElement.style.pointerEvents = 'none';
                // SVG 그리기 비활성화 함수 호출
                disableDrawing();
            }
        });
        
        // 초기 상태는 저장되지 않은 상태로 설정
        updateButtonStates(false);
    });

    // 처방전 히스토리 선택 이벤트 처리 - 폼 초기화 기능만 포함
    document.addEventListener('prescriptionHistorySelected', function historySelectionBasic(e) {
        // 폼 초기화만 처리 (clearPrescriptionForm 호출하지 않음 - 중복 호출 방지)
    });

    // 프린터 버튼 생성
    const printBtn = document.createElement('button');
    printBtn.className = 'print-btn-prescription';
    document.querySelector('.content-footer-prescription').appendChild(printBtn);
    
    // 프린트 버튼 클릭 이벤트 추가
    printBtn.addEventListener('click', () => {
        printPrescription().catch(error => {
            console.error('프린트 중 오류:', error);
            alert('프린트 준비 중 오류가 발생했습니다.');
        });
    });

    // Delete 버튼 추가 (Save 버튼 왼쪽에)
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'delete-btn';
    deleteBtn.textContent = 'Delete';
    deleteBtn.disabled = true;
    deleteBtn.classList.add('disabled');
    
    // Save 버튼 추가 (프린터 버튼 왼쪽에)
    const saveBtn = document.createElement('button');
    saveBtn.className = 'save-btn';
    saveBtn.textContent = 'Save';
    document.querySelector('.content-footer-prescription').insertBefore(saveBtn, printBtn);
    document.querySelector('.content-footer-prescription').insertBefore(deleteBtn, saveBtn);

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

            // 약물 복용 정보 검증 추가
            const medicineValidationElements = document.querySelectorAll('.medicine-item');
            if (medicineValidationElements.length > 0) {
                for (const item of medicineValidationElements) {
                    const doseInput = item.querySelector('.dose-input');
                    const frequencyInput = item.querySelector('.frequency-input');
                    const durationInput = item.querySelector('.duration-input');
                    
                    if (!doseInput.value.trim() || !frequencyInput.value.trim() || !durationInput.value.trim()) {
                        alert('Please set the frequency and duration of medication');
                        return;
                    }
                }
            }

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
            
            // 현재 로그인한 계정의 자격증 정보 가져오기
            const currentUserEmail = auth.currentUser.email;
            const staffRef = doc(db, 'hospitals', hospitalName, 'staff', currentUserEmail);
            const staffDoc = await getDoc(staffRef);
            
            // 자격증 정보 추출
            let credential = null;
            if (staffDoc.exists()) {
                const staffData = staffDoc.data();
                credential = staffData.credential || null;
            }
            
            // Medicine 항목들 수집 (선택사항) - 수정된 부분
            const medicineItems = Array.from(document.querySelectorAll('.medicine-item')).map(item => ({
                name: item.querySelector('.medicine-item-text').textContent,
                perDose: item.querySelector('.dose-input').value || 'Dose per time',
                perDay: item.querySelector('.frequency-input').value || 'Times per day',
                days: item.querySelector('.duration-input').value || 'Duration (days)'
            }));

            // SVG 경로 데이터 가져오기 (prescription_canvas.js의 함수 사용)
            const { getSVGPathsData } = await import('./prescription_canvas.js');
            const svgPathsData = getSVGPathsData();
            
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
                    medicines: medicineItems,
                    credential: credential  // 자격증 정보 추가
                },
                chartImage: svgPathsData, // Canvas 이미지 대신 SVG 경로 데이터 저장
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
            
            // SVG와 Canvas 초기화 - prescription_canvas.js의 함수 사용
            const canvas = document.querySelector('.tooth-chart-canvas');
            if (canvas) {
                const { clearCanvas, clearSVG, initializeCanvas } = await import('./prescription_canvas.js');
                clearCanvas(canvas);
                clearSVG();
                initializeCanvas(currentPatientId, currentRegisterDate);
            }

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

    // Delete 버튼 클릭 이벤트 추가
    deleteBtn.addEventListener('click', async () => {
        try {
            // 버튼이 비활성화 상태면 무시
            if (deleteBtn.disabled) {
                return;
            }

            // 환자 이름 가져오기
            const patientNameElement = document.querySelector('.patient-name');
            const patientName = patientNameElement ? patientNameElement.textContent : 'this patient';

            // 삭제 확인
            if (!confirm(`Are you sure you want to delete the prescription for ${patientName}?`)) {
                return;
            }

            // 비밀번호 확인
            const password = prompt('Please enter your password to confirm deletion:');
            if (!password) {
                return;
            }

            // 현재 사용자 재인증
            const credential = EmailAuthProvider.credential(
                auth.currentUser.email,
                password
            );

            try {
                // 재인증 시도
                await reauthenticateWithCredential(auth.currentUser, credential);
            } catch (authError) {
                console.error('Authentication failed:', authError);
                alert('Authentication failed. Incorrect password.');
                return;
            }

            if (!currentPatientId || !currentRegisterDate) {
                throw new Error('Patient information not found');
            }

            const [hospitalName] = auth.currentUser.email.split('@')[0].split('.');

            // 처방전 데이터 삭제
            const prescriptionRef = doc(db, 'hospitals', hospitalName, 'patient', currentPatientId, 'register.date', currentRegisterDate);
            
            await updateDoc(prescriptionRef, {
                prescription: deleteField(),
                chartImage: deleteField(),
                progress: 'active'  // 상태를 active로 되돌림
            });

            // 상태 업데이트 (날짜 컬렉션)
            const today = new Date();
            const currentDate = today.toLocaleDateString('en-GB', {
                day: '2-digit',
                month: 'short',
                year: 'numeric'
            }).replace(/ /g, '.');

            // payment 컬렉션에서 환자 찾기 및 active로 이동
            const paymentDocRef = doc(db, 'hospitals', hospitalName, 'dates', currentDate, 'payment', currentPatientId);
            const paymentDocSnap = await getDoc(paymentDocRef);
            
            if (paymentDocSnap.exists()) {
                const patientData = paymentDocSnap.data();
                // payment 문서 삭제
                await deleteDoc(paymentDocRef);
                // active 컬렉션으로 이동
                await setDoc(doc(db, 'hospitals', hospitalName, 'dates', currentDate, 'active', currentPatientId), {
                    ...patientData,
                    progress: 'active'
                });
            }

            // treatment.room의 patients 배열 업데이트
            const roomsRef = collection(db, 'hospitals', hospitalName, 'treatment.room');
            const roomsSnapshot = await getDocs(roomsRef);
            
            for (const roomDoc of roomsSnapshot.docs) {
                const roomData = roomDoc.data();
                if (roomData.patients) {
                    const updatedPatients = roomData.patients.map(patient => {
                        if (patient.id === currentPatientId) {
                            return { ...patient, progress: 'active' };
                        }
                        return patient;
                    });

                    if (JSON.stringify(roomData.patients) !== JSON.stringify(updatedPatients)) {
                        await updateDoc(roomDoc.ref, { patients: updatedPatients });
                    }
                }
            }

            // 폼 초기화
            document.querySelector('.symptoms-input').value = '';
            document.querySelector('.location-input').value = '';
            document.querySelector('.treatment-details-input').value = '';
            document.querySelectorAll('.cc-item').forEach(item => item.remove());
            document.querySelectorAll('.medicine-item').forEach(item => item.remove());
            
            // SVG와 Canvas 초기화 - prescription_canvas.js의 함수 사용
            const canvas = document.querySelector('.tooth-chart-canvas');
            if (canvas) {
                const { clearCanvas, clearSVG, initializeCanvas } = await import('./prescription_canvas.js');
                clearCanvas(canvas);
                clearSVG();
                initializeCanvas(currentPatientId, currentRegisterDate);
            }

            // 버튼 상태 업데이트
            updateButtonStates(false);
            
            // History UI 업데이트
            await initializePrescriptionHistory(currentPatientId);
            
            alert('Prescription deleted successfully!');
            
        } catch (error) {
            console.error('Failed to delete prescription:', error);
            alert(`Failed to delete prescription: ${error.message}`);
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

    // 히스토리 선택 시 데이터 로드 및 표시를 위한 상세 이벤트 리스너
    document.addEventListener('prescriptionHistorySelected', async function historySelectionDetailed(e) {
        const { patientId, registerDate, chartImage, prescriptionData } = e.detail;
        
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
                <img src="image/cc.png" alt="CC">
                <span class="cc-item-text">${cc}</span>
            `;
            ccContainer.appendChild(ccItem);
        });

        // 약 처방 목록 표시 - 수정된 부분
        const medicineContainer = document.querySelector('.medicine-items-container');
        medicineContainer.innerHTML = '';
        if (prescriptionData.medicines) {
            prescriptionData.medicines.forEach(medicine => {
                const medicineItem = document.createElement('div');
                medicineItem.className = 'medicine-item';
                medicineItem.innerHTML = `
                    <img src="image/medicine.png" alt="Medicine">
                    <span class="medicine-item-text">${medicine.name}</span>
                    <div class="medicine-text-info">
                        <span>${medicine.perDose}</span>
                        <span>${medicine.perDay}</span>
                        <span>${medicine.days}</span>
                    </div>
                `;
                medicineContainer.appendChild(medicineItem);
            });
        }

        // 모든 입력 필드와 버튼 비활성화
        document.querySelectorAll('.cc-search-input, .medicine-search-input, .symptoms-input, .location-input, .treatment-details-input').forEach(element => {
            element.disabled = true;
        });

        // 드롭다운 버튼 비활성화
        document.querySelectorAll('.medicine-dropdown-button').forEach(button => {
            button.disabled = true;
        });

        // Canvas 비활성화
        const canvas = document.querySelector('.tooth-chart-canvas');
        if (canvas) {
            canvas.style.pointerEvents = 'none';
            
            // SVG도 비활성화
            document.querySelector('.tooth-chart-svg').style.pointerEvents = 'none';
            
            // chartImage에 SVG 경로 데이터가 있으면 표시
            if (chartImage && Array.isArray(chartImage)) {
                // SVG 그리기 함수 가져오기
                const { drawSVGFromData, disableDrawing } = await import('./prescription_canvas.js');
                
                // SVG 경로 데이터로 그리기
                drawSVGFromData(chartImage);
                
                // SVG 그리기 비활성화
                disableDrawing();
            } 
            // 이전 버전 호환성 - chartImage가 Canvas 이미지 URL인 경우 (이전 저장 방식)
            else if (chartImage && typeof chartImage === 'string') {
                // 이벤트를 생성하여 canvas 모듈에게 차트 이미지 로드 요청
                const canvasEvent = new CustomEvent('loadChartImage', {
                    detail: {
                        patientId: patientId || currentPatientId,
                        registerDate: registerDate,
                        chartImage: chartImage
                    }
                });
                document.dispatchEvent(canvasEvent);
            }
        }
        
        // 버튼 상태 업데이트 - 이미 저장된 처방전이므로 Save 버튼 비활성화, Send 버튼 활성화
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
            
            // SVG와 Canvas 초기화 - prescription_canvas.js의 함수 사용
            const canvas = document.querySelector('.tooth-chart-canvas');
            if (canvas) {
                const { clearCanvas, clearSVG, initializeCanvas } = await import('./prescription_canvas.js');
                clearCanvas(canvas);
                clearSVG();
                initializeCanvas(currentPatientId, currentRegisterDate);
                // SVG 그리기 활성화
                enableDrawing();
            }

            // 모든 입력 요소 활성화
            document.querySelectorAll('.cc-search-input, .medicine-search-input, .symptoms-input, .location-input, .treatment-details-input').forEach(element => {
                element.disabled = false;
            });
            canvas.style.pointerEvents = 'auto';
            
            // 버튼 상태 업데이트 - Save 버튼 활성화, Send 버튼 비활성화
            updateButtonStates(false);

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
                <div class="medicine-input-group">
                    <input type="text" class="medicine-input dose-input" placeholder="Dose">
                </div>
                <div class="medicine-input-group">
                    <input type="text" class="medicine-input frequency-input" placeholder="Time">
                </div>
                <div class="medicine-input-group">
                    <input type="text" class="medicine-input duration-input" placeholder="Dura">
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
    const deleteBtn = document.querySelector('.delete-btn');
    
    if (isSaved) {
        // 저장된 처방전인 경우
        saveBtn.disabled = true;
        saveBtn.classList.add('disabled');
        
        sendBtn.disabled = false;
        sendBtn.classList.remove('disabled');
        
        deleteBtn.disabled = false;
        deleteBtn.classList.remove('disabled');
    } else {
        // 저장되지 않은 처방전인 경우
        saveBtn.disabled = false;
        saveBtn.classList.remove('disabled');
        
        sendBtn.disabled = true;
        sendBtn.classList.add('disabled');
        
        deleteBtn.disabled = true;
        deleteBtn.classList.add('disabled');
    }
}