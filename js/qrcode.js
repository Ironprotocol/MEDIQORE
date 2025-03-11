// qrcode.js
// QR 코드 생성 관련 기능을 담당하는 모듈

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
        
        // 파이어베이스 경로 생성
        const firebasePath = `/hospitals/${hospitalName}/patient/${patientId}/register.date/${timestamp}`;
        
        console.log('생성된 Firebase 경로:', firebasePath);
        
        // 경로를 전역 변수에 저장 (인쇄 시 사용)
        window.prescriptionQRData = firebasePath;
        
        // QR 코드 렌더링 함수를 전역 변수에 저장 (인쇄 시 사용)
        window.renderQRCodesForPrint = (leftContainer, rightContainer) => {
            renderQRCode(leftContainer, firebasePath, 'left');
            renderQRCode(rightContainer, firebasePath, 'right');
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
        
        // QR 코드 스타일링 객체 생성
        const qrCode = new QRCodeStyling({
            width: 100,
            height: 100,
            type: "svg",
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
        
        // 디버깅용 로그
        console.log(`QR 코드 (${position}) 생성 완료:`, data);
    } catch (error) {
        console.error(`QR 코드 (${position}) 렌더링 중 오류 발생:`, error);
    }
}
