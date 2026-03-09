// frontend/src/components/Footer.jsx
import React from "react";
import {
  Mail,
  Phone,
  MapPin,
  Facebook,
  Instagram,
  Twitter,
  Linkedin,
  ExternalLink,
} from "lucide-react";
import "../styles/components/_footer.scss";

export default function Footer() {
  const campuses = {
    polokwane: {
      lat: -23.9045,
      lng: 29.4584,
      name: "Polokwane Campus"
    },
    emalahleni: {
      lat: -25.876,
      lng: 29.2335,
      name: "Emalahleni Campus"
    },
  };

  const openDirections = (campus) => {
    const url = `https://www.google.com/maps/dir/?api=1&origin=My+Location&destination=${campus.lat},${campus.lng}&travelmode=driving`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const socialLinks = [
    { href: "https://www.facebook.com/TshwaneUniversityofTechnology/", icon: Facebook, label: "Facebook" },
    { href: "https://twitter.com/Official_TUT", icon: Twitter, label: "Twitter" },
    { href: "https://www.linkedin.com/school/tshwane-university-of-technology/", icon: Linkedin, label: "LinkedIn" },
    { href: "https://www.instagram.com/tut_official2/", icon: Instagram, label: "Instagram" }
  ];

  const attendeeLinks = [
    { href: "/attendee", label: "Attendee Dashboard" },
    { href: "/attendee/my-events", label: "Upcoming Events" },
    { href: "/attendee/qr-code", label: "My Tickets" },
    { href: "/attendee/rate-events", label: "Submit Feedback" }
  ];

  const organizerLinks = [
    { href: "/create-event", label: "Create Event" },
    { href: "/organizer/events", label: "Manage Events" },
    { href: "/organizer/analytics", label: "Event Analytics" }
  ];

  const quickLinks = [
    { href: "/about", label: "About Us" },
    { href: "/privacy", label: "Privacy Policy" },
    { href: "/terms", label: "Terms of Service" },
    { href: "/support", label: "Support" }
  ];

  return (
    <footer className="footer-pro">
      <div className="footer-pro-container">

        {/* BRAND */}
        <div className="footer-pro-section brand">
          <h2 className="footer-pro-logo">Smart Event System</h2>
          <p className="footer-pro-desc">
            An intelligent and seamless event management platform for both organizers and attendees.
          </p>

          <div className="footer-pro-socials">
            {socialLinks.map((social) => (
              <a key={social.label} href={social.href} target="_blank" rel="noopener noreferrer" className="social-icon">
                <social.icon size={20} />
              </a>
            ))}
          </div>
        </div>

        {/* CONTACT SECTION */}
        <div className="footer-pro-section">
          <h4>Contact Us</h4>
          <ul className="footer-pro-list">
            <li>
              <Mail size={18} />
              <a href="mailto:eventsupport@tut.ac.za">eventsupport@tut.ac.za</a>
            </li>

            <li>
              <Phone size={18} />
              <a href="tel:+27123456789">+27 12 345 6789</a>
            </li>

            <li className="footer-campus" onClick={() => openDirections(campuses.polokwane)}>
              <MapPin size={18} />
              <span>Polokwane Campus</span>
              <ExternalLink size={14} className="external-icon" />
            </li>

            <li className="footer-campus" onClick={() => openDirections(campuses.emalahleni)}>
              <MapPin size={18} />
              <span>Emalahleni Campus</span>
              <ExternalLink size={14} className="external-icon" />
            </li>
          </ul>
        </div>
      </div>

      {/* BOTTOM BAR */}
      <div className="footer-pro-bottom">
        <p>© {new Date().getFullYear()} Smart Event System. All Rights Reserved.</p>
        <span className="design-credit">Designed by TUT ICEP TEAM 2025</span>
      </div>
    </footer>
  );
}
