const jwt = require('jsonwebtoken')
const Recruiter = require('../models/recruiter')

const recruiter_activation_auth = async (req, res, next) => {
    try {
        const token = req.cookies.activationtoken
        const decoded = jwt.verify(token, 'interviewProv1OTP')
        const user = await Recruiter.findOne({ _id: decoded._id })
        if (!user) {
            throw new Error()
        }
        req.user = user
        next()
    } catch (e) {
      res.redirect('/login')
    }
}

module.exports = recruiter_activation_auth
