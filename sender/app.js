//To get process env variables
require('dotenv').config();

const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const cors = require('cors');
const http = require('http');
const compression = require('compression');

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
    region: process.env.AWS_REGION
 });
// Create an SQS service object
var sqs = new AWS.SQS({apiVersion: '2012-11-05'});


function shouldCompress(req, res) {
    if (req.headers["x-no-compression"]) return false;
    return compression.filter(req, res);
}


app.post('/queue/create', function (req, res) {
    var params = {
        QueueName: req.body.QueueName,
        Attributes: {
            'DelaySeconds': '60',
            'MessageRetentionPeriod': '86400'
          }
    };

    sqs.createQueue(params, function(err, data) {
        if(err) {
            res.send(err);
        }
        else {
            res.send(data);
        }
    });
});


app.post('/queue/url', function (req, res) {
    var params = {
        QueueName: req.body.QueueName,
    };

    sqs.getQueueUrl(params, function(err, data) {
        if(err) {
            res.send(err);
        }
        else {
            res.send(data);
        }
    });
});

app.post('/queue/send', function (req, res) {
    var params = {
        // Remove DelaySeconds parameter and value for FIFO queues
       DelaySeconds: 10,
       MessageAttributes: {
         "Title": {
           DataType: "String",
           StringValue: "The Whistler"
         },
         "Author": {
           DataType: "String",
           StringValue: "John Grisham"
         },
       },
       MessageBody: "Information about current NY Times fiction bestseller for week of 12/11/2016.",
       // MessageDeduplicationId: "TheWhistler",  // Required for FIFO queues
       // MessageGroupId: "Group1",  // Required for FIFO queues
       QueueUrl: req.body.QueueUrl || process.env.QUEUE_URL
     };

     sqs.sendMessage(params, function(err, data) {
        if(err) {
            res.send(err);
        }
        else {
            res.send(data);
        }
    });
});


app.post('/queue/bulk/send', function (req, res) {

    let i = 20;

    if(req.body.count) i = Number(req.body.count);

    var params = {};

    for(let inc = 1; inc <= i ; inc++) {
        params = {
            // Remove DelaySeconds parameter and value for FIFO queues
           DelaySeconds: 10,
           MessageAttributes: {
             "Title": {
               DataType: `String`,
               StringValue: `The Whistler ${inc}`
             },
             "Author": {
               DataType: "String",
               StringValue: `John Grisham ${inc}`
             },
           },
           MessageBody: "Message" + inc,
           // MessageDeduplicationId: "TheWhistler",  // Required for FIFO queues
           // MessageGroupId: "Group1",  // Required for FIFO queues
           QueueUrl: req.body.QueueUrl || process.env.QUEUE_URL
         };
    
         sqs.sendMessage(params, function(err, data) {
            if(err) {
                console.log(inc, err);
            }
            else {
                console.log(inc, data)
            }
        });
    }
   
    res.sendStatus(200);
});

http.createServer(app).listen(process.env.PORT || 80);


