import React from 'react';
import AlertsPage from '../alerts/AlertsPage';

const TehsildarAlertsPage: React.FC = () => {
  return (
    <AlertsPage
      title="Tehsildar Cadastral & Dispute Alerts"
      subtitle="Critical land risk signals, dispute escalation notices, and legal compliance warnings"
      role="tehsildar"
    />
  );
};

export default TehsildarAlertsPage;