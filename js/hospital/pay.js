// 결제 모달 관련 기능
import { auth, db, doc, getDoc, setDoc, updateDoc, deleteDoc, collection, getDocs, serverTimestamp } from '../firebase-config.js';

// 결제 모달 표시 함수
export function showPaymentModal(patientId, registerDate, amount, allowEdit = false) {
    // 결제 컨테이너 생성
    const modalContainer = document.createElement('div');
    modalContainer.className = 'payment-modal-container';
    
    // 결제 모달 내용
    modalContainer.innerHTML = `
        <div class="payment-modal">
            <div class="payment-modal-header">
                <h3>Payment</h3>
                <button class="payment-modal-close">&times;</button>
            </div>
            <div class="payment-modal-body">
                <div class="payment-amount">
                    <h4>Total Amount</h4>
                    ${allowEdit ? 
                        `<input type="number" class="payment-amount-input" placeholder="Suggested: ${amount ? amount.toLocaleString() : '0'} KRW">` : 
                        `<p class="payment-amount-value">${amount ? amount.toLocaleString() : '0'} KRW</p>`
                    }
                </div>
                
                <div class="payment-method-selection">
                    <h4>Payment Method</h4>
                    <div class="payment-method-options">
                        <button class="payment-method-btn" data-method="card">Card</button>
                        <button class="payment-method-btn" data-method="cash">Cash</button>
                    </div>
                </div>
                
                <div class="payment-method-details card-payment" style="display: none;">
                    <div class="card-payment-simulate">
                        <p>Please swipe card or enter card information</p>
                        <input type="text" class="card-number-input" placeholder="Card Number" maxlength="19">
                        <select class="card-company-select">
                            <option value="">Select Card Company</option>
                            <option value="Visa">Visa</option>
                            <option value="MasterCard">MasterCard</option>
                            <option value="Amex">American Express</option>
                            <option value="Shinhan">Shinhan Card</option>
                            <option value="Samsung">Samsung Card</option>
                            <option value="KB">KB Card</option>
                            <option value="Hyundai">Hyundai Card</option>
                            <option value="Lotte">Lotte Card</option>
                            <option value="BC">BC Card</option>
                            <option value="Hana">Hana Card</option>
                        </select>
                        <button class="card-payment-process">Process Card Payment</button>
                    </div>
                    <div class="card-payment-status" style="display: none;">
                        <div class="card-payment-loader"></div>
                        <p class="card-payment-status-text">Processing payment...</p>
                    </div>
                </div>
                
                <div class="payment-method-details cash-payment" style="display: none;">
                    <div class="cash-payment-form">
                        <div class="cash-amount-input-group">
                            <label>Received Amount (KRW)</label>
                            <input type="number" class="cash-amount-input" placeholder="Enter received amount">
                        </div>
                        <div class="cash-change-group" style="display: none;">
                            <label>Change</label>
                            <p class="cash-change-amount">0 KRW</p>
                        </div>
                        <button class="cash-payment-process">Process Cash Payment</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modalContainer);
    
    // 이벤트 리스너 설정
    setupPaymentModalListeners(modalContainer, patientId, registerDate, amount);
    
    // 모달이 추가된 후 opacity 조정하여 애니메이션 적용
    setTimeout(() => {
        modalContainer.style.opacity = '1';
        modalContainer.style.visibility = 'visible';
    }, 10);
    
    // 사용자 입력 필드에 포커스
    if (allowEdit) {
        const inputField = modalContainer.querySelector('.payment-amount-input');
        if (inputField) {
            setTimeout(() => inputField.focus(), 100);
        }
    }
    
    return modalContainer;
}

// 결제 모달 이벤트 리스너 설정
function setupPaymentModalListeners(modalContainer, patientId, registerDate, suggestedAmount) {
    // 닫기 버튼
    modalContainer.querySelector('.payment-modal-close').addEventListener('click', () => {
        document.body.removeChild(modalContainer);
    });
    
    // 현재 금액 값 가져오기 함수
    const getCurrentAmount = () => {
        const amountInput = modalContainer.querySelector('.payment-amount-input');
        if (amountInput) {
            return parseFloat(amountInput.value) || suggestedAmount;
        }
        return suggestedAmount;
    };
    
    // 결제 방법 선택 버튼
    modalContainer.querySelectorAll('.payment-method-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            // 모든 버튼에서 selected 클래스 제거
            modalContainer.querySelectorAll('.payment-method-btn').forEach(b => {
                b.classList.remove('selected');
            });
            
            // 현재 버튼에 selected 클래스 추가
            btn.classList.add('selected');
            
            // 결제 방법에 따른 세부 섹션 표시
            const method = btn.dataset.method;
            modalContainer.querySelectorAll('.payment-method-details').forEach(detail => {
                detail.style.display = 'none';
            });
            
            modalContainer.querySelector(`.${method}-payment`).style.display = 'block';
        });
    });
    
    // 현금 결제 금액 입력 처리
    const cashAmountInput = modalContainer.querySelector('.cash-amount-input');
    cashAmountInput.addEventListener('input', () => {
        const amount = getCurrentAmount();
        const receivedAmount = parseFloat(cashAmountInput.value) || 0;
        const changeGroup = modalContainer.querySelector('.cash-change-group');
        const changeAmount = modalContainer.querySelector('.cash-change-amount');
        
        if (receivedAmount >= amount) {
            changeGroup.style.display = 'block';
            const change = receivedAmount - amount;
            changeAmount.textContent = `${change.toLocaleString()} KRW`;
        } else {
            changeGroup.style.display = 'none';
        }
    });
    
    // 카드 번호 입력 포맷팅 (4자리마다 공백)
    const cardNumberInput = modalContainer.querySelector('.card-number-input');
    cardNumberInput.addEventListener('input', (e) => {
        let value = e.target.value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
        let formattedValue = '';
        
        for (let i = 0; i < value.length; i++) {
            if (i > 0 && i % 4 === 0) {
                formattedValue += ' ';
            }
            formattedValue += value[i];
        }
        
        e.target.value = formattedValue;
    });
    
    // 카드 결제 처리 버튼
    modalContainer.querySelector('.card-payment-process').addEventListener('click', async () => {
        const amount = getCurrentAmount();
        const cardNumber = modalContainer.querySelector('.card-number-input').value.trim();
        const cardCompany = modalContainer.querySelector('.card-company-select').value;
        
        if (!cardNumber) {
            alert('Please enter card number');
            return;
        }
        
        if (!cardCompany) {
            alert('Please select card company');
            return;
        }
        
        // 카드 결제 진행 UI 표시
        modalContainer.querySelector('.card-payment-simulate').style.display = 'none';
        modalContainer.querySelector('.card-payment-status').style.display = 'block';
        
        try {
            // 결제 정보 객체
            const paymentInfo = {
                method: 'card',
                amount: amount,
                cardNumber: maskCardNumber(cardNumber),
                cardCompany: cardCompany,
                approvalNumber: generateApprovalNumber(),
                timestamp: new Date()
            };
            
            // payment → complete 상태 변경 처리
            await processPaymentCompletion(patientId, registerDate, paymentInfo);
            
            // 성공적인 결제 처리 UI 표시
            showPaymentSuccessUI(modalContainer, paymentInfo);
            
            // 3초 후 모달 닫기
            setTimeout(() => {
                if (document.body.contains(modalContainer)) {
                    document.body.removeChild(modalContainer);
                }
            }, 3000);
        } catch (error) {
            console.error('Payment processing error:', error);
            alert('Payment processing failed: ' + error.message);
            
            // 에러 발생 시 카드 결제 입력 화면으로 되돌리기
            modalContainer.querySelector('.card-payment-simulate').style.display = 'block';
            modalContainer.querySelector('.card-payment-status').style.display = 'none';
        }
    });
    
    // 현금 결제 처리 버튼
    modalContainer.querySelector('.cash-payment-process').addEventListener('click', async () => {
        const amount = getCurrentAmount();
        const receivedAmount = parseFloat(modalContainer.querySelector('.cash-amount-input').value) || 0;
        
        if (receivedAmount < amount) {
            alert('Received amount must be equal or greater than the payment amount');
            return;
        }
        
        try {
            // 결제 정보 객체
            const paymentInfo = {
                method: 'cash',
                amount: amount,
                receivedAmount: receivedAmount,
                change: receivedAmount - amount,
                timestamp: new Date()
            };
            
            // payment → complete 상태 변경 처리
            await processPaymentCompletion(patientId, registerDate, paymentInfo);
            
            // 성공적인 결제 처리 UI 표시
            showPaymentSuccessUI(modalContainer, paymentInfo);
            
            // 3초 후 모달 닫기
            setTimeout(() => {
                if (document.body.contains(modalContainer)) {
                    document.body.removeChild(modalContainer);
                }
            }, 3000);
        } catch (error) {
            console.error('Payment processing error:', error);
            alert('Payment processing failed: ' + error.message);
        }
    });
}

// 카드번호 마스킹 처리 (중간 8자리 마스킹)
function maskCardNumber(cardNumber) {
    const cardNumberClean = cardNumber.replace(/\s+/g, '');
    if (cardNumberClean.length < 13) return cardNumberClean;
    
    const firstPart = cardNumberClean.substring(0, 4);
    const lastPart = cardNumberClean.substring(cardNumberClean.length - 4);
    
    return `${firstPart}********${lastPart}`;
}

// 승인번호 생성
function generateApprovalNumber() {
    return Math.floor(10000000 + Math.random() * 90000000).toString();
}

// 결제 완료 UI 표시
function showPaymentSuccessUI(modalContainer, paymentData) {
    const modalBody = modalContainer.querySelector('.payment-modal-body');
    
    // 결제 방법에 따른 상세 내용 생성
    let detailsHTML = '';
    if (paymentData.method === 'card') {
        detailsHTML = `
            <p><strong>Amount:</strong> ${paymentData.amount.toLocaleString()} KRW</p>
            <p><strong>Card Number:</strong> ${paymentData.cardNumber}</p>
            <p><strong>Card Company:</strong> ${paymentData.cardCompany}</p>
            <p><strong>Approval Number:</strong> ${paymentData.approvalNumber}</p>
        `;
    } else if (paymentData.method === 'cash') {
        detailsHTML = `
            <p><strong>Amount:</strong> ${paymentData.amount.toLocaleString()} KRW</p>
            <p><strong>Received:</strong> ${paymentData.receivedAmount.toLocaleString()} KRW</p>
            <p><strong>Change:</strong> ${paymentData.change.toLocaleString()} KRW</p>
        `;
    }
    
    // 결제 성공 UI로 교체
    modalBody.innerHTML = `
        <div class="payment-success">
            <div class="payment-success-icon">✓</div>
            <h3>Payment Successful!</h3>
            <div class="payment-success-details">
                ${detailsHTML}
                <p><strong>Method:</strong> ${paymentData.method === 'card' ? 'Card Payment' : 'Cash Payment'}</p>
            </div>
        </div>
    `;
}

// payment → complete 상태 변경 처리 함수
async function processPaymentCompletion(patientId, registerDate, paymentInfo) {
    try {
        const [hospitalName] = auth.currentUser.email.split('@')[0].split('.');
        
        // 오늘 날짜 가져오기
        const today = new Date();
        const formattedDate = today.toLocaleDateString('en-GB', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        }).replace(/ /g, '.');
        
        // 1. register.date 문서 업데이트 - 정확한 registerDate ID 사용
        const registerDocRef = doc(db, 'hospitals', hospitalName, 'patient', patientId, 'register.date', registerDate);
        
        // 문서가 존재하는지 확인
        const registerDocSnap = await getDoc(registerDocRef);
        if (!registerDocSnap.exists()) {
            console.error(`Register document not found at path: ${registerDocRef.path}`);
            throw new Error(`Register document not found: ${registerDocRef.path}`);
        }
        
        // 문서 업데이트
        await updateDoc(registerDocRef, {
            progress: 'complete',
            payment: paymentInfo
        });
        
        // 2. 환자 정보 가져오기 (payment 컬렉션에서)
        const paymentRef = doc(db, 'hospitals', hospitalName, 'dates', formattedDate, 'payment', patientId);
        const paymentDoc = await getDoc(paymentRef);
        
        if (!paymentDoc.exists()) {
            console.error(`Payment document not found at path: ${paymentRef.path}`);
            throw new Error('Patient payment record not found');
        }
        
        const patientData = paymentDoc.data();
        
        // 3. complete 컬렉션에 환자 데이터 생성
        const completeRef = doc(db, 'hospitals', hospitalName, 'dates', formattedDate, 'complete', patientId);
        
        await setDoc(completeRef, {
            ...patientData,
            progress: 'complete',  // 명시적으로 progress 설정
            completeTime: serverTimestamp(),
            payment: paymentInfo
        });
        
        // 4. payment 문서 삭제
        await deleteDoc(paymentRef);
        
        // 5. treatment.room의 patients 배열 업데이트
        const roomsRef = collection(db, 'hospitals', hospitalName, 'treatment.room');
        const roomsSnapshot = await getDocs(roomsRef);
        
        let roomUpdated = false;
        
        for (const roomDoc of roomsSnapshot.docs) {
            const roomData = roomDoc.data();
            if (roomData.patients && roomData.patients.some(patient => patient.id === patientId)) {
                const updatedPatients = roomData.patients.map(patient => {
                    if (patient.id === patientId) {
                        // 진료실에서 환자 업데이트
                        return {
                            ...patient,
                            progress: 'complete'
                        };
                    }
                    return patient;
                });
                
                await updateDoc(roomDoc.ref, { patients: updatedPatients });
                roomUpdated = true;
                break;
            }
        }
        
        // 6. 확인을 위해 업데이트된 문서 가져오기
        const updatedRegisterDoc = await getDoc(registerDocRef);
        const updatedCompleteDoc = await getDoc(completeRef);
        
        return true;
    } catch (error) {
        console.error('Error processing payment completion:', error);
        throw error;
    }
}
