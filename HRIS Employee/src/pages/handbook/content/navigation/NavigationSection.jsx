import React from "react";
import { Card } from "react-bootstrap";

const NavigationSection = ({ sections = [] }) => {
  return (
    <Card className="privacy-card privacy-side-card">
      <Card.Body>
        <h2>On this page</h2>
        <ul>
          {sections.map((section) => (
            <li key={section.id}>
              <a href={`#privacy-${section.id}`}>{section.title}</a>
            </li>
          ))}
        </ul>
      </Card.Body>
    </Card>
  );
};

export default NavigationSection;
