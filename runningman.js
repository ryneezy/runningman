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
      // TODO: Send results
      _.forEach(that.game, function(player) {
        var correctAnswers = _.filter(player["correct"], function(answer, question) {
          return answer
        })
        console.log(player['name'] + " got " + correctAnswers.length + " correct")
      });

      that.game = undefined;
    },
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

    that.adminTasks[task]();
  }

  this.handlePlayerMessage = function (player, message) {
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
  }

  this.answerQuestion = function(player, message) {
    var question = that.getCurrentQuestion();
    console.log(player + " answering question " + "\"" + question['question'] + "\" with " + message)
    if (message.length < 0) {
      console.log("Did not receive answer");
      return;
    }

    answer = message.toLowerCase().charAt(0)
    if (!_.has(question.choices, answer)) {
      console.log("Invalid answer");
      return;
    }

    if (_.has(that.game[player]['correct'], that.questionIndex)) {
      console.log(player + " already answered question " + that.questionIndex)
      return;
    }

    var correct = answer == question.answer
    console.log(player + " answered question " + that.questionIndex + " correctly: " + correct);
    that.game[player]['correct'][that.questionIndex] = correct
  }

  this.getCurrentQuestion = function() {
    if (that.questionIndex >= that.questions.length) {
      console.log("No more questions!");
      return undefined;
    }

    console.log("Getting current question at index " + that.questionIndex);
    var question = that.questions[that.questionIndex];
    console.log("Current question is " + question.question)
    console.log("Choices are: ");
    _.forEach(question.choices, function(choice, question) {
      console.log(choice + ": " + question);
    });
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

