import React from "react";
import { Badge, Modal, Spinner } from "react-bootstrap";

const FaceVerificationModal = ({
  show,
  onHide,
  videoRef,
  overlayRef,
  canvasRef,
  loadingModels,
  isProcessing,
  faceAligned,
  captureErrorMessage,
  clockAction,
}) => {
  return (
    <Modal show={show} onHide={onHide} centered size="lg">
      <Modal.Header closeButton>
        <Modal.Title>
          {clockAction === "out" ? "Clock Out" : "Clock In"} – Face Verification
        </Modal.Title>
      </Modal.Header>
      <Modal.Body className="text-center">
        {loadingModels ? (
          <Spinner animation="border" />
        ) : (
          <div style={{ position: "relative" }}>
            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              style={{ width: "100%", borderRadius: 10, transform: "scaleX(-1)" }}
            />
            <canvas
              ref={overlayRef}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                transform: "scaleX(-1)",
              }}
            />
            <div className="mt-3">
              {isProcessing ? (
                <Badge bg="warning">Processing...</Badge>
              ) : (
                <Badge bg={faceAligned ? "success" : "danger"}>
                  {faceAligned
                    ? "Face Aligned – Capturing..."
                    : "Center your face inside the green circle"}
                </Badge>
              )}
            </div>
            <div className="mt-2 text-muted">
              {loadingModels
                ? "Loading face detection models..."
                : isProcessing
                  ? "Please wait while we capture your image."
                  : faceAligned
                    ? "Hold still. Your face is aligned with the green circle."
                    : "Position your face inside the green circle and keep your head centered."}
            </div>
            {captureErrorMessage && (
              <div className="mt-3 alert alert-danger py-2 px-3 text-start" role="alert">
                {captureErrorMessage}
              </div>
            )}
          </div>
        )}
        <canvas ref={canvasRef} style={{ display: "none" }} />
      </Modal.Body>
    </Modal>
  );
};

export default FaceVerificationModal;
