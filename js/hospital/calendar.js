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

// 스케줄러 초기화 함수 /////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
export function initializeScheduler() {
    const currentDate = new Date();
    
    // 날짜 표시 형식 변경
    const formattedDate = `${currentDate.getDate().toString().padStart(2, '0')}.${months[currentDate.getMonth()]}.${currentDate.getFullYear()}`;
    document.querySelector('.scheduler-header .current-date').textContent = formattedDate;
    
    // 예약 입력 폼 이벤트 리스너 설정
    const saveReservationBtn = document.getElementById('save-reservation');
    const clearReservationBtn = document.getElementById('clear-reservation');
    const idCheckBtn = document.querySelector('.id-check-btn');
    const primaryComplaintSelect = document.getElementById('primary-complaint');
    const otherComplaintTextarea = document.getElementById('other-complaint');
    
    if (saveReservationBtn) {
        saveReservationBtn.addEventListener('click', handleReservationSave);
    }
    
    if (clearReservationBtn) {
        clearReservationBtn.addEventListener('click', clearReservationForm);
    }
    
    // ID Check 버튼 이벤트 리스너
    if (idCheckBtn) {
        idCheckBtn.addEventListener('click', handleIdCheck);
    }
    
    // Primary Complaint 선택 이벤트 리스너
    if (primaryComplaintSelect) {
        primaryComplaintSelect.addEventListener('change', function() {
            if (this.value === 'other') {
                otherComplaintTextarea.style.display = 'block';
                otherComplaintTextarea.setAttribute('required', 'required');
            } else {
                otherComplaintTextarea.style.display = 'none';
                otherComplaintTextarea.removeAttribute('required');
            }
        });
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
        if (!user) {
            alert('Login required');
            return;
        }
        
        const [hospitalName] = user.email.split('@')[0].split('.');
        
        // 환자 정보 조회
        const patientRef = collection(db, 'hospitals', hospitalName, 'patient');
        const q = query(patientRef, where('info.idNumber', '==', patientId));
        const querySnapshot = await getDocs(q);
        
        if (querySnapshot.empty) {
            alert('Patient not found. Please check the ID number or register a new patient.');
            return;
        }
        
        // 환자 정보 가져와서 폼에 채우기
        const patientData = querySnapshot.docs[0].data();
        document.getElementById('patient-name').value = patientData.info.patientName || '';
        document.getElementById('patient-phone').value = patientData.info.phoneNumber || '';
        
        alert('Patient information loaded successfully');
        
    } catch (error) {
        console.error('Error checking patient ID:', error);
        alert('Error checking patient ID');
    }
}

// 예약 저장 핸들러
async function handleReservationSave() {
    // 폼 데이터 가져오기
    const patientId = document.getElementById('patient-id').value.trim();
    const patientName = document.getElementById('patient-name').value.trim();
    const time = document.getElementById('reservation-time').value;
    const patientPhone = document.getElementById('patient-phone').value.trim();
    const primaryComplaint = document.getElementById('primary-complaint').value;
    const otherComplaint = document.getElementById('other-complaint').value.trim();
    
    // 최종 complaint 값 결정
    const finalComplaint = primaryComplaint === 'other' ? otherComplaint : primaryComplaint;
    
    // 유효성 검사
    if (!patientId) {
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
    
    if (!finalComplaint) {
        alert('Please select or specify primary complaint');
        return;
    }
    
    try {
        // 현재 선택된 날짜 가져오기
        const currentDate = document.querySelector('.scheduler-header .current-date').textContent;
        const dateObj = parseDate(currentDate);
        
        // 현재 로그인한 사용자의 병원 정보
        const user = auth.currentUser;
        if (!user) {
            alert('Login required');
            return;
        }
        
        const [hospitalName] = user.email.split('@')[0].split('.');
        
        // 예약 정보 생성
        const reservationData = {
            date: dateObj,
            time,
            patientId,
            patientName,
            patientPhone,
            primaryComplaint: finalComplaint,
            createdAt: serverTimestamp(),
            hospitalName
        };
        
        // 예약 정보 저장
        const reservationsRef = collection(db, 'reservations');
        await setDoc(doc(reservationsRef), reservationData);
        
        // 환자 예약 기록 저장
        const registerDateId = `${currentDate.replace(/\./g, '_')}_${time.replace(':', '')}`;
        const registerDateRef = doc(db, 'hospitals', hospitalName, 'patient', patientId, 'register.date', registerDateId);
        await setDoc(registerDateRef, {
            timestamp: serverTimestamp(),
            primaryComplaint: finalComplaint,
            doctor: null,
            progress: 'reservation',
            rsvdTime: time
        });
        
        // 저장 성공 메시지
        alert('Reservation saved successfully');
        
        // 폼 초기화
        clearReservationForm();
        
        // 예약 목록 업데이트
        updateSchedulerReservations(currentDate);
        
        // 달력에 예약 수 업데이트
        updateCalendarReservations(hospitalName);
    } catch (error) {
        console.error('Error saving reservation:', error);
        alert('Error saving reservation');
    }
}

// 예약 폼 초기화
function clearReservationForm() {
    document.getElementById('patient-id').value = '';
    document.getElementById('patient-name').value = '';
    document.getElementById('reservation-time').value = '';
    document.getElementById('patient-phone').value = '';
    document.getElementById('primary-complaint').value = '';
    
    const otherComplaint = document.getElementById('other-complaint');
    otherComplaint.value = '';
    otherComplaint.style.display = 'none';
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

// 스케줄러 예약 정보 업데이트 함수 수정
export async function updateSchedulerReservations(currentDate) {
    const reservedItemsContainer = document.querySelector('.reserved-items-container');
    if (!reservedItemsContainer) return;
    
    // 기존 예약 항목 모두 제거
    reservedItemsContainer.innerHTML = '';
    
    try {
        // 날짜 파싱
        const dateObj = parseDate(currentDate);
        const year = dateObj.getFullYear();
        const month = dateObj.getMonth();
        const day = dateObj.getDate();
        
        // 시작 시간과 종료 시간 설정 (해당 날짜의 00:00:00부터 23:59:59까지)
        const startDate = new Date(year, month, day, 0, 0, 0);
        const endDate = new Date(year, month, day, 23, 59, 59);
        
        // 현재 로그인한 사용자의 병원 정보
        const user = auth.currentUser;
        if (!user) return;
        
        const [hospitalName] = user.email.split('@')[0].split('.');
        
        // Firestore에서 해당 날짜의 예약 정보 가져오기
        const reservationsRef = collection(db, 'reservations');
        const q = query(
            reservationsRef,
            where('hospitalName', '==', hospitalName),
            where('date', '>=', startDate),
            where('date', '<=', endDate)
        );
        
        const querySnapshot = await getDocs(q);
        
        // 예약이 없는 경우 메시지 표시
        if (querySnapshot.empty) {
            const noReservationsMsg = document.createElement('div');
            noReservationsMsg.className = 'no-reservations-message';
            noReservationsMsg.textContent = '이 날짜에 예약된 환자가 없습니다.';
            reservedItemsContainer.appendChild(noReservationsMsg);
            return;
        }
        
        // 예약 정보를 시간 순으로 정렬
        const reservations = [];
        querySnapshot.forEach(doc => {
            reservations.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        // 시간 순으로 정렬
        reservations.sort((a, b) => {
            return a.time.localeCompare(b.time);
        });
        
        // 예약 항목 생성 및 표시
        reservations.forEach(reservation => {
            const reservedItem = document.createElement('div');
            reservedItem.className = 'reserved-item';
            reservedItem.innerHTML = `
                <div class="time">${reservation.time}</div>
                <div class="patient-info">
                    <div class="patient-name">${reservation.patientName}</div>
                    <div class="appointment-type">${reservation.primaryComplaint}</div>
                </div>
                <div class="actions">
                    <button class="edit-reservation" data-id="${reservation.id}">수정</button>
                    <button class="delete-reservation" data-id="${reservation.id}">취소</button>
                </div>
            `;
            
            reservedItemsContainer.appendChild(reservedItem);
        });
        
        // 수정 및 취소 버튼 이벤트 리스너 추가
        document.querySelectorAll('.edit-reservation').forEach(button => {
            button.addEventListener('click', e => handleEditReservation(e.target.dataset.id));
        });
        
        document.querySelectorAll('.delete-reservation').forEach(button => {
            button.addEventListener('click', e => handleDeleteReservation(e.target.dataset.id));
        });
        
    } catch (error) {
        console.error('예약 정보 로드 중 오류 발생:', error);
        const errorMsg = document.createElement('div');
        errorMsg.className = 'error-message';
        errorMsg.textContent = '예약 정보를 불러오는 중 오류가 발생했습니다.';
        reservedItemsContainer.appendChild(errorMsg);
    }
}

// 예약 수정 핸들러
async function handleEditReservation(reservationId) {
    try {
        // Firestore에서 예약 정보 가져오기
        const reservationDoc = await getDoc(doc(db, 'reservations', reservationId));
        
        if (!reservationDoc.exists()) {
            alert('Reservation not found');
            return;
        }
        
        const reservationData = reservationDoc.data();
        
        // 폼에 정보 채우기
        document.getElementById('patient-id').value = reservationData.patientId || '';
        document.getElementById('patient-name').value = reservationData.patientName || '';
        document.getElementById('reservation-time').value = reservationData.time || '';
        document.getElementById('patient-phone').value = reservationData.patientPhone || '';
        
        // Primary Complaint 처리
        const primaryComplaint = reservationData.primaryComplaint || '';
        const primaryComplaintSelect = document.getElementById('primary-complaint');
        const otherComplaintTextarea = document.getElementById('other-complaint');
        
        // Primary Complaint이 선택 목록에 있는지 확인
        const complaintsOptions = Array.from(primaryComplaintSelect.options).map(option => option.value);
        
        if (complaintsOptions.includes(primaryComplaint)) {
            primaryComplaintSelect.value = primaryComplaint;
            otherComplaintTextarea.style.display = 'none';
        } else if (primaryComplaint) {
            // 없으면 "other"로 설정
            primaryComplaintSelect.value = 'other';
            otherComplaintTextarea.style.display = 'block';
            otherComplaintTextarea.value = primaryComplaint;
        } else {
            primaryComplaintSelect.value = '';
            otherComplaintTextarea.style.display = 'none';
        }
        
        // 편집 중인 예약 ID 저장 (나중에 업데이트를 위해)
        document.getElementById('save-reservation').dataset.editId = reservationId;
        
        // 버튼 텍스트 변경
        document.getElementById('save-reservation').textContent = 'Update';
        
    } catch (error) {
        console.error('Error loading reservation data:', error);
        alert('Error loading reservation data');
    }
}

// 예약 취소(삭제) 핸들러
async function handleDeleteReservation(reservationId) {
    if (!confirm('정말로 이 예약을 취소하시겠습니까?')) {
        return;
    }
    
    try {
        // Firestore에서 예약 삭제
        await deleteDoc(doc(db, 'reservations', reservationId));
        
        // 삭제 성공 메시지
        alert('예약이 성공적으로 취소되었습니다.');
        
        // 현재 날짜 가져오기
        const currentDate = document.querySelector('.scheduler-header .current-date').textContent;
        
        // 예약 목록 업데이트
        updateSchedulerReservations(currentDate);
        
        // 달력에 예약 수 업데이트
        const user = auth.currentUser;
        if (user) {
            const [hospitalName] = user.email.split('@')[0].split('.');
            updateCalendarReservations(hospitalName);
        }
        
    } catch (error) {
        console.error('예약 취소 중 오류 발생:', error);
        alert('예약 취소 중 오류가 발생했습니다.');
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
        
        const reservationRef = collection(db, 'hospitals', hospitalName, 'dates', formattedDate, 'reservation');
        const snapshot = await getDocs(reservationRef);
      
        
        if (snapshot.size > 0) {
            const countDiv = document.createElement('div');
            countDiv.className = 'reservation-count';
            countDiv.textContent = snapshot.size;
            dateDiv.appendChild(countDiv);
        
        }
    });
}