import React, { useState, useEffect, useRef } from "react";
import { Offcanvas, Modal } from "react-bootstrap";
import { Megaphone } from "react-bootstrap-icons";
import "@/components/layout/Adminlayout.css";
import api from "@/config/axios";
import { useAuth } from "@/context/AuthContext.jsx";
const Announcement = () => {
  const [notifications, setNotifications] = useState([]);
  const [showList, setShowList] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState(null);
  const [pendingAnnouncementId, setPendingAnnouncementId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const { user } = useAuth();

  const unreadCount = notifications.filter((notification) => !notification.is_seen).length;

  const hasFetched = useRef(false);

  const handleCloseList = () => {
    setShowList(false);
  };

  const handleCloseModal = () => {
    setShowModal(false);
  };

  const openAnnouncementModal = (announcementId) => {
    setPendingAnnouncementId(announcementId);
    setShowList(false);
  };

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const response = await api.get("/announcements");
      const data = response.data?.data || [];
      setNotifications(data);
    } catch (error) {
      console.error("Error fetching notifications:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    const options = { year: "numeric", month: "short", day: "numeric" };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  const fetchAnnouncementDetail = async (announcementId) => {
    setDetailLoading(true);
    try {
      const response = await api.get(`/announcements/${announcementId}`);
      const announcement = response.data?.data || null;
      setSelectedAnnouncement(announcement);
      setNotifications((prev) =>
        prev.map((item) =>
          item.id === announcementId ? { ...item, is_seen: true } : item
        )
      );
      setShowModal(true);
    } catch (error) {
      console.error("Error fetching announcement detail:", error);
    } finally {
      setDetailLoading(false);
      setPendingAnnouncementId(null);
    }
  };

  useEffect(() => {
    if (pendingAnnouncementId && !showList) {
      fetchAnnouncementDetail(pendingAnnouncementId);
    }
  }, [pendingAnnouncementId, showList]);

  useEffect(() => {
    if (user) {
      if (hasFetched.current) return;
      hasFetched.current = true;
      fetchNotifications();
    }
  }, [user]);

  const handleNotificationToggle = () => {
    setShowList((prev) => !prev);
  };

  return (
    <>
      <button
        type="button"
        className="notification-btn"
        onClick={handleNotificationToggle}
      >
        <Megaphone size={16} color="black" />
        {unreadCount > 0 && (
          <span className="notification-count">{unreadCount}</span>
        )}
      </button>

      <Offcanvas
        className="announcement-offcanvas"
        show={showList}
        onHide={handleCloseList}
        placement="end"
        backdrop={true}
        scroll={true}
      >
        <Offcanvas.Header closeButton>
          <Offcanvas.Title>Announcements</Offcanvas.Title>
        </Offcanvas.Header>
        <Offcanvas.Body className="announcement-list-body">
          {notifications.length === 0 ? (
            <div className="empty-notification">
              <p className="text-muted mb-0">No new announcements</p>
            </div>
          ) : (
            <div className="notification-items-container">
              {notifications.map((notification, index) => (
                <button
                  key={notification.id || index}
                  type="button"
                  className={`announcement-card announcement-list-item ${!notification.is_seen ? "announcement-unread" : ""}`}
                  onClick={() => openAnnouncementModal(notification.id)}
                >
                  <div className="d-flex align-items-center justify-content-between">
                    <strong>
                      <h6>{notification.title}</h6>
                    </strong>
                    <p className="text-end fst-italic mb-1 small">
                      {formatDate(notification.created_at)}
                    </p>
                  </div>

                  <p className="text-muted mb-1">
                    {notification.content.substring(0, 80)}...
                  </p>
                </button>
              ))}
            </div>
          )}
        </Offcanvas.Body>
      </Offcanvas>

      <Modal show={showModal} onHide={handleCloseModal} centered size="md">
        <Modal.Header closeButton>
          <Modal.Title>Announcement Details</Modal.Title>
        </Modal.Header>
        <Modal.Body className="pt-2 announcement-details">
          {detailLoading ? (
            <div className="text-center py-4">
              <span className="spinner-border text-primary" role="status" aria-hidden="true"></span>
            </div>
          ) : selectedAnnouncement ? (
            <>
              <h5 className="announcement-title">
                {selectedAnnouncement.title}
              </h5>
              <p className="text-muted announcement-date">
                Posted on: {new Date(selectedAnnouncement.created_at).toLocaleDateString()}
              </p>
              <hr />
              <p className="announcement-content">
                {selectedAnnouncement.content}
              </p>
            </>
          ) : (
            <div className="text-center py-4 text-muted">Unable to load announcement details.</div>
          )}
        </Modal.Body>
        <Modal.Footer className="border-0 pt-0">
          <button
            type="button"
            className="btn btn-outline-secondary btn-sm px-3"
            onClick={handleCloseModal}
          >
            Close
          </button>
        </Modal.Footer>
      </Modal>
    </>
  );
};

export default Announcement;
