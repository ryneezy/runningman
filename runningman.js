var _ = require('lodash');

function RunningMan(admins, questions, notifier) {
  var that = this // Stupid JS scoping issues. But Node is just so awesome I'll deal with it.

  this.admins = admins;
  this.questions = questions;
  this.notifier = notifier;

  this.game = undefined;
  this.questionIndex = undefined;

  this.adminTasks = {
    "s": function(admin) {
      that.game = {};
      that.questionIndex = undefined;
      console.log("Started game");
      notifier.notify(admin, "Game started.");
    },
    "n": function(admin) {
      if (that.questionIndex >= that.questions.length) {
        notifier.notify(admin, "No more quetions left.");
        return;
      }

      if (that.questionIndex === undefined) {
        that.questionIndex = 0;
      } else {
        that.expireQuestions();
        that.questionIndex++;
      }

      var question = that.getCurrentQuestion();
      if (question) {
        that.publishQuestion(question);
        notifier.notify(admin, "At question " + that.questionIndex + ": " + question.question);
      }
    },
    "e": function(__) {
      console.log("Ending game...");
      that.publishResults();
      that.game = undefined;
    },
  }

  this.expireQuestions = function() {
    var expireTime = _.now()
    _.forEach(that.game, function(record, __) {
      var answers = record.answers;
      if (answers[that.questionIndex] === undefined) {
        answers[that.questionIndex] = {
          'correct': false,
          'answer_time': expireTime
        }
      }

      var answerTime = answers[that.questionIndex].answer_time;
      answers[that.questionIndex].time_bonus = expireTime - answerTime;
    });
  }

  this.publishResults = function() {
    var results = that.calculateResults();

    // Send scores to each player
    _.forEach(results, function(result) {
      var n = result.name + ", you got " + result.total_correct + " questions correct";
      notifier.notify(result.phone_number, n);
    });

    // Get top 3 results and send to admins
    var report = "Trivia Results:"
    var endSlice = results.length > 3 ? 3 : results.length;
    var topResults = results.slice(0, endSlice);
    _.forEach(topResults, function(r) {
      report += "\n" + r.name + " (" + r.phone_number + "): " + r.total_correct; 
    });

    _.forEach(admins, function(admin) {
      notifier.notify(admin, report);
    });
  }

  this.calculateResults = function() {
    var scores = _.mapValues(that.game, function(record, player) {
      var correctAnswers = _.filter(record.answers, function(answer, __) {
        return answer.correct;
      });

      var totalTimeBonus = _.reduce(record.answers, function(sum, ans, __) {
        return sum + ans.time_bonus;
      }, 0 )

      var result = {
        "name": record.name,
        "phone_number": player,
        "total_correct": correctAnswers.length,
        "total_time_bonus": totalTimeBonus
      }

      return result;
    });

    var sortedResults = _.sortBy(_.toArray(scores), function(r) {
      // lodash sorted in asc order, hence the negation.
      return -1 * (r.total_correct + r.total_time_bonus);
    });

    return sortedResults;
  }

  this.publishQuestion = function (question) {
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

    that.adminTasks[task](admin);
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
    console.log("Registering player " + name.trim() + ", with key " + player)
    that.game[player] = {
      "name": name,
      "answers": {}
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
      var n = "\"" + answer + "\" is an invalid answer. Try again.\n\n" + that.formatQuestion(question);
      notifier.notify(player, n);
      return;
    }

    if (_.has(that.game[player].answers, that.questionIndex)) {
      var n = "You already answered question \"" + question.question + "\"";
      notifier.notify(player, n);
      return;
    }

    var correct = answer == question.answer;
    var resultString = correct ? "correct" : "incorrect";

    var answerRecord = {
      "correct": correct,
      "answer_time": _.now()
    }

    that.game[player].answers[that.questionIndex] = answerRecord;
    var n = "You answered " + question.question + " " + resultString;
    notifier.notify(player, n);
  }

  this.getCurrentQuestion = function() {
    if (that.questionIndex >= that.questions.length) {
      console.log("No more questions!");
      return undefined;
    }

    console.log("Getting current question at index " + that.questionIndex);
    var question = that.questions[that.questionIndex];
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
