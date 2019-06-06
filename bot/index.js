'use strict';
// Imports dependencies and set up http server

const hub = require('hub');
const express = require('express');
const request = require('request');
const bodyParser = require('body-parser');

const app = express().use(bodyParser.json()); // creates express http server

hub.connectedUsers = [];

// Sets server port and logs message on success
app.listen(process.env.PORT || 1337, () => console.log('webhook is listening'));

// Creates the endpoint for our webhook 
app.post('/webhook', (req, res) => {

    let body = req.body;

    // Checks this is an event from a page subscription
    if (body.object === 'page') {
        console.log("BODY = " + body);
        // Iterates over each entry - there may be multiple if batched
        body.entry.forEach(function (entry) {

            // Gets the body of the webhook event
            let webhook_event = entry.messaging[0];
            console.log(webhook_event);
            //console.log("Entities are : " + webhook_event.message.nlp);
            var tmp = JSON.stringify(webhook_event.message.nlp.entities);
            console.log("Entities are : " + tmp);


            // Get the sender PSID
            let sender_psid = webhook_event.sender.id;
            console.log('Sender PSID: ' + sender_psid);
            // Check if the event is a message or postback and
            // pass the event to the appropriate handler function
            if (webhook_event.message) {
                handleMessage(sender_psid, webhook_event.message);
            } else if (webhook_event.postback) {
                handlePostback(sender_psid, webhook_event.postback);
            }

        });

        // Returns a '200 OK' response to all requests
        res.status(200).send('EVENT_RECEIVED');
    } else {
        // Returns a '404 Not Found' if event is not from a page subscription
        res.sendStatus(404);
    }

});

// Adds support for GET requests to our webhook
app.get('/webhook', (req, res) => {

    // Your verify token. Should be a random string.
    let VERIFY_TOKEN = "Karvis"

    // Parse the query params
    let mode = req.query['hub.mode'];
    let token = req.query['hub.verify_token'];
    let challenge = req.query['hub.challenge'];

    // Checks if a token and mode is in the query string of the request
    if (mode && token) {

        // Checks the mode and token sent is correct
        if (mode === 'subscribe' && token === VERIFY_TOKEN) {

            // Responds with the challenge token from the request
            console.log('WEBHOOK_VERIFIED');
            res.status(200).send(challenge);

        } else {
            // Responds with '403 Forbidden' if verify tokens do not match
            res.sendStatus(403);
        }
    }
});

app.get('/', (req, res) => {
    res.sendStatus(200)
});

const PAGE_ACCESS_TOKEN = "EAAGkxCViuiYBADNKz5hiFJoat4fjV5ZAZBeLiR1gY7iA7eoBv2WWX7mYMT5kNjq2l6lx3xZCZBdASFHttZAOAIYDwIyD4nO4iZBEHzZAy1gWnmRyQ5D4P8DZBatrTjZBY1he3CA3AWAVEgQeXfYmqYdIbJ867GwBJ63OYGlO8RMdbQAUrzmF6knAT";

// Handles messages events

function getUserIndex(sender_psid) {

    for (var i = 0; i < hub.connectedUsers.length; ++i)
    {
	if (sender_psid === hub.connectedUsers[i].psid)
	    return i;
    }
    console.log("NEW USER!");
    var user = {psid: sender_psid, restaurant_type: "", location: "", datetime: "", intent:""};
    hub.connectedUsers.push(user);
    return hub.connectedUsers.indexOf(user);
}

async function createResponse(idx, received_message, ret) {
    let response;
    response = {"text":""}
    // intent not understood by wit.ai
    if (ret === -1) {
        response = {
            "text": "Sorry, I didn't understand, can you reformulate the question?  🤖"
        }
        return response;
    }
    if (hub.connectedUsers[idx].restaurant_type === "")
        response.text = "What kind of restaurant do you want ? 😋"
    else if (hub.connectedUsers[idx].location === "")
        response.text = "Where do you want to eat ? 🗺"
    else if (hub.connectedUsers[idx].datetime === "")
        response.text = "When do you want to eat? 🕔"
    else {
        var query;
        var date = new Date(hub.connectedUsers[idx].datetime);
        if (date.getHours() >= 7 && date.getHours() <= 11)
        {
            query = await asyncQuery("SELECT details, website,lat,lng FROM informations " +
                "WHERE informations.keywords LIKE '%" + hub.connectedUsers[idx].restaurant_type +
                "%' AND informations.keywords LIKE '%" + hub.connectedUsers[idx].location +
                "%' AND (informations.keywords LIKE '%morning%' OR informations.keywords LIKE '%all-day%')");
        }
        else if (date.getHours() >= 11 && date.getHours() <= 15)
        {
            query = await asyncQuery("SELECT details, website,lat,lng FROM informations " +
                "WHERE informations.keywords LIKE '%" + hub.connectedUsers[idx].restaurant_type +
                "%' AND informations.keywords LIKE '%" + hub.connectedUsers[idx].location +
                "%' AND (informations.keywords LIKE '%midday%' OR informations.keywords LIKE '%mid-day%' OR informations.keywords LIKE '%all-day%')");
        }
        else if (date.getHours() >= 15 && date.getHours() <= 23)
        {
            query = await asyncQuery("SELECT details, website,lat,lng FROM informations " +
                "WHERE informations.keywords LIKE '%" + hub.connectedUsers[idx].restaurant_type +
                "%' AND informations.keywords LIKE '%" + hub.connectedUsers[idx].location +
                "%' AND (informations.keywords LIKE '%all-day%' OR informations.keywords LIKE '%mid-day%')");
        }
        console.log("query is ");
        console.log(query);
        if (query[0].website != null)
            response.text = "" + query[0].details + "\nHere is the address of your restaurant : " + "https://www.google.fr/maps/search/"+ query[0].lat + "+" + query[0].lng + "\n Here is the restaurant's website for more informations : " + query[0].website + "\nWe hope you will enjoy your meal\n Thanks for using Karvis";
        else
            response.text = "" + query[0].details + "\nHere is the address of your restaurant : " + "https://www.google.fr/maps/search/"+ query[0].lat + "+" + query[0].lng + "\n We hope you will enjoy your meal\n Thanks for using Karvis";
        hub.connectedUsers[idx].datetime = "";
        hub.connectedUsers[idx].location = "";
        hub.connectedUsers[idx].restaurant_type = "";
        hub.connectedUsers[idx].intent = "";
    }
    return response;
}

function fillUser(idx, received_message) {
    try {
        if (hub.connectedUsers[idx].intent === "restaurant" || received_message.nlp.entities.intent[0].value === "restaurant") {
            if (received_message.nlp.entities.location != null)
                hub.connectedUsers[idx].location = received_message.nlp.entities.location[0].value;
            if (received_message.nlp.entities.restaurant_type != null)
                hub.connectedUsers[idx].restaurant_type = received_message.nlp.entities.restaurant_type[0].value;
            if (received_message.nlp.entities.datetime != null)
                hub.connectedUsers[idx].datetime = received_message.nlp.entities.datetime[0].values[0].value;
            hub.connectedUsers[idx].intent = "restaurant";
            return 0;
        }
        return -1;
    } catch (err) {
        return -1;
    }
}

async function handleMessage(sender_psid, received_message) {
    var idx = getUserIndex(sender_psid);
    console.log("USER CONNECTED :" + hub.connectedUsers[idx].psid);

    var ret = fillUser(idx, received_message);
    console.log("USER = ");
    console.log(hub.connectedUsers[idx]);
    // Sends the response message
    callSendAPI(hub.connectedUsers[idx].psid, await createResponse(idx, received_message, ret));
}

// Handles messaging_postbacks events
function handlePostback(sender_psid, received_postback) {
}

// Sends response messages via the Send API
function callSendAPI(sender_psid, response) {
    // Construct the message body
    console.log("RESPONSE =");
    console.log(response);
    let request_body = {
        "recipient": {
            "id": sender_psid
        },
        "message": response
    }

    // Send the HTTP request to the Messenger Platform
    request({
        "uri": "https://graph.facebook.com/v2.6/me/messages",
        "qs": {"access_token": PAGE_ACCESS_TOKEN},
        "method": "POST",
        "json": request_body
    }, (err, res, body) => {
        if (!err) {
            console.log('message sent!')
        } else {
            console.error("Unable to send message:" + err);
        }
    });
}

const mariadb = require('mariadb');
const pool = mariadb.createPool({
    host: 'rds-mariadb-teasy.cjfzscpznbxa.ap-northeast-2.rds.amazonaws.com',
    user: 'eden',
    password: 'toto42sh',
    connectionLimit: 5,
    database: 'karvis'
});

async function asyncQuery(str) {
    console.log("Beginning of MariaDB fnc");
    let conn;
    try {
        conn = await pool.getConnection();
        var tables = await conn.query(str);
        /*console.log("TABLES = ");
      console.log(tables);*/

    } catch (err) {
        throw err;
    } finally {
        if (conn) {
            conn.end();
            return tables;
        }
    }
}
