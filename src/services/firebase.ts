import { initializeApp } from 'firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut as firebaseSignOut, onAuthStateChanged as firebaseOnAuthStateChanged, signInAnonymously } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc, collection, addDoc, query, where, onSnapshot, orderBy, serverTimestamp, updateDoc } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { DecisionResult } from '../types';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);

const provider = new GoogleAuthProvider();

export interface UserProfile {
  role?: 'student' | 'employee';
}

export const onAuthStateChanged = (authObj: typeof auth, callback: (user: any | null) => void) => {
  return firebaseOnAuthStateChanged(authObj, callback);
};

export const signInWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, provider);
    return result.user;
  } catch (error) {
    console.error("Error signing in with Google: ", error);
    throw error;
  }
};

export const signInAnonymouslyAuth = async () => {
  try {
    const result = await signInAnonymously(auth);
    return result.user;
  } catch (error) {
    console.error("Error signing in anonymously: ", error);
    throw error;
  }
};

export const getUserProfile = async (userId: string) => {
  try {
    const docRef = doc(db, 'users', userId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docSnap.data() as UserProfile;
    }
    return null;
  } catch (error) {
    console.error("Error fetching user profile:", error);
    return null;
  }
};

export const onboardUser = async (user: any, role: 'student' | 'employee') => {
  try {
    const docRef = doc(db, 'users', user.uid);
    await setDoc(docRef, { role, updatedAt: serverTimestamp() }, { merge: true });
    return true;
  } catch (error) {
    console.error("Error onboarding user: ", error);
    throw error;
  }
};

export const logout = async () => {
  try {
    await firebaseSignOut(auth);
    return true;
  } catch (error) {
    console.error("Error logging out: ", error);
    throw error;
  }
};

export const saveDecision = async (userId: string, prompt: string, agentId: string, intuition: number, result: DecisionResult) => {
  try {
    const newDocRef = await addDoc(collection(db, 'decisions'), {
      userId,
      prompt,
      agentId,
      intuition,
      result,
      createdAt: serverTimestamp(),
    });
    return newDocRef.id;
  } catch (error) {
    console.error("Error saving decision: ", error);
    return null;
  }
};

export const createLiveSession = async (userId: string, prompt: string, agentId: string, intuition: number) => {
  try {
    const newDocRef = doc(collection(db, 'sessions'));
    await setDoc(newDocRef, {
      creatorId: userId,
      prompt,
      agentId,
      intuition,
      result: null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return newDocRef.id;
  } catch (error) {
    console.error("Error creating live session", error);
    return null;
  }
};

export const updateLiveSession = async (sessionId: string, data: { prompt?: string, agentId?: string, intuition?: number, result?: any }) => {
  try {
    const docRef = doc(db, 'sessions', sessionId);
    await updateDoc(docRef, {
      ...data,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error("Error updating live session", error);
  }
};

export const subscribeToLiveSession = (sessionId: string, callback: (sessionData: any) => void) => {
  const docRef = doc(db, 'sessions', sessionId);
  return onSnapshot(docRef, (docSnap) => {
    if (docSnap.exists()) {
      callback(docSnap.data());
    } else {
      callback(null);
    }
  });
};

export const getDecisions = (userId: string, callback: (decisions: any[]) => void) => {
  const q = query(
    collection(db, 'decisions'),
    where('userId', '==', userId),
    orderBy('createdAt', 'desc')
  );
  
  const unsubscribe = onSnapshot(q, (querySnapshot) => {
    const decisions: any[] = [];
    querySnapshot.forEach((doc) => {
      decisions.push({ id: doc.id, ...doc.data() });
    });
    callback(decisions);
  }, (error) => {
    console.error("Error fetching decisions: ", error);
    callback([]);
  });

  return unsubscribe;
};

export const saveFeedback = async (userId: string, decisionId: string, accuracy: number, usefulness: number, comment: string) => {
  try {
    await addDoc(collection(db, 'feedback'), {
      userId,
      decisionId,
      accuracy,
      usefulness,
      comment,
      createdAt: serverTimestamp(),
    });
    return true;
  } catch (error) {
    console.error("Error saving feedback: ", error);
    return false;
  }
};

export const getFeedbackForDecision = (decisionId: string, userId: string, callback: (feedback: any[]) => void) => {
  const q = query(
    collection(db, 'feedback'),
    where('decisionId', '==', decisionId),
    where('userId', '==', userId),
    orderBy('createdAt', 'desc')
  );
  
  const unsubscribe = onSnapshot(q, (querySnapshot) => {
    const feedback: any[] = [];
    querySnapshot.forEach((doc) => {
      feedback.push({ id: doc.id, ...doc.data() });
    });
    callback(feedback);
  }, (error) => {
    console.error("Error fetching feedback: ", error);
    callback([]);
  });

  return unsubscribe;
};

