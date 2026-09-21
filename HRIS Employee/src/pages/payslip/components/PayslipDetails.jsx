import React from "react";
import { Button, Modal } from "react-bootstrap";
import {
  ArrowUpRight,
  Calendar3,
  CashCoin,
  Download,
  Person,
} from "react-bootstrap-icons";
import "./PayslipDetails.css";

const toAmount = (value) => Number(String(value ?? 0).replace(/,/g, "")) || 0;

const normalizeHoliday = (holiday = {}) => {
  if (!holiday || typeof holiday !== "object") {
    return { name: "Holiday", date: "", type: "" };
  }

  return {
    name: holiday.holiday_name || holiday.name || holiday.holiday || "Holiday",
    date: holiday.holiday_date || holiday.date || holiday.holidayDate || "",
    type: holiday.holiday_type || holiday.type || "",
  };
};

const PayslipDetails = ({
  show,
  onClose,
  onDownload,
  payslip: payslipData,
  holidays = [],
  formatPeso,
  isLoading = false,
}) => {
  if (!payslipData && !isLoading) return null;

  const payslip = payslipData || {};
  const normalizedHolidays = (
    Array.isArray(payslip.holidays) ? payslip.holidays : holidays
  ).map(normalizeHoliday);
  const holidayCount = Number.isFinite(Number(payslip.total_holidays))
    ? Number(payslip.total_holidays)
    : normalizedHolidays.length;

  const baseSalary = toAmount(payslip.base_salary || payslip.gross_base);
  const nightDifferential = toAmount(payslip.night_diff_pay);
  const allowances = payslip.allowances || [];
  const deductions = payslip.deductions || [];
  const totalAllowances = allowances.reduce(
    (total, allowance) => total + toAmount(allowance.allowance_amount),
    0,
  );
  const totalDeductions = toAmount(payslip.total_deductions);

  return (
    <Modal
      show={show}
      onHide={onClose}
      centered
      dialogClassName="payslip-details-dialog"
    >
      <Modal.Header closeButton className="payslip-details-header">
        <div>
          <Modal.Title>Employee Payslip</Modal.Title>
          <p>Compensation statement for {payslip.employee_name}</p>
        </div>
      </Modal.Header>
      <Modal.Body className="payslip-details-body">
        {isLoading ? (
          <div className="payslip-details-loading">
            <div
              className="spinner-border spinner-border-sm text-primary"
              role="status"
            />
            <span>Loading payslip details...</span>
          </div>
        ) : (
          <div className="payslip-document">
            <div className="payslip-branding">
              <div className="payslip-brand-name">
                <CashCoin /> SNL Technology
              </div>
              <p>Calumpit, Bulacan, 3003</p>
              <h2>EMPLOYEE PAYSLIP</h2>
            </div>
            <div className="payslip-info-grid">
              <section className="payslip-info-panel">
                <h3>
                  <Person /> Employee Information
                </h3>
                <InfoRow label="Name:" value={payslip.employee_name} />
                <InfoRow label="Period:" value={payslip.period} />
                <InfoRow
                  label="Daily Rate:"
                  value={formatPeso(toAmount(payslip.daily_rate))}
                />
                <InfoRow
                  label="Days Worked:"
                  value={`${Number(payslip.days_worked || 0).toFixed(0)} ${
                    Number(payslip.days_worked || 0) === 1 ? "day" : "days"
                  }`}
                />
              </section>
              <section className="payslip-info-panel">
                <h3>
                  <Calendar3 /> Payment Details
                </h3>
                <InfoRow label="Base Salary:" value={formatPeso(baseSalary)} />
                <InfoRow
                  label="Total Deductions:"
                  value={formatPeso(totalDeductions)}
                  tone="negative"
                />
                <InfoRow
                  label="Total Allowances:"
                  value={formatPeso(totalAllowances)}
                  tone="positive"
                />
                <InfoRow
                  label="Night Differential:"
                  value={formatPeso(nightDifferential)}
                  tone="positive"
                />
                <InfoRow
                  label="Net Pay:"
                  value={formatPeso(toAmount(payslip.net_pay))}
                  tone="net"
                />
                <InfoRow label="Generated:" value={payslip.generated_at} />
              </section>
            </div>
            <div className="payslip-breakdown-grid">
              <Breakdown
                title="EARNINGS"
                tone="earnings"
                icon={<ArrowUpRight />}
              >
                <AmountRow label="Basic Pay" value={formatPeso(baseSalary)} />
                {nightDifferential > 0 && (
                  <AmountRow
                    label="Night Differential"
                    value={formatPeso(nightDifferential)}
                  />
                )}
                {allowances.map((allowance, index) => (
                  <AmountRow
                    key={`${allowance.allowance_type}-${index}`}
                    label={allowance.allowance_type}
                    value={formatPeso(toAmount(allowance.allowance_amount))}
                  />
                ))}
                <TotalRow
                  label="TOTAL EARNINGS:"
                  value={formatPeso(toAmount(payslip.gross_pay))}
                  tone="positive"
                />
              </Breakdown>
              <Breakdown
                title="DEDUCTIONS"
                tone="deductions"
                icon={<CashCoin />}
              >
                {deductions.map((deduction, index) => (
                  <AmountRow
                    key={`${deduction.deduction_type}-${index}`}
                    label={deduction.deduction_type}
                    value={formatPeso(toAmount(deduction.deduction_amount))}
                  />
                ))}
                <TotalRow
                  label="TOTAL DEDUCTIONS:"
                  value={formatPeso(totalDeductions)}
                  tone="negative"
                />
              </Breakdown>
            </div>
            <section className="payslip-holidays-panel">
              <div className="payslip-holidays-heading">
                <h3>
                  <Calendar3 /> HOLIDAYS
                </h3>
                <span>{holidayCount}</span>
              </div>
              {normalizedHolidays.length > 0 ? (
                <div className="payslip-holiday-list">
                  {normalizedHolidays.map((holiday, index) => (
                    <div
                      className="payslip-holiday-row"
                      key={`${holiday.name || "holiday"}-${holiday.date || index}`}
                    >
                      <div>
                        <strong>{holiday.name || "Holiday"}</strong>
                        {holiday.type && <small>{holiday.type}</small>}
                      </div>
                      <span>{holiday.date || "Date unavailable"}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="payslip-holiday-empty">
                  No holidays recorded for this pay period.
                </p>
              )}
            </section>
            <section className="payslip-net-panel">
              <h3>NET PAYABLE AMOUNT</h3>
              <strong>{formatPeso(toAmount(payslip.net_pay))}</strong>
              <p>
                This amount will be deposited to your registered bank account or
                E-Wallet
              </p>
            </section>
          </div>
        )}
      </Modal.Body>
      <Modal.Footer className="payslip-details-footer">
        <Button
          variant="light"
          className="payslip-close-button"
          onClick={onClose}
        >
          Close
        </Button>
        <Button
          className="payslip-download-button"
          onClick={onDownload}
          disabled={isLoading}
        >
          <Download /> Download PDF
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

const InfoRow = ({ label, value, tone = "" }) => (
  <div className="payslip-info-row">
    <span>{label}</span>
    <strong className={tone}>{value}</strong>
  </div>
);
const AmountRow = ({ label, value }) => (
  <div className="payslip-amount-row">
    <span>{label}</span>
    <span>{value}</span>
  </div>
);
const TotalRow = ({ label, value, tone }) => (
  <div className={`payslip-total-row ${tone}`}>
    <strong>{label}</strong>
    <strong>{value}</strong>
  </div>
);
const Breakdown = ({ title, tone, icon, children }) => (
  <section className={`payslip-breakdown-panel ${tone}`}>
    <h3>
      {icon} {title}
    </h3>
    <div className="payslip-breakdown-content">{children}</div>
  </section>
);

export default PayslipDetails;
