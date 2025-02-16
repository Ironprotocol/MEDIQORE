import { auth, db, doc, getDoc, collection, getDocs, updateDoc, onSnapshot } from './firebase-config.js';

export async function initializeRoomManagement(hospitalName) {
    const roomContainer = document.querySelector('.patient-list-container');
    const roomsRef = collection(db, 'hospitals', hospitalName, 'treatment.room');
    const desksRef = collection(db, 'hospitals', hospitalName, 'desk');

    // 실시간 업데이트 리스너
    onSnapshot(roomsRef, async (roomSnapshot) => {
        const rooms = [];
        roomSnapshot.forEach(doc => {
            rooms.push({ id: doc.id, type: 'room', ...doc.data() });
        });

        // desk 데이터 가져오기
        const deskSnapshot = await getDocs(desksRef);
        const desks = [];
        deskSnapshot.forEach(doc => {
            desks.push({ id: doc.id, type: 'desk', ...doc.data() });
        });

        // 정렬 (Room 먼저, 그 다음 Desk)
        const allItems = [
            ...rooms.sort((a, b) => a.id.localeCompare(b.id)),
            ...desks.sort((a, b) => a.id.localeCompare(b.id))
        ];

        // UI 업데이트
        roomContainer.innerHTML = allItems.map(item => {
            const hasPatients = item.type === 'room' && item.patients && item.patients.length > 0;
            return `
                <div class="room-item ${hasPatients ? 'has-patients' : ''}">
                    <div class="room-header">
                        <div class="room-info">
                            <span class="room-title">${item.id}</span>
                            ${item.type === 'room' && item.doctor ? 
                                `<span class="doctor-name">${item.doctor}</span>` : 
                                ''}
                        </div>
                        ${item.type === 'room' ? 
                            (item.doctor ? 
                                `<button class="exit-btn" data-room="${item.id}">Exit</button>` : 
                                `<button class="join-btn" data-room="${item.id}">Join</button>`
                            ) : ''}
                    </div>
                    ${hasPatients ? 
                        `<div class="patient-list">
                            ${item.patients.map(patient => `
                                <div class="room-patient-item">
                                    <span class="patient-name">${patient.name}</span>
                                    <img src="image/${patient.status}.png" alt="${patient.status}" 
                                         class="patient-status-icon">
                                </div>
                            `).join('')}
                        </div>` : 
                        ''}
                </div>
            `;
        }).join('');

        // Join 버튼 이벤트 리스너
        document.querySelectorAll('.join-btn').forEach(btn => {
            btn.addEventListener('click', async function() {
                const roomId = this.dataset.room;
                const userEmail = auth.currentUser.email;
                const [hospitalName, role] = userEmail.split('@')[0].split('.');

                if (role !== 'doctor') return;

                try {
                    const userRef = doc(db, 'hospitals', hospitalName, 'staff', userEmail);
                    const userDoc = await getDoc(userRef);
                    const userName = userDoc.data().name;

                    // 1. 먼저 의사가 다른 room에 있는지, 환자가 있는지 체크
                    const hasPatients = await checkCurrentRoomPatients(hospitalName, userName);
                    if (!hasPatients) {
                        // "There are still patients in your room" 알림은 checkCurrentRoomPatients 함수 내에서 표시됨
                        return;
                    }

                    // 2. 선택한 room에 다른 의사가 있는지 확인
                    const roomRef = doc(db, 'hospitals', hospitalName, 'treatment.room', roomId);
                    const roomDoc = await getDoc(roomRef);
                    const roomData = roomDoc.data();

                    if (roomData.doctor) {
                        alert("Another doctor is already working in your room");
                        return;
                    }

                    // 3. room이 비어있는 경우, 시작 여부 확인
                    if (!confirm("Would you like to start working?")) {
                        return;
                    }

                    // 4. 모든 체크 통과 시 Join 진행
                    await updateDoc(roomRef, {
                        doctor: userName,
                        work: 'start'
                    });

                    await updateDoc(userRef, {
                        work: 'start'
                    });

                    const statusDot = document.querySelector('.status-dot');
                    if (statusDot) {
                        statusDot.style.backgroundColor = getStatusColor('start');
                    }
                } catch (error) {
                    console.error('Error joining room:', error);
                }
            });
        });

        // Exit 버튼 이벤트 리스너
        document.querySelectorAll('.exit-btn').forEach(btn => {
            btn.addEventListener('click', async function() {
                const roomId = this.dataset.room;
                const userEmail = auth.currentUser.email;
                const [hospitalName, role] = userEmail.split('@')[0].split('.');

                if (role !== 'doctor') return;

                try {
                    // 현재 방의 환자 체크
                    const roomRef = doc(db, 'hospitals', hospitalName, 'treatment.room', roomId);
                    const roomDoc = await getDoc(roomRef);
                    const roomData = roomDoc.data();

                    // Exit 확인
                    if (!confirm('Are you sure you want to exit the room?')) {
                        return;
                    }

                    // 환자가 있는 경우
                    if (roomData.patients && roomData.patients.length > 0) {
                        alert('There are still patients in your room.');
                        return;
                    }

                    const userRef = doc(db, 'hospitals', hospitalName, 'staff', userEmail);
                    const userDoc = await getDoc(userRef);
                    const userName = userDoc.data().name;

                    // 진료실에서 의사 제거
                    await updateDoc(roomRef, {
                        doctor: null,
                        work: null
                    });

                    // 의사의 work 값 변경
                    await updateDoc(userRef, {
                        work: 'login'
                    });

                    // 상단 상태 원 업데이트
                    const statusDot = document.querySelector('.status-dot');
                    if (statusDot) {
                        statusDot.style.backgroundColor = getStatusColor('login');
                    }
                } catch (error) {
                    console.error('Error exiting room:', error);
                }
            });
        });
    });
}

// 로그아웃 감지 및 처리
export async function handleRoomLogout() {
    try {
        const [hospitalName, role] = auth.currentUser?.email.split('@')[0].split('.') || [];
        if (role === 'doctor') {
            const userRef = doc(db, 'hospitals', hospitalName, 'staff', auth.currentUser.email);
            const userDoc = await getDoc(userRef);
            
            const roomsRef = collection(db, 'hospitals', hospitalName, 'treatment.room');
            const roomsSnapshot = await getDocs(roomsRef);
            
            roomsSnapshot.forEach(async (roomDoc) => {
                if (roomDoc.data().doctor === userDoc.data().name) {
                    await updateDoc(doc(roomsRef, roomDoc.id), {
                        doctor: null
                    });
                }
            });
        }
    } catch (error) {
        console.error('Error handling logout:', error);
    }
}

// 현재 방의 환자 체크 함수
export async function checkCurrentRoomPatients(hospitalName, doctorName) {
    try {
        const roomsRef = collection(db, 'hospitals', hospitalName, 'treatment.room');
        const roomsSnapshot = await getDocs(roomsRef);
        
        // 현재 의사가 있는 방 찾기
        for (const roomDoc of roomsSnapshot.docs) {
            const roomData = roomDoc.data();
            if (roomData.doctor === doctorName) {
                // 현재 방에 환자가 있는지 확인
                if (roomData.patients && roomData.patients.length > 0) {
                    alert('There are still patients in your room.');
                    return false;
                }
                return true;
            }
        }
        return true; // 의사가 어떤 방에도 없는 경우
    } catch (error) {
        console.error('Error checking room patients:', error);
        return false;
    }
}
