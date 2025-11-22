import { initializeApp } from "firebase/app";
import { getStorage } from "firebase/storage";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyDSX_w-LDE7ZbZQwrxaG9ymU_kGRN1Se6M",
    authDomain: "chat-ai-34217.firebaseapp.com",
    projectId: "chat-ai-34217",
    storageBucket: "chat-ai-34217.firebasestorage.app",
    messagingSenderId: "720193222419",
    appId: "1:720193222419:web:3c14c814c9e92a31e54ce6",
    measurementId: "G-WHG9FDN4ND"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const storage = getStorage(app);
export const db = getFirestore(app);
export default app;
