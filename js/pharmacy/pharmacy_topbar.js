import { auth, db, doc, getDoc, onSnapshot } from '../firebase-config.js';

// 사용자 이메일과 상태 표시 함수
export async function displayUserEmail(user) {
    try {
        const email = user.email;
        const [pharmacyName] = email.split('@')[0].split('.');
        const userRef = doc(db, 'pharmacy', pharmacyName, 'staff', user.email);
        const userDoc = await getDoc(userRef);

        if (userDoc.exists()) {
            const userData = userDoc.data();
            // 이메일 표시
            document.querySelector('.user-email').textContent = user.email;
            
            // 현재 work 상태에 따라 상태 아이콘 업데이트
            const statusIcon = document.querySelector('.current-status img');
            statusIcon.src = `image/${userData.work || 'login'}.png`;
            statusIcon.alt = userData.work || 'login';
        }
    } catch (error) {
        console.error('Error displaying user email:', error);
    }
}

// 사용자 상태 변경 감지를 위한 리스너 설정
export function setupUserStatusListener(user) {
    if (!user) return null;
    
    const [pharmacyName] = user.email.split('@')[0].split('.');
    const userRef = doc(db, 'pharmacy', pharmacyName, 'staff', user.email);
    
    return onSnapshot(userRef, (snapshot) => {
        if (snapshot.exists()) {
            const userData = snapshot.data();
            // 이메일 표시는 변경되지 않음
            
            // 상태 아이콘 업데이트
            const statusIcon = document.querySelector('.current-status img');
            statusIcon.src = `image/${userData.work || 'login'}.png`;
            statusIcon.alt = userData.work || 'login';
        }
    });
}

// 초기화 함수
export function initializeTopBar() {
    // 현재 로그인된 사용자 확인 및 이메일 표시
    const currentUser = auth.currentUser;
    if (currentUser) {
        displayUserEmail(currentUser);
        // 상태 변경 감지 리스너 설정
        setupUserStatusListener(currentUser);
    }

    // auth 상태 변경 감지
    auth.onAuthStateChanged(user => {
        if (user) {
            displayUserEmail(user);
            setupUserStatusListener(user);
        }
    });
} 