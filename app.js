var app = require('express')()
	, server = require('http').createServer(app)
	, io = require('socket.io').listen(server);

server.listen(8080);
var debug = true;

app.get('/', function (req, res) {
	res.sendfile(__dirname + '/index.html');
});

app.get('/socket/send', function (req, res) {
	var channel = req.query.channel;
	var key = req.query.key;
	var message = req.query.message;

	var check = checkPrivateKey(channel, key);
	if (check) {
		var clients = io.sockets.clients(channel).length;
		io.sockets.in(channel).emit('message', message);
		if (debug) console.log(channel, '=>', message);
		res.json({clientsLength: clients, sent: true});
	} else {
		res.json({error: 'wrong channel/key'});
	}
});

app.get('/socket/clients', function (req, res) {
	var channel = req.query.channel;
	var key = req.query.key;

	var check = checkPrivateKey(channel, key);
	if (check) {
		var clients = io.sockets.clients(channel).length;
		if (debug) console.log(clients);
		res.json({clientsLength: clients});
	} else {
		res.json({error: 'wrong channel/key'});
	}
});

io.on('connection', function (socket) {
	socket.on('position', function (data) {
		data.sender = socket.id;
		//socket.emit('position', data);
		socket.broadcast.emit('position', data);
	});
});

function checkPrivateKey(channel, privateKey) {
	return channel === privateKey;
}