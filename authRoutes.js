// authRoutes.js

const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const router = express.Router();
const pool = require('./your_mysql_pool'); // Replace with your MySQL pool instance

// Sign up route
router.post('/signup', async (req, res) => {
  const { email, password } = req.body;

  try {
    const hashedPassword = await bcrypt.hash(password, 10); // Hash password

    const sql = `INSERT INTO users (email, password) VALUES (?, ?)`;
    const values = [email, hashedPassword];

    pool.query(sql, values, (err, result) => {
      if (err) {
        console.error("Error creating user:", err);
        return res.status(500).send("Error creating user");
      }
      console.log("User created successfully, result:", result);
      res.status(200).json("User created successfully"); // Send JSON response
    });
  } catch (error) {
    console.error("Error hashing password:", error);
    res.status(500).send("Error hashing password");
  }
});

// Login route
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const sql = `SELECT * FROM users WHERE email = ?`;
    pool.query(sql, [email], async (err, results) => {
      if (err) {
        console.error("Error fetching user:", err);
        return res.status(500).send("Error fetching user");
      }
      if (results.length === 0) {
        return res.status(404).send("User not found");
      }

      const user = results[0];
      const isPasswordMatch = await bcrypt.compare(password, user.password);

      if (!isPasswordMatch) {
        return res.status(401).send("Incorrect password");
      }

      // Create and sign JWT token
      const token = jwt.sign({ id: user.id, email: user.email }, 'your_secret_key', { expiresIn: '1h' });
      res.status(200).json({ token }); // Send token as JSON response
    });
  } catch (error) {
    console.error("Error logging in:", error);
    res.status(500).send("Error logging in");
  }
});

// Route to get current user
router.get('/current-user', authMiddleware, (req, res) => {
  // req.user is populated by the authMiddleware
  res.status(200).json({ email: req.user.email }); // Send current user's email as JSON response
});

module.exports = router;
