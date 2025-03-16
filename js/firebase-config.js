      // Firebase SDK 임포트
      import { initializeApp } from "https://www.gstatic.com/firebasejs/11.2.0/firebase-app.js";
      import { getAuth, EmailAuthProvider, reauthenticateWithCredential } from "https://www.gstatic.com/firebasejs/11.2.0/firebase-auth.js";
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
          deleteDoc,
          deleteField
      } from "https://www.gstatic.com/firebasejs/11.2.0/firebase-firestore.js";
      import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/11.2.0/firebase-storage.js";
                                                                                                                                                                                                    
      // Firebase 초기화
      const firebaseConfig = {
        apiKey: "AIzaSyDfTE5XjQKbaQ7DG4zu_clNyZAZJwrokbk",
        authDomain: "mediqore-14957.firebaseapp.com",
        projectId: "mediqore-14957",
        storageBucket: "mediqore-14957.appspot.com",
        messagingSenderId: "67288417543",
        appId: "1:67288417543:web:6bfe844b303a2d3b24b1a2",
        measurementId: "G-S00R71J8YV"
      };

      const app = initializeApp(firebaseConfig);
      const auth = getAuth(app);
      const db = getFirestore(app);
      const storage = getStorage(app);

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
          deleteDoc,
          EmailAuthProvider,
          reauthenticateWithCredential,
          deleteField,
          storage,
          ref,
          uploadBytes,
          getDownloadURL
      };