import mongoose from 'mongoose';
import 'dotenv/config';

const MONGODB_URI =
  process.env.MONGODB_URI ||
  'mongodb://ADITHYA_vardan122:<db_password>@ac-vohtcnu-shard-00-00.fpubh0u.mongodb.net:27017,ac-vohtcnu-shard-00-01.fpubh0u.mongodb.net:27017,ac-vohtcnu-shard-00-02.fpubh0u.mongodb.net:27017/niat_db?ssl=true&replicaSet=atlas-ekodh5-shard-0&authSource=admin';

let isMongoConnected = false;

export async function connectDB() {
  if (MONGODB_URI.includes('<db_password>')) {
    isMongoConnected = false;
    console.warn(`⚠️ [MongoDB Atlas] Placeholder "<db_password>" detected in MONGODB_URI.`);
    console.warn(`   🔑 To connect to your Atlas cluster, please replace <db_password> with your actual database user password in backend/.env:`);
    console.warn(`   MONGODB_URI=mongodb://ADITHYA_vardan122:YOUR_ACTUAL_PASSWORD@ac-vohtcnu-shard-00-00.fpubh0u.mongodb.net:27017...`);
    console.warn(`   ℹ️ The backend is securely operating in resilient local storage mode until your password is set.`);
    return;
  }

  try {
    mongoose.set('strictQuery', false);
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
    });
    isMongoConnected = true;
    console.log(`🍃 [MongoDB Atlas] Successfully connected to cluster! Active database: ${mongoose.connection.name}`);
  } catch (err) {
    isMongoConnected = false;
    console.warn(`⚠️ [MongoDB Atlas] Warning: Could not connect to Atlas at:`);
    console.warn(`   ${MONGODB_URI.replace(/\/\/([^:]+):([^@]+)@/, '//$1:****@')}`);
    console.warn(`   Reason: ${err.message}`);
    console.warn(`   ℹ️ Operating in local backup storage mode in server-data/students.json until connection is restored.`);
  }
}

export function getMongoStatus() {
  const hasPlaceholder = MONGODB_URI.includes('<db_password>');
  return {
    connected: isMongoConnected && mongoose.connection.readyState === 1,
    state: mongoose.connection.readyState,
    needsPassword: hasPlaceholder,
    cluster: 'Atlas (ac-vohtcnu-shard)',
    uri: MONGODB_URI.replace(/\/\/([^:]+):([^@]+)@/, '//$1:****@'),
  };
}

