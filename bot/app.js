const PAGE_ACCESS_TOKEN = "EAAGkxCViuiYBADNKz5hiFJoat4fjV5ZAZBeLiR1gY7iA7eoBv2WWX7mYMT5kNjq2l6lx3xZCZBdASFHttZAOAIYDwIyD4nO4iZBEHzZAy1gWnmRyQ5D4P8DZBatrTjZBY1he3CA3AWAVEgQeXfYmqYdIbJ867GwBJ63OYGlO8RMdbQAUrzmF6knAT";

// Handles messages events
function handleMessage(sender_psid, received_message) {

let response;

  // Check if the message contains text
  if (received_message.text) {    

    // Create the payload for a basic text message
    response = {
      "text": `You sent the message: "${received_message.text}".`
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