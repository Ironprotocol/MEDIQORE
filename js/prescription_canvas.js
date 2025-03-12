// 전역 변수
let canvasCache = {};
let currentResizeHandler = null;

// SVG 관련 변수
let svg = null;
let isDrawing = false;
let isDrawingEnabled = false;
let currentPath = null;
let pathData = [];
let svgPaths = [];

// 전역 캐시 초기화
if (!window.canvasCache) window.canvasCache = {};
if (!window.currentCanvasImageCache) window.currentCanvasImageCache = {};

// SVG 경로 데이터 수집 함수
export function getSVGPathsData() {
    if (!svg) return [];
    
    // SVG 경로 요소 수집
    const paths = svg.selectAll('path').nodes();
    
    // 각 경로의 데이터와 속성을 배열로 변환
    return paths.map(path => ({
        d: path.getAttribute('d'),
        stroke: path.getAttribute('stroke') || '#FF0000',
        strokeWidth: path.getAttribute('stroke-width') || '2',
        fill: path.getAttribute('fill') || 'none',
        vectorEffect: path.getAttribute('vector-effect') || 'non-scaling-stroke'
    }));
}

// SVG 경로 데이터로 그리기 함수
export function drawSVGFromData(pathsData) {
    if (!svg || !pathsData || !Array.isArray(pathsData)) return;
    
    // 기존 경로 제거
    svg.selectAll('path').remove();
    
    // 저장된 경로 데이터로 새 경로 생성
    pathsData.forEach(pathData => {
        svg.append('path')
            .attr('d', pathData.d)
            .attr('stroke', pathData.stroke || '#FF0000')
            .attr('stroke-width', pathData.strokeWidth || '2')
            .attr('fill', pathData.fill || 'none')
            .attr('vector-effect', pathData.vectorEffect || 'non-scaling-stroke');
    });
}

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
    
    // 인쇄용 고정 크기 설정 (화면 크기와 무관하게 일정한 크기로 출력)
    const fixedWidth = 500;  // 고정 너비
    const fixedHeight = 500; // 고정 높이
    
    // 캔버스 크기 설정
    mergedCanvas.width = fixedWidth;
    mergedCanvas.height = fixedHeight;
    
    // 이미지 로딩 및 처리
    const img = new Image();
    img.onload = function() {
        // 배경 이미지(치아 차트) 그리기
        ctx.drawImage(img, 0, 0, fixedWidth, fixedHeight);
        
        // 현재 캔버스의 내용을 가져와서 고정 크기로 그리기
        ctx.drawImage(canvas, 0, 0, canvas.width, canvas.height, 0, 0, fixedWidth, fixedHeight);
        
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

// SVG 초기화 함수
export function initializeSVG() {
    // SVG 요소 선택 또는 생성
    svg = d3.select('.tooth-chart-svg')
        .attr('viewBox', '0 0 1000 1000')
        .attr('preserveAspectRatio', 'xMidYMid meet');
    
    // SVG 요소가 존재하는지 확인
    if (!svg.empty()) {
        // 기존 이벤트 리스너 제거
        svg.on('mousedown', null)
           .on('mousemove', null)
           .on('mouseup', null)
           .on('mouseleave', null);
        
        // 새 이벤트 리스너 추가
        svg.on('mousedown', startDrawing)
           .on('mousemove', draw)
           .on('mouseup', stopDrawing)
           .on('mouseleave', stopDrawing);
        
        // 기본적으로 그리기 비활성화
        disableDrawing();
    } else {
        console.error('SVG 요소를 찾을 수 없습니다');
    }
}

// SVG 그리기 활성화 함수
export function enableDrawing() {
    isDrawingEnabled = true;
    
    // SVG 요소가 마우스 이벤트를 수신할 수 있도록 설정
    d3.select('.tooth-chart-svg')
        .style('pointer-events', 'all')
        .style('cursor', 'crosshair');
}

// SVG 그리기 비활성화 함수
export function disableDrawing() {
    isDrawingEnabled = false;
    
    // SVG 요소가 마우스 이벤트를 수신하지 않도록 설정
    d3.select('.tooth-chart-svg')
        .style('pointer-events', 'none')
        .style('cursor', 'default');
}

// 마우스 위치를 SVG 좌표로 변환하는 함수
function getMousePosition(event) {
    const svgElement = d3.select('.tooth-chart-svg').node();
    if (!svgElement) return { x: 0, y: 0 };
    
    const rect = svgElement.getBoundingClientRect();
    
    // 뷰포트 좌표를 SVG 좌표로 변환
    const x = ((event.clientX - rect.left) / rect.width) * 1000;
    const y = ((event.clientY - rect.top) / rect.height) * 1000;
    
    return { x, y };
}

// 그리기 시작 함수
function startDrawing(event) {
    if (!isDrawingEnabled) return;
    
    isDrawing = true;
    const pos = getMousePosition(event);
    
    // 경로 데이터 초기화
    pathData = [`M ${pos.x} ${pos.y}`];
    
    // 새 경로 요소 생성
    currentPath = svg.append('path')
        .attr('stroke', '#FF0000')
        .attr('stroke-width', 2)
        .attr('fill', 'none')
        .attr('vector-effect', 'non-scaling-stroke');
}

// 그리기 함수
function draw(event) {
    if (!isDrawingEnabled || !isDrawing || !currentPath) return;
    
    const pos = getMousePosition(event);
    pathData.push(`L ${pos.x} ${pos.y}`);
    currentPath.attr('d', pathData.join(' '));
}

// 그리기 중지 함수
function stopDrawing() {
    if (!isDrawingEnabled || !isDrawing) return;
    
    // 그리기 완료 시 현재 경로 저장
    if (currentPath && pathData.length > 1) {  // 1보다 커야 시작점 외에 다른 점이 있는 것
        // 현재 경로 정보 저장
        svgPaths.push({
            d: pathData.join(' '),
            stroke: '#FF0000',
            strokeWidth: 2,
            fill: 'none',
            vectorEffect: 'non-scaling-stroke'
        });
    }
    
    isDrawing = false;
    currentPath = null;
}

// SVG 초기화 함수
export function clearSVG() {
    if (!svg) return;
    
    // 모든 경로 요소 삭제
    svg.selectAll('path').remove();
    
    // 경로 기록 초기화
    svgPaths = [];
}

// 단순화된 실행 취소 함수
export function undoSVG() {
    // 경로가 없으면 종료
    if (svgPaths.length === 0) return;
    
    // 가장 마지막에 그린 경로 제거
    svgPaths.pop();
    
    // 현재 모든 경로 제거
    svg.selectAll('path').remove();
    
    // 남은 경로 다시 그리기
    svgPaths.forEach(path => {
        svg.append('path')
            .attr('d', path.d)
            .attr('stroke', path.stroke)
            .attr('stroke-width', path.strokeWidth)
            .attr('fill', path.fill)
            .attr('vector-effect', path.vectorEffect);
    });
}

// 컨트롤 버튼 추가
function addControlButtons() {
    // 기존 컨트롤 버튼들 제거
    const existingControls = document.querySelector('.chart-controls');
    if (existingControls) {
        existingControls.remove();
    }

    // 새로운 컨트롤 버튼 추가
    const controlsDiv = document.createElement('div');
    controlsDiv.className = 'chart-controls';
    controlsDiv.innerHTML = `
        <button class="undo-btn">Undo</button>
    `;
    
    const container = document.querySelector('.prescription-center-top');
    if (container) {
        container.appendChild(controlsDiv);
        
        // 이벤트 리스너 설정 - 직접 버튼 요소 가져오기
        const undoBtn = controlsDiv.querySelector('.undo-btn');
        if (undoBtn) {
            // 이벤트 리스너 중복 등록 방지를 위해 기존 리스너 제거 
            undoBtn.replaceWith(undoBtn.cloneNode(true));
            
            // 새 버튼 요소 다시 가져오기
            const newUndoBtn = document.querySelector('.chart-controls .undo-btn');
            // 새 이벤트 리스너 등록 - 직접 undoSVG 함수 호출
            if (newUndoBtn) {
                newUndoBtn.addEventListener('click', undoSVG);
            }
        }
    }
}

// Canvas 관련 기능 초기화
export function initializeCanvas(currentPatientId, currentRegisterDate) {
    // SVG 초기화
    initializeSVG();
    disableDrawing();
    
    // 컨트롤 버튼 추가
    addControlButtons();
    
    const canvas = document.querySelector('.tooth-chart-canvas');
    if (!canvas) {
        console.error('캔버스 요소를 찾을 수 없습니다');
        return;
    }
    
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    let isDrawing = false;
    let lastX = 0;
    let lastY = 0;
    
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