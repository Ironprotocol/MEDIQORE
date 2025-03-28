// 월 이름 배열을 전역으로 이동 ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// Firebase 함수 import
import {
    app, auth, db, doc, getDoc, setDoc, collection, 
    query, where, getDocs, updateDoc, deleteDoc,
    serverTimestamp, Timestamp, onSnapshot, orderBy
} from '../firebase-config.js';

export class CustomCalendar {
    constructor() {
        this.date = new Date();
        this.monthYear = document.querySelector('.month-year');
        this.calendarGrid = document.querySelector('.calendar-grid');
        this.months = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
        ];
        this.selectedDate = null;  // 선택된 날짜 추적
        this.init();
        this.currentTooltip = null;  // 현재 열린 툴팁 추적
        }
    init() {
        this.renderCalendar();
        this.addEventListeners();
        
        // 현재 로그인한 사용자의 병원 정보로 달력 예약 정보 업데이트
        const user = auth.currentUser;
        if (user) {
            const [hospitalName] = user.email.split('@')[0].split('.');
            updateCalendarReservations(hospitalName);
        }
    }
    

    renderCalendar() {
        this.monthYear.textContent = `${this.months[this.date.getMonth()]} ${this.date.getFullYear()}`;
        const dates = this.calendarGrid.querySelectorAll('.date');
        dates.forEach(date => date.remove());

        const firstDay = new Date(this.date.getFullYear(), this.date.getMonth(), 1);
        const lastDay = new Date(this.date.getFullYear(), this.date.getMonth() + 1, 0);

        // 이전 달의 날짜들 추가
        for (let i = 0; i < firstDay.getDay(); i++) {
        const dateDiv = document.createElement('div');
        dateDiv.className = 'date empty';  // empty 클래스 추가
        this.calendarGrid.appendChild(dateDiv);
        }
        // 현재 달의 날짜 추가
        for (let i = 1; i <= lastDay.getDate(); i++) {
        const dateDiv = document.createElement('div');
        dateDiv.className = 'date';
        dateDiv.textContent = i;
        
        // 오늘 날짜이거나 이전에 선택된 날짜인 경우 selected 클래스 추가
        const currentDate = new Date();
        if ((this.selectedDate === null && 
             i === currentDate.getDate() && 
             this.date.getMonth() === currentDate.getMonth() && 
             this.date.getFullYear() === currentDate.getFullYear()) || 
            (this.selectedDate && 
             i === this.selectedDate.getDate() && 
             this.date.getMonth() === this.selectedDate.getMonth() && 
             this.date.getFullYear() === this.selectedDate.getFullYear())) {
            dateDiv.classList.add('selected');
        }
        // 날짜 클릭 이벤트
        dateDiv.addEventListener('click', (e) => {
            // 이전 선택 제거
            const prevSelected = this.calendarGrid.querySelector('.date.selected');
            if (prevSelected) {
                prevSelected.classList.remove('selected');
            }
            // 새로운 선택 추가
            dateDiv.classList.add('selected');
            this.selectedDate = new Date(this.date.getFullYear(), this.date.getMonth(), i);
            // 기존의 날짜 클릭 핸들러 호출
            this.handleDateClick(e, i);
        });
        this.calendarGrid.appendChild(dateDiv);
        }  
        // 남은 칸에에 빈 셀 채우기
        const totalCells = 42; // 6주 x 7일
        const remainingCells = totalCells - (firstDay.getDay() + lastDay.getDate());
        for (let i = 0; i < remainingCells; i++) {
        const dateDiv = document.createElement('div');
        dateDiv.className = 'date empty';  // empty 클래스 추가
        this.calendarGrid.appendChild(dateDiv);
        }
        }


    addEventListeners() {
        document.getElementById('prevMonth').addEventListener('click', async () => {
            this.date.setMonth(this.date.getMonth() - 1);
            this.renderCalendar();
            
            // 현재 로그인한 사용자의 병원 정보로 달력 예약 정보 업데이트
            const user = auth.currentUser;
            if (user) {
                const [hospitalName] = user.email.split('@')[0].split('.');
                await updateCalendarReservations(hospitalName);
            }
        });

        document.getElementById('nextMonth').addEventListener('click', async () => {
            this.date.setMonth(this.date.getMonth() + 1);
            this.renderCalendar();
            
            // 현재 로그인한 사용자의 병원 정보로 달력 예약 정보 업데이트 
            const user = auth.currentUser;
            if (user) {
                const [hospitalName] = user.email.split('@')[0].split('.');
                await updateCalendarReservations(hospitalName);
            }
        });
    }


    handleDateClick(e, date) {
        const formattedDate = this.formatDate(date);
        document.querySelector('.scheduler-header .current-date').textContent = formattedDate;
        
        // 스케줄러 예약 정보 업데이트
        updateSchedulerReservations(formattedDate);
    }


    formatDate(day) {
    const date = new Date(this.date.getFullYear(), this.date.getMonth(), day);
    return `${String(day).padStart(2, '0')}.${months[date.getMonth()]}.${date.getFullYear()}`;
    }
    };
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// 스케줄러 초기화 함수 수정
export function initializeScheduler() {
    const currentDate = new Date();
    
    // 날짜 표시 형식 변경
    const formattedDate = `${currentDate.getDate().toString().padStart(2, '0')}.${months[currentDate.getMonth()]}.${currentDate.getFullYear()}`;
    document.querySelector('.scheduler-header .current-date').textContent = formattedDate;
    
    // 예약 입력 폼 이벤트 리스너 설정
    const saveReservationBtn = document.getElementById('save-reservation');
    const resetBtn = document.querySelector('.reservation-input-title .reset-btn');
    const idCheckBtn = document.querySelector('.reservation-id-check-btn');
    
    if (saveReservationBtn) {
        saveReservationBtn.addEventListener('click', handleReservationSave);
    }
    
    if (resetBtn) {
        resetBtn.addEventListener('click', clearReservationForm);
    }
    
    // ID Check 버튼 이벤트 리스너
    if (idCheckBtn) {
        idCheckBtn.addEventListener('click', handleIdCheck);
    }
    
    // 달력 초기화
    const calendar = new CustomCalendar();
    
    // 현재 날짜의 예약 정보 로드
    if (auth.currentUser) {
        updateSchedulerReservations(formattedDate);
    } else {
        auth.onAuthStateChanged(user => {
            if (user) {
                updateSchedulerReservations(formattedDate);
            }
        });
    }
}
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// ID Check 핸들러
async function handleIdCheck() {
    const patientId = document.getElementById('patient-id').value.trim();
    
    if (!patientId) {
        alert('Please enter ID Card / Passport number');
        return;
    }
    
    try {
        // 현재 로그인한 사용자의 병원 정보
        const user = auth.currentUser;
        const [hospitalName] = user.email.split('@')[0].split('.');
        
        // 환자 정보 조회
        const patientRef = collection(db, 'hospitals', hospitalName, 'patient');
        const q = query(patientRef, where('info.idNumber', '==', patientId));
        const querySnapshot = await getDocs(q);
        
        if (querySnapshot.empty) {
            alert('Patient not found. Please check the ID number or register a new patient.');
            return;
        }
        
        // 환자 정보 가져오기
        const patientDoc = querySnapshot.docs[0];
        const patientData = patientDoc.data().info;
        
        // 환자 문서 ID 저장 (나중에 예약 저장에 사용)
        sessionStorage.setItem('currentPatientDocId', patientDoc.id);
        
        // 환자 정보 모달 표시
        showPatientInfoModal(patientData);
        
    } catch (error) {
        console.error('Error checking patient ID:', error);
        alert('Error checking patient ID: ' + error.message);
    }
}

// 환자 정보 모달 표시 함수
function showPatientInfoModal(patientData) {
    const modal = document.getElementById('patient-check-modal');
    const infoContainer = modal.querySelector('.rsv-patient-info-container');
    
    // 환자 정보 HTML 생성
    infoContainer.innerHTML = '';
    
    // 이름 정보
    addInfoItem(infoContainer, 'Name', patientData.patientName || 'No information');
    
    // ID 번호 정보
    addInfoItem(infoContainer, 'ID Number', patientData.idNumber || 'No information');
    
    // 전화번호 정보
    addInfoItem(infoContainer, 'Phone', patientData.phoneNumber || 'No information');
    
    // 생년월일 정보
    let birthDateStr = 'No information';
    if (patientData.birthDate) {
        const birthDate = patientData.birthDate.toDate ? patientData.birthDate.toDate() : new Date(patientData.birthDate);
        birthDateStr = birthDate.toLocaleDateString();
    }
    addInfoItem(infoContainer, 'Date of Birth', birthDateStr);
    
    // 성별 정보
    addInfoItem(infoContainer, 'Gender', patientData.gender || 'No information');
    
    // 주소 정보
    addInfoItem(infoContainer, 'Address', patientData.address || 'No information');
    
    // 보험 정보
    let insuranceInfo = 'No information';
    if (patientData.insurance && patientData.insurance.provider && patientData.insurance.cardNumber) {
        insuranceInfo = `${patientData.insurance.provider} / ${patientData.insurance.cardNumber}`;
    }
    addInfoItem(infoContainer, 'Insurance', insuranceInfo);
    
    // 모달 표시
    modal.style.display = 'block';
    
    // 모달 이벤트 리스너 설정
    setupModalEventListeners(patientData);
}

// 정보 항목 추가 함수
function addInfoItem(container, label, value) {
    const item = document.createElement('div');
    item.className = 'rsv-info-item';
    
    const labelEl = document.createElement('div');
    labelEl.className = 'rsv-info-label';
    labelEl.textContent = label;
    
    const valueEl = document.createElement('div');
    valueEl.className = 'rsv-info-value';
    valueEl.textContent = value;
    
    item.appendChild(labelEl);
    item.appendChild(valueEl);
    container.appendChild(item);
}

// 모달 이벤트 리스너 설정 함수
function setupModalEventListeners(patientData) {
    const modal = document.getElementById('patient-check-modal');
    const closeBtn = modal.querySelector('.rsv-close-btn');
    const insertBtn = document.getElementById('rsv-insert-info-btn');
    
    // 닫기 버튼 이벤트
    closeBtn.onclick = function() {
        modal.style.display = 'none';
    };
    
    // 정보 입력 버튼 이벤트
    insertBtn.onclick = function() {
        document.getElementById('patient-id').value = patientData.idNumber || '';
        document.getElementById('patient-name').value = patientData.patientName || '';
        document.getElementById('patient-phone').value = patientData.phoneNumber || '';
        modal.style.display = 'none';
    };
    
    // 모달 외부 클릭 시 닫기
    window.onclick = function(event) {
        if (event.target == modal) {
            modal.style.display = 'none';
        }
    };
}

// 예약 저장 핸들러
async function handleReservationSave() {
    // 폼 데이터 가져오기
    const patientIdNumber = document.getElementById('patient-id').value.trim();
    const patientName = document.getElementById('patient-name').value.trim();
    const time = document.getElementById('reservation-time').value;
    const patientPhone = document.getElementById('patient-phone').value.trim();
    const primaryComplaint = document.getElementById('primary-complaint').value.trim();
    
    // 유효성 검사
    if (!patientIdNumber) {
        alert('Please enter ID Card / Passport number');
        return;
    }
    
    if (!patientName) {
        alert('Please enter patient name');
        return;
    }
    
    if (!time) {
        alert('Please select appointment time');
        return;
    }
    
    if (!patientPhone) {
        alert('Please enter phone number');
        return;
    }
    
    if (!primaryComplaint) {
        alert('Please enter primary complaint');
        return;
    }
    
    try {
        // 현재 선택된 날짜 가져오기
        const currentDate = document.querySelector('.scheduler-header .current-date').textContent;
        
        // 날짜 및 시간 파싱
        const [day, month, year] = currentDate.split('.');
        const monthIndex = months.indexOf(month);
        const [hour, minute] = time.split(':');
        
        // 예약 시간 포함한 날짜 객체 생성
        const rsvdDateTime = new Date(parseInt(year), monthIndex, parseInt(day));
        rsvdDateTime.setHours(parseInt(hour), parseInt(minute), 0, 0);
        
        // 현재 시간과 비교
        const now = new Date();
        if (rsvdDateTime < now) {
            alert('Cannot make reservation for a past time. Please select a future time.');
            return;
        }
        
        // 현재 로그인한 사용자의 병원 정보
        const user = auth.currentUser;
        if (!user) {
            alert('Login required');
            return;
        }
        
        const [hospitalName] = user.email.split('@')[0].split('.');
        
        // 환자가 이미 patient list에 있는지 확인 (waiting, active, payment 컬렉션)
        const collections = ['waiting', 'active', 'payment'];
        
        for (const collectionName of collections) {
            const patientListRef = collection(db, 'hospitals', hospitalName, 'dates', currentDate, collectionName);
            const patientListSnapshot = await getDocs(patientListRef);
            
            // 환자 ID로 환자 정보 찾기
            const matchingPatient = patientListSnapshot.docs.find(doc => {
                const patientData = doc.data();
                return doc.id.includes(patientIdNumber) || (patientData.idNumber && patientData.idNumber === patientIdNumber);
            });
            
            if (matchingPatient) {
                alert(`This patient is already in the ${collectionName} list. Cannot make a new reservation.`);
                return;
            }
        }
        
        // 환자 정보 조회
        const patientRef = collection(db, 'hospitals', hospitalName, 'patient');
        const q = query(patientRef, where('info.idNumber', '==', patientIdNumber));
        const querySnapshot = await getDocs(q);
        
        let patientDocId;
        let patientData;
        
        if (querySnapshot.empty) {
            // 환자가 존재하지 않으면 새로 등록
            console.log("새 환자를 등록합니다:", patientName, patientIdNumber);
            
            // 환자 문서 ID 생성 (이름.ID번호 형식)
            patientDocId = `${patientName}.${patientIdNumber}`;
            
            // 환자 기본 정보 생성
            patientData = {
                idNumber: patientIdNumber,
                patientName: patientName,
                phoneNumber: patientPhone,
                // 나머지 필드는 비어있음
                birthDate: null,
                gender: null,
                address: null,
                insurance: {
                    provider: null,
                    cardNumber: null
                }
            };
            
            // 환자 정보 저장
            const newPatientRef = doc(db, 'hospitals', hospitalName, 'patient', patientDocId);
            await setDoc(newPatientRef, {
                info: patientData,
                timestamp: serverTimestamp()
            });
            
            console.log("새 환자 등록 완료:", patientDocId);
        } else {
            // 기존 환자 정보 가져오기
            const patientDoc = querySnapshot.docs[0];
            patientDocId = patientDoc.id;
            patientData = patientDoc.data().info;
        }
        
        // 1. 환자별 예약 기록 저장 - register.date 서브컬렉션에 저장
        // 'dd.mmm.yyyy_ttmmss' 형식으로 문서 ID 생성
        const formattedHour = hour.padStart(2, '0');
        const formattedMinute = minute.padStart(2, '0');
        const registerDateId = `${day}.${month}.${year}_${formattedHour}${formattedMinute}00`;
        const registerDateRef = doc(db, 'hospitals', hospitalName, 'patient', patientDocId, 'register.date', registerDateId);
        await setDoc(registerDateRef, {
            timestamp: serverTimestamp(),
            primaryComplaint: primaryComplaint,
            doctor: null,
            progress: 'reservation',
            rsvdTime: time,
            gender: patientData.gender || null
        });
        
        // 2. 병원 날짜별 예약 목록 저장 - dates/{날짜}/reservation 컬렉션에 저장
        const reservationRef = doc(db, 'hospitals', hospitalName, 'dates', currentDate, 'reservation', patientDocId);
        await setDoc(reservationRef, {
            timestamp: serverTimestamp(),
            primaryComplaint: primaryComplaint,
            doctor: null,
            rsvdTime: Timestamp.fromDate(rsvdDateTime),
            gender: patientData.gender || null,
            patientName: patientData.patientName || patientName,
            idNumber: patientData.idNumber || patientIdNumber
        });
        
        // 저장 성공 메시지
        alert('Reservation saved successfully');
        
        // 폼 초기화
        clearReservationForm();
        
        // 예약 목록 업데이트
        await Promise.all([
            updateCalendarReservations(hospitalName),
            updateSchedulerReservations(currentDate)
        ]);
        
    } catch (error) {
        console.error('Error saving reservation:', error);
        alert('Error saving reservation: ' + error.message);
    }
}

// 예약 폼 초기화
function clearReservationForm() {
    document.getElementById('patient-id').value = '';
    document.getElementById('patient-name').value = '';
    document.getElementById('reservation-time').value = '';
    document.getElementById('patient-phone').value = '';
    document.getElementById('primary-complaint').value = '';
    
    // 세션 스토리지 비우기
    sessionStorage.removeItem('currentPatientDocId');
}

// 문자열 형태의 날짜를 Date 객체로 변환
function parseDate(dateStr) {
    // 형식: "DD.MMM.YYYY"
    const parts = dateStr.split('.');
    const day = parseInt(parts[0], 10);
    const monthIndex = months.indexOf(parts[1]);
    const year = parseInt(parts[2], 10);
    
    return new Date(year, monthIndex, day);
}

// 스케줄러 예약 정보 업데이트 함수
export async function updateSchedulerReservations(currentDate) {
    // 예약 정보 표시 영역 가져오기
    const reservedItemsContainer = document.querySelector('.reserved-items-container');
    if (!reservedItemsContainer) return;
    
    // 컨테이너 초기화
    reservedItemsContainer.innerHTML = '';
    
    const user = auth.currentUser;
    if (!user) return;
    
    const [hospitalName] = user.email.split('@')[0].split('.');
    
    try {
        // 해당 날짜의 예약 정보 조회 - active reservation 조회
        const reservationRef = collection(db, 'hospitals', hospitalName, 'dates', currentDate, 'reservation');
        const reservationSnapshot = await getDocs(reservationRef);
        
        // 예약 기록 조회 - reservationRecords 컬렉션
        const recordsRef = collection(db, 'hospitals', hospitalName, 'dates', currentDate, 'reservationRecords');
        const recordsSnapshot = await getDocs(recordsRef);
        
        // 두 컬렉션 모두 비어있는 경우
        if (reservationSnapshot.empty && recordsSnapshot.empty) {
            // 예약이 없는 경우 메시지 표시
            reservedItemsContainer.innerHTML = '<div class="no-reservations">No reservations for this date</div>';
            return;
        }
        
        // 예약 정보를 시간순으로 정렬할 배열
        const reservations = [];
        
        // 현재 예약 정보 수집
        reservationSnapshot.forEach(doc => {
            const reservationData = doc.data();
            const patientId = doc.id;
            
            // 시간 포맷팅
            const rsvdTime = reservationData.rsvdTime.toDate();
            const formattedTime = `${rsvdTime.getHours().toString().padStart(2, '0')}:${rsvdTime.getMinutes().toString().padStart(2, '0')}`;
            
            // 예약 정보 저장
            reservations.push({
                time: formattedTime,
                patientId: reservationData.idNumber || patientId,
                patientName: reservationData.patientName || 'Unknown',
                primaryComplaint: reservationData.primaryComplaint || 'Not specified',
                status: 'active' // 현재 예약 상태
            });
        });
        
        // 예약 기록 정보 수집
        recordsSnapshot.forEach(doc => {
            const recordData = doc.data();
            const patientId = doc.id;
            
            // 시간 포맷팅
            const rsvdTime = recordData.rsvdTime.toDate();
            const formattedTime = `${rsvdTime.getHours().toString().padStart(2, '0')}:${rsvdTime.getMinutes().toString().padStart(2, '0')}`;
            
            // 예약 정보 저장
            reservations.push({
                time: formattedTime,
                patientId: recordData.idNumber || patientId,
                patientName: recordData.patientName || 'Unknown',
                primaryComplaint: recordData.primaryComplaint || 'Not specified',
                status: 'completed' // 이미 처리된 예약
            });
        });
        
        // 시간순으로 정렬
        reservations.sort((a, b) => {
            return a.time.localeCompare(b.time);
        });
        
        // 예약 정보 표시
        reservations.forEach(reservation => {
            const reservedItem = document.createElement('div');
            reservedItem.className = `reserved-item${reservation.status === 'completed' ? ' completed' : ''}`;
            
            reservedItem.innerHTML = `
                <div class="time">${reservation.time}</div>
                <div class="patient-info-horizontal">
                    <div class="patient-name">${reservation.patientName}</div>
                    <div class="appointment-type">${reservation.primaryComplaint}</div>
                    <div class="patient-id">${reservation.patientId}</div>
                </div>

            `;
            
            reservedItemsContainer.appendChild(reservedItem);
        });
        
    } catch (error) {
        console.error('Error updating scheduler reservations:', error);
        reservedItemsContainer.innerHTML = '<div class="error-message">Error loading reservations</div>';
    }
}

async function updateCalendarReservations(hospitalName) {
    const dates = document.querySelectorAll('.date:not(.empty)');
    
    dates.forEach(async (dateDiv) => {
        // 기존 예약 수 표시가 있다면 제외하고 날짜만 가져오기
        const existingCount = dateDiv.querySelector('.reservation-count');
        if (existingCount) existingCount.remove();
        
        const day = dateDiv.textContent;  // 이제 순수하게 날짜만 남음
        const currentDate = new Date(document.querySelector('.month-year').textContent);
        const formattedDate = `${day.padStart(2, '0')}.${months[currentDate.getMonth()]}.${currentDate.getFullYear()}`;
        
        // 현재 예약 환자 수 가져오기
        const reservationRef = collection(db, 'hospitals', hospitalName, 'dates', formattedDate, 'reservation');
        const reservationSnapshot = await getDocs(reservationRef);
        
        // reservationRecords 컬렉션에서 기록 가져오기
        const reservationRecordsRef = collection(db, 'hospitals', hospitalName, 'dates', formattedDate, 'reservationRecords');
        const recordsSnapshot = await getDocs(reservationRecordsRef);
        
        // 두 컬렉션의 문서 수를 합산
        const totalReservations = reservationSnapshot.size + recordsSnapshot.size;
        
        if (totalReservations > 0) {
            const countDiv = document.createElement('div');
            countDiv.className = 'reservation-count';
            countDiv.textContent = totalReservations;
            dateDiv.appendChild(countDiv);
        }
    });
}