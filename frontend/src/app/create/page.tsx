'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAssignmentStore } from '@/store/assignmentStore';
import { createAssignment } from '@/lib/api';
import { getSocket, joinAssignment } from '@/lib/socket';

const QUESTION_TYPE_OPTIONS = [
  'Multiple Choice',
  'Short Questions',
  'Long Answer',
  'Diagram/Graph-Based',
  'Numerical Problems',
  'True/False',
  'Fill in the Blanks',
  'Match the Following',
];

const steps = [
  { label: 'Assignment Details', icon: '1' },
  { label: 'Question Config', icon: '2' },
  { label: 'Review & Generate', icon: '3' },
];

export default function CreateAssignmentPage() {
  const router = useRouter();
  const {
    form,
    setFormField,
    addQuestionType,
    removeQuestionType,
    updateQuestionType,
    resetForm,
    nextStep,
    prevStep,
    generation,
    setGeneration,
  } = useAssignmentStore();

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // WebSocket listener for generation events
  useEffect(() => {
    if (generation.status === 'generating' && generation.assignmentId) {
      const socket = getSocket();
      joinAssignment(generation.assignmentId);

      socket.on('generation:progress', (data: any) => {
        setGeneration({
          message: data.message,
          progress: data.progress,
        });
      });

      socket.on('generation:complete', (data: any) => {
        setGeneration({
          status: 'completed',
          message: data.message,
          progress: 100,
        });
        setTimeout(() => {
          router.push(`/assignment/${generation.assignmentId}`);
          resetForm();
          setGeneration({ status: 'idle', assignmentId: null, message: '', progress: 0 });
        }, 1500);
      });

      socket.on('generation:failed', (data: any) => {
        setGeneration({
          status: 'failed',
          message: data.message,
        });
      });

      return () => {
        socket.off('generation:progress');
        socket.off('generation:complete');
        socket.off('generation:failed');
      };
    }
  }, [generation.status, generation.assignmentId]);

  const totalQuestions = form.questionTypes.reduce((sum, qt) => sum + qt.count, 0);
  const totalMarks = form.questionTypes.reduce((sum, qt) => sum + qt.count * qt.marks, 0);

  function validateStep0(): boolean {
    const errs: Record<string, string> = {};
    if (!form.title.trim()) errs.title = 'Title is required';
    if (!form.subject.trim()) errs.subject = 'Subject is required';
    if (!form.dueDate) errs.dueDate = 'Due date is required';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function validateStep1(): boolean {
    const errs: Record<string, string> = {};
    if (form.questionTypes.length === 0) errs.questionTypes = 'Add at least one question type';
    form.questionTypes.forEach((qt, i) => {
      if (qt.count <= 0) errs[`count_${i}`] = 'Count must be positive';
      if (qt.marks <= 0) errs[`marks_${i}`] = 'Marks must be positive';
    });
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function handleNext() {
    if (form.currentStep === 0 && !validateStep0()) return;
    if (form.currentStep === 1 && !validateStep1()) return;
    nextStep();
  }

  async function handleGenerate() {
    try {
      const payload = {
        title: form.title,
        subject: form.subject,
        chapter: form.chapter,
        dueDate: form.dueDate,
        questionTypes: form.questionTypes,
        additionalInstructions: form.additionalInstructions,
      };

      const result = await createAssignment(payload);

      setGeneration({
        assignmentId: result.assignment._id,
        status: 'generating',
        message: 'Starting AI generation...',
        progress: 10,
      });
    } catch (err: any) {
      setGeneration({
        status: 'failed',
        message: err.message || 'Failed to create assignment',
      });
    }
  }

  const handleFileDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) setFormField('file', file);
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setFormField('file', file);
  };

  return (
    <>
      {/* Stepper */}
      <div className="stepper">
        {steps.map((step, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center' }}>
            <div className="stepper-step">
              <div className={`stepper-circle ${form.currentStep === i ? 'active' : form.currentStep > i ? 'completed' : ''}`}>
                {form.currentStep > i ? '✓' : step.icon}
              </div>
              <span className={`stepper-label ${form.currentStep === i ? 'active' : ''}`}>
                {step.label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div className={`stepper-line ${form.currentStep > i ? 'completed' : ''}`} />
            )}
          </div>
        ))}
      </div>

      <div className="card" style={{ padding: 32 }}>
        {/* Step 0: Assignment Details */}
        {form.currentStep === 0 && (
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 24 }}>Assignment Details</h2>

            <div className="form-group">
              <label className="form-label">Assignment Title *</label>
              <input
                className="form-input"
                type="text"
                placeholder="e.g., Quiz on Electricity"
                value={form.title}
                onChange={(e) => setFormField('title', e.target.value)}
              />
              {errors.title && <div className="form-error">{errors.title}</div>}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
              <div className="form-group">
                <label className="form-label">Subject *</label>
                <input
                  className="form-input"
                  type="text"
                  placeholder="e.g., Physics"
                  value={form.subject}
                  onChange={(e) => setFormField('subject', e.target.value)}
                />
                {errors.subject && <div className="form-error">{errors.subject}</div>}
              </div>

              <div className="form-group">
                <label className="form-label">Chapter / Topic</label>
                <input
                  className="form-input"
                  type="text"
                  placeholder="e.g., Current Electricity"
                  value={form.chapter}
                  onChange={(e) => setFormField('chapter', e.target.value)}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Due Date *</label>
              <input
                className="form-input"
                type="date"
                value={form.dueDate}
                onChange={(e) => setFormField('dueDate', e.target.value)}
              />
              {errors.dueDate && <div className="form-error">{errors.dueDate}</div>}
            </div>

            {/* File Upload */}
            <div className="form-group">
              <label className="form-label">Upload Reference Material (Optional)</label>
              <div
                className={`file-upload ${dragging ? 'dragging' : ''}`}
                onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={handleFileDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="file-upload-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="16,16 12,12 8,16" />
                    <line x1="12" y1="12" x2="12" y2="21" />
                    <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3" />
                  </svg>
                </div>
                <h3>Choose a file or drag & drop it here</h3>
                <p>PDF, TXT — up to 10MB</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.txt"
                  onChange={handleFileSelect}
                  style={{ display: 'none' }}
                />
              </div>
              {form.file && (
                <div className="file-upload-selected">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14,2 14,8 20,8" />
                  </svg>
                  <span>{form.file.name}</span>
                  <button
                    onClick={(e) => { e.stopPropagation(); setFormField('file', null); }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--hard)' }}
                  >
                    ✕
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Step 1: Question Configuration */}
        {form.currentStep === 1 && (
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 24 }}>Question Configuration</h2>

            <div className="question-types">
              {form.questionTypes.map((qt, i) => (
                <div key={i} className="question-type-row">
                  <div className="question-type-name">
                    <select
                      value={qt.type}
                      onChange={(e) => updateQuestionType(i, 'type', e.target.value)}
                    >
                      {QUESTION_TYPE_OPTIONS.map((opt) => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  </div>

                  <div className="counter">
                    <span className="counter-label">Questions</span>
                    <button
                      className="counter-btn"
                      onClick={() => updateQuestionType(i, 'count', Math.max(1, qt.count - 1))}
                    >
                      −
                    </button>
                    <span className="counter-value">{qt.count}</span>
                    <button
                      className="counter-btn"
                      onClick={() => updateQuestionType(i, 'count', qt.count + 1)}
                    >
                      +
                    </button>
                  </div>

                  <div className="counter">
                    <span className="counter-label">Marks Each</span>
                    <button
                      className="counter-btn"
                      onClick={() => updateQuestionType(i, 'marks', Math.max(1, qt.marks - 1))}
                    >
                      −
                    </button>
                    <span className="counter-value">{qt.marks}</span>
                    <button
                      className="counter-btn"
                      onClick={() => updateQuestionType(i, 'marks', qt.marks + 1)}
                    >
                      +
                    </button>
                  </div>

                  {form.questionTypes.length > 1 && (
                    <button
                      className="question-type-remove"
                      onClick={() => removeQuestionType(i)}
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="3,6 5,6 21,6" />
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                      </svg>
                    </button>
                  )}
                </div>
              ))}

              {errors.questionTypes && <div className="form-error">{errors.questionTypes}</div>}

              <button className="add-question-type" onClick={addQuestionType}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                Add Question Type
              </button>
            </div>

            {/* Summary bar */}
            <div className="summary-bar">
              <div className="summary-item">
                <div className="summary-item-label">Total Questions</div>
                <div className="summary-item-value">{totalQuestions}</div>
              </div>
              <div className="summary-item">
                <div className="summary-item-label">Total Marks</div>
                <div className="summary-item-value">{totalMarks}</div>
              </div>
              <div className="summary-item">
                <div className="summary-item-label">Question Types</div>
                <div className="summary-item-value">{form.questionTypes.length}</div>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Review & Generate */}
        {form.currentStep === 2 && (
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 24 }}>Review & Generate</h2>

            {/* Summary cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
              <div style={{ padding: 16, background: 'var(--bg-input)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>Title</div>
                <div style={{ fontSize: 15, fontWeight: 600 }}>{form.title}</div>
              </div>
              <div style={{ padding: 16, background: 'var(--bg-input)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>Subject</div>
                <div style={{ fontSize: 15, fontWeight: 600 }}>{form.subject}</div>
              </div>
              <div style={{ padding: 16, background: 'var(--bg-input)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>Due Date</div>
                <div style={{ fontSize: 15, fontWeight: 600 }}>{form.dueDate}</div>
              </div>
              <div style={{ padding: 16, background: 'var(--bg-input)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>Total Marks</div>
                <div style={{ fontSize: 15, fontWeight: 600 }}>{totalMarks}</div>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Additional Instructions for AI</label>
              <textarea
                className="form-textarea"
                placeholder="e.g., Generate a question paper for 3 hour exam duration. Include questions from topics like Ohm's law, Kirchhoff's law, and electric circuits..."
                value={form.additionalInstructions}
                onChange={(e) => setFormField('additionalInstructions', e.target.value)}
                rows={5}
              />
            </div>

            {/* Question types summary */}
            <div style={{ marginTop: 16 }}>
              <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>Question Types</h3>
              {form.questionTypes.map((qt, i) => (
                <div key={i} style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  padding: '10px 16px',
                  background: i % 2 === 0 ? 'var(--bg-input)' : 'transparent',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: 14
                }}>
                  <span style={{ fontWeight: 500 }}>{qt.type}</span>
                  <span style={{ color: 'var(--text-secondary)' }}>
                    {qt.count} questions × {qt.marks} marks = <strong>{qt.count * qt.marks} marks</strong>
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer buttons */}
        <div className="form-footer">
          {form.currentStep > 0 ? (
            <button className="btn btn-secondary" onClick={prevStep}>
              ← Previous
            </button>
          ) : (
            <div />
          )}

          {form.currentStep < 2 ? (
            <button className="btn btn-primary" onClick={handleNext}>
              Next →
            </button>
          ) : (
            <button
              className="btn btn-primary"
              onClick={handleGenerate}
              disabled={generation.status === 'generating'}
              style={{ padding: '12px 32px', fontSize: 15 }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" />
              </svg>
              Generate with AI
            </button>
          )}
        </div>
      </div>

      {/* Generation overlay */}
      {generation.status === 'generating' && (
        <div className="generation-overlay">
          <div className="generation-modal">
            <div className="generation-spinner" />
            <h3>Generating Your Paper</h3>
            <p>{generation.message || 'Please wait while AI crafts your question paper...'}</p>
            <div className="progress-bar">
              <div className="progress-bar-fill" style={{ width: `${generation.progress}%` }} />
            </div>
          </div>
        </div>
      )}

      {/* Failed state */}
      {generation.status === 'failed' && (
        <div className="generation-overlay">
          <div className="generation-modal">
            <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
            <h3>Generation Failed</h3>
            <p>{generation.message}</p>
            <button
              className="btn btn-primary"
              onClick={() => setGeneration({ status: 'idle', message: '' })}
              style={{ marginTop: 16 }}
            >
              Try Again
            </button>
          </div>
        </div>
      )}
    </>
  );
}
