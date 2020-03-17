const express = require('express');
const port = process.env.PORT || 3000;

const app = express();

const server = require('http').createServer(app);

const io = require('socket.io')(server)

app.use(express.static(`${__dirname}/public`));

server.listen(port, () => console.log(`listening on port ${port}`));

io.sockets.on('connection', (socket) => {
    console.log(`${socket.id} connected`);
})