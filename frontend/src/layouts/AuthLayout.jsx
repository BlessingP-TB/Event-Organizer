// src/layouts/AuthLayout.jsx
import React from 'react';
import '../styles/abstracts-auth/_auth.scss'; // Or the most relevant auth layout styles
// styles/abstracts-auth/main.scss
function AuthLayout({ children }) {
  return <div className="auth-layout">{children}</div>;
}

export default AuthLayout;