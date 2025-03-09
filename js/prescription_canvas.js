// 전역 변수
let canvasCache = {};
let currentResizeHandler = null;

// 전역 캐시 초기화
if (!window.canvasCache) window.canvasCache = {};
if (!window.currentCanvasImageCache) window.currentCanvasImageCache = {};

// 이벤트 리스너 설정 - prescription.js에서 전송된 이벤트 처리
document.addEventListener('loadChartImage', function(e) {
    const { patientId, registerDate, chartImage } = e.detail;
    
    const canvas = document.querySelector('.tooth-chart-canvas');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    
    // 기존의 모든 리사이즈 이벤트 리스너 제거
    if (window.chartResizeListener) {
        window.removeEventListener('resize', window.chartResizeListener);
        window.chartResizeListener = null;
    }
    
    // 기존 마우스 이벤트 리스너 제거
    if (window.canvasMouseDownHandler) {
        canvas.removeEventListener('mousedown', window.canvasMouseDownHandler);
    }
    if (window.canvasMouseUpHandler) {
        canvas.removeEventListener('mouseup', window.canvasMouseUpHandler);
    }
    if (window.canvasMouseLeaveHandler) {
        canvas.removeEventListener('mouseleave', window.canvasMouseLeaveHandler);
    }
    if (window.canvasMouseMoveHandler) {
        canvas.removeEventListener('mousemove', window.canvasMouseMoveHandler);
    }
    
    // 컨텍스트 초기화
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // 현재 환자와 registerDate로 고유 캐시 키 생성
    const cacheKey = `${patientId}_${registerDate}`;
    
    // 이미지가 있으면 캔버스에 로드
    if (chartImage) {
        // 이전에 저장된 이미지가 있으면 제거
        if (window.currentCanvasImageCache) {
            window.currentCanvasImageCache[cacheKey] = null;
        } else {
            window.currentCanvasImageCache = {};
        }
        
        const img = new Image();
        
        img.onload = function() {
            // 원본 이미지 크기 저장 (비율 유지를 위해)
            const originalSize = {
                width: img.width,
                height: img.height
            };
            
            // 현재 선택된 환자 ID와 차트 이미지를 캐시에 저장
            // registerDate도 같이 저장하여 동일 환자의 다른 처방전 구분
            window.currentCanvasImage = {
                patientId: patientId,
                registerDate: registerDate,
                image: chartImage,
                originalSize: originalSize
            };
            
            // 캐시에도 저장
            window.currentCanvasImageCache[cacheKey] = window.currentCanvasImage;
            
            // 이미지가 로드된 후 캔버스 크기 조정
            if (canvas.offsetWidth > 0 && canvas.offsetHeight > 0) {
                const canvasWidth = canvas.offsetWidth;
                const canvasHeight = canvas.offsetHeight;
                
                canvas.width = canvasWidth;
                canvas.height = canvasHeight;
                
                // 이미지를 캔버스 크기에 맞게 그리기
                try {
                    ctx.clearRect(0, 0, canvasWidth, canvasHeight);
                    ctx.drawImage(img, 0, 0, canvasWidth, canvasHeight);
                } catch (e) {
                    console.error('이미지 로드 후 드로잉 오류:', e);
                }
            }
        };
        
        img.onerror = function() {
            console.error('차트 이미지 로드 실패:', chartImage.substring(0, 50) + '...');
        };
        
        // 이미지 로드 시작
        img.src = chartImage;
        
        // 리사이즈 핸들러 함수 정의 - 환자와 등록 날짜 확인 로직 추가
        const resizeHandler = function() {
            // 현재 표시된 환자와 등록 날짜 확인
            if (!canvas) return;
            
            // 캐시 키에 해당하는 이미지가 있는지 확인
            const cachedImage = window.currentCanvasImageCache[cacheKey];
            
            // 캐시된 이미지가 없거나 다른 환자/등록일자의 이미지면 리사이징 안함
            if (!cachedImage || 
                cachedImage.patientId !== patientId || 
                cachedImage.registerDate !== registerDate) {
                return;
            }
            
            // 새 이미지 객체 생성 (캐싱 문제 방지)
            const newImg = new Image();
            newImg.onload = function() {
                if (canvas.offsetWidth > 0 && canvas.offsetHeight > 0) {
                    const canvasWidth = canvas.offsetWidth;
                    const canvasHeight = canvas.offsetHeight;
                    
                    canvas.width = canvasWidth;
                    canvas.height = canvasHeight;
                    
                    try {
                        ctx.clearRect(0, 0, canvasWidth, canvasHeight);
                        ctx.drawImage(newImg, 0, 0, canvasWidth, canvasHeight);
                    } catch (e) {
                        console.error('리사이즈 중 캔버스 그리기 오류:', e);
                    }
                }
            };
            
            // 캐시된 이미지 사용
            newImg.src = cachedImage.image;
        };
        
        // 리사이즈 이벤트 리스너 등록
        window.chartResizeListener = resizeHandler;
        window.addEventListener('resize', window.chartResizeListener);
    }
});

// 프린트를 위한 차트 이미지 생성 이벤트 리스너
document.addEventListener('getChartImageForPrint', function(e) {
    const { callback } = e.detail;
    
    const canvas = document.querySelector('.tooth-chart-canvas');
    const toothImg = document.querySelector('.tooth-chart-img');
    
    if (!canvas || !toothImg) {
        callback(null);
        return;
    }
    
    // 새 캔버스 생성하여 치아 이미지와 캔버스 내용 합성
    const mergedCanvas = document.createElement('canvas');
    const ctx = mergedCanvas.getContext('2d');
    
    // 캔버스 크기 설정
    mergedCanvas.width = canvas.width;
    mergedCanvas.height = canvas.height;
    
    // 이미지 로딩 및 처리
    const img = new Image();
    img.onload = function() {
        // 배경 이미지(치아 차트) 그리기
        ctx.drawImage(img, 0, 0, mergedCanvas.width, mergedCanvas.height);
        
        // 그 위에 캔버스 내용 그리기
        ctx.drawImage(canvas, 0, 0);
        
        // 차트 이미지를 데이터 URL로 변환
        const chartImage = mergedCanvas.toDataURL('image/png');
        
        // 콜백으로 이미지 데이터 전달
        callback(chartImage);
    };
    
    img.onerror = function() {
        console.error('치아 이미지 로드 실패');
        callback(null);
    };
    
    // 치아 이미지 로드
    img.src = toothImg.src;
});

// Canvas 관련 기능 초기화
export function initializeCanvas(currentPatientId, currentRegisterDate) {
    const canvas = document.querySelector('.tooth-chart-canvas');
    if (!canvas) {
        console.error('캔버스 요소를 찾을 수 없습니다');
        return;
    }
    
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    let isDrawing = false;
    let lastX = 0;
    let lastY = 0;
    const drawHistory = [];

    // 처방전 ID 생성 (환자ID와 등록 날짜 조합)
    const prescriptionId = `${currentPatientId}_${currentRegisterDate}`;
    
    // 현재 환자 정보 저장
    window.currentCanvasPatient = {
        patientId: currentPatientId || 'unknown',
        registerDate: currentRegisterDate || 'unknown'
    };
    
    // 캐시 키 생성
    const cacheKey = prescriptionId;
    
    // 이전 캐시된 이미지 모두 제거 (다른 환자의 이미지)
    if (window.currentCanvasImageCache && window.currentCanvasImageCache[cacheKey]) {
        // 현재 환자/등록일자의 이미지만 유지, 나머지는 초기화
        const currentCache = window.currentCanvasImageCache[cacheKey];
        window.currentCanvasImageCache = {};
        window.currentCanvasImageCache[cacheKey] = currentCache;
    } else {
        // 캐시가 없으면 초기화
        window.currentCanvasImageCache = {};
    }
    
    // 폼이 없을 때만 생성
    if (!document.querySelector('.symptoms-form')) {
        createForms();
    }

    // Canvas 초기화
    function clearCanvas() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        drawHistory.length = 0;
        
        // 캐시된 이미지 삭제
        window.currentCanvasImageCache[cacheKey] = null;
        window.currentCanvasImage = null;
        
        // 캔버스 설정 명시적 초기화
        ctx.strokeStyle = '#FF0000';
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        
        // 입력 폼 초기화
        document.querySelector('.symptoms-input').value = '';
        document.querySelector('.location-input').value = '';
        document.querySelector('.treatment-details-input').value = '';
    }
    
    // Canvas 초기화 실행
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
    
    // 이벤트 리스너 등록 전에 기존 리스너 제거
    function removeOldListeners() {
        if (window.canvasMouseDownHandler) {
            canvas.removeEventListener('mousedown', window.canvasMouseDownHandler);
        }
        if (window.canvasMouseUpHandler) {
            canvas.removeEventListener('mouseup', window.canvasMouseUpHandler);
        }
        if (window.canvasMouseLeaveHandler) {
            canvas.removeEventListener('mouseleave', window.canvasMouseLeaveHandler);
        }
        if (window.canvasMouseMoveHandler) {
            canvas.removeEventListener('mousemove', window.canvasMouseMoveHandler);
        }
    }
    removeOldListeners();

    // Canvas 크기 조정 함수
    function resizeCanvas() {
        const img = document.querySelector('.tooth-chart-img');
        if (!img) {
            console.error('치아 차트 이미지를 찾을 수 없습니다');
            return;
        }
        
        const rect = img.getBoundingClientRect();
        if (rect.width <= 0 || rect.height <= 0) {
            console.warn('치아 차트 이미지의 크기가 유효하지 않습니다', rect);
            return;
        }
        
        // 현재 환자와 registerDate로 고유 캐시 키 생성
        const cacheKey = prescriptionId;
        
        // 캔버스 내용을 임시로 dataURL로 저장
        let tempDataURL = null;
        try {
            if (canvas.width > 0 && canvas.height > 0) {
                tempDataURL = canvas.toDataURL('image/png');
            }
        } catch (e) {
            console.error('캔버스 내용 저장 오류:', e);
        }
        
        // Canvas 크기 조정
        const oldWidth = canvas.width;
        const oldHeight = canvas.height;
        canvas.style.width = `${rect.width}px`;
        canvas.style.height = `${rect.height}px`;
        canvas.width = rect.width;
        canvas.height = rect.height;
        
        // 컨텍스트 설정
        ctx.strokeStyle = '#FF0000';
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        
        // 리사이징 로직 개선
        // 1. 캐시에 저장된 이미지가 있는지 확인
        if (window.currentCanvasImageCache && window.currentCanvasImageCache[cacheKey]) {
            const cachedImage = window.currentCanvasImageCache[cacheKey];
            
            // 현재 환자/등록일자와 일치하는지 확인
            if (cachedImage && 
                cachedImage.patientId === currentPatientId && 
                cachedImage.registerDate === currentRegisterDate) {
                
                const img = new Image();
                img.onload = () => {
                    try {
                        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                    } catch (e) {
                        console.error('캐시 이미지 그리기 오류:', e);
                    }
                };
                img.src = cachedImage.image;
                return; // 캐시된 이미지 그리기 성공하면 종료
            }
        }
        
        // 2. 임시 저장한 캔버스 내용이 있으면 복원
        if (tempDataURL) {
            const img = new Image();
            img.onload = () => {
                try {
                    // 원본 비율 유지하면서 그리기
                    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                    
                    // 현재 환자/등록일자로 캐시 업데이트
                    window.currentCanvasImageCache[cacheKey] = {
                        patientId: currentPatientId,
                        registerDate: currentRegisterDate,
                        image: tempDataURL,
                        originalSize: {
                            width: oldWidth,
                            height: oldHeight
                        }
                    };
                } catch (e) {
                    console.error('임시 이미지 복원 오류:', e);
                }
            };
            img.src = tempDataURL;
        }
    }
    
    // 기존 리사이즈 리스너 제거 후 새로 등록
    if (window.canvasResizeHandler) {
        window.removeEventListener('resize', window.canvasResizeHandler);
    }
    window.canvasResizeHandler = resizeCanvas;
    window.addEventListener('resize', window.canvasResizeHandler);

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
        
        try {
            if (canvas.width > 0 && canvas.height > 0) {
                drawHistory.push(ctx.getImageData(0, 0, canvas.width, canvas.height));
            }
        } catch (e) {
            console.error('캔버스 getImageData 오류:', e);
        }
        
        // 그림을 그리면 이 환자의 캐시된 이미지 초기화 (새 그림이므로)
        const cacheKey = prescriptionId;
        window.currentCanvasImageCache[cacheKey] = null;
        window.currentCanvasImage = null;
    }

    function stopDrawing() {
        if (isDrawing) {
            isDrawing = false;
            
            // 드로잉 멈출 때 현재 캔버스 상태 캐시에 저장
            try {
                if (canvas.width > 0 && canvas.height > 0) {
                    const cacheKey = prescriptionId;
                    window.currentCanvasImageCache[cacheKey] = {
                        patientId: currentPatientId,
                        registerDate: currentRegisterDate,
                        image: canvas.toDataURL('image/png'),
                        originalSize: {
                            width: canvas.width,
                            height: canvas.height
                        }
                    };
                }
            } catch (e) {
                console.error('드로잉 완료 후 캐시 저장 오류:', e);
            }
        }
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
            try {
                ctx.putImageData(drawHistory.pop(), 0, 0);
                
                // undo 후 캐시 업데이트
                if (canvas.width > 0 && canvas.height > 0) {
                    const cacheKey = prescriptionId;
                    window.currentCanvasImageCache[cacheKey] = {
                        patientId: currentPatientId,
                        registerDate: currentRegisterDate,
                        image: canvas.toDataURL('image/png'),
                        originalSize: {
                            width: canvas.width,
                            height: canvas.height
                        }
                    };
                }
            } catch (e) {
                console.error('Undo 작업 중 오류:', e);
            }
        }
    }

    // 새 이벤트 리스너 등록 및 전역으로 저장
    window.canvasMouseDownHandler = startDrawing;
    window.canvasMouseUpHandler = stopDrawing;
    window.canvasMouseLeaveHandler = stopDrawing;
    window.canvasMouseMoveHandler = draw;
    
    canvas.addEventListener('mousedown', window.canvasMouseDownHandler);
    canvas.addEventListener('mouseup', window.canvasMouseUpHandler);
    canvas.addEventListener('mouseleave', window.canvasMouseLeaveHandler);
    canvas.addEventListener('mousemove', window.canvasMouseMoveHandler);

    // tooth chart 크기에 따라 입력폼 너비 조정
    function updateFormWidth() {
        const chartImg = document.querySelector('.tooth-chart-img');
        if (!chartImg) {
            console.warn('치아 차트 이미지를 찾을 수 없습니다');
            return;
        }
        
        const chartWidth = chartImg.offsetWidth;
        if (chartWidth > 0) {
            document.documentElement.style.setProperty('--chart-width', `${chartWidth}px`);
            
            // 상단 폼들의 전체 높이 계산 (margin 포함)
            const symptomsForm = document.querySelector('.symptoms-form');
            const locationForm = document.querySelector('.location-form');
            
            if (symptomsForm && locationForm) {
                const symptomsHeight = symptomsForm.offsetHeight;
                const locationHeight = locationForm.offsetHeight;
                const totalUpperHeight = symptomsHeight + locationHeight + 65;  // Medical Records 타이틀(50px) + 하단 여백(15px) 포함
                
                document.documentElement.style.setProperty('--upper-forms-height', `${totalUpperHeight}px`);
            }
        }
    }

    // 기존 폼 리사이즈 리스너 제거 후 재설정
    if (window.formResizeHandler) {
        window.removeEventListener('resize', window.formResizeHandler);
    }
    window.formResizeHandler = updateFormWidth;
    window.addEventListener('resize', window.formResizeHandler);
    
    // 초기 설정
    updateFormWidth();
    
    // 초기 사이즈 설정 - requestAnimationFrame 사용하여 DOM이 업데이트된 후 실행
    requestAnimationFrame(() => {
        try {
            resizeCanvas();
        } catch (e) {
            console.error('초기 캔버스 크기 조정 중 오류:', e);
        }
    });
}

// 캔버스 지우기 함수
export function clearCanvas(canvas) {
    if (!canvas) {
        canvas = document.querySelector('.tooth-chart-canvas');
        if (!canvas) return;
    }
    
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
}

// 폼 생성 함수
export function createForms() {
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

// 캔버스 관련 이벤트 리스너 제거 유틸리티 함수
export function removeCanvasListeners() {
    const canvas = document.querySelector('.tooth-chart-canvas');
    if (!canvas) return;
    
    if (window.canvasMouseDownHandler) {
        canvas.removeEventListener('mousedown', window.canvasMouseDownHandler);
    }
    if (window.canvasMouseUpHandler) {
        canvas.removeEventListener('mouseup', window.canvasMouseUpHandler);
    }
    if (window.canvasMouseLeaveHandler) {
        canvas.removeEventListener('mouseleave', window.canvasMouseLeaveHandler);
    }
    if (window.canvasMouseMoveHandler) {
        canvas.removeEventListener('mousemove', window.canvasMouseMoveHandler);
    }
    
    if (window.canvasResizeHandler) {
        window.removeEventListener('resize', window.canvasResizeHandler);
        window.canvasResizeHandler = null;
    }
    
    if (window.formResizeHandler) {
        window.removeEventListener('resize', window.formResizeHandler);
        window.formResizeHandler = null;
    }
    
    if (window.chartResizeListener) {
        window.removeEventListener('resize', window.chartResizeListener);
        window.chartResizeListener = null;
    }
}

// 전체 캔버스 캐시 초기화 함수
export function clearCanvasCache() {
    window.currentCanvasImage = null;
    window.currentCanvasImageCache = {};
}
