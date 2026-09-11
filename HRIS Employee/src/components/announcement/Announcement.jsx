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
  const [markingAllAsRead, setMarkingAllAsRead] = useState(false);
  const { user } = useAuth();

  const unreadCount = notifications.filter(
    (notification) => !notification.is_seen,
  ).length;

  const hasFetched = useRef(false);

  const getAnnouncementPreview = (content, maxLength = 80) => {
    if (!content) return "";

    const parser = new DOMParser();
    const document = parser.parseFromString(String(content), "text/html");

    document.querySelectorAll("br").forEach((lineBreak) => {
      lineBreak.replaceWith(" ");
    });

    const plainText = (document.body.textContent || "")
      .replace(/\s+/g, " ")
      .trim();

    return plainText.length > maxLength
      ? `${plainText.slice(0, maxLength).trim()}...`
      : plainText;
  };

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
          item.id === announcementId ? { ...item, is_seen: true } : item,
        ),
      );

      window.dispatchEvent(
        new CustomEvent("announcement-seen", {
          detail: { announcementId },
        }),
      );

      setShowModal(true);
    } catch (error) {
      console.error("Error fetching announcement detail:", error);
    } finally {
      setDetailLoading(false);
      setPendingAnnouncementId(null);
    }
  };

  const handleMarkAllAsRead = async () => {
    const unreadAnnouncements = notifications.filter(
      (notification) => !notification.is_seen,
    );

    if (unreadAnnouncements.length === 0) return;

    setMarkingAllAsRead(true);

    const results = await Promise.allSettled(
      unreadAnnouncements.map((notification) =>
        api.get(`/announcements/${notification.id}`),
      ),
    );

    const readAnnouncementIds = unreadAnnouncements
      .filter((_, index) => results[index].status === "fulfilled")
      .map((notification) => notification.id);

    setNotifications((prev) =>
      prev.map((notification) =>
        readAnnouncementIds.includes(notification.id)
          ? { ...notification, is_seen: true }
          : notification,
      ),
    );

    setMarkingAllAsRead(false);

    readAnnouncementIds.forEach((announcementId) => {
      window.dispatchEvent(
        new CustomEvent("announcement-seen", {
          detail: { announcementId },
        }),
      );
    });
  };

  useEffect(() => {
    if (pendingAnnouncementId && !showList) {
      fetchAnnouncementDetail(pendingAnnouncementId);
    }
  }, [pendingAnnouncementId, showList]);

  useEffect(() => {
    const handleAnnouncementSeen = (event) => {
      const announcementId = event.detail?.announcementId;
      if (!announcementId) return;

      setNotifications((prev) =>
        prev.map((notification) =>
          notification.id === announcementId
            ? { ...notification, is_seen: true }
            : notification,
        ),
      );
    };

    window.addEventListener("announcement-seen", handleAnnouncementSeen);

    return () =>
      window.removeEventListener("announcement-seen", handleAnnouncementSeen);
  }, []);

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
        backdrop
        scroll
      >
        <Offcanvas.Header closeButton>
          <Offcanvas.Title>Announcements</Offcanvas.Title>
        </Offcanvas.Header>

        <Offcanvas.Body className="announcement-list-body">
          {loading && notifications.length === 0 ? (
            <div className="empty-notification text-center py-4">
              <div
                className="spinner-border text-primary mb-2"
                role="status"
                aria-hidden="true"
              />
              <p className="text-muted mb-0">Loading announcements...</p>
            </div>
          ) : notifications.length === 0 ? (
            <div className="empty-notification">
              <p className="text-muted mb-0">No new announcements</p>
            </div>
          ) : (
            <div className="notification-items-container">
              {notifications.map((notification, index) => (
                <button
                  key={notification.id || index}
                  type="button"
                  className={`announcement-card announcement-list-item ${
                    !notification.is_seen ? "announcement-unread" : ""
                  }`}
                  onClick={() => openAnnouncementModal(notification.id)}
                >
                  <div className="d-flex justify-content-between align-items-start gap-2 w-100">
                    <strong className="text-start announcement-item-title">
                      <h6 className="mb-0">{notification.title}</h6>
                    </strong>

                    <span
                      className={`announcement-status-dot ${
                        notification.is_seen ? "is-seen" : ""
                      }`}
                      aria-label={
                        notification.is_seen
                          ? "Read announcement"
                          : "Unread announcement"
                      }
                      title={
                        notification.is_seen
                          ? "Read announcement"
                          : "Unread announcement"
                      }
                    >
                      <span aria-hidden="true" />
                    </span>
                  </div>

                  <p className="text-muted mb-1">
                    {getAnnouncementPreview(notification.content)}
                  </p>

                  <div className="d-flex justify-content-end">
                    <small className="text-muted fs-7">
                      {formatDate(notification.created_at)}
                    </small>
                  </div>
                </button>
              ))}
            </div>
          )}
        </Offcanvas.Body>

        <div className="announcement-offcanvas-footer">
          <button
            type="button"
            className="w-100 py-2 border-0 bg-white border-top"
            onClick={handleMarkAllAsRead}
            disabled={unreadCount === 0 || markingAllAsRead}
          >
            {markingAllAsRead ? "Marking as read..." : "Mark all as read"}
          </button>
        </div>
      </Offcanvas>

      <Modal show={showModal} onHide={handleCloseModal} centered size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Announcement Details</Modal.Title>
        </Modal.Header>

        <Modal.Body className="pt-2 announcement-details ">
          {detailLoading ? (
            <div className="text-center py-4">
              <span
                className="spinner-border text-primary"
                role="status"
                aria-hidden="true"
              />
            </div>
          ) : selectedAnnouncement ? (
            <>
              <h5 className="announcement-title">
                {selectedAnnouncement.title}
              </h5>

              <p className="text-muted announcement-date">
                Posted on:{" "}
                {new Date(
                  selectedAnnouncement.created_at,
                ).toLocaleDateString()}
              </p>

              <hr />

              <div
                className="announcement-content"
                dangerouslySetInnerHTML={{
                  __html: selectedAnnouncement.content || "",
                }}
              />
            </>
          ) : (
            <div className="text-center py-4 text-muted">
              Unable to load announcement details.
            </div>
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
