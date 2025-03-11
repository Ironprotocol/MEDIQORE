// prescription-payment_print.js
// 처방전 프린트 관련 기능을 담당하는 모듈

import { initializePrescriptionPayment } from './prescription-payment.js';
import { generateQRCodes } from './qrcode.js';

// 프린트 함수 - 인쇄 취소 시 문제 해결
export function printPrescription(container, patientId) {
    // 프린트할 내용 가져오기
    const prescriptionContent = container.querySelector('.prescription-payment-details');
    if (!prescriptionContent) {
        console.error('처방전 내용을 찾을 수 없습니다.');
        return;
    }
    
    // 전역 변수에서 데이터 가져오기
    const printData = window.prescriptionPrintData || {};
    
    // 데이터가 없으면 DOM에서 가져오기 (fallback)
    if (!printData.patientId) {
        console.warn('전역 변수에 데이터가 없어 DOM에서 가져옵니다.');
    }
    
    // 현재 문서의 내용 저장
    const originalContents = document.body.innerHTML;
    
    // 현재 시간 가져오기
    const now = new Date();
    const formattedTime = now.toLocaleString('en-US', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
    });
    
    // 프린트용 스타일 정의
    const printStyles = `
        <style>
            @page {
                size: A4;
                margin: 0;
                /* 고정 배율 적용 */
                scale: 1;
            }
            
            @media print {
                html, body {
                    width: 210mm;
                    height: 297mm;
                    margin: 0;
                    padding: 0;
                    font-family: Arial, sans-serif;
                    font-size: 12px;
                    -webkit-print-color-adjust: exact !important;
                    print-color-adjust: exact !important;
                }
                
                .print-container {
                    width: 190mm;
                    min-height: 277mm;
                    margin: 10mm;
                    position: relative;
                    box-sizing: border-box;
                }
                
                .document-header {
                    position: relative;
                    width: 100%;
                    height: 10mm;
                    margin-bottom: 5mm;
                }
                
                .document-type {
                    position: absolute;
                    top: 0;
                    left: 0;
                    font-size: 8pt;
                    color: #666;
                }
                
                .document-time {
                    position: absolute;
                    top: 0;
                    right: 0;
                    font-size: 8pt;
                    color: #666;
                    text-align: right;
                }
                
                .prescription-title {
                    text-align: center;
                    font-size: 16pt;
                    font-weight: bold;
                    padding: 10px 0;
                    border-bottom: 2px solid rgb(0, 82, 204);
                    background-color: rgb(211, 228, 255);
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
                    margin-bottom: 5mm;
                }
                
                td {
                    border: 1px solid rgb(0, 82, 204);
                    padding: 2mm;
                    font-size: 10pt;
                }
                
                .table-header {
                    font-weight: bold;
                    background-color: rgb(233, 242, 255);
                }
                
                .table-label {
                    font-weight: bold;
                }
                
                .medicines-title {
                    font-weight: bold;
                    text-align: center;
                    background-color: rgb(211, 228, 255);
                }
                
                .medicines-header {
                    font-weight: bold;
                    background-color: rgb(233, 242, 255);
                    text-align: center;
                }
                
                .medicines-data {
                    height: 6mm;
                }
                
                .empty-row {
                    height: 6mm;
                }
                
                .prescription-footer, .print-btn-payment, .payment-complete-btn {
                    display: none !important;
                }
                
                .qr-scan-message-container {
                    display: flex;
                    width: 100%;
                    height: 150px;
                    margin-top: 15px;
                    page-break-inside: avoid;
                    border: 1px solid rgb(0, 82, 204);
                }
                
                .qr-scan-message-left, .qr-scan-message-right {
                    width: 150px;
                    height: 150px;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    background-color: #FFFFFF;
                }
                
                .qr-scan-message-center {
                    flex: 1;
                    height: 150px;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    text-align: center;
                    font-size: 14px;
                    background-color: #FFFFFF;
                    border-left: 1px solid rgb(0, 82, 204); 
                    border-right: 1px solid rgb(0, 82, 204); 
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
        </head>
        <body>
            <div class="print-container">
                <!-- 문서 헤더 추가 -->
                <div class="document-header">
                    <div class="document-type">For Pharmacy Submission</div>
                    <div class="document-time">Print Time: ${formattedTime}</div>
                </div>
                
                <!-- 처방전 내용 -->
                <div class="prescription-content">
                    <!-- 처방전 메인 테이블 -->
                    <table class="prescription-table">
                        <!-- 제목 행 -->
                        <tr>
                            <td colspan="6" class="prescription-title">
                                <div class="prescription-title-container">
                                    <span class="prescription-title-text">PRESCRIPTION</span>
                                </div>
                            </td>
                        </tr>
                        
                        <!-- Issue No 행 -->
                        <tr>
                            <td class="table-header" style="width:15%;">Issue No</td>
                            <td colspan="5" class="table-data">${printData.issueNo || document.querySelector('.prescription-table .table-data')?.textContent || ''}</td>
                        </tr>
                        
                        <!-- 환자 및 병원 정보 행 -->
                        <tr>
                            <td class="table-header" style="width:15%;" rowspan="2">Patient</td>
                            <td class="table-label" style="width:15%;">Name</td>
                            <td class="table-data" style="width:20%;">${printData.patientName || document.querySelector('.prescription-table tr:nth-child(3) .table-data:nth-child(3)')?.textContent || ''}</td>
                            <td class="table-header" style="width:15%;" rowspan="4">Hospital</td>
                            <td class="table-label" style="width:15%;">Name</td>
                            <td class="table-data" style="width:20%;">${printData.hospitalName || document.querySelector('.prescription-table tr:nth-child(3) .table-data:nth-child(6)')?.textContent || ''}</td>
                        </tr>
                        
                        <tr>
                            <td class="table-label">ID</td>
                            <td class="table-data">${printData.patientID || document.querySelector('.prescription-table tr:nth-child(4) .table-data:nth-child(2)')?.textContent || ''}</td>
                            <td class="table-label">Phone</td>
                            <td class="table-data">${printData.hospitalPhone || document.querySelector('.prescription-table tr:nth-child(4) .table-data:nth-child(4)')?.textContent || ''}</td>
                        </tr>
                        
                        <tr>
                            <td class="table-header" rowspan="2">License</td>
                            <td class="table-label">Name</td>
                            <td class="table-data">${printData.licenseName || document.querySelector('.prescription-table tr:nth-child(5) .table-data:nth-child(2)')?.textContent || ''}</td>
                            <td class="table-label">Fax</td>
                            <td class="table-data">${printData.hospitalFax || document.querySelector('.prescription-table tr:nth-child(5) .table-data:nth-child(4)')?.textContent || ''}</td>
                        </tr>
                        
                        <tr>
                            <td class="table-label">Number</td>
                            <td class="table-data">${printData.licenseNumber || document.querySelector('.prescription-table tr:nth-child(6) .table-data:nth-child(2)')?.textContent || ''}</td>
                            <td class="table-label">Email</td>
                            <td class="table-data">${printData.hospitalEmail || document.querySelector('.prescription-table tr:nth-child(6) .table-data:nth-child(4)')?.textContent || ''}</td>
                        </tr>
                        
                        <!-- 의사와 서명 행 -->
                        <tr>
                            <td class="table-header">Doctor</td>
                            <td class="table-data" colspan="2">${printData.doctorName || document.querySelector('.prescription-table tr:nth-child(7) .table-data:nth-child(2)')?.textContent || ''}</td>
                            <td class="table-header">Signature</td>
                            <td class="table-data" colspan="2" style="height:40px;"></td>
                        </tr>
                    </table>
                    
                    <!-- 약품 정보 테이블 -->
                    <table class="medicines-table">
                        <tr>
                            <td colspan="4" class="medicines-title">MEDICINES</td>
                        </tr>
                        <tr>
                            <td class="medicines-header" style="width:40%;">Medicine Name</td>
                            <td class="medicines-header" style="width:20%;">Dose</td>
                            <td class="medicines-header" style="width:20%;">Frequency</td>
                            <td class="medicines-header" style="width:20%;">Duration</td>
                        </tr>
                        ${(() => {
                            // 약품 데이터 가져오기
                            const medicineRows = Array.from(document.querySelectorAll('.medicines-table tr')).slice(2);
                            let medicineHTML = '';
                            
                            // 기존 약품 데이터 추가
                            for (let i = 0; i < Math.min(medicineRows.length, 10); i++) {
                                medicineHTML += `
                                    <tr>
                                        <td class="medicines-data">${medicineRows[i]?.querySelector('td:nth-child(1)')?.textContent || ''}</td>
                                        <td class="medicines-data">${medicineRows[i]?.querySelector('td:nth-child(2)')?.textContent || ''}</td>
                                        <td class="medicines-data">${medicineRows[i]?.querySelector('td:nth-child(3)')?.textContent || ''}</td>
                                        <td class="medicines-data">${medicineRows[i]?.querySelector('td:nth-child(4)')?.textContent || ''}</td>
                                    </tr>
                                `;
                            }
                            
                            // 빈 행 추가 (총 10줄이 되도록)
                            for (let i = medicineRows.length; i < 10; i++) {
                                medicineHTML += `
                                    <tr>
                                        <td class="medicines-data empty-row"></td>
                                        <td class="medicines-data empty-row"></td>
                                        <td class="medicines-data empty-row"></td>
                                        <td class="medicines-data empty-row"></td>
                                    </tr>
                                `;
                            }
                            
                            return medicineHTML;
                        })()}
                    </table>
                    
                    <!-- 사용 기간 테이블 -->
                    <table class="usage-table">
                        <tr>
                            <td class="table-header" style="width:30%;">Usage Period</td>
                            <td class="table-data">Valid for 3 days from issue date</td>
                        </tr>
                    </table>
                </div>
                
                <!-- 하단 QR 코드 스캔 메시지 영역 -->
                <div class="qr-scan-message-container">
                    <div class="qr-scan-message-left"></div>
                    <div class="qr-scan-message-center">
                        For pharmacy use - Scan with MEDIQORE Pharmacy App
                    </div>
                    <div class="qr-scan-message-right"></div>
                </div>
            </div>
            
            <script>
                // 페이지 로드 시 인쇄 다이얼로그 표시
                window.onload = function() {
                    // QR 코드 생성 및 렌더링
                    if (window.parent.renderQRCodesForPrint) {
                        const leftQRElement = document.querySelector('.qr-scan-message-left');
                        const rightQRElement = document.querySelector('.qr-scan-message-right');
                        
                        if (leftQRElement && rightQRElement) {
                            window.parent.renderQRCodesForPrint(leftQRElement, rightQRElement);
                        } else {
                            console.error('QR 코드 컨테이너를 찾을 수 없습니다.');
                        }
                    } else {
                        console.warn('renderQRCodesForPrint 함수를 찾을 수 없습니다.');
                    }
                    
                    // 인쇄 다이얼로그 표시 - QR 코드 렌더링 후 약간의 지연을 두고 실행
                    setTimeout(() => {
                        window.print();
                        
                        // 인쇄 완료 메시지 전송
                        window.parent.postMessage('printCompleted', '*');
                    }, 800); // 800ms로 증가하여 QR 코드 렌더링 시간 확보
                };
                
                // 인쇄 후 이벤트 처리
                window.addEventListener('afterprint', function() {
                    // 인쇄 완료 또는 취소 시 메시지 전송
                    window.parent.postMessage('printClosed', '*');
                });
            </script>
        </body>
        </html>
    `);
    iframeDoc.close();
    
    // iframe이 로드된 후 처리
    iframe.onload = function() {
        // 메시지 이벤트 리스너 추가
        const messageHandler = function(event) {
            if (event.data === 'printClosed' || event.data === 'printTimeout') {
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
            if (document.body.contains(iframe)) {
                document.body.removeChild(iframe);
                window.removeEventListener('message', messageHandler);
            }
        }, 10000);
    };
}

// QR 코드 생성 함수는 qrcode.js로 이동했으므로 제거