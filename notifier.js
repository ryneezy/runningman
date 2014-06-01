var twilio = require('twilio')

function Notifier(from) {
  this.from = from;
  this.client = new twilio.RestClient();
}

exports.TwilioNotifier = Notifier

Notifier.prototype.notify = function(to, message) {
  this.client.messages.create({
    to: to,
    from: this.from,
    body: message
  }, function(error, message) {
    if (error) {
      console.log("Twilio Error: " + JSON.stringify(error));
    }
  });
}
