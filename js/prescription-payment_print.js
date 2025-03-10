// prescription-payment_print.js
// 처방전 프린트 관련 기능을 담당하는 모듈

import { initializePrescriptionPayment } from './prescription-payment.js';

// 프린트 함수 - 인쇄 취소 시 문제 해결
export function printPrescription(container, patientId) {
    // 프린트할 내용 가져오기
    const prescriptionContent = container.querySelector('.prescription-payment-details');
    if (!prescriptionContent) {
        console.error('처방전 내용을 찾을 수 없습니다.');
        return;
    }
    
    // 현재 문서의 내용 저장
    const originalContents = document.body.innerHTML;
    const printContents = prescriptionContent.innerHTML;
    
    // QR 코드 데이터 가져오기 (전역 변수에 저장된 경우)
    const qrData = window.prescriptionQRData || {};
    console.log('QR 코드 데이터 확인:', qrData);
    
    // QR 코드 데이터를 JSON 문자열로 변환
    const qrString = JSON.stringify(qrData);
    
    // 프린트용 스타일 정의
    const printStyles = `
        <style>
            @media print {
                body {
                    font-family: Arial, sans-serif;
                    margin: 0;
                    padding: 0;
                    position: relative;
                }
                .print-container {
                    width: 100%;
                    position: relative;
                    /* A4 용지 크기 설정 (210mm x 297mm) */
                    width: 210mm;
                    min-height: 297mm;
                    margin: 0 auto;
                    padding: 0;
                    box-sizing: border-box;
                    /* QR 코드를 위한 여백 */
                    padding-bottom: 30mm;
                }
                .prescription-title {
                    text-align: center;
                    font-size: 24px;
                    font-weight: bold;
                    padding: 10px 0;
                    border-bottom: 2px solid #000;
                }
                .prescription-title-container {
                    display: flex;
                    justify-content: center;
                    align-items: center;
                }
                .prescription-title-text {
                    margin: 0 20px;
                }
                table {
                    width: 100%;
                    border-collapse: collapse;
                    margin-bottom: 20px;
                }
                td {
                    border: 1px solid #000;
                    padding: 8px;
                }
                .table-header {
                    font-weight: bold;
                    background-color: #f0f0f0;
                }
                .table-label {
                    font-weight: bold;
                }
                .medicines-title {
                    font-weight: bold;
                    text-align: center;
                    background-color: #f0f0f0;
                }
                .medicines-header {
                    font-weight: bold;
                    background-color: #f0f0f0;
                    text-align: center;
                }
                .prescription-footer, .print-btn-payment, .payment-complete-btn {
                    display: none !important;
                }
                
                /* QR 코드 스타일 - 인쇄 시에만 표시 */
                .qr-code-container {
                    display: block !important;
                    position: absolute;
                    /* A4 용지 하단에 배치 */
                    bottom: 10mm;
                    left: 0;
                    right: 0;
                    height: 20mm;
                    width: 100%;
                }
                .qr-code-left {
                    position: absolute;
                    /* A4 용지 왼쪽 하단 모서리에 배치 */
                    left: 10mm;
                    bottom: 0;
                    width: 20mm;
                    height: 20mm;
                    display: block !important;
                }
                .qr-code-right {
                    position: absolute;
                    /* A4 용지 오른쪽 하단 모서리에 배치 */
                    right: 10mm;
                    bottom: 0;
                    width: 20mm;
                    height: 20mm;
                    display: block !important;
                }
                
                /* QR 코드 내부 요소 표시 */
                .qr-code-left svg, .qr-code-right svg {
                    display: block !important;
                    width: 20mm !important;
                    height: 20mm !important;
                }
                
                /* 기존 숨김 처리된 QR 코드 요소 재정의 */
                .qr-code, .qr-code svg, .qr-code canvas, .qr-code img {
                    display: none;
                }
            }
            
            /* 인쇄 미리보기에서도 QR 코드 컨테이너 표시 */
            @media screen {
                .qr-code-container {
                    display: block;
                    position: relative;
                    margin-top: 20px;
                    height: 100px;
                    width: 100%;
                }
                .qr-code-left {
                    position: absolute;
                    left: 20px;
                    bottom: 0;
                    width: 100px;
                    height: 100px;
                }
                .qr-code-right {
                    position: absolute;
                    right: 20px;
                    bottom: 0;
                    width: 100px;
                    height: 100px;
                }
            }
        </style>
    `;
    
    // 인쇄용 iframe 생성
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    document.body.appendChild(iframe);
    
    // iframe 문서에 내용 작성
    const iframeDoc = iframe.contentWindow.document;
    iframeDoc.open();
    iframeDoc.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Prescription</title>
            ${printStyles}
            <script src="https://unpkg.com/qr-code-styling@1.5.0/lib/qr-code-styling.js"></script>
        </head>
        <body>
            <div class="print-container">
                ${printContents}
                
                <!-- QR 코드 컨테이너 추가 -->
                <div class="qr-code-container">
                    <div class="qr-code-left" id="qr-left"></div>
                    <div class="qr-code-right" id="qr-right"></div>
                </div>
            </div>
            
            <script>
                // QR 코드 생성 함수 (qr-code-styling 라이브러리 사용)
                function generateQRCodes() {
                    try {
                        console.log('QR 코드 생성 시작');
                        
                        // QR 코드 데이터
                        const qrData = ${JSON.stringify(qrData)};
                        const qrString = JSON.stringify(qrData);
                        
                        console.log('QR 코드 데이터:', qrString);
                        
                        // QRCode 라이브러리 확인
                        if (typeof QRCodeStyling === 'undefined') {
                            console.error('QRCodeStyling 라이브러리가 로드되지 않았습니다.');
                            return;
                        }
                        
                        // 왼쪽 QR 코드 요소 확인
                        const leftElement = document.getElementById('qr-left');
                        if (!leftElement) {
                            console.error('왼쪽 QR 코드 요소를 찾을 수 없습니다.');
                            return;
                        }
                        
                        // 오른쪽 QR 코드 요소 확인
                        const rightElement = document.getElementById('qr-right');
                        if (!rightElement) {
                            console.error('오른쪽 QR 코드 요소를 찾을 수 없습니다.');
                            return;
                        }
                        
                        // 공통 QR 코드 옵션
                        const qrOptions = {
                            width: 100,
                            height: 100,
                            type: "svg",
                            data: qrString,
                            dotsOptions: {
                                color: "#000000",
                                type: "square"
                            },
                            backgroundOptions: {
                                color: "transparent",
                            },
                            cornersSquareOptions: {
                                type: "square"
                            },
                            cornersDotOptions: {
                                type: "square"
                            },
                            qrOptions: {
                                errorCorrectionLevel: "M"
                            }
                        };
                        
                        // 왼쪽 QR 코드 생성
                        try {
                            // 기존 QR 코드가 있으면 제거
                            leftElement.innerHTML = '';
                            
                            // QR Code Styling 라이브러리를 사용하여 QR 코드 생성
                            const qrCodeLeft = new QRCodeStyling(qrOptions);
                            
                            // QR 코드를 DOM에 추가
                            qrCodeLeft.append(leftElement);
                            
                            // QR 코드 생성 후 SVG 요소에 직접 스타일 적용
                            setTimeout(() => {
                                const svgElement = leftElement.querySelector('svg');
                                if (svgElement) {
                                    svgElement.setAttribute('width', '100');
                                    svgElement.setAttribute('height', '100');
                                    svgElement.style.width = '100px';
                                    svgElement.style.height = '100px';
                                }
                            }, 50);
                            
                            console.log('왼쪽 QR 코드 생성 완료');
                        } catch (error) {
                            console.error('왼쪽 QR 코드 생성 오류:', error);
                        }
                        
                        // 오른쪽 QR 코드 생성
                        try {
                            // 기존 QR 코드가 있으면 제거
                            rightElement.innerHTML = '';
                            
                            // QR Code Styling 라이브러리를 사용하여 QR 코드 생성
                            const qrCodeRight = new QRCodeStyling(qrOptions);
                            
                            // QR 코드를 DOM에 추가
                            qrCodeRight.append(rightElement);
                            
                            // QR 코드 생성 후 SVG 요소에 직접 스타일 적용
                            setTimeout(() => {
                                const svgElement = rightElement.querySelector('svg');
                                if (svgElement) {
                                    svgElement.setAttribute('width', '100');
                                    svgElement.setAttribute('height', '100');
                                    svgElement.style.width = '100px';
                                    svgElement.style.height = '100px';
                                }
                            }, 50);
                            
                            console.log('오른쪽 QR 코드 생성 완료');
                        } catch (error) {
                            console.error('오른쪽 QR 코드 생성 오류:', error);
                        }
                    } catch (error) {
                        console.error('QR 코드 생성 중 예외 발생:', error);
                    }
                }
                
                // 페이지 로드 시 QR 코드 생성 및 인쇄 다이얼로그 표시
                window.onload = function() {
                    console.log('iframe 내부 페이지 로드됨');
                    
                    // QR 코드 생성
                    generateQRCodes();
                    
                    // 인쇄 다이얼로그 표시
                    setTimeout(function() {
                        console.log('인쇄 다이얼로그 표시');
                        window.print();
                        
                        // 인쇄 다이얼로그가 닫힌 후 부모 창에 메시지 전송
                        window.addEventListener('afterprint', function() {
                            console.log('인쇄 완료 또는 취소됨');
                            window.parent.postMessage('printClosed', '*');
                        });
                        
                        // 인쇄 취소 시에도 일정 시간 후 메시지 전송 (fallback)
                        setTimeout(function() {
                            console.log('인쇄 타임아웃');
                            window.parent.postMessage('printTimeout', '*');
                        }, 5000);
                    }, 1000); // QR 코드 생성에 충분한 시간을 주기 위해 1초로 증가
                };
            </script>
        </body>
        </html>
    `);
    iframeDoc.close();
    
    // iframe이 로드된 후 처리
    iframe.onload = function() {
        console.log('iframe 로드됨');
        
        // 메시지 이벤트 리스너 추가
        const messageHandler = function(event) {
            if (event.data === 'printClosed' || event.data === 'printTimeout') {
                console.log('인쇄 완료 메시지 수신:', event.data);
                // iframe 제거
                document.body.removeChild(iframe);
                // 이벤트 리스너 제거
                window.removeEventListener('message', messageHandler);
            }
        };
        
        // 메시지 이벤트 리스너 등록
        window.addEventListener('message', messageHandler);
        
        // 추가 안전장치: 10초 후 무조건 iframe 제거
        setTimeout(function() {
            console.log('안전장치: iframe 제거 타임아웃');
            if (document.body.contains(iframe)) {
                document.body.removeChild(iframe);
                window.removeEventListener('message', messageHandler);
            }
        }, 10000);
    };
}

// QR 코드 생성 함수
export function generateQRCodes(patientId, prescriptionData, hospitalName, doctorName) {
    try {
        // QR 코드에 포함할 데이터 생성 (테스트 버전용 최적화)
        const qrData = {
            v: 1,  // 버전
            h: {   // 병원 정보
                n: hospitalName,
                d: doctorName
            },
            p: {   // 환자 정보
                id: patientId,
                nm: patientId.split('.')[0]
            },
            d: new Date().toISOString().split('T')[0],  // 날짜 (YYYY-MM-DD)
            m: prescriptionData.medicines ? prescriptionData.medicines.map(med => ({
                n: med.name,
                d: med.perDose || '',
                f: med.perDay || '',
                t: med.days || ''
            })) : []
        };
        
        // 데이터를 JSON 문자열로 변환
        const qrString = JSON.stringify(qrData);
        
        // 디버깅: QR 코드 데이터 크기 확인
        const dataSizeBytes = new Blob([qrString]).size;
        console.log('QR 코드 데이터 크기:', dataSizeBytes, 'bytes');
        console.log('QR 코드 데이터 내용:', qrString);
        
        // QR 코드 데이터를 전역 변수에 저장 (인쇄 시 사용)
        window.prescriptionQRData = qrData;
        
        // QR 코드 데이터만 저장하고 화면에 표시하지 않음
        // 나중에 프린트 시 필요하면 사용할 수 있도록 데이터 형식 유지
    } catch (error) {
        console.error('QR 코드 데이터 생성 중 예외 발생:', error);
    }
}
