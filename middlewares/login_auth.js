const jwt = require('jsonwebtoken')
const User = require('../models/user')

const login_auth = async (req, res, next) => {
  try {
      const token = req.cookies.token
      const decoded = jwt.verify(token, 'interviewProv1')
      const user = await User.findOne({ _id: decoded._id })
      if (user) {
        res.redirect('/dashboard')
      }
  } catch (e) {
    next();
  }
}

module.exports = login_auth
