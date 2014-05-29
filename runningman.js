var _ = require('lodash');

function RunningMan(admins, questions, notifier) {
  var that = this // Stupid JS scoping issues. But Node is just so awesome I'll deal with it.

  this.admins = admins;
  this.questions = questions;
  this.notifier = notifier;

  this.gameInProgress = false;
  this.game = undefined;
  this.questionIndex = undefined;

  this.adminTasks = {
    "s": function() {
      that.gameInProgress = true;
      that.game = {};
      that.questionIndex = undefined;
      console.log("Started game");
    },
    "n": function() {
      console.log("Current question index is: " + that.questionIndex);
      that.questionIndex = that.questionIndex === undefined ? 0 : that.questionIndex + 1;
      that.publishQuestion(that.getCurrentQuestion());
    },
    "e": function() {
      that.gameInProgress = false;
      console.log("Ending game...");
      that.publishResults();
      that.game = undefined;
    },
  }

  this.publishResults = function() {
    // Calculate scores
    var scores = _.mapValues(that.game, function(profile, player, o) {
      var correctAnswers = _.filter(profile['correct'], function(answer, __) {
        return answer == "correct"
      });

      return correctAnswers.length
    });

    // Send scores to each player
    _.forEach(scores, function(score, player) {
      notifier.notify(player, "You got " + score + " questions correct");
    });

    var report = "Trivia Results:"
    // lodash's reduce function on objects suck. Can't give it a seed value!
    _.forEach(scores, function(score, player) {
      report += "\n" + player + ": " + score;
    });

    _.forEach(admins, function(admin) {
      notifier.notify(admin, report);
    });
  }

  this.publishQuestion = function (question) {
    if (!question) {
      return;
    }
    _.forEach(that.game, function(__, player) {
      notifier.notify(player, that.formatQuestion(question));
    });
  }

  this.formatQuestion = function(question) {
    var s = question.question + "\n"
    _.forEach(question.choices, function(answer, choice) {
      s += choice + ": " + answer + "\n"
    });
    return s;
  }

  this.handleAdminMessage = function (task) {
    if (!(task in that.adminTasks)) {
      console.log("Invalid admin task " + task);
      return;
    }

    if (!that.game) {
      _.forEach(that.admins, function(admin) {
        notifier.notify(admin, "Cannot process admin request. No game in progress");
      });
    }

    that.adminTasks[task]();
  }

  this.handlePlayerMessage = function (player, message) {
    if (!that.game) {
      console.log("Cannot process player message. No game in progress.");
      return;
    }

    console.log("Handling player message from player " + player);
    if (!(player in that.game)) {
      that.registerPlayer(player, message);
      return;
    }

    that.answerQuestion(player, message);
  }

  this.registerPlayer = function (player, name) {
    console.log("Registering player " + name + ", with key " + player)
    that.game[player] = {
      "name": name,
      "correct": {}
    }
    notifier.notify(player, "Welcome " + name + "!");
  }

  this.answerQuestion = function(player, message) {
    var question = that.getCurrentQuestion();
    console.log(player + " answering question " + "\"" + question['question'] + "\" with " + message)
    if (message.length < 0) {
      var n = "You did not send an answer. Try again.\n" + that.formatQuestion(question);
      notifier.notify(player, n);
      return;
    }

    answer = message.toLowerCase().charAt(0)
    if (!_.has(question.choices, answer)) {
      var n = "'" + answer + "' is an invalid answer. Try again.\n" + that.formatQuestion(question);
      notifier.notify(player, n);
      return;
    }

    if (_.has(that.game[player]['correct'], that.questionIndex)) {
      var n = "You already answered question " + question.question;
      notifier.notify(player, n);
      return;
    }

    var correct = answer == question.answer ? "correct" : "incorrect";
    that.game[player]['correct'][that.questionIndex] = correct
    var n = "You answered " + question.question + " " + correct;
    notifier.notify(player, n);
  }

  this.getCurrentQuestion = function() {
    if (that.questionIndex >= that.questions.length) {
      console.log("No more questions!");
      return undefined;
    }

    console.log("Getting current question at index " + that.questionIndex);
    var question = that.questions[that.questionIndex];
    console.log("Current question is " + that.formatQuestion(question));
    console.log("Answer is: " + question.answer);
    return question;
  }
}

exports.RunningMan = RunningMan

RunningMan.prototype.onMessage = function onMessage(from, message) {
  if (_.contains(this.admins, from)) {
    this.handleAdminMessage(message);
    return;
  }

  this.handlePlayerMessage(from, message);
}
