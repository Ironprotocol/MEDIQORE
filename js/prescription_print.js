// 프린트 관련 함수
export function printPrescription() {
    try {
        // 환자 정보 가져오기
        const patientInfo = document.querySelector('#prescription-content .content-title-prescription').innerHTML;
        
        // 의사 정보 및 병원 정보 (현재 로그인한 사용자 기반)
        const hospitalName = auth.currentUser.email.split('@')[0].split('.')[0];
        
        // 캔버스 이미지 가져오기 - 치아 배경과 그림 함께 캡처
        const canvas = document.querySelector('.tooth-chart-canvas');
        const toothImg = document.querySelector('.tooth-chart-img');
        
        // 현재 증상, 위치, 치료 세부사항 가져오기
        const symptoms = document.querySelector('.symptoms-input')?.value || 'N/A';
        const location = document.querySelector('.location-input')?.value || 'N/A';
        const treatmentDetails = document.querySelector('.treatment-details-input')?.value || 'N/A';
        
        // CC 항목 가져오기
        const ccItems = Array.from(document.querySelectorAll('.cc-item .cc-item-text'))
            .map(item => item.textContent)
            .join(', ') || 'None';
        
        // 약물 항목 가져오기
        let medicinesHTML = '';
        const medicineItems = document.querySelectorAll('.medicine-item');
        
        if (medicineItems.length > 0) {
            medicinesHTML = Array.from(medicineItems).map(item => {
                const name = item.querySelector('.medicine-item-text')?.textContent || 'Unknown Medicine';
                
                // 입력 필드 또는 텍스트 정보에서 안전하게 값 가져오기
                let doseInput = 'N/A';
                let frequencyInput = 'N/A';
                let durationInput = 'N/A';
                
                // 입력 필드 확인
                const doseElement = item.querySelector('.dose-input');
                const frequencyElement = item.querySelector('.frequency-input');
                const durationElement = item.querySelector('.duration-input');
                
                // 텍스트 정보 확인 (히스토리에서 로드된 경우)
                const textInfoSpans = item.querySelectorAll('.medicine-text-info span');
                
                if (doseElement && doseElement.value !== undefined) {
                    doseInput = doseElement.value || 'N/A';
                } else if (textInfoSpans && textInfoSpans[0]) {
                    doseInput = textInfoSpans[0].textContent || 'N/A';
                }
                
                if (frequencyElement && frequencyElement.value !== undefined) {
                    frequencyInput = frequencyElement.value || 'N/A';
                } else if (textInfoSpans && textInfoSpans[1]) {
                    frequencyInput = textInfoSpans[1].textContent || 'N/A';
                }
                
                if (durationElement && durationElement.value !== undefined) {
                    durationInput = durationElement.value || 'N/A';
                } else if (textInfoSpans && textInfoSpans[2]) {
                    durationInput = textInfoSpans[2].textContent || 'N/A';
                }
                
                return `
                    <tr>
                        <td>${name}</td>
                        <td>${doseInput}</td>
                        <td>${frequencyInput}</td>
                        <td>${durationInput}</td>
                    </tr>
                `;
            }).join('');
        } else {
            medicinesHTML = `
                <tr>
                    <td colspan="4" style="text-align: center;">No medicines prescribed</td>
                </tr>
            `;
        }
        
        // 현재 날짜 포맷팅
        const today = new Date();
        const formattedDate = today.toLocaleDateString('en-GB', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });
        
        // 캔버스 이미지 데이터 URL 가져오기 (prescription_canvas.js의 함수 사용)
        const chartImagePromise = new Promise((resolve) => {
            // 이벤트를 생성하여 canvas 모듈에게 이미지 데이터 요청
            const canvasEvent = new CustomEvent('getChartImageForPrint', {
                detail: {
                    callback: (imageData) => resolve(imageData)
                }
            });
            document.dispatchEvent(canvasEvent);
        });
        
        // 이미지 데이터를 받아온 후 인쇄 처리
        return chartImagePromise.then((chartImage) => {
            // 인쇄용 iframe 생성 (화면에 표시되지 않음)
            const printFrame = document.createElement('iframe');
            printFrame.style.position = 'fixed';
            printFrame.style.left = '-9999px';
            printFrame.name = 'printFrame';
            document.body.appendChild(printFrame);
            
            // iframe 내용 작성 (인쇄될 처방전 양식)
            printFrame.contentDocument.write(`
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Prescription</title>
                    <style>
                        body { font-family: Arial, sans-serif; margin: 20px; }
                        .prescription-header { display: flex; justify-content: space-between; margin-bottom: 20px; }
                        .patient-info { margin-bottom: 15px; }
                        .chart-image { max-width: 100%; height: auto; margin: 10px 0; }
                        table { width: 100%; border-collapse: collapse; margin: 15px 0; }
                        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                        th { background-color: #f2f2f2; }
                        .section { margin-bottom: 20px; }
                        .section-title { font-weight: bold; margin-bottom: 5px; }
                        /* 성별 이미지 크기 조정 */
                        .patient-info img, .gender-icon {
                            width: 10px;
                            height: 14.5px;
                            vertical-align: middle;
                            margin: 0 5px;
                        }
                    </style>
                </head>
                <body>
                    <div class="prescription-header">
                        <div>
                            <h2>${hospitalName.toUpperCase()} Hospital</h2>
                            <p>Prescription</p>
                        </div>
                        <div>
                            <p>Date: ${formattedDate}</p>
                        </div>
                    </div>
                    
                    <div class="patient-info">
                        <p><strong>Patient:</strong> ${patientInfo}</p>
                    </div>
                    
                    <div class="section">
                        <div class="section-title">Chief Complaints:</div>
                        <p>${ccItems}</p>
                    </div>
                    
                    <div class="section">
                        <div class="section-title">Symptoms:</div>
                        <p>${symptoms}</p>
                    </div>
                    
                    <div class="section">
                        <div class="section-title">Location:</div>
                        <p>${location}</p>
                    </div>
                    
                    <div class="section">
                        <div class="section-title">Dental Chart:</div>
                        ${chartImage ? `<img src="${chartImage}" class="chart-image" alt="Dental Chart">` : '<p>No chart available</p>'}
                    </div>
                    
                    <div class="section">
                        <div class="section-title">Treatment Details:</div>
                        <p>${treatmentDetails}</p>
                    </div>
                    
                    <div class="section">
                        <div class="section-title">Prescribed Medicines:</div>
                        <table>
                            <thead>
                                <tr>
                                    <th>Medicine</th>
                                    <th>Dose</th>
                                    <th>Frequency</th>
                                    <th>Duration</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${medicinesHTML}
                            </tbody>
                        </table>
                    </div>
                    
                    <div style="margin-top: 50px; text-align: right;">
                        <p>Doctor's Signature: ____________________</p>
                    </div>
                </body>
                </html>
            `);
            
            printFrame.contentDocument.close();
            
            // 잠시 대기 후 인쇄 실행 (내용이 완전히 로드되도록)
            return new Promise((resolve) => {
                setTimeout(() => {
                    printFrame.contentWindow.focus();
                    printFrame.contentWindow.print();
                    
                    // 인쇄 대화상자가 닫히면 iframe 제거
                    setTimeout(() => {
                        document.body.removeChild(printFrame);
                        resolve();
                    }, 100);
                }, 500);
            });
        });
    } catch (error) {
        console.error('프린트 중 오류:', error);
        alert('프린트 준비 중 오류가 발생했습니다.');
        return Promise.reject(error);
    }
}

// Firebase 모듈 가져오기
import { auth } from './firebase-config.js';
