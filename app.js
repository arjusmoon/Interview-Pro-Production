var express = require("express");
var cors = require("cors");
const bodyParser = require("body-parser");
const { mongoose } = require("./db/mongoose");
const hbs = require("hbs");
const jwt = require("jsonwebtoken");
const User = require("./models/user");
const Team = require("./models/team");
const Recruiter = require("./models/recruiter");
const Recruites = require("./models/recruites");
const Careers = require("./models/careers");
const Skills = require("./models/skills");
const eventCalendar = require("./modules/calendar");
const fs = require("fs");
const readline = require("readline");
const { google } = require("googleapis");
const SCOPES = ["https://www.googleapis.com/auth/calendar"];
const TOKEN_PATH = "token.json";
const activate_rec_mail = require("./modules/activate-recruiter-mailer");
const sendWelcomeEmail = require("./modules/sendWelcomeEmail");
const sendRejectionEmail = require("./modules/rejectMail");
const recruiterAssignEmail = require("./modules/recruiter-assign-email");
var cookieParser = require("cookie-parser");
const querystring = require("querystring");
const login_auth = require("./middlewares/login_auth");
const recruiter_activation_auth = require("./middlewares/recruiter_activation_auth");
const auth = require("./middlewares/auth");
const secondary_auth = require("./middlewares/secondary_auth");
const path = require("path");
var https = require("https");
var http = require("http");
const multer = require("multer");
var storage = multer.diskStorage({
  destination: function(req, file, cb) {
    cb(null, "./resumes/");
  },
  filename: function(req, file, cb) {
    if (!file.originalname.match(/\.(doc|docx|pdf)$/)) {
      return cb(new Error("Please upload a word / pdf file."));
    }
    if (file.mimetype == "application/pdf") {
      var ext = ".pdf";
    } else if (
      file.mimetype ==
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ) {
      var ext = ".docx";
    } else if (file.originalname.endsWith(".doc")) {
      var ext = ".doc";
    }
    cb(null, Date.now() + ext);
  }
});
var upload = multer({ storage: storage });
const nodemailer = require("nodemailer");
var app = express();
var port = process.env.PORT || 3000;
// var port = process.env.PORT || 80;

// var https_options = {
//   key: fs.readFileSync('./ssl/privatekey.key'),
//   cert: fs.readFileSync('./ssl/careers_socialbeat_in.crt'),
//   ca: [
//           fs.readFileSync('./ssl/SectigoRSADomainValidationSecureServerCA.crt'),
//           fs.readFileSync('./ssl/USERTrustRSAAddTrustCA.crt')
//        ]

// };

// app.use(function(req, res, next) {
//   if (req.secure) {
//     next();
//   } else {
//     res.redirect('https://' + req.headers.host + req.url);
//   }
// });

app.use(cors());
app.use(express.static("./public/"));
app.use("/interviewee", express.static(__dirname + "/public/"));
app.use("/team", express.static(__dirname + "/public/"));
app.use(
  "/careers/apply/:city/:team/:position/",
  express.static(__dirname + "/public/")
);
app.use("/careers", express.static(__dirname + "/public/"));
app.use("/career/assign-team/", express.static(__dirname + "/public/"));
app.use("/career/assign-question/", express.static(__dirname + "/public/"));
app.use("/career/assign-location/", express.static(__dirname + "/public/"));
app.use("/interviewee/view-profile/", express.static(__dirname + "/public/"));
app.use("/interviewee/feedback/", express.static(__dirname + "/public/"));
app.use(bodyParser.json());
app.use(cookieParser());

app.get("/login", login_auth, (req, res) => {
  return res.sendFile(path.join(__dirname + "/public/signin.html"));
});

app.get("/interviewer-login", login_auth, (req, res) => {
  return res.sendFile(path.join(__dirname + "/public/recruiter-signin.html"));
});

app.get("/register", (req, res) => {
  return res.sendFile(path.join(__dirname + "/public/signup.html"));
  // res.sendFile(path.join(__dirname+'/public/404.html'))
});

app.get("/dashboard", auth, (req, res) => {
  return res.sendFile(path.join(__dirname + "/public/dashboard.html"));
});

app.get("/logout", (req, res) => {
  res.clearCookie("token");
  res.redirect("/login");
});

app.get("/user/get-user", auth, async (req, res) => {
  res.status(200).send(req.user.name);
});

app.get("/team/add-recruiter", auth, (req, res) => {
  res.sendFile(path.join(__dirname + "/public/addrecruiter.html"));
});

app.get("/team/add-team", auth, (req, res) => {
  res.sendFile(path.join(__dirname + "/public/addteam.html"));
});

app.get("/get-team", auth, async (req, res) => {
  var teamData = await Team.find();
  res.status(200).send(teamData);
});

app.get("/team/view-recruiters", auth, async (req, res) => {
  res.sendFile(path.join(__dirname + "/public/viewrecruiters.html"));
});

app.get("/get-recruiters", auth, async (req, res) => {
  var recruiters = await Recruiter.find();
  res.status(200).send({ recruiters });
});

app.get("/activate/recruiter/:token", async (req, res) => {
  var otpToken = req.params.token;
  try {
    const token = otpToken;
    const decoded = jwt.verify(token, "interviewProv1OTP");
    const user = await Recruiter.findOne({ _id: decoded._id });
    if (!user) {
      throw new Error();
    }
    if (user.token != token) {
      throw new Error();
    }
    res.cookie("activationtoken", token, { secure: false, httpOnly: true });
    res.sendFile(
      path.join(__dirname + "/public/activate/recruiter/activaterecruiter.html")
    );
  } catch (e) {
    res.send({ error: "Token Expired" });
  }
});

app.get("/interviewee/add-new", auth, (req, res) => {
  res.sendFile(path.join(__dirname + "/public/addnewrecruit.html"));
});

app.get("/interviewee/view", auth, (req, res) => {
  res.sendFile(path.join(__dirname + "/public/view-all-recruits.html"));
});

app.get("/interviewee/get-all", auth, async (req, res) => {
  var limit = 0;
  var match = {};
  if (req.query.type) {
    match.status = req.query.type;
  }
  if (req.query.limit) {
    limit = Number(req.query.limit);
  }
  try {
    var recruites = await Recruites.find(match)
      .populate("recruiters")
      .populate("position")
      .sort({ _id: -1 })
      .limit(limit);
    res.status(200).send({ recruites });
  } catch (e) {
    console.log(e);
    res.send(e);
  }
});

app.get("/calendar/get-events", auth, (req, res) => {
  const TOKEN_PATH = "./modules/tokens/token.json";
  fs.readFile(
    path.join(__dirname + "/modules/tokens/credentials.json"),
    (err, content) => {
      if (err) return console.log("Error loading client secret file:", err);
      authorize(JSON.parse(content), listEvents);
    }
  );
  function authorize(credentials, callback) {
    const { client_secret, client_id, redirect_uris } = credentials.installed;
    const oAuth2Client = new google.auth.OAuth2(
      client_id,
      client_secret,
      redirect_uris[0]
    );
    fs.readFile(TOKEN_PATH, (err, token) => {
      if (err) return getAccessToken(oAuth2Client, callback);
      oAuth2Client.setCredentials(JSON.parse(token));
      callback(oAuth2Client, sendResponse);
    });
  }
  function getAccessToken(oAuth2Client, callback) {
    const authUrl = oAuth2Client.generateAuthUrl({
      access_type: "offline",
      scope: SCOPES
    });
    console.log("Authorize this app by visiting this url:", authUrl);
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    rl.question("Enter the code from that page here: ", code => {
      rl.close();
      oAuth2Client.getToken(code, (err, token) => {
        if (err) return console.error("Error retrieving access token", err);
        oAuth2Client.setCredentials(token);
        fs.writeFile(TOKEN_PATH, JSON.stringify(token), err => {
          if (err) return console.error(err);
          console.log("Token stored to", TOKEN_PATH);
        });
        callback(oAuth2Client);
      });
    });
  }
  function listEvents(auth, callback) {
    const calendar = google.calendar({ version: "v3", auth });
    calendar.events.list(
      {
        calendarId: "primary",
        timeMin: new Date().toISOString(),
        maxResults: 10,
        singleEvents: true,
        orderBy: "startTime"
      },
      (err, res) => {
        if (err) return console.log("The API returned an error: " + err);
        const events = res.data.items;
        if (events.length) {
          // console.log('Upcoming 10 events:');
          events.map((event, i) => {
            const start = event.start.dateTime || event.start.date;
            // console.log(`${start} - ${event.summary}`);
          });
          callback(events);
        } else {
          console.log("No upcoming events found.");
          callback(events);
        }
      }
    );
  }
  async function sendResponse(events) {
    var eventArray = [];
    for (var i = 0; i < events.length; i++) {
      var title = events[i].summary;
      var attendee = events[i].attendees;
      var start = events[i].start.dateTime;
      var end = events[i].end.dateTime;
      var cal_id = events[i].id;
      try {
        for (var j = 0; j < attendee.length; j++) {
          var attn_email = attendee[j].email;
          var recruitesData = await Recruites.findOne({ email: attn_email });
          if (recruitesData) {
            var recruites = recruitesData;
            attendee = attn_email;
          }
        }
        var att_name = recruites.name;
        var position = recruites.position;
        var location = recruites.location;
        var career = await Careers.findOne({ _id: position });
        position = career.title;
        eventArray.push({
          title,
          attendee,
          start,
          end,
          cal_id,
          att_name,
          position,
          location
        });
      } catch (e) {
        console.log(e);
      }
    }
    res.send({ events: eventArray });
  }
});

app.get("/careers/apply/:city/:team/:position", (req, res) => {
  res.sendFile(path.join(__dirname + "/public/submit-resume.html"));
});

app.get("/recruits/view-resume/:id", auth, async (req, res) => {
  var id = req.params.id;
  var user = await Recruites.findOne({ _id: id });
  if (!user) {
    return res.status(400).send({ error: "No user found" });
  }
  var resumeFile = user.resume;
  res.sendFile(path.join(__dirname + "/resumes/" + resumeFile));
});

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname + "/public/view-careers.html"));
});

app.get("/careers/add-new", auth, (req, res) => {
  res.sendFile(path.join(__dirname + "/public/add-new-career.html"));
});

app.get("/careers/manage-careers", auth, (req, res) => {
  res.sendFile(path.join(__dirname + "/public/manage-careers.html"));
});

app.get("/careers/get-all", async (req, res) => {
  var match = {};
  if (req.query.status) {
    match.status = req.query.status;
  }
  careers = await Careers.find(match);
  if (req.query.status) {
    var careersArray = [];
    for (var i = 0; i < careers.length; i++) {
      var careerObject = careers[i].toObject();
      // delete careerObject._id
      careersArray.push(careerObject);
    }
    return res.send({ careers: careersArray });
  }
  res.send({ careers });
});

app.get("/careers/get", async (req, res) => {
  match = {};
  if (req.query.position) {
    match.custom_url = req.query.position;
  }
  var career = await Careers.findOne(match);
  if (!career) {
    res.status(400).send({ error: "Not Found" });
  }
  res.send({ career });
});

app.get("/careers/get-position/", async (req, res) => {
  match = {};
  if (req.query.position) {
    match._id = req.query.position;
  }
  var career = await Careers.findOne({
    "custom_url.chennai": req.query.position
  });
  if (!career) {
    career = await Careers.findOne({
      "custom_url.bangalore": req.query.position
    });
    if (!career) {
      career = await Careers.findOne({
        "custom_url.mumbai": req.query.position
      });
      res.status(400).send({ error: "Not Found" });
    }
  }
  res.send({ career });
});

app.get("/interviewee/data-sheet", auth, async (req, res) => {
  res.sendFile(path.join(__dirname + "/public/recruits-data-sheet.html"));
});

app.get("/career/assign-question/:career_id", auth, (req, res) => {
  Careers.findOne({ _id: req.params.career_id }).exec((err, data) => {
    if (err) {
      return res.sendFile(path.join(__dirname + "/public/404.html"));
    }
    if (!data) {
      return res.sendFile(path.join(__dirname + "/public/404.html"));
    }
    res.sendFile(path.join(__dirname + "/public/career-question-assign.html"));
  });
});

app.get("/career/assign-team/:career_id", auth, (req, res) => {
  Careers.findOne({ _id: req.params.career_id }).exec((err, data) => {
    if (err) {
      return res.sendFile(path.join(__dirname + "/public/404.html"));
    }
    if (!data) {
      return res.sendFile(path.join(__dirname + "/public/404.html"));
    }
    res.sendFile(path.join(__dirname + "/public/career-team-assign.html"));
  });
});

app.get("/career/assign-location/:career_id", auth, (req, res) => {
  Careers.findOne({ _id: req.params.career_id }).exec((err, data) => {
    if (err) {
      return res.sendFile(path.join(__dirname + "/public/404.html"));
    }
    if (!data) {
      return res.sendFile(path.join(__dirname + "/public/404.html"));
    }
    res.sendFile(path.join(__dirname + "/public/career-location-assign.html"));
  });
});

app.get(
  "/interviewee/view-profile/:recruit_id",
  secondary_auth,
  async (req, res) => {
    await Recruites.findOne({ _id: req.params.recruit_id }).exec(
      (err, data) => {
        if (err) {
          return res.sendFile(path.join(__dirname + "/public/404.html"));
        }
        res.sendFile(path.join(__dirname + "/public/recruit-profile.html"));
      }
    );
  }
);

app.get(
  "/interviewee/feedback/:recruit_id",
  secondary_auth,
  async (req, res) => {
    await Recruites.findOne({ _id: req.params.recruit_id }).exec(
      (err, data) => {
        if (err) {
          return res.sendFile(path.join(__dirname + "/public/404.html"));
        }
        res.sendFile(path.join(__dirname + "/public/feedback.html"));
      }
    );
  }
);

app.get("/get-skills", secondary_auth, async (req, res) => {
  await Skills.find().exec((err, data) => {
    if (err) {
      res.status(400).send();
    }
    res.send({ skills: data });
  });
});

//Get Request Ends

//Post Requests
app.post("/recruiter-send-recruit-profile", auth, async (req, res) => {
  var recruit_id = req.body.recruit_id;
  var recruiter_id = req.body.recruiter_id;
  var recruit = await Recruites.findOne({ _id: recruit_id });
  var recruit_name = recruit.name;
  var resume = path.join(__dirname + "/resumes/" + recruit.resume);
  var position = recruit.position;
  var career = await Careers.findOne({ _id: position });
  position = career.title;
  var recruiter = await Recruiter.findOne({ _id: recruiter_id });
  var recruiter_email = recruiter.email;
  var recruiter_name = recruiter.name;
  await recruiterAssignEmail(
    recruiter_name,
    recruit_name,
    recruiter_email,
    position,
    resume
  );
  res.send({ message: "success" });
});

app.post("/create-skills", async (req, res) => {
  var name = req.body.name;
  var skill = new Skills({
    name
  });
  try {
    await skill.save();
    res.send({ skill });
  } catch (e) {
    res.send({ e });
  }
});

app.post("/interviewee/submit-feedback", secondary_auth, (req, res) => {
  var recruit_id = req.body.id;
  var current_position = req.body.current_position;
  var current_ctc = req.body.current_ctc;
  var expected_ctc = req.body.expected_ctc;
  var comments = req.body.comments;
  var skills = req.body.skills;
  var sb_values = req.body.sb_values;
  Recruites.findOne({ _id: recruit_id }).exec(async (err, data) => {
    data.feedback.current_ctc = current_ctc;
    data.feedback.expected_ctc = expected_ctc;
    data.feedback.current_position = current_position;
    data.feedback.comments = comments;
    data.feedback.skill_set = skills;
    data.feedback.sb_values = sb_values;
    try {
      await data.save();
      res.send({ data });
    } catch (e) {
      res.status(400).send({ e });
    }
  });
});

app.post("/get-recruit-data", secondary_auth, async (req, res) => {
  var id = req.body.id;
  await Recruites.findOne({ _id: id })
    .populate("position")
    .populate("recruiters")
    .populate("hr")
    .populate("feedback.skill_set.skill_title")
    .exec((err, data) => {
      if (err) {
        return res.status(404).send();
      }
      res.send({ recruit: data });
    });
});

app.post("/get-career-recruiters", auth, async (req, res) => {
  var career_id = req.body.id;
  var career = await Careers.findOne({ _id: career_id });
  var hr = await User.find();
  var recruiters = await Recruiter.find();
  res.send({ career, hr, recruiters });
});

app.post("/get-career-team", auth, async (req, res) => {
  var recruit_id = req.body.id;
  var career_id = req.body.career;
  var career = await Careers.findOne({ _id: career_id })
    .populate("recruiters")
    .populate("hr");
  var recruit = await Recruites.findOne({ _id: recruit_id });
  var selected = [];
  if (!career) {
    return res.status(400).send();
  }
  selected.push({ recruiters_sel: recruit.recruiters, hr_sel: recruit.hr });
  res.send({ career, selected });
});

app.post("/careers/assign-locations", auth, async (req, res) => {
  var id = req.body.id;
  var career = await Careers.findOne({ _id: id });
  career.career_location = req.body.locations;
  try {
    await career.save();
    res.send();
  } catch (e) {
    res.status(400).send(e);
  }
});

app.post("/careers/assign-question", auth, async (req, res) => {
  var id = req.body.id;
  var career = await Careers.findOne({ _id: id });
  career.career_question = req.body.career_question;
  try {
    await career.save();
    res.send();
  } catch (e) {
    res.status(400).send(e);
  }
});

app.post("/careers/assign-team", auth, async (req, res) => {
  var id = req.body.id;
  var recruiters = req.body.recruiters;
  var hr = req.body.hr;
  try {
    await Careers.findOneAndUpdate(
      { _id: id },
      {
        recruiters: recruiters,
        hr: hr
      },
      {},
      () => {
        console.log("Updated");
        res.send();
      }
    );
  } catch (e) {
    console.log(e);
  }
  res.send();
});

app.post("/recruits/check-data", async (req, res) => {
  var match = {};
  if (req.body.email) {
    if (req.body.email != "") {
      match.email = req.body.email;
    }
  }
  if (req.body.phone) {
    if (req.body.phone != "") {
      match.phone = req.body.phone;
    }
  }
  user = await Recruites.findOne(match);
  if (user) {
    return res.send({ user: true });
  }
  res.send({ user: false });
});

app.post("/update-careers", auth, async (req, res) => {
  var id = req.body.id;
  var title = req.body.title;
  var custom_url = {};
  custom_url.chennai = req.body.chennai_url;
  custom_url.mumbai = req.body.mumbai_url;
  custom_url.bangalore = req.body.bangalore_url;
  var description = req.body.description;
  var excerpt = req.body.excerpt;
  var query = { _id: id };
  try {
    var career = await Careers.findOneAndUpdate(query, {
      title,
      custom_url,
      description,
      excerpt
    });
    res.send();
  } catch (e) {
    console.log(e);
    res.status(400).send(e);
  }
});

app.post("/get-career", auth, async (req, res) => {
  var id = req.body.id;
  try {
    career = await Careers.findOne({ _id: id });
    res.send({ career });
  } catch (e) {
    res.status(404).send();
  }
});

app.post("/careers/manage-careers", auth, async (req, res) => {
  var status = req.body.status;
  var id = req.body.id;
  career = await Careers.findOne({ _id: id });
  if (!career) {
    return res.status(400).send();
  }
  career.status = status;
  try {
    await career.save();
    res.send(career);
  } catch (e) {
    res.status(400).send();
  }
});

app.post("/careers/add-new", auth, async (req, res) => {
  var title = req.body.position;
  var team = req.body.team;
  var description = req.body.description;
  var status = "0";
  var excerpt = req.body.excerpt;
  var mumbai_url = req.body.mumbai_url;
  var chennai_url = req.body.chennai_url;
  var bangalore_url = req.body.bangalore_url;
  var custom_url = {};
  custom_url.chennai = chennai_url;
  custom_url.bangalore = bangalore_url;
  custom_url.mumbai = mumbai_url;

  var career = new Careers({
    title,
    team,
    description,
    status,
    excerpt,
    custom_url
  });

  try {
    await career.save();
    res.send(career);
  } catch (e) {
    console.log(e);
    res.status(400).send(e);
  }
});

app.post("/recruits/reject", auth, async (req, res) => {
  var id = req.body.id;
  var user = await Recruites.findOne({ _id: id });
  if (!user) {
    return res.status(404).send({ error: "user not found" });
  }
  var user_email = user.email;
  var user_name = user.name;
  var cal_id = user.calendar_id;
  user.status = "rejected";
  if (!user.inetrview_status == "0") {
    user.inetrview_date = undefined;
    user.interview_end_time = undefined;
    user.interview_start_time = undefined;
  }
  if (cal_id != "") {
    var params = {
      c_id: cal_id,
      email: user_email
    };
    await eventCalendar.removeEvent(params);
  }
  try {
    await user.save();
    await sendRejectionEmail(user_name, user_email);
    res.status(200).send({ success: "success" });
  } catch (e) {
    res.status(400).send();
  }
});

app.post(
  "/upload",
  upload.single("upload"),
  async (req, res) => {
    var name = req.body.fullName;
    var email = req.body.email;
    var phone = req.body.phone;
    var experience = req.body.experience;
    var location = req.body.city;
    var resume = req.file.filename;
    var position = req.body.position;
    var team = req.body.team;
    var recruit_type = req.body.recruit_type;
    var status = "new";
    var career_question = req.body.career_question;
    var current_ctc = req.body.current_ctc;
    var inetrview_status = 0;
    var current_company = req.body.company_name;
    var city = req.body.beat_city;
    var application_no = Math.floor(100000 + Math.random() * 900000);
    const user = new Recruites({
      email,
      name,
      phone,
      experience,
      team,
      position,
      location,
      current_company,
      city,
      career_question,
      status,
      feedback: {
        current_ctc
      },
      inetrview_status,
      recruit_type,
      resume,
      application_no
    });
    try {
      await user.save();
      const token = await user.generateAuthToken();
      var career = await Careers.findOne({ _id: position });
      var position_title = career.title;
      await sendWelcomeEmail(
        name,
        email,
        token,
        application_no,
        position_title
      );
      res.status(200).send({ status: "success" });
    } catch (e) {
      console.log(e);
      res.status(404).send({ error: e });
    }
  },
  (error, req, res, next) => {
    res.status(400).send({ error: error });
  }
);

app.post("/calendar/delete-event", auth, async (req, res) => {
  var c_id = req.body.c_id;
  var email = req.body.email;
  var params = {
    c_id,
    email
  };
  await eventCalendar.removeEvent(params);
  res.send();
});

app.post("/calendar-event", auth, async (req, res) => {
  var eventNamme = req.body.eventNamme;
  var eventLocation = req.body.eventLocation;
  var eventDescription = req.body.eventDescription;
  var eventStartTime = req.body.eventStartDateTime;
  var eventEndTime = req.body.eventEndDateTime;
  var recruit_id = req.body.recruit_id;
  var recruit_email = req.body.recruit_email;
  var interviewee = await Recruites.findOne({ _id: recruit_id })
    .populate("recruiters")
    .populate("hr");
  var assignees = [];
  assignees.push({ email: recruit_email });
  for (var i = 0; i < interviewee.recruiters.length; i++) {
    assignees.push({ email: interviewee.recruiters[i].email });
  }
  for (var j = 0; j < interviewee.hr.length; j++) {
    assignees.push({ email: interviewee.hr[j].email });
  }
  var int_s_time = req.body.startTime;
  var int_e_time = req.body.endTime;
  var int_d = req.body.date;

  var eventdata = {
    eventNamme,
    eventLocation,
    eventDescription,
    eventStartTime,
    eventEndTime,
    recruit_id,
    assignees,
    recruit_email,
    int_s_time,
    int_e_time,
    int_d
  };
  // return;
  await eventCalendar.addEvent(eventdata, () => {
    res.status(200).send();
  });
});

app.post("/interviewee/asign-recruiter", auth, async (req, res) => {
  var recruit_id = req.body.recruit_id;
  var recruiter_id = req.body.recruiter_id;
  var hr_id = req.body.hr_id;
  console.log(recruiter_id);
  // return;
  var recruit = await Recruites.findOne({ _id: recruit_id });
  var recruit_name = recruit.name;
  var resume = path.join(__dirname + "/resumes/" + recruit.resume);
  var position = recruit.position;
  var career = await Careers.findOne({ _id: position });
  position = career.title;
  recruit.recruiters = recruiter_id;
  recruit.hr = hr_id;
  recruit.status = "processing";
  try {
    await recruit.save();
    res.status(200).send();
  } catch (e) {
    console.log(e);
    res.status(400).send({ error: "Error saving to database" });
  }
  var assignees = [];
  try {
    var recruiter = await Recruiter.find({
      _id: { $in: recruiter_id }
    });
    for (var i = 0; i < recruiter.length; i++) {
      var rec_email = recruiter[i].email;
      assignees.push(rec_email);
    }

    var hr_email = await User.find({
      _id: { $in: hr_id }
    });

    for (var j = 0; j < hr_email.length; j++) {
      var hr_emailA = hr_email[j].email;
      assignees.push(hr_emailA);
    }
  } catch (e) {
    console.log(e);
  }
  assignees = assignees.join();
  var recruiter_name = "Team";
  await recruiterAssignEmail(
    recruiter_name,
    recruit_name,
    assignees,
    position,
    resume
  );
  res.status(200).send();
});

app.post(
  "/create-recruit",
  upload.single("upload"),
  auth,
  async (req, res) => {
    var name = req.body.name;
    var email = req.body.email;
    var resume = req.file.filename;
    var phone = req.body.phone;
    var team = req.body.team;
    var location = req.body.location;
    var experience = req.body.experience;
    var position = req.body.position;
    var recruit_type = req.body.type;
    var status = "new";
    var inetrview_status = 0;
    var application_no = Math.floor(100000 + Math.random() * 900000);
    const user = new Recruites({
      name,
      email,
      phone,
      team,
      recruit_type,
      status,
      location,
      experience,
      position,
      inetrview_status,
      application_no,
      resume
    });
    try {
      await user.save();
      const token = await user.generateAuthToken();
      var career = await Careers.findOne({ _id: position });
      var position_title = career.title;
      await sendWelcomeEmail(
        name,
        email,
        token,
        application_no,
        position_title
      );
      res.status(200).send({ status: "success" });
    } catch (e) {
      console.log(e);
      res.status(404).send({ error: e });
    }
  },
  (error, req, res, next) => {
    res.status(400).send({ error: error });
  }
);

app.post(
  "/create-recruiter-password",
  recruiter_activation_auth,
  async (req, res) => {
    var password = req.body.password;
    user = req.user;
    try {
      user.password = password;
      const token = jwt.sign({ _id: user._id.toString() }, "interviewProv1");
      user.token = token;
      user.status = "active";
      await user.save();
    } catch (e) {
      console.log(e);
    }
    res.clearCookie("activationtoken");
    res.status(200).send({ message: "success" });
  }
);

app.post("/create-user/", async (req, res) => {
  // return res.status(404).send();
  var name = req.body.name;
  var email = req.body.email;
  var password = req.body.password;
  const user = new User({
    name,
    email,
    password
  });
  try {
    await user.save();
    const token = await user.generateAuthToken();
    res.cookie("token", token, { secure: false, httpOnly: true });
    res.status(201).send({ user });
  } catch (e) {
    res.status(400).send(e);
  }
});

app.post("/login-user/", async (req, res) => {
  try {
    const user_token = await User.findByCredentials(
      req.body.email,
      req.body.password
    );
    res.cookie("token", user_token, { secure: false, httpOnly: true });
    const data = {
      token: user_token,
      verified: true
    };
    res.status(200).send(data);
  } catch (e) {
    res.status(404).send(e);
  }
});

app.post("/login-recruiter/", async (req, res) => {
  try {
    const user_token = await Recruiter.findByCredentials(
      req.body.email,
      req.body.password
    );
    res.cookie("token", user_token, { secure: false, httpOnly: true });
    const data = {
      token: user_token,
      verified: true
    };
    res.status(200).send(data);
  } catch (e) {
    res.status(404).send(e);
  }
});

app.post("/create-team", auth, async (req, res) => {
  var name = req.body.name;
  const team = new Team({ name });
  try {
    await team.save();
    res.status(200).send({ team });
  } catch (e) {
    res.status(400).send(e);
  }
});

app.post("/create-recruiter", auth, async (req, res) => {
  var name = req.body.name;
  var email = req.body.email;
  var team = req.body.team;
  var status = "inactive";
  const recruiter = new Recruiter({
    name,
    email,
    team,
    status
  });
  try {
    await recruiter.save();
    var token = await recruiter.generateOTPToken();
    await activate_rec_mail(name, email, token);
    res.status(200).send();
  } catch (e) {
    res.status(404).send(e);
  }
});
//Post Requests

app.use(function(req, res, next) {
  return res.status(404).sendFile(path.join(__dirname + "/public/404.html"));
});

// https.createServer(https_options, app).listen(443, ()=>{
//   console.log('Started on port 443');
// });

// http.createServer(app).listen(80, ()=>{
//   console.log('Started on port 80');
// });

app.listen(port, () => {
  console.log(`Started on port ${port}`);
});

module.exports = { app };
