// src/pages/AdminDashboard/UserManagement.jsx
import React, { useMemo } from "react";
import useUsers from '../../hooks/Admin/users';
import "../../styles/pages/_usermanagement.scss";

const UserManagement = () => {
  const {
    users,
    loading,
    error,
    search,
    setSearch,
    roleFilter,
    setRoleFilter,
    currentPage,
    setCurrentPage,
    totalPages,
    totalUsers,
    handleDeleteUser,
  } = useUsers(1, 10);

  // Filter users based on search and role
  const filteredUsers = useMemo(() => {
    return users.filter(user => {
      const matchesSearch =
        user.name.toLowerCase().includes(search.toLowerCase()) ||
        user.email.toLowerCase().includes(search.toLowerCase()) ||
        user.role.toLowerCase().includes(search.toLowerCase());

      const matchesRole = roleFilter === "all" || user.role === roleFilter;

      return matchesSearch && matchesRole;
    });
  }, [users, search, roleFilter]);

  const handleDelete = async (id) => {
    const confirmed = window.confirm("Are you sure you want to delete this user?");
    if (!confirmed) return;

    try {
      await handleDeleteUser(id);
    } catch (_err) {
      console.error('Error deleting user:', _err);
    }
  };

  return (
    <div className="user-management-page">
      <h1>User Management</h1>

      {error && <p className="error-message">{error}</p>}

      <div className="filters">
        <input
          type="text"
          placeholder="Search by name, email, or role..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
          <option value="all">All Roles</option>
          <option value="ATTENDEE">Attendees</option>
          <option value="ADMIN">Admins</option>
          <option value="ORGANIZER">Organizers</option>
        </select>
      </div>

      <table className="users-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Role</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {loading && filteredUsers.length === 0 ? (
            <tr>
              <td colSpan={4} style={{ textAlign: "center" }}>Loading...</td>
            </tr>
          ) : filteredUsers.length > 0 ? (
            filteredUsers.map((user) => (
              <tr key={user.id}>
                <td>{user.name}</td>
                <td>{user.email}</td>
                <td>{user.role}</td>
                <td>
                  <button className="view-btn" onClick={() => alert(`Name: ${user.name}\nEmail: ${user.email}\nRole: ${user.role}`)}>
                    View
                  </button>
                  <button className="delete-btn" onClick={() => handleDelete(user.id)}>
                    Delete
                  </button>
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={4} style={{ textAlign: "center" }}>No users found.</td>
            </tr>
          )}
        </tbody>
      </table>

      {totalPages > 1 && (
        <div className="pagination">
          <button
            disabled={currentPage === 1 || loading}
            onClick={() => setCurrentPage(prev => prev - 1)}
          >
            Prev
          </button>
          <span>
            Page {currentPage} of {totalPages} (Total: {totalUsers})
          </span>
          <button
            disabled={currentPage === totalPages || loading}
            onClick={() => setCurrentPage(prev => prev + 1)}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};

export default UserManagement;
