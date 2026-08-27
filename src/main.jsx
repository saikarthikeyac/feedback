import React from 'react';
import ReactDOM from 'react-dom/client';
import FeedbackPage from './FeedbackPage';
import './index.css';

// Extract tracking token from URL
const urlParams = new URLSearchParams(window.location.search);
const token = urlParams.get('token') || window.location.pathname.split('/').pop();

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <FeedbackPage token={token} />
  </React.StrictMode>,
);
