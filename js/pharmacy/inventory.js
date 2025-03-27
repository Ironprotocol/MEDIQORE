// Import Firebase configurations
import { auth, db, doc, setDoc, collection, serverTimestamp } from '../firebase-config.js';

// SheetJS (xlsx) 라이브러리 로드 - CDN을 통해 로드
const script = document.createElement('script');
script.src = 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js';
document.head.appendChild(script);

// Inventory 메뉴 초기화
export function initializeInventory() {
    console.log('Initializing Inventory Management');
    
    // Inventory 헤더 찾기
    const inventoryHeader = document.querySelector('#inventory-content .content-header');
    
    if (!inventoryHeader) {
        console.error('Inventory header not found');
        return;
    }
    
    // 이미 생성된 버튼이 있는지 확인
    if (document.querySelector('.excel-upload-btn')) {
        console.log('Upload button already exists');
        return;
    }
    
    // 업로드 버튼 생성
    const uploadButton = document.createElement('button');
    uploadButton.className = 'excel-upload-btn';
    uploadButton.innerHTML = 'Upload Excel <span class="plus-sign">+</span>';
    
    // 파일 입력 요소 생성
    const uploadInput = document.createElement('input');
    uploadInput.type = 'file';
    uploadInput.id = 'excel-upload';
    uploadInput.accept = '.xlsx, .xls';
    uploadInput.style.display = 'none';
    
    // 상태 표시 요소 생성
    const statusElem = document.createElement('div');
    statusElem.id = 'upload-status';
    statusElem.className = 'upload-status';
    
    // 헤더에 요소 추가
    inventoryHeader.appendChild(uploadButton);
    inventoryHeader.appendChild(uploadInput);
    inventoryHeader.appendChild(statusElem);
    
    // 버튼 클릭 이벤트 리스너 설정
    uploadButton.addEventListener('click', function() {
        uploadInput.click();
    });
    
    // 파일 업로드 이벤트 리스너 설정
    uploadInput.addEventListener('change', handleFileUpload);
}

// 파일 업로드 처리 함수
function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) {
        updateStatus('No file selected', 'error');
        return;
    }
    
    updateStatus('Reading file...', 'info');
    
    // SheetJS가 로드되었는지 확인
    if (typeof XLSX === 'undefined') {
        updateStatus('XLSX library not loaded. Please try again in a few seconds.', 'error');
        return;
    }
    
    const reader = new FileReader();
    
    reader.onload = async function(e) {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            
            // 첫 번째 시트 가져오기
            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];
            
            // 시트 데이터를 JSON으로 변환
            const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
            
            // 헤더 확인
            if (jsonData.length < 2) {
                updateStatus('Excel file must contain at least header row and one data row', 'error');
                return;
            }
            
            const headers = jsonData[0];
            const requiredHeaders = ['API', 'ProductName', 'HCR', 'DosageForm', 'Strength', 'ApprovalDate', 'Amount'];
            
            // 필요한 모든 헤더가 있는지 확인
            const missingHeaders = requiredHeaders.filter(header => !headers.includes(header));
            if (missingHeaders.length > 0) {
                updateStatus(`Missing required headers: ${missingHeaders.join(', ')}`, 'error');
                return;
            }
            
            // 약국 이름 추출
            const user = auth.currentUser;
            if (!user) {
                updateStatus('User not logged in', 'error');
                return;
            }
            
            const pharmacyName = user.email.split('@')[0].split('.')[0];
            
            // 데이터 처리 및 Firebase 저장
            await processAndStoreData(jsonData, pharmacyName);
            
        } catch (error) {
            console.error('Error processing file:', error);
            updateStatus(`Error: ${error.message}`, 'error');
        }
    };
    
    reader.onerror = function() {
        updateStatus('Error reading file', 'error');
    };
    
    reader.readAsArrayBuffer(file);
}

// 데이터 처리 및 Firebase 저장
async function processAndStoreData(jsonData, pharmacyName) {
    try {
        updateStatus('Processing data...', 'info');
        
        const headers = jsonData[0];
        const apiIndex = headers.indexOf('API');
        const productNameIndex = headers.indexOf('ProductName');
        const hcrIndex = headers.indexOf('HCR');
        const dosageFormIndex = headers.indexOf('DosageForm');
        const strengthIndex = headers.indexOf('Strength');
        const approvalDateIndex = headers.indexOf('ApprovalDate');
        const amountIndex = headers.indexOf('Amount');
        
        // API를 기준으로 그룹화
        const apiGroups = {};
        
        // 첫 번째 행(헤더)을 제외하고 데이터 처리
        for (let i = 1; i < jsonData.length; i++) {
            const row = jsonData[i];
            
            // 행이 비어있는지 확인
            if (!row || row.length === 0) continue;
            
            const api = row[apiIndex]?.toString() || '';
            const productName = row[productNameIndex]?.toString() || '';
            
            // API와 ProductName은 필수 값
            if (!api || !productName) {
                console.warn(`Skipping row ${i+1}: Missing API or ProductName`);
                continue;
            }
            
            // 해당 API 그룹이 없으면 생성
            if (!apiGroups[api]) {
                apiGroups[api] = {};
            }
            
            // ProductName을 키로 사용하여 데이터 저장
            apiGroups[api][productName] = {
                HCR: row[hcrIndex]?.toString() || '',
                DosageForm: row[dosageFormIndex]?.toString() || '',
                Strength: row[strengthIndex]?.toString() || '',
                ApprovalDate: row[approvalDateIndex]?.toString() || '',
                Amount: parseInt(row[amountIndex], 10) || 0 // Amount는 숫자로 변환
            };
        }
        
        // Firebase에 데이터 저장
        updateStatus('Saving to Firebase...', 'info');
        
        const promises = [];
        
        // 각 API별로 문서 생성/업데이트
        for (const api in apiGroups) {
            const apiRef = doc(db, `pharmacy/${pharmacyName}/inventory/${api}`);
            const promise = setDoc(apiRef, {
                ...apiGroups[api],
                lastUpdated: serverTimestamp()
            }, { merge: true });
            
            promises.push(promise);
        }
        
        await Promise.all(promises);
        
        updateStatus(`Successfully saved ${Object.keys(apiGroups).length} API groups`, 'success');
        
        // 파일 입력 필드 초기화
        document.getElementById('excel-upload').value = '';
        
    } catch (error) {
        console.error('Error storing data:', error);
        updateStatus(`Error storing data: ${error.message}`, 'error');
    }
}

// 상태 업데이트 함수
function updateStatus(message, type = 'info') {
    const statusElement = document.getElementById('upload-status');
    if (statusElement) {
        statusElement.textContent = message;
        statusElement.className = `upload-status ${type}`;
    }
    console.log(`[${type.toUpperCase()}] ${message}`);
}
