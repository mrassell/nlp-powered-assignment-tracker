import { useState, useEffect } from 'react';
import {
  collection,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '../firebase';
import { generateKeywords } from '../utils/nlpParser';

// A freshly-added doc's serverTimestamp() field reads as null locally until
// the server acknowledges the write. Sorting client-side (instead of via a
// Firestore orderBy on that field) means new items show up immediately
// instead of waiting on that round-trip.
function toMillis(timestamp) {
  return timestamp?.toMillis ? timestamp.toMillis() : Date.now();
}

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

    const unsubscribe = onSnapshot(
      classesRef,
      (snapshot) => {
        const items = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        items.sort((a, b) => toMillis(b.createdAt) - toMillis(a.createdAt));
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

    // Generate color if not provided
    const colors = ['#6366f1', '#14b8a6', '#7ec8e3', '#7ee8c7', '#ffb088', '#ffd66b'];
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

