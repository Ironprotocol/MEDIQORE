import { auth, db, doc, getDoc, collection, getDocs, updateDoc, onSnapshot } from './firebase-config.js';

// 펼침 상태를 저장할 Map 추가
const expandedRooms = new Map();
// 선택된 환자 ID 저장
let selectedPatientId = null;

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
        const updateRoomUI = async () => {
            const currentUserEmail = auth.currentUser.email;
            const [, role] = currentUserEmail.split('@')[0].split('.');
            let currentDoctorName = '';
            
            if (role === 'doctor') {
                const userRef = doc(db, 'hospitals', hospitalName, 'staff', currentUserEmail);
                const userDoc = await getDoc(userRef);
                currentDoctorName = userDoc.data().name;
            }

            roomContainer.innerHTML = allItems.map(item => {
                const hasPatients = item.type === 'room' && item.patients && item.patients.length > 0;
                const patientCount = hasPatients ? item.patients.length : 0;
                const isExpanded = expandedRooms.get(item.id) || false;
                
                return `
                    <div class="room-item ${hasPatients ? 'has-patients' : ''}" data-room-id="${item.id}">
                        <div class="room-header">
                            <div class="room-info">
                                <span class="room-title">${item.id}</span>
                                ${item.type === 'room' && item.doctor ? 
                                    `<span class="doctor-name">${item.doctor}</span>` : 
                                    ''}
                            </div>
                            ${item.type === 'room' ? 
                                (!item.doctor ? 
                                    `<button class="join-btn" data-room="${item.id}">Join</button>` :
                                    `<div class="patient-count-container" data-room="${item.id}">
                                        <span class="patient-count">${patientCount}</span>
                                        <span class="triangle-icon ${isExpanded ? 'expanded' : ''}">${isExpanded ? '▼' : '▲'}</span>
                                    </div>`
                                ) : ''}
                        </div>
                        ${hasPatients ? 
                            `<div class="patient-list" style="display: ${isExpanded ? 'block' : 'none'};">
                                ${item.patients.map(patient => `
                                    <div class="room-patient-item ${patient.id === selectedPatientId ? 'active' : ''}" 
                                         data-patient-id="${patient.id}">
                                        <span class="patient-name">${patient.name}</span>
                                        <span class="patient-age" style="display: none;">${patient.age || '0years'}</span>
                                        <img src="image/${patient.status}.png" alt="${patient.status}" 
                                             class="patient-status-icon">
                                    </div>
                                `).join('')}
                            </div>` : 
                            ''}
                    </div>
                `;
            }).join('');

            // 환자 수 클릭 이벤트 리스너 수정
            document.querySelectorAll('.patient-count-container').forEach(container => {
                container.addEventListener('click', function() {
                    const roomId = this.dataset.room;
                    const roomItem = this.closest('.room-item');
                    const patientList = roomItem.querySelector('.patient-list');
                    const triangleIcon = this.querySelector('.triangle-icon');
                    
                    if (patientList) {
                        const isExpanded = expandedRooms.get(roomId) || false;
                        expandedRooms.set(roomId, !isExpanded);
                        
                        patientList.style.display = !isExpanded ? 'block' : 'none';
                        triangleIcon.textContent = !isExpanded ? '▼' : '▲';
                        triangleIcon.classList.toggle('expanded');
                    }
                });
            });

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

                        // 1. 선택한 room에 다른 의사가 있는지 확인
                        const roomRef = doc(db, 'hospitals', hospitalName, 'treatment.room', roomId);
                        const roomDoc = await getDoc(roomRef);
                        const roomData = roomDoc.data();

                        if (roomData.doctor) {
                            alert("Another doctor is already working in your room");
                            return;
                        }

                        // 2. room이 비어있는 경우, 시작 여부 확인
                        if (!confirm("Would you like to start working?")) {
                            return;
                        }

                        // 3. Join 진행
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

            // 환자 클릭 이벤트 리스너 수정
            document.querySelectorAll('.room-patient-item').forEach(patientItem => {
                patientItem.addEventListener('click', function() {
                    // 이전에 선택된 환자의 active 상태 제거
                    document.querySelectorAll('.room-patient-item').forEach(item => {
                        item.classList.remove('active');
                    });
                    // 현재 선택된 환자에 active 상태 추가
                    this.classList.add('active');
                    selectedPatientId = this.dataset.patientId;  // 선택된 환자 ID 저장
                    handlePatientClick(this);
                });
            });
        };

        await updateRoomUI();
    });
}

// 로그아웃 감지 및 처리
export async function handleRoomLogout() {
    expandedRooms.clear(); // 펼침 상태 초기화
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

function handlePatientClick(patientElement) {
    const patientName = patientElement.querySelector('.patient-name').textContent;
    const patientAge = patientElement.closest('.room-patient-item').querySelector('.patient-age').textContent;

    // Prescription 메뉴로 전환
    const prescriptionMenu = Array.from(document.querySelectorAll('.menu-item')).find(
        item => item.textContent.trim() === 'Prescription'
    );

    if (prescriptionMenu) {
        prescriptionMenu.click();

        // 환자 정보 이벤트 발생
        const event = new CustomEvent('prescriptionPatientSelected', {
            detail: { name: patientName, age: patientAge }
        });
        document.dispatchEvent(event);
    }
}