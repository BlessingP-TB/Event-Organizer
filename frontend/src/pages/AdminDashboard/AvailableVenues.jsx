// src/pages/Admin/AvailableVenues.jsx
import React, { useState, useEffect } from "react";
import api from "../../utils/api";
import "../../styles/pages/_availablevenues.scss";
import { MdAddCircle, MdImage, MdDelete, MdEdit } from "react-icons/md";
import { Carousel } from "react-responsive-carousel";
import "react-responsive-carousel/lib/styles/carousel.min.css";

export default function AvailableVenues() {
  const [venues, setVenues] = useState([]);
  const [venueData, setVenueData] = useState({
    name: "",
    location: "",
    price: "",
    capacity: "",
    type: "",
    rateType: "PER_DAY",
    images: [],
  });
  const [editId, setEditId] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchVenues = async () => {
    const token = localStorage.getItem("accessToken");
    if (!token) {
      setLoading(false);
      return;
    }
    try {
      const res = await api.get("/venues");
      let data = res.data;

      let list = [];
      if (Array.isArray(data)) list = data;
      else if (Array.isArray(data.items)) list = data.items;
      else if (Array.isArray(data.data)) list = data.data;

      const normalized = list
        .filter((v) => v.id)
        .map((v) => ({
          id: v.id,
          name: v.name || "",
          location: v.location || "",
          price: Number(v.price) || 0,
          capacity: Number(v.capacity) || 0,
          type: v.type || "HALL",
          rateType: v.rateType || "PER_DAY",
          imageUrls: v.imageUrls || [],
        }));

      setVenues(normalized);
    } catch (err) {
      console.error("Failed to load venues:", err);
      if (err.message?.includes("401") || err.message?.includes("403")) {
        localStorage.removeItem("accessToken");
        localStorage.removeItem("user");
        window.location.href = "/login";
      } else {
        alert("Failed to load venues. Check console.");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVenues();
  }, []);

  const openModal = (venue = null) => {
    if (venue) {
      setVenueData({
        name: venue.name,
        location: venue.location,
        price: venue.price?.toString() || "",
        capacity: venue.capacity?.toString() || "",
        type: venue.type,
        rateType: venue.rateType,
        images: venue.imageUrls || [],
      });
      setEditId(venue.id);
    } else {
      setVenueData({
        name: "",
        location: "",
        price: "",
        capacity: "",
        type: "",
        rateType: "PER_DAY",
        images: [],
      });
      setEditId(null);
    }
    setModalVisible(true);
  };

  const handlePickImage = (e) => {
    const files = Array.from(e.target.files);
    setVenueData((prev) => ({
      ...prev,
      images: [...prev.images, ...files],
    }));
  };

  const handleDeleteImage = (index) => {
    setVenueData((prev) => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index),
    }));
  };

  const handleSave = async () => {
    const payload = {
      name: venueData.name,
      location: venueData.location,
      price: parseFloat(venueData.price),
      capacity: parseInt(venueData.capacity),
      type: venueData.type,
      rateType: venueData.rateType,
    };

    const formData = new FormData();
    Object.keys(payload).forEach((key) => formData.append(key, payload[key]));

    venueData.images.forEach((image) => {
      if (image instanceof File) {
        formData.append("imageFiles", image);
      }
    });

    try {
      if (editId) {
        await api.patch(`/admin/venues/${editId}`, formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      } else {
        await api.post("/admin/venues", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      }

      setModalVisible(false);
      fetchVenues();
    } catch (err) {
      console.error("Save error:", err);
      alert("Failed to save venue. Check console.");
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Are you sure you want to delete this venue?")) return;

    const token = localStorage.getItem("accessToken");
    if (!token) return;

    try {
      await api.delete(`/admin/venues/${id}`);
      fetchVenues();
    } catch (err) {
      console.error("Delete error:", err);
      alert("Failed to delete venue");
    }
  };

  return (
    <div className="available-venues-container">
      <h2 className="header">Available Venues</h2>

      <button className="add-button" onClick={() => openModal()}>
        <MdAddCircle size={20} style={{ marginRight: 5 }} /> Add Venue
      </button>

      {loading && <p style={{ textAlign: "center" }}>Loading venues...</p>}

      {!loading && venues.length === 0 && (
        <p className="empty-text">No venues available</p>
      )}

      <div className="venues-list">
        {venues.map((item) => (
          <div className="venue-card" key={item.id}>
            {Array.isArray(item.imageUrls) && item.imageUrls.length > 0 ? (
              <Carousel showThumbs={false} infiniteLoop useKeyboardArrows>
                {item.imageUrls.map((imgUrl, i) => (
                  <img key={i} src={imgUrl} alt="venue" className="carousel-image" />
                ))}
              </Carousel>
            ) : (
              <div className="placeholder">
                <MdImage size={40} color="#0077B6" />
              </div>
            )}

            <h3>{item.name}</h3>
            <p>Location: {item.location}</p>
            <p>Price: R{item.price}</p>
            <p>Capacity: {item.capacity}</p>
            <p>Type: {item.type}</p>
            <p>Rate: {item.rateType}</p>

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
            <h3 className="modal-header">{editId ? "Edit Venue" : "Add Venue"}</h3>

            <input
              type="file"
              multiple
              accept="image/*"
              onChange={handlePickImage}
            />

            <div className="image-preview">
              {venueData.images.map((img, i) => (
                <div key={i} className="image-container">
                  {img instanceof File ? (
                    <img src={URL.createObjectURL(img)} alt="preview" />
                  ) : (
                    typeof img === "string" && <img src={img} alt="preview" />
                  )}

                  <button onClick={() => handleDeleteImage(i)}>X</button>
                </div>
              ))}
            </div>

            <input
              className="input"
              type="text"
              placeholder="Venue Name"
              value={venueData.name}
              onChange={(e) =>
                setVenueData({ ...venueData, name: e.target.value })
              }
            />

            <select
              className="input"
              value={venueData.location}
              onChange={(e) =>
                setVenueData({ ...venueData, location: e.target.value })
              }
            >
              <option value="" disabled>
                Select Location
              </option>
              <option value="Polokwane">Polokwane</option>
              <option value="Emalahleni">Emalahleni</option>
            </select>

            <select
              className="input"
              value={venueData.type}
              onChange={(e) =>
                setVenueData({ ...venueData, type: e.target.value })
              }
            >
              <option value="" disabled>
                Select Type
              </option>
              <option value="AUDITORIUM">Auditorium</option>
              <option value="CLASSROOM">Classroom</option>
              <option value="HALL">Hall</option>
              <option value="OTHER">Other</option>
            </select>

            <select
              className="input"
              value={venueData.rateType}
              onChange={(e) =>
                setVenueData({ ...venueData, rateType: e.target.value })
              }
            >
              <option value="PER_DAY">Per Day</option>
              <option value="PER_HOUR">Per Hour</option>
              <option value="OTHER">Other</option>
            </select>

            <input
              className="input"
              type="number"
              placeholder="Price"
              value={venueData.price}
              onChange={(e) =>
                setVenueData({ ...venueData, price: e.target.value })
              }
            />

            <input
              className="input"
              type="number"
              placeholder="Capacity"
              value={venueData.capacity}
              onChange={(e) =>
                setVenueData({ ...venueData, capacity: e.target.value })
              }
            />

            <div className="modal-actions">
              <button onClick={handleSave}>
                {editId ? "Update" : "Save"}
              </button>
              <button onClick={() => setModalVisible(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
