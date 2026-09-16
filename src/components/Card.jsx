import React from 'react';

/**
 * Reusable Card Component
 * @param {string|React.ReactNode} title
 * @param {string|React.ReactNode} subtitle
 * @param {React.ReactNode} badge
 * @param {React.ReactNode} headerAction
 * @param {React.ReactNode} footer
 * @param {string} className
 * @param {React.ReactNode} children
 */
export const Card = ({
  title,
  subtitle,
  badge,
  headerAction,
  footer,
  className = '',
  children,
  ...props
}) => {
  const hasHeader = title || subtitle || badge || headerAction;

  return (
    <div className={`card ${className}`.trim()} {...props}>
      {hasHeader && (
        <div className="card-header">
          <div className="card-title-group">
            {title && <h3 className="card-title">{title}</h3>}
            {subtitle && <span className="card-subtitle">{subtitle}</span>}
          </div>
          <div className="flex items-center gap-2">
            {badge && <div className="card-badge">{badge}</div>}
            {headerAction && <div className="card-action">{headerAction}</div>}
          </div>
        </div>
      )}

      <div className="card-body">
        {children}
      </div>

      {footer && (
        <div className="card-footer">
          {footer}
        </div>
      )}
    </div>
  );
};

export default Card;
