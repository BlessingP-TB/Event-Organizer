// frontend/src/constants/sidebarLinks.js
import { Home, Calendar, Star, Ticket, User, Plus, ListOrdered } from "lucide-react";

export const attendeeLinks = [
  {
    category: "General",
    items: [
      { name: "Home", path: "/attendee", icon: Home },
      { name: "Profile", path: "/attendee/profile", icon: User }
    ]
  },
  {
    category: "Events",
    items: [
      { name: "My Events", path: "/attendee/my-events", icon: Ticket },
    ]
  }
];

export const organizerLinks = [
  {
    category: "General",
    items: [
      { name: "Dashboard", path: "/organizer", icon: Home },
      { name: "Profile", path: "/organizer/profile", icon: User },
    ]
  },
  {
    category: "Event Management",
    items: [
      { name: "Create Event", path: "/organizer/create-event", icon: Plus },
      { name: "My Events", path: "/organizer/events", icon: Calendar },
    ]
  },
  {
    category: "Others",
    items: [
      { name: "Discover Events", path: "/organizer/discover", icon: ListOrdered },
      { name: "Ratings", path: "/organizer/ratings", icon: Star },
    ]
  }
];

export const adminLinks = [
  {
    category: "Dashboard",
    items: [
      { name: "Overview", path: "/admin", icon: Home },
    ]
  },
  {
    category: "Management",
    items: [
      { name: "Users", path: "/admin/user-management", icon: User },
      { name: "Events", path: "/admin/approvals", icon: Calendar },
      { name: "Venues", path: "/admin/venue-management", icon: Ticket }
    ]
  },
  {
    category: "Analytics",
    items: [
      { name: "Reports", path: "/admin/export", icon: Star }
    ]
  },
  {
    category: "Settings",
    items: [
      { name: "Profile", path: "/admin/profile", icon: User }
    ]
  }
];
