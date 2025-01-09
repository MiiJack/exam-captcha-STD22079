import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// Load the WAF Captcha script
const script = document.createElement('script');
script.src = import.meta.env.VITE_INTEGRATION_URL;
script.defer = true;
document.head.appendChild(script);

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <App />
    </React.StrictMode>
);