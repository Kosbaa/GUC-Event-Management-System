/**
 * Ensure the request is made by an authenticated user.
 */
const ensureAuthenticated = (req, res, next) => {
  if (req.session && req.session.userId) {
    return next();
  }
  req.flash('error', 'Please log in to access this page');
  res.redirect('/auth/login');
};

/**
 * Ensure the request is made by a guest (not logged-in).
 */
const ensureGuest = (req, res, next) => {
  if (req.session && req.session.userId) {
    return res.redirect('/events');
  }
  next();
};

/**
 * Ensure the user has one of the allowed roles.
 * @param {...string} roles
 */
const authorizeRoles = (...roles) => (req, res, next) => {
  if (!req.session || !req.session.userRole) {
    req.flash('error', 'Please log in');
    return res.redirect('/auth/login');
  }
  if (!roles.includes(req.session.userRole)) {
    req.flash('error', 'You are not authorized to perform this action');
    return res.redirect('/events');
  }
  next();
};

module.exports = { ensureAuthenticated, ensureGuest, authorizeRoles };
