import React from "react";
import { Badge, Card, Col, Container, Row } from "react-bootstrap";
import { Clock, JournalBookmark } from "react-bootstrap-icons";
import AdminLayout from "@/components/layout/Adminlayout.jsx";
import CodeSection from "./content/codes/CodeSection.jsx";
import { SECTIONS } from "./content/codes/handbookSections.js";
import NavigationSection from "./content/navigation/NavigationSection.jsx";
import "./HandBook.css";

const HandBookPage = ({ setIsAuth }) => {
  return (
    <AdminLayout setIsAuth={setIsAuth}>
      <Container fluid className="privacy-page">
        <div className="privacy-page-header">
          <div>
            <p className="privacy-eyebrow">
              <JournalBookmark className="me-1" /> SL ARENAS IT SOLUTIONS
            </p>
            <h1>EMPLOYEE HANDBOOK v1s2026</h1>
            <p className="privacy-subtitle">Strictly Confidential</p>
          </div>
          <Badge bg="light" className="privacy-updated-badge">
            <Clock className="me-1" /> Handbook v1s2026
          </Badge>
        </div>

        <Row className="g-3">
          <Col lg={8}>
            <Card className="privacy-card">
              <Card.Body>
                <CodeSection sections={SECTIONS} />
              </Card.Body>
            </Card>
          </Col>

          <Col lg={4} className="privacy-toc-col">
            <NavigationSection sections={SECTIONS} />
          </Col>
        </Row>
      </Container>
    </AdminLayout>
  );
};

export default HandBookPage;
