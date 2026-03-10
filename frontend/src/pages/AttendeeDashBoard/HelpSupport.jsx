import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaEnvelope, FaExclamationTriangle, FaComments } from "react-icons/fa";
import toast from "react-hot-toast";
import api from "../../utils/api";
import "../../styles/pages/_helpSupport.scss";

const HelpSupport = () => {
  const navigate = useNavigate();
  const [category, setCategory] = useState("ORGANIZER_CONTACT");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const userEmail = useMemo(() => {
    try {
      const user = JSON.parse(localStorage.getItem("user") || "{}");
      return user?.email || "";
    } catch {
      return "";
    }
  }, []);

  const organizerContact = "support@smartevents.local";

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (subject.trim().length < 5) {
      toast.error("Subject must be at least 5 characters.");
      return;
    }

    if (message.trim().length < 20) {
      toast.error("Message must be at least 20 characters.");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await api.post("/support/requests", {
        category,
        subject: subject.trim(),
        message: message.trim(),
      });

      const reference = response?.data?.data?.reference;
      toast.success(reference ? `Support request submitted. Ref: ${reference}` : "Support request submitted.");
      setSubject("");
      setMessage("");
      setCategory("ORGANIZER_CONTACT");
    } catch (error) {
      const apiMessage = error?.response?.data?.message;
      toast.error(apiMessage || "Failed to submit support request.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="help-support-page">
      <header className="help-support-header">
        <h1>Help / Support</h1>
        <p>Contact organizers or report issues.</p>
      </header>

      <div className="help-support-grid">
        <article className="help-card compact">
          <FaComments className="help-icon" aria-hidden="true" />
          <FaExclamationTriangle className="help-icon" aria-hidden="true" />
          <h2>Submit Support Request</h2>
          <p>Contact organizers or report technical issues directly from your dashboard.</p>

          <form className="support-form" onSubmit={handleSubmit}>
            <label htmlFor="support-category">Category</label>
            <select
              id="support-category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              disabled={isSubmitting}
            >
              <option value="ORGANIZER_CONTACT">Contact Organizers</option>
              <option value="TECHNICAL_ISSUE">Technical Issue</option>
              <option value="TICKET_PAYMENT">Ticket/Payment</option>
              <option value="GENERAL">General</option>
            </select>

            <label htmlFor="support-subject">Subject</label>
            <input
              id="support-subject"
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Short summary of your issue"
              disabled={isSubmitting}
            />

            <label htmlFor="support-message">Message</label>
            <textarea
              id="support-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Describe what happened and what help you need"
              rows={6}
              disabled={isSubmitting}
            />

            <button className="help-btn" type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Submitting..." : "Submit Request"}
            </button>
          </form>
        </article>
      </div>

      <div className="help-footer-note">
        <FaEnvelope aria-hidden="true" />
        <span>Direct support email: {organizerContact}</span>
      </div>

      <button type="button" className="back-btn" onClick={() => navigate("/attendee")}>Back to Dashboard</button>
    </section>
  );
};

export default HelpSupport;
