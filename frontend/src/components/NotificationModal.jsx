import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import '../styles/components/_sidebar.scss';

export default function NotificationModal({ note, onClose, onOpenEvent }) {
  const modalRef = useRef(null);

  useEffect(() => {
    // autofocus the modal for accessibility
    if (modalRef.current) {
      modalRef.current.focus();
    }
  }, []);

  if (!note) return null;

  return createPortal(
    <div className="notif-modal-overlay" onClick={onClose}>
      <div
        className="notif-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="notif-modal-title"
        tabIndex={-1}
        ref={modalRef}
      >
        <div className="notif-modal-header">
          <h4 id="notif-modal-title">{note.type?.replace(/_/g, ' ') || 'Notification'}</h4>
          <button className="close-btn" onClick={onClose} aria-label="Close notification">×</button>
        </div>
        <div className="notif-modal-body">
          <p className="modal-message">{note.message}</p>
          <p className="modal-meta">{new Date(note.createdAt).toLocaleString()}</p>
        </div>
        <div className="notif-modal-actions">
          {note.data?.eventId && (
            <button className="goto-btn" onClick={() => onOpenEvent(note)}>Open Event</button>
          )}
          <button className="close-secondary" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>,
    document.body
  );
}
