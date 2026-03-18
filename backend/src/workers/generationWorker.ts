import { Queue, Worker, Job } from 'bullmq';
import IORedis from 'ioredis';
import Assignment from '../models/Assignment';
import QuestionPaper from '../models/QuestionPaper';
import { generateQuestionPaper } from '../services/aiService';
import { emitToAssignment } from '../websocket/socketServer';

const connection = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
  enableOfflineQueue: false,
  retryStrategy(times) {
    if (times > 3) {
      console.warn('[Redis] Connection failed. BullMQ will be disabled.');
      return null; // Stop retrying
    }
    return Math.min(times * 50, 2000);
  }
});

connection.on('error', (err) => {
  console.warn('[Redis] Connection error ignored for dev (', err.message, ')');
});

// Create queue but it won't crash if Redis is down
export const generationQueue = new Queue('question-generation', { connection: connection as any });

export async function processGenerationJob(assignmentId: string) {
  console.log(`[Worker] Processing generation for assignment: ${assignmentId}`);

  try {
    // Update status to generating
    const assignment = await Assignment.findByIdAndUpdate(
      assignmentId,
      { status: 'generating' },
      { new: true }
    );

    if (!assignment) {
      throw new Error('Assignment not found');
    }

    emitToAssignment(assignmentId, 'generation:progress', {
      assignmentId,
      status: 'generating',
      message: 'Building your question paper with AI...',
      progress: 30,
    });

    // Generate the question paper
    const generatedPaper = await generateQuestionPaper({
      subject: assignment.subject,
      chapter: assignment.chapter,
      questionTypes: assignment.questionTypes,
      totalMarks: assignment.totalMarks,
      additionalInstructions: assignment.additionalInstructions,
    });

    emitToAssignment(assignmentId, 'generation:progress', {
      assignmentId,
      status: 'generating',
      message: 'Structuring and saving your paper...',
      progress: 80,
    });

    // Save to database
    await QuestionPaper.findOneAndDelete({ assignmentId });
    const questionPaper = new QuestionPaper({
      assignmentId,
      ...generatedPaper,
    });
    await questionPaper.save();

    // Update assignment status
    await Assignment.findByIdAndUpdate(assignmentId, { status: 'completed' });

    emitToAssignment(assignmentId, 'generation:complete', {
      assignmentId,
      status: 'completed',
      message: 'Question paper generated successfully!',
      progress: 100,
    });

    console.log(`[Worker] Generation complete for assignment: ${assignmentId}`);
    return { success: true, assignmentId };
  } catch (error: any) {
    console.error(`[Worker] Generation failed for ${assignmentId}:`, error.message);

    await Assignment.findByIdAndUpdate(assignmentId, { status: 'failed' });

    emitToAssignment(assignmentId, 'generation:failed', {
      assignmentId,
      status: 'failed',
      message: error.message || 'Generation failed. Please try again.',
    });

    throw error;
  }
}

// Initialize Worker with error handling
let worker: Worker | null = null;
try {
  worker = new Worker(
    'question-generation',
    async (job: Job) => {
      return processGenerationJob(job.data.assignmentId);
    },
    { connection: connection as any, concurrency: 2 }
  );

  worker.on('completed', (job) => {
    console.log(`[Worker] Job ${job.id} completed`);
  });

  worker.on('failed', (job, error) => {
    console.error(`[Worker] Job ${job?.id} failed:`, error.message);
  });
} catch (workerErr: any) {
  console.warn('[Worker] Could not initialize BullMQ worker:', workerErr.message);
}

export default worker;
