var processing_render_queue = false;
var express = require('express')
  , app = express.createServer()
  , io = require('socket.io').listen(app)
  , fs = require('fs');

app.set("view options", {layout: false});
app.register('.html', {
	compile: function(str, options){
		return function(locals){
		return str;
	};}
});

app.get("/master/", function (req,res) {
	res.render(__dirname + "/public/index.html");
});

app.get("/worker/:for_session",function(req,res) {
	res.render(__dirname + "/public/worker.html");
});
app.use(express.static(__dirname + "/public"));
// app.get("/",function(req,res) {
// 	fs.readFile(__dirname + '/master.html',
// 	function (err, data) {
// 		if (err) {
// 			res.writeHead(500);
// 			return res.end('Error loading index.html');
// 		}
// 		res.writeHead(200);
// 		res.end(data);
// 	});
// });

var session_generator = 0;
var render_queue_start = null;
var sockets_by_session = {};
io.sockets.on('connection', function (socket) {
	var num_live_sockets = 0;
	for (i in sockets_by_session) {
		if (!sockets_by_session[i].disconnected) {
			++num_live_sockets;
		}
	}
	socket.broadcast.emit('node-count', {num_live_sockets:num_live_sockets});


	console.log("new connection. session id is " + session_generator);
	// socket.disconnected = false;
	socket.ready_to_render = true;
	sockets_by_session[session_generator] = socket;
	console.log("session id = " + session_generator);
	socket.emit('session_id', session_generator);
	++session_generator;
	socket.on('render', function (data) {
		console.log("added this to the render queue");
		console.log(data);
		render_queue_start = {data:data, next:render_queue_start, prev:null};
		if (render_queue_start.next) {
			render_queue_start.next.prev = render_queue_start;
		}
		if (processing_render_queue) {
			// console.log("render queue is already going");
		} else {
			console.log("starting the render queue");
			process_render_queue(render_queue_start);
		}
	});
	socket.on('disconnect', function (data) {
		socket.disconnected = true;
		var num_live_sockets = 0;
		for (i in sockets_by_session) {
			if (!sockets_by_session[i].disconnected) {
				++num_live_sockets;
			}
		}
		socket.broadcast.emit('node-count', {num_live_sockets:num_live_sockets});
	});
	socket.on('render-result', function (data) {
		socket.ready_to_render = true;
		console.log("got result from session " + data.config.session_id);
		console.log("here it is: ");
		console.log(data);
		if (sockets_by_session.hasOwnProperty(data.config.session_id)) {
			sockets_by_session[data.config.session_id].emit('render-result', data);
		} else {
			console.log("received render result for non-existent socket: " + session_id);
		}
	});
  socket.on('my other event', function (data) {
    console.log(data);
  });
});
var dispatch = function(data) {
	if (!data) {
		return true;
	}
	console.log("dispacting...");
	var i;
	var found_one = false;
	for (i = 0; i<session_generator; ++i) {
		if (sockets_by_session.hasOwnProperty(i) && !sockets_by_session[i].disconnected) {
			if (sockets_by_session[i].ready_to_render) {
				if (data.config.session_id == i) {
					console.log("not sending render request to the render requester, " + i);
				} else {
					sockets_by_session[i].emit('render-request', data);
					console.log("dispatched this data:");
					console.log(data);
					sockets_by_session[i].ready_to_render = false;
					found_one = true;
					break;
				}
			} else {
				console.log("socket " + i + " is busy");
			}
		}
	}
	return found_one
};

var process_render_queue = function(cur) {
	processing_render_queue = true;
	if (null == cur) {
		cur = render_queue_start;
		if (null === cur) {
			processing_render_queue = false;
			return;
		}
	}
	var did_dispatch;
	if (!sockets_by_session.hasOwnProperty(cur.data.config.session_id)) {
		console.log("dispatch attempt to non-existant socket: ");
		console.log(cur);
		did_dispatch = true;
	} else if(sockets_by_session[cur.data.config.session_id].disconnected) {
		did_dispatch = true;
	} else if (cur.data) {
		did_dispatch = dispatch(cur.data);
	} else {
		did_dispatch = true;
	}
	if (did_dispatch) {
		// remove the dispatch request
		if (cur.prev) {
			cur.prev.next = cur.next;
		}
		if (cur.next) {
			cur.next.prev = cur.prev;
		}
		if (cur == render_queue_start) {
			render_queue_start = cur.next;
		}
		cur = cur.next;
		console.log("recursing");
		process_render_queue(cur);
	} else {
		setTimeout(function() {var _cur = cur; process_render_queue(_cur);},1000);
	}
}
app.listen(30682);
