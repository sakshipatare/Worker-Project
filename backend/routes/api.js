const express = require('express');
const router = express.Router();
const eventsController = require('../controllers/eventsController');
const seedController = require('../controllers/seedController');
const metricsController = require('../controllers/metricsController');

// Seed test data
router.post('/seed', seedController.seedData);

// Ingest events
router.post('/events', eventsController.ingestEvent);

// Get metrics
router.get('/metrics', metricsController.getMetrics);

module.exports = router;
