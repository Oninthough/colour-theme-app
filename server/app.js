// Load environment variables
require('dotenv').config();

// Load express and other modules
const express = require('express');
const app = express();
const mongoose = require('mongoose');

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
.then(() => console.log('MongoDB connected successfully'))
.catch(err => console.log('Failed to connect to MongoDB', err));

// Additional app setup (middleware, routes)
app.use(express.json());
// Define routes here or import them

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
