// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

const { ActivityHandler, MessageFactory } = require('botbuilder');

const { QnAMaker } = require('botbuilder-ai');
const DentistScheduler = require('./dentistscheduler');
const IntentRecognizer = require("./intentrecognizer")

class DentaBot extends ActivityHandler {
    constructor(configuration, qnaOptions) {
        // call the parent constructor
        super();
        if (!configuration) throw new Error('[QnaMakerBot]: Missing parameter. configuration is required');

        // create a QnAMaker connector
        this.QnAMaker = new QnAMaker(configuration.QnAConfiguration)
       
        // create a DentistScheduler connector
        this.DentistScheduler = new DentistScheduler(configuration.SchedulerConfiguration);
        // create a IntentRecognizer connector
        this.IntentRecognizer = new IntentRecognizer(configuration.LuisConfiguration);

        this.onMessage(async (context, next) => {

            try{
            // send user input to QnA Maker and collect the response in a variable
            // don't forget to use the 'await' keyword
            const answers = await this.QnAMaker.getAnswers(context);
            const result = await this.IntentRecognizer.executeLuisQuery(context);
            const topIntent = result.luisResult.prediction.topIntent;

            let message;
            if (result.intents[topIntent].score>0.65) {
                if (topIntent === 'getAvailability') {
                    message = await this.DentistScheduler.getAvailability(this.IntentRecognizer.getTimeEntity(result));
                } else {
                    message = await this.DentistScheduler.scheduleAppointment(this.IntentRecognizer.getTimeEntity(result));
                };
            } else {
                message = answers[0].answer;
            }
                // If no answers were returned from QnA Maker, reply with help.
            await context.sendActivity(MessageFactory.text(message, message));
        } catch(e) {
            console.error(e);
        }
             
            await next();
    });

        this.onMembersAdded(async (context, next) => {
        const membersAdded = context.activity.membersAdded;
        //write a custom greeting
        const welcomeText = 'Welcome to Contoso Dentbot! How may I help you?';
        for (let cnt = 0; cnt < membersAdded.length; ++cnt) {
            if (membersAdded[cnt].id !== context.activity.recipient.id) {
                await context.sendActivity(MessageFactory.text(welcomeText, welcomeText));
            }   
        }
        // by calling next() you ensure that the next BotHandler is run.
        await next();
    });
    }
}

module.exports.DentaBot = DentaBot;
