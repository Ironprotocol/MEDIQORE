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

    // 현재 달의 날짜들 추가
    for (let i = 1; i <= lastDay.getDate(); i++) {
        const dateDiv = document.createElement('div');
        dateDiv.className = 'date';
        dateDiv.textContent = i;
        
        // 날짜 클릭 이벤트
        dateDiv.addEventListener('click', (e) => this.handleDateClick(e, i));
        
        this.calendarGrid.appendChild(dateDiv);
    }

    // 남은 칸을 빈 셀로 채우기
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
    // 이미 열린 툴팁이 있다면 제거
    if (this.currentTooltip) {
        this.currentTooltip.remove();
        this.currentTooltip = null;
    }

    const tooltip = document.createElement('div');
    tooltip.className = 'date-tooltip';
    tooltip.innerHTML = `
        <div class="tooltip-header">
            <span class="tooltip-date">${this.formatDate(date)}</span>
            <span class="tooltip-close">&times;</span>
        </div>
        <form class="tooltip-form">
            <label>Name</label>
            <input type="text" class="tooltip-name">
            
            <label>Birth Date</label>
            <div class="date-select-group">
                <select id="birthDay" name="birthDay" required>
                    <option value="">Day</option>
                    ${Array.from({length: 31}, (_, i) => i + 1).map(day => 
                        `<option value="${day}">${day}</option>`
                    ).join('')}
                </select>
                <select id="birthMonth" name="birthMonth" required>
                    <option value="">Month</option>
                    <option value="1">Jan</option>
                    <option value="2">Feb</option>
                    <option value="3">Mar</option>
                    <option value="4">Apr</option>
                    <option value="5">May</option>
                    <option value="6">Jun</option>
                    <option value="7">Jul</option>
                    <option value="8">Aug</option>
                    <option value="9">Sep</option>
                    <option value="10">Oct</option>
                    <option value="11">Nov</option>
                    <option value="12">Dec</option>
                </select>
                <select id="birthYear" name="birthYear" required>
                    <option value="">Year</option>
                    ${Array.from({length: 100}, (_, i) => new Date().getFullYear() - i).map(year =>
                        `<option value="${year}">${year}</option>`
                    ).join('')}
                </select>
            </div>
            
            <label>Cell phone number</label>
            <input type="tel" class="tooltip-phone">
            
            <label>Primary Complaint</label>
            <input type="text" class="tooltip-complaint">

            <label>Reservation Time</label>
            <div class="date-select-group">
                <select class="tooltip-time-hour">
                    <option value="">Hour</option>
                    ${Array.from({length: 13}, (_, i) => i + 6).map(hour => 
                        `<option value="${String(hour).padStart(2, '0')}">${String(hour).padStart(2, '0')}</option>`
                    ).join('')}
                </select>
                <select class="tooltip-time-minute">
                    <option value="">Minute</option>
                    <option value="00">00</option>
                    <option value="30">30</option>
                </select>
            </div>
        </form>
        <div class="tooltip-footer">
            <button class="tooltip-rsvd">RSVD</button>
        </div>
    `;

    // 툴팁 위치 계산
    const rect = e.target.getBoundingClientRect();
    const tooltipHeight = 200; // 툴팁의 대략적인 높이

    // 화면 위쪽 공간이 충분한지 확인
    const hasSpaceAbove = rect.top > tooltipHeight;

    if (hasSpaceAbove) {
        // 위쪽에 표시
        tooltip.style.left = `${rect.left}px`;
        tooltip.style.top = `${rect.top - tooltipHeight - 10}px`;  // 10px 간격
        tooltip.classList.add('tooltip-above');
    } else {
        // 아래쪽에 표시 (기존 방식)
        tooltip.style.left = `${rect.left}px`;
        tooltip.style.top = `${rect.bottom + 10}px`;
        tooltip.classList.remove('tooltip-above');
    }

    // 닫기 버튼 이벤트
    tooltip.querySelector('.tooltip-close').addEventListener('click', () => {
        tooltip.remove();
        this.currentTooltip = null;
    });

    // RSVD 버튼 이벤트
    tooltip.querySelector('.tooltip-rsvd').addEventListener('click', () => {
        const name = tooltip.querySelector('.tooltip-name').value;
        const birthDay = tooltip.querySelector('#birthDay').value;
        const birthMonth = tooltip.querySelector('#birthMonth').value;
        const birthYear = tooltip.querySelector('#birthYear').value;
        const phone = tooltip.querySelector('.tooltip-phone').value;
        const complaint = tooltip.querySelector('.tooltip-complaint').value;
        const time = tooltip.querySelector('.tooltip-time').value;
        
        if (!name || !birthDay || !birthMonth || !birthYear || !phone || !complaint || !time) {
            alert('Please fill in all fields');
            return;
        }

        // TODO: 여기에 예약 데이터 저장 로직 추가
        console.log('Reservation:', { 
            date: this.formatDate(date), 
            name, 
            birth: `${birthYear}-${birthMonth}-${birthDay}`,
            phone,
            complaint,
            time
        });
        
        tooltip.remove();
        this.currentTooltip = null;
    });

    document.body.appendChild(tooltip);
    tooltip.style.display = 'block';
    this.currentTooltip = tooltip;

    // 외부 클릭 시 툴팁 닫기
    document.addEventListener('click', (e) => {
        if (this.currentTooltip && !this.currentTooltip.contains(e.target) && !e.target.classList.contains('date')) {
            this.currentTooltip.remove();
            this.currentTooltip = null;
        }
    });
}

formatDate(day) {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const date = new Date(this.date.getFullYear(), this.date.getMonth(), day);
    return `${String(day).padStart(2, '0')}.${months[date.getMonth()]}.${date.getFullYear()}`;
}
};
