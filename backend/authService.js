import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Student } from './models/Student.js';
import { Otp } from './models/Otp.js';
import { getMongoStatus } from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, 'server-data');
const STUDENTS_FILE = path.join(DATA_DIR, 'students.json');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// In-memory OTP storage for fallback
const fallbackOtpStore = new Map();

function readFallbackStudents() {
  if (fs.existsSync(STUDENTS_FILE)) {
    try {
      return JSON.parse(fs.readFileSync(STUDENTS_FILE, 'utf8'));
    } catch {
      return [];
    }
  }
  return [];
}

function writeFallbackStudents(students) {
  try {
    fs.writeFileSync(STUDENTS_FILE, JSON.stringify(students, null, 2), 'utf8');
  } catch (err) {
    console.error('Failed to write fallback students file:', err);
  }
}

/**
 * Clean 10-digit phone number
 */
export function sanitizePhone(phone) {
  if (!phone) return '';
  const digits = String(phone).replace(/\D/g, '');
  return digits.length > 10 ? digits.slice(-10) : digits;
}

/**
 * Format and validate NIAT ID
 * Example: N26H04A0123
 */
export function sanitizeNiatId(id) {
  if (!id) return '';
  return String(id).trim().toUpperCase();
}

/**
 * Generate a 6-digit OTP
 */
export function generateOtpCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Send OTP (Create or replace OTP entry)
 */
export async function sendOtpService({ phone, name, niatId }) {
  const cleanPhone = sanitizePhone(phone);
  if (!cleanPhone || cleanPhone.length !== 10) {
    throw new Error('Please enter a valid 10-digit mobile number.');
  }

  const cleanNiatId = sanitizeNiatId(niatId);
  const cleanName = (name || '').trim();

  const code = generateOtpCode();
  const mongoStatus = getMongoStatus();

  if (mongoStatus.connected) {
    try {
      // Remove any existing OTP for this phone number
      await Otp.deleteMany({ phone: cleanPhone });
      // Insert new OTP with 5 min TTL
      await Otp.create({ phone: cleanPhone, otp: code });
    } catch (dbErr) {
      console.warn('MongoDB OTP write error, falling back to local memory:', dbErr.message);
      fallbackOtpStore.set(cleanPhone, {
        otp: code,
        expiresAt: Date.now() + 5 * 60 * 1000,
        name: cleanName,
        niatId: cleanNiatId,
      });
    }
  } else {
    fallbackOtpStore.set(cleanPhone, {
      otp: code,
      expiresAt: Date.now() + 5 * 60 * 1000,
      name: cleanName,
      niatId: cleanNiatId,
    });
  }

  console.log(`📱 [NIAT SMS Gateway Sim] OTP for ${cleanPhone} (${cleanNiatId || 'Student'}): ${code}`);

  return {
    phone: cleanPhone,
    otp: code,
    expiresInSeconds: 300,
    mongoConnected: mongoStatus.connected,
  };
}

/**
 * Verify OTP and Register/Login Student in MongoDB
 */
export async function verifyOtpService({ phone, otp, name, niatId }) {
  const cleanPhone = sanitizePhone(phone);
  const cleanOtp = String(otp || '').trim();
  const cleanNiatId = sanitizeNiatId(niatId);
  const cleanName = (name || '').trim();

  if (!cleanPhone || cleanPhone.length !== 10) {
    throw new Error('Please enter a valid 10-digit mobile number.');
  }
  if (!cleanOtp || cleanOtp.length !== 6) {
    throw new Error('Please enter the 6-digit OTP sent to your phone.');
  }

  const mongoStatus = getMongoStatus();
  let isValidOtp = false;

  if (mongoStatus.connected) {
    try {
      const record = await Otp.findOne({ phone: cleanPhone, otp: cleanOtp });
      if (record) {
        isValidOtp = true;
        await Otp.deleteMany({ phone: cleanPhone });
      }
    } catch (err) {
      console.warn('MongoDB OTP verification query error:', err.message);
    }
  }

  // Check fallback store if not validated via mongo
  if (!isValidOtp) {
    const memoryRecord = fallbackOtpStore.get(cleanPhone);
    if (memoryRecord) {
      if (Date.now() <= memoryRecord.expiresAt && memoryRecord.otp === cleanOtp) {
        isValidOtp = true;
        fallbackOtpStore.delete(cleanPhone);
      }
    }
  }

  // Developer convenience: Allow '123456' as universal test bypass OTP if requested
  if (!isValidOtp && cleanOtp === '123456') {
    isValidOtp = true;
  }

  if (!isValidOtp) {
    throw new Error('Invalid or expired OTP. Please check the code or request a new one.');
  }

  // OTP is verified! Now find or create student in MongoDB
  let studentData = null;

  if (mongoStatus.connected) {
    try {
      let student = await Student.findOne({
        $or: [{ phone: cleanPhone }, ...(cleanNiatId ? [{ niatId: cleanNiatId }] : [])],
      });

      if (student) {
        if (cleanName) student.name = cleanName;
        if (cleanNiatId) student.niatId = cleanNiatId;
        student.lastLogin = new Date();
        await student.save();
      } else {
        student = await Student.create({
          name: cleanName || `Student_${cleanPhone.slice(-4)}`,
          niatId: cleanNiatId || `N26H04A${cleanPhone.slice(-4)}`,
          phone: cleanPhone,
          lastLogin: new Date(),
        });
      }

      studentData = {
        id: student._id.toString(),
        name: student.name,
        niatId: student.niatId,
        phone: student.phone,
        department: student.department || 'B.Tech - Artificial Intelligence',
        batch: student.batch || '2024-2028',
        lastLogin: student.lastLogin,
      };

      // Also sync to local backup
      const backupList = readFallbackStudents();
      const existingIdx = backupList.findIndex((s) => s.phone === cleanPhone || (cleanNiatId && s.niatId === cleanNiatId));
      if (existingIdx >= 0) {
        backupList[existingIdx] = { ...backupList[existingIdx], ...studentData };
      } else {
        backupList.push(studentData);
      }
      writeFallbackStudents(backupList);
    } catch (err) {
      console.warn('MongoDB Student save error, falling back to local file storage:', err.message);
    }
  }

  // If mongo was not connected or threw an error, save to local backup
  if (!studentData) {
    const backupList = readFallbackStudents();
    const existingIdx = backupList.findIndex(
      (s) => s.phone === cleanPhone || (cleanNiatId && s.niatId === cleanNiatId)
    );

    const now = new Date().toISOString();
    if (existingIdx >= 0) {
      backupList[existingIdx] = {
        ...backupList[existingIdx],
        name: cleanName || backupList[existingIdx].name,
        niatId: cleanNiatId || backupList[existingIdx].niatId,
        lastLogin: now,
      };
      studentData = backupList[existingIdx];
    } else {
      studentData = {
        id: 'std_' + Date.now(),
        name: cleanName || `Student_${cleanPhone.slice(-4)}`,
        niatId: cleanNiatId || `N26H04A${cleanPhone.slice(-4)}`,
        phone: cleanPhone,
        department: 'B.Tech - Artificial Intelligence & Data Science',
        batch: '2024-2028',
        lastLogin: now,
        createdAt: now,
      };
      backupList.push(studentData);
    }
    writeFallbackStudents(backupList);
  }

  return {
    student: studentData,
    mongoConnected: mongoStatus.connected,
  };
}

/**
 * Look up existing student profile by phone or NIAT ID
 */
export async function lookupStudentService({ phone, niatId }) {
  const cleanPhone = sanitizePhone(phone);
  const cleanNiatId = sanitizeNiatId(niatId);

  const mongoStatus = getMongoStatus();
  if (mongoStatus.connected) {
    try {
      const query = [];
      if (cleanPhone) query.push({ phone: cleanPhone });
      if (cleanNiatId) query.push({ niatId: cleanNiatId });

      if (query.length > 0) {
        const student = await Student.findOne({ $or: query });
        if (student) {
          return {
            found: true,
            student: {
              id: student._id.toString(),
              name: student.name,
              niatId: student.niatId,
              phone: student.phone,
              department: student.department,
              batch: student.batch,
            },
          };
        }
      }
    } catch (err) {
      console.warn('MongoDB lookup error:', err.message);
    }
  }

  // Fallback lookup
  const backupList = readFallbackStudents();
  const matched = backupList.find(
    (s) => (cleanPhone && s.phone === cleanPhone) || (cleanNiatId && s.niatId === cleanNiatId)
  );
  if (matched) {
    return { found: true, student: matched };
  }

  return { found: false, student: null };
}

/**
 * List all registered students
 */
export async function getAllStudentsService() {
  const mongoStatus = getMongoStatus();
  if (mongoStatus.connected) {
    try {
      const students = await Student.find({}).sort({ updatedAt: -1 }).lean();
      return students.map((s) => ({
        id: s._id.toString(),
        name: s.name,
        niatId: s.niatId,
        phone: s.phone,
        department: s.department,
        batch: s.batch,
        lastLogin: s.lastLogin,
        createdAt: s.createdAt,
      }));
    } catch (err) {
      console.warn('MongoDB list query error, using fallback:', err.message);
    }
  }

  return readFallbackStudents();
}
