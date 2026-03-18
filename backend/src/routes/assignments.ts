import { Router, Request, Response } from 'express';
import Assignment from '../models/Assignment';
import QuestionPaper from '../models/QuestionPaper';
import { generationQueue, processGenerationJob } from '../workers/generationWorker';
import IORedis from 'ioredis';

const router = Router();
const redis = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', {
  enableOfflineQueue: false,
  maxRetriesPerRequest: null,
});
// CREATE assignment + trigger generation
router.post('/', async (req: Request, res: Response) => {
  try {
    const {
      title,
      subject,
      chapter,
      dueDate,
      questionTypes,
      additionalInstructions,
    } = req.body;

    // Validation
    if (!title || !subject || !dueDate || !questionTypes?.length) {
      return res.status(400).json({
        error: 'Missing required fields: title, subject, dueDate, questionTypes',
      });
    }

    for (const qt of questionTypes) {
      if (!qt.type || qt.count <= 0 || qt.marks <= 0) {
        return res.status(400).json({
          error: 'Each question type must have a valid type, count > 0, and marks > 0',
        });
      }
    }

    const totalQuestions = questionTypes.reduce((sum: number, qt: any) => sum + qt.count, 0);
    const totalMarks = questionTypes.reduce(
      (sum: number, qt: any) => sum + qt.count * qt.marks,
      0
    );

    const assignment = new Assignment({
      title,
      subject,
      chapter: chapter || '',
      dueDate: new Date(dueDate),
      questionTypes,
      additionalInstructions: additionalInstructions || '',
      totalQuestions,
      totalMarks,
      status: 'draft',
    });

    await assignment.save();

    // Add job to queue
    try {
      await generationQueue.add('generate', {
        assignmentId: assignment._id.toString(),
      });
    } catch (queueErr: any) {
      console.warn('[API] BullMQ queue add failed, falling back to inline generation:', queueErr.message);
      processGenerationJob(assignment._id.toString()).catch((e: any) => console.error('[Inline Generation] Error:', e.message));
    }

    await Assignment.findByIdAndUpdate(assignment._id, { status: 'generating' });

    // Invalidate cache
    try {
      await redis.del('assignments:list');
    } catch (redisErr) {
      console.warn('[API] Redis cache del failed, ignoring:', redisErr);
    }

    res.status(201).json({
      message: 'Assignment created. Generation in progress.',
      assignment,
    });
  } catch (error: any) {
    console.error('[API] Create assignment error:', error.message);
    res.status(500).json({ error: 'Failed to create assignment' });
  }
});

// GET all assignments
router.get('/', async (_req: Request, res: Response) => {
  try {
    // Try check cache, but don't fail if Redis is down
    try {
      const cached = await redis.get('assignments:list');
      if (cached) {
        return res.json(JSON.parse(cached));
      }
    } catch (redisErr) {
      console.warn('[API] Redis cache get failed, ignoring:', redisErr);
    }

    const assignments = await Assignment.find().sort({ createdAt: -1 });

    // Try Cache for 30 seconds
    try {
      await redis.setex('assignments:list', 30, JSON.stringify(assignments));
    } catch (redisErr) {
      console.warn('[API] Redis cache set failed, ignoring:', redisErr);
    }

    res.json(assignments);
  } catch (error: any) {
    console.error('[API] Get assignments error:', error.message);
    res.status(500).json({ error: 'Failed to fetch assignments' });
  }
});

// GET single assignment with generated paper
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Check cache
    const cacheKey = `assignment:${id}`;
    const cached = await redis.get(cacheKey);
    if (cached) {
      return res.json(JSON.parse(cached));
    }

    const assignment = await Assignment.findById(id);
    if (!assignment) {
      return res.status(404).json({ error: 'Assignment not found' });
    }

    const questionPaper = await QuestionPaper.findOne({ assignmentId: id });

    const result = {
      assignment,
      questionPaper,
    };

    // Cache for 60 seconds
    if (assignment.status === 'completed') {
      await redis.setex(cacheKey, 60, JSON.stringify(result));
    }

    res.json(result);
  } catch (error: any) {
    console.error('[API] Get assignment error:', error.message);
    res.status(500).json({ error: 'Failed to fetch assignment' });
  }
});

// DELETE assignment
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await Assignment.findByIdAndDelete(id);
    await QuestionPaper.findOneAndDelete({ assignmentId: id });

    // Invalidate caches
    await redis.del('assignments:list');
    await redis.del(`assignment:${id}`);

    res.json({ message: 'Assignment deleted successfully' });
  } catch (error: any) {
    console.error('[API] Delete assignment error:', error.message);
    res.status(500).json({ error: 'Failed to delete assignment' });
  }
});

// REGENERATE question paper
router.post('/:id/regenerate', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const assignment = await Assignment.findById(id);

    if (!assignment) {
      return res.status(404).json({ error: 'Assignment not found' });
    }

    await Assignment.findByIdAndUpdate(id, { status: 'generating' });

    // Add new job to queue
    try {
      await generationQueue.add('generate', { assignmentId: id });
    } catch (queueErr: any) {
      console.warn('[API] BullMQ queue add failed, falling back to inline generation:', queueErr.message);
      processGenerationJob(id as string).catch((e: any) => console.error('[Inline Generation] Error:', e.message));
    }

    // Invalidate caches
    try {
      await redis.del('assignments:list');
      await redis.del(`assignment:${id}`);
    } catch (redisErr) {
      console.warn('[API] Redis cache del failed, ignoring:', redisErr);
    }

    res.json({ message: 'Regeneration in progress.', assignmentId: id });
  } catch (error: any) {
    console.error('[API] Regenerate error:', error.message);
    res.status(500).json({ error: 'Failed to regenerate' });
  }
});

export default router;
