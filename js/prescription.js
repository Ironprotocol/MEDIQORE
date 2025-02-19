// Prescription 컨테이너 초기화
export function initializePrescription() {
    const prescriptionTitle = document.querySelector('#prescription-content .content-title-prescription');
    const noPatientMessage = document.querySelector('#prescription-content .no-patient-message');
    const contentBody = document.querySelector('#prescription-content .content-body-prescription');

    // Room의 환자 클릭 이벤트에 대한 처리
    document.addEventListener('prescriptionPatientSelected', (e) => {
        const { name, age } = e.detail;
        if (prescriptionTitle) {
            prescriptionTitle.textContent = `${name} Prescription`;
        }
        if (noPatientMessage) {
            noPatientMessage.style.display = 'none';
        }
    });
}
