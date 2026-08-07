import React, { Suspense, lazy } from "react";
import { Modal, Button, Form, InputGroup, Row, Col } from "react-bootstrap";

const RichTextEditor = lazy(
  () => import("@/pages/attendance/components/richtexteditor/RichTextEditor"),
);

const ReportClockOutModal = ({
  show,
  setShowReportModal,
  ccEmails,
  setCcEmails,
  reportSubject,
  setReportSubject,
  reportBody,
  setReportBody,
  handleReportSubmit,
  verificationMessage,
  setVerificationMessage,
}) => {
  const handleClose = () => {
    setShowReportModal(false);
    setCcEmails("");
    setReportSubject("");
    setReportBody("");
    if (setVerificationMessage) {
      setVerificationMessage("");
    }
  };

  const getPlainText = (html) => {
    if (!html) return "";
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");
    return doc.body.textContent || "";
  };

  const characterCount = getPlainText(reportBody).length;

  return (
    <Modal show={show} onHide={handleClose} centered size="lg">
      <Modal.Header closeButton>
        <Modal.Title>Daily Report (Clock Out)</Modal.Title>
      </Modal.Header>

      <Modal.Body>
          {verificationMessage && (
          <div className=" alert alert-success py-2" role="alert">
            <span className="text-muted small">{verificationMessage}</span>
          </div>
        )}
        <Form>
          <Row>
            <Col lg={6} md={6} xs={12}>
              {/* TO */}
              <InputGroup className="mb-3">
                <InputGroup.Text id="to-addon">TO</InputGroup.Text>
                <Form.Control
                  type="text"
                  placeholder="hello@snlvirtualpartner.com"
                  readOnly
                  disabled
                  aria-label="TO"
                  aria-describedby="to-addon"
                  size="sm"
                />
              </InputGroup>

              {/* CC */}
              <InputGroup className="mb-3">
                <InputGroup.Text id="cc-addon">CC</InputGroup.Text>
                <Form.Control
                  size="sm"
                  type="email"
                  multiple
                  value={ccEmails}
                  onChange={(e) => setCcEmails(e.target.value)}
                  placeholder="Enter email addresses separated by commas"
                  aria-label="CC"
                  aria-describedby="cc-addon"
                />
              </InputGroup>

              <Form.Text className="text-muted mb-3 d-block">
                Separate multiple emails with commas.
              </Form.Text>

              {/* SUBJECT */}
              <InputGroup className="mb-3">
                <InputGroup.Text id="subject-addon">Subject</InputGroup.Text>
                <Form.Control
                  size="sm"
                  type="text"
                  placeholder="Daily report"
                  value={reportSubject}
                  onChange={(e) => setReportSubject(e.target.value)}
                  aria-label="Subject"
                  aria-describedby="subject-addon"
                />
              </InputGroup>

              <h5>Daily Summary</h5>
              <p style={{ lineHeight: "1em !important" }} className="text-muted small">
                Please provide a brief summary of the work you completed today.
              </p>
            </Col>

            <Col lg={6} md={6} xs={12}>
              {/* REPORT BODY */}
              <Suspense fallback={<div className="text-muted">Loading editor...</div>}>
                <RichTextEditor
                  value={reportBody}
                  onChange={setReportBody}
                  placeholder="Write your report here..."
                />
              </Suspense>
              <div className="d-flex justify-content-end mt-2">
                <small className="text-muted">{characterCount}</small>
              </div>
            </Col>
          </Row>
        </Form>
      
      </Modal.Body>

      <Modal.Footer>
        <Button size="sm" variant="outline-secondary" onClick={handleClose}>
          Cancel
        </Button>
        <Button variant="primary" size="sm" className="px-3 rounded-3" onClick={handleReportSubmit}>
          Submit & Clock Out
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default ReportClockOutModal;