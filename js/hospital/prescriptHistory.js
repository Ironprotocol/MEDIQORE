import { auth, db, collection, query, orderBy, getDocs } from '../firebase-config.js';

// 전역 변수 선언
let currentPage = 1;
let allHistoryItems = [];
let itemsPerPage = 7; // 기본값, 화면 크기에 따라 조정됨

export async function initializePrescriptionHistory(patientId) {
    const historyContainer = document.querySelector('.prescription-left-container');
    const titleElement = historyContainer.querySelector('.prescription-left-title');
    
    // 컨테이너 내부를 비우고 타이틀만 다시 추가
    historyContainer.innerHTML = '';
    historyContainer.appendChild(titleElement);
    
    // 페이지네이션 컨트롤 컨테이너 추가
    const paginationContainer = document.createElement('div');
    paginationContainer.className = 'prescription-pagination-controls';
    
    // 푸터에 페이지네이션 컨트롤 추가
    const footer = document.querySelector('.content-footer-prescription');
    if (!footer.querySelector('.prescription-pagination-controls')) {
        footer.appendChild(paginationContainer);
    }
    
    const [hospitalName] = auth.currentUser.email.split('@')[0].split('.');

    // 환자의 처방전 기록 가져오기
    const registerDateRef = collection(db, 'hospitals', hospitalName, 'patient', patientId, 'register.date');
    const q = query(registerDateRef, orderBy('timestamp', 'desc'));
    const snapshot = await getDocs(q);
    
    // 모든 히스토리 아이템 저장
    allHistoryItems = [];
    
    snapshot.forEach(doc => {
        const data = doc.data();
        if (data.prescription) {  // prescription 필드가 있는 경우만 표시
            const prescriptionDate = doc.id.split('_')[0];  // YYYY.MM.DD 형식
            const daysBefore = calculateDaysBefore(prescriptionDate);
            const ccList = data.prescription.cc.join(', ');

            // 히스토리 아이템 데이터 저장
            allHistoryItems.push({
                html: `
                    <div class="record-date">${prescriptionDate} <span>(${daysBefore})</span></div>
                    <div class="record-doctor">Doctor : ${data.doctor || 'Unknown'}</div>
                    <div class="record-cc">CC : ${ccList}</div>
                `,
                data: {
                    prescriptionData: data.prescription,
                    registerDate: doc.id,
                    doctor: data.doctor,
                    timestamp: data.timestamp,
                    chartImage: data.chartImage,
                    patientId: patientId
                }
            });
        }
    });
    
    // 화면 크기에 따라 페이지당 아이템 수 계산
    calculateItemsPerPage();
    
    // 첫 페이지 표시
    currentPage = 1;
    displayHistoryItems();
    
    // 페이지네이션 컨트롤 업데이트
    updatePaginationControls();
    
    // 윈도우 크기 변경 시 페이지당 아이템 수 재계산
    window.addEventListener('resize', () => {
        const oldItemsPerPage = itemsPerPage;
        calculateItemsPerPage();
        
        // 아이템 수가 변경된 경우에만 다시 표시
        if (oldItemsPerPage !== itemsPerPage) {
            displayHistoryItems();
            updatePaginationControls();
        }
    });
}

// 화면 크기에 따라 페이지당 아이템 수 계산
function calculateItemsPerPage() {
    const container = document.querySelector('.prescription-left-container');
    if (!container) return;
    
    const containerHeight = container.clientHeight;
    const titleHeight = container.querySelector('.prescription-left-title')?.clientHeight || 0;
    const availableHeight = containerHeight - titleHeight - 20; // 여백 고려
    
    // 아이템 하나의 평균 높이 (마진 포함)
    const itemHeight = 89; 
    
    // 화면에 표시할 수 있는 아이템 수 계산
    const calculatedItems = Math.floor(availableHeight / itemHeight);
    
    // 최소 3개, 최대 10개로 제한
    itemsPerPage = Math.max(3, Math.min(calculatedItems, 10));
}

// 현재 페이지에 해당하는 히스토리 아이템 표시
function displayHistoryItems() {
    const historyContainer = document.querySelector('.prescription-left-container');
    const titleElement = historyContainer.querySelector('.prescription-left-title');
    
    // 타이틀 제외한 모든 아이템 제거
    const items = historyContainer.querySelectorAll('.prescript-history-record');
    items.forEach(item => item.remove());
    
    // 현재 페이지에 해당하는 아이템 계산
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = Math.min(startIndex + itemsPerPage, allHistoryItems.length);
    
    // 현재 페이지 아이템 표시
    for (let i = startIndex; i < endIndex; i++) {
        const item = allHistoryItems[i];
        const historyItem = document.createElement('div');
        historyItem.className = 'prescript-history-record';
        historyItem.innerHTML = item.html;
        
        // 클릭 이벤트 추가
        historyItem.addEventListener('click', () => {
            // UI 선택 효과
            const selectedItem = historyContainer.querySelector('.prescript-history-record.selected');
            if (selectedItem) {
                selectedItem.classList.remove('selected');
            }
            historyItem.classList.add('selected');
            
            // 처방전 데이터를 이벤트와 함께 전달
            const event = new CustomEvent('prescriptionHistorySelected', {
                detail: item.data
            });
            document.dispatchEvent(event);
        });
        
        // 타이틀 바로 다음에 추가
        historyContainer.appendChild(historyItem);
    }
}

// 페이지네이션 컨트롤 업데이트
function updatePaginationControls() {
    const paginationContainer = document.querySelector('.prescription-pagination-controls');
    if (!paginationContainer) return;
    
    // 총 페이지 수 계산
    const totalPages = Math.ceil(allHistoryItems.length / itemsPerPage);
    
    // 페이지가 1개 이하면 페이지네이션 숨김
    if (totalPages <= 1) {
        paginationContainer.style.display = 'none';
        return;
    } else {
        paginationContainer.style.display = 'flex';
    }
    
    // 페이지네이션 컨트롤 초기화
    paginationContainer.innerHTML = '';
    
    // 이전 버튼
    if (currentPage > 1) {
        const prevButton = document.createElement('button');
        prevButton.className = 'prescription-pagination-btn';
        prevButton.textContent = '<';
        prevButton.addEventListener('click', () => {
            currentPage--;
            displayHistoryItems();
            updatePaginationControls();
        });
        paginationContainer.appendChild(prevButton);
    }
    
    // 페이지 번호 버튼 (최대 3개만 표시)
    let startPage = Math.max(1, currentPage - 1);
    let endPage = Math.min(startPage + 2, totalPages);
    
    // 3개 버튼이 안 되는 경우 조정
    if (endPage - startPage < 2) {
        startPage = Math.max(1, endPage - 2);
    }
    
    for (let i = startPage; i <= endPage; i++) {
        const pageButton = document.createElement('button');
        pageButton.className = 'prescription-pagination-btn';
        if (i === currentPage) {
            pageButton.classList.add('active');
        }
        pageButton.textContent = i;
        pageButton.addEventListener('click', () => {
            currentPage = i;
            displayHistoryItems();
            updatePaginationControls();
        });
        paginationContainer.appendChild(pageButton);
    }
    
    // 다음 버튼
    if (currentPage < totalPages) {
        const nextButton = document.createElement('button');
        nextButton.className = 'prescription-pagination-btn';
        nextButton.textContent = '>';
        nextButton.addEventListener('click', () => {
            currentPage++;
            displayHistoryItems();
            updatePaginationControls();
        });
        paginationContainer.appendChild(nextButton);
    }
}

function calculateDaysBefore(dateStr) {
    const [day, month, year] = dateStr.split('.');
    const prescriptionDate = new Date(year, months.indexOf(month), parseInt(day));
    const today = new Date();
    const diffTime = Math.abs(today - prescriptionDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return `${diffDays}d ago`;  // 0d ago, 1d ago, 2d ago 형식으로 변경
}

const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
