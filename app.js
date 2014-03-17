var server = require('http').createServer(handler),
	io = require('socket.io').listen(server);

server.listen(8080);

function handler(req, res) {
	res.writeHead(200);
	res.end("Socket.io ready.\n");
}

io.on('connection', function (socket) {
	socket.on('position', function (data) {
		data.sender = socket.id;
		data.clones = io.sockets.clients().length;
		//socket.emit('position', data);
		socket.broadcast.emit('position', data);
	});
});