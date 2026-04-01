const { validationResult } = require('express-validator');
const User = require('../models/User');

// GET /auth/login
const getLogin = (req, res) => {
  res.render('auth/login', { title: 'Login' });
};

// POST /auth/login
const postLogin = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    req.flash('error', errors.array()[0].msg);
    return res.redirect('/auth/login');
  }

  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email, isActive: true }).select('+password');
    if (!user) {
      req.flash('error', 'Invalid email or password');
      return res.redirect('/auth/login');
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      req.flash('error', 'Invalid email or password');
      return res.redirect('/auth/login');
    }

    req.session.userId = user._id;
    req.session.userRole = user.role;
    req.session.userName = user.name;

    req.flash('success', `Welcome back, ${user.name}!`);
    res.redirect('/events');
  } catch (err) {
    console.error(err);
    req.flash('error', 'An error occurred. Please try again.');
    res.redirect('/auth/login');
  }
};

// GET /auth/register
const getRegister = (req, res) => {
  res.render('auth/register', { title: 'Register' });
};

// POST /auth/register
const postRegister = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    req.flash('error', errors.array()[0].msg);
    return res.redirect('/auth/register');
  }

  const { name, email, password, studentId, department } = req.body;

  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      req.flash('error', 'Email is already registered');
      return res.redirect('/auth/register');
    }

    const user = await User.create({ name, email, password, studentId, department });

    req.session.userId = user._id;
    req.session.userRole = user.role;
    req.session.userName = user.name;

    req.flash('success', 'Registration successful! Welcome to GUC Events.');
    res.redirect('/events');
  } catch (err) {
    console.error(err);
    req.flash('error', 'An error occurred. Please try again.');
    res.redirect('/auth/register');
  }
};

// POST /auth/logout
const logout = (req, res) => {
  req.session.destroy(() => {
    res.redirect('/');
  });
};

module.exports = { getLogin, postLogin, getRegister, postRegister, logout };
