// src/hooks/Admin/users.js
import { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
// Add the import for the refresh helper
// import { refreshToken } from '../../utils/auth'; // Adjust the path as needed

const useUsers = (initialPage = 1, initialLimit = 10) => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(''); // Consider using a more specific error state if needed
  const [selectedIds, setSelectedIds] = useState([]);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [totalPages, setTotalPages] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);

  const navigate = useNavigate();

  // Replace the entire fetchUsers function with this one
  const fetchUsers = async (page = currentPage, limit = initialLimit) => {
    setLoading(true);
    setError('');
    try {
      // Define the request logic inside the try block to ensure fresh token fetch
      const requestFn = async () => {
        const token = localStorage.getItem('accessToken'); // Fetch token *inside* the request function
        console.log("Using token:", token);
        if (!token) {
          throw new Error('Authentication token missing.');
        }

        // Add Cache-Control: no-cache to bypass browser cache
        // This tells the browser to always ask the server for the latest data
        // and should prevent the 304 Not Modified response when data *has* changed.
        return await axios.get(`http://localhost:3000/admin/users`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Cache-Control': 'no-cache' // <-- Add this header
          },
          params: {
            page,
            limit,
            search,
            role: roleFilter
          }
        });
      };

      // Generic function to make authenticated API calls with refresh logic
      // Treat 304 as a potential token expiry signal needing refresh (though less likely now with 100h token)
      // The primary goal of this hook is now to handle the 304 caused by ETag caching.
      const makeAuthenticatedRequest = async (requestFn) => {
        let response = await requestFn(); // First, make the request

        // Check if the initial response status is 304 (Not Modified)
        // We treat this as a signal that the token might be expired/stale or ETag caused cache hit.
        if (response.status === 304) {
            console.log(`Received 304, attempting refresh (or clearing cache effect)...`);
            try {
              // Attempt to refresh the token (might be needed if expiry changed back or unexpectedly)
              // await refreshToken();
              console.log("Token refreshed successfully, retrying original request...");
              // If refresh was successful, retry the original request with the new token
              // Get the new token from localStorage (it was updated by refreshToken)
              const newToken = localStorage.getItem('accessToken');
              if (newToken) {
                // Create a *new* request function using the updated token
                // Also include the no-cache header for the retry
                const newRequestFn = async () => {
                    return await axios.get(`http://localhost:3000/admin/users`, {
                        headers: {
                            'Authorization': `Bearer ${newToken}`, // Use the new token
                            'Cache-Control': 'no-cache' // <-- Add this header to retry too
                        },
                        params: {
                            page,
                            limit,
                            search,
                            role: roleFilter
                        }
                    });
                };
                // Retry the request with the new token
                response = await newRequestFn();
                // Return the response from the successful retry (should be 200)
                return response;
              } else {
                // This shouldn't happen if refreshToken was successful, but just in case
                console.error("New token not found after refresh.");
                throw new Error("Token refresh failed.");
              }
            } catch (refreshError) {
              console.error("Token refresh failed:", refreshError);
              // If refresh also fails, navigate to login
              localStorage.removeItem('accessToken');
              localStorage.removeItem('user');
              navigate('/login');
              throw refreshError; // Propagate the error
            }
          } catch (refreshError) {
            console.error("Token refresh failed:", refreshError);
            // If refresh also fails, navigate to login
            localStorage.removeItem('accessToken');
            localStorage.removeItem('user');
            navigate('/login');
            throw refreshError; // Propagate the error
          }
        }
        // If the initial response was not 304, return it as-is
        return response;
      };

      // Use the helper function to handle the request and potential refresh
      const response = await makeAuthenticatedRequest(requestFn);

      // Adjust based on your backend response structure
      // The backend service returns {  [...], meta: {...} }
      if (response.status === 200) { // Only process data if status is 200
        // Access the actual user array from the paginated response
        setUsers(response.data.data || response.data); // Use response.data.data if paginated
        // Access pagination metadata
        const meta = response.data.meta;
        setTotalUsers(meta?.totalItems || response.data.length); // Adjust if backend provides total count
        if (meta?.totalPages) setTotalPages(meta.totalPages);
        if (meta?.currentPage) setCurrentPage(meta.currentPage); // Update current page if backend provides it
      } else if (response.status === 304) {
        // This path should now only be reached if the *retry* after refresh also resulted in 304.
        // This would mean the resource state genuinely hasn't changed even with the new token and cache-control.
        // Or, theoretically, if the refresh token logic failed silently *after* the initial 304 check
        // but *before* the retry (though the try/catch should prevent this).
        console.warn("Received 304 after refresh retry. State might be cached or unchanged.");
        setUsers([]); // Or keep previous state? Depends on UX requirements.
        setTotalUsers(0);
        setTotalPages(1);
        setCurrentPage(1);
      }

    } catch (err) {
      console.error('Error fetching users:', err);
      // This catch block now handles errors from:
      // - requestFn() if status is 4xx/5xx or network error
      // - refreshToken() if it fails and throws
      // - makeAuthenticatedRequest if the retry after refresh fails
      // setError(err.message || 'Failed to fetch users.');
      // The refresh failure and subsequent logout are handled inside makeAuthenticatedRequest.
      // If we get here due to a 4xx/5xx from the initial request (not 304), it means the token was valid
      // but the request failed for another reason (e.g., 403 Forbidden).
      // If the error is due to refresh failure, navigation already happened.
      // If the error is due to the *retry* after refresh failing, navigation might happen inside makeAuthenticatedRequest.
      // If the error is the initial request failing (not 304), handle it appropriately.
      if (err.response?.status === 401 || err.response?.status === 403) {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('user');
        navigate('/login');
      }
    } finally {
      setLoading(false);
    }
  };

  // ... (rest of the hook remains the same) ...
  // Fetch users when filters or page change
  useEffect(() => {
    fetchUsers(currentPage, initialLimit);
  }, [search, roleFilter, currentPage, initialLimit]); // Re-fetch when filters or current page changes


  const handleAddUser = async (userData) => {
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        throw new Error('Authentication token missing.');
      }

      // --- Make the actual API call ---
      const response = await axios.post(`http://localhost:3000/admin/user`, userData, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const newUser = response.data; // Assuming the backend returns the created user object

      // --- Update state optimistically or refetch ---
      // Option 1: Add the new user to the state (optimistic update)
      setUsers(prev => [...prev, newUser]);

      // Option 2: Refetch the user list to ensure consistency
      // await fetchUsers(currentPage, initialLimit); // Uncomment if you prefer to refetch

      return newUser; // Return the new user object if needed by the component

    } catch (err) {
      console.error('Error adding user:', err);
      setError(err.message || 'Failed to add user.');
      if (err.response?.status === 401 || err.response?.status === 403) {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('user');
        navigate('/login');
      }
      throw err; // Re-throw to handle in the component if needed
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateUser = async (userId, userData) => {
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        throw new Error('Authentication token missing.');
      }

      // --- Make the actual API call ---
      const response = await axios.patch(`http://localhost:3000/admin/users/${userId}`, userData, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const updatedUser = response.data; // Assuming the backend returns the updated user object

      // --- Update state optimistically or refetch ---
      // Option 1: Update the user in the state (optimistic update)
      setUsers(prev => prev.map(u => u.id === userId ? updatedUser : u));

      // Option 2: Refetch the user list to ensure consistency
      // await fetchUsers(currentPage, initialLimit); // Uncomment if you prefer to refetch

    } catch (err) {
      console.error('Error updating user:', err);
      setError(err.message || 'Failed to update user.');
      if (err.response?.status === 401 || err.response?.status === 403) {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('user');
        navigate('/login');
      }
      throw err; // Re-throw to handle in the component if needed
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (userId) => {
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        throw new Error('Authentication token missing.');
      }

      // --- Make the actual API call ---
      await axios.delete(`http://localhost:3000/admin/users/${userId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      // --- Update state optimistically or refetch ---
      // Option 1: Remove the user from the state (optimistic update)
      setUsers(prev => prev.filter(u => u.id !== userId));
      setSelectedIds(prev => prev.filter(id => id !== userId)); // Deselect if deleted

      // Option 2: Refetch the user list to ensure consistency
      // await fetchUsers(currentPage, initialLimit); // Uncomment if you prefer to refetch

    } catch (err) {
      console.error('Error deleting user:', err);
      setError(err.message || 'Failed to delete user.');
      if (err.response?.status === 401 || err.response?.status === 403) {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('user');
        navigate('/login');
      }
      throw err; // Re-throw to handle in the component if needed
    } finally {
      setLoading(false);
    }
  };

  const handleBulkDelete = async (userIds) => {
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        throw new Error('Authentication token missing.');
      }

      // --- Make the actual API call ---
      // Assuming your backend has an endpoint for bulk deletion
      // e.g., DELETE /admin/users/bulk with { ids: userIds } in the request body
      await axios.delete(`http://localhost:3000/admin/users/bulk`, {
        headers: {
          'Authorization': `Bearer ${token}`
        },
        data: { ids: userIds } // Send the IDs in the request body
      });

      // --- Update state optimistically or refetch ---
      // Option 1: Remove the users from the state (optimistic update)
      setUsers(prev => prev.filter(u => !userIds.includes(u.id)));
      setSelectedIds(prev => prev.filter(id => !userIds.includes(id)));

      // Option 2: Refetch the user list to ensure consistency
      // await fetchUsers(currentPage, initialLimit); // Uncomment if you prefer to refetch

    } catch (err) {
      console.error('Error bulk deleting users:', err);
      setError(err.message || 'Failed to bulk delete users.');
      if (err.response?.status === 401 || err.response?.status === 403) {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('user');
        navigate('/login');
      }
      throw err; // Re-throw to handle in the component if needed
    } finally {
      setLoading(false);
    }
  };

  // Function to toggle selection of a single user
  const toggleSelect = (id) => {
    setSelectedIds(prev =>
      prev.includes(id)
        ? prev.filter(i => i !== id)
        : [...prev, id]
    );
  };

  // Function to select/deselect all users on the current page
  const toggleSelectAll = (currentUsersOnPage) => {
    const idsOnPage = currentUsersOnPage.map(u => u.id);
    setSelectedIds(prev =>
      prev.length === idsOnPage.length
        ? prev.filter(id => !idsOnPage.includes(id)) // Deselect if all are selected
        : [...new Set([...prev, ...idsOnPage])] // Select all on page, avoid duplicates
    );
  };

  // Function to clear all selections
  const clearSelections = () => {
    setSelectedIds([]);
  };

  // Function to refetch users (e.g., after a mutation)
  const refetch = () => {
    fetchUsers(currentPage, initialLimit);
  };

  // Calculate current users for pagination display based on state
  // Note: If backend handles pagination, this calculation might be redundant.
  // If frontend handles pagination of a large fetched list, use this:
  // const usersPerPage = 5; // Or get from props
  // const indexOfLast = currentPage * usersPerPage;
  // const indexOfFirst = indexOfLast - usersPerPage;
  // const currentUsers = users.slice(indexOfFirst, indexOfLast);
  // const totalPages = Math.ceil(users.length / usersPerPage);

  // For backend pagination, currentUsers can just be the 'users' state
  const currentUsers = users;

  return {
    users: currentUsers, // Or the slice if frontend paginating
    loading,
    error,
    selectedIds,
    search,
    setSearch, // Allow parent to control search
    roleFilter,
    setRoleFilter, // Allow parent to control role filter
    currentPage,
    setCurrentPage, // Allow parent to control page
    totalPages,
    totalUsers,
    handleAddUser,
    handleUpdateUser,
    handleDeleteUser,
    handleBulkDelete,
    toggleSelect,
    toggleSelectAll,
    clearSelections,
    refetch,
  };
};

export default useUsers;