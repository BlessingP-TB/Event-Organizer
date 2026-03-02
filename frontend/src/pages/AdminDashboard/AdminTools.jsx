import React, { useState, useEffect } from "react";
import "../../styles/pages/_resources.scss";
import { MdAddCircle, MdDelete, MdEdit } from "react-icons/md";

export default function ResourcesManagement() {
  const [resources, setResources] = useState([]);
  const [resourceData, setResourceData] = useState({
    name: "",
    quantity: "",
  });
  const [editId, setEditId] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [loading, setLoading] = useState(true);

  // Fetch resources from backend
  const fetchResources = async () => {
  const token = localStorage.getItem("accessToken");
  if (!token) {
    setLoading(false);
    return;
  }
  try {
    const res = await fetch("http://localhost:3000/tools", {
      headers: {
        Authorization: `Bearer ${token}`,
        "Cache-Control": "no-cache",
      },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const response = await res.json();

    // ✅ Handle paginated response structure
    const toolsArray = Array.isArray(response.data) 
      ? response.data 
      : (Array.isArray(response) ? response : []);

    setResources(toolsArray);
  } catch (err) {
    console.error("Failed to fetch resources:", err);
    alert("Failed to load resources. Check console.");
  } finally {
    setLoading(false);
  }
};

  useEffect(() => {
    fetchResources();
  }, []);

  const openModal = (resource = null) => {
    if (resource) {
      setResourceData({
        name: resource.name,
        quantity: resource.quantity.toString(),
      });
      setEditId(resource.id);
    } else {
      setResourceData({ name: "", quantity: "" });
      setEditId(null);
    }
    setModalVisible(true);
  };

  const handleSave = async () => {
    const { name, quantity } = resourceData;
    if (!name || !quantity) {
      alert("Please fill in all fields.");
      return;
    }

    const token = localStorage.getItem("accessToken");
    if (!token) {
      alert("Session expired.");
      return;
    }

    const payload = {
      name,
      quantity: parseInt(quantity, 10),
    };

    try {
      const url = editId
        ? `http://localhost:3000/admin/tools/${editId}`
        : "http://localhost:3000/admin/tools";
      const method = editId ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "Cache-Control": "no-cache",
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Save failed");

      await fetchResources();
      setModalVisible(false);
      setResourceData({ name: "", quantity: "" });
    } catch (err) {
      console.error("Save error:", err);
      alert("Failed to save resource");
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Are you sure you want to delete this resource?")) return;
    const token = localStorage.getItem("accessToken");
    if (!token) return;

    try {
      const res = await fetch(`http://localhost:3000/admin/tools/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
          "Cache-Control": "no-cache",
        },
      });
      if (!res.ok) throw new Error("Delete failed");
      await fetchResources();
    } catch (err) {
      console.error("Delete error:", err);
      alert("Failed to delete resource");
    }
  };

  return (
    <div className="resources-management-container">
      <h2 className="header">Resources Management</h2>
      <button className="add-button" onClick={() => openModal()}>
        <MdAddCircle size={20} style={{ marginRight: 5 }} /> Add Resource
      </button>

      {loading && <p style={{ textAlign: "center" }}>Loading resources...</p>}
      {!loading && resources.length === 0 && (
        <p className="empty-text">No resources available</p>
      )}

      <div className="resources-list">
        {resources.map((item) => (
          <div className="resource-card" key={item.id}>
            <h3>{item.name}</h3>
            <p>Quantity: {item.quantity}</p>
            <div className="actions">
              <button onClick={() => openModal(item)}>
                <MdEdit /> Edit
              </button>
              <button onClick={() => handleDelete(item.id)}>
                <MdDelete /> Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      {modalVisible && (
        <div className="modal-overlay">
          <div className="modal">
            <h3 className="modal-header">{editId ? "Edit Resource" : "Add Resource"}</h3>

            <input
              className="input"
              type="text"
              placeholder="Resource Name (e.g., Chair, Mic, Projector)"
              value={resourceData.name}
              onChange={(e) =>
                setResourceData({ ...resourceData, name: e.target.value })
              }
            />
            <input
              className="input"
              type="number"
              placeholder="Quantity"
              value={resourceData.quantity}
              onChange={(e) =>
                setResourceData({ ...resourceData, quantity: e.target.value })
              }
            />
            <div className="modal-actions">
              <button onClick={handleSave}>{editId ? "Update" : "Save"}</button>
              <button onClick={() => setModalVisible(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
