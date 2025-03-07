import { auth, db, collection, query, getDocs, doc, getDoc, onSnapshot } from './firebase-config.js';
import { openEditPatientModal } from './patient-edit.js';
import { openViewPatientModal } from './patient-view.js';

// 페이지네이션 설정
let ITEMS_PER_PAGE = 10; // 변수로 변경하여 동적 조정 가능하게 함
const MIN_ITEMS_PER_PAGE = 10; // 최소 항목 수
let currentPage = 1;
let totalPages = 1;
let currentData = [];
let currentFilter = 'patients';

// 구독 해제 함수 저장
let unsubscribePatients = null;
let unsubscribeStaff = null;

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
            loadData();
        });
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
        } else {
            // 스태프 테이블 표시, 환자 테이블 숨김
            document.getElementById('patient-data-table').style.display = 'none';
            document.getElementById('staff-data-table').style.display = 'table';
            
            // 스태프 데이터 로드 (실시간)
            loadStaffDataRealtime(hospitalName);
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
    // 모달 열기 함수 호출
    await openEditPatientModal(patientId);
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
