const Worker = require('../models/Worker');
const Workstation = require('../models/Workstation');
const Event = require('../models/Event');

const DUMMY_WORKERS = [
  { worker_id: 'W1', name: 'Alice Smith' },
  { worker_id: 'W2', name: 'Bob Johnson' },
  { worker_id: 'W3', name: 'Charlie Dave' },
  { worker_id: 'W4', name: 'Diana Prince' },
  { worker_id: 'W5', name: 'Evan Wright' },
  { worker_id: 'W6', name: 'Fiona Gallagher' }
];

const DUMMY_STATIONS = [
  { station_id: 'S1', name: 'Assembly Line A' },
  { station_id: 'S2', name: 'Assembly Line B' },
  { station_id: 'S3', name: 'Quality Check 1' },
  { station_id: 'S4', name: 'Packaging 1' },
  { station_id: 'S5', name: 'Welding Station' },
  { station_id: 'S6', name: 'CNC Machine' }
];

exports.seedData = async (req, res) => {
  try {
    // Clear existing data
    await Worker.deleteMany({});
    await Workstation.deleteMany({});
    await Event.deleteMany({});

    // Seed workers and workstations
    await Worker.insertMany(DUMMY_WORKERS);
    await Workstation.insertMany(DUMMY_STATIONS);

    // Generate dummy events
    const events = [];
    // Assume an 8-hour shift starting at 8:00 AM today
    // But let's use fixed timestamps to ensure consistency in tests
    const baseDate = new Date('2026-04-18T08:00:00Z');
    
    // For each worker, we simulate an 8 hour block (28800 seconds)
    // We will step through the timeline and add events
    for (let i = 0; i < DUMMY_WORKERS.length; i++) {
      const worker = DUMMY_WORKERS[i];
      const station = DUMMY_STATIONS[i]; // 1-to-1 mapping for simplicity
      
      let currentTime = new Date(baseDate);
      
      // Initial state
      events.push({
        timestamp: new Date(currentTime),
        worker_id: worker.worker_id,
        workstation_id: station.station_id,
        event_type: 'working',
        confidence: 0.95
      });

      // Advance by random minutes and switch state or produce count
      for (let j = 0; j < 20; j++) {
        // Advance 10-30 minutes
        const advanceMinutes = Math.floor(Math.random() * 20) + 10;
        currentTime = new Date(currentTime.getTime() + advanceMinutes * 60000);
        
        if (currentTime.getTime() > baseDate.getTime() + 8 * 60 * 60 * 1000) {
          break; // Don't exceed 8 hours
        }

        const rand = Math.random();
        if (rand < 0.6) {
          // Produce some items while working
          events.push({
            timestamp: new Date(currentTime),
            worker_id: worker.worker_id,
            workstation_id: station.station_id,
            event_type: 'product_count',
            confidence: 0.9,
            count: Math.floor(Math.random() * 5) + 1
          });
        } else if (rand < 0.8) {
          // Go idle
          events.push({
            timestamp: new Date(currentTime),
            worker_id: worker.worker_id,
            workstation_id: station.station_id,
            event_type: 'idle',
            confidence: 0.85
          });
          // And wait a bit to go back to working
          const idleMinutes = Math.floor(Math.random() * 5) + 2;
          currentTime = new Date(currentTime.getTime() + idleMinutes * 60000);
          events.push({
            timestamp: new Date(currentTime),
            worker_id: worker.worker_id,
            workstation_id: station.station_id,
            event_type: 'working',
            confidence: 0.98
          });
        } else {
          // Go absent
          events.push({
            timestamp: new Date(currentTime),
            worker_id: worker.worker_id,
            workstation_id: station.station_id,
            event_type: 'absent',
            confidence: 0.99
          });
          const absentMinutes = Math.floor(Math.random() * 10) + 5;
          currentTime = new Date(currentTime.getTime() + absentMinutes * 60000);
          events.push({
            timestamp: new Date(currentTime),
            worker_id: worker.worker_id,
            workstation_id: station.station_id,
            event_type: 'working',
            confidence: 0.98
          });
        }
      }

      // End of shift idle event to close out the working duration nicely
      const endShiftTime = new Date(baseDate.getTime() + 8 * 60 * 60 * 1000);
      events.push({
        timestamp: new Date(endShiftTime),
        worker_id: worker.worker_id,
        workstation_id: station.station_id,
        event_type: 'absent', // Marks the end of tracking
        confidence: 1.0
      });
    }

    await Event.insertMany(events);

    res.status(200).json({ message: 'Database seeded successfully', eventsSeeded: events.length });
  } catch (error) {
    console.error('Error seeding data:', error);
    res.status(500).json({ error: 'Internal server error while seeding' });
  }
};
