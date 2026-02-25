function validateStrongPassword(password) {
  if (typeof password !== "string") {
    return "Password must be a string";
  }
  if (password.length < 8) {
    return "Password must be at least 8 characters long";
  }
  if (password.length > 72) {
    return "Password must be at most 72 characters long";
  }
  if (/\s/.test(password)) {
    return "Password must not contain spaces";
  }
  if (!/[a-z]/.test(password)) {
    return "Password must include at least one lowercase letter";
  }
  if (!/[A-Z]/.test(password)) {
    return "Password must include at least one uppercase letter";
  }
  if (!/[0-9]/.test(password)) {
    return "Password must include at least one number";
  }
  if (!/[^A-Za-z0-9]/.test(password)) {
    return "Password must include at least one special character";
  }

  return null;
}

module.exports = { validateStrongPassword };
