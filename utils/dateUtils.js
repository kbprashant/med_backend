/**
 * Format date to readable string
 */
function formatDate(date) {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * Format date with time
 */
function formatDateTime(date) {
  return new Date(date).toLocaleString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Get time ago string (e.g., "2 hours ago")
 */
function getTimeAgo(date) {
  const seconds = Math.floor((new Date() - new Date(date)) / 1000);

  let interval = seconds / 31536000; // years
  if (interval > 1) return Math.floor(interval) + ' year(s) ago';

  interval = seconds / 2592000; // months
  if (interval > 1) return Math.floor(interval) + ' month(s) ago';

  interval = seconds / 86400; // days
  if (interval > 1) return Math.floor(interval) + ' day(s) ago';

  interval = seconds / 3600; // hours
  if (interval > 1) return Math.floor(interval) + ' hour(s) ago';

  interval = seconds / 60; // minutes
  if (interval > 1) return Math.floor(interval) + ' minute(s) ago';

  return Math.floor(seconds) + ' second(s) ago';
}

module.exports = {
  formatDate,
  formatDateTime,
  getTimeAgo,
};
