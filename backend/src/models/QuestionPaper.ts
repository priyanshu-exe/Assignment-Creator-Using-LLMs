import mongoose, { Schema, Document } from 'mongoose';

export interface IQuestion {
  questionNumber: number;
  text: string;
  difficulty: 'Easy' | 'Moderate' | 'Hard';
  marks: number;
  type: string;
  answer?: string;
}

export interface ISection {
  title: string;
  instruction: string;
  questionType: string;
  questions: IQuestion[];
}

export interface IQuestionPaper extends Document {
  assignmentId: mongoose.Types.ObjectId;
  schoolName: string;
  subject: string;
  className: string;
  timeAllowed: string;
  maxMarks: number;
  sections: ISection[];
  answerKey: { questionNumber: number; answer: string }[];
  generatedAt: Date;
}

const QuestionSchema = new Schema<IQuestion>({
  questionNumber: { type: Number, required: true },
  text: { type: String, required: true },
  difficulty: { type: String, enum: ['Easy', 'Moderate', 'Hard'], required: true },
  marks: { type: Number, required: true },
  type: { type: String, required: true },
  answer: { type: String },
});

const SectionSchema = new Schema<ISection>({
  title: { type: String, required: true },
  instruction: { type: String, required: true },
  questionType: { type: String, required: true },
  questions: { type: [QuestionSchema], required: true },
});

const QuestionPaperSchema = new Schema<IQuestionPaper>(
  {
    assignmentId: { type: Schema.Types.ObjectId, ref: 'Assignment', required: true },
    schoolName: { type: String, default: 'Delhi Public School' },
    subject: { type: String, required: true },
    className: { type: String, default: 'Class 10' },
    timeAllowed: { type: String, default: '3 Hours' },
    maxMarks: { type: Number, required: true },
    sections: { type: [SectionSchema], required: true },
    answerKey: [{ questionNumber: Number, answer: String }],
    generatedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export default mongoose.model<IQuestionPaper>('QuestionPaper', QuestionPaperSchema);
