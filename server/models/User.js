const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    name: String,
    colorTheme: String,
});

module.exports = mongoose.model('User', userSchema);
 
