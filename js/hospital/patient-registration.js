import { auth, db, collection, query, where, getDocs, doc, getDoc, setDoc, serverTimestamp, Timestamp, orderBy } from '../firebase-config.js';

// 폼 초기화 함수
function resetRegistrationForm() {
    // 기본 필드 초기화
    document.getElementById('patientName').value = '';
    document.getElementById('idNumber').value = '';
    document.getElementById('phoneNumber').value = '';
    document.getElementById('gender').value = '';
    
    // 생년월일 초기화
    document.getElementById('birthDay').value = '';
    document.getElementById('birthMonth').value = '';
    document.getElementById('birthYear').value = '';
    
    // 주소 초기화
    document.getElementById('district').value = '';
    document.getElementById('city').value = '';
    document.getElementById('state').value = '';
    
    // Primary Complaint 초기화
    document.getElementById('primaryComplaint').value = '';
    document.getElementById('otherComplaint').value = '';
    document.getElementById('otherComplaintContainer').style.display = 'none';
    
    // 보험 정보 초기화
    document.querySelectorAll('input[name="insuranceStatus"]').forEach(radio => radio.checked = false);
    document.getElementById('insuranceProvider').value = '';
    document.getElementById('insuranceNumber').value = '';
    document.querySelector('.insurance-details').style.display = 'none';
    
    // 환자 정보 표시 영역 초기화 (방문 기록 포함)
    const infoBox = document.querySelector('.section-box:last-child');
    if (infoBox) {
        infoBox.innerHTML = ''; // 완전히 비우기
    }
}

// Primary Complaint change 핸들러
export function handleComplaintChange() {
    const otherComplaintContainer = document.getElementById('otherComplaintContainer');
    if (this.value === 'other') {
        otherComplaintContainer.style.display = 'block';
    } else {
        otherComplaintContainer.style.display = 'none';
    }
}

// Doctor 목록 로드 함수 - 완전히 비활성화
export async function loadDoctors() {
    return; // 함수 실행 즉시 종료
}

// 남아공 지역 데이터
const southAfricaLocations = [
    // Gauteng Province - Pretoria (Tshwane)
    { district: "Arcadia", city: "Pretoria", state: "Gauteng" },
    { district: "Arcadia", city: "Pretoria", state: "Gauteng" },
    { district: "Brooklyn", city: "Pretoria", state: "Gauteng" },
    { district: "Hatfield", city: "Pretoria", state: "Gauteng" },
    { district: "Menlo Park", city: "Pretoria", state: "Gauteng" },
    { district: "Waterkloof", city: "Pretoria", state: "Gauteng" },
    { district: "Sunnyside", city: "Pretoria", state: "Gauteng" },
    { district: "Lynnwood", city: "Pretoria", state: "Gauteng" },
    { district: "Centurion", city: "Pretoria", state: "Gauteng" },

    // Gauteng Province - Johannesburg
    { district: "Sandton", city: "Johannesburg", state: "Gauteng" },
    { district: "Rosebank", city: "Johannesburg", state: "Gauteng" },
    { district: "Randburg", city: "Johannesburg", state: "Gauteng" },
    { district: "Fourways", city: "Johannesburg", state: "Gauteng" },
    { district: "Midrand", city: "Johannesburg", state: "Gauteng" },
    { district: "Soweto", city: "Johannesburg", state: "Gauteng" },

    
    // Western Cape Province
    { district: "Sea Point", city: "Cape Town", state: "Western Cape" },
    { district: "Green Point", city: "Cape Town", state: "Western Cape" },
    { district: "Camps Bay", city: "Cape Town", state: "Western Cape" },
    { district: "Century City", city: "Cape Town", state: "Western Cape" },
    { district: "Claremont", city: "Cape Town", state: "Western Cape" },
    { district: "Constantia", city: "Cape Town", state: "Western Cape" },
    { district: "Bellville", city: "Cape Town", state: "Western Cape" },
    
    // KwaZulu-Natal Province
    { district: "Umhlanga", city: "eThekwini", state: "KwaZulu-Natal" },
    { district: "Ballito", city: "eThekwini", state: "KwaZulu-Natal" },
    { district: "Berea", city: "eThekwini", state: "KwaZulu-Natal" },
    { district: "Morningside", city: "eThekwini", state: "KwaZulu-Natal" },
    { district: "Westville", city: "eThekwini", state: "KwaZulu-Natal" },
    { district: "Pinetown", city: "eThekwini", state: "KwaZulu-Natal" },

    // Eastern Cape Province
    { district: "Summerstrand", city: "Nelson Mandela Bay", state: "Eastern Cape" },
    { district: "Walmer", city: "Nelson Mandela Bay", state: "Eastern Cape" },
    { district: "Mill Park", city: "Nelson Mandela Bay", state: "Eastern Cape" },
    { district: "Newton Park", city: "Nelson Mandela Bay", state: "Eastern Cape" },

    // Free State Province
    { district: "Westdene", city: "Mangaung", state: "Free State" },
    { district: "Universitas", city: "Mangaung", state: "Free State" },
    { district: "Langenhoven Park", city: "Mangaung", state: "Free State" },
    { district: "Willows", city: "Mangaung", state: "Free State" }
];

// 주소 검색 초기화
export function initializeAddressSearch() {
    const districtInput = document.getElementById('district');
    const addressResults = document.getElementById('addressResults');

    // 외부 클릭 시 드롭다운 닫기
    document.addEventListener('click', function(e) {
        if (!districtInput.contains(e.target) && !addressResults.contains(e.target)) {
            addressResults.style.display = 'none';
        }
    });

    // 주소 검색 이벤트
    districtInput.addEventListener('input', function() {
        const searchText = this.value.toLowerCase();
                
        if (searchText.length >= 3) {
            const matches = southAfricaLocations.filter(location => 
                location.district.toLowerCase().startsWith(searchText)
            );
            
            if (matches.length > 0) {
                addressResults.style.display = 'block';
                addressResults.innerHTML = matches.map(location => {
                    let displayDistrict = location.district;
                    if (displayDistrict.length > 20) {
                        displayDistrict = displayDistrict.slice(0, displayDistrict.length - 3) + '...';
                    }
                    return `<div class="address-option" 
                        data-district="${location.district}" 
                        data-city="${location.city}" 
                        data-state="${location.state}">
                        ${displayDistrict}
                    </div>`;
                }).join('');
            } else {
                addressResults.style.display = 'none';
            }
        } else {
            addressResults.style.display = 'none';
        }
    });

    // 주소 선택 이벤트
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('address-option')) {
            const district = e.target.dataset.district;
            const city = e.target.dataset.city;
            const state = e.target.dataset.state;
            
            document.getElementById('district').value = district;
            document.getElementById('city').value = city;
            document.getElementById('state').value = state;
            addressResults.style.display = 'none';
        }
    });
}

// 보험 정보 입력 초기화
export function initializeInsuranceForm() {
    const insuranceRadios = document.querySelectorAll('input[name="insuranceStatus"]');
    const insuranceDetails = document.querySelector('.insurance-details');
    
    insuranceRadios.forEach(radio => {
        radio.addEventListener('change', function() {
            insuranceDetails.style.display = this.value === 'has' ? 'block' : 'none';
                    
            // 보험 없음 선택 시 입력값 초기화
            if (this.value === 'none') {
                document.getElementById('insuranceProvider').value = '';
                document.getElementById('insuranceNumber').value = '';
            }
        });
    });
}

// 환자 등록 이벤트 초기화 함수 수정
export function initializeRegistrationForm() {
    // ID Check 버튼 이벤트 리스너 추가
    const idCheckBtn = document.querySelector('.id-check-btn');
    const idNumberInput = document.getElementById('idNumber');
    
    if (idCheckBtn) {
        idCheckBtn.addEventListener('click', checkPatientId);
    }
    
    // ID 입력 필드에서 엔터키 입력 시 검색 실행
    if (idNumberInput) {
        idNumberInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault(); // 폼 제출 방지
                checkPatientId();
            }
        });
    }
    
    // Reset 버튼에 이벤트 리스너 추가
    const resetBtn = document.querySelector('#patient-registration-content .reset-btn');
    if (resetBtn) {
        resetBtn.addEventListener('click', resetRegistrationForm);
    }
    
    // 기존 Register 버튼 이벤트 리스너
    document.querySelector('.register-btn').addEventListener('click', async () => {
        try {
            const user = auth.currentUser;
            if (!user) return;

            // 필수 입력값 확인
            const patientName = document.getElementById('patientName').value.trim();
            const idNumber = document.getElementById('idNumber').value.trim();
            const birthDay = document.getElementById('birthDay').value;
            const birthMonth = document.getElementById('birthMonth').value;
            const birthYear = document.getElementById('birthYear').value;
            const district = document.getElementById('district').value.trim();
            const city = document.getElementById('city').value.trim();
            const state = document.getElementById('state').value.trim();
            const primaryComplaint = document.getElementById('primaryComplaint').value;
            const phoneNumber = document.getElementById('phoneNumber').value;
            const gender = document.getElementById('gender').value;
            // Insurance 선택 여부 확인 추가
            const insuranceStatus = document.querySelector('input[name="insuranceStatus"]:checked');

            // 기본 필수 입력값 체크
            if (!patientName || !idNumber || !birthDay || !birthMonth || !birthYear || 
                !district || !city || !state || !primaryComplaint || !phoneNumber || !gender || 
                !insuranceStatus) {
                alert('Please fill in all required fields');
                return;
            }

            // Have medical insurance 선택 시 추가 필수값 체크
            let insuranceData = {
                status: '',
                provider: '',
                cardNumber: ''
            };
            
            if (insuranceStatus.value === 'has') {
                const insuranceProvider = document.getElementById('insuranceProvider').value.trim();
                const insuranceNumber = document.getElementById('insuranceNumber').value.trim();
                
                if (!insuranceProvider || !insuranceNumber) {
                    alert('Please fill in all required fields');
                    return;
                }
                
                insuranceData = {
                    status: 'have',
                    provider: insuranceProvider,
                    cardNumber: insuranceNumber
                };
            }

            // 병원명 추출
            const hospitalName = user.email.split('@')[0].split('.')[0];
            
            // 입력된 ID로 이미 등록된 환자가 있는지 확인
            const patientsRef = collection(db, 'hospitals', hospitalName, 'patient');
            const q = query(patientsRef, where('info.idNumber', '==', idNumber));
            const querySnapshot = await getDocs(q);
            
            // 이미 등록된 환자가 있는 경우, 정보 비교
            if (!querySnapshot.empty) {
                const existingPatient = querySnapshot.docs[0].data().info;
                
                // 생년월일 비교를 위한 변환
                const inputBirthDate = new Date(
                    parseInt(birthYear),
                    parseInt(birthMonth) - 1,
                    parseInt(birthDay),
                    0, 0, 0
                );
                
                const existingBirthDate = existingPatient.birthDate.toDate ? 
                    existingPatient.birthDate.toDate() : 
                    new Date(existingPatient.birthDate);
                
                // 주소 비교
                const inputAddress = `${district}, ${city}, ${state}`;
                
                // 보험 정보 비교
                let isInsuranceMatching = true;
                if (existingPatient.insurance) {
                    if (insuranceStatus.value === 'has') {
                        isInsuranceMatching = 
                            existingPatient.insurance.provider === insuranceData.provider && 
                            existingPatient.insurance.cardNumber === insuranceData.cardNumber;
                    } else {
                        // 기존에 보험이 있었는데 지금은 '없음'으로 등록하려는 경우
                        isInsuranceMatching = 
                            (!existingPatient.insurance.provider && !existingPatient.insurance.cardNumber);
                    }
                } else {
                    // 기존에 보험 정보가 없었는데 지금은 '있음'으로 등록하려는 경우
                    isInsuranceMatching = insuranceStatus.value !== 'has';
                }
                
                // 이름, 생년월일, 주소, 전화번호, 성별, 보험정보 중 하나라도 다른 경우
                const isBirthDateMatching = 
                    inputBirthDate.getFullYear() === existingBirthDate.getFullYear() && 
                    inputBirthDate.getMonth() === existingBirthDate.getMonth() && 
                    inputBirthDate.getDate() === existingBirthDate.getDate();
                
                if (patientName !== existingPatient.patientName || 
                    !isBirthDateMatching || 
                    inputAddress !== existingPatient.address || 
                    phoneNumber !== existingPatient.phoneNumber || 
                    gender !== existingPatient.gender || 
                    !isInsuranceMatching) {
                    
                    alert("This patient is already registered. Please use the 'Check' button to retrieve patient information and register. For changing patient information, please use the 'Data' menu.");
                    return;
                }
            }

            // 환자 문서 ID 생성 (이름.ID번호)
            const patientId = `${patientName}.${idNumber}`;
            const patientRef = doc(db, 'hospitals', hospitalName, 'patient', patientId);

            // 환자 문서 존재 여부 확인
            const patientDoc = await getDoc(patientRef);

            // 새로운 환자인 경우에만 info 필드 생성
            if (!patientDoc.exists()) {
                // info 필드를 포함한 환자 문서 생성
                await setDoc(patientRef, {
                    info: {
                        patientName,
                        idNumber,
                        birthDate: Timestamp.fromDate(new Date(
                            parseInt(birthYear),
                            parseInt(birthMonth) - 1,
                            parseInt(birthDay),
                            0, 0, 0
                        )),
                        address: `${district}, ${city}, ${state}`,
                        insurance: insuranceData,
                        phoneNumber: phoneNumber,
                        gender: gender
                    }
                });
            }

            // primary complaint 처리
            let complaintData = primaryComplaint;
            if (primaryComplaint === 'other') {
                const otherComplaint = document.getElementById('otherComplaint').value.trim();
                if (!otherComplaint) {
                    alert('Please specify other complaint');
                    return;
                }
                complaintData = `other: ${otherComplaint}`;
            }

            // 현재 날짜시간으로 문서 ID 생성
            const now = new Date();
            const dateId = `${now.toLocaleDateString('en-GB', {
                day: '2-digit',
                month: 'short',
                year: 'numeric'
            }).replace(/ /g, '.')}_${now.getHours().toString().padStart(2,'0')}${now.getMinutes().toString().padStart(2,'0')}${now.getSeconds().toString().padStart(2,'0')}`;

            // register.date 컬렉션에 방문 기록 문서 생성 시 gender 필드 추가
            const visitRef = doc(patientRef, 'register.date', dateId);
            await setDoc(visitRef, {
                timestamp: serverTimestamp(),
                primaryComplaint: complaintData,
                doctor: null,
                progress: 'waiting',
                gender: gender  // gender 필드 추가
            });

            // 날짜 형식 수정 및 waiting 경로 추가
            const today = new Date();
            const currentDate = today.toLocaleDateString('en-GB', {
                day: '2-digit',
                month: 'short',
                year: 'numeric'
            }).replace(/ /g, '.');

            // dates 컬렉션에 데이터 저장
            const datesRef = doc(
                db,
                'hospitals', 
                hospitalName,
                'dates',
                currentDate,
                'waiting',
                patientId
            );

            await setDoc(datesRef, {
                timestamp: serverTimestamp(),
                primaryComplaint: complaintData,
                doctor: null,  // 의사 정보 null로 설정
                progress: 'waiting'
            });

            alert('Patient registration completed successfully');

            // 폼 초기화 (의사 선택 관련 코드 제거)
            document.getElementById('patientName').value = '';
            document.getElementById('idNumber').value = '';
            document.getElementById('birthDay').value = '';
            document.getElementById('birthMonth').value = '';
            document.getElementById('birthYear').value = '';
            document.getElementById('district').value = '';
            document.getElementById('city').value = '';
            document.getElementById('state').value = '';
            document.getElementById('primaryComplaint').value = '';
            document.getElementById('otherComplaint').value = '';
            document.getElementById('phoneNumber').value = '';
            document.getElementById('gender').value = '';
            document.querySelectorAll('input[name="insuranceStatus"]').forEach(radio => radio.checked = false);
            document.getElementById('insuranceProvider').value = '';
            document.getElementById('insuranceNumber').value = '';

            // waiting 컬렉션에 환자 추가할 때
            const waitingRef = doc(collection(db, 'hospitals', hospitalName, 'dates', currentDate, 'waiting'), patientId);
            await setDoc(waitingRef, {
                primaryComplaint: complaintData,
                progress: 'waiting',
                doctor: null,
                timestamp: serverTimestamp(),
                gender: gender
            });
        } catch (error) {
            console.error('Error registering patient:', error);
            alert('Failed to register patient: ' + error.message);
        }
    });
}

// 환자 ID 검색 함수
async function checkPatientId() {
    try {
        const user = auth.currentUser;
        if (!user) return;
        
        const idNumber = document.getElementById('idNumber').value.trim();
        if (!idNumber) {
            alert('Please enter an ID Card or Passport number.');
            return;
        }
        
        // 병원명 추출
        const hospitalName = user.email.split('@')[0].split('.')[0];
        
        // 환자 컬렉션에서 해당 ID를 가진 환자 검색
        const patientsRef = collection(db, 'hospitals', hospitalName, 'patient');
        const q = query(patientsRef, where('info.idNumber', '==', idNumber));
        const querySnapshot = await getDocs(q);
        
        // 검색 결과가 없는 경우
        if (querySnapshot.empty) {
            alert('Patient information does not exist.');
            return;
        }
        
        // 검색 결과가 있는 경우 - 첫 번째 문서 사용
        const patientDoc = querySnapshot.docs[0];
        const patientData = patientDoc.data().info;
        
        // 중요: 문서 ID를 patientData에 추가
        patientData.documentId = patientDoc.id;
        
        // 세 번째 section-box에 환자 정보 표시
        displayPatientInfo(patientData);
    } catch (error) {
        console.error('Error checking patient ID:', error);
        alert('Failed to check patient ID: ' + error.message);
    }
}

// 환자 정보 표시 함수
function displayPatientInfo(patientData) {
    const infoBox = document.querySelector('.section-box:last-child');
    if (!infoBox) return;
    
    // 생년월일 포맷팅
    let birthDate = '';
    if (patientData.birthDate) {
        const date = patientData.birthDate.toDate ? patientData.birthDate.toDate() : new Date(patientData.birthDate);
        birthDate = date.toLocaleDateString('en-GB', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });
    }
    
    // 보험 정보 포맷팅
    let insuranceInfo = '';
    if (patientData.insurance) {
        if (patientData.insurance.provider && patientData.insurance.cardNumber) {
            insuranceInfo = `${patientData.insurance.provider}/${patientData.insurance.cardNumber}`;
        }
    }
    
    // HTML 생성 - 세로 레이아웃으로 변경
    infoBox.innerHTML = `
        <h3>Patient Information</h3>
        <div class="registered-patient-info">
            <div class="info-item">
                <div class="info-label">Name</div>
                <div class="info-value">${patientData.patientName || ''}</div>
            </div>
            <div class="info-item">
                <div class="info-label">ID Number</div>
                <div class="info-value">${patientData.idNumber || ''}</div>
            </div>
            <div class="info-item">
                <div class="info-label">Phone Number</div>
                <div class="info-value">${patientData.phoneNumber || ''}</div>
            </div>
            <div class="info-item">
                <div class="info-label">Birth Date</div>
                <div class="info-value">${birthDate}</div>
            </div>
            <div class="info-item">
                <div class="info-label">Gender</div>
                <div class="info-value">${patientData.gender || ''}</div>
            </div>
            <div class="info-item">
                <div class="info-label">Address</div>
                <div class="info-value">${patientData.address || ''}</div>
            </div>
            <div class="info-item">
                <div class="info-label">Insurance</div>
                <div class="info-value">${insuranceInfo}</div>
            </div>
        </div>
        <div class="visit-history-divider"></div>
        <div class="visit-history-container">
            <style>
                .visit-history-container {
                    width: 100%;
                    max-height: 200px;
                    overflow-y: auto;
                    box-sizing: border-box;
                    padding: 0;
                    margin: 0;
                }
                .visit-history-table {
                    width: 100%;
                    border-collapse: collapse;
                    margin-top: 20px;
                    box-sizing: border-box;
                }
                .visit-history-table th {
                    background-color: #e6f2ff;
                    padding: 5px;
                    text-align: left;
                    font-weight: normal;
                    border: 1px solid #b3d9ff;
                }
                .visit-history-table td {
                    padding: 8px;
                    border: 1px solid #ddd;
                }
                .visit-history-table tr:last-child td {
                    border-bottom: 1px solid #ddd;
                }
                .no-history-message {
                    text-align: center;
                    color: #888;
                    padding: 10px;
                }
            </style>
            <table class="visit-history-table">
                <thead>
                    <tr>
                        <th>Date</th>
                        <th>Doctor</th>
                        <th>Primary Complaint</th>
                        <th>Progress</th>
                    </tr>
                </thead>
                <tbody id="visit-history-body">
                    <tr>
                        <td colspan="4" class="no-history-message">Loading visit history...</td>
                    </tr>
                </tbody>
            </table>
        </div>
    `;

    // 환자 방문 기록 가져오기 - 문서 ID와 ID 번호 둘 다 전달
    if (patientData.documentId) {
        fetchPatientVisitHistory(patientData.documentId);
    } else {
        fetchPatientVisitHistory(patientData.idNumber);
    }

    // 클릭 이벤트 리스너 추가
    const patientInfoContainer = infoBox.querySelector('.registered-patient-info');
    patientInfoContainer.addEventListener('click', () => {
        // 기본 정보 채우기
        document.getElementById('patientName').value = patientData.patientName || '';
        document.getElementById('idNumber').value = patientData.idNumber || '';
        document.getElementById('phoneNumber').value = patientData.phoneNumber || '';
        document.getElementById('gender').value = patientData.gender || '';

        // 생년월일 채우기
        if (patientData.birthDate) {
            const date = patientData.birthDate.toDate ? patientData.birthDate.toDate() : new Date(patientData.birthDate);
            document.getElementById('birthDay').value = date.getDate().toString();
            document.getElementById('birthMonth').value = (date.getMonth() + 1).toString();
            document.getElementById('birthYear').value = date.getFullYear().toString();
        }

        // 주소 채우기
        if (patientData.address) {
            const [district, city, state] = patientData.address.split(', ');
            document.getElementById('district').value = district || '';
            document.getElementById('city').value = city || '';
            document.getElementById('state').value = state || '';
        }

        // 보험 정보 채우기
        const hasInsuranceRadio = document.querySelector('input[name="insuranceStatus"][value="has"]');
        const noInsuranceRadio = document.querySelector('input[name="insuranceStatus"][value="none"]');
        const insuranceDetails = document.querySelector('.insurance-details');
        const insuranceProviderDropdown = document.getElementById('insuranceProvider');

        if (patientData.insurance && patientData.insurance.provider && patientData.insurance.cardNumber) {
            hasInsuranceRadio.checked = true;
            noInsuranceRadio.checked = false;
            insuranceDetails.style.display = 'block';
            
            // 보험사가 드롭다운에 있는지 확인
            const providerExists = Array.from(insuranceProviderDropdown.options).some(
                option => option.value === patientData.insurance.provider
            );
            
            // 보험사가 드롭다운에 없으면 추가
            if (!providerExists && patientData.insurance.provider) {
                const newOption = document.createElement('option');
                newOption.value = patientData.insurance.provider;
                newOption.textContent = patientData.insurance.provider;
                insuranceProviderDropdown.appendChild(newOption);
            }
            
            // 보험사 선택
            insuranceProviderDropdown.value = patientData.insurance.provider;
            document.getElementById('insuranceNumber').value = patientData.insurance.cardNumber;
        } else {
            hasInsuranceRadio.checked = false;
            noInsuranceRadio.checked = true;
            insuranceDetails.style.display = 'none';
            document.getElementById('insuranceProvider').value = '';
            document.getElementById('insuranceNumber').value = '';
        }

        // Primary Complaint는 제외 (비워두기)
        document.getElementById('primaryComplaint').value = '';
        document.getElementById('otherComplaint').value = '';
        document.getElementById('otherComplaintContainer').style.display = 'none';
    });
}

// 환자 방문 기록 가져오기 함수
async function fetchPatientVisitHistory(patientId) {
    try {
        const user = auth.currentUser;
        if (!user) {
            return;
        }
        
        // 병원명 추출
        const hospitalName = user.email.split('@')[0].split('.')[0];
        
        // 환자의 register.date 컬렉션 참조
        const registerDateRef = collection(db, 'hospitals', hospitalName, 'patient', patientId, 'register.date');
        
        // 등록 날짜 문서 가져오기
        const querySnapshot = await getDocs(registerDateRef);
        
        // 방문 기록 테이블 업데이트
        const visitHistoryBody = document.getElementById('visit-history-body');
        
        // 데이터가 없는 경우
        if (querySnapshot.empty) {
            visitHistoryBody.innerHTML = `
                <tr>
                    <td colspan="4" class="no-history-message">No visit history found.</td>
                </tr>
            `;
            return;
        }
        
        // 문서를 배열로 변환
        const docs = [];
        querySnapshot.forEach(doc => {
            // 문서 ID에서 날짜 부분 추출 (언더스코어 이전 부분)
            const docId = doc.id;
            const datePart = docId.includes('_') ? docId.split('_')[0] : docId;
            
            // 날짜를 yyyy-mmm-dd 형식으로 변환
            let formattedDate = datePart;
            if (datePart.includes('.')) {
                const [day, month, year] = datePart.split('.');
                formattedDate = `${year}-${month}-${day}`;
            }
            
            const docData = doc.data();
            
            docs.push({
                id: docId,
                date: datePart,
                formattedDate: formattedDate,
                data: docData
            });
        });
        
        // 실제 날짜 기준으로 내림차순 정렬 (최신순)
        docs.sort((a, b) => b.formattedDate.localeCompare(a.formattedDate));
        
        // 최근 3개의 방문 기록만 표시
        const recentVisits = docs.slice(0, 3);
        
        // 방문 기록 행 생성
        let tableRows = '';
        
        for (const doc of recentVisits) {
            const data = doc.data;
            const date = doc.date;
            
            // 의사 이름 가져오기
            const doctor = data.doctor || 'N/A';
            
            // Primary Complaint 가져오기 (이전 CC 처리 로직 제거)
            const primaryComplaint = data.primaryComplaint || 'N/A';
            
            // Progress 상태 가져오기
            const progress = data.progress || 'N/A';
            
            tableRows += `
                <tr>
                    <td>${date}</td>
                    <td>${doctor}</td>
                    <td>${primaryComplaint}</td>
                    <td>${progress}</td>
                </tr>
            `;
        }
        
        if (tableRows) {
            visitHistoryBody.innerHTML = tableRows;
        } else {
            visitHistoryBody.innerHTML = `
                <tr>
                    <td colspan="4" class="no-history-message">No visit history data available.</td>
                </tr>
            `;
        }
        
    } catch (error) {
        console.error('Error fetching patient visit history:', error);
        const visitHistoryBody = document.getElementById('visit-history-body');
        visitHistoryBody.innerHTML = `
            <tr>
                <td colspan="4" class="no-history-message">Error loading visit history: ${error.message}</td>
            </tr>
        `;
    }
}

// New Patient 버튼 클릭 이벤트 초기화
export function initializeNewPatientButton() {
    document.querySelector('.new-patient-btn').addEventListener('click', function() {
        const menuItems = document.querySelectorAll('.menu-item');
        const contentContainers = document.querySelectorAll('.content-container, .content-container-2');
        const mainContent = document.querySelector('.main-content');
        const prescriptionContent = document.querySelector('.main-content-prescription');
        
        // 모든 메뉴 아이템의 active 클래스 제거
        menuItems.forEach(item => {
            item.classList.remove('active');
        });

        // 기존 컨테이너들 숨기기
        contentContainers.forEach(container => {
            container.style.display = 'none';
        });

        // Prescription 관련 컨테이너 숨기기
        if (prescriptionContent) {
            prescriptionContent.style.display = 'none';
        }
        
        // main-content 표시
        if (mainContent) {
            mainContent.style.display = 'flex';
        }

        // 환자 등록 컨테이너 표시
        const content = document.getElementById('patient-registration-content');
        if (content) {
            content.style.display = 'block';
            loadDoctors();
            
            // Primary Complaint 이벤트 리스너 설정
            const primaryComplaint = document.getElementById('primaryComplaint');
            const otherComplaintContainer = document.getElementById('otherComplaintContainer');
            if (primaryComplaint && otherComplaintContainer) {
                primaryComplaint.removeEventListener('change', handleComplaintChange);
                primaryComplaint.addEventListener('change', handleComplaintChange);
            }
        }
    });
}
