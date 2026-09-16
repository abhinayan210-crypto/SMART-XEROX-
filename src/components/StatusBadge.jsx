import React from 'react';

/**
 * Reusable StatusBadge Component
 * @param {('queued'|'printing'|'ready'|'completed'|'cancelled'|'failed')} status
 * @param {string} labelOverride
 * @param {string} className
 */
export const StatusBadge = ({
  status = 'queued',
  labelOverride,
  className = ''
}) => {
  const normalizedStatus = status.toLowerCase();

  const labels = {
    queued: 'In Queue',
    printing: 'Printing Now',
    ready: 'Ready for Pickup',
    completed: 'Completed',
    cancelled: 'Cancelled',
    failed: 'Failed'
  };

  const displayLabel = labelOverride || labels[normalizedStatus] || status;

  return (
    <span className={`status-badge status-${normalizedStatus} ${className}`.trim()}>
      <span className="status-badge-dot" />
      <span>{displayLabel}</span>
    </span>
  );
};

export default StatusBadge;
