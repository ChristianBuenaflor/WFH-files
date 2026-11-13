import React, { useCallback, useEffect, useState } from "react";
import { Alert, Card, Container, Spinner, Table } from "react-bootstrap";
import { Gift } from "react-bootstrap-icons";
import { useNavigate } from "react-router-dom";
import AdminLayout from "@/components/layout/Adminlayout";
import api from "@/config/axios";
import { useAuth } from "@/context/AuthContext";

const formatDate = (date) => {
  if (!date) return "—";
  const [year, month, day] = String(date).slice(0, 10).split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString();
};

const formatPeso = (amount) =>
  new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 2,
  }).format(Number(amount) || 0);

const ThirteenthMonth = ({ setIsAuth }) => {
  const { isAuth } = useAuth();
  const navigate = useNavigate();
  const [payslips, setPayslips] = useState([]);
  const [summary, setSummary] = useState({ total_records: 0, total_amount: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchPayslips = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get("/thirteenth-month/my-payslips");
      if (!response.data?.isSuccess) {
        throw new Error(response.data?.message || "Failed to fetch 13th month payslips.");
      }

      const records = response.data.data ?? [];
      if (!Array.isArray(records)) {
        throw new Error("The payslips response was not in the expected format.");
      }
      setPayslips(records);
      setSummary(response.data.summary ?? { total_records: records.length, total_amount: 0 });
      setError("");
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Failed to fetch 13th month payslips.");
      console.error("Failed to fetch 13th month payslips:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isAuth) {
      setIsAuth?.(false);
      navigate("/", { replace: true });
      return;
    }
    fetchPayslips();
  }, [fetchPayslips, isAuth, navigate, setIsAuth]);

  return (
    <AdminLayout setIsAuth={setIsAuth}>
      <Container fluid className="py-4">
        <div className="d-flex align-items-center gap-2 mb-4">
          <Gift size={26} />
          <div>
            <h1 className="h3 mb-0">13th Month</h1>
            {summary.employee_name && (
              <span className="text-muted">{summary.employee_name}</span>
            )}
          </div>
        </div>

        {error && <Alert variant="danger">{error}</Alert>}

        <Card className="mb-4">
          <Card.Body>
            <div className="text-muted">Total 13th month pay</div>
            <div className="fs-4 fw-semibold">{formatPeso(summary.total_amount)}</div>
            <small className="text-muted">
              {summary.total_records} {summary.total_records === 1 ? "record" : "records"}
            </small>
          </Card.Body>
        </Card>

        <Card>
          <Card.Body>
            <Card.Title>My 13th month payslips</Card.Title>
            {loading ? (
              <div className="text-center py-4">
                <Spinner animation="border" role="status">
                  <span className="visually-hidden">Loading payslips...</span>
                </Spinner>
              </div>
            ) : (
              <Table responsive hover className="align-middle mb-0">
                <thead>
                  <tr>
                    <th>Period</th>
                    <th>Start date</th>
                    <th>End date</th>
                    <th>Amount</th>
                    <th>Remarks</th>
                    <th>Date issued</th>
                  </tr>
                </thead>
                <tbody>
                  {payslips.length ? payslips.map((payslip) => (
                    <tr key={payslip.id}>
                      <td>{payslip.period_name || "—"}</td>
                      <td>{formatDate(payslip.start_date)}</td>
                      <td>{formatDate(payslip.end_date)}</td>
                      <td>{formatPeso(payslip.amount)}</td>
                      <td>{payslip.remarks || "—"}</td>
                      <td>{formatDate(payslip.created_at)}</td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={6} className="text-center text-muted py-4">
                        No 13th month payslip records found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </Table>
            )}
          </Card.Body>
        </Card>
      </Container>
    </AdminLayout>
  );
};

export default ThirteenthMonth;
