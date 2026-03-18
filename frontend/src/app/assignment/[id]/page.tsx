'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { fetchAssignment, regenerateAssignment } from '@/lib/api';
import { useAssignmentStore } from '@/store/assignmentStore';
import { getSocket, joinAssignment } from '@/lib/socket';

interface Question {
  questionNumber: number;
  text: string;
  difficulty: 'Easy' | 'Moderate' | 'Hard';
  marks: number;
  type: string;
  answer?: string;
}

interface Section {
  title: string;
  instruction: string;
  questionType: string;
  questions: Question[];
}

interface QuestionPaper {
  schoolName: string;
  subject: string;
  className: string;
  timeAllowed: string;
  maxMarks: number;
  sections: Section[];
  answerKey: { questionNumber: number; answer: string }[];
}

export default function AssignmentOutputPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [assignment, setAssignment] = useState<any>(null);
  const [paper, setPaper] = useState<QuestionPaper | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAnswerKey, setShowAnswerKey] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [toast, setToast] = useState<{ type: string; message: string } | null>(null);
  const paperRef = useRef<HTMLDivElement>(null);
  const { setGeneration } = useAssignmentStore();

  useEffect(() => {
    loadData();

    const socket = getSocket();
    joinAssignment(id);

    socket.on('generation:complete', () => {
      loadData();
      setRegenerating(false);
      showToast('success', 'Question paper regenerated successfully!');
    });

    socket.on('generation:failed', (data: any) => {
      setRegenerating(false);
      showToast('error', data.message || 'Regeneration failed');
    });

    return () => {
      socket.off('generation:complete');
      socket.off('generation:failed');
    };
  }, [id]);

  async function loadData() {
    try {
      const data = await fetchAssignment(id);
      setAssignment(data.assignment);
      setPaper(data.questionPaper);
    } catch (err) {
      showToast('error', 'Failed to load assignment');
    } finally {
      setLoading(false);
    }
  }

  async function handleRegenerate() {
    try {
      setRegenerating(true);
      await regenerateAssignment(id);
      showToast('success', 'Regeneration started...');
    } catch (err) {
      setRegenerating(false);
      showToast('error', 'Failed to start regeneration');
    }
  }

  async function handleDownloadPDF() {
    if (!paperRef.current) return;

    try {
      const html2pdf = (await import('html2pdf.js')).default;
      const element = paperRef.current;

      const opt: Record<string, any> = {
        margin: [10, 10, 10, 10],
        filename: `${assignment?.title || 'question-paper'}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      };

      html2pdf().set(opt).from(element).save();
    } catch (err) {
      showToast('error', 'Failed to generate PDF');
    }
  }

  function showToast(type: string, message: string) {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3000);
  }

  function getDifficultyClass(difficulty: string) {
    switch (difficulty) {
      case 'Easy': return 'difficulty-easy';
      case 'Moderate': return 'difficulty-moderate';
      case 'Hard': return 'difficulty-hard';
      default: return 'difficulty-moderate';
    }
  }

  if (loading) {
    return (
      <div className="paper-container">
        <div className="card" style={{ padding: 40 }}>
          <div className="skeleton" style={{ height: 32, width: '60%', margin: '0 auto 16px' }} />
          <div className="skeleton" style={{ height: 20, width: '40%', margin: '0 auto 32px' }} />
          <div className="skeleton" style={{ height: 200, width: '100%', marginBottom: 16 }} />
          <div className="skeleton" style={{ height: 200, width: '100%' }} />
        </div>
      </div>
    );
  }

  if (!paper) {
    return (
      <div className="paper-container">
        <div className="empty-state">
          <div className="empty-state-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12,6 12,12 16,14" />
            </svg>
          </div>
          <h2>Paper Not Ready Yet</h2>
          <p>The question paper is still being generated. Please wait a moment and refresh.</p>
          <button className="btn btn-primary" onClick={loadData}>
            Refresh
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="paper-container">
      {/* Action bar */}
      <div className="paper-action-bar">
        <div className="paper-action-bar-left">
          <button className="btn btn-secondary" onClick={() => router.push('/')}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12,19 5,12 12,5" />
            </svg>
            Back
          </button>
          <h2 style={{ fontSize: 18, fontWeight: 700 }}>{assignment?.title}</h2>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            className="btn btn-outline"
            onClick={handleRegenerate}
            disabled={regenerating}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={regenerating ? { animation: 'spin 1s linear infinite' } : {}}>
              <polyline points="23,4 23,10 17,10" />
              <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
            </svg>
            {regenerating ? 'Regenerating...' : 'Regenerate'}
          </button>
          <button className="btn btn-primary" onClick={handleDownloadPDF}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7,10 12,15 17,10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Download PDF
          </button>
        </div>
      </div>

      {/* Question Paper */}
      <div className="paper" ref={paperRef}>
        {/* Header */}
        <div className="paper-header">
          <div className="paper-header-school">{paper.schoolName}</div>
          <div style={{ fontSize: 16, color: 'var(--text-secondary)', marginTop: 4 }}>
            {paper.subject} — {paper.className}
          </div>
          <div className="paper-header-meta">
            <span>Time Allowed: <strong>{paper.timeAllowed}</strong></span>
            <span>Maximum Marks: <strong>{paper.maxMarks}</strong></span>
          </div>
        </div>

        {/* Student Info */}
        <div className="paper-student-info">
          <div className="paper-student-field">
            <label>Name:</label>
            <div className="field-line" />
          </div>
          <div className="paper-student-field">
            <label>Roll No:</label>
            <div className="field-line" />
          </div>
          <div className="paper-student-field">
            <label>Section:</label>
            <div className="field-line" />
          </div>
        </div>

        {/* Sections */}
        {paper.sections.map((section, sectionIdx) => (
          <div key={sectionIdx} className="paper-section">
            <div className="paper-section-title">{section.title}</div>
            <div className="paper-section-instruction">{section.instruction}</div>

            {section.questions.map((q) => (
              <div key={q.questionNumber} className="paper-question">
                <div className="paper-question-header">
                  <span className="paper-question-number">Q{q.questionNumber}.</span>
                  <div className="paper-question-tags">
                    <span className={`difficulty-badge ${getDifficultyClass(q.difficulty)}`}>
                      {q.difficulty}
                    </span>
                    <span className="marks-badge">{q.marks} {q.marks === 1 ? 'Mark' : 'Marks'}</span>
                  </div>
                </div>
                <div className="paper-question-text">{q.text}</div>
              </div>
            ))}
          </div>
        ))}

        <div className="paper-end">— End of Question Paper —</div>
      </div>

      {/* Answer Key */}
      {paper.answerKey && paper.answerKey.length > 0 && (
        <div className="answer-key">
          <div className="answer-key-header" onClick={() => setShowAnswerKey(!showAnswerKey)}>
            <h3>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.78 7.78 5.5 5.5 0 0 1 7.78-7.78zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
              </svg>
              Answer Key
            </h3>
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth="2"
              style={{
                transition: 'transform 0.2s',
                transform: showAnswerKey ? 'rotate(180deg)' : 'rotate(0deg)',
              }}
            >
              <polyline points="6,9 12,15 18,9" />
            </svg>
          </div>
          {showAnswerKey && (
            <div className="answer-key-body">
              {paper.answerKey.map((ak) => (
                <div key={ak.questionNumber} className="answer-key-item">
                  <span className="answer-key-number">Q{ak.questionNumber}.</span>
                  <span className="answer-key-text">{ak.answer}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Regenerating overlay */}
      {regenerating && (
        <div className="generation-overlay">
          <div className="generation-modal">
            <div className="generation-spinner" />
            <h3>Regenerating Paper</h3>
            <p>Creating a fresh question paper with new questions...</p>
          </div>
        </div>
      )}

      {toast && (
        <div className={`toast toast-${toast.type}`}>
          {toast.type === 'success' ? '✓' : '✕'} {toast.message}
        </div>
      )}
    </div>
  );
}
