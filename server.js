const express = require('express'); 
const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');
const https = require('https');

function isEmptyObject(obj) {
  return !Object.keys(obj).length;
}

var util = require('util');
var log_file = fs.createWriteStream(__dirname + '/nohup.out', {flags : 'a'});
console.log = function(...args){
	var myTime = new Date();
	myTime = myTime.toString().split("GMT")[0];
	log_file.write("\n====" + myTime + "====\n");
	args.forEach(function(element){
	   log_file.write(util.format(element) + '\n');
	});
};
var bodyParser = require('body-parser');

//catches all errors, use this wrapper on all app.get callback func
const asyncHandler = fn =>  
    (req, res, next) =>  {
        Promise.resolve(fn(req, res, next)).catch(function(error){   
			console.log(error);
            next();
        });
    };  
	
//Define app
let app = express();
app.all('*', (req, res, next) => {
	if(req.protocol === 'https')
		next();
	else
		return res.redirect("https://" + req.hostname + req.originalUrl);
});
app.use("/me", function(req, res, next) {
	next();
});
app.use("/me", express.static("/home/ec2-user/ReactWebsite/me/build"));
app.use("/images", express.static("/home/ec2-user/NodeServer/images"));
app.use("/css", express.static("/home/ec2-user/NodeServer/css"));

app.response.savedSend = app.response.send;
app.response.send = function(data){
	console.log("RESPONSE "+ data);	
	return this.savedSend(data);
};

app.use(bodyParser.urlencoded({
	 extended: true 
}));
app.use(bodyParser.json());
app.use(function (req, res, next) {
	if(isEmptyObject(req.body))
		console.log(req.method +" "+ req.url);
	else
		console.log(req.method +" "+ req.url, req.body);
	next();
});

app.get('/', asyncHandler(async function(req, res) {
	res.sendFile(__dirname + "/index.html");
	return;
}));

// Certificate
const certKeyFolder = "/etc/letsencrypt/live/teamfirestocks.com/";
const privateKey = fs.readFileSync(certKeyFolder+'privkey.pem', 'utf8');
const certificate = fs.readFileSync(certKeyFolder+'cert.pem', 'utf8');
const ca = fs.readFileSync(certKeyFolder+'chain.pem', 'utf8');
const credentials = {
	key: privateKey,
	cert: certificate,
	ca: ca
};

app.get("/.well-known/acme-challenge/:id", function(req, res) {
	res.sendFile(__dirname+'/.well-known/acme-challenge/'+req.params.id);
});
//Test Request Endpoint
app.get('/test.php', asyncHandler(async function(req, res) {
	res.type("json");
	res.send(`{"live":"success"}`);
	return;
}));
const httpServer = http.createServer(app).listen(80);
const httpsServer = https.createServer(credentials, app).listen(443);
