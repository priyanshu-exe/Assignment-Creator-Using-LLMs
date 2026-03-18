import { create } from 'zustand';

export interface QuestionTypeConfig {
  type: string;
  count: number;
  marks: number;
}

export interface FormState {
  title: string;
  subject: string;
  chapter: string;
  dueDate: string;
  questionTypes: QuestionTypeConfig[];
  additionalInstructions: string;
  currentStep: number;
  file: File | null;
}

interface GenerationStatus {
  assignmentId: string | null;
  status: 'idle' | 'generating' | 'completed' | 'failed';
  message: string;
  progress: number;
}

interface Assignment {
  _id: string;
  title: string;
  subject: string;
  chapter: string;
  dueDate: string;
  status: string;
  totalQuestions: number;
  totalMarks: number;
  createdAt: string;
}

interface AssignmentStore {
  // Assignments list
  assignments: Assignment[];
  setAssignments: (assignments: Assignment[]) => void;
  removeAssignment: (id: string) => void;

  // Form state
  form: FormState;
  setFormField: <K extends keyof FormState>(key: K, value: FormState[K]) => void;
  addQuestionType: () => void;
  removeQuestionType: (index: number) => void;
  updateQuestionType: (index: number, field: keyof QuestionTypeConfig, value: any) => void;
  resetForm: () => void;
  nextStep: () => void;
  prevStep: () => void;

  // Generation status
  generation: GenerationStatus;
  setGeneration: (gen: Partial<GenerationStatus>) => void;

  // Sidebar
  sidebarOpen: boolean;
  toggleSidebar: () => void;
}

const defaultForm: FormState = {
  title: '',
  subject: '',
  chapter: '',
  dueDate: '',
  questionTypes: [
    { type: 'Multiple Choice', count: 5, marks: 1 },
    { type: 'Short Questions', count: 5, marks: 2 },
  ],
  additionalInstructions: '',
  currentStep: 0,
  file: null,
};

export const useAssignmentStore = create<AssignmentStore>((set) => ({
  assignments: [],
  setAssignments: (assignments) => set({ assignments }),
  removeAssignment: (id) =>
    set((state) => ({
      assignments: state.assignments.filter((a) => a._id !== id),
    })),

  form: { ...defaultForm },
  setFormField: (key, value) =>
    set((state) => ({
      form: { ...state.form, [key]: value },
    })),
  addQuestionType: () =>
    set((state) => ({
      form: {
        ...state.form,
        questionTypes: [
          ...state.form.questionTypes,
          { type: 'Numerical Problems', count: 3, marks: 3 },
        ],
      },
    })),
  removeQuestionType: (index) =>
    set((state) => ({
      form: {
        ...state.form,
        questionTypes: state.form.questionTypes.filter((_, i) => i !== index),
      },
    })),
  updateQuestionType: (index, field, value) =>
    set((state) => {
      const types = [...state.form.questionTypes];
      types[index] = { ...types[index], [field]: value };
      return { form: { ...state.form, questionTypes: types } };
    }),
  resetForm: () => set({ form: { ...defaultForm } }),
  nextStep: () =>
    set((state) => ({
      form: { ...state.form, currentStep: Math.min(state.form.currentStep + 1, 2) },
    })),
  prevStep: () =>
    set((state) => ({
      form: { ...state.form, currentStep: Math.max(state.form.currentStep - 1, 0) },
    })),

  generation: {
    assignmentId: null,
    status: 'idle',
    message: '',
    progress: 0,
  },
  setGeneration: (gen) =>
    set((state) => ({
      generation: { ...state.generation, ...gen },
    })),

  sidebarOpen: false,
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
}));
