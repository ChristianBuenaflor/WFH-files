import React from "react";
import { Button, Nav, Offcanvas } from "react-bootstrap";
import { Link, useLocation } from "react-router-dom";
import {
  CalendarCheck,
  CalendarDate,
  CalendarX,
  CashCoin,
  FileEarmarkText,
  BoxArrowRight,
  Speedometer2,
  ShieldLock,
  FilePost,
  JournalText,
  ChevronLeft,
  ChevronRight,
  JournalBookmark,
  ClockHistory,
} from "react-bootstrap-icons";
import "@/components/layout/sidebar/Sidebar.css";
import logo from "@/assets/images/cropped-SnL-Logo-480x480.png";

const Sidebar = ({ show, handleClose, collapsed, onToggle }) => {
  const location = useLocation();

  const iconMap = {
    "calendar-check": <CalendarCheck />,
    "calendar-date": <CalendarDate />,
    "calendar-x": <CalendarX />,
    "cash-coin": <CashCoin />,
    "file-earmark-text": <FileEarmarkText />,
    speedometer2: <Speedometer2 />,
    logout: <BoxArrowRight />,
    "file-post": <FilePost />,
    "journal-text": <JournalText />,
    "clock-history": <ClockHistory />,
  };

  const menuSections = [
    {
      id: "main",
      title: null,
      items: [
        {
          id: "dashboard",
          label: "Dashboard",
          icon: "speedometer2",
          path: "/dashboard",
        },
      ],
    },
    {
      id: "time-attendance",
      title: "Time & Attendance",
      items: [
        {
          id: "attendance",
          label: "Attendance",
          icon: "calendar-check",
          path: "/attendance",
        },
        {
          id: "calendar",
          label: "Calendar",
          icon: "calendar-date",
          path: "/calendar",
        },
        {
          id: "overtime",
          label: "Overtime",
          icon: "clock-history",
          path: "/overtime",
        },
        { id: "leave", label: "Leave", icon: "calendar-x", path: "/leave" },
      ],
    },
    {
      id: "payroll",
      title: "Payroll",
      items: [
        {
          id: "payslip",
          label: "Payslip",
          icon: "file-earmark-text",
          path: "/payslip",
        },
        { id: "loan", label: "Loan", icon: "cash-coin", path: "/loan" },
      ],
    },
    {
      id: "employee",
      title: "Other",
      items: [
        {
          id: "lessons",
          label: "Lessons",
          icon: "file-post",
          path: "/lessons",
        },
        {
          id: "report",
          label: "Reports",
          icon: "journal-text",
          path: "/report",
        },
      ],
    },
  ];

  const isActive = (path) => {
    return (
      location.pathname === path ||
      location.pathname.startsWith(`${path}/`)
    );
  };

  const renderNav = (onNavigate, showSectionTitle = true) => (
    <>
      {menuSections.map((section) => (
        <div key={section.id} className="sidebar-section">
          {section.title && showSectionTitle && (
            <p className="sidebar-section-title">{section.title}</p>
          )}
          {section.items.map((item) => (
            <Nav.Link
              as={Link}
              to={item.path}
              key={item.id}
              className={`sidebar-link ${isActive(item.path) ? "active" : ""}`}
              onClick={onNavigate}
              title={collapsed ? item.label : undefined}
            >
              <span className="sidebar-icon">{iconMap[item.icon]}</span>
              <span className="sidebar-label">{item.label}</span>
            </Nav.Link>
          ))}
        </div>
      ))}
    </>
  );

  return (
    <>
      {/* Mobile Offcanvas Sidebar */}
      <Offcanvas show={show} onHide={handleClose} className="sidebar-offcanvas">
        <Offcanvas.Header closeButton className="sidebar-header">
          <Offcanvas.Title>
            <div className="d-flex justify-content-start align-items-center">
              <img src={logo} alt="SnL Logo" className="sidebar-logo me-3" />
              <span style={{ marginTop: "14px" }}>
                <h5 className="sidebar-title-sm mb-0 text-black">SnLHR </h5>
                <small className="text-muted mt-0 small-p">Employee Portal</small>
              </span>
            </div>
          </Offcanvas.Title>
        </Offcanvas.Header>
        <Offcanvas.Body className="p-0">
          <Nav className="flex-column sidebar-nav">
            {renderNav(handleClose, true)}
          </Nav>
          <div className="sidebar-footer">
            <Button
              as={Link}
              to="/employee-handbook"
              variant="outline-primary"
              className={`sidebar-privacy-btn ${isActive("/employee-handbook") ? "active" : ""}`}
              onClick={handleClose}
            >
              <ShieldLock />
              <span>Handbook</span>
            </Button>
          </div>
        </Offcanvas.Body>
      </Offcanvas>

      {/* Desktop Sidebar */}
      <div className={`sidebar-desktop ${collapsed ? "collapsed" : ""}`}>
        <div className="sidebar-header-desktop">
          <div className="d-flex justify-content-start align-items-center">
            <img src={logo} alt="SnL Logo" className="sidebar-logo me-3" />
            <span className="sidebar-brand"><h5 className="sidebar-title mb-0 text-black">SnLHR </h5><h6 className="text-muted mb-0">Employee Portal</h6></span>
          </div>
          <button
            type="button"
            className="sidebar-toggle"
            onClick={onToggle}
            aria-label={collapsed ? "Expand sidebar" : "Minimize sidebar"}
            title={collapsed ? "Expand sidebar" : "Minimize sidebar"}
          >
            {collapsed ? <ChevronRight /> : <ChevronLeft />}
          </button>
        </div>
        <Nav className="flex-column sidebar-nav">
          {renderNav(undefined, !collapsed)}
        </Nav>
        <div className="sidebar-footer">
          <Button
            as={Link}
            to="/employee-handbook"
            variant="outline-primary"
            className={`sidebar-privacy-btn ${isActive("/employee-handbook") ? "active" : ""}`}
          >
            <JournalBookmark />
            <span className="sidebar-label">Employee Handbook</span>
          </Button>
        </div>
      </div>
    </>
  );
};

export default Sidebar;
