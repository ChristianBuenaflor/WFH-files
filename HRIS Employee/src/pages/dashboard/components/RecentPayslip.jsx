import React, { useState, useCallback, useMemo, useRef } from "react";
import { Card, Button, Row, Col } from "react-bootstrap";
import { FileEarmarkRuled, FileEarmarkText, CalendarDate, Download } from "react-bootstrap-icons";
import { Link } from "react-router-dom";
import api from "@/config/axios";
import ReactDOM from "react-dom/client";
import Offcanvas from "react-bootstrap/Offcanvas";
import "@/pages/payslip/Payslip.css";
import PayslipPDF from "@/components/payslip/PayslipPDF";

const RecentPayslip = ({ recentPayslips = [], pdfRef }) => {
  const [downloadingId, setDownloadingId] = useState(null);
  const [show, setShow] = useState(false);
  const [selectedPayslip, setSelectedPayslip] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const detailsPdfRef = useRef();

  const handleClose = () => setShow(false);
  const handleShow = () => setShow(true);

  const formatPeso = useCallback(
    (value) =>
      new Intl.NumberFormat("en-PH", {
        style: "currency",
        currency: "PHP",
        minimumFractionDigits: 2,
      }).format(value),
    [],
  );

  //-------------- Fetch payslip by ID-------------- //
  const fetchPayslipById = async (record_id) => {
    try {
      setIsLoading(true);
      const res = await api.get(`/my-payslip/${record_id}`);
      const detail = res.data?.payslip;
      setSelectedPayslip(detail);
    } catch (error) {
      console.error(
        "Error fetching payslip detail:",
        error.response?.data || error.message,
      );
    } finally {
      setIsLoading(false);
    }
  };

  //-------------- Download payslip PDF-------------- //
  const downloadPayslipPDF = async (payslipId) => {
    try {
      setDownloadingId(payslipId);

      // Fetch full payslip details
      const res = await api.get(`/my-payslip/${payslipId}`);
      const payslipData = res.data?.payslip;

      if (!payslipData) {
        alert("Failed to fetch payslip details");
        setDownloadingId(null);
        return;
      }

      // Create a temporary container for rendering the PDF component
      const tempContainer = document.createElement("div");
      tempContainer.style.position = "absolute";
      tempContainer.style.left = "-9999px";
      tempContainer.style.width = "800px";
      document.body.appendChild(tempContainer);

      const [{ default: html2canvas }, { default: jsPDF }, { default: PayslipPDF }] = await Promise.all([
        import("html2canvas"),
        import("jspdf"),
        import("@/components/payslip/PayslipPDF"),
      ]);

      // Render the PayslipPDF component
      const root = ReactDOM.createRoot(tempContainer);
      root.render(
        <PayslipPDF
          payslip={payslipData}
          formatPeso={formatPeso}
          ref={pdfRef}
        />,
      );

      // Wait for render to complete
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Generate PDF from the rendered content
      const pdfContainer = tempContainer.querySelector(".pdf-container");
      if (pdfContainer) {
        const canvas = await html2canvas(pdfContainer, { scale: 2 });
        const imgData = canvas.toDataURL("image/png");

        const pdf = new jsPDF("p", "mm", "a4");
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

        pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
        pdf.save(`Payslip-${payslipData.period}.pdf`);
      }

      // Cleanup
      root.unmount();
      document.body.removeChild(tempContainer);
      setDownloadingId(null);
    } catch (err) {
      console.error("Error downloading payslip:", err);
      alert("Failed to download payslip. Please try again.");
      setDownloadingId(null);
    }
  };

  return (
    <>
      <Card className="dashboard-card-modern">
      <Card.Header className="card-header-custom">
        <div className="d-flex align-items-center justify-content-between">
          <h5>Recent Payslips</h5>
          <Link to="/payslip">
            <Button size="sm" variant="outline-primary">
              View All
            </Button>
          </Link>
        </div>
      </Card.Header>
      <Card.Body>
        {recentPayslips.length === 0 ? (
          <div className="text-center py-5">
            <FileEarmarkRuled size={48} className="mb-3 text-muted" />
            <p className="text-muted">No payslips available</p>
          </div>
        ) : (
          <Row>
            {recentPayslips.map((p) => (
              <Col lg={4} md={6} key={p.id} className="mb-4">
                <Card className="payslip-card-modern">
                  <Card.Body>
                    <div className="d-flex justify-content-between align-items-start mb-3">
                      <div>
                        <h6 className="mb-1 text-primary">
                          {new Date(p.created_at).toLocaleDateString()}
                        </h6>
                        <small className="text-muted">Payslip</small>
                      </div>
                      <span className="badge bg-success">Completed</span>
                    </div>
                    <hr />
                    <div className="payslip-info">
                      <div className="mb-3">
                        <small className="text-muted d-block">Gross Pay</small>
                        <h5 className="mb-0">{formatPeso(p.gross_pay)}</h5>
                      </div>
                      <div>
                        <small className="text-muted d-block">Net Pay</small>
                        <h5 className="mb-0 text-success">
                          {formatPeso(p.net_pay)}
                        </h5>
                      </div>
                    </div>
                    <div className="d-flex justify-content-between align-items-center">
                      <Button
                        variant="outline-primary"
                        size="sm"
                        className="w-100 mt-3"
                        onClick={() => downloadPayslipPDF(p.id)}
                        disabled={downloadingId === p.id}
                      >
                        {downloadingId === p.id ? (
                          <>
                            <span
                              className="spinner-border spinner-border-sm me-2"
                              role="status"
                              aria-hidden="true"
                            ></span>
                            Downloading...
                          </>
                        ) : (
                          "Download"
                        )}
                      </Button>
                      <Button
                        variant="primary"
                        size="sm"
                        className="w-100 mt-3 ms-2"
                        onClick={() => {
                          fetchPayslipById(p.id);
                          handleShow();
                        }}
                      >
                        View Details
                      </Button>
                    </div>
                  </Card.Body>
                </Card>
              </Col>
            ))}
          </Row>
        )}
      </Card.Body>
    </Card>
    <Offcanvas
      show={show}
      onHide={handleClose}
      placement="bottom"
      className="payslip-offcanvas h-75"
    >
      <Offcanvas.Header closeButton className="payslip-offcanvas-header">
        <Offcanvas.Title className="payslip-offcanvas-title">
          <FileEarmarkText size={20} className="me-2" />
          Payslip Details
        </Offcanvas.Title>
      </Offcanvas.Header>
      {selectedPayslip && (
        <Offcanvas.Body className="payslip-offcanvas-body p-4">
          {/* Date Range */}
          <div className="payslip-detail-section">
            <div className="detail-date-info">
              <p className="detail-date-label">
                <CalendarDate size={16} className="me-2" />
                {selectedPayslip.period}
              </p>
              <p className="detail-generated">
                Generated: {selectedPayslip.generated_at}
                <p>{selectedPayslip.employee_id || "--No employee ID--"}</p>
              </p>
            </div>
          </div>

          {/* Remarks Section */}
          <div className="payslip-detail-section">
            <h6 className="detail-section-title">Remarks</h6>
            <div className="remarks-box">
              <p className="remarks-text">
                {selectedPayslip.remarks || "--No additional remarks--"}
              </p>
            </div>
          </div>
          {/* Attendance Information Section */}
              <div className="payslip-detail-section">
                <h6 className="detail-section-title">Attendance Summary</h6>
                <div className="allowance-deduction-item">
                  <span className="item-name">Days Worked</span>
                  <span className="item-amount">
                    {selectedPayslip.days_worked} days
                  </span>
                </div>
                <div className="allowance-deduction-item">
                  <span className="item-name">Absences</span>
                  <span className="item-amount">
                    {selectedPayslip.absences} days
                  </span>
                </div>
                {selectedPayslip.total_late_deductions > 0 && (
                  <div className="allowance-deduction-item">
                    <span className="item-name">Late Deduction</span>
                    <span className="item-amount negative">
                      -{formatPeso(Number(String(selectedPayslip.total_late_deductions).replace(/,/g, "")))}
                    </span>
                  </div>
                )}
              </div>

          {/* Summary Boxes */}
          <Row className="mb-4">
            <Col lg={4} className="mb-2">
              <div className="summary-detail-box summary-detail-blue">
                <p className="summary-detail-label">Total Gross Pay</p>
                <h6 className="summary-detail-value">
                  {formatPeso(
                    Number(
                      String(selectedPayslip.gross_pay).replace(/,/g, ""),
                    ),
                  )}
                </h6>
              </div>
            </Col>
            <Col lg={4} className="mb-2">
              <div className="summary-detail-box summary-detail-yellow">
                <p className="summary-detail-label">Total Deductions</p>
                <h6 className="summary-detail-value-danger">
                  -{" "}
                  {formatPeso(
                    Number(
                      String(selectedPayslip.total_deductions).replace(
                        /,/g,
                        "",
                      ),
                    ),
                  )}
                </h6>
              </div>
            </Col>
            <Col lg={4} className="mb-2">
              <div className="summary-detail-box summary-detail-green">
                <p className="summary-detail-label">Net Pay</p>
                <h6 className="summary-detail-value">
                  {formatPeso(
                    Number(
                      String(selectedPayslip.net_pay).replace(/,/g, ""),
                    ),
                  )}
                </h6>
              </div>
            </Col>
          </Row>

          {/* Allowances Section */}
          <div className="payslip-detail-section">
            <h6 className="detail-section-title">Allowances</h6>
            {selectedPayslip.allowances &&
            selectedPayslip.allowances.length > 0 ? (
              selectedPayslip.allowances.map((allowance, idx) => (
                <div key={idx} className="allowance-deduction-item">
                  <span className="item-name">
                    {allowance.allowance_type}
                  </span>
                  <span className="item-amount positive">
                    +
                    {formatPeso(
                      Number(
                        String(allowance.allowance_amount).replace(
                          /,/g,
                          "",
                        ),
                      ),
                    )}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-muted">No allowances</p>
            )}
          </div>

          {/* Deductions Section */}
          <div className="payslip-detail-section">
            <h6 className="detail-section-title">Deductions</h6>
            {selectedPayslip.deductions &&
            selectedPayslip.deductions.length > 0 ? (
              selectedPayslip.deductions.map((deduction, idx) => (
                <div key={idx} className="allowance-deduction-item">
                  <span className="item-name">
                    {deduction.deduction_type}
                  </span>
                  <span className="item-amount negative">
                    -
                    {formatPeso(
                      Number(
                        String(deduction.deduction_amount).replace(
                          /,/g,
                          "",
                        ),
                      ),
                    )}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-muted">No deductions</p>
            )}
          </div>

          {/* Basic Salary Section */}
          <div className="payslip-detail-section">
            <h6 className="detail-section-title">Daily Rate</h6>
            <div className="allowance-deduction-item">
              <span className="item-name">Basic Salary</span>
              <span className="item-amount positive">
                {formatPeso(
                  Number(
                    String(selectedPayslip.base_salary).replace(/,/g, ""),
                  ),
                )}
              </span>
            </div>
          </div>

          {/* Totals Summary */}
          <div className="payslip-detail-section">
            <div className="allowance-deduction-item">
              <span className="item-name">
                <strong>Total Gross Pay</strong>
              </span>
              <span className="item-amount">
                <strong>
                  {formatPeso(
                    Number(
                      String(selectedPayslip.gross_pay).replace(/,/g, ""),
                    ),
                  )}
                </strong>
              </span>
            </div>
            <div className="allowance-deduction-item">
              <span className="item-name">
                <strong>Total Deductions</strong>
              </span>
              <span className="item-amount negative">
                <strong>
                  {formatPeso(
                    Number(
                      String(selectedPayslip.total_deductions).replace(
                        /,/g,
                        "",
                      ),
                    ),
                  )}
                </strong>
              </span>
            </div>
          </div>

          {/* Download PDF Button */}
          <div className="d-flex justify-content-end w-100">
            <Button
              className="btn-download-pdf w-100 mt-4"
              onClick={() => downloadPayslipPDF(selectedPayslip.id)}
              disabled={downloadingId === selectedPayslip.id}
            >
              {downloadingId === selectedPayslip.id ? (
                <>
                  <span
                    className="spinner-border spinner-border-sm me-2"
                    role="status"
                    aria-hidden="true"
                  ></span>
                  Downloading...
                </>
              ) : (
                <>
                  <Download size={18} className="me-2" />
                  Download as PDF
                </>
              )}
            </Button>
          </div>
        </Offcanvas.Body>
      )}
    </Offcanvas>
    {/* Hidden but renderable */}
    <div style={{ position: "absolute", left: "-9999px", top: 0 }}>
      <PayslipPDF
        ref={detailsPdfRef}
        payslip={selectedPayslip}
        formatPeso={formatPeso}
      />
    </div>
    </>
  );
};

export default React.memo(RecentPayslip);
