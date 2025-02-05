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

// Doctor 목록 로드 함수
export async function loadDoctors() {
    try {
        const user = auth.currentUser;
        if (!user) return;

        const [hospitalName] = user.email.split('@')[0].split('.');
        const staffRef = collection(db, 'hospitals', hospitalName, 'staff');
        const q = query(staffRef, where('role', '==', 'doctor'));
        const querySnapshot = await getDocs(q);

        // registration 페이지의 드롭다운 요소들
        const doctorSelect = document.getElementById('doctorselect');
        const doctorSelected = document.querySelector('.registration-doctor-selected');
        const doctorOptions = document.querySelector('.registration-doctor-options');
        
        // 기존 옵션 제거
        while (doctorSelect.options.length > 1) {
            doctorSelect.remove(1);
        }
        doctorOptions.innerHTML = '';

        // 의사 데이터를 배열로 변환하여 정렬
        const doctors = [];
        querySnapshot.forEach((doc) => {
            doctors.push({
                id: doc.id,
                ...doc.data()
            });
        });

        // 상태 우선순위 정의
        const statusPriority = {
            'start': 0,
            'break': 1,
            'login': 2,
            'logout': 3
        };

        // 상태와 계정 번호로 정렬
        doctors.sort((a, b) => {
            const statusDiff = statusPriority[a.work] - statusPriority[b.work];
            if (statusDiff !== 0) return statusDiff;
            
            const aNumber = parseInt(a.id.split('.').pop());
            const bNumber = parseInt(b.id.split('.').pop());
            return aNumber - bNumber;
        });

        // 'Choose a doctor' 옵션 먼저 추가
        const defaultOption = document.createElement('div');
        defaultOption.className = 'registration-doctor-option';
        defaultOption.dataset.value = '';
        defaultOption.innerHTML = `
            <div class="registration-doctor-option-content">
                <span>Choose a doctor</span>
            </div>
        `;
        doctorOptions.appendChild(defaultOption);

        doctors.forEach((doctorData) => {
            const selectOption = document.createElement('option');
            selectOption.value = doctorData.id;
            selectOption.textContent = doctorData.name;
            doctorSelect.appendChild(selectOption);

            const dropdownOption = document.createElement('div');
            dropdownOption.className = `registration-doctor-option${doctorData.work === 'logout' ? ' disabled' : ''}`;
            dropdownOption.dataset.value = doctorData.id;
            dropdownOption.innerHTML = `
                <div class="registration-doctor-option-content">
                    <span class="${doctorData.work === 'logout' ? 'disabled' : ''}">${doctorData.name}</span>
                    <img src="image/${doctorData.work}.png" alt="${doctorData.work}" class="status-icon">
                </div>
            `;
            doctorOptions.appendChild(dropdownOption);
        });

        // 드롭다운 토글 이벤트
        doctorSelected.addEventListener('click', function(e) {
            e.stopPropagation();
            doctorOptions.style.display = doctorOptions.style.display === 'none' ? 'block' : 'none';
        });

        // 옵션 선택 이벤트
        doctorOptions.addEventListener('click', function(e) {
            const option = e.target.closest('.registration-doctor-option');
            if (option && !option.classList.contains('disabled')) {
                const value = option.dataset.value;
                const text = value ? option.querySelector('span').textContent : 'Choose a doctor';
                
                doctorSelect.value = value;
                doctorSelected.textContent = text;
                doctorOptions.style.display = 'none';
                e.stopPropagation();
            }
        });

        // 외부 클릭 시 드롭다운 닫기
        document.addEventListener('click', function(e) {
            if (!doctorSelected.contains(e.target)) {
                doctorOptions.style.display = 'none';
            }
        });

    } catch (error) {
        console.error('Error loading doctors:', error);
    }
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

// 환자 등록 이벤트 초기화
export function initializeRegistrationForm() {
    document.querySelector('.register-btn').addEventListener('click', async () => {
        try {
            const user = auth.currentUser;
            if (!user) return;

            // 필수 입력값 확인 (doctorId 제외)
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

            if (!patientName || !idNumber || !birthDay || !birthMonth || !birthYear || 
                !district || !city || !state || !primaryComplaint || !phoneNumber) {
                alert('Please fill in all required fields');
                return;
            }

            // 의사 선택은 선택사항으로 처리
            const doctorId = document.getElementById('doctorselect').value;
            let doctorName = '';
            
            if (doctorId) {
                const [hospitalName] = user.email.split('@')[0].split('.');
                const doctorRef = doc(db, 'hospitals', hospitalName, 'staff', doctorId);
                const doctorDoc = await getDoc(doctorRef);
                doctorName = doctorDoc.data().name;
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
                const insuranceStatus = document.querySelector('input[name="insuranceStatus"]:checked')?.value;
                let insuranceData = {
                    status: '',
                    provider: '',
                    cardNumber: ''
                };

                if (insuranceStatus === 'has') {
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
                            parseInt(birthMonth) - 1,  // JavaScript의 월은 0부터 시작
                            parseInt(birthDay),
                            0, 0, 0  // 시간, 분, 초는 0으로 고정
                        )),
                        address: `${district}, ${city}, ${state}`,
                        insurance: insuranceData,
                        phoneNumber: phoneNumber  // 전화번호 추가
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

            // 현재 날짜시간으로 문서 ID 생성 (DD.MM.YYYY_HHMMSS)
            const now = new Date();
            const dateId = `${now.toLocaleDateString('en-ZA', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
            }).replace(/\//g, '.')}_${now.getHours().toString().padStart(2,'0')}${now.getMinutes().toString().padStart(2,'0')}${now.getSeconds().toString().padStart(2,'0')}`;

            // register.date 컬렉션에 방문 기록 문서 생성
            const visitRef = doc(patientRef, 'register.date', dateId);
            await setDoc(visitRef, {
                timestamp: serverTimestamp(),
                primaryComplaint: complaintData,
                doctor: doctorName,  // 빈 문자열이거나 의사 이름
                progress: 'waiting'
            }, { merge: true });

            // 날짜 형식 수정 및 waiting 경로 추가
            const today = new Date();
            const currentDate = today.toLocaleDateString('en-GB', {
                day: '2-digit',
                month: 'short',
                year: 'numeric'
            }).replace(/ /g, '.'); // 공백을 .으로 변경

            // dates 컬렉션 생성 및 데이터 저장 
            const datesRef = doc(
                db,
                'hospitals', 
                hospitalName,
                'dates',
                currentDate,  // dateString에서 currentDate로 변경
                'waiting',
                `${patientName}.${idNumber}`
            );

            await setDoc(datesRef, {
                timestamp: serverTimestamp(),
                primaryComplaint: complaintData,
                doctor: doctorName,  // 빈 문자열이거나 의사 이름
                progress: 'waiting'  // progress 필드 추가
            }, { merge: true });

            alert('Patient registration completed successfully');

            // 폼 초기화
            document.getElementById('patientName').value = '';
            document.getElementById('idNumber').value = '';
            document.getElementById('birthDay').value = '';
            document.getElementById('birthMonth').value = '';
            document.getElementById('birthYear').value = '';
            document.getElementById('district').value = '';
            document.getElementById('city').value = '';
            document.getElementById('state').value = '';
            document.getElementById('primaryComplaint').value = '';
            document.getElementById('doctorselect').value = '';
            document.querySelector('.registration-doctor-selected').textContent = 'Choose a doctor';
            document.querySelectorAll('input[name="insuranceStatus"]').forEach(radio => radio.checked = false);
            document.getElementById('insuranceProvider').value = '';
            document.getElementById('insuranceNumber').value = '';
            document.getElementById('otherComplaint').value = '';
            document.getElementById('phoneNumber').value = '';

            // waiting 컬렉션에 환자 추가할 때 timestamp 포함
            const waitingRef = doc(collection(db, 'hospitals', hospitalName, 'dates', currentDate, 'waiting'), patientId);
            await setDoc(waitingRef, {
                primaryComplaint: primaryComplaint,
                progress: 'waiting',
                doctor: null,
                timestamp: serverTimestamp()  // 등록 시점의 timestamp 추가
            });

        } catch (error) {
            console.error('Error registering patient:', error);
            alert('Failed to register patient: ' + error.message);
        }
    });
}

// New Patient 버튼 클릭 이벤트 초기화
export function initializeNewPatientButton() {
    document.querySelector('.new-patient-btn').addEventListener('click', function() {
        const menuItems = document.querySelectorAll('.menu-item');
        const contentContainers = document.querySelectorAll('.content-container, .content-container-2');
        
        // 모든 메뉴 아이템의 active 클래스 제거
        menuItems.forEach(item => {
            item.classList.remove('active');
        });

        contentContainers.forEach(container => {
            container.style.display = 'none';
        });

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
