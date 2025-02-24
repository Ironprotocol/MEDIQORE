import { auth, db, doc, getDoc } from './firebase-config.js';

// Prescription 컨테이너 초기화
export function initializePrescription() {
    const prescriptionTitle = document.querySelector('#prescription-content .content-title-prescription');
    const patientSelectWrapper = document.querySelector('#prescription-content .patient-select-wrapper');
    const prescriptionBody = document.querySelector('#prescription-content .content-body-prescription');
    const prescriptionBody2 = document.querySelector('#prescription-content .content-body-prescription2');
    const prescriptionFooter = document.querySelector('#prescription-content .content-footer-prescription');

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

    // Room의 환자 클릭 이벤트에 대한 처리
    document.addEventListener('prescriptionPatientSelected', (e) => {
        const { name, gender, birthDate, age } = e.detail;
        
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

        // Canvas 초기화 추가
        initializeCanvas();
    });

    // content-footer-prescription에 Send 버튼 추가
    const sendBtn = document.createElement('button');
    sendBtn.className = 'send-btn';
    sendBtn.textContent = 'Send';
    document.querySelector('.content-footer-prescription').appendChild(sendBtn);

    // Send 버튼 추가 코드 위에 추가
    const printBtn = document.createElement('button');
    printBtn.className = 'print-btn';
    document.querySelector('.content-footer-prescription').appendChild(printBtn);

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
        
        // Canvas의 표시 크기와 실제 크기를 일치시킴
        canvas.style.width = `${rect.width}px`;
        canvas.style.height = `${rect.height}px`;
        canvas.width = rect.width;
        canvas.height = rect.height;
        
        // 컨텍스트 설정 복원
        ctx.strokeStyle = '#FF0000';
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        
        // 이전 그림 복원
        if (drawHistory.length > 0) {
            ctx.putImageData(drawHistory[drawHistory.length - 1], 0, 0);
        }
    }

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
                e.preventDefault();
                if (selectedIndex >= 0 && items[selectedIndex]) {
                    addItemFunction(items[selectedIndex].textContent);
                    selectedIndex = -1;
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
