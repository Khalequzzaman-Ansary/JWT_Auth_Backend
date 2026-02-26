const validator = require("validator");

function validateEmail(email) {
  if (typeof email !== "string") {
    return "Email must be a string";
  }

  const trimmed = email.trim();

  if (!trimmed) {
    return "Email is required";
  }

  if (!validator.isEmail(trimmed)) {
    return "Invalid email format";
  }

  return null;
}

module.exports = { validateEmail };
