const Worker = require('../models/Worker');
const Workstation = require('../models/Workstation');
const Event = require('../models/Event');

exports.getMetrics = async (req, res) => {
  try {
    const workers = await Worker.find({});
    const stations = await Workstation.find({});
    const events = await Event.find({}).sort({ timestamp: 1 });

    if (!events.length) {
      return res.status(200).json({ message: 'No events found to compute metrics.' });
    }

    // Min/Max Event Boundaries
    const minTimestamp = events[0].timestamp;
    const maxTimestamp = events[events.length - 1].timestamp;
    const totalTimeHours = (maxTimestamp - minTimestamp) / (1000 * 60 * 60) || 1;

    // Helper structures
    const workerMetrics = {};
    workers.forEach(w => {
      workerMetrics[w.worker_id] = {
        name: w.name,
        activeTimeMs: 0,
        idleTimeMs: 0,
        absentTimeMs: 0,
        totalUnits: 0,
        lastState: null,
        lastStateTime: minTimestamp
      };
    });

    const stationMetrics = {};
    stations.forEach(s => {
      stationMetrics[s.station_id] = {
        name: s.name,
        activeTimeMs: 0,
        idleTimeMs: 0,
        totalUnits: 0,
        lastState: null,
        lastStateTime: minTimestamp
      };
    });

    // Process all events sequentially
    events.forEach(ev => {
      const wId = ev.worker_id;
      const sId = ev.workstation_id;

      if (ev.event_type === 'product_count') {
        if (workerMetrics[wId]) workerMetrics[wId].totalUnits += (ev.count || 0);
        if (stationMetrics[sId]) stationMetrics[sId].totalUnits += (ev.count || 0);
      } else {
        // State change ('working', 'idle', 'absent')
        // Worker processing
        if (workerMetrics[wId]) {
          const w = workerMetrics[wId];
          const durationMs = ev.timestamp - w.lastStateTime;

          if (w.lastState === 'working') w.activeTimeMs += durationMs;
          else if (w.lastState === 'idle') w.idleTimeMs += durationMs;
          else if (w.lastState === 'absent') w.absentTimeMs += durationMs;

          w.lastState = ev.event_type;
          w.lastStateTime = ev.timestamp;
        }

        // Station processing (simplified assumption of 1 worker per station for occupancy)
        if (stationMetrics[sId]) {
          const s = stationMetrics[sId];
          const durationMs = ev.timestamp - s.lastStateTime;

          if (s.lastState === 'working') s.activeTimeMs += durationMs;
          else if (s.lastState === 'idle') s.idleTimeMs += durationMs;

          s.lastState = ev.event_type;
          s.lastStateTime = ev.timestamp;
        }
      }
    });

    // Close remaining durations up to maxTimestamp
    Object.values(workerMetrics).forEach(w => {
      if (w.lastStateTime < maxTimestamp) {
        const durationMs = maxTimestamp - w.lastStateTime;
        if (w.lastState === 'working') w.activeTimeMs += durationMs;
        else if (w.lastState === 'idle') w.idleTimeMs += durationMs;
        else if (w.lastState === 'absent') w.absentTimeMs += durationMs;
      }
    });

    Object.values(stationMetrics).forEach(s => {
      if (s.lastStateTime < maxTimestamp) {
        const durationMs = maxTimestamp - s.lastStateTime;
        if (s.lastState === 'working') s.activeTimeMs += durationMs;
        else if (s.lastState === 'idle') s.idleTimeMs += durationMs;
      }
    });

    // Formatting outputs & aggregates
    let factoryActiveTime = 0;
    let factoryIdleTime = 0;
    let factoryTotalUnits = 0;

    const formattedWorkers = Object.keys(workerMetrics).map(wId => {
      const m = workerMetrics[wId];
      const activeHrs = m.activeTimeMs / 3600000;
      const idleHrs = m.idleTimeMs / 3600000;
      const totalTrackedHrs = activeHrs + idleHrs; // exluding absent for utilization base
      const utilization = totalTrackedHrs > 0 ? (activeHrs / totalTrackedHrs) * 100 : 0;
      
      factoryActiveTime += m.activeTimeMs;
      factoryIdleTime += m.idleTimeMs;
      factoryTotalUnits += m.totalUnits;

      return {
        worker_id: wId,
        name: m.name,
        activeTimeHrs: activeHrs.toFixed(2),
        idleTimeHrs: idleHrs.toFixed(2),
        utilization: utilization.toFixed(2),
        totalUnits: m.totalUnits,
        unitsPerHour: activeHrs > 0 ? (m.totalUnits / activeHrs).toFixed(2) : 0
      };
    });

    const formattedStations = Object.keys(stationMetrics).map(sId => {
      const m = stationMetrics[sId];
      const activeHrs = m.activeTimeMs / 3600000;
      const idleHrs = m.idleTimeMs / 3600000;
      const occupancyHrs = activeHrs + idleHrs;
      const utilization = occupancyHrs > 0 ? (activeHrs / occupancyHrs) * 100 : 0;

      return {
        station_id: sId,
        name: m.name,
        occupancyHrs: occupancyHrs.toFixed(2),
        utilization: utilization.toFixed(2),
        totalUnits: m.totalUnits,
        throughputRate: occupancyHrs > 0 ? (m.totalUnits / occupancyHrs).toFixed(2) : 0
      };
    });

    const factoryMetrics = {
      totalProductiveTimeHrs: (factoryActiveTime / 3600000).toFixed(2),
      totalProductionCount: factoryTotalUnits,
      avgProductionRate: formattedWorkers.length > 0 ? (factoryTotalUnits / formattedWorkers.length).toFixed(2) : 0,
      avgUtilization: formattedWorkers.length > 0 ? 
        (formattedWorkers.reduce((acc, curr) => acc + parseFloat(curr.utilization), 0) / formattedWorkers.length).toFixed(2) : 0
    };

    res.status(200).json({
      timeframe: { minTimestamp, maxTimestamp, totalTimeHours: totalTimeHours.toFixed(2) },
      factory: factoryMetrics,
      workers: formattedWorkers,
      workstations: formattedStations
    });

  } catch (error) {
    console.error('Error computing metrics:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
