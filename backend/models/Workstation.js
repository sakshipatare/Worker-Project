const mongoose = require('mongoose');

const WorkstationSchema = new mongoose.Schema({
  station_id: {
    type: String,
    required: true,
    unique: true
  },
  name: {
    type: String,
    required: true
  }
}, { timestamps: true });

module.exports = mongoose.model('Workstation', WorkstationSchema);
