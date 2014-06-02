# RunningMan #

A Trivia text app. It's great for playing trivia games at large parties such as weddings or birthdays.

### How do I get set up? ###

1. Install [nodejs](http://nodejs.org/) and [npm](https://www.npmjs.org/)
1. Change to project directory
1. `npm install .`
1. Set the environment variables `TWILIO_ACCOUNT_SID` and `TWILIO_AUTH_TOKEN` to your [Twilio](https://www.twilio.com/) Account Sid and Authentication Token.
1. Edit `resources/app.json` to set your admin phone numbers, and app's fromNumber, and trivia questions. **Note:** Phone numbers must be formatted +12024561111
1. `node web.js`

*** Example app.json ***
```
#!javascript

{
  "fromNumber": "+12022243121",
  "admins": [ "+12024561111", "+17036975131" ],
  "questions": [
    {
      "question": "Who was the first President of the United States?",
      "choices": {
        "a": "John F Kennedy",
        "b": "George Washington",
        "c": "Abraham Lincoln",
        "d": "Bill Clinton"
      },
      "answer": "b"
    },
    {
      "question": "Who invented alternating current?",
      "choices": {
        "a": "Albert Einstein",
        "b": "Isaac Newton",
        "c": "Nikola Tesla"
      },
      "answer": "c"
    }
  ]
}
```

### Deploying ###
This guide assumes the app will be deployed on Heroku and you have [Heroku toolbelt](https://toolbelt.heroku.com/) installed.

#### Publishing to Heroku ####
1. Change directory to the project directory
1. ```heroku login```
1. ```heroku create```
1. ```heroku config:set TWILIO_ACCOUNT_SID={your Twilio Account SID}```
1. ```heroku config:set TWILIO_AUTH_TOKEN={your Twilio Auth Token}```
1. ```git push heroku master```

#### Set up Twilio's Messaging Resource ####

1. Login into Twilio
1. Select "Numbers"
1. Select your SMS capable number (buy one if you don't have one set up). **This should be the same phone number as the fromNumber value defined in app.json**
1. Set the Messaging Request URL to your Heroku app's /runningman resource. For example, if your Heroku app's base URL is ```http://myapp.herokuapp.com```, set the Messaging Request URL to ```http://myapp.herokuapp.com/runningman```
1. Select Save

### Playing the Game ###

There are three admin commands:

***s*** Starts the game

***n*** Publishes the next question

***e*** Ends the game and publishes the results

#### Typical Game Flow ####
1. Admin texts "s" to the Twilio number
2. Players text their name to the Twilio number
3. After player registration, admin texts "n" to publish the next question
4. Player answers the question and admin texts "n" to publish the next question again, etc.
5. When there are no more questions, admin texts "e" to end the game and publish the results. The top 3 results will be texted to all admins.
