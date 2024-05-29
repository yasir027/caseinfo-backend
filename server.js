import express from "express";
import mysql from "mysql2"; // Update import to mysql2
import bodyParser from "body-parser";
import cors from "cors";
import bcrypt from "bcryptjs";
import dotenv from "dotenv"; // Import dotenv for managing environment variables

dotenv.config(); // Load environment variables from .env file

const app = express();
const port = process.env.PORT || 3000;

app.use(bodyParser.json());
app.use(cors());

export const formatDate = (dateString) => {
  const date = new Date(dateString);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Replace with your Railway MySQL URL
const mysqlUrl = process.env.MYSQL_URL; // Retrieve MySQL URL from environment variables

const pool = mysql.createPool({
  connectionLimit: 10,
  host: process.env.MYSQLHOST,
  user: process.env.MYSQLUSER,
  password: process.env.MYSQLPASSWORD,
  database: process.env.MYSQL_DATABASE,
  port: process.env.MYSQLPORT,
  connectTimeout: 20000, // Increase timeout to 20 seconds (in milliseconds)
  acquireTimeout: 20000 // Increase acquire timeout to 20 seconds (in milliseconds)
});

// Testing the connection
pool.getConnection((err, connection) => {
  if (err) {
    console.error('Error connecting to Railway MySQL database:', err.stack);
    return;
  }
  console.log('Connected to Railway MySQL database as id', connection.threadId);
  connection.release(); // Release the connection
});

// Example endpoint
app.get('/', (req, res) => {
  res.send('Hello from Express with Railway MySQL!');
});

// Route to create a new user (signup)
app.post("/api/signup", async (req, res) => {
  const { email, password, role } = req.body;

  try {
    const hashedPassword = await bcrypt.hash(password, 10); // Hash password

    const sql = `INSERT INTO users (email, password, role, access) VALUES (?, ?, ?, ?)`;
    const values = [email, hashedPassword, role, 'pending']; // Set access to 'Pending'

    pool.query(sql, values, (err, result) => {
      if (err) {
        console.error("Error creating user:", err);
        return res.status(500).send("Error creating user");
      }
      console.log("User created successfully, result:", result);

      res.status(200).json("User created successfully"); // Send JSON response for other users
    });
  } catch (error) {
    console.error("Error hashing password:", error);
    res.status(500).send("Error hashing password");
  }
});



// Route to authenticate user (login)
app.post("/api/login", async (req, res) => {
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

      if (user.access === 'declined' || user.access === 'pending') {
        return res.status(403).send("Access denied");
      }

      // Successful login
      res.status(200).send("Login successful");
    });
  } catch (error) {
    console.error('User Declined', error);
    res.status(500).send('Error logging in, Contact Admin');
  }
});


//fetch Users data
app.get("/api/users", (req, res) => {
  const sql = "SELECT id, email, role, access FROM users"; // Adjust as necessary

  pool.query(sql, (err, results) => {
    if (err) {
      console.error("Error fetching users:", err);
      return res.status(500).send("Error fetching users");
    }
    res.send(results); // Send the fetched user data as JSON response
  });
});


// Routes for 'ci' table

// POST route to add case info
app.post("/api/addCaseInfo", (req, res) => {
  const caseInfo = req.body;

  const sql = `INSERT INTO ci (caseInfoState, caseInfoDOJ, caseInfoCaseType, caseInfoCaseNo, caseInfoCaseYear, caseInfoJudgeName, caseInfoPartyName, caseInfoCitation, caseInfoRemarks) 
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;

  const values = [
    caseInfo.caseInfoState,
    caseInfo.caseInfoDOJ,
    caseInfo.caseInfoCaseType,
    caseInfo.caseInfoCaseNo,
    caseInfo.caseInfoCaseYear,
    caseInfo.caseInfoJudgeName,
    caseInfo.caseInfoPartyName,
    caseInfo.caseInfoCitation,
    caseInfo.caseInfoRemarks,
  ];

  pool.query(sql, values, (err, result) => {
    if (err) {
      console.error("Error inserting case info:", err);
      return res.status(500).send("Error inserting case info");
    }
    console.log("Case info added successfully, result:", result);
    res.send("Case info added successfully");
  });
});

// DELETE route to delete case info by caseInfoId
app.delete("/api/deleteCaseInfo/:caseInfoId", (req, res) => {
  const { caseInfoId } = req.params;
  const sql = "DELETE FROM ci WHERE caseInfoId = ?";

  pool.query(sql, [caseInfoId], (err, result) => {
    if (err) {
      console.error("Error deleting case info:", err);
      return res.status(500).send("Error deleting case info");
    }
    if (result.affectedRows === 0) {
      return res.status(404).send("Case info not found");
    }
    res.send("Case info deleted successfully");
  });
});

// GET route to fetch filtered case info
// GET route to fetch filtered case info
app.get("/api/caseInfo", (req, res) => {
  const {
    caseInfoState,
    caseInfoDOJ,
    caseInfoCaseType,
    caseInfoCaseNo,
    caseInfoCaseYear,
    caseInfoJudgeName,
    caseInfoPartyName,
    caseInfoCitation,
    caseInfoRemarks,
  } = req.query;

  let sql = "SELECT * FROM ci WHERE 1=1";
  let values = [];

  if (caseInfoState) {
    sql += " AND caseInfoState LIKE ?";
    values.push(`%${caseInfoState}%`);
  }
  if (caseInfoDOJ) {
    sql += " AND caseInfoDOJ LIKE ?";
    values.push(`%${caseInfoDOJ}%`);
  }
  if (caseInfoCaseType) {
    sql += " AND caseInfoCaseType LIKE ?";
    values.push(`%${caseInfoCaseType}%`);
  }
  if (caseInfoCaseNo) {
    sql += " AND caseInfoCaseNo LIKE ?";
    values.push(`%${caseInfoCaseNo}%`);
  }
  if (caseInfoCaseYear) {
    sql += " AND caseInfoCaseYear LIKE ?";
    values.push(`%${caseInfoCaseYear}%`);
  }
  if (caseInfoJudgeName) {
    sql += " AND caseInfoJudgeName LIKE ?";
    values.push(`%${caseInfoJudgeName}%`);
  }
  if (caseInfoPartyName) {
    sql += " AND caseInfoPartyName LIKE ?";
    values.push(`%${caseInfoPartyName}%`);
  }
  if (caseInfoCitation) {
    sql += " AND caseInfoCitation LIKE ?";
    values.push(`%${caseInfoCitation}%`);
  }
  if (caseInfoRemarks) {
    sql += " AND caseInfoRemarks LIKE ?";
    values.push(`%${caseInfoRemarks}%`);
  }

  pool.query(sql, values, (err, results) => {
    if (err) {
      console.error("Error fetching case info:", err);
      return res.status(500).send("Error fetching case info");
    }
    res.send(results);
  });
});


// PUT route to update case info by caseInfoId
app.put("/api/updateCaseInfo/:caseInfoId", (req, res) => {
  const { caseInfoId } = req.params;
  const caseInfoData = req.body; // Contains updated data from client

  // Remove caseInfoId from caseInfoData to prevent accidental update of caseInfoId
  delete caseInfoData.caseInfoId;

  // Format date if caseInfoDOE exists in caseInfoData
  if (caseInfoData.caseInfoDOE) {
    caseInfoData.caseInfoDOE = formatDate(caseInfoData.caseInfoDOE);
  }

  const sql = `UPDATE ci 
               SET caseInfoState = ?, caseInfoDOJ = ?, caseInfoCaseType = ?, caseInfoCaseNo = ?, caseInfoCaseYear = ?, caseInfoJudgeName = ?, caseInfoPartyName = ?, caseInfoCitation = ?, caseInfoDOE = ?, caseInfoRemarks = ?
               WHERE caseInfoId = ?`;

  const values = [
    caseInfoData.caseInfoState,
    caseInfoData.caseInfoDOJ,
    caseInfoData.caseInfoCaseType,
    caseInfoData.caseInfoCaseNo,
    caseInfoData.caseInfoCaseYear,
    caseInfoData.caseInfoJudgeName,
    caseInfoData.caseInfoPartyName,
    caseInfoData.caseInfoCitation,
    caseInfoData.caseInfoDOE,
    caseInfoData.caseInfoRemarks,
    caseInfoId,
  ];

  pool.query(sql, values, (err, result) => {
    if (err) {
      console.error("Error updating case info:", err);
      return res.status(500).send("Error updating case info");
    }
    if (result.affectedRows === 0) {
      return res.status(404).send("Case info not found");
    }
    console.log("Case info updated successfully, result:", result);
    res.send("Case info updated successfully");
  });
});
// Routes for 'recycle_bin' table

// GET route to fetch all records from recycle_bin
app.get("/api/recycle_bin", (req, res) => {
  const sql = "SELECT * FROM recycle_bin";

  pool.query(sql, (err, results) => {
    if (err) {
      console.error("Error fetching recycle bin records:", err);
      return res.status(500).send("Error fetching recycle bin records");
    }
    res.send(results);
  });
});

// POST route to restore record from recycle_bin to ci
app.post("/api/recycle_bin/restore/:caseInfoId", (req, res) => {
  const { caseInfoId } = req.params;
  const sqlSelect = "SELECT * FROM recycle_bin WHERE caseInfoId = ?";
  const sqlInsert = `INSERT INTO ci (caseInfoId, caseInfoState, caseInfoDOJ, caseInfoCaseType, caseInfoCaseNo, caseInfoCaseYear, caseInfoJudgeName, caseInfoPartyName, caseInfoCitation, caseInfoRemarks, caseInfoDOE) 
                     SELECT caseInfoId, caseInfoState, caseInfoDOJ, caseInfoCaseType, caseInfoCaseNo, caseInfoCaseYear, caseInfoJudgeName, caseInfoPartyName, caseInfoCitation, caseInfoRemarks, NOW() FROM recycle_bin WHERE caseInfoId = ?`;
  const sqlDelete = "DELETE FROM recycle_bin WHERE caseInfoId = ?";

  pool.query(sqlSelect, [caseInfoId], (err, results) => {
    if (err) {
      console.error("Error fetching record from recycle bin:", err);
      return res.status(500).send("Error fetching record from recycle bin");
    }
    if (results.length === 0) {
      return res.status(404).send("Record not found in recycle bin");
    }

    const recordToRestore = results[0];

    pool.query(sqlInsert, [caseInfoId], (err, result) => {
      if (err) {
        console.error("Error restoring record:", err);
        return res.status(500).send("Error restoring record");
      }

      pool.query(sqlDelete, [caseInfoId], (err, result) => {
        if (err) {
          console.error("Error deleting record from recycle bin:", err);
          return res.status(500).send("Error deleting record from recycle bin");
        }
        res.send("Record restored successfully");
      });
    });
  });
});

// DELETE route to delete record permanently from recycle_bin
app.delete("/api/recycle_bin/delete/:caseInfoId", (req, res) => {
  const { caseInfoId } = req.params;
  const sql = "DELETE FROM recycle_bin WHERE caseInfoId = ?";

  pool.query(sql, [caseInfoId], (err, result) => {
    if (err) {
      console.error("Error deleting record from recycle bin:", err);
      return res.status(500).send("Error deleting record from recycle bin");
    }
    if (result.affectedRows === 0) {
      return res.status(404).send("Record not found in recycle bin");
    }
    res.send("Record deleted permanently from recycle bin");
  });
});

// Start the server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});