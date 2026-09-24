import { useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  orderBy, 
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '../firebase';
import { generateKeywords } from '../utils/nlpParser';

export function useClasses(uid) {
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!uid) {
      setClasses([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const classesRef = collection(db, 'users', uid, 'classes');
    const q = query(classesRef, orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const items = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setClasses(items);
        setLoading(false);
      },
      (err) => {
        console.error('Firestore classes error:', err);
        setError('Failed to load classes');
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [uid]);

  const addClass = async (className, color = null) => {
    if (!uid || !className.trim()) return;
    
    const colors = ['#ff8fab', '#b8a5ff', '#7ec8e3', '#7ee8c7', '#ffb088', '#ffd66b'];
    const assignedColor = color || colors[classes.length % colors.length];
    
    try {
      const classesRef = collection(db, 'users', uid, 'classes');
      const docRef = await addDoc(classesRef, {
        name: className.trim(),
        keywords: generateKeywords(className.trim()),
        color: assignedColor,
        createdAt: serverTimestamp()
      });
      return docRef.id;
    } catch (err) {
      console.error('Add class error:', err);
      setError('Failed to add class');
      return null;
    }
  };

  const updateClass = async (id, updates) => {
    if (!uid) return;
    
    try {
      const docRef = doc(db, 'users', uid, 'classes', id);
      
      if (updates.name) {
        updates.keywords = generateKeywords(updates.name);
      }
      
      await updateDoc(docRef, {
        ...updates,
        updatedAt: serverTimestamp()
      });
    } catch (err) {
      console.error('Update class error:', err);
      setError('Failed to update class');
    }
  };

  const deleteClass = async (id) => {
    if (!uid) return;
    
    try {
      const docRef = doc(db, 'users', uid, 'classes', id);
      await deleteDoc(docRef);
    } catch (err) {
      console.error('Delete class error:', err);
      setError('Failed to delete class');
    }
  };

  const addKeyword = async (classId, keyword) => {
    const cls = classes.find(c => c.id === classId);
    if (!cls) return;
    
    const newKeywords = [...(cls.keywords || []), keyword.toLowerCase()];
    await updateClass(classId, { keywords: [...new Set(newKeywords)] });
  };

  const removeKeyword = async (classId, keyword) => {
    const cls = classes.find(c => c.id === classId);
    if (!cls) return;
    
    const newKeywords = (cls.keywords || []).filter(k => k !== keyword);
    await updateClass(classId, { keywords: newKeywords });
  };

  return {
    classes,
    loading,
    error,
    addClass,
    updateClass,
    deleteClass,
    addKeyword,
    removeKeyword
  };
}

