'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAssignmentStore } from '@/store/assignmentStore';
import { fetchAssignments, deleteAssignment } from '@/lib/api';

export default function DashboardPage() {
  const { assignments, setAssignments, removeAssignment } = useAssignmentStore();
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: string; message: string } | null>(null);

  function formatDate(value: string | Date) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '-';
    return new Intl.DateTimeFormat('en-GB').format(date);
  }

  useEffect(() => {
    loadAssignments();
  }, []);

  async function loadAssignments() {
    try {
      const data = await fetchAssignments();
      setAssignments(data);
    } catch (err) {
      console.error('Failed to load assignments:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteAssignment(id);
      removeAssignment(id);
      setMenuOpen(null);
      showToast('success', 'Assignment deleted successfully');
    } catch (err) {
      showToast('error', 'Failed to delete assignment');
    }
  }

  function showToast(type: string, message: string) {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3000);
  }

  function getStatusClass(status: string) {
    switch (status) {
      case 'completed': return 'status-completed';
      case 'generating': return 'status-generating';
      case 'failed': return 'status-failed';
      default: return 'status-draft';
    }
  }

  function getStatusLabel(status: string) {
    switch (status) {
      case 'completed': return '● Completed';
      case 'generating': return '◌ Generating...';
      case 'failed': return '✕ Failed';
      default: return '○ Draft';
    }
  }

  if (loading) {
    return (
      <div className="assignments-grid">
        {[1, 2, 3].map((i) => (
          <div key={i} className="card assignment-card">
            <div className="skeleton" style={{ height: 22, width: '70%', marginBottom: 16 }} />
            <div className="skeleton" style={{ height: 16, width: '50%', marginBottom: 8 }} />
            <div className="skeleton" style={{ height: 16, width: '60%' }} />
          </div>
        ))}
      </div>
    );
  }

  if (assignments.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14,2 14,8 20,8" />
            <line x1="12" y1="12" x2="12" y2="18" />
            <line x1="9" y1="15" x2="15" y2="15" />
          </svg>
        </div>
        <h2>No Assignments Yet</h2>
        <p>Created assignments will appear here. Get started by creating your first AI-powered question paper!</p>
        <Link href="/create" className="btn btn-primary">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Create Assignment
        </Link>
      </div>
    );
  }

  return (
    <>
      <div className="assignments-grid">
        {assignments.map((assignment) => (
          <div key={assignment._id} className="card assignment-card">
            <div className="assignment-card-header">
              <h3 className="assignment-card-title">{assignment.title}</h3>
              <div className="assignment-card-menu">
                <button
                  className="assignment-card-menu-btn"
                  onClick={() => setMenuOpen(menuOpen === assignment._id ? null : assignment._id)}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                    <circle cx="12" cy="5" r="2" />
                    <circle cx="12" cy="12" r="2" />
                    <circle cx="12" cy="19" r="2" />
                  </svg>
                </button>
                {menuOpen === assignment._id && (
                  <div className="assignment-card-dropdown">
                    {assignment.status === 'completed' && (
                      <Link href={`/assignment/${assignment._id}`} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', fontSize: 14, color: 'var(--text-primary)', textDecoration: 'none' }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                        View Assignment
                      </Link>
                    )}
                    <button className="danger" onClick={() => handleDelete(assignment._id)}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="3,6 5,6 21,6" />
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                      </svg>
                      Delete
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="assignment-card-dates">
              <div className="assignment-card-date">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
                Assigned on: {formatDate(assignment.createdAt)}
              </div>
              <div className="assignment-card-date">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12,6 12,12 16,14" />
                </svg>
                Due: {formatDate(assignment.dueDate)}
              </div>
            </div>

            <div className={`assignment-card-status ${getStatusClass(assignment.status)}`}>
              {getStatusLabel(assignment.status)}
            </div>
          </div>
        ))}
      </div>

      {toast && (
        <div className={`toast toast-${toast.type}`}>
          {toast.type === 'success' ? '✓' : '✕'} {toast.message}
        </div>
      )}
    </>
  );
}
