import React from "react";
import { Toast } from "react-bootstrap";
import {
  CheckCircleFill,
  ExclamationCircleFill,
  ExclamationTriangleFill,
  InfoCircleFill,
  X,
} from "react-bootstrap-icons";

const variantConfig = {
  success: { icon: CheckCircleFill, label: "Success" },
  info: { icon: InfoCircleFill, label: "Information" },
  warning: { icon: ExclamationTriangleFill, label: "Warning" },
  danger: { icon: ExclamationCircleFill, label: "Error" },
};

const ToastMessage = ({ variant = "success", message, children, ...props }) => {
  const config = variantConfig[variant] || variantConfig.info;
  const Icon = config.icon;

  return (
    <Toast {...props} className={`app-toast app-toast-${variant} ${props.className || ""}`}>
      <Toast.Body>
        <Icon className="app-toast-icon" aria-hidden="true" />
        <span className="app-toast-message">{message || children}</span>
        <button
          type="button"
          className="app-toast-close"
          aria-label={`Close ${config.label.toLowerCase()} message`}
          onClick={props.onClose}
        >
          <X aria-hidden="true" />
        </button>
      </Toast.Body>
    </Toast>
  );
};

export default ToastMessage;
