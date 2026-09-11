import React, { Suspense, lazy } from "react";
import { Modal, Button, Form, Row, Col } from "react-bootstrap";
import { CheckCircleFill, Send } from "react-bootstrap-icons";

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
    <Modal show={show} onHide={handleClose} centered size="lg" dialogClassName="report-modal-dialog">
      <Modal.Header closeButton className="report-modal-header">
        <div>
          <div className="report-modal-kicker"><CheckCircleFill /> Face verified</div>
          <Modal.Title>Finish your daily report</Modal.Title>
          <p className="report-modal-subtitle">Add a quick summary before you clock out.</p>
        </div>
      </Modal.Header>

      <Modal.Body className="report-modal-body">
        {verificationMessage && (
          <div className="report-verification-note" role="status">
            <CheckCircleFill />
            <span>{verificationMessage}</span>
          </div>
        )}
        <Form>
          <Row className="g-4">
            <Col lg={5} md={5} xs={12}>
              <div className="report-field">
                <Form.Label>Send report to</Form.Label>
                <Form.Control
                  type="text"
                  value="hello@snlvirtualpartner.com"
                  readOnly
                  disabled
                  aria-label="Send report to"
                />
              </div>
              <div className="report-field">
                <Form.Label>CC recipients <span>(optional)</span></Form.Label>
                <Form.Control
                  type="email"
                  multiple
                  value={ccEmails}
                  onChange={(e) => setCcEmails(e.target.value)}
                  placeholder="name@company.com, ..."
                  aria-label="CC recipients"
                />
                <Form.Text>Separate multiple addresses with commas.</Form.Text>
              </div>
              <div className="report-field">
                <Form.Label>Subject</Form.Label>
                <Form.Control
                  type="text"
                  placeholder="Daily report"
                  value={reportSubject}
                  onChange={(e) => setReportSubject(e.target.value)}
                  aria-label="Subject"
                />
              </div>
            </Col>

            <Col lg={7} md={7} xs={12}>
              <div className="report-editor-heading">
                <Form.Label>What did you work on today?</Form.Label>
                <span>{characterCount} characters</span>
              </div>
              <Suspense fallback={<div className="text-muted">Loading editor...</div>}>
                <RichTextEditor
                  value={reportBody}
                  onChange={setReportBody}
                  placeholder="Write your report here..."
                />
              </Suspense>
            </Col>
          </Row>
        </Form>
      
      </Modal.Body>

      <Modal.Footer className="report-modal-footer">
        <Button size="sm" variant="light" onClick={handleClose}>
          Cancel
        </Button>
        <Button variant="success" size="sm" className="report-submit-button" onClick={handleReportSubmit}>
          <Send /> Submit &amp; clock out
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default ReportClockOutModal;