import { auth, db, doc, getDoc, deleteDoc, collection, query, where, getDocs } from './firebase-config.js';

// Prescription Payment 컨테이너 초기화
export function initializePrescriptionPayment() {
    // 컨테이너 요소 가져오기
    const paymentContainer = document.querySelector('#desk-content-right');
    
    // 컨테이너가 이미 content-body를 가지고 있는지 확인
    let contentBody = paymentContainer.querySelector('.content-body');
    if (!contentBody) {
        contentBody = document.createElement('div');
        contentBody.className = 'content-body';
        paymentContainer.appendChild(contentBody);
    }
    
    // 초기 메시지 표시
    showInitialMessage(contentBody);
    
    // 환자 선택 이벤트 리스너 등록
    document.addEventListener('patientSelectedForPayment', async (e) => {
        const { patientId } = e.detail;
        await loadPrescriptionDetails(patientId, contentBody);
    });
    
    // 환자 선택 해제 이벤트 리스너 등록
    document.addEventListener('patientDeselected', () => {
        showInitialMessage(contentBody);
    });
}

// 초기 메시지 표시 함수
function showInitialMessage(container) {
    container.innerHTML = `
        <div class="payment-message" style="display:flex; justify-content:center; align-items:center; height:100%; color:#666;">
            <p>Select a patient from the list to view prescription details.</p>
        </div>
    `;
}

// 처방전 상세 정보 로드
async function loadPrescriptionDetails(patientId, container) {
    try {
        const [hospitalName] = auth.currentUser.email.split('@')[0].split('.');
        
        // 환자 기본 정보 가져오기
        const patientRef = doc(db, 'hospitals', hospitalName, 'patient', patientId);
        const patientDoc = await getDoc(patientRef);
        
        if (!patientDoc.exists()) {
            container.innerHTML = `<div class="payment-message" style="display:flex; justify-content:center; align-items:center; height:100%; color:#666;"><p>Patient information not found.</p></div>`;
            return;
        }
        
        const patientData = patientDoc.data();
        const birthDate = patientData.info.birthDate.toDate();
        const age = new Date().getFullYear() - birthDate.getFullYear();
        
        // 오늘 날짜 가져오기
        const today = new Date();
        const formattedDate = today.toLocaleDateString('en-GB', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        }).replace(/ /g, '.');
        
        // 오늘 날짜의 register.date 문서 가져오기
        const registerDateRef = collection(db, 'hospitals', hospitalName, 'patient', patientId, 'register.date');
        const q = query(registerDateRef, where('__name__', '>=', formattedDate), where('__name__', '<=', formattedDate + '\uf8ff'));
        const registerDateSnapshot = await getDocs(q);
        
        if (registerDateSnapshot.empty) {
            container.innerHTML = `<div class="payment-message" style="display:flex; justify-content:center; align-items:center; height:100%; color:#666;"><p>No registration found for this patient today.</p></div>`;
            return;
        }
        
        // 가장 최근 문서 사용
        const registerDateDoc = registerDateSnapshot.docs[0];
        const registerData = registerDateDoc.data();
        
        // prescription 필드가 없는 경우
        if (!registerData.prescription) {
            container.innerHTML = `
                <div class="payment-message" style="display:flex; justify-content:center; align-items:center; height:100%; color:#666;">
                    <p>No prescription found for this patient today.</p>
                </div>
            `;
            return;
        }
        
        const prescriptionData = registerData.prescription;
        
        // 병원 정보 가져오기
        const hospitalRef = doc(db, 'hospitals', hospitalName);
        const hospitalDoc = await getDoc(hospitalRef);
        let hospitalInfo = {};
        
        if (hospitalDoc.exists()) {
            hospitalInfo = hospitalDoc.data().info || {};
        }
        
        // 약품 목록 HTML 생성
        let medicinesHTML = '';
        if (prescriptionData.medicines && prescriptionData.medicines.length > 0) {
            medicinesHTML = prescriptionData.medicines.map(medicine => `
                <tr class="medicine-row">
                    <td class="medicine-name">${medicine.name}</td>
                    <td class="medicine-dose">${medicine.perDose || 'N/A'}</td>
                    <td class="medicine-frequency">${medicine.perDay || 'N/A'}</td>
                    <td class="medicine-duration">${medicine.days || 'N/A'}</td>
                </tr>
            `).join('');
        } else {
            medicinesHTML = `
                <tr class="medicine-row">
                    <td colspan="4" style="text-align: center; color: #666;">No medicines prescribed.</td>
                </tr>
            `;
        }
        
        // 처방전 정보 표시 - 테이블 형식으로 변경
        container.innerHTML = `
            <div class="prescription-payment-details" style="background-color:white; border-radius:8px; padding:20px; height:calc(100% - 40px); overflow-y:auto;">
                <table class="prescription-table">
                    <tr class="header-row">
                        <td colspan="4" class="title-cell">PRESCRIPTION</td>
                    </tr>
                    <tr>
                        <td colspan="2" class="issue-number">Issue No: ${formattedDate} No.00001</td>
                        <td rowspan="3" class="vertical-header">Medical<br>Facility</td>
                        <td>Name: ${hospitalInfo.name || hospitalName}</td>
                    </tr>
                    <tr>
                        <td rowspan="2" class="vertical-header">Patient</td>
                        <td>Name: ${patientId.split('.')[0]}</td>
                        <td>Phone: ${hospitalInfo.phone || 'N/A'}</td>
                    </tr>
                    <tr>
                        <td>ID Card: ${patientId.split('.')[1] || 'N/A'}</td>
                        <td>Fax: ${hospitalInfo.fax || 'N/A'}<br>Email: ${hospitalInfo.email || 'N/A'}</td>
                    </tr>
                    <tr>
                        <td colspan="2">License Name: ${prescriptionData.credential ? prescriptionData.credential.name : 'N/A'}</td>
                        <td colspan="2">License Number: ${prescriptionData.credential ? prescriptionData.credential.number : 'N/A'}</td>
                    </tr>
                    <tr class="medicine-header">
                        <td>Medicine Name</td>
                        <td>Dose</td>
                        <td>Frequency</td>
                        <td>Duration</td>
                    </tr>
                    ${medicinesHTML}
                    <tr>
                        <td colspan="4" class="usage-period">Usage Period: Valid for 3 days from issue date</td>
                    </tr>
                    <tr>
                        <td colspan="4" class="signature-area">
                            <div class="signature-line">
                                <span>Doctor's Signature:</span>
                                <div class="signature-box"></div>
                            </div>
                            <div class="date-line">
                                <span>Date:</span>
                                <span>${formattedDate}</span>
                            </div>
                        </td>
                    </tr>
                </table>
                
                <div class="payment-actions" style="margin-top:30px; text-align:center;">
                    <button class="payment-complete-btn" style="background-color:#4CAF50; color:white; border:none; padding:10px 20px; border-radius:4px; cursor:pointer; font-size:16px;">Complete Payment</button>
                </div>
            </div>
        `;
        
        // CSS 스타일 추가
        const style = document.createElement('style');
        style.textContent = `
            .prescription-table {
                width: 100%;
                border-collapse: collapse;
                border: 2px solid #000;
                margin-bottom: 20px;
                font-family: Arial, sans-serif;
            }
            
            .prescription-table td {
                border: 1px solid #000;
                padding: 8px;
                vertical-align: middle;
            }
            
            .title-cell {
                text-align: center;
                font-size: 24px;
                font-weight: bold;
                padding: 10px;
                background-color: #f0f0f0;
            }
            
            .vertical-header {
                width: 50px;
                text-align: center;
                font-weight: bold;
                background-color: #f0f0f0;
            }
            
            .issue-number {
                font-size: 14px;
            }
            
            .medicine-header td {
                font-weight: bold;
                text-align: center;
                background-color: #f0f0f0;
            }
            
            .medicine-row td {
                height: 30px;
            }
            
            .medicine-name {
                width: 40%;
            }
            
            .medicine-dose, .medicine-frequency, .medicine-duration {
                width: 20%;
                text-align: center;
            }
            
            .usage-period {
                font-size: 14px;
                background-color: #f0f0f0;
            }
            
            .signature-area {
                height: 80px;
                vertical-align: bottom;
            }
            
            .signature-line {
                display: flex;
                align-items: center;
                margin-bottom: 10px;
            }
            
            .signature-box {
                width: 200px;
                height: 40px;
                border-bottom: 1px solid #000;
                margin-left: 10px;
            }
            
            .date-line {
                display: flex;
                align-items: center;
            }
            
            .date-line span:first-child {
                margin-right: 10px;
            }
        `;
        document.head.appendChild(style);
        
        // 결제 완료 버튼 이벤트 리스너
        const paymentCompleteBtn = container.querySelector('.payment-complete-btn');
        if (paymentCompleteBtn) {
            paymentCompleteBtn.addEventListener('click', async () => {
                if (confirm('Mark this prescription as paid?')) {
                    try {
                        // 환자 상태 업데이트 (payment 컬렉션에서 제거)
                        const paymentRef = doc(db, 'hospitals', hospitalName, 'dates', formattedDate, 'payment', patientId);
                        await deleteDoc(paymentRef);
                        
                        alert('Payment completed successfully');
                        
                        // 컨테이너 초기화
                        container.innerHTML = `
                            <div class="payment-message" style="display:flex; justify-content:center; align-items:center; height:100%; color:#666;">
                                <p>Payment completed. Select another patient from the list.</p>
                            </div>
                        `;
                    } catch (error) {
                        console.error('Error completing payment:', error);
                        alert('Failed to complete payment: ' + error.message);
                    }
                }
            });
        }
    } catch (error) {
        console.error('Error loading prescription details:', error);
        container.innerHTML = `
            <div class="payment-message" style="display:flex; justify-content:center; align-items:center; height:100%; color:#666;">
                <p>Error loading prescription details: ${error.message}</p>
            </div>
        `;
    }
} 