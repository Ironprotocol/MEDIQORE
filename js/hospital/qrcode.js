// QR 코드 생성 함수
export function generateQRCodes(patientId, prescriptionData, hospitalName, doctorName) {
    try {
        // 현재 날짜와 시간을 파이어베이스 경로에 맞는 형식으로 변환
        const now = new Date();
        
        // 날짜 포맷 (YYYY.MM.DD)
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        
        // 시간 포맷 (HH.MM.SS)
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const seconds = String(now.getSeconds()).padStart(2, '0');
        
        // 타임스탬프 생성
        const timestamp = `${year}.${month}.${day}_${hours}.${minutes}.${seconds}`;
        
        // Extract ID number from patientId (assuming format 'name.idNumber')
        const idNumber = patientId.split('.')[1];
        
        // Create the simplified data string for the QR code
        const qrData = `${hospitalName}/${idNumber}/${timestamp}`;
        
        // 파이어베이스 경로 생성
        const firebasePath = `/hospitals/${hospitalName}/patient/${patientId}/register.date/${timestamp}`;
        
        console.log('생성된 Firebase 경로:', firebasePath);
        
        // 경로를 전역 변수에 저장 (인쇄 시 사용)
        window.prescriptionQRData = firebasePath;
        
        // QR 코드 렌더링 함수를 전역 변수에 저장 (인쇄 시 사용)
        window.renderQRCodesForPrint = (leftContainer, rightContainer) => {
            renderQRCode(leftContainer, qrData, 'left');
            renderQRCode(rightContainer, qrData, 'right');
        };
    } catch (error) {
        console.error('QR 코드 데이터 생성 중 예외 발생:', error);
    }
}

// QR 코드 렌더링 함수
function renderQRCode(container, data, position) {
    if (!container) {
        console.error(`QR 코드 컨테이너(${position})를 찾을 수 없습니다.`);
        return;
    }
    
    try {
        // 기존 QR 코드 삭제
        while (container.firstChild) {
            container.removeChild(container.firstChild);
        }
        
        // 컨테이너 스타일 설정
        container.style.position = 'relative';
        
        // QR 코드 스타일링 객체 생성
        const qrCode = new QRCodeStyling({
            width: 120,
            height: 120,
            type: "canvas",
            data: data,
            dotsOptions: {
                color: "#000000",
                type: "square"
            },
            backgroundOptions: {
                color: "#FFFFFF"
            },
            cornersSquareOptions: {
                color: "#000000",
                type: "square"
            },
            cornersDotOptions: {
                color: "#000000",
                type: "square"
            },
            qrOptions: {
                errorCorrectionLevel: "H"  // 최고 수준의 오류 보정 (30%)
            }
        });
        
        // QR 코드 렌더링
        qrCode.append(container);
        
        // 회사 이름 요소 생성
        const companyName = document.createElement('div');
        companyName.textContent = 'MEDIQORE';
        companyName.style.fontWeight = 'bold';
        companyName.style.fontSize = '10px';
        companyName.style.position = 'absolute';
        companyName.style.fontFamily = 'Arial, sans-serif';
        companyName.style.letterSpacing = '0.5px';
        companyName.style.whiteSpace = 'nowrap';
        
        // 위치에 따라 다르게 배치
        if (position === 'left') {
            // 왼쪽 QR 코드: 오른쪽 상단 모서리에 배치
            companyName.style.top = '15px';
            companyName.style.left = '35px'; // QR 코드 크기(100px)에 맞춰 완전히 붙게 설정
            companyName.className = 'mediqore-text-left';
        } else {
            // 오른쪽 QR 코드: 오른쪽 하단 모서리에 배치하고 180도 회전
            companyName.style.bottom = '27px';
            companyName.style.left = '117px'; // QR 코드 크기(100px)에 맞춰 완전히 붙게 설정
            companyName.style.transform = 'rotate(180deg)'; // 180도 회전
            companyName.style.transformOrigin = 'left bottom'; // 회전 기준점
            companyName.className = 'mediqore-text-right';
        }
        
        container.appendChild(companyName);
        
        // 디버깅용 로그
        console.log(`QR 코드 (${position}) 생성 완료:`, data);
    } catch (error) {
        console.error(`QR 코드 (${position}) 렌더링 중 오류 발생:`, error);
    }
}
