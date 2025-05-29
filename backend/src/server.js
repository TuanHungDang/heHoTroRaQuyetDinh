// Load environment variables from .env file
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const connection = require('./config/database');
const { authenticateToken } = require('./middleware/authMiddleware');

const authRoute = require('./routes/authRoute');
const ahpRoute = require('./routes/ahpRoute');
// Initialize Express app and set port
const app = express();
const port = process.env.PORT || 8888;

// CORS configuration for frontend access
const corsOptions = {
  origin: 'http://localhost:5173',  // Replace with your actual frontend domain
  methods: 'GET,POST,PUT,DELETE',
  allowedHeaders: 'Content-Type,Authorization',
};

// Middleware for parsing JSON and URL-encoded bodies
app.use(express.json());
app.use(express.urlencoded({extended: true}));

// Enable CORS with specified options
app.use(cors(corsOptions));

app.use('/v1/api/', authRoute);
app.use('/v1/api/', ahpRoute);


// Self-executing async function to connect to DB and start server
(async () => {
    try {
        // Initialize MongoDB connection
        await connection();

        // Start the server
        app.listen(port, () => {
            console.log(`Backend Nodejs App listening on port ${port}`)
        })
    } catch (error) {
        console.log(">>> Error connect to DB: ", error)
    }
})();
