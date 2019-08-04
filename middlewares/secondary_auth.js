const jwt = require("jsonwebtoken");
const User = require("./../models/user");
const Recruiter = require("./../models/recruiter");

const auth = async (req, res, next) => {
  var requestedUrl = req.url;
  try {
    const token = req.cookies.token;
    const decoded = jwt.verify(token, "interviewProv1");
    const user = await User.findOne({ _id: decoded._id });
    if (!user) {
      const recruiter = await Recruiter.findOne({ _id: decoded._id });
      if (!recruiter) {
        throw new Error();
      }
      req.token = token;
      req.user = recruiter;
      next();
    } else if (user) {
      req.token = token;
      req.user = user;
      next();
    }
  } catch (e) {
    res.redirect("/interviewer-login?redirect=" + requestedUrl);
  }
};

module.exports = auth;
