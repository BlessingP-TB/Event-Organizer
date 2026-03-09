// config/multer.config.js (or similar)
const multer = require('multer');
const path = require('path');

// Configure storage for multer (you might want to use a cloud service)
const storage = multer.memoryStorage(); // Stores files in memory as buffers
// const storage = multer.diskStorage({
//   destination: function (req, file, cb) {
//     cb(null, 'uploads/venues/') // Ensure this directory exists
//   },
//   filename: function (req, file, cb) {
//     cb(null, Date.now() + '-' + file.originalname)
//   }
// })

const upload = multer({ storage: storage });

module.exports = upload;