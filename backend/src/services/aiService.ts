import Groq from 'groq-sdk';
import { IQuestionType } from '../models/Assignment';

let groqClient: Groq | null = null;
function getGroqClient() {
  if (!groqClient) {
    if (!process.env.GROQ_API_KEY) {
      throw new Error('GROQ_API_KEY environment variable is still missing after dotenv load!');
    }
    groqClient = new Groq({
      apiKey: process.env.GROQ_API_KEY,
    });
  }
  return groqClient;
}

interface GenerationInput {
  subject: string;
  chapter: string;
  questionTypes: IQuestionType[];
  totalMarks: number;
  additionalInstructions: string;
}

interface GeneratedQuestion {
  questionNumber: number;
  text: string;
  difficulty: 'Easy' | 'Moderate' | 'Hard';
  marks: number;
  type: string;
  answer: string;
}

interface GeneratedSection {
  title: string;
  instruction: string;
  questionType: string;
  questions: GeneratedQuestion[];
}

export interface GeneratedPaper {
  schoolName: string;
  subject: string;
  className: string;
  timeAllowed: string;
  maxMarks: number;
  sections: GeneratedSection[];
  answerKey: { questionNumber: number; answer: string }[];
}

function buildPrompt(input: GenerationInput): string {
  const sectionDescriptions = input.questionTypes
    .map(
      (qt, i) =>
        `Section ${String.fromCharCode(65 + i)}: ${qt.type} — ${qt.count} questions, ${qt.marks} marks each`
    )
    .join('\n');

  return `You are an expert academic question paper generator. Generate a structured question paper based on the following specifications.

Subject: ${input.subject}
Chapter/Topic: ${input.chapter || 'General'}
Total Marks: ${input.totalMarks}

Sections Required:
${sectionDescriptions}

Additional Instructions: ${input.additionalInstructions || 'None'}

IMPORTANT RULES:
1. Each question must have a difficulty level: "Easy", "Moderate", or "Hard"
2. Distribute difficulty levels across questions (roughly 30% Easy, 40% Moderate, 30% Hard)
3. Questions should be diverse, creative, and exam-appropriate
4. Each question must have a concise answer for the answer key
5. Number questions sequentially across all sections (1, 2, 3, ... not restarting per section)

Return ONLY valid JSON (no markdown, no code blocks) in this exact format:
{
  "sections": [
    {
      "title": "Section A: Multiple Choice Questions",
      "instruction": "Choose the correct option for each question.",
      "questionType": "Multiple Choice",
      "questions": [
        {
          "questionNumber": 1,
          "text": "What is...?\\n(a) Option A\\n(b) Option B\\n(c) Option C\\n(d) Option D",
          "difficulty": "Easy",
          "marks": 1,
          "type": "Multiple Choice",
          "answer": "(b) Option B"
        }
      ]
    }
  ],
  "answerKey": [
    { "questionNumber": 1, "answer": "(b) Option B - Brief explanation" }
  ]
}`;
}

export async function generateQuestionPaper(input: GenerationInput): Promise<GeneratedPaper> {
  const prompt = buildPrompt(input);

  const completion = await getGroqClient().chat.completions.create({
    messages: [
      {
        role: 'system',
        content:
          'You are a professional academic assessment creator. You output ONLY valid JSON without any markdown formatting, code blocks, or extra text.',
      },
      { role: 'user', content: prompt },
    ],
    model: 'llama-3.3-70b-versatile',
    temperature: 0.7,
    max_tokens: 4096,
    response_format: { type: 'json_object' },
  });

  const responseText = completion.choices[0]?.message?.content || '{}';
  
  let parsed: any;
  try {
    parsed = JSON.parse(responseText);
  } catch {
    // Try to extract JSON from the response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      parsed = JSON.parse(jsonMatch[0]);
    } else {
      throw new Error('Failed to parse AI response as JSON');
    }
  }

  // Build the full paper structure
  const paper: GeneratedPaper = {
    schoolName: 'Delhi Public School',
    subject: input.subject,
    className: 'Class 10',
    timeAllowed: '3 Hours',
    maxMarks: input.totalMarks,
    sections: parsed.sections || [],
    answerKey: parsed.answerKey || [],
  };

  return paper;
}
