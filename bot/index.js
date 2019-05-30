'use strict';
// Imports dependencies and set up http server

const hub = require('hub');
const express = require('express');
const request = require('request');
const bodyParser = require('body-parser');

const app = express().use(bodyParser.json()); // creates express http server

hub.connectedUsersEntities = [];

// Sets server port and logs message on success
app.listen(process.env.PORT || 1337, () => console.log('webhook is listening'));

// Creates the endpoint for our webhook 
app.post('/webhook', (req, res) => {  
 
  let body = req.body;

  // Checks this is an event from a page subscription
  if (body.object === 'page') {
console.log("BODY = " + body);
    // Iterates over each entry - there may be multiple if batched
    body.entry.forEach(function(entry) {

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
function handleMessage(sender_psid, received_message) {

  if (hub.connectedUsersEntities[sender_psid] == null) {
    hub.connectedUsersEntities[sender_psid] = received_message.nlp.entities;
  } else {
    console.log("Known user with entities: " + JSON.stringify(hub.connectedUsersEntities[sender_psid]));
      // TODO: Add entities
  }

  let response;
  if (received_message.text) {
    // Create the payload for a basic text message
	
	var tables = asyncFunction();
console.log(received_message.nlp.entities.intent[0].value);
 if (tables[2].keywords.tags.indexOf(received_message.nlp.entities.intent[0].value)!= -1)
 {
    response = {
      "text": JSON.stringify(tables[2].details)
    }
  }
  }  
  
  // Sends the response message
  callSendAPI(sender_psid, response); 
}

// Handles messaging_postbacks events
function handlePostback(sender_psid, received_postback) {

}

// Sends response messages via the Send API
function callSendAPI(sender_psid, response) {
// Construct the message body
  let request_body = {
    "recipient": {
      "id": sender_psid
    },
    "message": response
  }

  // Send the HTTP request to the Messenger Platform
  request({
    "uri": "https://graph.facebook.com/v2.6/me/messages",
    "qs": { "access_token": PAGE_ACCESS_TOKEN },
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
const pool = mariadb.createPool({host: 'rds-mariadb-teasy.cjfzscpznbxa.ap-northeast-2.rds.amazonaws.com', user: 'eden', password: 'toto42sh',  connectionLimit: 5, database: 'karvis'});

async function asyncFunction() {
	console.log("Beginning of MariaDB fnc");
  let conn;
  try {
    conn = await pool.getConnection();
    const tables = await conn.query("SELECT * FROM informations");
    console.log(tables);
	
  } catch (err) {
    throw err;
  } finally {
    if (conn) 
	{
		conn.end();
		return tables;
	}
  }
}