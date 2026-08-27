import axios from 'axios';
import {
    AlertCircle,
    Calendar,
    CheckCircle, Clock,
    MapPin,
    RefreshCw,
    Send,
    ShieldCheck,
    Star,
    XCircle
} from 'lucide-react';
import { useEffect, useState } from 'react';
import './FeedbackPage.css';

export default function FeedbackPage({ token }) {
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [rating, setRating] = useState(5);
  const [feedback, setFeedback] = useState('');
  const [submittingRating, setSubmittingRating] = useState(false);
  const [ratingSuccess, setRatingSuccess] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const API_BASE = process.env.REACT_APP_API_URL || '';

  const fetchBooking = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await axios.get(`${API_BASE}/api/bookings/track/${token}`);
      setBooking(res.data);
      if (res.data.rating) setRating(res.data.rating);
      if (res.data.feedback) setFeedback(res.data.feedback);
    } catch (err) {
      setError('Invalid or expired tracking link.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) fetchBooking();
  }, [token]);

  const handleCancel = async () => {
    if (!window.confirm('Are you sure you want to cancel your appointment?')) return;
    setCancelling(true);
    try {
      const res = await axios.post(`${API_BASE}/api/bookings/track/${token}/cancel`);
      setBooking(res.data);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to cancel appointment.');
    } finally {
      setCancelling(false);
    }
  };

  const handleRateSubmit = async (e) => {
    e.preventDefault();
    setSubmittingRating(true);
    try {
      const res = await axios.post(`${API_BASE}/api/bookings/track/${token}/rate`, {
        rating: parseInt(rating),
        feedback
      });
      setBooking(res.data);
      setRatingSuccess(true);
      setTimeout(() => setRatingSuccess(false), 3000);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to submit rating.');
    } finally {
      setSubmittingRating(false);
    }
  };

  if (loading) {
    return (
      <div className="feedback-container loading">
        <RefreshCw className="spinner" />
        <p>Loading your appointment details...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="feedback-container error">
        <AlertCircle size={48} />
        <h1>{error}</h1>
        <p>Please check the link and try again.</p>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="feedback-container">
        <p>No booking found.</p>
      </div>
    );
  }

  const isCompleted = booking.status === 'COMPLETED';
  const isCancelled = booking.status === 'CANCELLED';

  return (
    <div className="feedback-page">
      <div className="feedback-container">
        {/* Header */}
        <div className="feedback-header">
          <ShieldCheck size={32} className="logo-icon" />
          <h1>Track Your Service</h1>
          <p>Real-time appointment status & feedback</p>
        </div>

        {/* Status Card */}
        <div className={`status-card status-${booking.status?.toLowerCase() || 'pending'}`}>
          <div className="status-content">
            {isCompleted && <CheckCircle size={24} className="status-icon" />}
            {booking.status === 'CONFIRMED' && <Clock size={24} className="status-icon" />}
            {booking.status === 'IN_PROGRESS' && <Clock size={24} className="status-icon spinning" />}
            {isCancelled && <XCircle size={24} className="status-icon" />}
            <div className="status-text">
              <h2>{booking.status}</h2>
              <p>{booking.customer_name}</p>
            </div>
          </div>
          <div className="status-badge">{booking.status}</div>
        </div>

        {/* Appointment Details */}
        <div className="details-grid">
          <div className="detail-item">
            <Calendar size={20} />
            <div>
              <label>Appointment Date</label>
              <p>{booking.appointment_date ? new Date(booking.appointment_date).toLocaleDateString() : '—'}</p>
            </div>
          </div>
          <div className="detail-item">
            <MapPin size={20} />
            <div>
              <label>Service Type</label>
              <p>{booking.work_type || 'N/A'}</p>
            </div>
          </div>
        </div>

        {/* Rating & Feedback Section */}
        {isCompleted && (
          <div className="feedback-section">
            <h3>How was your service?</h3>
            <form onSubmit={handleRateSubmit}>
              {/* Star Rating */}
              <div className="rating-input">
                <label>Rate Your Experience</label>
                <div className="star-group">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      className={`star-btn ${rating >= star ? 'active' : ''}`}
                      onClick={() => setRating(star)}
                      disabled={submittingRating}
                    >
                      <Star size={28} fill={rating >= star ? 'currentColor' : 'none'} />
                    </button>
                  ))}
                </div>
              </div>

              {/* Feedback Textarea */}
              <div className="feedback-input">
                <label htmlFor="feedback">Additional Feedback (Optional)</label>
                <textarea
                  id="feedback"
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder="Tell us about your experience... (optional)"
                  disabled={submittingRating}
                  rows={4}
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                className="submit-btn"
                disabled={submittingRating}
              >
                {submittingRating ? (
                  <>
                    <RefreshCw size={16} className="spinner" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Send size={16} />
                    Submit Rating
                  </>
                )}
              </button>

              {ratingSuccess && (
                <div className="success-message">
                  <CheckCircle size={20} />
                  Thank you for your feedback!
                </div>
              )}
            </form>
          </div>
        )}

        {/* Cancel Button (if not completed/cancelled) */}
        {!isCompleted && !isCancelled && (
          <div className="action-section">
            <button
              className="cancel-appointment-btn"
              onClick={handleCancel}
              disabled={cancelling}
            >
              {cancelling ? 'Cancelling...' : 'Cancel Appointment'}
            </button>
          </div>
        )}

        {/* Footer */}
        <div className="feedback-footer">
          <p>Questions? Contact support at support@techops.com</p>
        </div>
      </div>
    </div>
  );
}
