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
        
        // 약품 목록 HTML 생성 - 수정된 부분
        let medicinesHTML = '';
        if (prescriptionData.medicines && prescriptionData.medicines.length > 0) {
            medicinesHTML = `
                <div class="medicines-section" style="margin-top:20px; border-top:1px solid #eee; padding-top:15px;">
                    <h3 style="margin:0 0 10px 0; color:#333; font-size:16px;">Prescribed Medicines</h3>
                    <ul style="list-style:none; padding:0; margin:0;">
                        ${prescriptionData.medicines.map(medicine => `
                            <li style="margin-bottom:10px; padding:8px; background-color:#f9f9f9; border-radius:4px;">
                                <div style="font-weight:bold;">${medicine.name}</div>
                                <div style="display:flex; font-size:13px; color:#555; margin-top:5px;">
                                    <span style="margin-right:15px;">Dose: ${medicine.perDose}</span>
                                    <span style="margin-right:15px;">Frequency: ${medicine.perDay}</span>
                                    <span>Duration: ${medicine.days}</span>
                                </div>
                            </li>
                        `).join('')}
                    </ul>
                </div>
            `;
        } else {
            medicinesHTML = `<p style="color:#666; margin-top:15px;">No medicines prescribed.</p>`;
        }
        
        // 디버깅을 위해 처방전 데이터 구조 확인
        console.log('Prescription Data:', prescriptionData);
        
        // 처방전 정보 표시
        container.innerHTML = `
            <div class="prescription-payment-details" style="background-color:white; border-radius:8px; padding:20px; height:calc(100% - 40px); overflow-y:auto;">
                <div class="prescription-header" style="border-bottom:1px solid #eee; padding-bottom:15px; margin-bottom:20px;">
                    <h2 style="margin:0 0 10px 0; color:#333; font-size:20px;">Prescription Details</h2>
                    <p class="prescription-date" style="color:#666; font-size:14px; margin:0;">Date: ${formattedDate}</p>
                </div>
                
                <div class="patient-details" style="margin-bottom:20px;">
                    <div class="detail-row" style="display:flex; margin-bottom:8px;">
                        <span class="detail-label" style="width:150px; font-weight:bold; color:#555;">Patient Name:</span>
                        <span class="detail-value">${patientId.split('.')[0]}</span>
                    </div>
                    <div class="detail-row" style="display:flex; margin-bottom:8px;">
                        <span class="detail-label" style="width:150px; font-weight:bold; color:#555;">Age:</span>
                        <span class="detail-value">${age} years</span>
                    </div>
                    <div class="detail-row" style="display:flex; margin-bottom:8px;">
                        <span class="detail-label" style="width:150px; font-weight:bold; color:#555;">ID Card Number:</span>
                        <span class="detail-value">${patientId.split('.')[1] || 'N/A'}</span>
                    </div>
                    <div class="detail-row" style="display:flex; margin-bottom:8px;">
                        <span class="detail-label" style="width:150px; font-weight:bold; color:#555;">Doctor:</span>
                        <span class="detail-value">${registerData.doctor || 'N/A'}</span>
                    </div>
                </div>
                
                ${medicinesHTML}
                
                <div class="payment-actions" style="margin-top:30px; text-align:center;">
                    <button class="payment-complete-btn" style="background-color:#4CAF50; color:white; border:none; padding:10px 20px; border-radius:4px; cursor:pointer; font-size:16px;">Complete Payment</button>
                </div>
            </div>
        `;
        
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