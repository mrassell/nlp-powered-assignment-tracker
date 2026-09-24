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

export function useAssignments(uid) {
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!uid) {
      setAssignments([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const assignmentsRef = collection(db, 'users', uid, 'assignments');
    const q = query(assignmentsRef, orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const items = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setAssignments(items);
        setLoading(false);
      },
      (err) => {
        console.error('Firestore error:', err);
        setError('Failed to load assignments. Check your Firebase config.');
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [uid]);

  const addAssignment = async (assignment) => {
    if (!uid) return;
    
    try {
      const assignmentsRef = collection(db, 'users', uid, 'assignments');
      await addDoc(assignmentsRef, {
        ...assignment,
        completed: false,
        createdAt: serverTimestamp()
      });
    } catch (err) {
      console.error('Add error:', err);
      setError('Failed to add assignment');
    }
  };

  const updateAssignment = async (id, updates) => {
    if (!uid) return;
    
    try {
      const docRef = doc(db, 'users', uid, 'assignments', id);
      await updateDoc(docRef, {
        ...updates,
        updatedAt: serverTimestamp()
      });
    } catch (err) {
      console.error('Update error:', err);
      setError('Failed to update assignment');
    }
  };

  const deleteAssignment = async (id) => {
    if (!uid) return;
    
    try {
      const docRef = doc(db, 'users', uid, 'assignments', id);
      await deleteDoc(docRef);
    } catch (err) {
      console.error('Delete error:', err);
      setError('Failed to delete assignment');
    }
  };

  const toggleComplete = async (id, currentStatus) => {
    await updateAssignment(id, { completed: !currentStatus });
  };

  const addAssignments = async (items) => {
    if (!uid || !items || items.length === 0) return;

    try {
      const assignmentsRef = collection(db, 'users', uid, 'assignments');
      await Promise.all(items.map(item => addDoc(assignmentsRef, {
        ...item,
        completed: false,
        createdAt: serverTimestamp()
      })));
    } catch (err) {
      console.error('Bulk add error:', err);
      setError('Failed to import assignments');
    }
  };

  return {
    assignments,
    loading,
    error,
    addAssignment,
    addAssignments,
    updateAssignment,
    deleteAssignment,
    toggleComplete
  };
}
