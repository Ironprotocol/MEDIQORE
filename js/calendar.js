export class CustomCalendar {
    constructor() {
        this.date = new Date();
        this.monthYear = document.querySelector('.month-year');
        this.calendarGrid = document.querySelector('.calendar-grid');
        this.months = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
        ];
        this.init();
        this.currentTooltip = null;  // 현재 열린 툴팁 추적
        }

    init() {
        this.renderCalendar();
        this.addEventListeners();
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
        
        // 날짜 클릭 이벤트
        dateDiv.addEventListener('click', (e) => this.handleDateClick(e, i));
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
            document.getElementById('prevMonth').addEventListener('click', () => {
                this.date.setMonth(this.date.getMonth() - 1);
                this.renderCalendar();
            });
            document.getElementById('nextMonth').addEventListener('click', () => {
                this.date.setMonth(this.date.getMonth() + 1);
                this.renderCalendar();
            });
            }

    handleDateClick(e, date) {
        // 기존 툴팁 관련 코드 제거
        const formattedDate = this.formatDate(date);
        document.querySelector('.scheduler-header .current-date').textContent = formattedDate;
    }

    formatDate(day) {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const date = new Date(this.date.getFullYear(), this.date.getMonth(), day);
    return `${String(day).padStart(2, '0')}.${months[date.getMonth()]}.${date.getFullYear()}`;
    }
    };

// 스케줄러 초기화 함수 export 추가
export function initializeScheduler() {
    const timeGrid = document.querySelector('.time-grid');
    const currentDate = new Date();
    
    // 날짜 표시 형식 변경
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const formattedDate = `${currentDate.getDate().toString().padStart(2, '0')} ${months[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
    
    document.querySelector('.scheduler-header .current-date').textContent = formattedDate;
    
    // 시간대 생성 (8:00 ~ 15:00)
    for (let hour = 8; hour <= 15; hour++) {
        // 정시
        const timeSlot = document.createElement('div');
        timeSlot.className = 'time-slot';
        timeSlot.textContent = `${hour.toString().padStart(2, '0')}:00`;
        timeGrid.appendChild(timeSlot);
        
        // 10개의 셀 추가
        for (let i = 0; i < 10; i++) {
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
            
            // 30분대의 10개 셀 추가
            for (let i = 0; i < 10; i++) {
                const halfHourCell = document.createElement('div');
                halfHourCell.className = 'schedule-cell';
                halfHourCell.addEventListener('click', () => handleCellClick(hour, 30, i));
                timeGrid.appendChild(halfHourCell);
            }
        }
    }
}

function handleCellClick(hour, minute, column) {
    // 기존 툴팁이 있다면 제거
    const existingTooltip = document.querySelector('.schedule-tooltip');
    if (existingTooltip) {
        existingTooltip.remove();
    }

    const tooltip = document.createElement('div');
    tooltip.className = 'schedule-tooltip';
    tooltip.innerHTML = `
        <div class="tooltip-header">
            <div class="tooltip-datetime">
                <span class="tooltip-date">${document.querySelector('.current-date').textContent}</span>
                <span class="tooltip-time">${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}</span>
            </div>
            <span class="tooltip-close">&times;</span>
        </div>
        <form class="tooltip-form">
            <label>Name</label>
            <input type="text" class="tooltip-name">
            
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
            <input type="text" class="tooltip-complaint">

            <label>Select Doctor</label>
            <div class="tooltip-doctor-select">
                <div class="tooltip-doctor-selected">Choose a doctor</div>
                <div class="tooltip-doctor-options"></div>
            </div>
        </form>
        <div class="tooltip-footer">
            <button class="tooltip-rsvd">RSVD</button>
        </div>
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
    const doctorSelect = tooltip.querySelector('.tooltip-doctor-select');
    const doctorSelected = tooltip.querySelector('.tooltip-doctor-selected');
    const doctorOptions = tooltip.querySelector('.tooltip-doctor-options');

    // Firebase에서 의사 목록 가져오기
    const user = auth.currentUser;
    if (user) {
        const [hospitalName] = user.email.split('@')[0].split('.');
        const staffRef = collection(db, 'hospitals', hospitalName, 'staff');
        const q = query(staffRef, where('role', '==', 'doctor'));
        
        getDocs(q).then((querySnapshot) => {
            // 'Choose a doctor' 옵션 추가
            const defaultOption = document.createElement('div');
            defaultOption.className = 'tooltip-doctor-option';
            defaultOption.textContent = 'Choose a doctor';
            doctorOptions.appendChild(defaultOption);

            // 의사 목록 추가
            querySnapshot.forEach((doc) => {
                const doctorData = doc.data();
                const option = document.createElement('div');
                option.className = 'tooltip-doctor-option';
                option.textContent = doctorData.name;
                doctorOptions.appendChild(option);
            });

            // 초기 상태 명시적 설정
            doctorOptions.style.display = 'none';
        });
    }

    // 드롭다운 토글
    doctorSelected.addEventListener('click', () => {
        doctorOptions.style.display = doctorOptions.style.display === 'none' ? 'block' : 'none';
    });

    // 옵션 선택
    doctorOptions.addEventListener('click', (e) => {
        if (e.target.classList.contains('tooltip-doctor-option')) {
            doctorSelected.textContent = e.target.textContent;
            doctorOptions.style.display = 'none';
        }
    });

    // 닫기 버튼 이벤트
    tooltip.querySelector('.tooltip-close').addEventListener('click', () => {
        tooltip.remove();
    });

    // 외부 클릭 시 툴팁 닫기
    document.addEventListener('click', (e) => {
        if (!tooltip.contains(e.target) && !e.target.classList.contains('schedule-cell')) {
            tooltip.remove();
        }
    });
}
