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
 * Generate random 8-digit project ID
 */
const generateProjectId = () => {
  return String(Math.floor(10000000 + Math.random() * 90000000));
};

/**
 * Generate 6-digit OTP
 */
const generateOTP = () => {
  return String(Math.floor(100000 + Math.random() * 900000));
};

module.exports = { generateAutoPassword, generateProjectId, generateOTP };
