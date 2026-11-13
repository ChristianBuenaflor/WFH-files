import React, { useState, useEffect, useRef } from "react";
import { Offcanvas, Modal } from "react-bootstrap";
import {
  MegaphoneFill,
  Check2All,
  ChevronRight,
  Calendar3,
  Inbox,
} from "react-bootstrap-icons";
import "@/components/layout/Adminlayout.css";
import "./AnnouncementModern.css";
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

  const getAnnouncementPreview = (content, maxLength = 90) => {
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
    window.dispatchEvent(new CustomEvent("announcement-detail-close"));
  };

  const openAnnouncementModal = (announcementId) => {
    setPendingAnnouncementId(announcementId);
    setShowList(false);
    // Root-cause fix: bell detail must win over dashboard auto-popup.
    // Tell dashboard to close so two `size="lg"` modals never stack.
    window.dispatchEvent(new CustomEvent("close-dashboard-announcement"));
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

      window.dispatchEvent(new CustomEvent("announcement-detail-open"));
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
    setShowList((prev) => {
      // Opening the bell list while the dashboard popup is up would
      // stack offcanvas + modal — preemptively close the popup.
      if (!prev) {
        window.dispatchEvent(new CustomEvent("close-dashboard-announcement"));
      }
      return !prev;
    });
  };

  const subtitle =
    unreadCount > 0
      ? `${unreadCount} unread update${unreadCount > 1 ? "s" : ""}`
      : "You're all caught up";

  return (
    <>
      <button
        type="button"
        className="am-trigger"
        onClick={handleNotificationToggle}
        aria-label={
          unreadCount > 0
            ? `Announcements, ${unreadCount} unread`
            : "Announcements"
        }
        aria-expanded={showList}
      >
        <MegaphoneFill aria-hidden="true" />
        {unreadCount > 0 && (
          <span className="am-badge" aria-hidden="true">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      <Offcanvas
        className="announcement-offcanvas am-shell"
        show={showList}
        onHide={handleCloseList}
        placement="end"
        backdrop
        scroll
      >
        <Offcanvas.Header closeButton>
          <div className="am-head">
            <span className="am-head-icon" aria-hidden="true">
              <MegaphoneFill />
            </span>
            <div className="am-head-text">
              <p className="am-head-title">Announcements</p>
              <p className="am-head-sub">{subtitle}</p>
            </div>
            <button
              type="button"
              className="am-markall"
              onClick={handleMarkAllAsRead}
              disabled={unreadCount === 0 || markingAllAsRead}
            >
              <Check2All size={15} aria-hidden="true" />
              <span>{markingAllAsRead ? "Marking..." : "Mark all read"}</span>
            </button>
          </div>
        </Offcanvas.Header>

        <Offcanvas.Body>
          {loading && notifications.length === 0 ? (
            <div className="am-skeleton" aria-label="Loading announcements">
              <div className="am-skel" />
              <div className="am-skel" />
              <div className="am-skel" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="am-empty">
              <span className="am-empty-icon" aria-hidden="true">
                <Inbox />
              </span>
              <strong>No announcements yet</strong>
              <p>New HR updates and company news will appear here.</p>
            </div>
          ) : (
            <div className="am-list" role="list">
              {notifications.map((notification) => {
                const isUnread = !notification.is_seen;
                return (
                  <button
                    key={notification.id}
                    type="button"
                    role="listitem"
                    className={`am-card ${isUnread ? "is-unread" : ""}`}
                    onClick={() => openAnnouncementModal(notification.id)}
                    aria-label={`${notification.title}${isUnread ? ", unread" : ""}`}
                  >
                    <span className="am-card-top">
                      <span className="am-card-title">
                        {notification.title}
                      </span>
                      <span className="am-pills">
                        {isUnread ? (
                          <span className="am-new">
                            <i aria-hidden="true" />
                            New
                          </span>
                        ) : (
                          <span className="am-read">Read</span>
                        )}
                      </span>
                    </span>

                    <span className="am-preview">
                      {getAnnouncementPreview(notification.content)}
                    </span>

                    <span className="am-meta">
                      <span className="am-date">
                        <Calendar3 aria-hidden="true" />
                        {formatDate(notification.created_at)}
                      </span>
                      <span className="am-open">
                        View
                        <ChevronRight aria-hidden="true" />
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </Offcanvas.Body>

        <div className="am-foot">
          <button
            type="button"
            className="am-foot-btn"
            onClick={handleMarkAllAsRead}
            disabled={unreadCount === 0 || markingAllAsRead}
          >
            <Check2All size={16} aria-hidden="true" />
            {markingAllAsRead ? "Marking as read..." : "Mark all as read"}
          </button>
        </div>
      </Offcanvas>

      <Modal
        show={showModal}
        onHide={handleCloseModal}
        centered
        size="lg"
        dialogClassName="am-modal"
      >
        <Modal.Header closeButton>
          <div className="am-modal-head">
            <span className="am-head-icon" aria-hidden="true">
              <MegaphoneFill />
            </span>
            <div>
              <p className="am-modal-title">Announcement</p>
              <p className="am-modal-sub">Company update & details</p>
            </div>
          </div>
        </Modal.Header>

        <Modal.Body>
          {detailLoading ? (
            <div className="am-skeleton" aria-label="Loading announcement details">
              <div className="am-skel" style={{ minHeight: "42px" }} />
              <div className="am-skel" style={{ minHeight: "220px" }} />
            </div>
          ) : selectedAnnouncement ? (
            <>
              <div className="am-detail-kicker">
                <span
                  className={`am-chip ${selectedAnnouncement.is_seen === false ? "is-new" : "is-read"}`}
                >
                  {selectedAnnouncement.is_seen === false ? "New" : "Announcement"}
                </span>
                <span className="am-detail-date">
                  <Calendar3 size={14} aria-hidden="true" />
                  Posted on{" "}
                  {new Date(
                    selectedAnnouncement.created_at,
                  ).toLocaleDateString(undefined, {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </span>
              </div>

              <h5 className="am-detail-title">
                {selectedAnnouncement.title}
              </h5>

              <div
                className="am-detail-content"
                dangerouslySetInnerHTML={{
                  __html: selectedAnnouncement.content || "",
                }}
              />
            </>
          ) : (
            <div className="am-empty">
              <span className="am-empty-icon" aria-hidden="true">
                <Inbox />
              </span>
              <strong>Unable to load details</strong>
              <p>Please try opening this announcement again.</p>
            </div>
          )}
        </Modal.Body>

        <Modal.Footer>
          <button
            type="button"
            className="am-btn-primary"
            onClick={handleCloseModal}
          >
            Got it
          </button>
        </Modal.Footer>
      </Modal>
    </>
  );
};

export default Announcement;
