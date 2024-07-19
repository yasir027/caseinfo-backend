import express from "express";
import mysql from "mysql2"; // Update import to mysql2
import bodyParser from "body-parser";
import cors from "cors";
import bcrypt from "bcryptjs";

const app = express();
const port = process.env.PORT || 3000;

app.use(bodyParser.json());
app.use(cors());

const pool = mysql.createPool({
  connectionLimit: 10,
  host: "bxwsgdi0seyx0faktnjy-mysql.services.clever-cloud.com",
  user: "usm5qwq9bipe6qvc",
  password: "usm5qwq9bipe6qvc", // Replace with your MySQL password
  database: "bxwsgdi0seyx0faktnjy",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Function to query the database with promises
const queryPromise = (sql, params) => {
  return new Promise((resolve, reject) => {
    pool.query(sql, params, (err, result) => {
      if (err) {
        reject(err);
      } else {
        resolve(result);
      }
    });
  });
};


pool.getConnection((err, connection) => {
  if (err) {
    console.error("Error connecting to MySQL database:", err);
    return;
  }
  console.log("Connected to MySQL database");
  connection.release();
});

// Example endpoint
app.get('/', (req, res) => {
  res.send('Hello from Express with Railway MySQL!');
});

// Route to create a new user (signup)
app.post("/api/signup", async (req, res) => {
  const { email, password } = req.body;

  try {
    const hashedPassword = await bcrypt.hash(password, 10); // Hash password

    // Set role to 'user' by default
    const sql = `INSERT INTO users (email, password, role, access) VALUES (?, ?, ?, ?)`;
    const values = [email, hashedPassword, 'user', 'pending']; // Set role to 'user'

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
    const sql = `SELECT id, email, role, access, password FROM users WHERE email = ?`;
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
      res.status(200).json({
        message: "Login successful",
        role: user.role, // Send the role back to the frontend
        userId: user.id  // Include the user ID in the response
      });
    });
  } catch (error) {
    console.error('Error logging in:', error);
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

// POST route to promote user to admin and approve
app.post("/api/promoteUser/:userId", (req, res) => {
  const { userId } = req.params;
  const sql = "UPDATE users SET role = 'admin', access = IF(access != 'approved', 'approved', access) WHERE id = ?";
  
  pool.query(sql, [userId], (err, result) => {
    if (err) {
      console.error("Error promoting user to admin:", err);
      return res.status(500).send("Error promoting user to admin");
    }
    console.log(`User with ID ${userId} promoted to admin and access updated`);
    res.send("User promoted to admin and access updated successfully");
  });
});



// POST route to demote user to user
app.post("/api/demoteUser/:userId", (req, res) => {
  const { userId } = req.params;
  const sql = "UPDATE users SET role = 'user' WHERE id = ?";
  
  pool.query(sql, [userId], (err, result) => {
    if (err) {
      console.error("Error demoting user to user:", err);
      return res.status(500).send("Error demoting user to user");
    }
    console.log(`Admin with ID ${userId} demoted to user`);
    res.send("User demoted to user successfully");
  });
});


// POST route to approve user
app.post("/api/approveUser/:userId", (req, res) => {
  const { userId } = req.params;
  const sql = "UPDATE users SET access = 'approved' WHERE id = ?";
  
  pool.query(sql, [userId], (err, result) => {
    if (err) {
      console.error("Error approving user:", err);
      return res.status(500).send("Error approving user");
    }
    console.log(`User with ID ${userId} approved`);
    res.send("User approved successfully");
  });
});


// POST route to decline user access
app.post("/api/declineUser/:userId", (req, res) => {
  const { userId } = req.params;
  const sql = "UPDATE users SET access = 'declined' WHERE id = ?";
  
  pool.query(sql, [userId], (err, result) => {
    if (err) {
      console.error("Error declining user access:", err);
      return res.status(500).send("Error declining user access");
    }
    console.log(`Access declined for user with ID ${userId}`);
    res.send("User access declined successfully");
  });
});


// DELETE route to delete selected users
app.delete("/api/deleteUsers", (req, res) => {
  const { userIds } = req.body; // Array of user IDs to delete
  const sql = "DELETE FROM users WHERE id IN (?)";
  
  pool.query(sql, [userIds], (err, result) => {
    if (err) {
      console.error("Error deleting users:", err);
      return res.status(500).send("Error deleting users");
    }
    console.log(`Users with IDs ${userIds.join(", ")} deleted`);
    res.send("Users deleted successfully");
  });
});

//route to update email
app.post("/api/update-email", (req, res) => {
  const { userId, newEmail } = req.body; // Assuming userId is sent in the request body

  const sql = "UPDATE users SET email = ? WHERE id = ?";

  pool.query(sql, [newEmail, userId], (err, result) => {
    if (err) {
      console.error("Error updating email:", err);
      return res.status(500).send("Error updating email");
    }
    console.log(`Email updated for user with ID ${userId}`);
    res.send("Email updated successfully");
  });
});



//route to update
app.post('/api/update-password', async (req, res) => {
  const { userId, currentPassword, newPassword } = req.body;

  try {
    // Fetch user from database based on userId
    const getUserById = (userId) => {
      return new Promise((resolve, reject) => {
        const sql = "SELECT * FROM users WHERE id = ?";
        pool.query(sql, [userId], (err, results) => {
          if (err) {
            reject(err);
          } else {
            resolve(results[0]);
          }
        });
      });
    };

    // Update user password in the database
    const updateUserPassword = (userId, hashedPassword) => {
      return new Promise((resolve, reject) => {
        const sql = "UPDATE users SET password = ? WHERE id = ?";
        pool.query(sql, [hashedPassword, userId], (err, result) => {
          if (err) {
            reject(err);
          } else {
            resolve(result);
          }
        });
      });
    };

    // Fetch user from database
    const user = await getUserById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Compare current password with hashed password in database
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update user password
    await updateUserPassword(userId, hashedPassword);

    res.status(200).json({ message: 'Password updated successfully' });
  } catch (error) {
    console.error('Error updating password:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});



// Routes for 'ci' table

// POST route to add case info
app.post("/api/addCaseInfo", (req, res) => {
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
    currentUserEmail,
  } = req.body;

  const sql = `INSERT INTO ci (caseInfoState, caseInfoDOJ, caseInfoCaseType, caseInfoCaseNo, caseInfoCaseYear, caseInfoJudgeName, caseInfoPartyName, caseInfoCitation, caseInfoRemarks, caseInfoUser) 
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

  const values = [
    caseInfoState,
    caseInfoDOJ,
    caseInfoCaseType,
    caseInfoCaseNo,
    caseInfoCaseYear,
    caseInfoJudgeName,
    caseInfoPartyName,
    caseInfoCitation,
    caseInfoRemarks,
    currentUserEmail,
  ];

  pool.query(sql, values, (error, results) => {
    if (error) {
      console.error("Error inserting case info:", error);
      res.status(500).send("Error inserting case info: " + error.message);
    } else {
      console.log("Case info added successfully, result:", results);
      res.status(200).send("Case info added successfully");
    }
  });
});




// DELETE route to delete case info by caseInfoId
app.delete("/api/deleteCaseInfo/:caseInfoId", async (req, res) => {
  const { caseInfoId } = req.params;
  const { currentUserEmail } = req.body; // Retrieve currentUserEmail from request body

  // SQL queries
  const sqlSelect = "SELECT * FROM ci WHERE caseInfoId = ?";
  const sqlDelete = "DELETE FROM ci WHERE caseInfoId = ?";
  const sqlInsertLog = `
    INSERT INTO recycle_bin (
      caseInfoId, 
      caseInfoState, 
      caseInfoDOJ, 
      caseInfoCaseType, 
      caseInfoCaseNo, 
      caseInfoCaseYear, 
      caseInfoJudgeName, 
      caseInfoPartyName, 
      caseInfoCitation, 
      caseInfoUser, 
      caseInfoRemarks, 
      caseInfoDOE, 
      deletedBy
    ) 
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

  try {
    // Fetch the case info to be deleted
    const [caseInfo] = await queryPromise(sqlSelect, [caseInfoId]);

    if (!caseInfo) {
      return res.status(404).send("Case info not found");
    }

    // Extract values from caseInfo object
    const {
      caseInfoState,
      caseInfoDOJ,
      caseInfoCaseType,
      caseInfoCaseNo,
      caseInfoCaseYear,
      caseInfoJudgeName,
      caseInfoPartyName,
      caseInfoCitation,
      caseInfoUser,
      caseInfoRemarks,
      caseInfoDOE
    } = caseInfo;

    // Delete case info from ci table
    const deleteResult = await queryPromise(sqlDelete, [caseInfoId]);

    if (deleteResult.affectedRows === 0) {
      return res.status(404).send("Case info not found");
    }

    // Insert deleted case info into recycle_bin with deletedBy
    await queryPromise(sqlInsertLog, [
      caseInfoId,
      caseInfoState,
      caseInfoDOJ,
      caseInfoCaseType,
      caseInfoCaseNo,
      caseInfoCaseYear,
      caseInfoJudgeName,
      caseInfoPartyName,
      caseInfoCitation,
      caseInfoUser,
      caseInfoRemarks,
      caseInfoDOE,
      currentUserEmail
    ]);

    res.status(200).send("Case info deleted and logged successfully");
  } catch (error) {
    console.error("Error deleting case info:", error);
    res.status(500).send("Error deleting case info");
  }
});



// GET route to fetch case info with optional query parameters
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
    fromDate,
    toDate,
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
    sql += " AND caseInfoCaseNo = ?";
    values.push(caseInfoCaseNo);  // Exact match for case number
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
  if (fromDate && toDate) {
    sql += " AND caseInfoDOE BETWEEN ? AND ?";
    values.push(fromDate, toDate);
  } else if (fromDate) {
    sql += " AND caseInfoDOE >= ?";
    values.push(fromDate);
  } else if (toDate) {
    sql += " AND caseInfoDOE <= ?";
    values.push(toDate);
  }

  pool.query(sql, values, (err, results) => {
    if (err) {
      console.error("Error fetching case info:", err);
      return res.status(500).send("Error fetching case info");
    }
    res.send(results);
  });
});


//route to update caseinfo
app.put("/api/updateCaseInfo/:caseInfoId", (req, res) => {
  const { caseInfoId } = req.params;
  const caseInfoData = req.body; // Contains updated data from client

  // Remove caseInfoId from caseInfoData to prevent accidental update of caseInfoId
  delete caseInfoData.caseInfoId;

  // Ensure caseInfoDOE is a valid date or set it to NULL
  if (caseInfoData.caseInfoDOE) {
    const formattedDOE = formatDate(caseInfoData.caseInfoDOE);
    caseInfoData.caseInfoDOE = formattedDOE ? formattedDOE : null;
  } else {
    caseInfoData.caseInfoDOE = null;
  }

  // Include currentUserEmail as user in the update
  const { user } = caseInfoData;
  delete caseInfoData.user; // Remove from caseInfoData if it's being passed separately in the query

  const sql = `UPDATE ci 
               SET caseInfoState = ?, caseInfoDOJ = ?, caseInfoCaseType = ?, caseInfoCaseNo = ?, caseInfoCaseYear = ?, caseInfoJudgeName = ?, caseInfoPartyName = ?, caseInfoCitation = ?, caseInfoDOE = ?, caseInfoRemarks = ?, caseInfoUser = ?
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
    user, // This is the current user's email
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




//date format for update CI
export const formatDate = (dateString) => {
  const date = new Date(dateString);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

//route for CI dropdowns
app.get("/api/data", (req, res) => {
  let sql;
  if (req.query.distinct === "courts") {
    sql = "SELECT DISTINCT caseInfoState FROM ci ORDER BY caseInfoState ASC";
  } else if (req.query.distinct === "judgeNames") {
    sql = "SELECT DISTINCT caseInfoJudgeName FROM ci ORDER BY caseInfoJudgeName ASC";
  } else if (req.query.distinct === "caseTypes") {
    sql = "SELECT DISTINCT caseInfoCaseType FROM ci ORDER BY caseInfoCaseType ASC";
  } else if (req.query.distinct === "partyNames") {
    sql = "SELECT DISTINCT caseInfoPartyName FROM ci ORDER BY caseInfoPartyName ASC";
  } else if (req.query.distinct === "citations") {
    sql = "SELECT DISTINCT caseInfoCitation FROM ci ORDER BY caseInfoCitation ASC";
  } else if (req.query.distinct === "year") {
    sql = "SELECT DISTINCT caseInfoCaseYear FROM ci ORDER BY caseInfoCaseYear DESC";
  } else {
    sql = "SELECT * FROM ci ORDER BY caseInfoState ASC, caseInfoJudgeName ASC, caseInfoCaseType ASC, caseInfoPartyName ASC, caseInfoCitation ASC";
  }

  pool.query(sql, (err, results) => {
    if (err) {
      console.error("Error fetching data from 'ci' table:", err);
      return res.status(500).send("Error fetching data from 'ci' table");
    }
    res.send(results);
  });
});


// Routes for 'recycle_bin' table

// GET route to fetch specific columns from recycle_bin
app.get("/api/recycle_bin", (req, res) => {
  const sql = `
    SELECT
      caseInfoId,
      caseInfoState,
      caseInfoDOJ,
      caseInfoCaseType,
      caseInfoCaseNo,
      caseInfoCaseYear,
      caseInfoJudgeName,
      caseInfoPartyName,
      caseInfoCitation,
      caseInfoUser,
      caseInfoRemarks,
      caseInfoDOE,
      deletedAt,
      deletedBy
    FROM
      recycle_bin
  `;

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
  const sqlInsert = `
    INSERT INTO ci (
      caseInfoId, caseInfoState, caseInfoDOJ, caseInfoCaseType, caseInfoCaseNo,
      caseInfoCaseYear, caseInfoJudgeName, caseInfoPartyName, caseInfoCitation,
      caseInfoRemarks, caseInfoUser, caseInfoDOE
    ) 
    SELECT 
      caseInfoId, caseInfoState, caseInfoDOJ, caseInfoCaseType, caseInfoCaseNo,
      caseInfoCaseYear, caseInfoJudgeName, caseInfoPartyName, caseInfoCitation,
      caseInfoRemarks, caseInfoUser, NOW() 
    FROM recycle_bin 
    WHERE caseInfoId = ?`;
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

// Route to empty recycle bin (delete all entries)
app.delete('/api/recycle_bin/empty', (req, res) => {
  pool.query('DELETE FROM recycle_bin', (error, results) => {
    if (error) {
      console.error('Error emptying recycle bin:', error);
      res.status(500).send('Error emptying recycle bin');
    } else {
      res.status(200).send('Recycle bin emptied successfully');
    }
  });
});

// Start the server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
