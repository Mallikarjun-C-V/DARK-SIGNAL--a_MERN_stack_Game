require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// ===============================
// DATABASE CONNECTION (Vercel-safe)
// ===============================
const mongoURI = process.env.MONGO_URI;

// Prevent Vercel from opening multiple Mongo connections
let cached = global.mongoose;
if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

async function connectDB() {
  if (cached.conn) return cached.conn;

  if (!cached.promise) {
    cached.promise = mongoose.connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    }).then((mongoose) => mongoose);
  }

  cached.conn = await cached.promise;
  return cached.conn;
}

// Call DB connect
connectDB()
  .then(() => console.log(">> DATABASE LINKED: SYSTEM ONLINE"))
  .catch(err => console.log(">> DATABASE ERROR:", err));

// ===============================
// SCHEMA
// ===============================
const ScoreSchema = new mongoose.Schema({
  player: String,
  time: Number,
  difficulty: String,
  won: Boolean,
  date: { type: Date, default: Date.now }
});

const Score =
  mongoose.models.Score || mongoose.model("Score", ScoreSchema);

// ===============================
// SAVE SCORE
// ===============================
app.post('/api/score', async (req, res) => {
  try {
    const { player, time, difficulty, won } = req.body;

    const newScore = new Score({ player, time, difficulty, won });
    await newScore.save();

    console.log(`>> NEW RECORD: ${player} - ${time}s - won: ${won}`);
    res.status(201).json({ message: "Score Saved" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to save score" });
  }
});

// ===============================
// GET LEADERBOARD (fastest winners)
// ===============================
app.get('/api/leaderboard', async (req, res) => {
  try {
    const scores = await Score.find({ won: true })
      .sort({ time: 1 })  
      .limit(10);

    res.json(scores);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch leaderboard" });
  }
});

// ===============================
// OPTIONAL: All scores
// ===============================
app.get('/api/scores/all', async (req, res) => {
  try {
    const scores = await Score.find().sort({ date: -1 }).limit(50);
    res.json(scores);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch scores" });
  }
});

// ===============================
// VERY IMPORTANT FOR VERCEL
// ===============================
// ⛔ DO NOT USE app.listen()
// ⛔ DO NOT USE PORTS
// ✔ Export app as a module
// ===============================
module.exports = app;
