// 결제 모달 관련 기능
import { auth, db, doc, getDoc } from '../firebase-config.js';

// 결제 모달 표시 함수
export function showPaymentModal(patientId, registerDate, amount) {
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
                    <p class="payment-amount-value">${amount ? amount.toLocaleString() : '0'} KRW</p>
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
            <div class="payment-modal-footer">
                <button class="payment-cancel-btn">Cancel</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modalContainer);
    
    // 이벤트 리스너 설정
    setupPaymentModalListeners(modalContainer, patientId, registerDate, amount);
    
    return modalContainer;
}

// 결제 모달 이벤트 리스너 설정
function setupPaymentModalListeners(modalContainer, patientId, registerDate, amount) {
    // 닫기 버튼
    modalContainer.querySelector('.payment-modal-close').addEventListener('click', () => {
        document.body.removeChild(modalContainer);
    });
    
    // 취소 버튼
    modalContainer.querySelector('.payment-cancel-btn').addEventListener('click', () => {
        document.body.removeChild(modalContainer);
    });
    
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
    modalContainer.querySelector('.card-payment-process').addEventListener('click', () => {
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
        
        // 여기서는 실제 결제 처리를 시뮬레이션만 하고, 실제 Firebase 저장 등은 하지 않음
        setTimeout(() => {
            // 성공적인 결제 처리 시뮬레이션
            showPaymentSuccessUI(modalContainer, {
                method: 'card',
                amount: amount,
                cardNumber: maskCardNumber(cardNumber),
                cardCompany: cardCompany,
                approvalNumber: generateApprovalNumber()
            });
            
            // 3초 후 모달 닫기
            setTimeout(() => {
                if (document.body.contains(modalContainer)) {
                    document.body.removeChild(modalContainer);
                }
            }, 3000);
        }, 2000);
    });
    
    // 현금 결제 처리 버튼
    modalContainer.querySelector('.cash-payment-process').addEventListener('click', () => {
        const receivedAmount = parseFloat(modalContainer.querySelector('.cash-amount-input').value) || 0;
        
        if (receivedAmount < amount) {
            alert('Received amount must be equal or greater than the payment amount');
            return;
        }
        
        // 성공적인 결제 처리 시뮬레이션
        showPaymentSuccessUI(modalContainer, {
            method: 'cash',
            amount: amount,
            receivedAmount: receivedAmount,
            change: receivedAmount - amount
        });
        
        // 3초 후 모달 닫기
        setTimeout(() => {
            if (document.body.contains(modalContainer)) {
                document.body.removeChild(modalContainer);
            }
        }, 3000);
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

// 결제 성공 UI 표시
function showPaymentSuccessUI(modalContainer, paymentData) {
    // 모달 내용 교체
    const modalBody = modalContainer.querySelector('.payment-modal-body');
    
    modalBody.innerHTML = `
        <div class="payment-success">
            <div class="payment-success-icon">✓</div>
            <h3>Payment Successful</h3>
            <div class="payment-success-details">
                <p><strong>Method:</strong> ${paymentData.method === 'card' ? 'Card' : 'Cash'}</p>
                <p><strong>Amount:</strong> ${paymentData.amount.toLocaleString()} KRW</p>
                ${paymentData.method === 'card' ? 
                    `<p><strong>Card Company:</strong> ${paymentData.cardCompany}</p>
                     <p><strong>Approval Number:</strong> ${paymentData.approvalNumber}</p>` : 
                    `<p><strong>Received:</strong> ${paymentData.receivedAmount.toLocaleString()} KRW</p>
                     <p><strong>Change:</strong> ${paymentData.change.toLocaleString()} KRW</p>`
                }
                <p><strong>Date:</strong> ${new Date().toLocaleString()}</p>
            </div>
        </div>
    `;
    
    // 닫기 및 취소 버튼 숨기기
    modalContainer.querySelector('.payment-modal-close').style.display = 'none';
    modalContainer.querySelector('.payment-modal-footer').style.display = 'none';
}
