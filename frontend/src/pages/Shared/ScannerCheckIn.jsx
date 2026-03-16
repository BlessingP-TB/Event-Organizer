import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../utils/api';
import '../../styles/pages/_scannercheckin.scss';

const ScannerCheckIn = () => {
  const { eventId } = useParams();
  const navigate = useNavigate();

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const scanTimerRef = useRef(null);
  const processingRef = useRef(false);

  const [manualQr, setManualQr] = useState('');
  const [statusMsg, setStatusMsg] = useState('Ready to scan.');
  const [errorMsg, setErrorMsg] = useState('');
  const [lastAttendee, setLastAttendee] = useState(null);
  const [cameraReady, setCameraReady] = useState(false);

  const scannerToken = sessionStorage.getItem('scannerAccessToken');

  const stopCamera = () => {
    if (scanTimerRef.current) {
      clearInterval(scanTimerRef.current);
      scanTimerRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  };

  const submitScan = async (qrData) => {
    if (!qrData || processingRef.current) return;

    processingRef.current = true;
    setErrorMsg('');
    setStatusMsg('Validating attendee QR...');

    try {
      const response = await api.post(
        `/events/${eventId}/written-assign/redeem`,
        { qrData },
        {
          headers: {
            Authorization: `Bearer ${scannerToken}`,
          },
        }
      );

      setLastAttendee(response.data.attendee);
      setStatusMsg('Valid attendee. Continue scanning next attendee.');
    } catch (err) {
      setErrorMsg(err?.response?.data?.message || 'Failed to validate QR code.');
      setStatusMsg('Scan failed. Try next attendee.');
    } finally {
      processingRef.current = false;
    }
  };

  useEffect(() => {
    if (!scannerToken) {
      navigate(`/scanner-login/${eventId}`);
      return;
    }

    const startCamera = async () => {
      if (!('BarcodeDetector' in window) || !navigator.mediaDevices?.getUserMedia) {
        setStatusMsg('Camera scanner is not supported in this browser. Use manual QR input below.');
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: 'environment',
          },
          audio: false,
        });

        streamRef.current = stream;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }

        const detector = new window.BarcodeDetector({ formats: ['qr_code'] });
        setCameraReady(true);

        scanTimerRef.current = setInterval(async () => {
          if (!videoRef.current || processingRef.current) return;

          try {
            const detections = await detector.detect(videoRef.current);
            if (detections?.length) {
              const rawValue = detections[0]?.rawValue;
              if (rawValue) {
                submitScan(rawValue);
              }
            }
          } catch (error) {
            // Ignore transient detector errors while camera frames are loading.
          }
        }, 700);
      } catch (error) {
        setStatusMsg('Unable to access camera. Use manual QR input below.');
      }
    };

    startCamera();

    return () => {
      stopCamera();
    };
  }, [eventId, navigate, scannerToken]);

  return (
    <div className="scanner-page">
      <div className="scanner-card">
        <div className="scanner-head">
          <h2>Attendee QR Scanner</h2>
          <button
            type="button"
            className="logout-btn"
            onClick={() => {
              sessionStorage.removeItem('scannerAccessToken');
              sessionStorage.removeItem('scannerEventId');
              stopCamera();
              navigate(`/scanner-login/${eventId}`);
            }}
          >
            Logout
          </button>
        </div>

        <p className="status-msg">{statusMsg}</p>
        {errorMsg && <p className="scanner-error">{errorMsg}</p>}

        <div className="video-wrap">
          <video ref={videoRef} muted playsInline />
          {!cameraReady && <p className="hint">Camera preview unavailable. Manual entry still works.</p>}
        </div>

        <div className="manual-entry">
          <input
            type="text"
            value={manualQr}
            onChange={(e) => setManualQr(e.target.value)}
            placeholder="Paste scanned QR text or redeem-ticket URL"
          />
          <button
            type="button"
            onClick={() => {
              submitScan(manualQr.trim());
              setManualQr('');
            }}
          >
            Validate QR
          </button>
        </div>

        {lastAttendee && (
          <div className="attendee-card">
            <h3>Attendee Validated</h3>
            <p>Name: <strong>{lastAttendee.name}</strong></p>
            <p>Email: <strong>{lastAttendee.email}</strong></p>
            <p>ID: <strong>{lastAttendee.id}</strong></p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ScannerCheckIn;
