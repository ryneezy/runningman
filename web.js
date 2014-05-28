var express = require('express');
var logfmt = require('logfmt');
var bodyParser = require('body-parser');
var runningman = require('./runningman.js');
var notifier = require('./notifier.js');
var config = require('./config.js');

var cfg = new config.Config();
var notifier = new notifier.TwilioNotifier(cfg.accountSid, cfg.authToken, cfg.fromNumber)
var usainBolt = new runningman.RunningMan(cfg.admins, cfg.questions, notifier);
var app = express()

app.use(logfmt.requestLogger());
app.use(bodyParser())

app.get('/', function(req, res) {
  res.send('hello world!');
});

app.post('/runningman', function(req, res) {
  var From = req.body.From
  var Body = req.body.Body
  usainBolt.onMessage(From, Body)
  res.send("bla");

});

var port = Number(process.env.PORT || 8080);
app.listen(port, function() {
  console.log("Listening on port " + port);
});
