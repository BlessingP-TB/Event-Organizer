import React, { useState } from 'react';
import '../styles/components/_termsCheckbox.scss';

export default function TermsCheckbox({ onDecision, initialDecision = null }) {
  const [showTerms, setShowTerms] = useState(false);
  const [decision, setDecision] = useState(initialDecision);

  const termsText = `VENUE BOOKING APPLICATION

The institution may grant the APPLICANT permission to use the following in terms of the conditions set out:
• Facilities for sport are booked through the Sport Division (012) 382-5399/4121
• Residence facilities are booked through the Residence Division (012) 382-4856
• Promotional events on campus are booked through Corporate Affairs and Marketing (012) 382-6542

On approval of an application, both parties should complete, sign and date the form.

CONDITIONS:

1. Only someone who has been duly authorised may sign the AA02 form.
2. Cancellations should be made in writing to the Facility Management Office at least five workdays before the relevant function starts.
3. The APPLICANT is responsible for all costs as determined by the institution.
4. The APPLICANT indemnifies the institution against any claims, losses, damages, or liabilities arising from the use of the venue.
5. The APPLICANT must ensure that the venue is left in the same condition as received.
6. No alterations, additions, or modifications may be made to the venue without prior written consent.
7. The institution reserves the right to cancel or reschedule bookings with reasonable notice.
8. All applicable laws, regulations, and institutional policies must be adhered to during the event.
9. The APPLICANT is responsible for obtaining any necessary licenses or permits.
10. Payment terms must be adhered to as specified in the booking agreement.

By accepting these terms, you acknowledge that you have read, understood, and agree to be bound by all conditions set forth in this venue booking application.`;

  return (
    <div className="terms-checkbox-wrapper">
      <label className="terms-checkbox-label">
        <input
          type="checkbox"
          checked={decision === true}
          onChange={() => setShowTerms(true)}
        />
        <span>I have read and accept the terms and conditions</span>
      </label>

      {showTerms && (
        <div className="terms-modal">
          <div>
            <h3>Terms and Conditions</h3>

            <div className="terms-content">
              {termsText.split('\n').map((line, index) => (
                <p key={index}>{line}</p>
              ))}
            </div>

            <div className="terms-actions">
              <button
                className="btn-accept"
                type="button"
                onClick={() => {
                  setDecision(true);
                  setShowTerms(false);
                  onDecision(true);
                }}
              >
                Accept
              </button>
              <button
                className="btn-decline"
                type="button"
                onClick={() => {
                  setDecision(false);
                  setShowTerms(false);
                  onDecision(false);
                }}
              >
                Decline
              </button>
            </div>
          </div>
        </div>
      )}

      {decision === false && (
        <p className="terms-error">
          You must accept the terms and conditions to proceed with your booking.
        </p>
      )}
    </div>
  );
}