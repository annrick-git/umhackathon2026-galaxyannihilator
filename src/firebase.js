import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, orderBy, onSnapshot } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyDemo-key-replace-with-yours",
  authDomain: "stockmaster-demo.firebaseapp.com",
  projectId: "stockmaster-demo",
  storageBucket: "stockmaster-demo.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

export const suppliersCollection = collection(db, 'suppliers');
export const inventoryCollection = collection(db, 'inventory');
export const ordersCollection = collection(db, 'orders');
export const gapsCollection = collection(db, 'gaps');

export {
  getDocs, addDoc, updateDoc, deleteDoc, doc, query, orderBy, onSnapshot
};