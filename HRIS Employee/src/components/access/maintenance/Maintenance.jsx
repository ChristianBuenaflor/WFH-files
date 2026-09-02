import React from 'react';
import { Container } from 'react-bootstrap';
import maintenanceImage from '@/assets/images/maintenance.png';
import '@/components/access/maintenance/Maintenance.css';

const Maintenance = ({
  title = "WE'LL BE BACK SOON",
  message = "We're currently making some updates to improve our experience. Please check back soon!"
}) => {
  return (
    <Container fluid className="maintenance-page">
      <div className="maintenance-scene">
        <img
          src={maintenanceImage}
          alt="Maintenance illustration"
          className="maintenance-illustration thumbnail"
        />

        <div className="maintenance-copy">
          <h2>{title}</h2>
          <p>{message}</p>
        </div>
      </div>
    </Container>
  );
};

export default Maintenance;
