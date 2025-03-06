import { auth, db, collection, query, where, getDocs, doc, getDoc, setDoc, serverTimestamp, Timestamp } from './firebase-config.js';

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
            if (insuranceStatus.value === 'has') {
                const insuranceProvider = document.getElementById('insuranceProvider').value.trim();
                const insuranceNumber = document.getElementById('insuranceNumber').value.trim();
                
                if (!insuranceProvider || !insuranceNumber) {
                    alert('Please fill in all required fields');
                    return;
                }
            }

            // 병원명 추출
            const [hospitalName] = user.email.split('@')[0].split('.');

            // 환자 문서 ID 생성 (이름.ID번호)
            const patientId = `${patientName}.${idNumber}`;
            const patientRef = doc(db, 'hospitals', hospitalName, 'patient', patientId);

            // 환자 문서 존재 여부 확인
            const patientDoc = await getDoc(patientRef);

            // 새로운 환자인 경우에만 info 필드 생성
            if (!patientDoc.exists()) {
                // insurance 정보 수집
                let insuranceData = {
                    status: '',
                    provider: '',
                    cardNumber: ''
                };

                if (insuranceStatus.value === 'has') {
                    insuranceData = {
                        status: 'have',
                        provider: document.getElementById('insuranceProvider').value,
                        cardNumber: document.getElementById('insuranceNumber').value
                    };
                }

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
                primaryComplaint: primaryComplaint,
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
    `;
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
