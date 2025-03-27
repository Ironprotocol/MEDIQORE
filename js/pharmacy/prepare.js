// Import Firebase configurations
import { auth, db, doc, getDoc, collection, query, where, getDocs } from '../firebase-config.js';

// 처방전 템플릿 초기화
export function initializePrepare() {
    console.log('Initializing Prepare functionality');
    
    // 처방전 템플릿을 세로선 왼쪽에 생성
    const contentBody = document.querySelector('#prepare-content .content-body');
    if (!contentBody) {
        console.error('Content body not found');
        return;
    }
    
    // 처방전 컨테이너 생성
    const prescriptionContainer = document.createElement('div');
    prescriptionContainer.className = 'prescription-container';
    contentBody.appendChild(prescriptionContainer);
    
    // 기존 QR 스캐너 이벤트 리스너 설정
    setupQRScanListener();
    
    // Prepare 버튼 이벤트 리스너
    const prepareBtn = document.querySelector('.prepare-btn');
    if (prepareBtn) {
        prepareBtn.addEventListener('click', handlePrepare);
    }
}

// QR 코드 스캔 리스너 설정
function setupQRScanListener() {
    // QR 코드 스캔 이벤트를 위한 리스너
    // 이 예제에서는 키보드 입력으로 시뮬레이션 (실제로는 QR 스캐너 장치 이벤트가 필요)
    let qrInput = '';
    
    document.addEventListener('keydown', (event) => {
        // 엔터키를 누르면 스캔 완료
        if (event.key === 'Enter') {
            if (qrInput.trim() !== '') {
                console.log('QR Code Scan Result:', qrInput);
                handleQRCode(qrInput);
                qrInput = ''; // 입력 초기화
            }
        } else if (event.key === 'Escape') {
            qrInput = ''; // Esc키로 입력 취소
        } else if (
            !event.ctrlKey && 
            !event.altKey && 
            !event.metaKey && 
            event.key.length === 1 && // 한 글자 키만 허용 (특수 키 제외)
            event.key !== 'Shift' && 
            event.key !== 'Control' && 
            event.key !== 'Alt' && 
            event.key !== 'Meta'
        ) {
            // 일반 키 입력만 받음 (특수 키 및 수정자 키 제외)
            qrInput += event.key;
        }
    });
}

// QR 코드 처리
async function handleQRCode(qrData) {
    try {
        console.log('QR Code Scan Result:', qrData);
        
        // QR 데이터 형식: hospitalName/idNumber/timestamp
        const [hospitalName, idNumber, timestamp] = qrData.split('/');
        
        if (!hospitalName || !idNumber || !timestamp) {
            throw new Error('Invalid QR code format.');
        }
        
        // 타임스탬프 검증 및 정제
        // 예: 'Shift' 키 같은 특수 문자 제거
        let cleanTimestamp = timestamp;
        // Shift 키 등의 이상한 문자 제거
        cleanTimestamp = cleanTimestamp.replace(/Shift|Control|Alt|Meta/g, '');
        
        console.log('Parsed QR Data:', { 
            hospitalName, 
            idNumber, 
            originalTimestamp: timestamp,
            cleanTimestamp: cleanTimestamp 
        });
        
        // Prepare 메뉴로 이동 (이미 Prepare 메뉴에 있을 수도 있음)
        const prepareMenu = document.getElementById('prepare-menu');
        if (prepareMenu) {
            prepareMenu.click();
        }
        
        // 처방전 데이터 가져오기
        const prescriptionData = await fetchPrescriptionData(hospitalName, idNumber, cleanTimestamp);
        
        // 처방전 표시
        displayPrescription(prescriptionData, hospitalName, cleanTimestamp);
        
    } catch (error) {
        console.error('QR code processing error:', error);
        alert(`Prescription data not loaded: ${error.message}`);
    }
}

// 처방전 데이터 가져오기
async function fetchPrescriptionData(hospitalName, idNumber, timestamp) {
    try {
        console.log(`Fetching data: Hospital=${hospitalName}, ID=${idNumber}, Time=${timestamp}`);
        
        // 1. 먼저 환자 ID 찾기
        const patientId = await findPatientIdByNumber(hospitalName, idNumber);
        if (!patientId) {
            throw new Error(`Patient information not found. (ID: ${idNumber})`);
        }
        
        console.log(`Patient ID found: ${patientId}`);
        
        // 2. 병원 정보 가져오기
        const hospitalRef = doc(db, 'hospitals', hospitalName);
        const hospitalDoc = await getDoc(hospitalRef);
        
        let hospitalInfo = {
            name: hospitalName,
            phone: 'N/A',
            fax: 'N/A',
            email: 'N/A'
        };
        
        if (hospitalDoc.exists() && hospitalDoc.data().info) {
            const info = hospitalDoc.data().info;
            hospitalInfo = {
                ...hospitalInfo,
                ...info
            };
        }
        
        console.log('Hospital info:', hospitalInfo);
        
        // 3. 처방전 문서 가져오기
        const prescriptionPath = `hospitals/${hospitalName}/patient/${patientId}/register.date/${timestamp}`;
        console.log('Reference path:', prescriptionPath);
        
        const prescriptionRef = doc(db, prescriptionPath);
        const prescriptionDoc = await getDoc(prescriptionRef);
        
        // 정확한 타임스탬프로 문서를 찾지 못한 경우 비슷한 날짜의 문서를 찾기 위한 대체 로직
        if (!prescriptionDoc.exists()) {
            console.warn(`Document not found with exact timestamp: ${timestamp}`);
            
            // 날짜 부분만 추출하여 해당 날짜의 모든 문서를 조회
            try {
                const datePart = timestamp.split('_')[0]; // 날짜 부분만 추출
                console.log(`Trying alternative search with date part: ${datePart}`);
                
                // 해당 날짜의 문서 조회
                const registerDateRef = collection(db, `hospitals/${hospitalName}/patient/${patientId}/register.date`);
                const q = query(registerDateRef, where('__name__', '>=', datePart), where('__name__', '<=', datePart + '\uf8ff'));
                const querySnapshot = await getDocs(q);
                
                if (querySnapshot.empty) {
                    throw new Error(`Prescription information not found. (Date: ${datePart})`);
                }
                
                // 가장 최신 문서 사용
                const latestDoc = querySnapshot.docs[0];
                console.log(`Alternative document found: ${latestDoc.id}`);
                
                // 문서 데이터 추출
                const docData = latestDoc.data();
                
                if (!docData.prescription) {
                    throw new Error('Prescription data is empty.');
                }
                
                // 환자 이름 추출 (patientId에서 '.' 앞부분)
                const patientName = patientId.split('.')[0];
                
                // 처방전 데이터 반환
                return {
                    ...docData.prescription,
                    patientName: patientName,
                    patientID: idNumber,
                    hospitalName: hospitalInfo.name,
                    hospitalPhone: hospitalInfo.phone || 'N/A',
                    hospitalFax: hospitalInfo.fax || 'N/A',
                    hospitalEmail: hospitalInfo.email || 'N/A',
                    doctorName: docData.doctor || 'N/A',
                    licenseNumber: docData.prescription.credential ? docData.prescription.credential.number : 'N/A',
                    licenseName: docData.prescription.credential ? docData.prescription.credential.name : 'N/A',
                    issueNo: latestDoc.id,
                    issueDate: latestDoc.id.split('_')[0]
                };
            } catch (altError) {
                console.error('Alternative search error:', altError);
                throw new Error(`Prescription information not found. (Time: ${timestamp})`);
            }
        }
        
        // prescription 필드에서 처방전 데이터 추출
        const docData = prescriptionDoc.data();
        
        if (!docData.prescription) {
            throw new Error('Prescription data is empty.');
        }
        
        // 환자 이름 추출 (patientId에서 '.' 앞부분)
        const patientName = patientId.split('.')[0];
        
        // 처방전 데이터 반환
        return {
            ...docData.prescription,
            patientName: patientName,
            patientID: idNumber,
            hospitalName: hospitalInfo.name,
            hospitalPhone: hospitalInfo.phone || 'N/A',
            hospitalFax: hospitalInfo.fax || 'N/A',
            hospitalEmail: hospitalInfo.email || 'N/A',
            doctorName: docData.doctor || 'N/A',
            licenseNumber: docData.prescription.credential ? docData.prescription.credential.number : 'N/A',
            licenseName: docData.prescription.credential ? docData.prescription.credential.name : 'N/A',
            issueNo: timestamp,
            issueDate: timestamp.split('_')[0]
        };
        
    } catch (error) {
        console.error('Error fetching prescription data:', error);
        throw error;
    }
}

// 환자 ID 찾기 (ID 번호로 검색)
async function findPatientIdByNumber(hospitalName, idNumber) {
    try {
        console.log(`Searching patient: Hospital=${hospitalName}, ID=${idNumber}`);
        
        // patients 컬렉션 참조
        const patientsRef = collection(db, `hospitals/${hospitalName}/patient`);
        
        // 모든 환자 문서 가져오기
        const querySnapshot = await getDocs(patientsRef);
        
        // 모든 환자 문서 확인
        for (const doc of querySnapshot.docs) {
            const docId = doc.id;
            console.log(`Checking patient document: ${docId}`);
            
            // "이름.ID번호" 형식에서 ID번호 부분 추출
            const parts = docId.split('.');
            if (parts.length > 1) {
                const patientIdNumber = parts[1];
                console.log(`Patient document ID number: ${patientIdNumber}`);
                
                // QR 코드의 ID와 일치하는지 확인
                if (patientIdNumber === idNumber) {
                    console.log(`Matching patient found: ${docId}`);
                    return docId;
                }
            }
        }
        
        console.log('No matching patient found');
        return null;
        
    } catch (error) {
        console.error('Error searching patient ID:', error);
        return null;
    }
}

// 처방전 표시
function displayPrescription(data, hospitalName, timestamp) {
    // 처방전 컨테이너 가져오기
    const prescriptionContainer = document.querySelector('.prescription-container');
    if (!prescriptionContainer) {
        console.error('Prescription container not found.');
        return;
    }
    
    // 약품 목록 HTML 생성
    let medicinesHTML = '';
    if (data.medicines && data.medicines.length > 0) {
        data.medicines.forEach(med => {
            medicinesHTML += `
                <tr>
                    <td class="medicines-data">${med.name || ''}</td>
                    <td class="medicines-data">${med.perDose || 'N/A'}</td>
                    <td class="medicines-data">${med.perDay || 'N/A'}</td>
                    <td class="medicines-data">${med.days || 'N/A'}</td>
                </tr>
            `;
        });
    } else {
        // 약품 데이터가 없는 경우 빈 행 5개 추가
        for (let i = 0; i < 5; i++) {
            medicinesHTML += `
                <tr>
                    <td class="medicines-data"></td>
                    <td class="medicines-data"></td>
                    <td class="medicines-data"></td>
                    <td class="medicines-data"></td>
                </tr>
            `;
        }
    }
    
    // 처방전 HTML 생성
    prescriptionContainer.innerHTML = `
        <div class="prescription-details">
            <!-- 처방전 메인 테이블 -->
            <table class="prescription-table">
                <!-- 제목 행 -->
                <tr>
                    <td colspan="6" class="prescription-title">
                        <div class="prescription-title-container">
                            <span class="prescription-title-text">PRESCRIPTION</span>
                        </div>
                    </td>
                </tr>
                
                <!-- Issue No 행 -->
                <tr>
                    <td class="table-header" style="width:15%;">Issue No</td>
                    <td colspan="5" class="table-data">${data.issueNo || timestamp}</td>
                </tr>
                
                <!-- 환자 및 병원 정보 행 -->
                <tr>
                    <td class="table-header" style="width:15%;" rowspan="2">Patient</td>
                    <td class="table-label" style="width:15%;">Name</td>
                    <td class="table-data" style="width:20%;">${data.patientName || ''}</td>
                    <td class="table-header" style="width:15%;" rowspan="4">Hospital</td>
                    <td class="table-label" style="width:15%;">Name</td>
                    <td class="table-data" style="width:20%;">${data.hospitalName || hospitalName}</td>
                </tr>
                
                <tr>
                    <td class="table-label">ID</td>
                    <td class="table-data">${data.patientID || ''}</td>
                    <td class="table-label">Phone</td>
                    <td class="table-data">${data.hospitalPhone || 'N/A'}</td>
                </tr>
                
                <tr>
                    <td class="table-header" rowspan="2">License</td>
                    <td class="table-label">Name</td>
                    <td class="table-data">${data.licenseName || 'N/A'}</td>
                    <td class="table-label">Fax</td>
                    <td class="table-data">${data.hospitalFax || 'N/A'}</td>
                </tr>
                
                <tr>
                    <td class="table-label">Number</td>
                    <td class="table-data">${data.licenseNumber || 'N/A'}</td>
                    <td class="table-label">Email</td>
                    <td class="table-data">${data.hospitalEmail || 'N/A'}</td>
                </tr>
                
                <!-- 의사와 서명 행 -->
                <tr>
                    <td class="table-header">Doctor</td>
                    <td class="table-data" colspan="2">${data.doctorName || 'N/A'}</td>
                    <td class="table-header">Signature</td>
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
                ${medicinesHTML}
            </table>
            
            <!-- 사용 기간 테이블 -->
            <table class="usage-table">
                <tr>
                    <td class="table-header" style="width:30%;">Issue Date</td>
                    <td class="table-data">${data.issueDate || timestamp.split('_')[0].replace(/\./g, '/')}</td>
                </tr>
                <tr>
                    <td class="table-header">Usage Period</td>
                    <td class="table-data">Valid for 3 days from issue date</td>
                </tr>
            </table>
        </div>
    `;
}

// Prepare 버튼 클릭 처리
function handlePrepare() {
    console.log('Prepare button clicked');
    
    // 처방전이 로드되었는지 확인
    const prescriptionDetails = document.querySelector('.prescription-details');
    if (!prescriptionDetails) {
        alert('Please scan prescription first.');
        return;
    }
    
    // 조제 처리 로직 구현
    alert('Starting prescription preparation');
}
