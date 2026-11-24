import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import multer from 'multer';
import 'dotenv/config';
import { connectDB, getMongoStatus } from './db.js';
import {
  sendOtpService,
  verifyOtpService,
  lookupStudentService,
  getAllStudentsService,
  storeStudentService,
} from './authService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

// ─── CORS ────────────────────────────────────────────────────────────────────
const ALLOWED_ORIGINS = [
  process.env.FRONTEND_URL,
  'http://localhost:3000',
  'http://localhost:5173',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:5173',
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, Postman)
    if (!origin || ALLOWED_ORIGINS.includes(origin)) return callback(null, true);
    callback(new Error(`CORS: origin ${origin} not allowed`));
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ─── DATABASE (JSON file) ────────────────────────────────────────────────────
const DATA_DIR = path.join(__dirname, 'server-data');
const DB_FILE  = path.join(DATA_DIR, 'database.json');

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const SEED_SUBJECTS = [
  {
    id: 'programming',
    name: 'Computer Programming',
    teacherName: 'Atifa Mam',
    teacherRole: 'Python & Software Systems Faculty',
    teacherImage: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=600',
    description: 'Master Computer Programming with Python from fundamentals to advanced data structures, debugging, algorithmic complexity, and standard libraries.',
    voiceConfig: {
      provider: 'elevenlabs',
      voiceId: 'hpp4J3VqNfWAUOO0d1Us',
      voiceName: 'Atifa Mam (Bella Cleared)',
      agentId: 'agent_2001m787qgn3fbnag9rvn4rvb72x',
      status: 'active',
      audioSampleUrl: '/uploads/audio/atifa_mam_python_voice.mp4',
    },
    sections: [
      'Programming with Python', 'Coding Practice Walkthrough – Part 1',
      'Leveraging Gen AI for Accelerated Learning', 'Variables and Data Types',
      'Sequence of Instructions', 'Input and Output Basics', 'How to Debug Your Code?',
      'Type Conversions', 'Relational Operators', 'Logical Operators',
      'Conditional Statements', 'Nested Conditional Statements', 'Loops',
      'Understanding Coding Question Formats', 'For Loop', 'String Methods',
      'Nested Loops', 'Loop Control Statements', 'Comparing Strings & Naming Variables',
      'Lists', 'Lists and Strings', 'Functions', 'Built-in Functions',
      'List Methods and Tuples', 'Sets and Set Operations', 'Dictionaries',
      'Python Standard Library',
    ],
    youtubeVideos: [],
  },
  {
    id: 'webdev',
    name: 'Web Application Development',
    teacherName: 'Sujan Sir',
    teacherRole: 'Lead Web & Full-Stack Architecture Faculty',
    teacherImage: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=600',
    description: 'Build production-grade responsive web applications with semantic HTML5, modern CSS3, Tailwind CSS, and frontend architecture.',
    voiceConfig: {
      provider: 'elevenlabs',
      voiceId: 'CwhRBWXzGAHq8TQ4Fs17',
      voiceName: 'Sujan Sir (Roger Cleared)',
      agentId: 'agent_2001m787qgn3fbnag9rvn4rvb72x',
      status: 'active',
      audioSampleUrl: '/uploads/audio/sujan_sir_cleared_voice.mp3',
    },
    sections: [
      'Introduction to GenAI in Web Development', 'Getting Started with Web Development',
      'Introduction to HTML', 'Leveraging GenAI for Accelerated Learning',
      'Introduction to CSS | Part 1', 'Introduction to CSS | Part 2',
      'Introduction to CSS | Part 3', 'Introduction to CSS Box Model | Part 1',
      'Introduction to CSS Box Model | Part 2', 'Coding Platform Walkthrough',
      'HTML Void Elements & Lists', 'Website: Behind the Scenes',
      'HTML Hyperlinks', 'Introduction to HTML5', 'HTML Semantic Elements',
      'More CSS Concepts', 'CSS Selectors & Specificity', 'Sizing Elements and Box Sizing',
      'Introduction to CSS Flexbox', 'CSS Flexbox & Media Queries',
      'Flexbox Sizing & Building Web Applications', 'Building Web Applications II',
      'CSS Grid I', 'CSS Grid II', 'CSS Positioning',
      'Introduction to Tailwind CSS', 'Building Responsive Websites',
    ],
    youtubeVideos: [],
  },
  {
    id: 'genai',
    name: 'Introduction to Generative AI',
    teacherName: 'Kavya Mam',
    teacherRole: 'AI & Autonomous Agents Faculty',
    teacherImage: 'https://images.unsplash.com/photo-1580894732444-8ecded7900cd?auto=format&fit=crop&q=80&w=600',
    description: 'Explore Generative AI models, prompt engineering, RAG pipelines, n8n workflow automations, and autonomous agents.',
    voiceConfig: {
      provider: 'elevenlabs',
      voiceId: 'XrExE9yKIg1WjnnlVkGX',
      voiceName: 'Kavya Mam (AI Specialist Cloned Voice)',
      agentId: 'agent_2001m787qgn3fbnag9rvn4rvb72x',
      status: 'active',
      audioSampleUrl: '/uploads/audio/kavya_mam_cleared_voice.mp3',
    },
    sections: [
      'Your Learning Journey', 'Generative AI Foundations', 'Exploring Gen AI Capabilities',
      'Productivity Power Up with AI Tools', 'Prompt Engineering Fundamentals',
      'Building Social Media Content Automation Workflow – Part 1',
      'Building Social Media Content Automation Workflow – Part 2',
      'Setting Up Google OAuth 2.0 for n8n', 'Advanced Prompt Engineering',
      'Build Your Own AI News Summarizer – Part 1', 'Build Your Own AI News Summarizer – Part 2',
      'Build Your Own AI News Summarizer – Part 3',
      'Productivity Power-Up with AI Tools – Part 2', 'No-Code AI Automation',
      'AI Workflows for Enhanced Productivity', 'Mastering Image Generation',
      'Mastering Audio Generation & No-Code Application Building',
      'Building AI Agents', 'Building an AI Shopping Assistant',
      'Agents with Memory & Introduction to MCP', 'Slides',
    ],
    youtubeVideos: [],
  },
  {
    id: 'mathematics',
    name: 'Mathematics for Computer Science',
    teacherName: 'Narendra Sir',
    teacherRole: 'Senior Maths & Discrete Structures Faculty',
    teacherImage: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&q=80&w=600',
    description: 'Master Discrete Mathematics, Number Systems, Boolean Algebra, Calculus, and Linear Algebra for B.Tech CSE.',
    voiceConfig: {
      provider: 'elevenlabs',
      voiceId: 'IKne3meq5aSn9XLyUdCD',
      voiceName: 'Narendra Sir (Maths Voice)',
      agentId: 'agent_2001m787qgn3fbnag9rvn4rvb72x',
      status: 'active',
      audioSampleUrl: '/uploads/audio/narender_sir_maths_voice.m4a',
    },
    sections: [
      'Number Systems', 'Binary Arithmetic', 'Octal & Hexadecimal Conversions',
      'Boolean Algebra & Logic Gates', 'Set Theory & Relations', 'Functions & Mappings',
      'Mathematical Induction', 'Combinatorics & Permutations', 'Graph Theory Basics',
      'Trees & Spanning Algorithms', 'Matrices & Determinants', 'Calculus Foundations',
      'Integration & Differentiation', 'Probability Theory', 'Statistics for Engineers',
    ],
    youtubeVideos: [],
  },
  {
    id: 'aptitude',
    name: 'Quantitative Aptitude',
    teacherName: 'Kusuma Mam',
    teacherRole: 'Quantitative & Placement Aptitude Lead',
    teacherImage: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=600',
    description: 'Crack campus placements with speed math shortcuts, LCM techniques, percentages, profit & loss, and time & work tricks.',
    voiceConfig: {
      provider: 'elevenlabs',
      voiceId: 'EXAVITQu4vr4xnSDxMaL',
      voiceName: 'Kusuma Mam (Sarah Cleared)',
      agentId: 'agent_2001m787qgn3fbnag9rvn4rvb72x',
      status: 'active',
      audioSampleUrl: '/uploads/audio/teacher_agent_voice.mp3',
    },
    sections: [
      'Introduction', 'Numbers', 'Power Cycles', 'Remainder Cycles',
      'Basics and Properties', 'Multiples', 'Factors', 'Percentages Basics',
      'Percentages Advanced', 'Profit & Loss', 'Simple Interest', 'Compound Interest',
      'Time & Work', 'Speed, Distance & Time', 'Ratio & Proportion',
      'Permutations & Combinations', 'Probability', 'Data Interpretation',
    ],
    youtubeVideos: [],
  },
  {
    id: 'english',
    name: 'English Communication & Soft Skills',
    teacherName: 'Ankhi Mam',
    teacherRole: 'Business Communication & HR Interview Trainer',
    teacherImage: 'https://images.unsplash.com/photo-1551836022-deb4988cc6c0?auto=format&fit=crop&q=80&w=600',
    description: 'Build professional English communication, improve grammar, ace HR interviews, and master corporate soft skills.',
    voiceConfig: {
      provider: 'elevenlabs',
      voiceId: 'Xb7hH8MSUJpSbSDYk0k2',
      voiceName: 'Ankhi Mam (English Specialist)',
      agentId: 'agent_2001m787qgn3fbnag9rvn4rvb72x',
      status: 'active',
      audioSampleUrl: '/uploads/audio/teacher_agent_voice.mp3',
    },
    sections: [
      'Introduction to Business English', 'Grammar Essentials', 'Spoken English Fluency',
      'Email & Report Writing', 'Presentation Skills', 'Group Discussion Strategies',
      'HR Interview Preparation', 'Resume & LinkedIn Profile', 'Body Language & Confidence',
      'Campus Placement Communication', 'Technical Interview Communication',
    ],
    youtubeVideos: [],
  },
];

function readDB() {
  if (fs.existsSync(DB_FILE)) {
    try {
      return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
    } catch {
      return { subjects: SEED_SUBJECTS };
    }
  }
  return { subjects: SEED_SUBJECTS };
}

function writeDB(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

// ─── STATIC FILES (uploaded audio / teacher images) ──────────────────────────
app.use('/uploads', express.static(path.join(__dirname, 'public', 'uploads')));

// ─── ROUTES ──────────────────────────────────────────────────────────────────

// Health check
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'NIAT Autonomous AI Teachers Backend',
    deployedOn: 'Render',
    timestamp: new Date().toISOString(),
  });
});

// Root ping
app.get('/', (_req, res) => {
  res.json({ message: 'NIAT Teachers Backend API is running.' });
});

// GET /api/subjects
app.get('/api/subjects', (_req, res) => {
  const db = readDB();
  res.json({ success: true, subjects: db.subjects });
});

// GET /api/materials?subjectId=...
app.get('/api/materials', (req, res) => {
  const db = readDB();
  const { subjectId } = req.query;
  let list = db.materials || [];
  if (subjectId) list = list.filter((m) => m.subjectId === subjectId);
  res.json({ success: true, materials: list });
});

// POST /api/admin/update-teacher
app.post('/api/admin/update-teacher', (req, res) => {
  const { subjectId, updates } = req.body;
  if (!subjectId || !updates) {
    return res.status(400).json({ error: 'subjectId and updates are required.' });
  }
  const db = readDB();
  const idx = db.subjects.findIndex((s) => s.id === subjectId);
  if (idx === -1) return res.status(404).json({ error: 'Subject not found.' });

  db.subjects[idx] = { ...db.subjects[idx], ...updates };
  writeDB(db);
  res.json({ success: true, subject: db.subjects[idx] });
});

// ─── AUTHENTICATION & MONGODB ROUTES ────────────────────────────────────────

// Check MongoDB and Auth Status
app.get('/api/auth/status', (_req, res) => {
  const status = getMongoStatus();
  res.json({
    success: true,
    mongo: status,
    timestamp: new Date().toISOString(),
  });
});

// POST /api/auth/send-otp
// Request body: { phone, name, niatId }
app.post('/api/auth/send-otp', async (req, res) => {
  try {
    const { phone, name, niatId } = req.body;
    const result = await sendOtpService({ phone, name, niatId });
    res.json({
      success: true,
      message: `OTP sent successfully to +91 ${result.phone}`,
      phone: result.phone,
      otp: result.otp, // Returned for instant testing and demonstration
      expiresInSeconds: result.expiresInSeconds,
      mongoConnected: result.mongoConnected,
    });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// POST /api/auth/verify-otp
// Request body: { phone, otp, name, niatId }
app.post('/api/auth/verify-otp', async (req, res) => {
  try {
    const { phone, otp, name, niatId } = req.body;
    const result = await verifyOtpService({ phone, otp, name, niatId });
    res.json({
      success: true,
      message: 'Student verified and logged in successfully!',
      student: result.student,
      mongoConnected: result.mongoConnected,
    });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// POST /api/auth/lookup
// Request body: { phone, niatId }
app.post('/api/auth/lookup', async (req, res) => {
  try {
    const { phone, niatId } = req.body;
    const result = await lookupStudentService({ phone, niatId });
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// GET /api/auth/students (List registered students)
app.get('/api/auth/students', async (_req, res) => {
  try {
    const students = await getAllStudentsService();
    res.json({ success: true, count: students.length, students });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/auth/store-student
// Stores student name, NIAT ID, and phone number directly into MongoDB
app.post('/api/auth/store-student', async (req, res) => {
  try {
    const { name, niatId, phone, department, batch } = req.body;
    const result = await storeStudentService({ name, niatId, phone, department, batch });
    res.json(result);
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// POST /api/admin/upload-audio  (multipart — handled via multer)
const uploadDir = path.join(__dirname, 'public', 'uploads', 'teachers');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
});
const upload = multer({ storage, limits: { fileSize: 20 * 1024 * 1024 } });

app.post('/api/admin/upload-audio', upload.single('audio'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded.' });
  const url = `/uploads/teachers/${req.file.filename}`;
  res.json({ success: true, url });
});

// 404 fallback
app.use((_req, res) => {
  res.status(404).json({ error: 'Endpoint not found.' });
});

// ─── START ───────────────────────────────────────────────────────────────────
app.listen(PORT, async () => {
  console.log(`✅ NIAT Backend (Express) running on port ${PORT}`);
  console.log(`   CORS origins: ${ALLOWED_ORIGINS.join(', ')}`);
  await connectDB();
});
