import mongoose from 'mongoose';
import 'dotenv/config';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/niat_db';

let isMongoConnected = false;

export async function connectDB() {
  try {
    mongoose.set('strictQuery', false);
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 3000,
    });
    isMongoConnected = true;
    console.log(`🍃 [MongoDB] Successfully connected to database: ${mongoose.connection.name}`);
  } catch (err) {
    isMongoConnected = false;
    console.warn(`⚠️ [MongoDB] Warning: Could not connect to MongoDB at "${MONGODB_URI}".`);
    console.warn(`   Reason: ${err.message}`);
    console.warn(`   ℹ️ The system will safely utilize the local server-data storage until MongoDB is available.`);
    console.warn(`   💡 Tip: Add your MongoDB Atlas connection string in backend/.env: MONGODB_URI=mongodb+srv://...`);
  }
}

export function getMongoStatus() {
  return {
    connected: isMongoConnected && mongoose.connection.readyState === 1,
    state: mongoose.connection.readyState,
    uri: MONGODB_URI.replace(/\/\/([^:]+):([^@]+)@/, '//$1:****@'),
  };
}
