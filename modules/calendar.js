const fs = require('fs');
const readline = require('readline');
const {google} = require('googleapis');
const path = require('path');
const Recruites = require('../models/recruites')
const SCOPES = ['https://www.googleapis.com/auth/calendar'];
const TOKEN_PATH = './modules/tokens/token.json';

var getEvents = function () {
  fs.readFile(path.join(__dirname+'/tokens/credentials.json'), (err, content) => {
    if (err) return console.log('Error loading client secret file:', err);
    authorize(JSON.parse(content), listEvents);
  });
}

var addEvent = function (eventData,callback) {
  fs.readFile(path.join(__dirname+'/tokens/credentials.json'), (err, content) => {
    if (err) return console.log('Error loading client secret file:', err);
    authorize(JSON.parse(content), createEvent.bind({
      eventName : eventData.eventNamme,
      eventLocation : eventData.eventLocation,
      eventDescription : eventData.eventDescription,
      eventStartTime : eventData.eventStartTime,
      eventEndTime : eventData.eventEndTime,
      recruit_id : eventData.recruit_id,
      recruit_email : eventData.recruit_email,
      assignees: eventData.assignees,
      int_s_time : eventData.int_s_time,
      int_e_time : eventData.int_e_time,
      int_d : eventData.int_d
    }));
    callback()
  });
}

var removeEvent = function (params) {
  fs.readFile(path.join(__dirname+'/tokens/credentials.json'), (err, content) => {
    if (err) return console.log('Error loading client secret file:', err);
    authorize(JSON.parse(content), deleteEvents.bind({
      cal_id:params.c_id,
      email:params.email
    }));
  });
}


function authorize(credentials, callback) {
  const {client_secret, client_id, redirect_uris} = credentials.installed;
  const oAuth2Client = new google.auth.OAuth2(
      client_id, client_secret, redirect_uris[0]);

  fs.readFile(TOKEN_PATH, (err, token) => {
    if (err) return getAccessToken(oAuth2Client, callback);
    oAuth2Client.setCredentials(JSON.parse(token));
    callback(oAuth2Client);
  });
}

function getAccessToken(oAuth2Client, callback) {
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
  });
  console.log('Authorize this app by visiting this url:', authUrl);
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  rl.question('Enter the code from that page here: ', (code) => {
    rl.close();
    oAuth2Client.getToken(code, (err, token) => {
      if (err) return console.error('Error retrieving access token', err);
      oAuth2Client.setCredentials(token);
      fs.writeFile(TOKEN_PATH, JSON.stringify(token), (err) => {
        if (err) return console.error(err);
        console.log('Token stored to', TOKEN_PATH);
      });
      callback(oAuth2Client);
    });
  });
}

async function deleteEvents(auth){
  const calendar = google.calendar({version: 'v3', auth});
  var cal_id = this.cal_id;
  var email = this.email
  var params = {
    calendarId: 'primary',
    eventId: cal_id,
    sendUpdates:'all'
  };
  calendar.events.delete(params,async function(err) {
    if (err) {
      console.log('The API returned an error: ' + err);
      return res.status(400).send();
    }
    var query = { email: email };
    var options = {};
    try {
      await Recruites.findOneAndUpdate(query, {
        inetrview_status: '0',
        calendar_id : '',
        interview_start_time : '',
        interview_end_time : '',
        inetrview_date : ''
      }, options, ()=>{
        console.log('event deleted');
      })
    } catch (e) {
      console.log(e);
    }
  });
}

function listEvents(auth) {
  console.log(auth);
  const calendar = google.calendar({version: 'v3', auth});
  calendar.events.list({
    calendarId: 'primary',
    timeMin: (new Date()).toISOString(),
    maxResults: 10,
    singleEvents: true,
    orderBy: 'startTime',
  }, (err, res) => {
    if (err) return console.log('The API returned an error: ' + err);
    const events = res.data.items;
    if (events.length) {
      // console.log('Upcoming 10 events:');
      events.map((event, i) => {
        const start = event.start.dateTime || event.start.date;
        console.log(`${start} - ${event.summary}`);
        return event
      });
    } else {
      // console.log('No upcoming events found.');
    }
  });
}

function createEvent(auth){
  const calendar = google.calendar({version: 'v3', auth});
  var recruit_id = this.recruit_id
  var int_s_time = this.int_s_time
  var int_e_time = this.int_e_time
  var int_d = this.int_d
  var attn = this.assignees
  // for (var i = 0; i < this.recruiter_email.length; i++) {
  //   attn.push({'email':this.recruiter_email[i]})
  // }
  var event = {
    'summary': this.eventName,
    'location': this.eventLocation,
    'description': this.eventDescription,
    'start': {
      'dateTime': this.eventStartTime,
      'timeZone': 'Asia/Kolkata',
    },
    'end': {
      'dateTime': this.eventEndTime,
      'timeZone': 'Asia/Kolkata',
    },
    'attendees': attn,
    'reminders': {
      'useDefault': false,
      'overrides': [
        {'method': 'email', 'minutes': 24 * 60},
        {'method': 'popup', 'minutes': 10},
      ],
    },
  };
  calendar.events.insert({
    auth: auth,
    calendarId: 'primary',
    resource: event,
    sendUpdates:'all',
  },async function(err, event) {
    if (err) {
      console.log('There was an error contacting the Calendar service: ' + err)
      return err
    }
    console.log('Event created')
    var recruit = await Recruites.findOne({_id:recruit_id})
    recruit.inetrview_status = "1"
    recruit.calendar_id = event.data.id
    recruit.interview_start_time = int_s_time
    recruit.interview_end_time = int_e_time
    recruit.inetrview_date = int_d
    try {
      recruit.save()
    } catch (e) {
      console.log(e);
      return e
    }
  });
}

module.exports = {
  getEvents,
  addEvent,
  removeEvent
}
