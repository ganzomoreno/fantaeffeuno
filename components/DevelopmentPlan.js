import React, { useState, useEffect } from 'react';

const PLAN_TASKS = {
  HOME: [
    { id: 'home-kpi', label: 'Section A: Hero KPI (3 cards)' },
    { id: 'home-race-readiness', label: 'Section B: Race Readiness' },
    { id: 'home-trend', label: 'Section C: Trend (ultime 5 gare)' },
    { id: 'home-last-race', label: 'Section D: Ultima gara recap' },
    { id: 'home-header', label: 'Header sticky + team info' },
  ],
  GARA: [
    { id: 'gara-controls', label: 'Top controls: Race selector + pills' },
    { id: 'gara-leaderboard', label: '2A: Leaderboard table (squadre)' },
    { id: 'gara-team-drawer', label: '2A: Team detail drawer' },
    { id: 'gara-rules-modal', label: '2A: Rules modal (Come si calcola?)' },
    { id: 'gara-pilots-view', label: '2B: Vista Piloti (optional)' },
    { id: 'gara-driver-drawer', label: '2B: Driver detail drawer' },
  ],
  SCUDERIA: [
    { id: 'scuderia-header', label: 'Header: nome + switch + stato' },
    { id: 'scuderia-lineup', label: '3A: Lineup Builder (3 slot + panchina)' },
    { id: 'scuderia-validations', label: '3A: Validazioni UX + toast' },
    { id: 'scuderia-drivers-list', label: '3B: Driver cards (rosa)' },
    { id: 'scuderia-driver-detail', label: '3B: Driver detail drawer' },
  ],
  CALENDARIO: [
    { id: 'calendario-layout', label: 'Toggle: Gare / Aste / Tutto' },
    { id: 'calendario-list', label: 'Lista cronologica con badge' },
    { id: 'calendario-details', label: 'Dettagli evento (sheet)' },
  ],
  COMPONENTS: [
    { id: 'comp-appshell', label: 'AppShell (Header + Nav)' },
    { id: 'comp-kpi-tile', label: 'KpiTile' },
    { id: 'comp-status-pill', label: 'StatusPill' },
    { id: 'comp-race-selector', label: 'RaceSelector' },
    { id: 'comp-leaderboard-table', label: 'LeaderboardTable' },
    { id: 'comp-team-drawer', label: 'TeamDetailDrawer' },
    { id: 'comp-driver-card', label: 'DriverCard' },
    { id: 'comp-driver-drawer', label: 'DriverDetailDrawer' },
    { id: 'comp-lineup-builder', label: 'LineupBuilder' },
    { id: 'comp-calendar-list', label: 'CalendarList' },
    { id: 'comp-rules-modal', label: 'RulesModal' },
    { id: 'comp-toast', label: 'ToastSystem' },
  ],
};

export default function DevelopmentPlan() {
  const [completed, setCompleted] = useState({});
  const [showPlan, setShowPlan] = useState(false);
  const [toast, setToast] = useState(null);

  // Load da localStorage
  useEffect(() => {
    const saved = localStorage.getItem('ff1_dev_plan');
    if (saved) setCompleted(JSON.parse(saved));
  }, []);

  // Save a localStorage
  const handleToggle = (taskId) => {
    const updated = { ...completed, [taskId]: !completed[taskId] };
    setCompleted(updated);
    localStorage.setItem('ff1_dev_plan', JSON.stringify(updated));

    // Toast feedback
    if (!completed[taskId]) {
      setToast(`✅ Task completato!`);
      setTimeout(() => setToast(null), 2000);
    }
  };

  // Calcola progress per sezione
  const getProgress = (section) => {
    const tasks = PLAN_TASKS[section];
    const completedCount = tasks.filter(t => completed[t.id]).length;
    return Math.round((completedCount / tasks.length) * 100);
  };

  // Calcola progress totale
  const totalTasks = Object.values(PLAN_TASKS).flat().length;
  const totalCompleted = Object.values(completed).filter(Boolean).length;
  const totalProgress = Math.round((totalCompleted / totalTasks) * 100);

  const sectionColors = {
    HOME: '#E10600',
    GARA: '#00D9FF',
    SCUDERIA: '#00FF41',
    CALENDARIO: '#FFB700',
    COMPONENTS: '#B52FFF',
  };

  const containerStyle = {
    fontFamily: 'Titillium Web, sans-serif',
    backgroundColor: '#0B0C10',
    color: '#EDEEF3',
    padding: '20px',
    borderRadius: '8px',
    marginBottom: '20px',
  };

  const headerStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
    paddingBottom: '12px',
    borderBottom: '1px solid #2A2D3A',
  };

  const titleStyle = {
    fontSize: '18px',
    fontWeight: 'bold',
    letterSpacing: '0.5px',
  };

  const toggleBtnStyle = {
    background: '#E10600',
    color: '#fff',
    border: 'none',
    padding: '8px 16px',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: 'bold',
    transition: 'all 0.2s',
  };

  const progressBarStyle = {
    width: '100%',
    height: '8px',
    backgroundColor: '#1A1B24',
    borderRadius: '4px',
    overflow: 'hidden',
    marginBottom: '4px',
  };

  const progressFillStyle = (percentage, color) => ({
    height: '100%',
    width: `${percentage}%`,
    backgroundColor: color,
    transition: 'width 0.3s ease',
  });

  const sectionStyle = {
    marginBottom: '16px',
    padding: '12px',
    backgroundColor: '#14151C',
    borderRadius: '6px',
    border: '1px solid #2A2D3A',
  };

  const sectionHeaderStyle = (color) => ({
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px',
    paddingBottom: '8px',
    borderBottom: `2px solid ${color}`,
  });

  const sectionTitleStyle = (color) => ({
    fontSize: '14px',
    fontWeight: 'bold',
    color: color,
  });

  const progressLabelStyle = {
    fontSize: '11px',
    color: '#A9ABBA',
  };

  const taskListStyle = {
    maxHeight: showPlan ? '500px' : '0px',
    overflow: 'hidden',
    transition: 'max-height 0.3s ease',
  };

  const taskItemStyle = {
    display: 'flex',
    alignItems: 'center',
    padding: '8px 0',
    fontSize: '12px',
    cursor: 'pointer',
    transition: 'color 0.2s',
  };

  const checkboxStyle = {
    width: '16px',
    height: '16px',
    marginRight: '8px',
    cursor: 'pointer',
    accentColor: '#E10600',
  };

  const taskLabelStyle = (isCompleted) => ({
    color: isCompleted ? '#A9ABBA' : '#EDEEF3',
    textDecoration: isCompleted ? 'line-through' : 'none',
    flex: 1,
  });

  const toastStyle = {
    position: 'fixed',
    bottom: '20px',
    right: '20px',
    background: '#00FF41',
    color: '#0B0C10',
    padding: '12px 20px',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: 'bold',
    zIndex: 1000,
    animation: 'slideIn 0.3s ease',
  };

  const globalStylesheet = `
    @keyframes slideIn {
      from { transform: translateX(400px); opacity: 0; }
      to { transform: translateX(0); opacity: 1; }
    }
  `;

  return (
    <>
      <style>{globalStylesheet}</style>

      <div style={containerStyle}>
        <div style={headerStyle}>
          <div>
            <div style={titleStyle}>MVP DEVELOPMENT PLAN</div>
            <div style={{ fontSize: '11px', color: '#A9ABBA', marginTop: '4px' }}>
              {totalCompleted} / {totalTasks} tasks completed
            </div>
          </div>
          <button
            style={toggleBtnStyle}
            onMouseEnter={(e) => (e.target.style.backgroundColor = '#FF2020')}
            onMouseLeave={(e) => (e.target.style.backgroundColor = '#E10600')}
            onClick={() => setShowPlan(!showPlan)}
          >
            {showPlan ? 'NASCONDI' : 'MOSTRA'}
          </button>
        </div>

        {/* Progress bar totale */}
        <div style={progressBarStyle}>
          <div style={progressFillStyle(totalProgress, '#E10600')} />
        </div>
        <div style={{ ...progressLabelStyle, marginBottom: '16px' }}>
          {totalProgress}% Completamento
        </div>

        {/* Sezioni */}
        {Object.keys(PLAN_TASKS).map((section) => (
          <div key={section} style={sectionStyle}>
            <div style={sectionHeaderStyle(sectionColors[section])}>
              <div style={sectionTitleStyle(sectionColors[section])}>
                {section}
              </div>
              <div style={progressLabelStyle}>
                {getProgress(section)}%
              </div>
            </div>

            <div style={progressBarStyle}>
              <div
                style={progressFillStyle(getProgress(section), sectionColors[section])}
              />
            </div>

            {/* Task list */}
            <div style={taskListStyle}>
              {PLAN_TASKS[section].map((task) => (
                <div
                  key={task.id}
                  style={taskItemStyle}
                  onMouseEnter={(e) => !completed[task.id] && (e.target.style.color = '#E10600')}
                  onMouseLeave={(e) => (e.target.style.color = '#EDEEF3')}
                  onClick={() => handleToggle(task.id)}
                >
                  <input
                    type="checkbox"
                    checked={completed[task.id] || false}
                    onChange={() => handleToggle(task.id)}
                    style={checkboxStyle}
                  />
                  <label style={taskLabelStyle(completed[task.id])}>
                    {task.label}
                  </label>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Toast */}
      {toast && <div style={toastStyle}>{toast}</div>}
    </>
  );
}
