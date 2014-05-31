var _ = require('lodash');

function RunningMan(admins, questions, notifier) {
  var that = this // Stupid JS scoping issues. But Node is just so awesome I'll deal with it.

  this.admins = admins;
  this.questions = questions;
  this.notifier = notifier;

  this.game = undefined;
  this.questionIndex = undefined;

  this.adminTasks = {
    "s": function() {
      that.game = {};
      that.questionIndex = undefined;
      console.log("Started game");
    },
    "n": function() {
      console.log("Current question index is: " + that.questionIndex);
      if (that.questionIndex === undefined) {
        that.questionIndex = 0;
      } else {
        that.expireQuestions();
        that.questionIndex++;
      }
      that.publishQuestion(that.getCurrentQuestion());
    },
    "e": function() {
      console.log("Ending game...");
      that.publishResults();
      that.game = undefined;
    },
  }

  this.expireQuestions = function() {
    var expireTime = _.now()
    _.forEach(that.game, function(profile, __) {
      if (profile['correct'][that.questionIndex] === undefined) {
        profile['correct'][that.questionIndex] = [ 'incorrect', expireTime ];
      }
      var timeToAnswer = profile['correct'][that.questionIndex][1];
      profile['correct'][that.questionIndex].push(expireTime - timeToAnswer);
      console.log(JSON.stringify(profile));
    });
  }

  this.publishResults = function() {
    // Calculate scores
    var scores = _.mapValues(that.game, function(profile, player, __) {
      var correctAnswers = _.filter(profile['correct'], function(answer, __) {
        return answer[0] == 'correct'
      });

      var timeToAnswer =
        _.reduce(_.pull(_.flatten(correctAnswers), "correct"), function(sum, num) {
          return sum + num;
        });

      var result = {
        "name": profile.name,
        "phone_number": player,
        "total_correct": correctAnswers.length,
        "time_to_answer": timeToAnswer
      }

      return result;
    });

    var sortedResults = _.sortBy(_.toArray(scores), function(r) {
      // lodash sorted in asc order, hence the negation.
      return -1 * (r.total_correct + r.time_to_answer);
    })


    // Send scores to each player
    _.forEach(sortedResults, function(result) {
      var n = result.name + ", you got " + result.total_correct + " questions correct";
      notifier.notify(result.phone_number, n);
    });

    // Get top 3 results and send to admins
    var report = "Trivia Results:"
    var endSlice = sortedResults.length > 3 ? 3 : sortedResults.length;
    var topResults = sortedResults.slice(0, endSlice);
    _.forEach(topResults, function(result) {
      report += "\n" + result.name + " (" + result.phone_number + "): " + result.total_correct;
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

  this.handleAdminMessage = function (admin, task) {
    if (!(task in that.adminTasks)) {
      notifier.notify(admin, "Invalid admin task \"" + task + "\"");
      return;
    }

    if (!that.game && task != 's') {
      notifier.notify(admin, "Cannot process admin request. No game in progress");
      return;
    }

    that.adminTasks[task]();
    notifier.notify(admin, "OK");
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
    console.log(player + " answering question " + "\"" + question.question + "\" with " + message)
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
    var answerRecord = [correct, _.now()];
    that.game[player]['correct'][that.questionIndex] = answerRecord;
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
    this.handleAdminMessage(from, message);
    return;
  }

  this.handlePlayerMessage(from, message);
}
