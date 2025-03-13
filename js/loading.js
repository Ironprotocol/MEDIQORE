// Firebase SDK 임포트
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.2.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.2.0/firebase-auth.js";
import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/11.2.0/firebase-firestore.js";

document.addEventListener('DOMContentLoaded', function() {
    // Firebase 구성 객체
    const firebaseConfig = {
        apiKey: "AIzaSyDfTE5XjQKbaQ7DG4zu_clNyZAZJwrokbk",
        authDomain: "mediqore-14957.firebaseapp.com",
        projectId: "mediqore-14957",
        storageBucket: "mediqore-14957.firebasestorage.app",
        messagingSenderId: "67288417543",
        appId: "1:67288417543:web:6bfe844b303a2d3b24b1a2",
        measurementId: "G-S00R71J8YV"
    };

    // Firebase 초기화
    const app = initializeApp(firebaseConfig);
    const auth = getAuth(app);
    const db = getFirestore(app);

    // URL에서 파라미터 가져오기
    const urlParams = new URLSearchParams(window.location.search);
    const stayOnLoading = urlParams.get('stay') === 'true';
    const redirectTime = urlParams.get('time');
    const redirectDelay = redirectTime ? parseInt(redirectTime) * 1000 : 5000;

    // 사용자 인증 상태 확인 (이미 main.html에서 검증됨)
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            try {
                const email = user.email;
                const [hospitalName, role] = email.split('@')[0].split('.');

                console.log('사용자 역할 확인 및 리다이렉션:', email, '역할:', role);
                
                // 'stay=true' 파라미터가 있으면 리다이렉션하지 않음
                if (!stayOnLoading) {
                    setTimeout(function() {
                        // 역할에 따라 다른 페이지로 리다이렉션
                        if (role === 'chemist') {
                            console.log('약사 계정 확인: pharmacy.html로 이동합니다.');
                            window.location.href = 'pharmacy.html';
                        } else {
                            console.log('의사/데스크 계정 확인: hospital.html로 이동합니다.');
                            window.location.href = 'hospital.html';
                        }
                    }, redirectDelay);
                }
            } catch (error) {
                console.error('사용자 정보 확인 중 오류 발생:', error);
                alert('로그인 처리 중 오류가 발생했습니다: ' + error.message);
                window.location.href = 'main.html';
            }
        } else {
            // 로그인하지 않은 경우 메인 페이지로 리다이렉션
            console.log('로그인되지 않은 사용자입니다.');
            window.location.href = 'main.html';
        }
    });
});
