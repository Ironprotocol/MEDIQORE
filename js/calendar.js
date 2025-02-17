// 월 이름 배열을 전역으로 이동
const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

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

// 스케줄러 초기화 함수
export function initializeScheduler() {
    const timeGrid = document.querySelector('.time-grid');
    const currentDate = new Date();
    
    // 날짜 표시 형식 변경 - 점(.)을 추가 //2025-02-11 17:05
    const formattedDate = `${currentDate.getDate().toString().padStart(2, '0')}.${months[currentDate.getMonth()]}.${currentDate.getFullYear()}`;
    
    document.querySelector('.scheduler-header .current-date').textContent = formattedDate;
    
    // 시간대 생성 (8:00 ~ 15:00)
    for (let hour = 8; hour <= 15; hour++) {
        // 정시
        const timeSlot = document.createElement('div');
        timeSlot.className = 'time-slot';
        timeSlot.textContent = `${hour.toString().padStart(2, '0')}:00`;
        timeGrid.appendChild(timeSlot);
        
        // 5개의 셀 추가 (10개에서 변경)
        for (let i = 0; i < 5; i++) {
            const scheduleCell = document.createElement('div');
            scheduleCell.className = 'schedule-cell';
            scheduleCell.addEventListener('click', () => handleCellClick(hour, 0, i));
            timeGrid.appendChild(scheduleCell);
        }
        
        // 30분
        if (hour < 15) {
            const halfHourSlot = document.createElement('div');
            halfHourSlot.className = 'time-slot half-hour';
            halfHourSlot.textContent = `${hour.toString().padStart(2, '0')}:30`;
            timeGrid.appendChild(halfHourSlot);
            
            // 30분대의 5개 셀 추가 (10개에서 변경)
            for (let i = 0; i < 5; i++) {
                const halfHourCell = document.createElement('div');
                halfHourCell.className = 'schedule-cell';
                halfHourCell.addEventListener('click', () => handleCellClick(hour, 30, i));
                timeGrid.appendChild(halfHourCell);
            }
        }
    }

    // auth 상태가 준비된 후 예약 정보 업데이트 //2025-02-11 17:05
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

function handleCellClick(hour, minute, column) {
    // 기존 툴팁이 있다면 제거
    const existingTooltip = document.querySelector('.schedule-tooltip');
    if (existingTooltip) {
        existingTooltip.remove();
    }

    // 현재 선택된 날짜 가져오기 (스케줄러 헤더에서)
    const selectedDate = document.querySelector('.scheduler-header').textContent;

    const tooltip = document.createElement('div');
    tooltip.className = 'schedule-tooltip';
    tooltip.innerHTML = `
        <div class="tooltip-header">
            <div class="tooltip-datetime">
                <span class="tooltip-date">${selectedDate}</span>
                <span class="tooltip-time">${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}</span>
            </div>
            <button class="tooltip-close">×</button>
        </div>
        <form class="tooltip-form">
            <label>Name</label>
            <input type="text" class="tooltip-name">
            
            <label>Gender</label>
            <div class="tooltip-gender-select">
                <select class="tooltip-gender">
                    <option value="">Select Gender</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                </select>
            </div>
            
            <label>Birth Date</label>
            <div class="date-select-group">
                <div class="tooltip-birth-select">
                    <div class="birth-selected">Day</div>
                    <div class="birth-options">
                        ${Array.from({length: 31}, (_, i) => i + 1)
                            .map(day => `<div class="birth-option">${day}</div>`).join('')}
                    </div>
                </div>
                <div class="tooltip-birth-select">
                    <div class="birth-selected">Month</div>
                    <div class="birth-options">
                        ${['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
                            .map((month, i) => `<div class="birth-option" data-value="${i+1}">${month}</div>`).join('')}
                    </div>
                </div>
                <div class="tooltip-birth-select">
                    <div class="birth-selected">Year</div>
                    <div class="birth-options">
                        ${Array.from({length: 100}, (_, i) => new Date().getFullYear() - i)
                            .map(year => `<div class="birth-option">${year}</div>`).join('')}
                    </div>
                </div>
            </div>
            
            <label>Cell phone number</label>
            <input type="tel" class="tooltip-phone">
            
            <label>Primary Complaint</label>
            <div class="tooltip-complaint-select">
                <select class="tooltip-complaint">
                    <option value="">Select complaint</option>
                    <option value="toothache">Toothache</option>
                    <option value="cleaning">Cleaning</option>
                    <option value="cavity">Cavity</option>
                    <option value="extraction">Extraction</option>
                    <option value="implant">Implant</option>
                    <option value="denture">Denture</option>
                    <option value="orthodontics">Orthodontics</option>
                    <option value="other">Other</option>
                </select>
                <textarea class="tooltip-complaint-other" placeholder="Specify other complaints"></textarea>
            </div>


            <div class="tooltip-buttons">
                <button class="tooltip-rsvd-btn">RSVD</button>
            </div>
        </form>
    `;

    document.body.appendChild(tooltip);

    // Birth date 드롭다운 이벤트 설정
    const birthSelects = tooltip.querySelectorAll('.tooltip-birth-select');
    birthSelects.forEach(select => {
        const selected = select.querySelector('.birth-selected');
        const options = select.querySelector('.birth-options');
        
        // 초기 상태 명시적 설정
        options.style.display = 'none';

        // 드롭다운 토글
        selected.addEventListener('click', (e) => {
            // 다른 열린 드롭다운들 닫기
            birthSelects.forEach(otherSelect => {
                if (otherSelect !== select) {
                    otherSelect.querySelector('.birth-options').style.display = 'none';
                }
            });
            options.style.display = options.style.display === 'none' ? 'block' : 'none';
            e.stopPropagation();
        });

        // 옵션 선택
        options.addEventListener('click', (e) => {
            if (e.target.classList.contains('birth-option')) {
                selected.textContent = e.target.textContent;
                options.style.display = 'none';
                e.stopPropagation();
            }
        });
    });

    // 의사 목록 로드 및 드롭다운 설정
  
   // Primary Complaint 드롭다운 이벤트 추가
   const complaintSelect = tooltip.querySelector('.tooltip-complaint');
   const complaintOther = tooltip.querySelector('.tooltip-complaint-other');

   complaintSelect.addEventListener('change', (e) => {
       if (e.target.value === 'other') {
           complaintOther.style.display = 'block';
       } else {
           complaintOther.style.display = 'none';
       }
   });
    // RSVD 버튼 이벤트 리스너
    const rsvdButton = tooltip.querySelector('.tooltip-rsvd-btn');
    rsvdButton.addEventListener('click', async (e) => {
        e.preventDefault();
        try {
            const name = tooltip.querySelector('.tooltip-name').value;
            const gender = tooltip.querySelector('.tooltip-gender').value;
            const birthDay = tooltip.querySelector('.tooltip-birth-select:nth-child(1) .birth-selected').textContent;
            const birthMonth = tooltip.querySelector('.tooltip-birth-select:nth-child(2) .birth-selected').textContent;
            const birthYear = tooltip.querySelector('.tooltip-birth-select:nth-child(3) .birth-selected').textContent;
            
            // 이름과 생년월일만 필수값으로 체크
            if (!name || birthDay === 'Day' || birthMonth === 'Month' || birthYear === 'Year') {
                alert('Please enter name and birth date');
                return;
            }

            const phoneNumber = tooltip.querySelector('.tooltip-phone').value || null;
            const primaryComplaint = tooltip.querySelector('.tooltip-complaint').value;
            const otherComplaint = tooltip.querySelector('.tooltip-complaint-other').value;
            const finalComplaint = primaryComplaint === 'other' ? otherComplaint : primaryComplaint || null;
            // 의사 정보 관련 코드 제거하고 항상 null로 설정
            const selectedDoctor = null;

            const user = auth.currentUser;
            const [hospitalName] = user.email.split('@')[0].split('.');
            const patientId = `${name.toLowerCase().replace(/\s+/g, '.')}`;

            // 1. 환자 기본 정보 저장
            const birthDate = new Date(`${birthMonth} ${birthDay} ${birthYear}`);
            const patientInfoRef = doc(db, 'hospitals', hospitalName, 'patient', patientId);
            await setDoc(patientInfoRef, {
                info: {
                    name: name,
                    gender: gender,
                    birthDate: Timestamp.fromDate(birthDate),
                    phoneNumber: phoneNumber,
                    address: null,
                    insurance: {
                        status: null,
                        provider: null,
                        cardNumber: null
                    }
                }
            });

            // 선택된 날짜와 시간 가져오기
            const tooltipDate = tooltip.querySelector('.tooltip-date').textContent.trim().replace(/\s+/g, '.');
            const tooltipTime = tooltip.querySelector('.tooltip-time').textContent;
            
            // 2. 환자 예약 기록 저장
            const registerDateId = `${tooltipDate}_${tooltipTime}00`;
            const registerDateRef = doc(db, 'hospitals', hospitalName, 'patient', patientId, 'register.date', registerDateId);
            await setDoc(registerDateRef, {
                timestamp: serverTimestamp(),
                primaryComplaint: finalComplaint,
                doctor: selectedDoctor,
                progress: 'reservation',
                rsvdTime: tooltipTime
            });

            // 3. 병원 날짜별 예약 목록 저장 부분 수정
            const [day, month, year] = tooltipDate.split('.');
            const monthIndex = months.indexOf(month);
            const [hour, minute] = tooltipTime.split(':');

            const rsvdDateTime = new Date(year, monthIndex, parseInt(day));
            rsvdDateTime.setHours(parseInt(hour), parseInt(minute), 0, 0);

            const reservationRef = doc(db, 'hospitals', hospitalName, 'dates', tooltipDate, 'reservation', patientId);
            await setDoc(reservationRef, {
                timestamp: serverTimestamp(),  // 예약 등록 시점
                primaryComplaint: finalComplaint,
                doctor: selectedDoctor,
                rsvdTime: Timestamp.fromDate(rsvdDateTime)  // 실제 예약 시간
            });

            alert('Reservation completed successfully');
            tooltip.remove();

            // 예약 완료 후 달력과 스케줄러 즉시 업데이트 2025-02-12 12:45
            await Promise.all([
                updateCalendarReservations(hospitalName),
                updateSchedulerReservations(tooltipDate)
            ]);

        } catch (error) {
            console.error('Error making reservation:', error);
            alert('Failed to make reservation: ' + error.message);
        }
    });
    
    // 외부 클릭 시 드롭다운 닫기
    document.addEventListener('click', (e) => {
        // birth date 드롭다운들 닫기
        if (!e.target.closest('.tooltip-birth-select')) {
            const birthSelects = tooltip.querySelectorAll('.tooltip-birth-select');
            birthSelects.forEach(select => {
                select.querySelector('.birth-options').style.display = 'none';
            });
        }
        
        // tooltip 자체 닫기
        if (!tooltip.contains(e.target) && !e.target.classList.contains('schedule-cell')) {
            tooltip.remove();
        }
    });

    // 닫기 버튼 이벤트
    tooltip.querySelector('.tooltip-close').addEventListener('click', () => {
        tooltip.remove();
    });
}

async function updateCalendarReservations(hospitalName) {
    const dates = document.querySelectorAll('.date:not(.empty)');
    
    dates.forEach(async (dateDiv) => {
        const day = dateDiv.textContent;
        const currentDate = new Date(document.querySelector('.month-year').textContent);
        const formattedDate = `${day.padStart(2, '0')}.${months[currentDate.getMonth()]}.${currentDate.getFullYear()}`;
        
        // 해당 날짜의 reservation 컬렉션 조회
        const reservationRef = collection(db, 'hospitals', hospitalName, 'dates', formattedDate, 'reservation');
        const snapshot = await getDocs(reservationRef);
        
        // 예약 수가 있는 경우에만 표시
        if (snapshot.size > 0) {
            // 기존 예약 수 표시 요소가 있으면 제거
            const existingCount = dateDiv.querySelector('.reservation-count');
            if (existingCount) existingCount.remove();
            
            // 새로운 예약 수 표시
            const countDiv = document.createElement('div');
            countDiv.className = 'reservation-count';
            countDiv.textContent = snapshot.size;
            dateDiv.appendChild(countDiv);
        }
    });
}

export async function updateSchedulerReservations(currentDate) {
    // 기존 예약 표시 제거
    document.querySelectorAll('.schedule-cell').forEach(cell => {
        cell.innerHTML = '';
    });
    
    const user = auth.currentUser;
    if (!user) return;
    
    const [hospitalName] = user.email.split('@')[0].split('.');
    
    // 해당 날짜의 예약 정보 조회
    const reservationRef = collection(db, 'hospitals', hospitalName, 'dates', currentDate, 'reservation');
    const snapshot = await getDocs(reservationRef);
    
    // 시간대별로 예약 정보 정리
    const timeSlots = {};
    snapshot.forEach(doc => {
        const data = doc.data();
        // Timestamp를 시간 문자열로 변환
        const rsvdDateTime = data.rsvdTime.toDate();
        const time = `${rsvdDateTime.getHours().toString().padStart(2, '0')}:${rsvdDateTime.getMinutes().toString().padStart(2, '0')}`;
        
        if (!timeSlots[time]) timeSlots[time] = [];
        timeSlots[time].push(doc.id);
    });
    
    // 스케줄러에 예약 표시
    Object.entries(timeSlots).forEach(([time, patients]) => {
        const [hour, minute] = time.split(':');
        const rowIndex = (parseInt(hour) - 8) * 2 + (minute === '30' ? 1 : 0);
        const cells = document.querySelectorAll(`.time-grid .schedule-cell`);
        
        patients.forEach((patientId, index) => {
            const cellIndex = rowIndex * 5 + index;
            if (cells[cellIndex]) {
                const nameSpan = document.createElement('span');
                nameSpan.className = 'patient-name-calendar';
                nameSpan.textContent = `[${patientId}]`;
                cells[cellIndex].appendChild(nameSpan);
            }
        });
    });
}
