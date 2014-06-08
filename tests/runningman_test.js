var _ = require('lodash')
var fs = require('fs')
var runningman = require('../runningman.js')

function MockNotifier() {
  this.notifications = []
  this.stashNotification = function(to, message) {
    this.notifications.push({
      "to": to,
      "message": message
    })
  }

  this.popNotification = function() {
    return this.notifications.pop()
  }
}

MockNotifier.prototype.notify = function(to, message) {
  this.stashNotification(to, message)
}

MockNotifier.prototype.lastNotification = function() {
  return this.popNotification()
}

function sleep(millis) {
  var s = _.now() + millis;
  while (_.now() <= s) {}
}

// TODO: Should refactor runningman so it's more testable, i.e. not looking at generated messages    
module.exports = {
  setUp: function(callback) {
    this.questions = JSON.parse(fs.readFileSync('tests/fixtures/questions.json'))
    this.players = JSON.parse(fs.readFileSync('tests/fixtures/players.json'))
    this.notifierMock = new MockNotifier()
    this.runningMan = new runningman.RunningMan(
      this.questions.admins, this.questions.questions, this.notifierMock)
    callback()
  },

  testAdminStartsAndEndsGame: function(test) {
    this.runningMan.onMessage(this.players.Admin, "s")
    var output = this.notifierMock.lastNotification()
    test.equal(this.players.Admin, output.to)
    test.equal("Game started.", output.message)

    this.runningMan.onMessage(this.players.Admin, "e")
    var output = this.notifierMock.lastNotification()
    test.equal(this.players.Admin, output.to)
    test.equal("Trivia Results:", output.message)

    test.done()
  },

  testInvalidAdminTask: function(test) {
    this.runningMan.onMessage(this.players.Admin, "x")
    var output = this.notifierMock.lastNotification()
    test.equal(this.players.Admin, output.to)
    test.equal("Invalid admin task \"x\"", output.message)

    test.done()
  },

  testNoAdminTask: function(test) {
    this.runningMan.onMessage(this.players.Admin, "")
    var output = this.notifierMock.lastNotification()
    test.equal(this.players.Admin, output.to)
    test.equal("You must input an admin task.", output.message)

    test.done()
  },

  testAdminTaskNoGameStarted: function(test) {
    this.runningMan.onMessage(this.players.Admin, "n")
    var output = this.notifierMock.lastNotification()
    test.equal(this.players.Admin, output.to)
    test.equal("Cannot process admin request. No game in progress", output.message)

    test.done()
  },

  testNoPlayerInteractionWithoutGame: function(test) {
    this.runningMan.onMessage(this.players.Players.APink, this.players.Players.APink)
    var output = this.notifierMock.lastNotification()
    test.equals(undefined, output, "Players cannot do anything if game is not started.")

    test.done()
  },

  testPlayerRegistration: function(test) {
    this.runningMan.onMessage(this.players.Admin, "s")

    var that = this // Seriously, JS???
    _.forEach(this.players.Players, function(number, name) {
      console.log(number)
      that.runningMan.onMessage(number, name)
      var output = that.notifierMock.lastNotification()
      test.equals(number, output.to)
      test.equals("Welcome " + name + "!", output.message)
    })

    test.done()
  },

  testQuestionPublishing: function(test) {
    this.runningMan.onMessage(this.players.Admin, "s")

    // Register
    this.runningMan.onMessage(this.players.Players.APink, "A-Pink")

    var that = this // Seriously, JS???
    _.forEach(this.questions.questions, function(q) {
      that.runningMan.onMessage(that.players.Admin, "n")
      var output = that.notifierMock.lastNotification()

      output = that.notifierMock.lastNotification()
      test.equals(that.players.Players.APink, output.to)
      var expectedQuestion = _.reduce(q.choices, function(str, answer, choice) {
        return str += "\n" + choice + ": " + answer
      }, q.question)
      test.equals(expectedQuestion, output.message)
    })

    // No more questions to publish.
    this.runningMan.onMessage(this.players.Admin, "n")
    var output = this.notifierMock.lastNotification()
    test.equals(this.players.Admin, output.to)
    test.equals("No more quetions left.", output.message)

    test.done()
  },

  testAnsweringCorrectIncorrect: function(test) {
    this.runningMan.onMessage(this.players.Admin, "s")

    // Register
    this.runningMan.onMessage(this.players.Players.APink, "A-Pink")

    // Correct Answer
    this.runningMan.onMessage(this.players.Admin, "n")
    this.runningMan.onMessage(this.players.Players.APink, "b")

    var output = this.notifierMock.lastNotification()
    var expectedMessage = "You answered " + this.questions.questions[0].question + " correct"
    test.equals(this.players.Players.APink, output.to)
    test.equals(expectedMessage, output.message)

    // Incorrect Answer
    this.runningMan.onMessage(this.players.Admin, "n")
    this.runningMan.onMessage(this.players.Players.APink, "b")

    output = this.notifierMock.lastNotification()
    expectedMessage = "You answered " + this.questions.questions[1].question + " incorrect"
    test.equals(this.players.Players.APink, output.to)
    test.equals(expectedMessage, output.message)

    test.done()
  },

  testInvalidAnswers: function(test) {
    this.runningMan.onMessage(this.players.Admin, "s")

    // Register
    this.runningMan.onMessage(this.players.Players.APink, "A-Pink")

    // Invalid Anwer
    this.runningMan.onMessage(this.players.Admin, "n")
    this.runningMan.onMessage(this.players.Players.APink, "What's happening, yo?")

    var output = this.notifierMock.lastNotification()
    var expectedMessage = _.reduce(this.questions.questions[0].choices, function(str, a, c) {
      return str += "\n" + c + ": " + a
    }, "\"w\" is an invalid answer. Try again.\n\n" + this.questions.questions[0].question)

    test.equals(this.players.Players.APink, output.to)
    test.equals(expectedMessage, output.message)

    test.done()
  },

  testDuplicateAnswers: function(test) {
    this.runningMan.onMessage(this.players.Admin, "s")

    // Register
    this.runningMan.onMessage(this.players.Players.APink, "A-Pink")

    // Incorrect Answer
    this.runningMan.onMessage(this.players.Admin, "n")
    this.runningMan.onMessage(this.players.Players.APink, "a")

    var output = this.notifierMock.lastNotification()
    var expectedMessage = "You answered " + this.questions.questions[0].question + " incorrect"
    test.equals(this.players.Players.APink, output.to)
    test.equals(expectedMessage, output.message)

    // Retry doesnt count
    this.runningMan.onMessage(this.players.Players.APink, "b")
    output = this.notifierMock.lastNotification()
    expectedMessage = "You already answered question \"" + this.questions.questions[0].question + "\""
    test.equals(this.players.Players.APink, output.to)
    test.equals(expectedMessage, output.message)

    test.done()
  },

  testScoring: function(test) {
    this.runningMan.onMessage(this.players.Admin, "s")

    // Register all player fixtures
    var that = this 
    _.forEach(this.players.Players, function(number, name) {
      console.log(number)
      that.runningMan.onMessage(number, name)
    })

    // Question 1
    var correct = this.questions.questions[0].answer
    var incorrect = "a"

    this.runningMan.onMessage(this.players.Admin, "n")
    this.runningMan.onMessage(this.players.Players.DaeSung, correct) 
    this.runningMan.onMessage(this.players.Players.APink, correct) 
    this.runningMan.onMessage(this.players.Players.BTOB, correct) 
    this.runningMan.onMessage(this.players.Players.CNBLUE, incorrect) 

    // Question 2 
    var correct = this.questions.questions[1].answer
    var incorrect = "a"

    this.runningMan.onMessage(this.players.Admin, "n")
    this.runningMan.onMessage(this.players.Players.DaeSung, correct) 
    this.runningMan.onMessage(this.players.Players.APink, correct) 
    this.runningMan.onMessage(this.players.Players.BTOB, incorrect) 
    this.runningMan.onMessage(this.players.Players.CNBLUE, incorrect) 

    // Question 3 
    var correct = this.questions.questions[2].answer
    var incorrect = "a"

    this.runningMan.onMessage(this.players.Admin, "n")
    this.runningMan.onMessage(this.players.Players.DaeSung, correct) 
    this.runningMan.onMessage(this.players.Players.APink, incorrect) 
    this.runningMan.onMessage(this.players.Players.BTOB, incorrect) 
    this.runningMan.onMessage(this.players.Players.CNBLUE, incorrect) 

    this.runningMan.onMessage(this.players.Admin, "e")
    var output = this.notifierMock.lastNotification()
    test.equals(this.players.Admin, output.to)
    var expectedMessage = "Trivia Results:\n"
    expectedMessage += "DaeSung (" + this.players.Players.DaeSung + "): 3\n"
    expectedMessage += "APink (" + this.players.Players.APink + "): 2\n"
    expectedMessage += "BTOB (" + this.players.Players.BTOB + "): 1"
    test.equals(expectedMessage, output.message)

    test.done()
  },

  testAnsweringScoringTieBreakers: function(test) {
    this.runningMan.onMessage(this.players.Admin, "s")

    // Register all player fixtures
    var that = this 
    _.forEach(this.players.Players, function(number, name) {
      console.log(number)
      that.runningMan.onMessage(number, name)
    })

    // Question 1
    var correct = this.questions.questions[0].answer
    var incorrect = "a"

    this.runningMan.onMessage(this.players.Admin, "n")
    this.runningMan.onMessage(this.players.Players.BTOB, correct) 
    sleep(100)
    this.runningMan.onMessage(this.players.Players.APink, correct) 
    sleep(100)
    this.runningMan.onMessage(this.players.Players.DaeSung, correct) 
    sleep(100)
    this.runningMan.onMessage(this.players.Players.CNBLUE, correct) 

    // Question 2 
    var correct = this.questions.questions[1].answer
    var incorrect = "a"

    this.runningMan.onMessage(this.players.Admin, "n")
    this.runningMan.onMessage(this.players.Players.BTOB, correct) 
    sleep(100)
    this.runningMan.onMessage(this.players.Players.APink, correct) 
    sleep(100)
    this.runningMan.onMessage(this.players.Players.DaeSung, correct) 
    sleep(100)
    this.runningMan.onMessage(this.players.Players.CNBLUE, correct) 

    // Question 3 
    var correct = this.questions.questions[2].answer
    var incorrect = "a"

    this.runningMan.onMessage(this.players.Admin, "n")
    this.runningMan.onMessage(this.players.Players.BTOB, correct) 
    sleep(100)
    this.runningMan.onMessage(this.players.Players.APink, correct) 
    sleep(100)
    this.runningMan.onMessage(this.players.Players.DaeSung, correct) 
    sleep(100)
    this.runningMan.onMessage(this.players.Players.CNBLUE, correct) 

    this.runningMan.onMessage(this.players.Admin, "e")
    var output = this.notifierMock.lastNotification()
    test.equals(this.players.Admin, output.to)
    var expectedMessage = "Trivia Results:\n"
    expectedMessage += "BTOB (" + this.players.Players.BTOB + "): 3\n"
    expectedMessage += "APink (" + this.players.Players.APink + "): 3\n"
    expectedMessage += "DaeSung (" + this.players.Players.DaeSung + "): 3"
    test.equals(expectedMessage, output.message)

    test.done()
  },

  testNoAnswersGetNoBonus: function(test) {
    this.runningMan.onMessage(this.players.Admin, "s")

    // Register all player fixtures
    var that = this 
    _.forEach(this.players.Players, function(number, name) {
      console.log(number)
      that.runningMan.onMessage(number, name)
    })

    // Question 1
    var correct = this.questions.questions[0].answer
    var incorrect = "a"

    this.runningMan.onMessage(this.players.Admin, "n")
    this.runningMan.onMessage(this.players.Players.DaeSung, correct) 
    this.runningMan.onMessage(this.players.Players.BTOB, correct) 
    this.runningMan.onMessage(this.players.Players.CNBLUE, correct) 

    // Question 2 
    var correct = this.questions.questions[1].answer
    var incorrect = "a"

    this.runningMan.onMessage(this.players.Admin, "n")
    this.runningMan.onMessage(this.players.Players.DaeSung, correct) 
    this.runningMan.onMessage(this.players.Players.BTOB, correct) 
    this.runningMan.onMessage(this.players.Players.CNBLUE, incorrect) 

    // Question 3 
    var correct = this.questions.questions[2].answer
    var incorrect = "a"

    this.runningMan.onMessage(this.players.Admin, "n")
    this.runningMan.onMessage(this.players.Players.DaeSung, correct) 
    this.runningMan.onMessage(this.players.Players.BTOB, incorrect) 
    this.runningMan.onMessage(this.players.Players.CNBLUE, incorrect) 

    this.runningMan.onMessage(this.players.Admin, "e")
    var output = this.notifierMock.lastNotification()
    test.equals(this.players.Admin, output.to)
    var expectedMessage = "Trivia Results:\n"
    expectedMessage += "DaeSung (" + this.players.Players.DaeSung + "): 3\n"
    expectedMessage += "BTOB (" + this.players.Players.BTOB + "): 2\n"
    expectedMessage += "CNBLUE (" + this.players.Players.CNBLUE + "): 1"
    test.equals(expectedMessage, output.message)

    test.done()
  },

  testScorringSpammingWrongAnsQuickly: function(test) {
    this.runningMan.onMessage(this.players.Admin, "s")

    // Register all player fixtures
    var that = this 
    _.forEach(this.players.Players, function(number, name) {
      console.log(number)
      that.runningMan.onMessage(number, name)
    })

    // Question 1
    var correct = this.questions.questions[0].answer
    var incorrect = "a"

    this.runningMan.onMessage(this.players.Admin, "n")
    this.runningMan.onMessage(this.players.Players.DaeSung, incorrect) 
    sleep(100)
    this.runningMan.onMessage(this.players.Players.BTOB, correct) 
    this.runningMan.onMessage(this.players.Players.CNBLUE, correct) 
    this.runningMan.onMessage(this.players.Players.APink, correct) 

    // Question 2 
    var correct = this.questions.questions[1].answer
    var incorrect = "a"

    this.runningMan.onMessage(this.players.Admin, "n")
    this.runningMan.onMessage(this.players.Players.DaeSung, incorrect) 
    sleep(100)
    this.runningMan.onMessage(this.players.Players.BTOB, correct) 
    this.runningMan.onMessage(this.players.Players.CNBLUE, correct) 
    this.runningMan.onMessage(this.players.Players.APink, incorrect) 

    // Question 3 
    var correct = this.questions.questions[2].answer
    var incorrect = "a"

    this.runningMan.onMessage(this.players.Admin, "n")
    this.runningMan.onMessage(this.players.Players.DaeSung, incorrect) 
    sleep(100)
    this.runningMan.onMessage(this.players.Players.BTOB, correct) 
    this.runningMan.onMessage(this.players.Players.CNBLUE, incorrect) 
    this.runningMan.onMessage(this.players.Players.APink, incorrect) 

    this.runningMan.onMessage(this.players.Admin, "e")
    var output = this.notifierMock.lastNotification()
    test.equals(this.players.Admin, output.to)
    var expectedMessage = "Trivia Results:\n"
    expectedMessage += "BTOB (" + this.players.Players.BTOB + "): 3\n"
    expectedMessage += "CNBLUE (" + this.players.Players.CNBLUE + "): 2\n"
    expectedMessage += "APink (" + this.players.Players.APink + "): 1"
    test.equals(expectedMessage, output.message)

    test.done()
  }
}
