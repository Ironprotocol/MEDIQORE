// Prescription 컨테이너 초기화
export function initializePrescription() {
    const prescriptionTitle = document.querySelector('#prescription-content .content-title-prescription');
    const patientSelectWrapper = document.querySelector('#prescription-content .patient-select-wrapper');
    const prescriptionBody = document.querySelector('#prescription-content .content-body-prescription');
    const prescriptionBody2 = document.querySelector('#prescription-content .content-body-prescription2');
    const prescriptionFooter = document.querySelector('#prescription-content .content-footer-prescription');

    // Room의 환자 클릭 이벤트에 대한 처리
    document.addEventListener('prescriptionPatientSelected', (e) => {
        const { name, age } = e.detail;
        if (prescriptionTitle) {
            prescriptionTitle.textContent = `${name} Prescription`;
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
    const drawHistory = [];  // 그리기 기록 저장
    
    // Canvas 크기 설정
    const img = document.querySelector('.tooth-chart-img');
    canvas.width = img.width;
    canvas.height = img.height;

    // 그리기 설정
    ctx.strokeStyle = '#FF0000';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';

    // 컨트롤 버튼 추가
    const controlsDiv = document.createElement('div');
    controlsDiv.className = 'chart-controls';
    controlsDiv.innerHTML = `
        <button class="undo-btn">Undo</button>
        <button class="clear-btn">Clear</button>
    `;
    document.querySelector('.prescription-center-top').appendChild(controlsDiv);

    // 버튼 이벤트 리스너
    document.querySelector('.undo-btn').addEventListener('click', undo);
    document.querySelector('.clear-btn').addEventListener('click', clearCanvas);

    // 마우스 이벤트
    canvas.addEventListener('mousedown', startDrawing);
    canvas.addEventListener('mouseup', stopDrawing);
    canvas.addEventListener('mouseleave', stopDrawing);
    canvas.addEventListener('mousemove', draw);

    function startDrawing(e) {
        isDrawing = true;
        [lastX, lastY] = [e.offsetX, e.offsetY];
        // 새로운 선 시작시 현재 캔버스 상태 저장
        drawHistory.push(ctx.getImageData(0, 0, canvas.width, canvas.height));
    }

    function stopDrawing() {
        isDrawing = false;
    }

    function draw(e) {
        if (!isDrawing) return;
        ctx.beginPath();
        ctx.moveTo(lastX, lastY);
        ctx.lineTo(e.offsetX, e.offsetY);
        ctx.stroke();
        [lastX, lastY] = [e.offsetX, e.offsetY];
    }

    function undo() {
        if (drawHistory.length > 0) {
            ctx.putImageData(drawHistory.pop(), 0, 0);
        }
    }

    function clearCanvas() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        drawHistory.length = 0;  // 히스토리 초기화
    }
}
