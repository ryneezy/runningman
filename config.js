var fs = require('fs');

function Config() {
  var that = this // Stupid JS scoping issues. But Node is just so awesome I'll deal with it.

  var data = JSON.parse(fs.readFileSync('resources/app.json'));

  // Load game configuration
  that.admins = data.admins;
  console.log("Loaded admins: " + that.admins)
  that.questions = data.questions
  console.log("Loaded: " + that.questions.length + " questions")

  // Load Twilio configuration
  that.fromNumber = data.fromNumber;
}

exports.Config = Config;

Config.prototype.admins = function() {
  return this.admins;
}

Config.prototype.questions = function() {
  return this.questions;
}

Config.prototype.fromNumber = function() {
  return this.fromNumber;
}
