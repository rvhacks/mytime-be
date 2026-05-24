/**
 * Generate auto password: FIRST4(CAPS) + LAST4(mobile) + DDMM(dob)
 */
const generateAutoPassword = (firstName, mobile, dob) => {
  const namePart = firstName.toUpperCase().slice(0, 4).padEnd(4, 'X');
  const mobilePart = mobile.slice(-4);
  const d = new Date(dob);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${namePart}${mobilePart}${dd}${mm}`;
};

/**
 * Generate unique 3-char uppercase project code
 */
const generateProjectCode = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let code = '';
  for (let i = 0; i < 3; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

/**
 * Generate auto color from a palette
 */
const AUTO_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4', '#ec4899', '#14b8a6', '#f97316', '#84cc16'];
const generateAutoColor = () => AUTO_COLORS[Math.floor(Math.random() * AUTO_COLORS.length)];

/**
 * Generate 6-digit OTP
 */
const generateOTP = () => {
  return String(Math.floor(100000 + Math.random() * 900000));
};

/**
 * Build standard pagination response
 */
const buildPaginationQuery = (query) => {
  const page = Math.max(1, parseInt(query.page || '1', 10));
  const limit = Math.min(100, Math.max(1, parseInt(query.limit || '20', 10)));
  const offset = (page - 1) * limit;
  const search = query.search || '';
  const sortBy = query.sortBy || 'created_at';
  const sortOrder = (query.sortOrder || 'DESC').toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
  return { page, limit, offset, search, sortBy, sortOrder };
};

const buildPaginationResponse = (data, page, limit) => {
  const total = data.count || 0;
  return {
    rows: data.rows || [],
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

module.exports = {
  generateAutoPassword,
  generateProjectCode,
  generateAutoColor,
  generateOTP,
  buildPaginationQuery,
  buildPaginationResponse,
};
