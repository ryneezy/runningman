var express = require('express')
var logfmt = require('logfmt')
var bodyParser = require('body-parser')
var runningman = require('./runningman.js')

var app = express()

app.use(logfmt.requestLogger());
app.use(bodyParser())

app.get('/', function(req, res) {
  res.send('hello world!');
});

app.post('/runningman', function(req, res) {
  var From = req.body.From
  var Body = req.body.Body
  runningman.onMessage(From, Body)
  res.send("bla");

});

var port = Number(process.env.PORT || 8080);
app.listen(port, function() {
  console.log("Listening on port " + port);
});
