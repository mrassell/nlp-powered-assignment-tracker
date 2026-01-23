import { useState, useEffect, useMemo } from 'react';
import { useUser } from '../context/UserContext';
import { useAssignments } from '../hooks/useAssignments';
import { useClasses } from '../hooks/useClasses';
import { parseAssignmentInput, formatDateDisplay, formatDateShort, getDaysUntil } from '../utils/nlpParser';
import './AssignmentTracker.css';

// Status cycle: pending → in_progress → completed → pending
const STATUS_CYCLE = ['pending', 'in_progress', 'completed'];
const STATUS_CONFIG = {
  pending: { label: 'To Do', icon: '○', class: 'pending' },
  in_progress: { label: 'Doing', icon: '◐', class: 'in-progress' },
  completed: { label: 'Done', icon: '●', class: 'done' }
};

export function AssignmentTracker() {
  const { username, logout } = useUser();
  const { 
    assignments, 
    loading: assignmentsLoading, 
    addAssignment, 
    deleteAssignment,
    updateAssignment
  } = useAssignments(username);
  
  const {
    classes,
    loading: classesLoading,
    addClass,
    deleteClass
  } = useClasses(username);

  const [input, setInput] = useState('');
  const [preview, setPreview] = useState(null);
  const [showClassModal, setShowClassModal] = useState(false);
  const [newClassName, setNewClassName] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [showCompleted, setShowCompleted] = useState(false);
  
  // Edit modal state
  const [editingAssignment, setEditingAssignment] = useState(null);
  const [editForm, setEditForm] = useState({
    title: '',
    classId: '',
    type: '',
    dueDate: '',
    status: 'pending'
  });

  // Open edit modal
  const openEditModal = (assignment) => {
    setEditingAssignment(assignment);
    setEditForm({
      title: assignment.title || '',
      classId: assignment.classId || '',
      type: assignment.type || '',
      dueDate: assignment.dueDate || '',
      status: assignment.status || 'pending'
    });
  };

  // Save edited assignment
  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editingAssignment) return;
    
    const selectedClass = classes.find(c => c.id === editForm.classId);
    
    await updateAssignment(editingAssignment.id, {
      title: editForm.title,
      classId: editForm.classId || null,
      className: selectedClass?.name || null,
      type: editForm.type || null,
      dueDate: editForm.dueDate || null,
      status: editForm.status,
      completed: editForm.status === 'completed'
    });
    
    setEditingAssignment(null);
  };

  // Change status via dropdown
  const changeStatus = async (assignment, newStatus) => {
    await updateAssignment(assignment.id, { 
      status: newStatus,
      completed: newStatus === 'completed'
    });
  };

  // Parse input in real-time
  useEffect(() => {
    if (input.trim()) {
      const parsed = parseAssignmentInput(input, classes);
      setPreview(parsed);
    } else {
      setPreview(null);
    }
  }, [input, classes]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    const parsed = parseAssignmentInput(input, classes);
    
    await addAssignment({
      title: parsed.title || input,
      rawInput: input,
      classId: parsed.classId,
      className: parsed.className,
      type: parsed.type,
      number: parsed.number,
      dueDate: parsed.dueDate,
      description: parsed.description || '',
      status: 'pending'
    });

    setInput('');
    setPreview(null);
  };

  const handleAddClass = async (e) => {
    e.preventDefault();
    if (!newClassName.trim()) return;
    
    await addClass(newClassName);
    setNewClassName('');
    setShowClassModal(false);
  };

  // Group assignments by class
  const groupedAssignments = useMemo(() => {
    const groups = { misc: [] };
    
    classes.forEach(cls => {
      groups[cls.id] = [];
    });
    
    assignments.forEach(assignment => {
      if (assignment.classId && groups[assignment.classId]) {
        groups[assignment.classId].push(assignment);
      } else {
        groups.misc.push(assignment);
      }
    });
    
    return groups;
  }, [assignments, classes]);

  // Filter and sort assignments based on active tab and date
  const sortedAssignments = useMemo(() => {
    let filtered = [];
    
    if (activeTab === 'all') {
      filtered = [...assignments];
    } else if (activeTab === 'misc') {
      filtered = [...(groupedAssignments.misc || [])];
    } else {
      filtered = [...(groupedAssignments[activeTab] || [])];
    }
    
    // Filter completed if needed
    if (!showCompleted) {
      filtered = filtered.filter(a => (a.status || 'pending') !== 'completed');
    }
    
    // Sort: in_progress first, then pending by date, completed at bottom
    filtered.sort((a, b) => {
      const statusA = a.status || 'pending';
      const statusB = b.status || 'pending';
      
      // Completed items go to bottom
      if (statusA === 'completed' && statusB !== 'completed') return 1;
      if (statusB === 'completed' && statusA !== 'completed') return -1;
      
      // In progress items go to top
      if (statusA === 'in_progress' && statusB !== 'in_progress') return -1;
      if (statusB === 'in_progress' && statusA !== 'in_progress') return 1;
      
      // Then sort by due date (earliest first)
      if (!a.dueDate && !b.dueDate) return 0;
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      
      return new Date(a.dueDate) - new Date(b.dueDate);
    });
    
    return filtered;
  }, [activeTab, assignments, groupedAssignments, showCompleted]);

  const pendingCount = assignments.filter(a => (a.status || 'pending') !== 'completed').length;
  const inProgressCount = assignments.filter(a => a.status === 'in_progress').length;
  
  const getClassColor = (classId) => {
    const cls = classes.find(c => c.id === classId);
    return cls?.color || '#9b9b9b';
  };

  const getClassName = (classId) => {
    const cls = classes.find(c => c.id === classId);
    return cls?.name || 'Misc';
  };

  const getDueBadge = (dueDate, status) => {
    if (!dueDate) return { text: 'No date', class: 'no-date' };
    if (status === 'completed') return null; // Don't show due badge for completed
    
    const days = getDaysUntil(dueDate);
    
    if (days < 0) return { text: `${Math.abs(days)}d overdue`, class: 'overdue' };
    if (days === 0) return { text: 'Today!', class: 'today' };
    if (days === 1) return { text: 'Tomorrow', class: 'tomorrow' };
    if (days <= 3) return { text: `${days} days`, class: 'soon' };
    if (days <= 7) return { text: `${days} days`, class: 'week' };
    return { text: `${days} days`, class: 'later' };
  };
  
  const getStatusInfo = (status) => {
    return STATUS_CONFIG[status || 'pending'];
  };

  const loading = assignmentsLoading || classesLoading;

  return (
    <div className="tracker">
      {/* Header */}
      <header className="tracker-header">
        <div className="header-left">
          <span className="header-icon">📚</span>
          <div>
            <h1>Study Buddy</h1>
            <span className="header-user">@{username}</span>
          </div>
        </div>
        <div className="header-right">
          <div className="stats-badges">
            {inProgressCount > 0 && (
              <div className="stat-badge in-progress">
                <span className="stat-count">{inProgressCount}</span>
                <span className="stat-label">doing</span>
              </div>
            )}
            <div className="stat-badge pending">
              <span className="stat-count">{pendingCount}</span>
              <span className="stat-label">left</span>
            </div>
          </div>
          <button onClick={logout} className="logout-btn">
            Logout
          </button>
        </div>
      </header>

      <main className="tracker-main">
        {/* Smart Input Section */}
        <section className="input-section">
          <form onSubmit={handleSubmit} className="smart-input-form">
            <div className="input-wrapper">
              <span className="input-icon">✨</span>
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type: 'calc hw 1 feb 4' or 'leetcode 2/10'"
                className="smart-input"
                autoFocus
              />
              <button type="submit" className="add-btn" disabled={!input.trim()}>
                Add
              </button>
            </div>
            
            {/* Live Preview */}
            {preview && (
              <div className="preview-card">
                <div className="preview-header">
                  <span className="preview-icon">🔮</span>
                  <span>Preview</span>
                </div>
                <div className="preview-content">
                  <div className="preview-title">{preview.title || input}</div>
                  <div className="preview-tags">
                    {preview.className ? (
                      <span className="preview-tag class-tag" style={{ backgroundColor: getClassColor(preview.classId) + '30', color: getClassColor(preview.classId) }}>
                        {preview.className}
                      </span>
                    ) : (
                      <span className="preview-tag misc-tag">Misc</span>
                    )}
                    {preview.type && (
                      <span className="preview-tag type-tag">{preview.type}</span>
                    )}
                    {preview.dueDate && (
                      <span className="preview-tag date-tag">📅 {formatDateDisplay(preview.dueDate)}</span>
                    )}
                  </div>
                </div>
              </div>
            )}
          </form>
          
          <p className="input-hint">
            💡 Dates: "2/4", "feb 4", "friday", "tmrw", "next week"
          </p>
        </section>

        {/* Classes Section */}
        <section className="classes-section">
          <div className="section-header">
            <h2>📖 My Classes</h2>
            <button onClick={() => setShowClassModal(true)} className="add-class-btn">
              + Add Class
            </button>
          </div>
          
          <div className="classes-grid">
            <button 
              className={`class-chip ${activeTab === 'all' ? 'active' : ''}`}
              onClick={() => setActiveTab('all')}
            >
              <span className="chip-dot" style={{ background: 'linear-gradient(135deg, #ff8fab, #b8a5ff)' }}></span>
              All ({assignments.filter(a => showCompleted || !a.completed).length})
            </button>
            
            {classes.map(cls => (
              <button 
                key={cls.id}
                className={`class-chip ${activeTab === cls.id ? 'active' : ''}`}
                onClick={() => setActiveTab(cls.id)}
              >
                <span className="chip-dot" style={{ backgroundColor: cls.color }}></span>
                {cls.name} ({(groupedAssignments[cls.id] || []).filter(a => showCompleted || !a.completed).length})
                <span 
                  className="chip-delete"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (window.confirm(`Delete "${cls.name}"?`)) deleteClass(cls.id);
                  }}
                >×</span>
              </button>
            ))}
            
            <button 
              className={`class-chip misc ${activeTab === 'misc' ? 'active' : ''}`}
              onClick={() => setActiveTab('misc')}
            >
              <span className="chip-dot" style={{ backgroundColor: '#9b9b9b' }}></span>
              Misc ({(groupedAssignments.misc || []).filter(a => showCompleted || !a.completed).length})
            </button>
          </div>
        </section>

        {/* Spreadsheet Section */}
        <section className="spreadsheet-section">
          <div className="spreadsheet-header">
            <h2>📝 Assignments</h2>
            <label className="show-completed-toggle">
              <input 
                type="checkbox" 
                checked={showCompleted}
                onChange={(e) => setShowCompleted(e.target.checked)}
              />
              <span className="toggle-slider"></span>
              <span className="toggle-label">Show completed</span>
            </label>
          </div>
          
          {loading ? (
            <div className="loading-state">
              <div className="loader"></div>
              <p>Loading your assignments...</p>
            </div>
          ) : sortedAssignments.length === 0 ? (
            <div className="empty-state">
              <span className="empty-icon">🌸</span>
              <h3>No assignments yet!</h3>
              <p>Start typing above to add your first assignment</p>
            </div>
          ) : (
            <div className="spreadsheet">
              <div className="spreadsheet-table">
                <div className="table-header">
                  <div className="col-status">Status</div>
                  <div className="col-due-badge">Urgency</div>
                  <div className="col-title">Assignment</div>
                  <div className="col-class">Class</div>
                  <div className="col-type">Type</div>
                  <div className="col-due">Due</div>
                  <div className="col-actions"></div>
                </div>
                
                <div className="table-body">
                  {sortedAssignments.map(assignment => {
                    const status = assignment.status || 'pending';
                    const statusInfo = getStatusInfo(status);
                    const dueBadge = getDueBadge(assignment.dueDate, status);
                    const isCompleted = status === 'completed';
                    const isInProgress = status === 'in_progress';
                    
                    return (
                      <div 
                        key={assignment.id} 
                        className={`table-row ${isCompleted ? 'completed' : ''} ${isInProgress ? 'in-progress' : ''} ${dueBadge?.class || ''}`}
                      >
                        <div className="col-status">
                          <select 
                            className={`status-select ${statusInfo.class}`}
                            value={status}
                            onChange={(e) => changeStatus(assignment, e.target.value)}
                          >
                            <option value="pending">○ To Do</option>
                            <option value="in_progress">◐ Doing</option>
                            <option value="completed">● Done</option>
                          </select>
                        </div>
                        
                        <div className="col-due-badge">
                          {dueBadge && (
                            <span className={`due-badge ${dueBadge.class}`}>
                              {dueBadge.text}
                            </span>
                          )}
                        </div>
                        
                        <div className="col-title">
                          <span className="title-text">{assignment.title}</span>
                          {assignment.description && (
                            <span className="title-desc">{assignment.description}</span>
                          )}
                        </div>
                        
                        <div className="col-class">
                          <span 
                            className="class-badge"
                            style={{ 
                              backgroundColor: getClassColor(assignment.classId) + '20',
                              color: getClassColor(assignment.classId),
                              borderColor: getClassColor(assignment.classId) + '40'
                            }}
                          >
                            {assignment.className || 'Misc'}
                          </span>
                        </div>
                        
                        <div className="col-type">
                          {assignment.type || '—'}
                        </div>
                        
                        <div className="col-due">
                          {assignment.dueDate ? formatDateShort(assignment.dueDate) : '—'}
                        </div>
                        
                        <div className="col-actions">
                          <button 
                            className="edit-btn"
                            onClick={() => openEditModal(assignment)}
                            title="Edit"
                          >
                            ✏️
                          </button>
                          <button 
                            className="delete-btn"
                            onClick={() => deleteAssignment(assignment.id)}
                            title="Delete"
                          >
                            🗑️
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </section>
      </main>

      {/* Add Class Modal */}
      {showClassModal && (
        <div className="modal-overlay" onClick={() => setShowClassModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>➕ Add New Class</h3>
              <button onClick={() => setShowClassModal(false)} className="modal-close">×</button>
            </div>
            <form onSubmit={handleAddClass} className="modal-form">
              <input
                type="text"
                value={newClassName}
                onChange={(e) => setNewClassName(e.target.value)}
                placeholder="e.g., Predictive Analytics"
                className="modal-input"
                autoFocus
              />
              <p className="modal-hint">
                Keywords like "pred", "analytics", "pa" will be auto-generated!
              </p>
              <div className="modal-actions">
                <button type="button" onClick={() => setShowClassModal(false)} className="modal-cancel">
                  Cancel
                </button>
                <button type="submit" className="modal-submit" disabled={!newClassName.trim()}>
                  Add Class
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Assignment Modal */}
      {editingAssignment && (
        <div className="modal-overlay" onClick={() => setEditingAssignment(null)}>
          <div className="modal edit-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>✏️ Edit Assignment</h3>
              <button onClick={() => setEditingAssignment(null)} className="modal-close">×</button>
            </div>
            <form onSubmit={handleSaveEdit} className="modal-form">
              <div className="form-group">
                <label>Title</label>
                <input
                  type="text"
                  value={editForm.title}
                  onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                  placeholder="Assignment title..."
                  className="modal-input"
                  autoFocus
                />
              </div>
              
              <div className="form-row">
                <div className="form-group">
                  <label>Class</label>
                  <select
                    value={editForm.classId}
                    onChange={(e) => setEditForm({ ...editForm, classId: e.target.value })}
                    className="modal-select"
                  >
                    <option value="">Misc</option>
                    {classes.map(cls => (
                      <option key={cls.id} value={cls.id}>{cls.name}</option>
                    ))}
                  </select>
                </div>
                
                <div className="form-group">
                  <label>Type</label>
                  <select
                    value={editForm.type}
                    onChange={(e) => setEditForm({ ...editForm, type: e.target.value })}
                    className="modal-select"
                  >
                    <option value="">None</option>
                    <option value="Homework">Homework</option>
                    <option value="Quiz">Quiz</option>
                    <option value="Exam">Exam</option>
                    <option value="Project">Project</option>
                    <option value="Lab">Lab</option>
                    <option value="Reading">Reading</option>
                    <option value="Paper">Paper</option>
                    <option value="Presentation">Presentation</option>
                    <option value="Discussion">Discussion</option>
                  </select>
                </div>
              </div>
              
              <div className="form-row">
                <div className="form-group">
                  <label>Due Date</label>
                  <input
                    type="date"
                    value={editForm.dueDate}
                    onChange={(e) => setEditForm({ ...editForm, dueDate: e.target.value })}
                    className="modal-input"
                  />
                </div>
                
                <div className="form-group">
                  <label>Status</label>
                  <select
                    value={editForm.status}
                    onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                    className="modal-select"
                  >
                    <option value="pending">To Do</option>
                    <option value="in_progress">Doing</option>
                    <option value="completed">Done</option>
                  </select>
                </div>
              </div>
              
              <div className="modal-actions">
                <button type="button" onClick={() => setEditingAssignment(null)} className="modal-cancel">
                  Cancel
                </button>
                <button type="submit" className="modal-submit">
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
