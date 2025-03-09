// 프린트 관련 함수
export function printPrescription() {
    try {
        // 환자 정보 가져오기
        const patientInfoElement = document.querySelector('#prescription-content .content-title-prescription');
        
        // 환자 이름 추출 (첫 번째 span 요소)
        const nameElement = patientInfoElement.querySelector('span[style*="font-weight: bold"]');
        const patientName = nameElement ? nameElement.textContent.trim() : 'N/A';
        
        // 성별 추출 (gender-icon 클래스의 이미지 src에서)
        const genderIcon = patientInfoElement.querySelector('.gender-icon');
        let gender = 'N/A';
        if (genderIcon) {
            // 이미지 src에서 파일명만 추출
            const srcParts = genderIcon.src.split('/');
            const filename = srcParts[srcParts.length - 1].toLowerCase();
            
            if (filename.includes('male')) {
                // 인쇄 시 상대 경로 문제를 피하기 위해 base64 인코딩된 이미지 사용
                gender = '<span style="color: blue;">♂ Male</span>';
            } else if (filename.includes('female')) {
                gender = '<span style="color: pink;">♀ Female</span>';
            }
        }
        
        // 나이 추출 (두 번째 span 요소)
        const ageElement = patientInfoElement.querySelector('span[style*="margin-right: 5px"]');
        let age = 'N/A';
        if (ageElement) {
            // "17y"와 같은 형식에서 숫자만 추출
            const ageMatch = ageElement.textContent.match(/(\d+)y/);
            if (ageMatch && ageMatch[1]) {
                age = ageMatch[1];
            } else {
                age = ageElement.textContent.trim();
            }
        }
        
        // 생년월일 추출 (세 번째 span 요소)
        const birthDateElement = patientInfoElement.querySelector('span[style*="color: #666"]');
        let birthdate = 'N/A';
        if (birthDateElement) {
            // 괄호 제거하고 추출
            const birthdateMatch = birthDateElement.textContent.match(/\((.*?)\)/);
            if (birthdateMatch && birthdateMatch[1]) {
                birthdate = birthdateMatch[1].trim();
            }
        }
        
        // 의사 정보 및 병원 정보 (현재 로그인한 사용자 기반)
        const hospitalName = auth.currentUser.email.split('@')[0].split('.')[0];
        
        // 현재 날짜 및 시간 포맷팅 (인쇄 일자용)
        const now = new Date();
        const printDate = now.toLocaleDateString('en-US', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });
        
        const printTime = now.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        });
        
        // 처방전 작성 일자 (현재 날짜 사용)
        const prescriptionDate = printDate;
        
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
                        body { 
                            font-family: Arial, sans-serif; 
                            margin: 20px;
                            font-size: 12px;
                        }
                        /* 인쇄 시 배경색이 표시되도록 설정 */
                        @media print {
                            * {
                                -webkit-print-color-adjust: exact !important;
                                print-color-adjust: exact !important;
                                color-adjust: exact !important;
                            }
                        }
                        .hospital-name {
                            font-size: 14px;
                            margin-bottom: 5px;
                            float: left;
                        }
                        .prescription-date {
                            font-size: 12px;
                            float: right;
                            text-align: right;
                            margin-bottom: 5px;
                        }
                        .clearfix::after {
                            content: "";
                            clear: both;
                            display: table;
                        }
                        .chart-title {
                            font-size: 20px;
                            font-weight: bold;
                            text-align: center;
                            margin: 10px 0 15px 0;
                            clear: both;
                        }
                        table {
                            width: 100%;
                            border-collapse: collapse;
                            margin-bottom: 15px;
                            table-layout: fixed;
                        }
                        th, td {
                            border: 1px solid #000;
                            padding: 8px;
                            text-align: left;
                            vertical-align: middle;
                        }
                        th {
                            background-color: rgb(217, 217, 217) !important;
                            font-weight: bold;
                            color: black !important;
                        }
                        .chart-image-cell {
                            text-align: center;
                            vertical-align: middle;
                            padding: 0;
                            position: relative;
                            border: 1px solid #000;
                        }
                        .chart-image { 
                            max-width: 95%; 
                            max-height: 480px; 
                            object-fit: contain; 
                            margin: 0 auto;
                            display: block;
                            position: relative;
                            top: 10px;
                        }
                        .inner-table {
                            width: 100%;
                            border-collapse: collapse;
                            margin: 0;
                        }
                        .inner-table th, .inner-table td {
                            border: 1px solid #000;
                            padding: 8px;
                        }
                        .inner-table th {
                            background-color: #f2f2f2;
                            font-weight: bold;
                        }
                        .section-title {
                            font-weight: bold;
                            width: 150px;
                            vertical-align: middle;
                            background-color: rgb(217, 217, 217) !important;
                            color: black !important;
                        }
                        .treatment-details-title {
                            font-weight: bold;
                            background-color: rgb(217, 217, 217) !important;
                            text-align: center;
                            color: black !important;
                        }
                        .signature-cell {
                            text-align: right;
                            border: none;
                            padding-top: 30px;
                        }
                        .signature-line {
                            display: inline-block;
                            width: 200px;
                            border-bottom: 1px solid #000;
                            text-align: center;
                            padding-top: 20px;
                        }
                        .medicine-table {
                            margin-top: 15px;
                        }
                        .medicine-title {
                            font-weight: bold;
                            margin: 15px 0 5px 0;
                            text-align: center;
                            font-size: 14px;
                        }
                        /* 성별 이미지 크기 정확히 설정 */
                        .gender-icon, img.gender-icon {
                            width: 10px !important;
                            height: 14.5px !important;
                            vertical-align: middle;
                            margin: 0 5px;
                            object-fit: contain;
                        }
                        .print-info {
                            text-align: right;
                            font-size: 10px;
                            color: #666;
                            margin-top: 20px;
                        }
                    </style>
                </head>
                <body>
                    <div class="clearfix">
                        <div class="hospital-name">${hospitalName.toUpperCase()} Hospital</div>
                        <div class="prescription-date">Date: ${prescriptionDate}</div>
                    </div>
                    <div class="chart-title">Treatment Chart</div>
                    
                    <table>
                        <tr>
                            <th width="25%" style="background-color: rgb(217, 217, 217) !important; color: black !important;">Name</th>
                            <th width="25%" style="background-color: rgb(217, 217, 217) !important; color: black !important;">Gender</th>
                            <th width="25%" style="background-color: rgb(217, 217, 217) !important; color: black !important;">Years</th>
                            <th width="25%" style="background-color: rgb(217, 217, 217) !important; color: black !important;">Birthdate</th>
                        </tr>
                        <tr>
                            <td>${patientName}</td>
                            <td>${gender}</td>
                            <td>${age}</td>
                            <td>${birthdate}</td>
                        </tr>
                    </table>
                    
                    <table style="height: 500px;">
                        <tr style="height: 40px;">
                            <th width="30%" style="background-color: rgb(217, 217, 217) !important; color: black !important;">CC</th>
                            <td width="70%" rowspan="6" class="chart-image-cell">
                                ${chartImage ? `<img src="${chartImage}" class="chart-image" alt="Dental Chart">` : '<p>No chart available</p>'}
                            </td>
                        </tr>
                        <tr style="height: 100px;">
                            <td style="vertical-align: top;">${ccItems}</td>
                        </tr>
                        <tr style="height: 40px;">
                            <th style="background-color: rgb(217, 217, 217) !important; color: black !important;">Location</th>
                        </tr>
                        <tr style="height: 100px;">
                            <td style="vertical-align: top;">${location}</td>
                        </tr>
                        <tr style="height: 40px;">
                            <th style="background-color: rgb(217, 217, 217) !important; color: black !important;">Symptoms</th>
                        </tr>
                        <tr style="height: 180px;">
                            <td style="vertical-align: top;">${symptoms}</td>
                        </tr>
                    </table>
                    
                    <table>
                        <tr>
                            <th class="treatment-details-title" style="background-color: rgb(217, 217, 217) !important; color: black !important;">Treatment Details</th>
                        </tr>
                        <tr>
                            <td>${treatmentDetails}</td>
                        </tr>
                    </table>
                    
                    <div class="medicine-title">Prescribed Medicines</div>
                    <table class="medicine-table">
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
                    
                    <div class="signature-cell">
                        <div>Doctor's Signature</div>
                        <div class="signature-line"></div>
                    </div>
                    
                    <div class="print-info">
                        Printed on: ${printDate} at ${printTime}
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

