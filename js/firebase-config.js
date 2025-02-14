      // Firebase SDK 임포트
      import { initializeApp } from "https://www.gstatic.com/firebasejs/11.2.0/firebase-app.js";
      import { getAuth } from "https://www.gstatic.com/firebasejs/11.2.0/firebase-auth.js";
      import { 
          getFirestore, 
          doc, 
          getDoc, 
          setDoc, 
          collection, 
          query, 
          where,
          getDocs, 
          updateDoc, 
          serverTimestamp, 
          Timestamp,
          onSnapshot,
          orderBy,
          deleteDoc
      } from "https://www.gstatic.com/firebasejs/11.2.0/firebase-firestore.js";
                                                                                                                                                                                                    
      // Firebase 초기화
      const firebaseConfig = {
        apiKey: "AIzaSyDfTE5XjQKbaQ7DG4zu_clNyZAZJwrokbk",
        authDomain: "mediqore-14957.firebaseapp.com",
        projectId: "mediqore-14957",
        storageBucket: "mediqore-14957.firebasestorage.app",
        messagingSenderId: "67288417543",
        appId: "1:67288417543:web:6bfe844b303a2d3b24b1a2",
        measurementId: "G-S00R71J8YV"
      };

      const app = initializeApp(firebaseConfig);
      const auth = getAuth(app);
      const db = getFirestore(app);

      export { 
          app, 
          auth, 
          db, 
          doc, 
          getDoc, 
          setDoc, 
          collection, 
          query, 
          where, 
          getDocs, 
          updateDoc, 
          serverTimestamp, 
          Timestamp,
          onSnapshot,
          orderBy,
          deleteDoc
      };