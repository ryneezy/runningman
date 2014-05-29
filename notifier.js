var twilio = require('twilio')

function Notifier(accountSid, authToken, from) {
  this.from = from;
  this.client = new twilio.RestClient(accountSid, authToken);
}

exports.TwilioNotifier = Notifier

Notifier.prototype.notify = function(to, message) {
  this.client.messages.create({
    to: to,
    from: this.from,
    body: message
  }, function(error, message) {
    if (error) {
      console.log("ERROR " + message);
    }
  });
}
