import React, { useState, useEffect } from 'react';
import { Calendar } from 'lucide-react';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import '../../styles/pages/_analyticsexport.scss';

const AnalyticsExportScreen = () => {
    const [exportFormat, setExportFormat] = useState("PDF");
    const [selectedDays, setSelectedDays] = useState(30);

    const dayOptions = [
        { label: "Last 7 Days", value: 7 },
        { label: "Last 14 Days", value: 14 },
        { label: "Last 30 Days", value: 30 },
        { label: "Last 60 Days", value: 60 },
        { label: "Last 90 Days", value: 90 },
    ];

    const [venueReports, setVenueReports] = useState([]);

    const fetchAnalyticsData = async () => {
  const token = localStorage.getItem("accessToken");
  if (!token) return alert("Please login first");

  try {
    const res = await fetch("http://localhost:3000/reports/analytics", {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    setVenueReports(data);
  } catch (error) {
    console.error("Failed to fetch analytics:", error);
    alert("Could not fetch analytics data.");
  }
};

useEffect(() => {
  fetchAnalyticsData();
}, []);

    // Prepare TUT logo for embedding
    const [logoUri, setLogoUri] = useState(null);

    useEffect(() => {
        const prepareLogo = async () => {
            try {
                // For web, use fetch to get the image as base64
                const response = await fetch('/src/assets/images/tut_logo.png'); // Adjust path as needed
                const blob = await response.blob();
                const reader = new FileReader();
                reader.onload = () => setLogoUri(reader.result);
                reader.readAsDataURL(blob);
            } catch (error) {
                console.warn("Logo not found or failed to prepare:", error);
            }
        };
        prepareLogo();
    }, []);

    const generateCSV = () => {
        try {
            const data = venueReports;


            let csvContent = "VENUE ANALYTICS REPORT\n";
            csvContent += `Report Period: Last ${selectedDays} Days\n\n`;
            csvContent += "Venue,Events Hosted,Total Revenue\n";

            data.forEach((venue) => {
                csvContent += `${venue.venueName},${venue.totalBookings},R${venue.totalRevenue}\n`;
            });

            // Web download
            const blob = new Blob([csvContent], { type: 'text/csv' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `venue_report_${Date.now()}.csv`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error("Error generating CSV:", error);
            alert("Failed to generate CSV");
        }
    };

    const generatePDF = async () => {
        try {
            const data = venueReports;


            const pdfDoc = await PDFDocument.create();
            let page = pdfDoc.addPage([600, 800]);
            const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
            const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
            let yPosition = 750;

            // === Load and Draw Logo ===
            if (logoUri) {
                try {
                    const logoBytes = logoUri.split(',')[1]; // Remove data:image/png;base64,
                    const logoImage = await pdfDoc.embedPng(logoBytes);
                    const logoDims = logoImage.scale(0.25);
                    page.drawImage(logoImage, {
                        x: (600 - logoDims.width) / 2,
                        y: 650,
                        width: logoDims.width,
                        height: logoDims.height,
                    });
                    yPosition = 630;
                } catch (error) {
                    console.warn("Failed to embed logo:", error);
                }
            }

            // === Header ===
            page.drawText("Tshwane University of Technology", {
                x: 145,
                y: yPosition,
                size: 16,
                font: boldFont,
                color: rgb(0, 0.2, 0.6), // TUT blue
            });

            yPosition -= 25;
            page.drawText("Venue Analytics Report", {
                x: 210,
                y: yPosition,
                size: 14,
                font: boldFont,
                color: rgb(0, 0, 0),
            });

            yPosition -= 20;
            page.drawText(`Report Period: Last ${selectedDays} Days`, {
                x: 210,
                y: yPosition,
                size: 11,
                font: font,
                color: rgb(0.3, 0.3, 0.3),
            });

            // === Divider ===
            yPosition -= 25;
            page.drawLine({
                start: { x: 50, y: yPosition },
                end: { x: 550, y: yPosition },
                thickness: 1,
                color: rgb(0.8, 0.8, 0.8),
            });

            yPosition -= 40;
            page.drawText("Venue Summary", {
                x: 50,
                y: yPosition,
                size: 14,
                font: boldFont,
                color: rgb(0, 0.2, 0.6),
            });

            yPosition -= 25;

            // === Venue Summary Section ===
            data.forEach((venue) => {
                const textBlock = `${venue.venueName} hosted ${venue.totalBookings} event${venue.totalBookings > 1 ? "s" : ""} in the last ${selectedDays} days, earning a total of R${venue.totalRevenue}.`;

                page.drawText(textBlock, {
                    x: 65,
                    y: yPosition,
                    size: 11,
                    font: font,
                    color: rgb(0.1, 0.1, 0.1),
                });

                yPosition -= 20;
                page.drawLine({
                    start: { x: 60, y: yPosition },
                    end: { x: 540, y: yPosition },
                    thickness: 0.5,
                    color: rgb(0.85, 0.85, 0.85),
                });
                yPosition -= 20;

                if (yPosition < 80) {
                    page.drawText("Generated by Smart Events System", {
                        x: 180,
                        y: 50,
                        size: 10,
                        font: font,
                        color: rgb(0.4, 0.4, 0.4),
                    });
                    page = pdfDoc.addPage([600, 800]);
                    yPosition = 750;
                }
            });

            // === Footer ===
            page.drawText("Generated by TUT Connect Analytics System", {
                x: 180,
                y: 50,
                size: 10,
                font: font,
                color: rgb(0.4, 0.4, 0.4),
            });

            // === Save PDF ===
            const pdfBytes = await pdfDoc.save();

            // Web download
            const blob = new Blob([pdfBytes], { type: 'application/pdf' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `venue_report_${Date.now()}.pdf`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error("Error generating PDF:", error);
            alert("Failed to generate PDF: " + error.message);
        }
    };

    const handleGenerateReport = async () => {
        if (exportFormat === "PDF") {
            await generatePDF();
        } else if (exportFormat === "Excel") {
            generateCSV();
        }
    };

    return (
        <div className="analytics-export-container">
            <div className="analytics-export-content">
                <h1 className="export-header">Venue Analytics & Exports</h1>

                <div className="export-card">
                    <h3 className="section-title">Export Format</h3>
                    <div className="button-row">
                        <button
                            className={`format-button ${exportFormat === "PDF" ? "selected" : ""}`}
                            onClick={() => setExportFormat("PDF")}
                        >
                            PDF
                        </button>

                        <button
                            className={`format-button ${exportFormat === "Excel" ? "selected" : ""}`}
                            onClick={() => setExportFormat("Excel")}
                        >
                            Excel
                        </button>
                    </div>

                    {/* Date Range Picker */}
                    <div className="date-container">
                        <Calendar size={20} color="#555" />
                        <select
                            value={selectedDays}
                            className="picker"
                            onChange={(e) => setSelectedDays(Number(e.target.value))}
                        >
                            {dayOptions.map((option) => (
                                <option key={option.value} value={option.value}>
                                    {option.label}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                <button className="generate-button" onClick={handleGenerateReport}>
                    Generate Venue Report
                </button>
            </div>
        </div>
    );
};

export default AnalyticsExportScreen;