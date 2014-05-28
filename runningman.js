var fs = require('fs');
var _ = require('lodash');

fs.readFile('resources/app.json', function(err, data) {
  if (err) {
    console.log('Error' + err);
    return;
  }

  var d = JSON.parse(data)
  admins = d.admins
  console.log("Loaded admins: " + admins)
  questions = d.questions
  console.log("Loaded: " + questions.length + " questions")
});

var game_in_progress = false;
var game = undefined;
var currentQuestion;

var adminTasks = {
  "start": function() {
    game_in_progress = true;
    game = {};
    currentQuestion = undefined;
    console.log("Started game");
  },
  "next": function() {
    console.log("Current question index is: " + currentQuestion);
    currentQuestion = currentQuestion === undefined ? 0 : currentQuestion + 1;
    // TODO: Publish next question
    question = getCurrentQuestion();
  },
  "end": function() {
    game_in_progress = false;
    console.log("Ending game...");
    // TODO: Send results
    _.forEach(game, function(player) {
      console.log(player['name'] + " got " +player["correct"].length + " correct")
    });

    game = undefined;
  },
}

function onMessage(from, message) {
  if (_.contains(admins, from)) {
    handleAdminMessage(message);
    return;
  }

  handlePlayerMessage(from, message);
}

exports.onMessage = onMessage;

function handleAdminMessage(task) {
  if (!(task in adminTasks)) {
    return;
  }

  adminTasks[task]();
}

function handlePlayerMessage(player, message) {
  console.log("Handling player message from player " + player);
  if (!(player in game)) {
    registerPlayer(player, message);
    return;
  }

  answerQuestion(player, message);
}

function registerPlayer(player, name) {
  console.log("Registering player " + name + ", with key " + player)
  game[player] = {
    "name": name,
    "correct": []
  }
}

function answerQuestion(player, message) {
  var question = getCurrentQuestion();
  console.log(player + " answering question " + "\"" + question['question'] + "\" with " + message)
  if (message.length < 0) {
    return;
  }

  answer = message.toLowerCase().charAt(0)
  if (answer == question['answer']) {
    game[player]['correct'].push(currentQuestion)
    console.log("question correct");
  } else {
    console.log("question incorrect");
  }
}

function getCurrentQuestion() {
  console.log("Getting current question at index " + currentQuestion);
  var question = questions[currentQuestion];
  console.log("Current question is " + question.question)
  console.log("Choices are: ");
  _.forEach(question.choices, function(v, k) {
    console.log(k + ": " + v);
  });
  console.log("Answer is: " + question.answer);
  return question;
}
