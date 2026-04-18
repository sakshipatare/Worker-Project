const Event = require('../models/Event');

exports.ingestEvent = async (req, res) => {
  try {
    const data = req.body;
    let eventsToSave = [];

    if (Array.isArray(data)) {
      eventsToSave = data;
    } else {
      eventsToSave = [data];
    }

    // Basic validation
    const validEvents = eventsToSave.filter(e => 
      e.timestamp && e.worker_id && e.workstation_id && e.event_type
    );

    if (validEvents.length === 0) {
      return res.status(400).json({ error: 'No valid events provided' });
    }

    await Event.insertMany(validEvents);

    res.status(201).json({ message: 'Events ingested successfully', count: validEvents.length });
  } catch (error) {
    console.error('Error ingesting event:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
