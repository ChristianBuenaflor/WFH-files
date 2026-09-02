import React, { useState, useCallback } from "react";
import { Card, Table, Button, Modal, Row, Col } from "react-bootstrap";
import { JournalText, Eye } from "react-bootstrap-icons";

const RecentReport = ({ recentReports = [] }) => {
  const [showReportModal, setShowReportModal] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);

  const displayReports = recentReports.slice(0, 5);

  const getPlainText = useCallback((html) => {
    if (!html) return "No details provided";
    const doc = new DOMParser().parseFromString(html, "text/html");
    return doc.body.textContent || "";
  }, []);

  const truncateText = useCallback((text, maxLength = 48) => {
    const safeText = text ?? "";
    if (safeText.length <= maxLength) return safeText;
    return safeText.substring(0, maxLength).trimEnd() + "...";
  }, []);

  const formatReportDate = useCallback((value) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "—";

    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }, []);

  const formatReportTime = useCallback((value) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "—";

    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }, []);

  return (
    <>
      <Card className="dashboard-card-modern recent-report-card">
        <Card.Header className="card-header-custom">
          <div className="d-flex align-items-center justify-content-between gap-2">
            <h5>Recent Reports</h5>
            <span className="recent-report-count">{displayReports.length}/5</span>
          </div>
        </Card.Header>
        <Card.Body className="recent-report-body">
          <Table borderless responsive className="dashboard-table recent-report-table">
            <thead>
              <tr>
                <th>Report ID</th>
                <th>Clock-Out</th>
                <th>Date</th>
                <th>Summary</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {displayReports.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-center py-5">
                    <div className="report-empty-state">
                      <JournalText size={42} className="mb-3 text-muted" />
                      <p className="text-muted mb-0">No reports available</p>
                    </div>
                  </td>
                </tr>
              ) : (
                displayReports.map((report) => (
                  <tr key={report.id}>
                    <td className="report-id-cell">
                      <span className="report-id-pill">#{report.id}</span>
                    </td>
                    <td>
                      <span className="report-time">{formatReportTime(report.clock_out)}</span>
                    </td>
                    <td>
                      <span className="report-date">{formatReportDate(report.clock_out)}</span>
                    </td>
                    <td>
                      <span className="report-summary">
                        {truncateText(getPlainText(report.report_today), 34)}
                      </span>
                    </td>
                    <td>
                      <span className="report-status-badge submitted">Submitted</span>
                    </td>
                    <td>
                      <Button
                        variant="outline-primary"
                        size="sm"
                        className="recent-report-view-btn"
                        onClick={() => {
                          setSelectedReport(report);
                          setShowReportModal(true);
                        }}
                      >
                        <Eye size={14} className="me-1" />
                        View
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </Table>
        </Card.Body>
      </Card>

      {/* REPORT DETAILS MODAL */}
      <Modal
        show={showReportModal}
       dialogClassName="modal-90w"
        onHide={() => setShowReportModal(false)}
        size="lg"
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>Report Details</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedReport && (
            <>
              <Row className="mb-4">
                <Col md={6}>
                  <div className="p-3 bg-light rounded">
                    <small className="text-muted d-block">Date</small>
                    <strong>
                      {new Date(selectedReport.clock_out).toLocaleDateString(
                        "en-US",
                        {
                          weekday: "long",
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        },
                      )}
                    </strong>
                  </div>
                </Col>
                <Col md={6}>
                  <div className="p-3 bg-light rounded">
                    <small className="text-muted d-block">Time</small>
                    <strong>
                      {new Date(selectedReport.clock_out).toLocaleTimeString(
                        "en-US",
                        {
                          hour: "2-digit",
                          minute: "2-digit",
                          second: "2-digit",
                        },
                      )}
                    </strong>
                  </div>
                </Col>
              </Row>

              <div className="mb-4">
                <h6 className="fw-bold mb-3">Report Content</h6>
                <div
                  className="report-full-content p-4 bg-light rounded"
                  style={{
                    maxHeight: "400px",
                    overflowY: "auto",
                    fontSize: "0.95rem",
                    lineHeight: "1.6",
                  }}
                >
                  <div
                    dangerouslySetInnerHTML={{
                      __html:
                        selectedReport.report_today ||
                        "<p class='text-muted'>No content provided</p>",
                    }}
                  />
                </div>
              </div>

              <div className="text-muted small">
                <strong>Report ID:</strong> #{selectedReport.id} |
                <strong> Status:</strong> Submitted
              </div>
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button
            variant="secondary"
            onClick={() => setShowReportModal(false)}
          >
            Close
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
};

export default React.memo(RecentReport);
