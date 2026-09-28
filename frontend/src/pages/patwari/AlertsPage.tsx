import React from 'react';
import AlertsPage from '../alerts/AlertsPage';

const PatwariAlertsPage: React.FC = () => {
  return (
    <AlertsPage
      title="Patwari Field Alerts & Risk Signals"
      subtitle="Early warning signals, encroachment notices, and field boundary alerts in your jurisdiction"
      role="patwari"
    />
  );
};

export default PatwariAlertsPage;