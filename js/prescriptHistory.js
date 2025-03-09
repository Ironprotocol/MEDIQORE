import { auth, db, collection, query, orderBy, getDocs } from './firebase-config.js';

export async function initializePrescriptionHistory(patientId) {
    const historyContainer = document.querySelector('.prescription-left-container');
    const titleElement = historyContainer.querySelector('.prescription-left-title');
    
    // 컨테이너 내부를 비우고 타이틀만 다시 추가
    historyContainer.innerHTML = '';
    historyContainer.appendChild(titleElement);
    
    const [hospitalName] = auth.currentUser.email.split('@')[0].split('.');

    // 환자의 처방전 기록 가져오기
    const registerDateRef = collection(db, 'hospitals', hospitalName, 'patient', patientId, 'register.date');
    const q = query(registerDateRef, orderBy('timestamp', 'desc'));
    const snapshot = await getDocs(q);

    snapshot.forEach(doc => {
        const data = doc.data();
        if (data.prescription) {  // prescription 필드가 있는 경우만 표시
            const prescriptionDate = doc.id.split('_')[0];  // YYYY.MM.DD 형식
            const daysBefore = calculateDaysBefore(prescriptionDate);
            const ccList = data.prescription.cc.join(', ');

            const historyItem = document.createElement('div');
            historyItem.className = 'prescript-history-record';
            historyItem.innerHTML = `
                <div class="record-date">${prescriptionDate} <span>(${daysBefore})</span></div>
                <div class="record-doctor">Doctor : ${data.doctor || 'Unknown'}</div>
                <div class="record-cc">CC : ${ccList}</div>
            `;

            // 클릭 이벤트 추가
            historyItem.addEventListener('click', () => {
                // UI 선택 효과
                const selectedItem = historyContainer.querySelector('.prescript-history-record.selected');
                if (selectedItem) {
                    selectedItem.classList.remove('selected');
                }
                historyItem.classList.add('selected');

                // 처방전 데이터를 이벤트와 함께 전달
                const event = new CustomEvent('prescriptionHistorySelected', {
                    detail: {
                        prescriptionData: data.prescription,
                        registerDate: doc.id,
                        doctor: data.doctor,
                        timestamp: data.timestamp,
                        chartImage: data.chartImage,
                        patientId: patientId
                    }
                });
                document.dispatchEvent(event);
            });

            // prescription-left-title 다음에 추가
            const titleElement = historyContainer.querySelector('.prescription-left-title');
            titleElement.insertAdjacentElement('afterend', historyItem);
        }
    });
}

function calculateDaysBefore(dateStr) {
    const [day, month, year] = dateStr.split('.');
    const prescriptionDate = new Date(year, months.indexOf(month), parseInt(day));
    const today = new Date();
    const diffTime = Math.abs(today - prescriptionDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return `${diffDays}d ago`;  // 0d ago, 1d ago, 2d ago 형식으로 변경
}

const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
