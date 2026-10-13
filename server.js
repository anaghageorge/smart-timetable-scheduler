const dns = require("dns");

// Fix DNS resolution for MongoDB Atlas SRV records
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config();

const app = express();

app.use(express.json());

// Serve frontend files
app.use(express.static(__dirname));

// Connect to MongoDB
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => {
    console.log("MongoDB connected successfully!");
  })
  .catch((error) => {
    console.error("MongoDB connection error:", error.message);
  });

// ================================
// SUBJECT SCHEMA
// ================================

const subjectSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
});

const Subject = mongoose.model("Subject", subjectSchema);

// ================================
// CONFLICT SCHEMA
// ================================

const conflictSchema = new mongoose.Schema({
  subject1: {
    type: String,
    required: true,
  },
  subject2: {
    type: String,
    required: true,
  },
});

const Conflict = mongoose.model("Conflict", conflictSchema);

// ================================
// HEALTH CHECK API
// ================================

app.get("/api/health", (req, res) => {
  res.json({
    message: "Classroom Timetable Generator API is running!",
    database:
      mongoose.connection.readyState === 1
        ? "Connected"
        : "Disconnected",
  });
});

// ================================
// GET ALL SUBJECTS
// ================================

app.get("/api/subjects", async (req, res) => {
  try {
    const subjects = await Subject.find().sort({ name: 1 });
    res.json(subjects);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ================================
// ADD A SUBJECT
// ================================

app.post("/api/subjects", async (req, res) => {
  try {
    const name = req.body.name?.trim();

    if (!name) {
      return res.status(400).json({
        error: "Subject name is required.",
      });
    }

    const subject = await Subject.create({ name });

    res.status(201).json(subject);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        error: "This subject already exists.",
      });
    }

    res.status(500).json({ error: error.message });
  }
});

// ================================
// DELETE A SUBJECT
// ================================

app.delete("/api/subjects/:id", async (req, res) => {
  try {
    const subject = await Subject.findByIdAndDelete(req.params.id);

    if (!subject) {
      return res.status(404).json({
        error: "Subject not found.",
      });
    }

    // Remove conflicts involving the deleted subject
    await Conflict.deleteMany({
      $or: [
        { subject1: subject.name },
        { subject2: subject.name },
      ],
    });

    res.json({
      message: "Subject deleted successfully.",
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ================================
// GET ALL CONFLICTS
// ================================

app.get("/api/conflicts", async (req, res) => {
  try {
    const conflicts = await Conflict.find().sort({
      subject1: 1,
    });

    res.json(conflicts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ================================
// ADD A CONFLICT
// ================================

app.post("/api/conflicts", async (req, res) => {
  try {
    const { subject1, subject2 } = req.body;

    if (!subject1 || !subject2) {
      return res.status(400).json({
        error: "Please select both subjects.",
      });
    }

    if (subject1 === subject2) {
      return res.status(400).json({
        error: "A subject cannot conflict with itself.",
      });
    }

    // Check whether both subjects exist
    const [first, second] = await Promise.all([
      Subject.findById(subject1),
      Subject.findById(subject2),
    ]);

    if (!first || !second) {
      return res.status(400).json({
        error: "Both subjects must exist in the database.",
      });
    }

    // Store conflicts in a consistent order
    const names = [first.name, second.name].sort();

    const existingConflict = await Conflict.findOne({
      subject1: names[0],
      subject2: names[1],
    });

    if (existingConflict) {
      return res.status(409).json({
        error: "This conflict already exists.",
      });
    }

    const conflict = await Conflict.create({
      subject1: names[0],
      subject2: names[1],
    });

    res.status(201).json(conflict);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ================================
// DELETE A CONFLICT
// ================================

app.delete("/api/conflicts/:id", async (req, res) => {
  try {
    const conflict = await Conflict.findByIdAndDelete(req.params.id);

    if (!conflict) {
      return res.status(404).json({
        error: "Conflict not found.",
      });
    }

    res.json({
      message: "Conflict deleted successfully.",
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ================================
// GENERATE TIMETABLE
// USING GREEDY GRAPH COLORING
// ================================

app.get("/api/timetable", async (req, res) => {
  try {
    const subjects = await Subject.find().sort({ name: 1 });
    const conflicts = await Conflict.find();

    // Store the period assigned to each subject
    const colors = {};

    // Assign periods using Greedy Graph Coloring
    for (const subject of subjects) {
      const unavailable = new Set();

      // Find periods used by conflicting subjects
      for (const conflict of conflicts) {
        if (
          conflict.subject1 === subject.name &&
          colors[conflict.subject2] !== undefined
        ) {
          unavailable.add(colors[conflict.subject2]);
        }

        if (
          conflict.subject2 === subject.name &&
          colors[conflict.subject1] !== undefined
        ) {
          unavailable.add(colors[conflict.subject1]);
        }
      }

      // Choose the smallest available period number
      let color = 0;

      while (unavailable.has(color)) {
        color++;
      }

      colors[subject.name] = color;
    }

    // Group subjects by their assigned periods
    const timetable = {};

    for (const subject of subjects) {
      const period = colors[subject.name] + 1;

      if (!timetable[period]) {
        timetable[period] = [];
      }

      timetable[period].push(subject.name);
    }

    res.json({
      timetable,
      totalSubjects: subjects.length,
      totalPeriods: Object.keys(timetable).length,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ================================
// START THE SERVER
// ================================

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});