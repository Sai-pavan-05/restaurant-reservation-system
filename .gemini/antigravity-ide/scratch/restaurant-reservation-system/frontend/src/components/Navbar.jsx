import React from 'react';

const Navbar = ({ user, onLogout }) => {
  return (
    <nav className="navbar">
      <div className="container">
        <div className="logo">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z"/>
          </svg>
          DineFlow
        </div>
        {user && (
          <div className="nav-links">
            <div className="user-badge">
              <span>{user.name}</span>
              <span className={`role-tag ${user.role}`}>
                {user.role}
              </span>
            </div>
            <button className="btn btn-secondary btn-sm" onClick={onLogout}>
              Logout
            </button>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
