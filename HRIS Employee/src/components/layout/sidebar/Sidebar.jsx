import React from "react";
import { Nav, Offcanvas } from "react-bootstrap";
import { Link, useLocation } from "react-router-dom";
import {
  CalendarCheck,
  CalendarDate,
  CalendarX,
  CashCoin,
  FileEarmarkText,
  BoxArrowRight,
  Speedometer2,
  FilePost,
} from "react-bootstrap-icons";
import "@/components/layout/sidebar/Sidebar.css";
import logo from "@/assets/images/cropped-SnL-Logo-480x480.png";

const Sidebar = ({ show, handleClose }) => {
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

  };

  const menuItems = [
    {
      id: "dashboard",
      label: "Dashboard",
      icon: "speedometer2",
      path: "/dashboard",
    },
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
    { id: "leave", label: "Leave", icon: "calendar-x", path: "/leave" },
    { id: "loan", label: "Loan", icon: "cash-coin", path: "/loan" },
    {
      id: "payslip",
      label: "Payslip",
      icon: "file-earmark-text",
      path: "/payslip",
    },
    {
      id: "lessons",
      label: "Lessons",
      icon: "file-post",
      path: "/lessons",
    },
  ];

  const isActive = (path) => {
    return location.pathname === path;
  };

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
            {menuItems.map((item) => (
              <Nav.Link
                as={Link}
                to={item.path}
                key={item.id}
                className={`sidebar-link ${isActive(item.path) ? "active" : ""}`}
                onClick={handleClose}
              >
                <span className="sidebar-icon">{iconMap[item.icon]}</span>
                <span>{item.label}</span>
              </Nav.Link>
            ))}
          </Nav>
        </Offcanvas.Body>
      </Offcanvas>

      {/* Desktop Sidebar */}
      <div className="sidebar-desktop">
        <div className="sidebar-header-desktop">
          <div className="d-flex justify-content-start align-items-center">
            <img src={logo} alt="SnL Logo" className="sidebar-logo me-3" />
            <span className=""><h5 className="sidebar-title mb-0 text-black">SnLHR </h5><h6 className="text-muted mb-0">Employee Portal</h6></span>
          </div>
        </div>
        <Nav className="flex-column sidebar-nav">
          {menuItems.map((item) => (
            <Nav.Link
              as={Link}
              to={item.path}
              key={item.id}
              className={`sidebar-link ${isActive(item.path) ? "active" : ""}`}
            >
              <span className="sidebar-icon">{iconMap[item.icon]}</span>
              <span>{item.label}</span>
            </Nav.Link>
          ))}
        </Nav>
      </div>
    </>
  );
};

export default Sidebar;
