import { useState, useEffect } from 'react';
import axios from 'axios';
import './index.css';

// Using standard vite env matching Render deploy strategy (if VITE_API_URL isn't set, default to same host or localhost)
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

function App() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isSeeding, setIsSeeding] = useState(false);
  const [workerFilter, setWorkerFilter] = useState('');
  const [stationFilter, setStationFilter] = useState('');
  const [selectedWorkerId, setSelectedWorkerId] = useState(null);
  const [selectedStationId, setSelectedStationId] = useState(null);

  const fetchMetrics = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await axios.get(`${API_URL}/metrics`);
      if (res.data.message) {
        // Handle empty but successful case
        setData({ isEmpty: true, message: res.data.message });
      } else {
        setData(res.data);
      }
    } catch (err) {
      console.error(err);
      setError('Failed to fetch metrics data. Is the backend running?');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, []);

  const handleSeed = async () => {
    try {
      setIsSeeding(true);
      setError(null);
      await axios.post(`${API_URL}/seed`);
      await fetchMetrics();
    } catch (err) {
      console.error(err);
      setError('Failed to seed data. Is the backend running?');
    } finally {
      setIsSeeding(false);
    }
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading AI Intelligence Metrics...</p>
      </div>
    );
  }

  const getUtilBadge = (util) => {
    const u = parseFloat(util);
    if (u > 80) return <span className="badge badge-high">{util}%</span>;
    if (u > 50) return <span className="badge badge-mid">{util}%</span>;
    return <span className="badge badge-low">{util}%</span>;
  };

  const filteredWorkers = data?.workers?.filter(w => 
    w.name.toLowerCase().includes(workerFilter.toLowerCase()) || 
    w.worker_id.toLowerCase().includes(workerFilter.toLowerCase())
  );

  const filteredStations = data?.workstations?.filter(s => 
    s.name.toLowerCase().includes(stationFilter.toLowerCase()) || 
    s.station_id.toLowerCase().includes(stationFilter.toLowerCase())
  );

  const selectedWorker = data?.workers?.find(w => w.worker_id === selectedWorkerId);
  const selectedStation = data?.workstations?.find(s => s.station_id === selectedStationId);

  return (
    <div className="dashboard-layout">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1 style={{ marginBottom: 0 }}>Factory AI Dashboard</h1>
        <div className="controls-bar" style={{ marginBottom: 0 }}>
          <button className="btn btn-primary" onClick={handleSeed} disabled={isSeeding}>
            {isSeeding ? 'Genereting...' : 'Refresh Mock Data'}
          </button>
          <button className="btn" onClick={fetchMetrics}>
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="glass-container" style={{ border: '1px solid #F44336', marginBottom: '2rem' }}>
          <p style={{ color: '#F44336' }}>{error}</p>
        </div>
      )}

      {data?.isEmpty ? (
        <div className="glass-container" style={{ textAlign: 'center', padding: '4rem' }}>
          <h2>No Data Discovered</h2>
          <p>Please use "Refresh Mock Data" to populate the database with events.</p>
        </div>
      ) : data ? (
        <>
          <h2 style={{ paddingLeft: '10px' }}>Factory Overview</h2>
          <div className="factory-summary">
            <div className="glass-container metric-card">
              <span className="metric-title">Avg Utilization</span>
              <span className="metric-value">{getUtilBadge(data.factory.avgUtilization)}</span>
            </div>
            <div className="glass-container metric-card">
              <span className="metric-title">Factory Total Units</span>
              <span className="metric-value">{data.factory.totalProductionCount}</span>
            </div>
            <div className="glass-container metric-card">
              <span className="metric-title">Productive Tracking</span>
              <span className="metric-value">{data.factory.totalProductiveTimeHrs} <span style={{fontSize: '1rem', color: 'var(--text-muted)'}}>hrs</span></span>
            </div>
            <div className="glass-container metric-card">
              <span className="metric-title">Timeframe Captured</span>
              <span className="metric-value">{data.timeframe.totalTimeHours} <span style={{fontSize: '1rem', color: 'var(--text-muted)'}}>hrs</span></span>
            </div>
          </div>

          {(selectedWorker || selectedStation) && (
            <div className="glass-container" style={{ marginBottom: '2rem', border: '1px solid var(--accent-color)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <h2>Selection Insight: {selectedWorker ? selectedWorker.name : selectedStation.name}</h2>
                  <p>
                    {selectedWorker ? (
                      `Worker ${selectedWorker.worker_id} is operating at ${selectedWorker.utilization}% utilization with a productivity of ${selectedWorker.unitsPerHour} units/hr.`
                    ) : (
                      `Station ${selectedStation.station_id} has an occupancy utilization of ${selectedStation.utilization}% with a throughput of ${selectedStation.throughputRate} units/hr.`
                    )}
                  </p>
                </div>
                <button className="btn" onClick={() => { setSelectedWorkerId(null); setSelectedStationId(null); }}>Close Details</button>
              </div>
            </div>
          )}

          <div className="tables-grid">
            <div className="glass-container">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h2 style={{ marginBottom: 0 }}>Workers ({filteredWorkers?.length || 0})</h2>
                <input 
                  type="text" 
                  placeholder="Filter Workers..." 
                  className="filter-input"
                  value={workerFilter}
                  onChange={(e) => setWorkerFilter(e.target.value)}
                />
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Name / ID</th>
                      <th>Active Hrs</th>
                      <th>Units Prod</th>
                      <th>UPH</th>
                      <th>Util %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredWorkers && filteredWorkers.map(w => (
                      <tr 
                        key={w.worker_id} 
                        onClick={() => { setSelectedWorkerId(w.worker_id); setSelectedStationId(null); }}
                        style={{ backgroundColor: selectedWorkerId === w.worker_id ? 'rgba(102, 252, 241, 0.1)' : 'transparent' }}
                      >
                        <td>
                          <div style={{fontWeight: '600'}}>{w.name}</div>
                          <div style={{fontSize: '0.8rem', color: 'var(--text-muted)'}}>{w.worker_id}</div>
                        </td>
                        <td>{w.activeTimeHrs}</td>
                        <td>{w.totalUnits}</td>
                        <td>{w.unitsPerHour}</td>
                        <td>{getUtilBadge(w.utilization)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="glass-container">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h2 style={{ marginBottom: 0 }}>Workstations ({filteredStations?.length || 0})</h2>
                <input 
                  type="text" 
                  placeholder="Filter Stations..." 
                  className="filter-input"
                  value={stationFilter}
                  onChange={(e) => setStationFilter(e.target.value)}
                />
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Station / ID</th>
                      <th>Occu Hrs</th>
                      <th>Units Prod</th>
                      <th>Throughput</th>
                      <th>Occu Util %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStations && filteredStations.map(s => (
                      <tr 
                        key={s.station_id}
                        onClick={() => { setSelectedStationId(s.station_id); setSelectedWorkerId(null); }}
                        style={{ backgroundColor: selectedStationId === s.station_id ? 'rgba(102, 252, 241, 0.1)' : 'transparent' }}
                      >
                        <td>
                          <div style={{fontWeight: '600'}}>{s.name}</div>
                          <div style={{fontSize: '0.8rem', color: 'var(--text-muted)'}}>{s.station_id}</div>
                        </td>
                        <td>{s.occupancyHrs}</td>
                        <td>{s.totalUnits}</td>
                        <td>{s.throughputRate}</td>
                        <td>{getUtilBadge(s.utilization)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}

export default App;
