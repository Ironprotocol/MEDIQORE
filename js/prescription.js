// Prescription 컨테이너 초기화
export function initializePrescription() {
    const prescriptionTitle = document.querySelector('#prescription-content .content-title');
    const noPatientMessage = document.querySelector('#prescription-content .no-patient-message');
    const prescriptionContent = document.querySelector('#prescription-content .prescription-content');

    // Room의 환자 클릭 이벤트에 대한 처리
    document.addEventListener('prescriptionPatientSelected', (e) => {
        const { name, age } = e.detail;
        prescriptionTitle.textContent = `${name} Prescription`;
        noPatientMessage.style.display = 'none';
        prescriptionContent.style.display = 'flex';
    });
}