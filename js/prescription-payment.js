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
        <div class="payment-message">
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
            container.innerHTML = `<div class="payment-message"><p>Patient information not found.</p></div>`;
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
            container.innerHTML = `<div class="payment-message"><p>No registration found for this patient today.</p></div>`;
            return;
        }
        
        // 가장 최근 문서 사용
        const registerDateDoc = registerDateSnapshot.docs[0];
        const registerData = registerDateDoc.data();
        
        // prescription 필드가 없는 경우
        if (!registerData.prescription) {
            container.innerHTML = `
                <div class="payment-message">
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
            <div class="prescription-payment-details">
                <!-- 처방전 메인 테이블 -->
                <table class="prescription-table">
                    <!-- 제목 행 -->
                    <tr>
                        <td colspan="6" class="prescription-title">PRESCRIPTION</td>
                    </tr>
                    
                    <!-- Issue No 행 -->
                    <tr>
                        <td class="table-header" style="width:15%;">Issue No</td>
                        <td colspan="5" class="table-data">${formattedDate} No.00001</td>
                    </tr>
                    
                    <!-- 환자 및 병원 정보 행 -->
                    <tr>
                        <td class="table-header" style="width:15%;" rowspan="2">Patient</td>
                        <td class="table-label" style="width:15%;">Name</td>
                        <td class="table-data" style="width:20%;">${patientId.split('.')[0]}</td>
                        <td class="table-header" style="width:15%;" rowspan="4">Hospital</td>
                        <td class="table-label" style="width:15%;">Name</td>
                        <td class="table-data" style="width:20%;">${hospitalInfo.name || hospitalName}</td>
                    </tr>
                    
                    <tr>
                        <td class="table-label">ID</td>
                        <td class="table-data">${patientId.split('.')[1] || 'N/A'}</td>
                        <td class="table-label">Phone</td>
                        <td class="table-data">${hospitalInfo.phone || 'N/A'}</td>
                    </tr>
                    
                    <tr>
                        <td class="table-header" rowspan="2">License</td>
                        <td class="table-label">Name</td>
                        <td class="table-data">${prescriptionData.credential ? prescriptionData.credential.name : 'N/A'}</td>
                        <td class="table-label">Fax</td>
                        <td class="table-data">${hospitalInfo.fax || 'N/A'}</td>
                    </tr>
                    
                    <tr>
                        <td class="table-label">Number</td>
                        <td class="table-data">${prescriptionData.credential ? prescriptionData.credential.number : 'N/A'}</td>
                        <td class="table-label">Email</td>
                        <td class="table-data">${hospitalInfo.email || 'N/A'}</td>
                    </tr>
                    
                    <!-- 의사와 서명 행 -->
                    <tr>
                        <td class="table-header">Doctor</td>
                        <td class="table-data" colspan="2">${doctorName}</td>
                        <td class="table-header">Doctor's Signature</td>
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
                    ${prescriptionData.medicines && prescriptionData.medicines.length > 0 ? 
                        prescriptionData.medicines.map(medicine => `
                            <tr>
                                <td class="medicines-data">${medicine.name}</td>
                                <td class="medicines-data">${medicine.perDose || 'N/A'}</td>
                                <td class="medicines-data">${medicine.perDay || 'N/A'}</td>
                                <td class="medicines-data">${medicine.days || 'N/A'}</td>
                            </tr>
                        `).join('') : 
                        `<tr><td colspan="4" class="medicines-data" style="text-align:center;">No medicines prescribed.</td></tr>`
                    }
                </table>
                
                <!-- 사용 기간 테이블 -->
                <table class="usage-table">
                    <tr>
                        <td class="table-header" style="width:30%;">Usage Period</td>
                        <td class="table-data">Valid for 3 days from issue date</td>
                    </tr>
                </table>
            </div>
            
            <!-- 하단 고정 Footer -->
            <div class="prescription-footer">
                <button class="print-btn"></button>
                <button class="payment-complete-btn">
                    Complete Payment
                </button>
            </div>
        `;
        
        // 결제 완료 버튼 이벤트 리스너 추가
        const paymentCompleteBtn = container.querySelector('.payment-complete-btn');
        if (paymentCompleteBtn) {
            paymentCompleteBtn.addEventListener('click', () => completePayment(patientId));
        }
        
        // 프린트 버튼 이벤트 리스너 추가
        const printBtn = container.querySelector('.print-btn');
        if (printBtn) {
            printBtn.addEventListener('click', () => {
                const prescriptionContent = container.querySelector('.prescription-payment-details');
                const originalContents = document.body.innerHTML;
                const printContents = prescriptionContent.innerHTML;
                
                // 프린트용 스타일 추가
                document.body.innerHTML = `
                    <div class="print-container">
                        ${printContents}
                    </div>
                    <style>
                        .print-container {
                            padding: 20px;
                        }
                        @media print {
                            body {
                                padding: 0;
                                margin: 0;
                            }
                            .print-container {
                                width: 100%;
                            }
                        }
                    </style>
                `;
                
                window.print();
                document.body.innerHTML = originalContents;
                
                // 이벤트 리스너 재설정
                const newPaymentBtn = container.querySelector('.payment-complete-btn');
                if (newPaymentBtn) {
                    newPaymentBtn.addEventListener('click', () => completePayment(patientId));
                }
                
                const newPrintBtn = container.querySelector('.print-btn');
                if (newPrintBtn) {
                    newPrintBtn.addEventListener('click', () => {
                        const prescriptionContent = container.querySelector('.prescription-payment-details');
                        const originalContents = document.body.innerHTML;
                        const printContents = prescriptionContent.innerHTML;
                        
                        // 프린트용 스타일 추가
                        document.body.innerHTML = `
                            <div class="print-container">
                                ${printContents}
                            </div>
                            <style>
                                .print-container {
                                    padding: 20px;
                                }
                                @media print {
                                    body {
                                        padding: 0;
                                        margin: 0;
                                    }
                                    .print-container {
                                        width: 100%;
                                    }
                                }
                            </style>
                        `;
                        
                        window.print();
                        document.body.innerHTML = originalContents;
                        
                        // 이벤트 리스너 재설정
                        initializePrescriptionPayment();
                    });
                }
            });
        }
    } catch (error) {
        console.log('Error loading prescription details:', error);
        container.innerHTML = `<div class="payment-message"><p>Error loading prescription details: ${error.message}</p></div>`;
    }
}

// 결제 완료 함수
async function completePayment(patientId) {
    if (confirm('Mark this prescription as paid?')) {
        try {
            const [hospitalName] = auth.currentUser.email.split('@')[0].split('.');
            
            // 오늘 날짜 가져오기
            const today = new Date();
            const formattedDate = today.toLocaleDateString('en-GB', {
                day: '2-digit',
                month: 'short',
                year: 'numeric'
            }).replace(/ /g, '.');
            
            // 환자 상태 업데이트 (payment 컬렉션에서 제거)
            const paymentRef = doc(db, 'hospitals', hospitalName, 'dates', formattedDate, 'payment', patientId);
            await deleteDoc(paymentRef);
            
            alert('Payment completed successfully');
            
            // 컨테이너 초기화
            const container = document.querySelector('#desk-content-right .content-body');
            container.innerHTML = `
                <div class="payment-message">
                    <p>Payment completed. Select another patient from the list.</p>
                </div>
            `;
        } catch (error) {
            console.error('Error completing payment:', error);
            alert('Failed to complete payment: ' + error.message);
        }
    }
} 
