import { useState } from 'react';
import { useUser } from '../context/UserContext';
import { useAssignments } from '../hooks/useAssignments';
import './AssignmentTracker.css';

export function AssignmentTracker() {
  const { username, logout } = useUser();
  const { 
    assignments, 
    loading, 
    error, 
    addAssignment, 
    updateAssignment, 
    deleteAssignment,
    toggleComplete 
  } = useAssignments(username);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    dueDate: '',
    priority: 'medium'
  });

  const resetForm = () => {
    setFormData({ title: '', description: '', dueDate: '', priority: 'medium' });
    setShowForm(false);
    setEditingId(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title.trim()) return;

    if (editingId) {
      await updateAssignment(editingId, formData);
    } else {
      await addAssignment(formData);
    }
    resetForm();
  };

  const handleEdit = (assignment) => {
    setFormData({
      title: assignment.title,
      description: assignment.description || '',
      dueDate: assignment.dueDate || '',
      priority: assignment.priority || 'medium'
    });
    setEditingId(assignment.id);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Delete this assignment?')) {
      await deleteAssignment(id);
    }
  };

  const getPriorityClass = (priority) => {
    return `priority-${priority || 'medium'}`;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return null;
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const isOverdue = (dateStr, completed) => {
    if (!dateStr || completed) return false;
    return new Date(dateStr) < new Date().setHours(0, 0, 0, 0);
  };

  const pendingCount = assignments.filter(a => !a.completed).length;
  const completedCount = assignments.filter(a => a.completed).length;

  return (
    <div className="tracker-container">
      <div className="tracker-glow tracker-glow-1"></div>
      <div className="tracker-glow tracker-glow-2"></div>

      <header className="tracker-header">
        <div className="header-left">
          <span className="header-icon">📚</span>
          <h1 className="header-title">My Assignments</h1>
        </div>
        <div className="header-right">
          <span className="user-badge">
            <span className="user-icon">👤</span>
            {username}
          </span>
          <button onClick={logout} className="logout-btn">Logout</button>
        </div>
      </header>

      <div className="tracker-stats">
        <div className="stat">
          <span className="stat-number">{pendingCount}</span>
          <span className="stat-label">Pending</span>
        </div>
        <div className="stat">
          <span className="stat-number">{completedCount}</span>
          <span className="stat-label">Completed</span>
        </div>
        <div className="stat">
          <span className="stat-number">{assignments.length}</span>
          <span className="stat-label">Total</span>
        </div>
      </div>

      {error && <div className="error-banner">{error}</div>}

      <div className="tracker-content">
        <div className="content-header">
          <h2>Assignments</h2>
          <button 
            onClick={() => { resetForm(); setShowForm(true); }} 
            className="add-btn"
          >
            <span>+</span> Add New
          </button>
        </div>

        {showForm && (
          <form onSubmit={handleSubmit} className="assignment-form">
            <div className="form-header">
              <h3>{editingId ? 'Edit Assignment' : 'New Assignment'}</h3>
              <button type="button" onClick={resetForm} className="close-btn">×</button>
            </div>
            
            <div className="form-group">
              <label>Title *</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Assignment title..."
                required
                autoFocus
              />
            </div>

            <div className="form-group">
              <label>Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Add details..."
                rows={3}
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Due Date</label>
                <input
                  type="date"
                  value={formData.dueDate}
                  onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label>Priority</label>
                <select
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
            </div>

            <div className="form-actions">
              <button type="button" onClick={resetForm} className="cancel-btn">Cancel</button>
              <button type="submit" className="submit-btn">
                {editingId ? 'Update' : 'Add Assignment'}
              </button>
            </div>
          </form>
        )}

        {loading ? (
          <div className="loading">
            <div className="spinner"></div>
            <p>Loading assignments...</p>
          </div>
        ) : assignments.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📝</div>
            <h3>No assignments yet</h3>
            <p>Click "Add New" to create your first assignment</p>
          </div>
        ) : (
          <ul className="assignments-list">
            {assignments.map(assignment => (
              <li 
                key={assignment.id} 
                className={`assignment-item ${assignment.completed ? 'completed' : ''} ${isOverdue(assignment.dueDate, assignment.completed) ? 'overdue' : ''}`}
              >
                <div className="item-checkbox">
                  <input
                    type="checkbox"
                    checked={assignment.completed}
                    onChange={() => toggleComplete(assignment.id, assignment.completed)}
                    id={`check-${assignment.id}`}
                  />
                  <label htmlFor={`check-${assignment.id}`}></label>
                </div>
                
                <div className="item-content">
                  <div className="item-header">
                    <h4 className="item-title">{assignment.title}</h4>
                    <span className={`priority-badge ${getPriorityClass(assignment.priority)}`}>
                      {assignment.priority || 'medium'}
                    </span>
                  </div>
                  
                  {assignment.description && (
                    <p className="item-description">{assignment.description}</p>
                  )}
                  
                  {assignment.dueDate && (
                    <div className={`item-due ${isOverdue(assignment.dueDate, assignment.completed) ? 'overdue' : ''}`}>
                      📅 {formatDate(assignment.dueDate)}
                      {isOverdue(assignment.dueDate, assignment.completed) && <span className="overdue-tag">Overdue</span>}
                    </div>
                  )}
                </div>

                <div className="item-actions">
                  <button onClick={() => handleEdit(assignment)} className="edit-btn" title="Edit">
                    ✏️
                  </button>
                  <button onClick={() => handleDelete(assignment.id)} className="delete-btn" title="Delete">
                    🗑️
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

