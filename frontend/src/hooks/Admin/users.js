import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../utils/api';

const getErrorMessage = (err, fallback) => {
  return (
    err?.response?.data?.message ||
    err?.response?.data?.error ||
    err?.message ||
    fallback
  );
};

const useUsers = (initialPage = 1, initialLimit = 10) => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [totalPages, setTotalPages] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);

  const navigate = useNavigate();

  const fetchUsers = async (page = currentPage, pageSize = initialLimit) => {
    setLoading(true);
    setError('');

    try {
      const params = {
        page,
        pageSize,
        role: roleFilter,
      };

      if (search.trim()) {
        params.query = search.trim();
      }

      const response = await api.get('/admin/users', { params });
      const payload = response?.data || {};
      const rows = Array.isArray(payload.data) ? payload.data : [];
      const meta = payload.meta || {};

      setUsers(rows);
      setTotalUsers(typeof meta.totalItems === 'number' ? meta.totalItems : rows.length);
      setTotalPages(typeof meta.totalPages === 'number' ? meta.totalPages : 1);
      setCurrentPage(typeof meta.currentPage === 'number' ? meta.currentPage : page);
    } catch (err) {
      if (err?.response?.status === 401 || err?.response?.status === 403) {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('user');
        navigate('/login');
      }

      setUsers([]);
      setTotalUsers(0);
      setTotalPages(1);
      setError(getErrorMessage(err, 'Failed to fetch users.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers(currentPage, initialLimit);
  }, [search, roleFilter, currentPage, initialLimit]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, roleFilter]);

  const handleAddUser = async (userData) => {
    setLoading(true);
    setError('');

    try {
      const response = await api.post('/admin/users', userData);
      const newUser = response?.data?.data || response?.data;

      if (newUser?.id) {
        setUsers((prev) => [newUser, ...prev]);
        setTotalUsers((prev) => prev + 1);
      }

      return newUser;
    } catch (err) {
      if (err?.response?.status === 401 || err?.response?.status === 403) {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('user');
        navigate('/login');
      }

      const message = getErrorMessage(err, 'Failed to add user.');
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateUser = async (userId, userData) => {
    setLoading(true);
    setError('');

    try {
      const response = await api.patch(`/admin/users/${userId}`, userData);
      const updatedUser = response?.data?.data || response?.data;

      if (updatedUser?.id) {
        setUsers((prev) => prev.map((user) => (user.id === userId ? updatedUser : user)));
      } else {
        fetchUsers(currentPage, initialLimit);
      }
    } catch (err) {
      if (err?.response?.status === 401 || err?.response?.status === 403) {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('user');
        navigate('/login');
      }

      const message = getErrorMessage(err, 'Failed to update user.');
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (userId) => {
    setLoading(true);
    setError('');

    try {
      await api.delete(`/admin/users/${userId}`);
      setUsers((prev) => prev.filter((user) => user.id !== userId));
      setSelectedIds((prev) => prev.filter((id) => id !== userId));
      setTotalUsers((prev) => Math.max(0, prev - 1));
    } catch (err) {
      if (err?.response?.status === 401 || err?.response?.status === 403) {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('user');
        navigate('/login');
      }

      const message = getErrorMessage(err, 'Failed to delete user.');
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const handleBulkDelete = async (userIds) => {
    setLoading(true);
    setError('');

    try {
      await Promise.all(userIds.map((id) => api.delete(`/admin/users/${id}`)));
      setUsers((prev) => prev.filter((user) => !userIds.includes(user.id)));
      setSelectedIds((prev) => prev.filter((id) => !userIds.includes(id)));
      setTotalUsers((prev) => Math.max(0, prev - userIds.length));
    } catch (err) {
      if (err?.response?.status === 401 || err?.response?.status === 403) {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('user');
        navigate('/login');
      }

      const message = getErrorMessage(err, 'Failed to bulk delete users.');
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const toggleSelect = (id) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  };

  const toggleSelectAll = (currentUsersOnPage) => {
    const idsOnPage = currentUsersOnPage.map((user) => user.id);

    setSelectedIds((prev) =>
      prev.length === idsOnPage.length
        ? prev.filter((id) => !idsOnPage.includes(id))
        : [...new Set([...prev, ...idsOnPage])]
    );
  };

  const clearSelections = () => {
    setSelectedIds([]);
  };

  const refetch = () => {
    fetchUsers(currentPage, initialLimit);
  };

  return {
    users,
    loading,
    error,
    selectedIds,
    search,
    setSearch,
    roleFilter,
    setRoleFilter,
    currentPage,
    setCurrentPage,
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