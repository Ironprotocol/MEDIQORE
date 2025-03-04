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
        
        // 디버깅을 위한 로그
        console.log('처방전 데이터:', prescriptionData);
        console.log('의사 정보:', registerData.doctor);
        
        // 병원 정보 가져오기
        const hospitalRef = doc(db, 'hospitals', hospitalName);
        const hospitalDoc = await getDoc(hospitalRef);
        let hospitalInfo = {};
        
        if (hospitalDoc.exists()) {
            hospitalInfo = hospitalDoc.data().info || {};
        }
        
        // 의사 이름 가져오기
        const doctorName = registerData.doctor || 'N/A';
        
        // 약품 목록 HTML 생성
        let medicinesHTML = '';
        if (prescriptionData.medicines && prescriptionData.medicines.length > 0) {
            medicinesHTML = prescriptionData.medicines.map(medicine => `
                <tr class="medicine-row">
                    <td>${medicine.name}</td>
                    <td>${medicine.perDose || 'N/A'}</td>
                    <td>${medicine.perDay || 'N/A'}</td>
                    <td>${medicine.days || 'N/A'}</td>
                </tr>
            `).join('');
        } else {
            medicinesHTML = `
                <tr class="medicine-row">
                    <td colspan="4" style="text-align: center;">No medicines prescribed.</td>
                </tr>
            `;
        }
        
        // 처방전 정보 표시 - 테이블 형식으로 변경
        container.innerHTML = `
            <div class="prescription-payment-details" style="background-color:white; border-radius:8px; padding:20px; height:calc(100% - 40px); overflow-y:auto;">
                <table class="prescription-table">
                    <tr>
                        <td colspan="2" class="title-cell">PRESCRIPTION</td>
                    </tr>
                    <tr>
                        <td class="label-cell">Issue No</td>
                        <td class="value-cell">${formattedDate} No.00001</td>
                    </tr>
                    <tr>
                        <td class="label-cell">Hospital Name</td>
                        <td class="value-cell">${hospitalInfo.name || hospitalName}</td>
                    </tr>
                    <tr>
                        <td class="label-cell">Hospital Phone</td>
                        <td class="value-cell">${hospitalInfo.phone || 'N/A'}</td>
                    </tr>
                    <tr>
                        <td class="label-cell">Hospital Fax</td>
                        <td class="value-cell">${hospitalInfo.fax || 'N/A'}</td>
                    </tr>
                    <tr>
                        <td class="label-cell">Hospital Email</td>
                        <td class="value-cell">${hospitalInfo.email || 'N/A'}</td>
                    </tr>
                    <tr>
                        <td class="label-cell">Patient Name</td>
                        <td class="value-cell">${patientId.split('.')[0]}</td>
                    </tr>
                    <tr>
                        <td class="label-cell">Patient ID</td>
                        <td class="value-cell">${patientId.split('.')[1] || 'N/A'}</td>
                    </tr>
                    <tr>
                        <td class="label-cell">Doctor</td>
                        <td class="value-cell">${doctorName}</td>
                    </tr>
                    <tr>
                        <td class="label-cell">License Name</td>
                        <td class="value-cell">${prescriptionData.credential ? prescriptionData.credential.name : 'N/A'}</td>
                    </tr>
                    <tr>
                        <td class="label-cell">License Number</td>
                        <td class="value-cell">${prescriptionData.credential ? prescriptionData.credential.number : 'N/A'}</td>
                    </tr>
                </table>

                <table class="prescription-table medicine-table">
                    <tr>
                        <td class="label-cell">Medicine Name</td>
                        <td class="label-cell">Dose</td>
                        <td class="label-cell">Frequency</td>
                        <td class="label-cell">Duration</td>
                    </tr>
                    ${medicinesHTML}
                </table>

                <table class="prescription-table">
                    <tr>
                        <td class="label-cell">Usage Period</td>
                        <td class="value-cell">Valid for 3 days from issue date</td>
                    </tr>
                    <tr>
                        <td class="label-cell">Doctor's Signature</td>
                        <td class="value-cell"><div class="signature-box"></div></td>
                    </tr>
                    <tr>
                        <td class="label-cell">Date</td>
                        <td class="value-cell">${formattedDate}</td>
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
                border: 2px solid rgb(0, 102, 255);
                margin-bottom: 20px;
                font-family: Arial, sans-serif;
            }
            
            .prescription-table td {
                border: 1px solid rgb(0, 102, 255);
                padding: 8px;
                vertical-align: middle;
            }
            
            .title-cell {
                text-align: center;
                font-size: 24px;
                font-weight: bold;
                padding: 10px;
                background-color: rgb(211, 228, 255);
            }
            
            .label-cell {
                font-size: 14px;
                font-weight: bold;
                background-color: rgb(211, 228, 255);
                width: 150px;
            }
            
            .value-cell {
                font-size: 12px;
            }
            
            .medicine-table .label-cell {
                width: auto;
            }
            
            .medicine-row td {
                font-size: 12px;
                padding: 8px;
                background-color: white;
            }
            
            .signature-box {
                width: 200px;
                height: 40px;
                border-bottom: 1px solid #000;
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