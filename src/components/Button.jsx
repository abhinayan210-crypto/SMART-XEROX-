import React from 'react';

/**
 * Reusable Button Component
 * @param {('primary'|'secondary'|'outline'|'ghost'|'danger')} variant
 * @param {('sm'|'md'|'lg')} size
 * @param {React.ReactNode} icon
 * @param {boolean} disabled
 * @param {Function} onClick
 * @param {string} type
 * @param {string} className
 * @param {React.ReactNode} children
 */
export const Button = ({
  children,
  variant = 'primary',
  size = 'md',
  icon = null,
  disabled = false,
  onClick,
  type = 'button',
  className = '',
  ...props
}) => {
  const variantClass = `btn-${variant}`;
  const sizeClass = `btn-${size}`;
  const customClasses = className ? ` ${className}` : '';

  return (
    <button
      type={type}
      className={`btn ${variantClass} ${sizeClass}${customClasses}`}
      disabled={disabled}
      onClick={onClick}
      {...props}
    >
      {icon && <span className="btn-icon">{icon}</span>}
      {children && <span>{children}</span>}
    </button>
  );
};

export default Button;
