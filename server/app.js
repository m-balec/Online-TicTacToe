require('dotenv').config();
const DbAccess = require('./db/accessLayer.js');
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

const port = process.env.PORT || 4001;

const app = express();

const server = http.createServer(app);

// Creating socket.io connection using http server instance
const io = socketIo(server, {
    cors: {
        origin: process.env.SERVER_ORIGIN,
        methods: ['GET', 'POST']
    }
});


// connect to mySQL db
const con = new DbAccess(process.env.DB_HOST, process.env.DB_USER, process.env.DB_PASSWORD, process.env.DB_NAME);


// Handle what to do upon client-connection to server
io.on('connection', (socket) => {
    console.log(`New client connected: ${socket.id}`);

    socket.on('disconnect', () => {
        console.log(`Client disconnected: ${socket.id}`);
        
        // Find room by player id, since we don't know the room name (players can only be in one room at a time)
        con.findByPlayerId(socket.id, (result) => {
            if (result.length > 0) {
                let roomName = result[0].roomName;

                // Find id of disconnected player from players array and REMOVE it
                let playersArr = JSON.parse(result[0].players);
                let index = playersArr.players.indexOf(socket.id);
                playersArr.players.splice(index, 1);

                // If another player is still in the lobby, simply remove player from lobby
                if (playersArr.players.length > 0) {

                    let fieldsObj = {
                        players: playersArr,
                        squares: null,
                        turns: null
                    }

                    // Update gameRoom record to reflect missing player
                    con.updateRoom(fieldsObj, roomName, (result) => {
                        // Alet client-side of disconnected player
                        io.to(roomName).emit('playerDisconnect', playersArr.players, socket.id);
                    });
                } else {
                    // Delete Room
                    con.deleteRoom(roomName);
                }

                // Remove instance of socket from room
                socket.leave(roomName);
                console.log(`Player with id ${socket.id} left room ${roomName}`);
            }
        });
    });


    // What to do upon status of private message
    socket.on('joinGameRoom', (idOfJoined, roomName) => {

        // Checking if room exists
        con.findByRoomName(roomName, (result) => {
            if (result.length > 0) {
                console.log('1 Room Found!');
    
                let players = JSON.parse(result[0].players);
                let squares = JSON.parse(result[0].squares);

                if (players.players.length >= 2) {
                    console.log('Room full, access denied');
                    io.to(socket.id).emit('roomUnavailable');
                } else {
                    // update sql record with new player
                    console.log('Room available to join.');
    
                    players.players.push(socket.id);
    
                    let fieldsObj = {
                        players: players,
                        squares: squares,
                        turns: null
                    }

                    con.updateRoom(fieldsObj, roomName, (result) => {
                        // let player join
                        if (result) {
                            socket.join(roomName);
                            io.to(roomName).emit('roomJoined', idOfJoined, fieldsObj.players.players, roomName, fieldsObj.squares);
                            console.log(`Player with id ${socket.id} joined room ${roomName}`);
                        }
                    });
                }
            } else {
                console.log('No Room Found');
                    
                // New object of players to send to the front end
                let playersObj = {
                    players: [socket.id]
                }
    
                con.createRoom(socket.id, roomName, () => {
                    // might execute regardless if room was successfully created -have to fix
                    socket.join(roomName);
                    io.to(roomName).emit('roomJoined', idOfJoined, playersObj.players, roomName);
                    console.log(`Player with id ${socket.id} joined room ${roomName}`);
                });
            }
        });
    });

    socket.on('playerTurn', (coords, id, room) => {
        console.log(coords);

        var players;
        var squares;
        var turns;

        // Find room which needs to be updated
        con.findByRoomName(room, (result) => {
            players = JSON.parse(result[0].players);
            squares = JSON.parse(result[0].squares);
            turns = JSON.parse(result[0].turns);

            let player;

            //Only changing ownership of square if it is not already owned by a player...
            if (!squares.p1Squares.includes(coords) && !squares.p2Squares.includes(coords)) {
                if (players.players.indexOf(id) == 0 && turns.whos == 'p1') {
                    squares.p1Squares.push(coords);
                    console.log('p1');
                    player = 'p1';
                    turns.amount++;
                    io.to(room).emit('ChangeOwnership', coords, player);
                    io.to(room).emit('squaresUpdate', squares);

                    // Set turn to next player
                    turns.whos = 'p2';

                    let fieldsObj = {
                        players: null,
                        squares: squares,
                        turns: turns
                    }

                    // UPDATE SQL RECORD
                    con.updateRoom(fieldsObj, room);

                } else if (players.players.indexOf(id) == 1 && turns.whos == 'p2') {
                    squares.p2Squares.push(coords);
                    console.log('p2');
                    player = 'p2';
                    turns.amount++;
                    io.to(room).emit('ChangeOwnership', coords, player);
                    io.to(room).emit('squaresUpdate', squares);

                    // Set turn to next player
                    turns.whos = 'p1';

                    let fieldsObj = {
                        players: null,
                        squares: squares,
                        turns: turns
                    }

                    // UPDATE SQL RECORD
                    con.updateRoom(fieldsObj, room);
                }
            }


            // CHECK IF ANY WINNERS
            if (isWinner(squares.p1Squares)) {io.to(room).emit('gameOver', 'p1');}
            if (isWinner(squares.p2Squares)) {io.to(room).emit('gameOver', 'p2');}
            if (turns.amount >= 9 && !isWinner(squares.p1Squares) && !isWinner(squares.p2Squares)) {io.to(room).emit('gameOver');}  // Calls tie on final turn regarless if that is the winning turn or not - must change
            
        });

    });

    // Resetting gameroom score upon recieving 'playAgain' request
    socket.on('playAgain', (id, room) => {

        // Creating new object to hold individual database column values (JSON columns)
        let squaresObj = {
            p1Squares: [],
            p2Squares: []
        }
        let turnsObj = {
            amount: 0,
            whos: 'p1'
        }

        // Populating single object of all required database colum values
        let fieldsObj = {
            players: null,
            squares: squaresObj,
            turns: turnsObj
        }

        // Update SQL record
        con.updateRoom(fieldsObj, room);

        // Emit to client-side that game has been reset
        io.to(room).emit('reset', squaresObj);
    });
});

// Function to check if an individual array contains any combination of winning coordinates
const isWinner = (coordsArray) => {
    if (coordsArray.includes('00') && coordsArray.includes('01') && coordsArray.includes('02')   // 00 01 02      //        |      |
    || coordsArray.includes('10') && coordsArray.includes('11') && coordsArray.includes('12')    // 10 11 12      //    00  |  01  |  02
    || coordsArray.includes('20') && coordsArray.includes('21') && coordsArray.includes('22')    // 20 21 22      //  ______|______|______
    || coordsArray.includes('00') && coordsArray.includes('10') && coordsArray.includes('20')                     //        |      |
    || coordsArray.includes('01') && coordsArray.includes('11') && coordsArray.includes('21')                     //    10  |  11  |  12
    || coordsArray.includes('02') && coordsArray.includes('12') && coordsArray.includes('22')                     //  ______|______|______
    || coordsArray.includes('00') && coordsArray.includes('11') && coordsArray.includes('22')                     //        |      |
    || coordsArray.includes('02') && coordsArray.includes('11') && coordsArray.includes('20')                     //    20  |  21  |  22
    ) {
        return true;
    }
}

server.listen(port, () => console.log(`Listening on port ${port}`));