// 환자 방문 기록 조회 기능을 위한 JavaScript 파일
import { auth, db, doc, getDoc, collection, getDocs, orderBy, query } from './firebase-config.js';

// 전역 변수
let currentPatientId = null;

// 모달 요소
const viewModal = document.getElementById('view-patient-modal');
const closeViewModalBtn = document.getElementById('close-view-modal');
const patientBasicInfoDiv = document.getElementById('view-patient-basic-info');
const visitHistoryLogDiv = document.getElementById('visit-history-log');

// 초기화 함수
export function initializePatientView() {
    // 모달 닫기 이벤트 리스너
    if (closeViewModalBtn) {
        closeViewModalBtn.addEventListener('click', closeViewModal);
    }
    
    // 모달 외부 클릭 시 닫기
    window.addEventListener('click', (event) => {
        if (event.target === viewModal) {
            closeViewModal();
        }
    });
    
    console.log('Patient view functionality initialized');
}

// 환자 방문 기록 모달 열기
export async function openViewPatientModal(patientId) {
    try {
        currentPatientId = patientId;
        
        // 로딩 상태 표시
        patientBasicInfoDiv.innerHTML = '<p>Loading patient information...</p>';
        visitHistoryLogDiv.innerHTML = '<p>Loading visit history...</p>';
        
        // 모달 표시
        viewModal.style.display = 'block';
        
        // 환자 기본 정보 가져오기
        const patientInfo = await fetchPatientInfo(patientId);
        
        // 환자 방문 기록 가져오기
        const visitHistory = await fetchVisitHistory(patientId);
        
        // 화면에 정보 표시
        displayPatientInfo(patientInfo);
        displayVisitHistory(visitHistory);
        
    } catch (error) {
        console.error('Error opening view modal:', error);
        alert('Error loading patient data. Please try again.');
        closeViewModal();
    }
}

// 환자 기본 정보 가져오기
async function fetchPatientInfo(patientId) {
    const hospitalName = auth.currentUser.email.split('@')[0].split('.')[0];
    const patientRef = doc(db, 'hospitals', hospitalName, 'patient', patientId);
    const patientDoc = await getDoc(patientRef);
    
    if (patientDoc.exists()) {
        return patientDoc.data().info || {};
    } else {
        throw new Error('Patient not found');
    }
}

// 환자 방문 기록 가져오기 - register.date 컬렉션에서 가져옴
async function fetchVisitHistory(patientId) {
    const hospitalName = auth.currentUser.email.split('@')[0].split('.')[0];
    const registerDateRef = collection(db, 'hospitals', hospitalName, 'patient', patientId, 'register.date');
    
    // 문서 가져오기 (날짜에 따른 정렬은 후처리로 수행)
    const querySnapshot = await getDocs(registerDateRef);
    
    const visits = [];
    querySnapshot.forEach((doc) => {
        // 문서 ID에서 날짜와 시간 추출 (예: "01.Jan.2023_123045")
        const docId = doc.id;
        let datePart = docId;
        let timePart = '';
        
        if (docId.includes('_')) {
            [datePart, timePart] = docId.split('_');
            // 시간 형식 변환 (123045 -> 12:30:45)
            if (timePart && timePart.length === 6) {
                timePart = `${timePart.substring(0, 2)}:${timePart.substring(2, 4)}:${timePart.substring(4, 6)}`;
            }
        }
        
        const visitData = doc.data();
        visits.push({
            id: doc.id,
            date: datePart,
            time: timePart,
            ...visitData
        });
    });
    
    // 문서 ID 기준으로 내림차순 정렬 (최신순)
    visits.sort((a, b) => b.id.localeCompare(a.id));
    
    return visits;
}

// 환자 기본 정보 표시
function displayPatientInfo(patientInfo) {
    // 간소화된 환자 정보 - 이름과 ID 번호만 표시
    const html = `
        <div class="patient-basic-info">
            <p><strong>Name:</strong> ${patientInfo.patientName || 'N/A'}</p>
            <p><strong>ID Number:</strong> ${patientInfo.idNumber || 'N/A'}</p>
        </div>
        <div>
            <span class="visit-count-badge">${currentPatientId ? '환자 방문 기록' : ''}</span>
        </div>
    `;
    
    patientBasicInfoDiv.innerHTML = html;
}

// 방문 기록 표시
function displayVisitHistory(visits) {
    if (visits.length === 0) {
        visitHistoryLogDiv.innerHTML = '<div class="no-visits-message">No visit history found for this patient.</div>';
        return;
    }
    
    let html = '';
    
    visits.forEach((visit) => {
        // 방문 날짜와 시간
        const visitDateStr = visit.date || 'Unknown Date';
        const visitTimeStr = visit.time || '';
        const fullDateTime = visitTimeStr ? `${visitDateStr} ${visitTimeStr}` : visitDateStr;
        
        // 의사 정보
        const doctor = visit.doctor || 'Unknown';
        
        // 주 호소 내용 (CC)
        let ccStr = 'None';
        if (visit.prescription && visit.prescription.cc && visit.prescription.cc.length > 0) {
            ccStr = visit.prescription.cc.join(', ');
        } else if (visit.primaryComplaint) {
            ccStr = visit.primaryComplaint;
        }
        
        // 약물 처방
        let medicinesStr = 'None';
        if (visit.prescription && visit.prescription.medicine && visit.prescription.medicine.length > 0) {
            medicinesStr = visit.prescription.medicine.map(med => {
                const dosage = med.dosage || '?';
                const frequency = med.frequency || '?';
                const duration = med.duration || '?';
                return `${med.name}(${dosage},${frequency},${duration})`;
            }).join(', ');
        }
        
        // 결제 정보
        const payment = visit.payment ? `${visit.payment} ZAR` : 'N/A';
        
        html += `
            <div class="visit-entry" data-visit-id="${visit.id}">
                <div class="visit-date">${fullDateTime}</div>
                <div class="visit-separator"></div>
                <div class="visit-details">
                    <span><strong>Doctor:</strong> ${doctor}</span>
                    <span><strong>CC:</strong> ${ccStr}</span>
                    <span><strong>Medicines:</strong> ${medicinesStr}</span>
                    <span><strong>Payment:</strong> ${payment}</span>
                </div>
            </div>
        `;
    });
    
    visitHistoryLogDiv.innerHTML = html;
}

// 모달 닫기
function closeViewModal() {
    viewModal.style.display = 'none';
    patientBasicInfoDiv.innerHTML = '';
    visitHistoryLogDiv.innerHTML = '';
    currentPatientId = null;
} 