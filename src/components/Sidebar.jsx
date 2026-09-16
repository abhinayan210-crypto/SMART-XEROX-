import React from 'react';

/**
 * Reusable Sidebar Component
 * @param {'student'|'staff'} role
 * @param {string} activeTab
 * @param {Function} onTabChange
 * @param {object} user
 */
export const Sidebar = ({
  role = 'student',
  activeTab = 'overview',
  onTabChange,
  user
}) => {
  const studentMenuItems = [
    { id: 'overview', label: 'My Print Dashboard', icon: '📊' },
    { id: 'new-job', label: 'Submit Print Job', icon: '📄' },
    { id: 'active-jobs', label: 'Live Track Jobs', icon: '⏳' },
    { id: 'history', label: 'Print History', icon: '🕒' },
    { id: 'rates', label: 'Xerox Rate Card', icon: '💳' }
  ];

  const staffMenuItems = [
    { id: 'overview', label: 'Live Queue Console', icon: '🖥️' },
    { id: 'all-jobs', label: 'All Print Orders', icon: '📋' },
    { id: 'printers', label: 'Hardware Units', icon: '🖨️' },
    { id: 'reports', label: 'Daily Analytics', icon: '📈' },
    { id: 'settings', label: 'Shop Settings', icon: '⚙️' }
  ];

  const menuItems = role === 'staff' ? staffMenuItems : studentMenuItems;

  return (
    <aside className="sidebar">
      <div>
        <div className="sidebar-heading">
          {role === 'staff' ? 'Staff Operations' : 'Student Workspace'}
        </div>

        <ul className="sidebar-menu">
          {menuItems.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                className={`sidebar-item-btn ${activeTab === item.id ? 'active' : ''}`}
                onClick={() => onTabChange && onTabChange(item.id)}
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>

      {/* User Info Footer in Sidebar */}
      {user && (
        <div className="sidebar-user-card">
          <div className="sidebar-user-avatar">
            {user.name ? user.name.charAt(0) : (role === 'staff' ? 'S' : 'U')}
          </div>
          <div className="sidebar-user-info">
            <span className="sidebar-user-name">{user.name}</span>
            <span className="sidebar-user-role">
              {role === 'staff' ? user.role || 'Staff Operator' : `${user.department || 'Student'} • ${user.id || ''}`}
            </span>
          </div>
        </div>
      )}
    </aside>
  );
};

export default Sidebar;
