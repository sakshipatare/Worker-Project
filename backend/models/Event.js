const mongoose = require('mongoose');

const EventSchema = new mongoose.Schema({
  timestamp: {
    type: Date,
    required: true,
    index: true
  },
  worker_id: {
    type: String,
    required: true,
    index: true
  },
  workstation_id: {
    type: String,
    required: true,
    index: true
  },
  event_type: {
    type: String, // 'working', 'idle', 'absent', 'product_count'
    required: true
  },
  confidence: {
    type: Number,
    default: 1.0
  },
  count: {
    type: Number,
    default: 0
  }
}, { timestamps: true });

// Optional: create a compound index for calculating timelines quickly
EventSchema.index({ worker_id: 1, timestamp: 1 });

module.exports = mongoose.model('Event', EventSchema);
