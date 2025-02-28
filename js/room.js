import { auth, db, doc, getDoc, collection, getDocs, updateDoc, onSnapshot, query, where, deleteDoc } from './firebase-config.js';

// 펼침 상태를 저장할 Map 추가
const expandedRooms = new Map();
// 선택된 환자 ID 저장
let selectedPatientId = null;

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// 자정에 이전 날짜의 환자 데이터 삭제
async function cleanupPatients(hospitalName) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    try {
        // 1. 이전 날짜의 waiting/reservation 문서 정리
        const datesRef = collection(db, 'hospitals', hospitalName, 'dates');
        const datesSnapshot = await getDocs(datesRef);
        
        for (const dateDoc of datesSnapshot.docs) {
            const dateStr = dateDoc.id;
            const dateTimestamp = new Date(dateStr);
            
            // 이전 날짜의 데이터만 처리
            if (dateTimestamp < today) {
                // waiting 컬렉션 삭제
                const waitingRef = collection(dateDoc.ref, 'waiting');
                const waitingDocs = await getDocs(waitingRef);
                waitingDocs.forEach(async (doc) => {
                    await deleteDoc(doc.ref);
                });

                // reservation 컬렉션 삭제
                const reservationRef = collection(dateDoc.ref, 'reservation');
                const reservationDocs = await getDocs(reservationRef);
                reservationDocs.forEach(async (doc) => {
                    await deleteDoc(doc.ref);
                });
            }
        }

        // 2. treatment.room의 patients 배열 정리
        const roomsRef = collection(db, 'hospitals', hospitalName, 'treatment.room');
        const roomSnapshot = await getDocs(roomsRef);

        for (const roomDoc of roomSnapshot.docs) {
            const patients = roomDoc.data().patients || [];
            const updatedPatients = patients.filter(patient => {
                // timestamp나 rsvdTime이 오늘 이후인 환자만 유지
                if (patient.timestamp) {
                    return new Date(patient.timestamp.toDate()) >= today;
                }
                if (patient.rsvdTime) {
                    return new Date(patient.rsvdTime.toDate()) >= today;
                }
                return false;  // timestamp나 rsvdTime이 없으면 제거
            });

            if (updatedPatients.length !== patients.length) {
                await updateDoc(roomDoc.ref, {
                    patients: updatedPatients
                });
            }
        }
    } catch (error) {
        console.error('Error in cleanupPatients:', error);
    }
}

// cleanup 초기화 함수 수정
function initializeCleanup(hospitalName) {
    function scheduleNextCleanup() {
        const now = new Date();
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(0, 0, 0, 0);

        const timeUntilMidnight = tomorrow - now;
        
        // 다음 자정에 실행될 cleanup 예약
        setTimeout(() => {
            cleanupPatients(hospitalName);
            // 이후 24시간마다 반복
            setInterval(() => {
                cleanupPatients(hospitalName);
            }, 24 * 60 * 60 * 1000);
        }, timeUntilMidnight);
    }

    scheduleNextCleanup();
}
///////////////////////////////////////////////////////////////////////////////////////동작안하면 삭제
export async function initializeRoomManagement(hospitalName) {
    const roomContainer = document.querySelector('.patient-list-container');
    const roomsRef = collection(db, 'hospitals', hospitalName, 'treatment.room');
    const desksRef = collection(db, 'hospitals', hospitalName, 'desk');

    // 실시간 업데이트 리스너
    const unsubscribeRoom = onSnapshot(roomsRef, async (roomSnapshot) => {
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

            // 현재 의사가 어떤 room에 있는지 확인
            let doctorCurrentRoom = null;
            rooms.forEach(room => {
                if (room.doctor === currentDoctorName) {
                    doctorCurrentRoom = room.id;
                }
            });

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
                                    item.type === 'desk' && item.name ? 
                                    `<span class="staff-name">${item.name}</span>` :
                                    ''}
                            </div>
                            ${item.type === 'room' ? 
                                (!item.doctor && role === 'doctor' ? 
                                    `<button class="join-btn" data-room="${item.id}" 
                                        ${doctorCurrentRoom ? 'style="display: none;"' : ''}>
                                        Join</button>` :
                                    `<div class="patient-count-container" data-room="${item.id}">
                                        <span class="patient-count">${patientCount}</span>
                                        <span class="triangle-icon ${isExpanded ? 'expanded' : ''}">${isExpanded ? '▼' : '▲'}</span>
                                    </div>`
                                ) : 
                                // Desk UI에 대한 Join 버튼 또는 환자 수 표시
                                (item.type === 'desk' ? 
                                    (!item.name && role === 'desk' ? // staff 대신 name으로 체크
                                        `<button class="join-btn" data-desk="${item.id}">Join</button>` :
                                        `<div class="patient-count-container" data-desk="${item.id}">
                                            <span class="patient-count">0</span>
                                            <span class="triangle-icon ${isExpanded ? 'expanded' : ''}">${isExpanded ? '▼' : '▲'}</span>
                                        </div>`
                                    ) : '')}
                        </div>
                        ${hasPatients ? 
                            `<div class="patient-list" style="display: ${isExpanded ? 'block' : 'none'};">
                                ${item.patients.map(patient => `
                                    <div class="room-patient-item ${patient.id === selectedPatientId ? 'active' : ''}" 
                                         data-patient-id="${patient.id}">
                                        <span class="patient-name">${patient.name}</span>
                                        <span class="patient-age" style="display: none;">${patient.age || '0years'}</span>
                                        <img src="image/${patient.progress || 'waiting'}.png" alt="${patient.progress || 'waiting'}" 
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

            // Join 버튼 이벤트 리스너 (desk)
            document.querySelectorAll('.join-btn[data-desk]').forEach(btn => {
                btn.addEventListener('click', async function() {
                    const deskId = this.dataset.desk;
                    const userEmail = auth.currentUser.email;
                    const [hospitalName, role] = userEmail.split('@')[0].split('.');

                    if (role !== 'desk') return;

                    try {
                        const userRef = doc(db, 'hospitals', hospitalName, 'staff', userEmail);
                        const userDoc = await getDoc(userRef);
                        const userData = userDoc.data();

                        // Desk 문서 업데이트
                        const deskRef = doc(db, 'hospitals', hospitalName, 'desk', deskId);
                        await updateDoc(deskRef, {
                            name: userData.name,
                            work: 'start',
                            email: userData.email
                        });

                        // Staff 문서의 work 상태 업데이트
                        await updateDoc(userRef, {
                            work: 'start'
                        });

                        // UI 즉시 업데이트
                        const deskItem = btn.closest('.room-item');
                        if (deskItem) {
                            // Join 버튼 제거
                            btn.remove();
                            
                            // 직원 이름과 환자 수 표시 추가
                            const roomInfo = deskItem.querySelector('.room-info');
                            const staffName = document.createElement('span');
                            staffName.className = 'staff-name';
                            staffName.textContent = userData.name;
                            roomInfo.appendChild(staffName);

                            // 환자 수 컨테이너 추가
                            const patientCountContainer = document.createElement('div');
                            patientCountContainer.className = 'patient-count-container';
                            patientCountContainer.dataset.desk = deskId;
                            patientCountContainer.innerHTML = `
                                <span class="patient-count">0</span>
                                <span class="triangle-icon">▲</span>
                            `;
                            deskItem.querySelector('.room-header').appendChild(patientCountContainer);
                        }

                    } catch (error) {
                        console.error('Error joining desk:', error);
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
///////////////////////////////////////////////////////////////////////////////////////동작안하면 삭제
    // 자동 삭제 기능 초기화
    initializeCleanup(hospitalName);

    // 리스너 해제 함수 반환
    return () => {
        unsubscribeRoom();
    };
}
///////////////////////////////////////////////////////////////////////////////////////동작안하면 삭제
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
        // desk 계정 로그아웃 처리 추가
        else if (role === 'desk') {
            const userRef = doc(db, 'hospitals', hospitalName, 'staff', auth.currentUser.email);
            const userDoc = await getDoc(userRef);
            
            const desksRef = collection(db, 'hospitals', hospitalName, 'desk');
            const desksSnapshot = await getDocs(desksRef);
            
            desksSnapshot.forEach(async (deskDoc) => {
                if (deskDoc.data().email === auth.currentUser.email) {
                    await updateDoc(doc(desksRef, deskDoc.id), {
                        name: null,
                        work: null,
                        email: null
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
    const patientId = patientElement.dataset.patientId;

    // Prescription 메뉴로 전환
    const prescriptionMenu = Array.from(document.querySelectorAll('.menu-item')).find(
        item => item.textContent.trim() === 'Prescription'
    );

    if (prescriptionMenu) {
        prescriptionMenu.click();

        // 환자 정보 가져오기
        const [hospitalName] = auth.currentUser.email.split('@')[0].split('.');
        const patientRef = doc(db, 'hospitals', hospitalName, 'patient', patientId);
        
        getDoc(patientRef).then(async patientDoc => {
            if (patientDoc.exists()) {
                const patientData = patientDoc.data();
                const birthDate = patientData.info.birthDate.toDate();

                // 오늘 날짜의 register.date 문서 찾기
                const registerDateRef = collection(db, 'hospitals', hospitalName, 'patient', patientId, 'register.date');
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const registerQuery = query(registerDateRef, where('timestamp', '>=', today));
                const registerSnapshot = await getDocs(registerQuery);

                if (!registerSnapshot.empty) {
                    const registerDoc = registerSnapshot.docs[0];
                    
                    const event = new CustomEvent('prescriptionPatientSelected', {
                        detail: {
                            name: patientName,
                            gender: patientData.info.gender,
                            birthDate: birthDate,
                            age: new Date().getFullYear() - birthDate.getFullYear(),
                            patientId: patientId,
                            registerDate: registerDoc.id  // 오늘 날짜의 register.date 문서 ID
                        }
                    });
                    document.dispatchEvent(event);
                }
            }
        });
    }
}