import { auth, db, collection, query, getDocs, doc, getDoc, onSnapshot, where } from './firebase-config.js';
import { openEditPatientModal } from './patient-edit.js';
import { openViewPatientModal } from './patient-view.js';

// 페이지네이션 설정
let ITEMS_PER_PAGE = 10; // 변수로 변경하여 동적 조정 가능하게 함
const MIN_ITEMS_PER_PAGE = 10; // 최소 항목 수
let currentPage = 1;
let totalPages = 1;
let currentData = [];
let currentFilter = 'patients';
let selectedDate = null; // 선택된 날짜 저장용

// 구독 해제 함수 저장
let unsubscribePatients = null;
let unsubscribeStaff = null;
let unsubscribeDaily = null;

// Data 메뉴 초기화 함수
export function initializeDataMenu() {
    // 검색 기능 초기화
    const searchInput = document.getElementById('data-search');
    if (searchInput) {
        searchInput.addEventListener('input', handleSearch);
    }
    
    // 필터 버튼 이벤트 리스너 추가
    const filterButtons = document.querySelectorAll('.data-filter-btn');
    filterButtons.forEach(button => {
        button.addEventListener('click', () => {
            // 활성 버튼 스타일 변경
            filterButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            
            // 이전 구독 해제
            unsubscribeCurrentListener();
            
            // 필터 적용
            currentFilter = button.dataset.type;
            currentPage = 1;
            
            // Daily 필터가 아닌 경우 달력 숨기기 및 타이틀 원복
            if (currentFilter !== 'daily') {
                hideDateCalendar();
                // 타이틀 원복
                const contentTitle = document.querySelector('.content-title');
                if (contentTitle) {
                    contentTitle.innerHTML = 'Hospital Data Center';
                }
            } else {
                // Daily 필터인 경우 달력 표시
                const calendarContainer = document.getElementById('daily-calendar-container');
                calendarContainer.style.display = 'block';
                
                // 달력이 아직 초기화되지 않았거나 날짜가 선택되지 않은 경우 초기화
                if (!selectedDate) {
                    initializeCalendar();
                } else {
                    // 이미 선택된 날짜가 있는 경우 타이틀에 날짜 표시
                    const contentTitle = document.querySelector('.content-title');
                    if (contentTitle) {
                        contentTitle.innerHTML = `Hospital Data Center <span style="font-size: 0.9em; color: #0052cc; margin-left: 10px;">(${selectedDate})</span>`;
                    }
                }
            }
            
            loadData();
        });
    });
    
    // 달력 외부 클릭 시 달력 닫기
    document.addEventListener('click', (event) => {
        const calendarContainer = document.getElementById('daily-calendar-container');
        const dailyButton = document.querySelector('.data-filter-btn[data-type="daily"]');
        
        // 달력이 표시 중이고, 클릭된 요소가 달력 컨테이너 내부가 아니고, Daily 버튼도 아닌 경우
        if (calendarContainer && calendarContainer.style.display !== 'none') {
            // 클릭된 요소가 달력 컨테이너의 자식이 아니고, Daily 버튼의 자식도 아닌 경우
            if (!calendarContainer.contains(event.target) && 
                (dailyButton && !dailyButton.contains(event.target))) {
                // 선택된 날짜가 있고 Daily 필터가 활성화된 상태면 달력만 숨기기
                if (selectedDate && currentFilter === 'daily') {
                    calendarContainer.style.display = 'none';
                } 
                // 그 외의 경우는 Daily 필터가 아닌 경우이거나 날짜가 선택되지 않은 경우로, 달력 숨기기
                else if (!selectedDate) {
                    hideDateCalendar();
                }
            }
        }
    });
    
    // 초기 화면 크기에 맞게 항목 수 계산
    calculateItemsPerPage();
    
    // 사용자 인증 상태 확인 후 데이터 로드
    auth.onAuthStateChanged(user => {
        if (user) {
            // 사용자가 로그인된 경우에만 데이터 로드
            loadData();
            
            // 창 크기 변경 이벤트 리스너 추가
            window.addEventListener('resize', handleResize);
        } else {
            console.log('User not authenticated. Data loading deferred.');
            // 로그아웃 시 구독 해제
            unsubscribeCurrentListener();
            
            // 창 크기 변경 이벤트 리스너 제거
            window.removeEventListener('resize', handleResize);
        }
    });
    
    // Data 메뉴가 표시될 때 항목 수 재계산을 위한 MutationObserver 설정
    const dataContent = document.getElementById('data-content');
    if (dataContent) {
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.attributeName === 'style' && 
                    dataContent.style.display !== 'none' && 
                    dataContent.style.display !== '') {
                    // Data 메뉴가 표시될 때 항목 수 재계산
                    calculateItemsPerPage();
                    if (currentData.length > 0) {
                        // 데이터가 이미 로드된 경우 다시 표시
                        if (currentFilter === 'patients') {
                            displayPatientData(currentData);
                        } else {
                            displayStaffData(currentData);
                        }
                        updatePagination(currentData.length);
                    }
                }
            });
        });
        
        observer.observe(dataContent, { attributes: true });
    }
}

// 현재 활성화된 리스너 구독 해제
function unsubscribeCurrentListener() {
    if (unsubscribePatients) {
        unsubscribePatients();
        unsubscribePatients = null;
    }
    if (unsubscribeStaff) {
        unsubscribeStaff();
        unsubscribeStaff = null;
    }
    if (unsubscribeDaily) {
        unsubscribeDaily();
        unsubscribeDaily = null;
    }
}

// 데이터 로드 함수
async function loadData() {
    try {
        if (!auth.currentUser) {
            console.log('User not authenticated. Cannot load data.');
            return;
        }
        
        const hospitalName = auth.currentUser.email.split('@')[0].split('.')[0];
        
        if (currentFilter === 'patients') {
            // 환자 테이블 표시, 스태프 테이블 숨김
            document.getElementById('patient-data-table').style.display = 'table';
            document.getElementById('staff-data-table').style.display = 'none';
            
            // 환자 데이터 로드 (실시간)
            loadPatientDataRealtime(hospitalName);
        } else if (currentFilter === 'staff') {
            // 스태프 테이블 표시, 환자 테이블 숨김
            document.getElementById('patient-data-table').style.display = 'none';
            document.getElementById('staff-data-table').style.display = 'table';
            
            // 스태프 데이터 로드 (실시간)
            loadStaffDataRealtime(hospitalName);
        } else if (currentFilter === 'daily') {
            // Daily 필터 선택 시, 환자 테이블 표시하고 달력 표시
            document.getElementById('patient-data-table').style.display = 'table';
            document.getElementById('staff-data-table').style.display = 'none';
            
            // 달력 표시
            document.getElementById('daily-calendar-container').style.display = 'block';
            
            if (selectedDate) {
                // 선택된 날짜가 있으면 해당 날짜의 환자 데이터 로드
                loadDailyPatientData(hospitalName, selectedDate);
            } else {
                // 선택된 날짜가 없으면 달력 생성
                initializeCalendar();
                
                // 환자 테이블 비우기
                const patientTableBody = document.getElementById('patient-data-body');
                patientTableBody.innerHTML = '<tr><td colspan="8" class="no-data-message">Please select a date from the calendar</td></tr>';
            }
        }
    } catch (error) {
        console.error('Error loading data:', error);
        showErrorMessage();
    }
}

// 환자 데이터 실시간 로드 함수
function loadPatientDataRealtime(hospitalName) {
    const patientTableBody = document.getElementById('patient-data-body');
    patientTableBody.innerHTML = '<tr><td colspan="8" style="text-align: center; padding: 20px;">Loading patient data...</td></tr>';
    
    try {
        // 환자 컬렉션 참조
        const patientsRef = collection(db, 'hospitals', hospitalName, 'patient');
        
        // 실시간 리스너 설정
        unsubscribePatients = onSnapshot(patientsRef, (snapshot) => {
            // 환자 데이터 배열 생성
            const patients = [];
            snapshot.forEach(doc => {
                const data = doc.data();
                if (data.info) {
                    patients.push({
                        id: doc.id,
                        ...data.info
                    });
                }
            });
            
            // 현재 데이터 저장
            currentData = patients;
            
            // 페이지네이션 업데이트
            updatePagination(patients.length);
            
            // 현재 페이지 데이터 표시
            displayPatientData(patients);
            
            console.log('Patient data updated in real-time');
        }, (error) => {
            console.error('Error in patient snapshot listener:', error);
            patientTableBody.innerHTML = '<tr><td colspan="8" style="text-align: center; padding: 20px; color: red;">Error loading patient data. Please try again.</td></tr>';
        });
        
    } catch (error) {
        console.error('Error setting up patient data listener:', error);
        patientTableBody.innerHTML = '<tr><td colspan="8" style="text-align: center; padding: 20px; color: red;">Error loading patient data. Please try again.</td></tr>';
    }
}

// 스태프 데이터 실시간 로드 함수
function loadStaffDataRealtime(hospitalName) {
    const staffTableBody = document.getElementById('staff-data-body');
    staffTableBody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 20px;">Loading staff data...</td></tr>';
    
    try {
        // 스태프 컬렉션 참조
        const staffRef = collection(db, 'hospitals', hospitalName, 'staff');
        
        // 실시간 리스너 설정
        unsubscribeStaff = onSnapshot(staffRef, (snapshot) => {
            // 스태프 데이터 배열 생성
            const staffMembers = [];
            snapshot.forEach(doc => {
                const data = doc.data();
                staffMembers.push({
                    id: doc.id,
                    ...data
                });

            });
            
            // 현재 데이터 저장
            currentData = staffMembers;
            
            // 페이지네이션 업데이트
            updatePagination(staffMembers.length);
            
            // 현재 페이지 데이터 표시
            displayStaffData(staffMembers);
            
            console.log('Staff data updated in real-time');
        }, (error) => {
            console.error('Error in staff snapshot listener:', error);
            staffTableBody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 20px; color: red;">Error loading staff data. Please try again.</td></tr>';
        });
        
    } catch (error) {
        console.error('Error setting up staff data listener:', error);
        staffTableBody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 20px; color: red;">Error loading staff data. Please try again.</td></tr>';
    }
}

// 환자 데이터 표시 함수
function displayPatientData(patients) {
    const patientTableBody = document.getElementById('patient-data-body');
    
    // 페이지네이션 적용
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = Math.min(startIndex + ITEMS_PER_PAGE, patients.length);
    const paginatedData = patients.slice(startIndex, endIndex);
    
    if (paginatedData.length === 0) {
        patientTableBody.innerHTML = '<tr><td colspan="8" class="no-data-message">No patient records found</td></tr>';
        return;
    }
    
    // 테이블 내용 생성
    let tableHTML = '';
    
    paginatedData.forEach(patient => {
        // 날짜 형식 변환 (Timestamp -> dd.mmm.yyyy)
        let birthDateStr = 'N/A';
        if (patient.birthDate && typeof patient.birthDate.toDate === 'function') {
            const birthDate = patient.birthDate.toDate();
            const day = String(birthDate.getDate()).padStart(2, '0');
            const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            const month = months[birthDate.getMonth()];
            const year = birthDate.getFullYear();
            birthDateStr = `${day}.${month}.${year}`;
        }
        
        // 보험 정보 형식화
        let insuranceStr = 'N/A';
        if (patient.insurance && patient.insurance.provider && patient.insurance.cardNumber) {
            insuranceStr = `${patient.insurance.provider}/${patient.insurance.cardNumber}`;
        }
        
        tableHTML += `
            <tr class="data-table-row">
                <td class="data-table-td">${patient.patientName || 'N/A'}</td>
                <td class="data-table-td">${patient.idNumber || 'N/A'}</td>
                <td class="data-table-td">${patient.gender || 'N/A'}</td>
                <td class="data-table-td">${birthDateStr}</td>
                <td class="data-table-td">${patient.phoneNumber || 'N/A'}</td>
                <td class="data-table-td">${patient.address || 'N/A'}</td>
                <td class="data-table-td">${insuranceStr}</td>
                <td class="data-table-td">
                    <button class="view-btn action-btn" data-id="${patient.id}">View</button>
                    <button class="edit-btn action-btn" data-id="${patient.id}">Edit</button>
                </td>
            </tr>
        `;
    });
    
    patientTableBody.innerHTML = tableHTML;
    
    // 버튼 이벤트 리스너 추가
    addPatientButtonListeners();
}

// 스태프 데이터 표시 함수
function displayStaffData(staffMembers) {
    const staffTableBody = document.getElementById('staff-data-body');
    
    // 페이지네이션 적용
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = Math.min(startIndex + ITEMS_PER_PAGE, staffMembers.length);
    const paginatedData = staffMembers.slice(startIndex, endIndex);
    
    if (paginatedData.length === 0) {
        staffTableBody.innerHTML = '<tr><td colspan="6" class="no-data-message">No staff records found</td></tr>';
        return;
    }
    
    // 테이블 내용 생성
    let tableHTML = '';
    
    paginatedData.forEach(staff => {
        tableHTML += `
            <tr class="data-table-row">
                <td class="data-table-td">${staff.name || 'N/A'}</td>
                <td class="data-table-td">${staff.role || 'N/A'}</td>
                <td class="data-table-td">${staff.id || 'N/A'}</td>
                <td class="data-table-td">${staff.phone || 'N/A'}</td>
                <td class="data-table-td">${staff.status || 'N/A'}</td>
                <td class="data-table-td">
                    <button class="view-staff-btn action-btn" data-id="${staff.id}">View</button>
                    <button class="edit-staff-btn action-btn" data-id="${staff.id}">Edit</button>
                </td>
            </tr>
        `;
    });
    
    staffTableBody.innerHTML = tableHTML;
    
    // 버튼 이벤트 리스너 추가
    addStaffButtonListeners();
}

// 페이지네이션 업데이트 함수
function updatePagination(totalItems) {
    totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);
    const paginationControls = document.getElementById('pagination-controls');
    
    if (totalPages <= 1) {
        paginationControls.innerHTML = '';
        return;
    }
    
    let paginationHTML = `
        <button id="prev-page" class="pagination-btn">&lt;</button>
    `;
    
    for (let i = 1; i <= totalPages; i++) {
        const isActive = i === currentPage;
        paginationHTML += `
            <button class="page-btn pagination-btn ${isActive ? 'active' : ''}" data-page="${i}">${i}</button>
        `;
    }
    
    paginationHTML += `
        <button id="next-page" class="pagination-btn">&gt;</button>
    `;
    
    paginationControls.innerHTML = paginationHTML;
    
    // 페이지네이션 버튼 이벤트 리스너 추가
    document.getElementById('prev-page').addEventListener('click', () => {
        if (currentPage > 1) {
            currentPage--;
            if (currentFilter === 'patients') {
                displayPatientData(currentData);
            } else {
                displayStaffData(currentData);
            }
            updatePagination(currentData.length);
        }
    });
    
    document.getElementById('next-page').addEventListener('click', () => {
        if (currentPage < totalPages) {
            currentPage++;
            if (currentFilter === 'patients') {
                displayPatientData(currentData);
            } else {
                displayStaffData(currentData);
            }
            updatePagination(currentData.length);
        }
    });
    
    document.querySelectorAll('.page-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            currentPage = parseInt(e.target.dataset.page);
            if (currentFilter === 'patients') {
                displayPatientData(currentData);
            } else {
                displayStaffData(currentData);
            }
            updatePagination(currentData.length);
        });
    });
}

// 검색 처리 함수
function handleSearch(event) {
    const searchTerm = event.target.value.toLowerCase();
    
    if (searchTerm === '') {
        // 검색어가 없으면 전체 데이터 표시
        if (currentFilter === 'patients') {
            displayPatientData(currentData);
        } else {
            displayStaffData(currentData);
        }
        return;
    }
    
    // 검색어로 필터링
    let filteredData = [];
    
    if (currentFilter === 'patients') {
        filteredData = currentData.filter(patient => 
            (patient.patientName && patient.patientName.toLowerCase().includes(searchTerm)) ||
            (patient.idNumber && patient.idNumber.toLowerCase().includes(searchTerm)) ||
            (patient.phoneNumber && patient.phoneNumber.toLowerCase().includes(searchTerm))
        );
        displayPatientData(filteredData);
    } else {
        filteredData = currentData.filter(staff => 
            (staff.name && staff.name.toLowerCase().includes(searchTerm)) ||
            (staff.id && staff.id.toLowerCase().includes(searchTerm)) ||
            (staff.role && staff.role.toLowerCase().includes(searchTerm))
        );
        displayStaffData(filteredData);
    }
    
    // 페이지네이션 업데이트
    currentPage = 1;
    updatePagination(filteredData.length);
}

// 환자 버튼 이벤트 리스너 추가 함수
function addPatientButtonListeners() {
    // View 버튼 이벤트 리스너
    document.querySelectorAll('.view-btn').forEach(button => {
        button.addEventListener('click', async () => {
            const patientId = button.dataset.id;
            await viewPatientDetails(patientId);
        });
    });
    
    // Edit 버튼 이벤트 리스너
    document.querySelectorAll('.edit-btn').forEach(button => {
        button.addEventListener('click', async () => {
            const patientId = button.dataset.id;
            await editPatientDetails(patientId);
        });
    });
}

// 스태프 버튼 이벤트 리스너 추가 함수
function addStaffButtonListeners() {
    // View 버튼 이벤트 리스너
    document.querySelectorAll('.view-staff-btn').forEach(button => {
        button.addEventListener('click', async () => {
            const staffId = button.dataset.id;
            await viewStaffDetails(staffId);
        });
    });
    
    // Edit 버튼 이벤트 리스너
    document.querySelectorAll('.edit-staff-btn').forEach(button => {
        button.addEventListener('click', async () => {
            const staffId = button.dataset.id;
            await editStaffDetails(staffId);
        });
    });
}

// 환자 상세 정보 보기 함수
async function viewPatientDetails(patientId) {
    try {
        // 새로운 View 모달 열기
        await openViewPatientModal(patientId);
    } catch (error) {
        console.error('Error viewing patient details:', error);
        alert('Error loading patient details');
    }
}

// 환자 정보 편집 함수
async function editPatientDetails(patientId) {
    try {
        // 현재 필터와 선택된 날짜 저장
        const isDaily = currentFilter === 'daily';
        const currentDate = selectedDate;
        
        // 편집 모달 열기 - 수정된 함수 호출로 콜백 추가
        await openEditPatientModal(patientId, async () => {
            // 편집 완료 후 콜백: Daily 필터가 활성화된 경우 데이터 다시 로드
            if (isDaily && currentDate) {
                console.log('Patient edited in Daily view, reloading data...');
                const hospitalName = auth.currentUser.email.split('@')[0].split('.')[0];
                await loadDailyPatientData(hospitalName, currentDate);
            }
        });
    } catch (error) {
        console.error('Error editing patient details:', error);
        alert('Error opening patient edit form');
    }
}

// 스태프 상세 정보 보기 함수
async function viewStaffDetails(staffId) {
    try {
        const hospitalName = auth.currentUser.email.split('@')[0].split('.')[0];
        const staffRef = doc(db, 'hospitals', hospitalName, 'staff', staffId);
        const staffDoc = await getDoc(staffRef);
        
        if (staffDoc.exists()) {
            const staffData = staffDoc.data();
            alert(`Staff Details:\nName: ${staffData.name || 'N/A'}\nRole: ${staffData.role || 'N/A'}\nEmail: ${staffData.id || 'N/A'}`);
            // 실제 구현에서는 모달 창이나 상세 페이지로 표시
        } else {
            alert('Staff member not found');
        }
    } catch (error) {
        console.error('Error viewing staff details:', error);
        alert('Error loading staff details');
    }
}

// 스태프 정보 편집 함수
async function editStaffDetails(staffId) {
    alert(`Edit staff with ID: ${staffId}`);
    // 실제 구현에서는 편집 폼이나 페이지로 이동
}

// 오류 메시지 표시 함수
function showErrorMessage() {
    const patientTableBody = document.getElementById('patient-data-body');
    const staffTableBody = document.getElementById('staff-data-body');
    
    if (currentFilter === 'patients') {
        patientTableBody.innerHTML = '<tr><td colspan="8" class="error-message">Error loading data. Please try again.</td></tr>';
    } else {
        staffTableBody.innerHTML = '<tr><td colspan="6" class="error-message">Error loading data. Please try again.</td></tr>';
    }
}

// 창 크기 변경 이벤트 핸들러
let resizeTimeout;
function handleResize() {
    // 디바운싱 적용 (성능 최적화)
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
        const oldItemsPerPage = ITEMS_PER_PAGE;
        calculateItemsPerPage();
        
        // 항목 수가 변경된 경우에만 데이터 다시 표시
        if (oldItemsPerPage !== ITEMS_PER_PAGE && currentData.length > 0) {
            // 현재 페이지가 새로운 총 페이지 수를 초과하는지 확인
            const newTotalPages = Math.ceil(currentData.length / ITEMS_PER_PAGE);
            if (currentPage > newTotalPages) {
                currentPage = newTotalPages || 1; // 페이지 번호 조정
            }
            
            // 데이터 다시 표시
            if (currentFilter === 'patients') {
                displayPatientData(currentData);
            } else {
                displayStaffData(currentData);
            }
            updatePagination(currentData.length);
            
            console.log(`화면 크기 변경으로 데이터 표시 업데이트: 페이지당 ${ITEMS_PER_PAGE}개 항목, 현재 페이지 ${currentPage}/${newTotalPages}`);
        }
    }, 200);
}

// 해상도에 따른 페이지당 항목 수 계산
function calculateItemsPerPage() {
    const displayArea = document.getElementById('data-display-area');
    if (!displayArea) return;
    
    // 테이블 컨테이너의 가용 높이 계산
    const availableHeight = displayArea.clientHeight;
    
    // 행 높이 (CSS에서 정의한 40px)
    const rowHeight = 40;
    
    // 헤더 높이 고려 (대략 50px)
    const headerHeight = 50;
    
    // 가용 공간에 표시할 수 있는 행 수 계산
    const visibleRows = Math.floor((availableHeight - headerHeight) / rowHeight);
    
    // 최소 10개 이상 표시
    const newItemsPerPage = Math.max(visibleRows, MIN_ITEMS_PER_PAGE);
    
    // 항목 수가 변경된 경우에만 업데이트
    if (ITEMS_PER_PAGE !== newItemsPerPage) {
        console.log(`화면 해상도에 맞게 페이지당 항목 수 조정: ${newItemsPerPage} (가용 높이: ${availableHeight}px)`);
        ITEMS_PER_PAGE = newItemsPerPage;
    }
}

// 달력 초기화 함수
function initializeCalendar() {
    const calendarContainer = document.querySelector('.daily-calendar');
    
    // 현재 날짜 정보
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    
    // 달력 헤더 생성
    let calendarHTML = `
        <div class="daily-calendar-header">
            <div class="daily-calendar-nav">
                <button id="prev-month">&lt;</button>
            </div>
            <div class="daily-calendar-month">${getMonthName(currentMonth)} ${currentYear}</div>
            <div class="daily-calendar-nav">
                <button id="next-month">&gt;</button>
            </div>
        </div>
        <div class="daily-calendar-weekdays">
            <div class="daily-calendar-grid">
                <div class="daily-calendar-weekday">Sun</div>
                <div class="daily-calendar-weekday">Mon</div>
                <div class="daily-calendar-weekday">Tue</div>
                <div class="daily-calendar-weekday">Wed</div>
                <div class="daily-calendar-weekday">Thu</div>
                <div class="daily-calendar-weekday">Fri</div>
                <div class="daily-calendar-weekday">Sat</div>
            </div>
        </div>
        <div class="daily-calendar-days daily-calendar-grid" id="calendar-days">
            <!-- 날짜는 renderCalendar 함수에서 동적으로 생성됨 -->
        </div>
    `;
    
    calendarContainer.innerHTML = calendarHTML;
    
    // 날짜 렌더링
    renderCalendar(currentMonth, currentYear);
    
    // 달력 이벤트 리스너 추가
    document.getElementById('prev-month').addEventListener('click', () => {
        const monthYear = document.querySelector('.daily-calendar-month').textContent.split(' ');
        const month = getMonthIndex(monthYear[0]);
        let year = parseInt(monthYear[1]);
        
        if (month === 0) {
            year--;
            renderCalendar(11, year);
        } else {
            renderCalendar(month - 1, year);
        }
    });
    
    document.getElementById('next-month').addEventListener('click', () => {
        const monthYear = document.querySelector('.daily-calendar-month').textContent.split(' ');
        const month = getMonthIndex(monthYear[0]);
        let year = parseInt(monthYear[1]);
        
        if (month === 11) {
            year++;
            renderCalendar(0, year);
        } else {
            renderCalendar(month + 1, year);
        }
    });
}

// 달력 월 이름 구하기
function getMonthName(monthIndex) {
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    return months[monthIndex];
}

// 달력 월 인덱스 구하기
function getMonthIndex(monthName) {
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    return months.indexOf(monthName);
}

// 달력 날짜 렌더링 함수
function renderCalendar(month, year) {
    const calendarDays = document.getElementById('calendar-days');
    const monthYearDisplay = document.querySelector('.daily-calendar-month');
    
    // 월/년 표시 업데이트
    monthYearDisplay.textContent = `${getMonthName(month)} ${year}`;
    
    // 현재 월의 첫 날과 마지막 날
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    // 이전 월의 마지막 날
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    
    // 달력 시작일 (첫 번째 줄의 일요일)
    const startingDayOfWeek = firstDay.getDay(); // 0(일요일)부터 6(토요일)
    
    // 현재 날짜
    const today = new Date();
    const currentDay = today.getDate();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    
    // HTML 생성
    let daysHTML = '';
    
    // 이전 월의 날짜들
    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
        const day = prevMonthLastDay - i;
        daysHTML += `<div class="daily-calendar-day other-month" data-date="${year}-${month === 0 ? 12 : month}-${day}">${day}</div>`;
    }
    
    // 현재 월의 날짜들
    for (let i = 1; i <= lastDay.getDate(); i++) {
        // 날짜 포맷 생성 (dd.Mmm.yyyy)
        const date = new Date(year, month, i);
        const day = String(date.getDate()).padStart(2, '0');
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const monthStr = monthNames[date.getMonth()];
        const yearStr = date.getFullYear();
        const formattedDate = `${day}.${monthStr}.${yearStr}`;
        
        const isToday = i === currentDay && month === currentMonth && year === currentYear;
        const isSelected = selectedDate === formattedDate;
        
        daysHTML += `
            <div class="daily-calendar-day ${isToday ? 'today' : ''} ${isSelected ? 'selected' : ''}" 
                 data-date="${formattedDate}">${i}</div>
        `;
    }
    
    // 다음 월의 날짜들
    const daysAfter = 42 - (startingDayOfWeek + lastDay.getDate());
    for (let i = 1; i <= daysAfter; i++) {
        daysHTML += `<div class="daily-calendar-day other-month" data-date="${year}-${month === 11 ? 1 : month + 2}-${i}">${i}</div>`;
    }
    
    calendarDays.innerHTML = daysHTML;
    
    // 날짜 클릭 이벤트 추가
    document.querySelectorAll('.daily-calendar-day:not(.other-month)').forEach(dayElement => {
        dayElement.addEventListener('click', (e) => {
            // 기존 선택 제거
            document.querySelectorAll('.daily-calendar-day.selected').forEach(el => {
                el.classList.remove('selected');
            });
            
            // 현재 선택 추가
            e.target.classList.add('selected');
            
            // 선택된 날짜 저장
            selectedDate = e.target.dataset.date;
            
            // 병원 이름 가져오기
            const hospitalName = auth.currentUser.email.split('@')[0].split('.')[0];
            
            // 해당 날짜의 환자 데이터 로드
            loadDailyPatientData(hospitalName, selectedDate);
            
            // 달력 닫기
            document.getElementById('daily-calendar-container').style.display = 'none';
            
            console.log(`Selected date: ${selectedDate}`);
        });
    });
}

// 특정 날짜의 환자 데이터 로드 함수
async function loadDailyPatientData(hospitalName, dateStr) {
    const patientTableBody = document.getElementById('patient-data-body');
    patientTableBody.innerHTML = '<tr><td colspan="8" style="text-align: center; padding: 20px;">Loading patient data for ' + dateStr + '...</td></tr>';
    
    // 상단 타이틀에 선택된 날짜 표시
    const contentTitle = document.querySelector('.content-title');
    if (contentTitle) {
        contentTitle.innerHTML = `Hospital Data Center <span style="font-size: 0.9em; color: #0052cc; margin-left: 10px;">(${dateStr})</span>`;
    }
    
    try {
        console.log(`Loading daily patient data for hospital: ${hospitalName}, date: ${dateStr}`);
        
        // dates 컬렉션 참조 (payment, waiting, reservation, complete 통합)
        const paymentRef = collection(db, 'hospitals', hospitalName, 'dates', dateStr, 'payment');
        const waitingRef = collection(db, 'hospitals', hospitalName, 'dates', dateStr, 'waiting');
        const reservationRef = collection(db, 'hospitals', hospitalName, 'dates', dateStr, 'reservation');
        const completeRef = collection(db, 'hospitals', hospitalName, 'dates', dateStr, 'complete');
        
        // 각 컬렉션에서 데이터 가져오기
        const [paymentDocs, waitingDocs, reservationDocs, completeDocs] = await Promise.all([
            getDocs(paymentRef),
            getDocs(waitingRef),
            getDocs(reservationRef),
            getDocs(completeRef)
        ]);
        
        console.log(`Got ${paymentDocs.size} payment, ${waitingDocs.size} waiting, ${reservationDocs.size} reservation, ${completeDocs.size} complete docs`);
        
        // 환자 ID 목록 생성 (중복 제거)
        const patientIds = new Set();
        
        // 각 컬렉션에서 환자 ID 추출 - 문서 ID 전체를 사용
        paymentDocs.forEach(doc => {
            patientIds.add(doc.id);
            console.log(`Added patient ID from payment: ${doc.id}`);
        });
        
        waitingDocs.forEach(doc => {
            patientIds.add(doc.id);
        });
        
        reservationDocs.forEach(doc => {
            patientIds.add(doc.id);
        });
        
        completeDocs.forEach(doc => {
            patientIds.add(doc.id);
        });
        
        console.log(`Found ${patientIds.size} unique patients for date: ${dateStr}`);
        
        if (patientIds.size === 0) {
            patientTableBody.innerHTML = '<tr><td colspan="8" class="no-data-message">No patient records found for this date</td></tr>';
            return;
        }
        
        // 환자 상세 정보 가져오기
        const patientDataPromises = Array.from(patientIds).map(async (patientId) => {
            try {
                console.log(`Fetching patient data for ID: ${patientId}`);
                const patientRef = doc(db, 'hospitals', hospitalName, 'patient', patientId);
                const patientDoc = await getDoc(patientRef);
                
                if (patientDoc.exists()) {
                    console.log(`Found patient document for ID: ${patientId}`);
                    if (patientDoc.data().info) {
                        return {
                            id: patientDoc.id,
                            ...patientDoc.data().info
                        };
                    } else {
                        console.warn(`Patient document exists but no info field for ID: ${patientId}`);
                    }
                } else {
                    console.warn(`No patient document found for ID: ${patientId}`);
                }
                return null;
            } catch (error) {
                console.error(`Error fetching patient data for ID ${patientId}:`, error);
                return null;
            }
        });
        
        // 모든 환자 정보 가져오기 완료 대기
        let patientsData = await Promise.all(patientDataPromises);
        
        // 유효한 환자 데이터만 필터링
        patientsData = patientsData.filter(patient => patient !== null);
        
        // 현재 데이터 저장
        currentData = patientsData;
        
        // 페이지네이션 업데이트
        updatePagination(patientsData.length);
        
        // 현재 페이지 데이터 표시
        displayPatientData(patientsData);
        
        console.log(`Loaded ${patientsData.length} patients for date: ${dateStr}`);
        
    } catch (error) {
        console.error('Error loading daily patient data:', error);
        patientTableBody.innerHTML = `<tr><td colspan="8" class="error-message">Error loading patient data: ${error.message}</td></tr>`;
    }
}

// 필터 변경 시 달력 컨테이너 숨기기
function hideDateCalendar() {
    const calendarContainer = document.getElementById('daily-calendar-container');
    if (calendarContainer) {
        calendarContainer.style.display = 'none';
    }
} 
