import React, { useEffect, useMemo, useState } from "react";
import { Alert, Button, Card, Col, Container, Form, Modal, Row, Spinner, Table } from "react-bootstrap";
import { Download, Eye, FileText, Search } from "react-bootstrap-icons";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext.jsx";
import AdminLayout from "@/components/layout/Adminlayout.jsx";
import api from "@/config/axios.js";
import "@/pages/report/ReportPage.css";

const getReportText = (report) => {
	if (!report) return "";
	if (typeof document === "undefined") return report.report_today || "";
	return new DOMParser().parseFromString(report.report_today || "", "text/html").body.textContent || "";
};

const formatDate = (value, options = { month: "short", day: "numeric", year: "numeric" }) => {
	const date = new Date(value);
	return Number.isNaN(date.getTime()) ? "-" : date.toLocaleDateString("en-US", options);
};

const ReportPage = ({ setIsAuth }) => {
	const { isAuth } = useAuth();
	const navigate = useNavigate();
	const [reports, setReports] = useState([]);
	const [search, setSearch] = useState("");
	const [period, setPeriod] = useState("all");
	const [selectedReport, setSelectedReport] = useState(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState("");

	useEffect(() => {
		if (!isAuth) {
			setIsAuth?.(false);
			navigate("/");
			return;
		}

		const loadReports = async () => {
			try {
				const response = await api.get("/dashboard/employees");
				const records = response.data?.recent_reports || [];
				setReports(Array.isArray(records) ? records : []);
			} catch (requestError) {
				console.error("Error loading reports:", requestError);
				setError("Reports could not be loaded right now.");
			} finally {
				setLoading(false);
			}
		};

		loadReports();
	}, [isAuth, navigate, setIsAuth]);

	const filteredReports = useMemo(() => {
		const now = new Date();
		return reports.filter((report) => {
			const reportDate = new Date(report.clock_out || report.created_at);
			const matchesPeriod = period === "all" || (period === "month" && reportDate.getMonth() === now.getMonth() && reportDate.getFullYear() === now.getFullYear()) || (period === "year" && reportDate.getFullYear() === now.getFullYear());
			const query = search.trim().toLowerCase();
			return matchesPeriod && (!query || String(report.id).includes(query) || getReportText(report).toLowerCase().includes(query));
		});
	}, [period, reports, search]);

	const exportReports = () => {
		const header = ["Report ID", "Date", "Clock-out", "Summary", "Status"];
		const rows = filteredReports.map((report) => [report.id, formatDate(report.clock_out), new Date(report.clock_out).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }), getReportText(report), "Submitted"]);
		const csv = [header, ...rows].map((row) => row.map((value) => `"${String(value ?? "").replaceAll('"', '""')}"`).join(",")).join("\n");
		const link = document.createElement("a");
		link.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
		link.download = "employee-reports.csv";
		link.click();
		URL.revokeObjectURL(link.href);
	};

	if (!isAuth) return null;

	return (
		<AdminLayout setIsAuth={setIsAuth}>
			<Container fluid className="report-page">
				<div className="report-page-header">
					<div>
						<h1>Reports</h1>
						<p className="report-subtitle">Review the work reports submitted during clock-out.</p>
					</div>
					<Button variant="primary" className="report-export-button" onClick={exportReports} disabled={!filteredReports.length}><Download className="me-2" /> Export CSV</Button>
				</div>
				{error && <Alert variant="warning">{error}</Alert>}
				<Row className="g-3 report-stats">
					<Col sm={6} lg={4}><Card className="report-stat-card"><Card.Body><FileText /><span>Total reports</span><strong>{reports.length}</strong></Card.Body></Card></Col>
					<Col sm={6} lg={4}><Card className="report-stat-card report-stat-blue"><Card.Body><Eye /><span>Showing</span><strong>{filteredReports.length}</strong></Card.Body></Card></Col>
					<Col sm={12} lg={4}><Card className="report-stat-card report-stat-green"><Card.Body><span>Latest submission</span><strong>{reports[0] ? formatDate(reports[0].clock_out) : "-"}</strong></Card.Body></Card></Col>
				</Row>
				<Card className="report-card"><Card.Body>
					<div className="report-toolbar"><div className="report-search"><Search /><Form.Control value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search reports" aria-label="Search reports" /></div><Form.Select value={period} onChange={(event) => setPeriod(event.target.value)} aria-label="Filter report period" className="report-period-select"><option value="all">All time</option><option value="month">This month</option><option value="year">This year</option></Form.Select></div>
					{loading ? <div className="report-loading"><Spinner animation="border" size="sm" /> Loading reports...</div> : <Table responsive hover className="report-table"><thead><tr><th>Report ID</th><th>Date</th><th>Clock-out</th><th>Summary</th><th>Status</th><th aria-label="Actions" /></tr></thead><tbody>{filteredReports.length ? filteredReports.map((report) => <tr key={report.id}><td><span className="report-id">#{report.id}</span></td><td>{formatDate(report.clock_out)}</td><td>{new Date(report.clock_out).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}</td><td className="report-summary-cell">{getReportText(report) || "No details provided"}</td><td><span className="report-status">Submitted</span></td><td><Button variant="outline-primary" size="sm" onClick={() => setSelectedReport(report)}><Eye className="me-1" /> View</Button></td></tr>) : <tr><td colSpan="6" className="report-empty">No reports match the selected filters.</td></tr>}</tbody></Table>}
				</Card.Body></Card>
				<Modal show={Boolean(selectedReport)} onHide={() => setSelectedReport(null)} size="lg" centered>
					<Modal.Header closeButton>
						<Modal.Title>Report Details</Modal.Title>
					</Modal.Header>
					<Modal.Body>
						{selectedReport && <>
							<Row className="mb-4">
								<Col md={6}>
									<div className="p-3 bg-light rounded">
										<small className="text-muted d-block">Date</small>
										<strong>{formatDate(selectedReport.clock_out, { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</strong>
									</div>
								</Col>
								<Col md={6}>
									<div className="p-3 bg-light rounded">
										<small className="text-muted d-block">Time</small>
										<strong>{new Date(selectedReport.clock_out).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</strong>
									</div>
								</Col>
							</Row>
							<div className="mb-4">
								<h6 className="fw-bold mb-3">Report Content</h6>
								<div className="report-full-content p-4 bg-light rounded" style={{ maxHeight: "400px", overflowY: "auto", fontSize: "0.95rem", lineHeight: "1.6" }}>
									<div dangerouslySetInnerHTML={{ __html: selectedReport.report_today || "<p class='text-muted'>No content provided</p>" }} />
								</div>
							</div>
							<div className="text-muted small"><strong>Report ID:</strong> #{selectedReport.id} | <strong>Status:</strong> Submitted</div>
						</>}
					</Modal.Body>
					<Modal.Footer>
						<Button variant="secondary" onClick={() => setSelectedReport(null)}>Close</Button>
					</Modal.Footer>
				</Modal>
			</Container>
		</AdminLayout>
	);
};

export default ReportPage;
