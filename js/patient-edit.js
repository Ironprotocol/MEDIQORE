// 환자 정보 수정 기능을 위한 JavaScript 파일
import { auth, db, doc, getDoc, updateDoc, Timestamp, serverTimestamp } from './firebase-config.js';

// 전역 변수
let currentPatientId = null;
let originalPatientData = null;

// 모달 요소
const editModal = document.getElementById('edit-patient-modal');
const closeModalBtn = document.querySelector('.close-modal');
const cancelEditBtn = document.getElementById('cancel-edit');
const editPatientForm = document.getElementById('edit-patient-form');

// 폼 입력 필드
const patientIdInput = document.getElementById('edit-patient-id');
const patientNameInput = document.getElementById('edit-patient-name');
const idNumberInput = document.getElementById('edit-id-number');
const genderInputs = document.getElementsByName('edit-gender');
const birthDayInput = document.getElementById('edit-birth-day');
const birthMonthInput = document.getElementById('edit-birth-month');
const birthYearInput = document.getElementById('edit-birth-year');
const phoneInput = document.getElementById('edit-phone');
const addressInput = document.getElementById('edit-address');
const hasInsuranceInputs = document.getElementsByName('edit-has-insurance');
const insuranceProviderInput = document.getElementById('edit-insurance-provider');
const insuranceNumberInput = document.getElementById('edit-insurance-number');
const insuranceDetailsDiv = document.getElementById('edit-insurance-details');

// 오류 메시지 요소
const nameErrorSpan = document.getElementById('edit-name-error');
const idErrorSpan = document.getElementById('edit-id-error');
const birthErrorSpan = document.getElementById('edit-birth-error');
const phoneErrorSpan = document.getElementById('edit-phone-error');
const insuranceErrorSpan = document.getElementById('edit-insurance-error');

// 초기화 함수
export function initializePatientEdit() {
    // 모달 닫기 이벤트 리스너
    closeModalBtn.addEventListener('click', closeModal);
    cancelEditBtn.addEventListener('click', closeModal);
    
    // 모달 외부 클릭 시 닫기
    window.addEventListener('click', (event) => {
        if (event.target === editModal) {
            closeModal();
        }
    });
    
    // 보험 정보 표시/숨김 처리
    for (const radio of hasInsuranceInputs) {
        radio.addEventListener('change', toggleInsuranceDetails);
    }
    
    // 폼 입력 필드 유효성 검사 이벤트 리스너
    patientNameInput.addEventListener('blur', validateName);
    idNumberInput.addEventListener('blur', validateIdNumber);
    
    // 생년월일 필드 유효성 검사
    birthDayInput.addEventListener('blur', validateBirthDate);
    birthMonthInput.addEventListener('blur', validateBirthDate);
    birthYearInput.addEventListener('blur', validateBirthDate);
    
    // 전화번호 필드 유효성 검사
    phoneInput.addEventListener('blur', validatePhone);
    
    // 보험 정보 필드 유효성 검사
    insuranceNumberInput.addEventListener('blur', validateInsurance);
    
    // 폼 제출 이벤트 리스너는 openEditPatientModal에서 동적으로 추가됨
}

// 환자 정보 수정 모달 열기
export async function openEditPatientModal(patientId, onSaveCallback) {
    try {
        currentPatientId = patientId;
        
        if (!auth.currentUser) {
            console.error('User not authenticated');
            return;
        }
        
        const hospitalName = auth.currentUser.email.split('@')[0].split('.')[0];
        
        // 환자 데이터 가져오기
        const patientRef = doc(db, 'hospitals', hospitalName, 'patient', patientId);
        const patientDoc = await getDoc(patientRef);
        
        if (!patientDoc.exists()) {
            console.error('Patient not found');
            alert('Patient data not found');
            return;
        }
        
        const patientData = patientDoc.data().info;
        originalPatientData = patientData;
        
        // 폼에 데이터 채우기
        populateForm(patientData);
        
        // 모달 표시
        editModal.style.display = 'block';
        
        // 폼 제출 이벤트 리스너 추가 (이전 리스너 제거 후)
        editPatientForm.removeEventListener('submit', handleFormSubmit);
        
        // 콜백을 포함한 새로운 제출 핸들러 생성
        const submitHandler = async (event) => {
            await handleFormSubmit(event, onSaveCallback);
        };
        
        // 새로운 이벤트 리스너 등록
        editPatientForm.addEventListener('submit', submitHandler);
        
    } catch (error) {
        console.error('Error opening edit modal:', error);
        alert('Error loading patient data');
    }
}

// 폼에 환자 데이터 채우기
function populateForm(patientData) {
    // 기본 정보 채우기
    patientIdInput.value = currentPatientId;
    patientNameInput.value = patientData.patientName || '';
    idNumberInput.value = patientData.idNumber || '';
    
    // 성별 설정 (대소문자 무시)
    console.log("Gender from database:", patientData.gender);
    for (const radio of genderInputs) {
        console.log("Radio button value:", radio.value);
        radio.checked = radio.value.toLowerCase() === (patientData.gender || '').toLowerCase();
    }
    
    // 생년월일 설정
    if (patientData.birthDate && typeof patientData.birthDate.toDate === 'function') {
        const birthDate = patientData.birthDate.toDate();
        birthDayInput.value = birthDate.getDate();
        birthMonthInput.value = birthDate.getMonth() + 1; // 월은 0부터 시작하므로 +1
        birthYearInput.value = birthDate.getFullYear();
    } else {
        birthDayInput.value = '';
        birthMonthInput.value = '';
        birthYearInput.value = '';
    }
    
    // 연락처 및 주소
    phoneInput.value = patientData.phoneNumber || '';
    addressInput.value = patientData.address || '';
    
    // 보험 정보 설정
    const hasInsurance = patientData.insurance && 
                        (patientData.insurance.provider || patientData.insurance.cardNumber);
    
    for (const radio of hasInsuranceInputs) {
        radio.checked = (radio.value === 'yes' && hasInsurance) || 
                        (radio.value === 'no' && !hasInsurance);
    }
    
    if (hasInsurance) {
        insuranceProviderInput.value = patientData.insurance?.provider || '';
        insuranceNumberInput.value = patientData.insurance?.cardNumber || '';
        insuranceDetailsDiv.style.display = 'block';
    } else {
        insuranceProviderInput.value = '';
        insuranceNumberInput.value = '';
        insuranceDetailsDiv.style.display = 'none';
    }
    
    // 오류 메시지 초기화
    resetErrorMessages();
}

// 모달 닫기
function closeModal() {
    editModal.style.display = 'none';
    editPatientForm.reset();
    resetErrorMessages();
    
    // 저장 버튼 상태 초기화
    const submitBtn = document.getElementById('save-patient');
    if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Save Changes';
    }
    
    currentPatientId = null;
    originalPatientData = null;
}

// 보험 정보 표시/숨김 토글
function toggleInsuranceDetails() {
    const hasInsurance = document.querySelector('input[name="edit-has-insurance"][value="yes"]').checked;
    insuranceDetailsDiv.style.display = hasInsurance ? 'block' : 'none';
    
    if (!hasInsurance) {
        insuranceProviderInput.value = '';
        insuranceNumberInput.value = '';
        hideErrorMessage(insuranceErrorSpan);
    }
}

// 폼 제출 처리
async function handleFormSubmit(event, onSaveCallback) {
    event.preventDefault();
    
    // 모든 필드 유효성 검사
    if (!validateAllFields()) {
        return;
    }
    
    try {
        // 로딩 상태 표시
        const submitBtn = document.getElementById('save-patient');
        const originalBtnText = submitBtn.textContent;
        submitBtn.disabled = true;
        submitBtn.textContent = 'Saving...';
        
        // 변경된 데이터 수집
        const updatedData = collectFormData();
        
        // 변경된 필드만 업데이트
        const changedFields = getChangedFields(originalPatientData, updatedData);
        
        if (Object.keys(changedFields).length === 0) {
            alert('No changes were made.');
            submitBtn.disabled = false;
            submitBtn.textContent = originalBtnText;
            return;
        }
        
        // Firebase 업데이트
        await updatePatientData(changedFields);
        
        // 성공 메시지 및 모달 닫기
        alert('Patient information updated successfully.');
        closeModal();
        
        // 콜백 함수 호출
        if (onSaveCallback) {
            onSaveCallback();
        }
        
    } catch (error) {
        console.error('Error updating patient:', error);
        alert(`Error updating patient: ${error.message}`);
        
        // 버튼 상태 복원
        const submitBtn = document.getElementById('save-patient');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Save Changes';
    }
}

// 폼 데이터 수집
function collectFormData() {
    // 생년월일 처리
    let birthDate = null;
    if (birthDayInput.value && birthMonthInput.value && birthYearInput.value) {
        const day = parseInt(birthDayInput.value);
        const month = parseInt(birthMonthInput.value) - 1; // JavaScript의 월은 0부터 시작
        const year = parseInt(birthYearInput.value);
        birthDate = new Date(year, month, day);
    }
    
    // 성별 값 가져오기
    let gender = null;
    for (const radio of genderInputs) {
        if (radio.checked) {
            gender = radio.value;
            break;
        }
    }
    
    // 보험 정보 처리
    let insurance = null;
    const hasInsurance = document.querySelector('input[name="edit-has-insurance"][value="yes"]').checked;
    
    if (hasInsurance) {
        insurance = {
            provider: insuranceProviderInput.value.trim(),
            cardNumber: insuranceNumberInput.value.trim()
        };
    }
    
    // 수집된 데이터 반환
    return {
        patientName: patientNameInput.value.trim(),
        idNumber: idNumberInput.value.trim(),
        gender: gender,
        birthDate: birthDate ? Timestamp.fromDate(birthDate) : null,
        phoneNumber: phoneInput.value.trim(),
        address: addressInput.value.trim(),
        insurance: insurance
    };
}

// 변경된 필드 확인
function getChangedFields(original, updated) {
    const changes = {};
    
    // 기본 필드 비교
    if (updated.patientName !== original.patientName) {
        changes.patientName = updated.patientName;
    }
    
    if (updated.idNumber !== original.idNumber) {
        changes.idNumber = updated.idNumber;
    }
    
    // 성별 비교 (대소문자 무시)
    const originalGender = (original.gender || '').toLowerCase();
    const updatedGender = (updated.gender || '').toLowerCase();
    if (updatedGender !== originalGender) {
        changes.gender = updated.gender;
    }
    
    // 생년월일 비교
    const originalDate = original.birthDate ? original.birthDate.toDate().getTime() : null;
    const updatedDate = updated.birthDate ? updated.birthDate.toDate().getTime() : null;
    
    if (originalDate !== updatedDate) {
        changes.birthDate = updated.birthDate;
    }
    
    if (updated.phoneNumber !== original.phoneNumber) {
        changes.phoneNumber = updated.phoneNumber;
    }
    
    if (updated.address !== original.address) {
        changes.address = updated.address;
    }
    
    // 보험 정보 비교
    const originalInsurance = original.insurance || {};
    const updatedInsurance = updated.insurance;
    
    if ((updatedInsurance === null && originalInsurance.provider) || 
        (updatedInsurance && originalInsurance.provider !== updatedInsurance.provider) ||
        (updatedInsurance && originalInsurance.cardNumber !== updatedInsurance.cardNumber)) {
        changes.insurance = updatedInsurance;
    }
    
    return changes;
}

// Firebase 데이터 업데이트
async function updatePatientData(changedFields) {
    const hospitalName = auth.currentUser.email.split('@')[0].split('.')[0];
    const patientRef = doc(db, 'hospitals', hospitalName, 'patient', currentPatientId);
    
    // 변경 이력 추가
    const updateData = {
        'info': { ...originalPatientData, ...changedFields },  // 기존 데이터와 변경된 데이터 병합
        'lastUpdated': serverTimestamp(),
        'lastUpdatedBy': auth.currentUser.email
    };
    
    // Firebase 업데이트
    await updateDoc(patientRef, updateData);
}

// 모든 필드 유효성 검사
function validateAllFields() {
    const isNameValid = validateName();
    const isIdValid = validateIdNumber();
    const isBirthValid = validateBirthDate();
    const isPhoneValid = validatePhone();
    const isInsuranceValid = validateInsurance();
    
    return isNameValid && isIdValid && isBirthValid && isPhoneValid && isInsuranceValid;
}

// 이름 유효성 검사
function validateName() {
    const name = patientNameInput.value.trim();
    
    if (!name) {
        showErrorMessage(nameErrorSpan, 'Patient name is required');
        return false;
    }
    
    if (name.length < 2) {
        showErrorMessage(nameErrorSpan, 'Name must be at least 2 characters');
        return false;
    }
    
    hideErrorMessage(nameErrorSpan);
    return true;
}

// ID 번호 유효성 검사
function validateIdNumber() {
    const idNumber = idNumberInput.value.trim();
    
    if (!idNumber) {
        showErrorMessage(idErrorSpan, 'ID number is required');
        return false;
    }
    
    // ID 형식 검사 (예: 숫자와 하이픈만 허용)
    if (!/^[0-9-]+$/.test(idNumber)) {
        showErrorMessage(idErrorSpan, 'ID should contain only numbers and hyphens');
        return false;
    }
    
    hideErrorMessage(idErrorSpan);
    return true;
}

// 생년월일 유효성 검사
function validateBirthDate() {
    const day = birthDayInput.value.trim();
    const month = birthMonthInput.value.trim();
    const year = birthYearInput.value.trim();
    
    // 모든 필드가 비어있으면 유효 (선택적 필드)
    if (!day && !month && !year) {
        hideErrorMessage(birthErrorSpan);
        return true;
    }
    
    // 일부 필드만 입력된 경우
    if (!day || !month || !year) {
        showErrorMessage(birthErrorSpan, 'Please complete all date fields');
        return false;
    }
    
    // 유효한 날짜인지 확인
    const dayNum = parseInt(day);
    const monthNum = parseInt(month) - 1; // JavaScript의 월은 0부터 시작
    const yearNum = parseInt(year);
    
    const date = new Date(yearNum, monthNum, dayNum);
    
    if (date.getFullYear() !== yearNum || 
        date.getMonth() !== monthNum || 
        date.getDate() !== dayNum) {
        showErrorMessage(birthErrorSpan, 'Invalid date');
        return false;
    }
    
    // 미래 날짜 확인
    if (date > new Date()) {
        showErrorMessage(birthErrorSpan, 'Birth date cannot be in the future');
        return false;
    }
    
    hideErrorMessage(birthErrorSpan);
    return true;
}

// 전화번호 유효성 검사
function validatePhone() {
    const phone = phoneInput.value.trim();
    
    // 비어있으면 유효 (선택적 필드)
    if (!phone) {
        hideErrorMessage(phoneErrorSpan);
        return true;
    }
    
    // 전화번호 형식 검사
    if (!/^[0-9+\-\s()]+$/.test(phone)) {
        showErrorMessage(phoneErrorSpan, 'Invalid phone number format');
        return false;
    }
    
    hideErrorMessage(phoneErrorSpan);
    return true;
}

// 보험 정보 유효성 검사
function validateInsurance() {
    const hasInsurance = document.querySelector('input[name="edit-has-insurance"][value="yes"]').checked;
    
    if (!hasInsurance) {
        hideErrorMessage(insuranceErrorSpan);
        return true;
    }
    
    const provider = insuranceProviderInput.value.trim();
    const number = insuranceNumberInput.value.trim();
    
    if (hasInsurance && (!provider || !number)) {
        showErrorMessage(insuranceErrorSpan, 'Please provide both insurance provider and number');
        return false;
    }
    
    hideErrorMessage(insuranceErrorSpan);
    return true;
}

// 오류 메시지 표시
function showErrorMessage(element, message) {
    element.textContent = message;
    element.style.display = 'block';
}

// 오류 메시지 숨김
function hideErrorMessage(element) {
    element.textContent = '';
    element.style.display = 'none';
}

// 모든 오류 메시지 초기화
function resetErrorMessages() {
    const errorElements = [
        nameErrorSpan, 
        idErrorSpan, 
        birthErrorSpan, 
        phoneErrorSpan, 
        insuranceErrorSpan
    ];
    
    for (const element of errorElements) {
        hideErrorMessage(element);
    }
} 