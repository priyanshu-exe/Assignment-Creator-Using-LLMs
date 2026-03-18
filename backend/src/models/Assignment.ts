import mongoose, { Schema, Document } from 'mongoose';

export interface IQuestionType {
  type: string;
  count: number;
  marks: number;
}

export interface IAssignment extends Document {
  title: string;
  subject: string;
  chapter: string;
  dueDate: Date;
  questionTypes: IQuestionType[];
  additionalInstructions: string;
  fileUrl?: string;
  status: 'draft' | 'generating' | 'completed' | 'failed';
  totalQuestions: number;
  totalMarks: number;
  createdAt: Date;
  updatedAt: Date;
}

const QuestionTypeSchema = new Schema<IQuestionType>({
  type: { type: String, required: true },
  count: { type: Number, required: true, min: 1 },
  marks: { type: Number, required: true, min: 1 },
});

const AssignmentSchema = new Schema<IAssignment>(
  {
    title: { type: String, required: true },
    subject: { type: String, required: true },
    chapter: { type: String, default: '' },
    dueDate: { type: Date, required: true },
    questionTypes: { type: [QuestionTypeSchema], required: true },
    additionalInstructions: { type: String, default: '' },
    fileUrl: { type: String },
    status: {
      type: String,
      enum: ['draft', 'generating', 'completed', 'failed'],
      default: 'draft',
    },
    totalQuestions: { type: Number, default: 0 },
    totalMarks: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export default mongoose.model<IAssignment>('Assignment', AssignmentSchema);
