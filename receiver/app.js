//To get process env variables
require('dotenv').config();

const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const cors = require('cors');
const http = require('http');
const compression = require('compression');
const schedule = require('node-schedule');

//Middleware functions
app.use(express.json({ limit: '100mb' }));
app.use(bodyParser.json({ limit: '100mb' }));
app.use(bodyParser.urlencoded({ limit: '100mb', extended: true }));
app.use(cors());
app.use(compression({ filter: shouldCompress }));

//Configure SQS

var AWS = require('aws-sdk');
// Set the region 
AWS.config.update({
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY,
        secretAccessKey: process.env.AWS_ACCESS_SECRET
    },
});

// Create an SQS service object
var sqs = new AWS.SQS({
    region: process.env.AWS_REGION,
    apiVersion: '2012-11-05'
});

schedule.scheduleJob("*/1 * * * *", queueReceiver);

function shouldCompress(req, res) {
    if (req.headers["x-no-compression"]) return false;
    return compression.filter(req, res);
}

function queueReceiver() {
 var queueURL = process.env.QUEUE_URL;

var params = {
 MaxNumberOfMessages: 1,
 QueueUrl: queueURL,
 VisibilityTimeout: 20,
 WaitTimeSeconds: 20,
};

 sqs.receiveMessage(params, function(err, data) {
      if (err) {
        console.log("Receive Error", err);
      } else if (data.Messages) {
        console.log(data);
        var deleteParams = {
          QueueUrl: queueURL,
          ReceiptHandle: data.Messages[0].ReceiptHandle
        };
        sqs.deleteMessage(deleteParams, function(err, data) {
          if (err) {
            console.log("Delete Error", err);
          } else {
            console.log("Message Deleted", data);
          }
        });
      }
  });
}

http.createServer(app).listen(process.env.PORT || 81)