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
        
        // 처방전 정보 표시 - 테이블 형식으로 변경
        container.innerHTML = `
            <div class="prescription-payment-details" style="background-color:white; border-radius:8px; padding:20px; height:calc(100% - 40px); overflow-y:auto;">
                <!-- 처방전 메인 테이블 -->
                <table style="width:100%; border-collapse:collapse; border:2px solid #000; margin-bottom:20px;">
                    <!-- 제목 행 -->
                    <tr>
                        <td colspan="6" style="text-align:center; font-size:18px; font-weight:bold; padding:10px; border-bottom:2px solid #000;">PRESCRIPTION</td>
                    </tr>
                    
                    <!-- Issue No 행 -->
                    <tr>
                        <td style="width:15%; padding:8px; border:1px solid #000; font-weight:bold; background-color:#f5f5f5; font-size:14px;">Issue No</td>
                        <td colspan="5" style="padding:8px; border:1px solid #000; font-size:12px;">${formattedDate} No.00001</td>
                    </tr>
                    
                    <!-- 환자 및 병원 정보 행 -->
                    <tr>
                        <td style="width:15%; padding:8px; border:1px solid #000; font-weight:bold; background-color:#f5f5f5; font-size:14px;" rowspan="2">Patient</td>
                        <td style="width:15%; padding:8px; border:1px solid #000; font-weight:bold; font-size:14px; text-align:center;">Name</td>
                        <td style="width:20%; padding:8px; border:1px solid #000; font-size:12px;">${patientId.split('.')[0]}</td>
                        <td style="width:15%; padding:8px; border:1px solid #000; font-weight:bold; background-color:#f5f5f5; font-size:14px;" rowspan="4">Hospital</td>
                        <td style="width:15%; padding:8px; border:1px solid #000; font-weight:bold; font-size:14px; text-align:center;">Name</td>
                        <td style="width:20%; padding:8px; border:1px solid #000; font-size:12px;">${hospitalInfo.name || hospitalName}</td>
                    </tr>
                    
                    <tr>
                        <td style="padding:8px; border:1px solid #000; font-weight:bold; font-size:14px; text-align:center;">ID</td>
                        <td style="padding:8px; border:1px solid #000; font-size:12px;">${patientId.split('.')[1] || 'N/A'}</td>
                        <td style="padding:8px; border:1px solid #000; font-weight:bold; font-size:14px; text-align:center;">Phone</td>
                        <td style="padding:8px; border:1px solid #000; font-size:12px;">${hospitalInfo.phone || 'N/A'}</td>
                    </tr>
                    
                    <tr>
                        <td style="padding:8px; border:1px solid #000; font-weight:bold; background-color:#f5f5f5; font-size:14px;" rowspan="2">License</td>
                        <td style="padding:8px; border:1px solid #000; font-weight:bold; font-size:14px; text-align:center;">Name</td>
                        <td style="padding:8px; border:1px solid #000; font-size:12px;">${prescriptionData.credential ? prescriptionData.credential.name : 'N/A'}</td>
                        <td style="padding:8px; border:1px solid #000; font-weight:bold; font-size:14px; text-align:center;">Fax</td>
                        <td style="padding:8px; border:1px solid #000; font-size:12px;">${hospitalInfo.fax || 'N/A'}</td>
                    </tr>
                    
                    <tr>
                        <td style="padding:8px; border:1px solid #000; font-weight:bold; font-size:14px; text-align:center;">Number</td>
                        <td style="padding:8px; border:1px solid #000; font-size:12px;">${prescriptionData.credential ? prescriptionData.credential.number : 'N/A'}</td>
                        <td style="padding:8px; border:1px solid #000; font-weight:bold; font-size:14px; text-align:center;">Email</td>
                        <td style="padding:8px; border:1px solid #000; font-size:12px;">${hospitalInfo.email || 'N/A'}</td>
                    </tr>
                    
                    <!-- 의사와 서명 행 -->
                    <tr>
                        <td style="padding:8px; border:1px solid #000; font-weight:bold; background-color:#f5f5f5; font-size:14px;">Doctor</td>
                        <td style="padding:8px; border:1px solid #000; font-size:12px;" colspan="2">${doctorName}</td>
                        <td style="padding:8px; border:1px solid #000; font-weight:bold; background-color:#f5f5f5; font-size:14px;">Doctor's Signature</td>
                        <td style="padding:8px; border:1px solid #000; height:40px;" colspan="2"></td>
                    </tr>
                </table>
                
                <!-- 약품 정보 테이블 -->
                <table style="width:100%; border-collapse:collapse; border:2px solid #000; margin-bottom:20px;">
                    <tr>
                        <td colspan="4" style="text-align:center; font-weight:bold; padding:8px; border-bottom:2px solid #000; background-color:#f5f5f5; font-size:14px;">MEDICINES</td>
                    </tr>
                    <tr>
                        <td style="width:40%; padding:8px; border:1px solid #000; font-weight:bold; background-color:#f5f5f5; font-size:14px;">Medicine Name</td>
                        <td style="width:20%; padding:8px; border:1px solid #000; font-weight:bold; background-color:#f5f5f5; font-size:14px;">Dose</td>
                        <td style="width:20%; padding:8px; border:1px solid #000; font-weight:bold; background-color:#f5f5f5; font-size:14px;">Frequency</td>
                        <td style="width:20%; padding:8px; border:1px solid #000; font-weight:bold; background-color:#f5f5f5; font-size:14px;">Duration</td>
                    </tr>
                    ${prescriptionData.medicines && prescriptionData.medicines.length > 0 ? 
                        prescriptionData.medicines.map(medicine => `
                            <tr>
                                <td style="padding:8px; border:1px solid #000; font-size:12px;">${medicine.name}</td>
                                <td style="padding:8px; border:1px solid #000; font-size:12px;">${medicine.perDose || 'N/A'}</td>
                                <td style="padding:8px; border:1px solid #000; font-size:12px;">${medicine.perDay || 'N/A'}</td>
                                <td style="padding:8px; border:1px solid #000; font-size:12px;">${medicine.days || 'N/A'}</td>
                            </tr>
                        `).join('') : 
                        `<tr><td colspan="4" style="text-align:center; padding:8px; border:1px solid #000; font-size:12px;">No medicines prescribed.</td></tr>`
                    }
                </table>
                
                <!-- 사용 기간 테이블 -->
                <table style="width:100%; border-collapse:collapse; border:2px solid #000;">
                    <tr>
                        <td style="width:30%; padding:8px; border:1px solid #000; font-weight:bold; background-color:#f5f5f5; font-size:14px;">Usage Period</td>
                        <td style="padding:8px; border:1px solid #000; font-size:12px;">Valid for 3 days from issue date</td>
                    </tr>
                </table>
                
                <div class="payment-actions" style="margin-top:30px; text-align:center;">
                    <button class="payment-complete-btn" style="background-color:#4CAF50; color:white; border:none; padding:10px 20px; border-radius:4px; cursor:pointer; font-size:16px;">Complete Payment</button>
                </div>
            </div>
        `;
        
        // 결제 완료 버튼 이벤트 리스너 추가
        const paymentCompleteBtn = container.querySelector('.payment-complete-btn');
        if (paymentCompleteBtn) {
            paymentCompleteBtn.addEventListener('click', () => completePayment(patientId));
        }
    } catch (error) {
        console.log('Error loading prescription details:', error);
        container.innerHTML = `<div class="payment-message" style="display:flex; justify-content:center; align-items:center; height:100%; color:#666;"><p>Error loading prescription details: ${error.message}</p></div>`;
    }
}

// 결제 완료 함수
async function completePayment(patientId) {
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
} 
