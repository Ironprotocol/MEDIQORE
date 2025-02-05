import {  auth, db, collection, query, where, getDocs, 
    doc, getDoc, setDoc, serverTimestamp, Timestamp,
    onSnapshot, orderBy, updateDoc } from './firebase-config.js';

// 전역 이벤트 리스너 등록 (한 번만)
window.addEventListener('click', () => {
    document.querySelectorAll('.doctor-options').forEach(options => {
        options.style.display = 'none';
    });
});

export async function initializePatientList(hospitalName, currentDate){
// 3. waiting 컬렉션 참조
const waitingRef = collection(db, 'hospitals', hospitalName, 'dates', currentDate, 'waiting');
                     
// timestamp로 정렬하는 쿼리 추가
const q = query(waitingRef, orderBy('timestamp', 'asc'));  // 시간 오름차순 정렬

// 4. 실시간 업데이트 리스너
 return onSnapshot(q, async (snapshot) => {
    const patientListBody = document.querySelector('#desk-content .content-body');
    patientListBody.innerHTML = '';
    
    for (const docSnapshot of snapshot.docs) {
        const patientData = docSnapshot.data();
        const patientId = docSnapshot.id;
        
        // 5. 환자 정보 가져오기
        const patientRef = doc(db, 'hospitals', hospitalName, 'patient', patientId);
        const patientDoc = await getDoc(patientRef);
        
        if (patientDoc.exists()) {
            const birthDate = patientDoc.data().info.birthDate.toDate();
            const age = new Date().getFullYear() - birthDate.getFullYear();
            
            const patientElement = document.createElement('div');
            patientElement.className = 'patient-info-container';
            
            // 이름 길이 처리 함수
            function formatPatientId(id) {
                const maxLength = 24; // abcdefghijklmnopqr 길이
                const namePart = id.split('.')[0]; // 점(.) 앞부분만 추출
                
                if (namePart.length > maxLength) {
                    return namePart.slice(0, maxLength - 3) + '...';
                }
                return namePart; // ID 번호 부분 제외하고 이름만 반환
            }

            // 증상 길이 처리 함수
            function formatComplaint(complaint) {
                const maxLength = 15; // swollen_gums 길이
                if (complaint.length > maxLength) {
                    return complaint.slice(0, maxLength - 3) + '...';
                }
                return complaint;
            }

            patientElement.innerHTML = `
                <span class="patient-id-span">${formatPatientId(patientId)}</span>
                <span class="age-span">${age}years</span>
                <span class="complaint-span">${formatComplaint(patientData.primaryComplaint)}</span>
                <span class="progress-span">
                    <img src="image/${patientData.progress}.png" 
                         alt="${patientData.progress}" 
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
            `;

            // 의사 목록 로드 및 드롭다운 이벤트 설정
            const doctorContainer = patientElement.querySelector('.doctor-select-container');
            const doctorSelect = doctorContainer.querySelector('.doctor-select');
            const doctorDropdown = doctorContainer.querySelector('.doctor-dropdown');
            const doctorSelected = doctorContainer.querySelector('.doctor-selected');
            const doctorOptions = doctorContainer.querySelector('.doctor-options');

            // 의사 목록 로드
            const staffRef = collection(db, 'hospitals', hospitalName, 'staff');
            const q = query(staffRef, where('role', '==', 'doctor'));
            const querySnapshot = await getDocs(q);
            
            // 드롭다운 옵션 생성
            querySnapshot.forEach(doc => {
                const doctorData = doc.data();
                const option = document.createElement('div');
                option.className = `doctor-option${doctorData.work === 'logout' ? ' disabled' : ''}`;
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
                defaultOption.className = 'doctor-option';
                defaultOption.dataset.value = '';
                defaultOption.innerHTML = `
                    <div class="doctor-option-content">
                        <span>Choose a doctor</span>
                    </div>
                `;
                doctorOptions.appendChild(defaultOption);
                
                // 새로운 의사 목록으로 드롭다운 옵션 생성
                querySnapshot.forEach(doc => {
                    const doctorData = doc.data();
                    const option = document.createElement('div');
                    option.className = `doctor-option${doctorData.work === 'logout' ? ' disabled' : ''}`;
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

            // 드롭다운 옵션 클릭 이벤트
            doctorOptions.addEventListener('click', async (e) => {
                e.stopPropagation();
                const option = e.target.closest('.doctor-option');
                if (option && !option.classList.contains('disabled')) {
                    const doctorId = option.dataset.value;

                    // Choose a doctor 선택한 경우
                    if (!doctorId) {
                        // 데이터베이스 업데이트 - doctor 필드를 null로
                        const waitingDocRef = doc(waitingRef, patientId);
                        await updateDoc(waitingDocRef, {
                            doctor: null
                        });

                        // UI 업데이트
                        doctorSelected.style.color = 'rgb(110, 110, 124)'; // 회색으로
                        doctorSelected.textContent = 'Choose a doctor';
                    } else {
                        // 의사 선택한 경우
                        const doctorRef = doc(db, 'hospitals', hospitalName, 'staff', doctorId);
                        const doctorDoc = await getDoc(doctorRef);
                        const doctorName = doctorDoc.data().name;

                        // 데이터베이스 업데이트
                        const waitingDocRef = doc(waitingRef, patientId);
                        await updateDoc(waitingDocRef, {
                            doctor: doctorName
                        });

                        // UI 업데이트 - 진한 검정색으로
                        doctorSelected.style.color = '#000000';
                        doctorSelected.textContent = doctorName;
                    }
                    
                    doctorOptions.style.display = 'none';
                }
            });

            patientListBody.appendChild(patientElement);
        }
    }
});
}
