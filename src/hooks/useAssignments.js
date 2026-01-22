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

export function useAssignments(username) {
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!username) {
      setAssignments([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    // Each user has their own collection: users/{username}/assignments
    const assignmentsRef = collection(db, 'users', username, 'assignments');
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
  }, [username]);

  const addAssignment = async (assignment) => {
    if (!username) return;
    
    try {
      const assignmentsRef = collection(db, 'users', username, 'assignments');
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
    if (!username) return;
    
    try {
      const docRef = doc(db, 'users', username, 'assignments', id);
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
    if (!username) return;
    
    try {
      const docRef = doc(db, 'users', username, 'assignments', id);
      await deleteDoc(docRef);
    } catch (err) {
      console.error('Delete error:', err);
      setError('Failed to delete assignment');
    }
  };

  const toggleComplete = async (id, currentStatus) => {
    await updateAssignment(id, { completed: !currentStatus });
  };

  return {
    assignments,
    loading,
    error,
    addAssignment,
    updateAssignment,
    deleteAssignment,
    toggleComplete
  };
}

