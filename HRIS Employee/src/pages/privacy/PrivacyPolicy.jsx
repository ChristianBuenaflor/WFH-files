import React from "react";
import { Badge, Card, Col, Container, Row } from "react-bootstrap";
import {
  Clock,
  Envelope,
  FileText,
  ShieldLock,
} from "react-bootstrap-icons";
import AdminLayout from "@/components/layout/Adminlayout.jsx";
import "./PrivacyPolicy.css";

const SECTIONS = [
  {
    id: "collection",
    title: "Information We Collect",
    body: "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris.",
  },
  {
    id: "use",
    title: "How We Use Information",
    body: "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident.",
  },
  {
    id: "sharing",
    title: "Information Sharing",
    body: "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium. Nemo enim ipsam voluptatem quia voluptas sit.",
  },
  {
    id: "security",
    title: "Data Security",
    body: "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Neque porro quisquam est, qui dolorem ipsum quia dolor sit amet, consectetur, adipisci velit. Quis autem vel eum iure reprehenderit.",
  },
  {
    id: "rights",
    title: "Your Rights",
    body: "Lorem ipsum dolor sit amet, consectetur adipiscing elit. At vero eos et accusamus et iusto odio dignissimos ducimus qui blanditiis praesentium voluptatum deleniti atque corrupti.",
  },
  {
    id: "retention",
    title: "Data Retention",
    body: "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Temporibus autem quibusdam et aut officiis debitis aut rerum necessitatibus saepe eveniet ut et voluptates repudiandae sint.",
  },
  {
    id: "contact",
    title: "Contact Us",
    body: "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Itaque earum rerum hic tenetur a sapiente delectus, ut aut reiciendis voluptatibus maiores alias consequatur aut perferendis.",
  },
];

const PrivacyPolicy = ({ setIsAuth }) => {
  return (
    <AdminLayout setIsAuth={setIsAuth}>
      <Container fluid className="privacy-page">
        <div className="privacy-page-header">
          <div>
            <p className="privacy-eyebrow">
              <ShieldLock className="me-1" /> Legal
            </p>
            <h1>Privacy Policy</h1>
            <p className="privacy-subtitle">
              How we collect, use, and protect employee information in the HRIS.
            </p>
          </div>
          <Badge bg="light" className="privacy-updated-badge">
            <Clock className="me-1" /> Last updated: Jan 1, 2026
          </Badge>
        </div>

        <Row className="g-3">
          <Col lg={8}>
            <Card className="privacy-card">
              <Card.Body>
                <div className="privacy-intro">
                  <FileText className="privacy-intro-icon" />
                  <p>
                    Lorem ipsum dolor sit amet, consectetur adipiscing elit,
                    sed do eiusmod tempor incididunt ut labore et dolore magna
                    aliqua. Ut enim ad minim veniam, quis nostrud exercitation
                    ullamco laboris nisi ut aliquip ex ea commodo consequat.
                  </p>
                </div>

                {SECTIONS.map((section) => (
                  <section
                    key={section.id}
                    id={`privacy-${section.id}`}
                    className="privacy-section"
                  >
                    <h2>{section.title}</h2>
                    <p>{section.body}</p>
                  </section>
                ))}
              </Card.Body>
            </Card>
          </Col>

          <Col lg={4}>
            <Card className="privacy-card privacy-side-card">
              <Card.Body>
                <h2>On this page</h2>
                <ul>
                  {SECTIONS.map((section) => (
                    <li key={section.id}>
                      <a href={`#privacy-${section.id}`}>{section.title}</a>
                    </li>
                  ))}
                </ul>
              </Card.Body>
            </Card>

            <Card className="privacy-card privacy-side-card privacy-contact-card">
              <Card.Body>
                <h2>
                  <Envelope className="me-2" />
                  Questions?
                </h2>
                <p>
                  Lorem ipsum dolor sit amet, consectetur adipiscing elit,
                  sed do eiusmod tempor incididunt ut labore et dolore.
                </p>
                <span className="privacy-contact-email">hr@example.com</span>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>
    </AdminLayout>
  );
};

export default PrivacyPolicy;
