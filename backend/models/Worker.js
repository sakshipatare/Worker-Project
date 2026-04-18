const mongoose = require('mongoose');

const WorkerSchema = new mongoose.Schema({
  worker_id: {
    type: String,
    required: true,
    unique: true
  },
  name: {
    type: String,
    required: true
  }
}, { timestamps: true });

module.exports = mongoose.model('Worker', WorkerSchema);
