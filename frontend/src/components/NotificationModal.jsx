import React from 'react';
import { createPortal } from 'react-dom';
import '../styles/components/_sidebar.scss';

export default function NotificationModal({ note, onClose, onOpenEvent }) {
  if (!note) return null;

  return createPortal(
    <div className="notif-modal-overlay" onClick={onClose}>
      <div className="notif-modal" onClick={(e) => e.stopPropagation()}>
        <div className="notif-modal-header">
          <h4>{note.type?.replace(/_/g, ' ') || 'Notification'}</h4>
          <button className="close-btn" onClick={onClose}>×</button>
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
