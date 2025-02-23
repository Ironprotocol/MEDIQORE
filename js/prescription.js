// Prescription 컨테이너 초기화
export function initializePrescription() {
    const prescriptionTitle = document.querySelector('#prescription-content .content-title-prescription');
    const patientSelectWrapper = document.querySelector('#prescription-content .patient-select-wrapper');
    const prescriptionBody = document.querySelector('#prescription-content .content-body-prescription');
    const prescriptionBody2 = document.querySelector('#prescription-content .content-body-prescription2');
    const prescriptionFooter = document.querySelector('#prescription-content .content-footer-prescription');

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

    // 기존 symptoms 폼이 있다면 제거
    const existingForm = document.querySelector('.symptoms-form');
    if (existingForm) {
        existingForm.remove();
    }

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
