const ROLES = Object.freeze({
    ADMIN: 'ADMIN',
    CAMPUS_ADMIN: 'CAMPUS_ADMIN',
    FACILITY_MANAGER: 'FACILITY_MANAGER',
    ORGANIZER: 'ORGANIZER',
    ATTENDEE: 'ATTENDEE',
});

// Admin capabilities by role type
const ADMIN_CAPABILITIES = Object.freeze({
    ADMIN: [
        'MANAGE_ALL_USERS',
        'MANAGE_ALL_VENUES',
        'MANAGE_ALL_EVENTS',
        'MANAGE_ALL_APPROVALS',
        'MANAGE_POLICIES',
        'VIEW_ALL_ANALYTICS',
        'MANAGE_SYSTEM_SETTINGS',
        'MANAGE_MULTI_CAMPUS',
    ],
    CAMPUS_ADMIN: [
        'VIEW_CAMPUS_EVENTS',
        'MANAGE_CAMPUS_APPROVALS',
        'VIEW_ANALYTICS',
        'SET_POLICIES',
        'COORDINATE_RESOURCES',
        'ENSURE_COMPLIANCE',
    ],
    FACILITY_MANAGER: [
        'MANAGE_VENUES',
        'MANAGE_VENUE_AVAILABILITY',
        'PROCESS_BOOKINGS',
        'MANAGE_MAINTENANCE',
        'VIEW_UTILIZATION_REPORTS',
        'SUPPORT_EVENT_SETUP',
    ],
});

// Check if a role has a specific capability
const hasCapability = (role, capability) => {
    const capabilities = ADMIN_CAPABILITIES[role];
    if (!capabilities) return false;
    return capabilities.includes(capability) || role === ROLES.ADMIN;
};

// Get all admin roles
const getAdminRoles = () => [ROLES.ADMIN, ROLES.CAMPUS_ADMIN, ROLES.FACILITY_MANAGER];

module.exports = { 
    ...ROLES,
    ROLES,
    ADMIN_CAPABILITIES,
    hasCapability,
    getAdminRoles,
};
