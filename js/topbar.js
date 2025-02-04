import { auth, db, doc, getDoc } from './firebase-config.js';

//------------------------------------------ 우측 상단에 표시되는 이름 조정 함수----------------------------------------- 
export async function displayUserName(user) {
    try {
        const [hospitalName] = user.email.split('@')[0].split('.');
        const userRef = doc(db, 'hospitals', hospitalName, 'staff', user.email);
        const userDoc = await getDoc(userRef);

        if (userDoc.exists()) {
            const userData = userDoc.data();
            document.querySelector('.user-name').textContent = userData.name;
            // 현재 work 상태에 따라 상태 아이콘 업데이트
            const statusIcon = document.querySelector('.current-status img');
            statusIcon.src = `image/${userData.work}.png`;
            statusIcon.alt = userData.work;
        }
    } catch (error) {
        console.error('Error displaying user name:', error);
    }
}

// 현재 사용자 이름 초기화
export function initializeUserName() {
    // 현재 로그인된 사용자 확인 및 이름 표시
    const currentUser = auth.currentUser;
    if (currentUser) {
        displayUserName(currentUser);
    }

    // auth 상태 변경 감지
    auth.onAuthStateChanged(user => {
        if (user) {
            displayUserName(user);
        }
    });
}
//------------------------------------------ 우측 상단에 표시되는 이름 조정 함수----------------------------------------- 