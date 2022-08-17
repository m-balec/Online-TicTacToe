import React, { useState, useEffect, useRef} from "react";
import GameSquare from "./GameSquare";
import "./App.css";
import Socket from './Socket';


function App() {
  const [socket, setSocket] = useState(null);
  const [currentPlayerList, setCurrentPlayerList] = useState([]);
  const [room, setRoom] = useState(null);
  const [winner, setWinner] = useState('');
  const [squaresFE, setSquaresFE] = useState({});
  const roomNameRef = useRef();

  useEffect(() => {
    // Setting socket instance
    const socket = Socket;
    setSocket(socket);

    // When a user has joined the room
    socket.on("roomJoined", (id, players, roomName, squares) => {
      if (id === socket.id) {
        alert('Room Joined.');
      } else {
        alert(`Player with id: ${id} joined room.`);
      }

      setRoom(roomName);
      setCurrentPlayerList(players);

      // Updating squaresFE only if it needs to be
      if (squares !== squaresFE) setSquaresFE(squares);
      
    });


    // When a player disconnects
    socket.on('playerDisconnect', (playerIDs, id) => {
      // Set list of current players equal to the new list reflecting disconnected player
      setCurrentPlayerList(playerIDs);

      // If user is the one who disconnected, set their room state to null (user is no longer in a room)
      if (id === socket.id) setRoom(null);
    });

    // If room is unavailable (full), alert user of such
    socket.on('roomUnavailable', () => {
      alert('Room is unavailable.');
    });

    // Upon game over, set correct winner on screen
    socket.once('gameOver', (winner) => {
      if (winner) {
        setWinner(winner);
      } else {
        setWinner('TIE GAME');
      }
    });

    // Update squaresFE array to reflect newly added coords
    socket.on('squaresUpdate', (squares) => {
      setSquaresFE(squares);
    });

    // When a user has chosen to play another game
    socket.on('reset', (squaresObj) => {
      setSquaresFE(squaresObj);
      setWinner('');
    });

  }, [squaresFE]);

  // Function to handle joining a game room (upon pressing "join")
  const joinGameRoom = () => {
    // Get room name entered by user
    let roomName = roomNameRef.current.value;

    // Emit back to server the ID of the user and which room they want to join
    socket.emit("joinGameRoom", socket.id, roomName);
  }

  // Function to emit back to server that a room wants to play again/reset
  const playAgain = () => {
    socket.emit('playAgain', socket.id, room);
  }

  // Function to return player id, and figure out which id belongs to each user
  const displayPlayerID = (playerID) => {
    if (playerID) {
      if (playerID === socket.id) {
        return `${playerID} - Me`;
      } else {
        return playerID;
      }
    } else {
      return '';
    }
  }

  // If user is not in a room
  const noRoom = () => {
    return (
      <div id='content'>
        <div>Online Tic-Tac-Toe</div>
        <div id='inputs'>
          <input className='action-button' type='button' value='Join Room' onClick={joinGameRoom} />
          <input className='room-input-field' type='text' placeholder='Room name' ref={roomNameRef} />
        </div>
      </div>
    );
  }

  // If user IS in a room, but the game is not over
  const inGameRoom = () => {
    return (
      <div id='content'>
        <div id='player-id-display'>
          <div className='player-id'>{displayPlayerID(currentPlayerList[0])}</div>
          <div className='player-id'>{displayPlayerID(currentPlayerList[1])}</div>
        </div>
  
        <div className='winner-display hidden'>WINNER: {winner}</div>

        <div className="grid-container">  
          <GameSquare socket={socket} coords={'00'} currentPlayers={currentPlayerList} room={room}  squares={squaresFE} />
          <GameSquare socket={socket} coords={'01'} currentPlayers={currentPlayerList} room={room}  squares={squaresFE} />
          <GameSquare socket={socket} coords={'02'} currentPlayers={currentPlayerList} room={room}  squares={squaresFE} />
          <GameSquare socket={socket} coords={'10'} currentPlayers={currentPlayerList} room={room}  squares={squaresFE} />
          <GameSquare socket={socket} coords={'11'} currentPlayers={currentPlayerList} room={room}  squares={squaresFE} />
          <GameSquare socket={socket} coords={'12'} currentPlayers={currentPlayerList} room={room}  squares={squaresFE} />
          <GameSquare socket={socket} coords={'20'} currentPlayers={currentPlayerList} room={room}  squares={squaresFE} />
          <GameSquare socket={socket} coords={'21'} currentPlayers={currentPlayerList} room={room}  squares={squaresFE} />
          <GameSquare socket={socket} coords={'22'} currentPlayers={currentPlayerList} room={room}  squares={squaresFE} />
        </div>
      </div>
    );
  }

  // if user IS in a room, AND the game is over
  const inGameRoomGameOver = () => {
    return (
      <div id='content'>
        <div id='player-id-display'>
          <div className='player-id'>{displayPlayerID(currentPlayerList[0])}</div>
          <div className='player-id'>{displayPlayerID(currentPlayerList[1])}</div>
        </div>
  
        <div className='winner-display'>WINNER: {winner}</div>
        
        <div className='no-click'>
          <div className="grid-container">  
            <GameSquare coords={'00'} currentPlayers={currentPlayerList}  squares={squaresFE} isOver={true} />
            <GameSquare coords={'01'} currentPlayers={currentPlayerList}  squares={squaresFE} isOver={true} />
            <GameSquare coords={'02'} currentPlayers={currentPlayerList}  squares={squaresFE} isOver={true} />
            <GameSquare coords={'10'} currentPlayers={currentPlayerList}  squares={squaresFE} isOver={true} />
            <GameSquare coords={'11'} currentPlayers={currentPlayerList}  squares={squaresFE} isOver={true} />
            <GameSquare coords={'12'} currentPlayers={currentPlayerList}  squares={squaresFE} isOver={true} />
            <GameSquare coords={'20'} currentPlayers={currentPlayerList}  squares={squaresFE} isOver={true} />
            <GameSquare coords={'21'} currentPlayers={currentPlayerList}  squares={squaresFE} isOver={true} />
            <GameSquare coords={'22'} currentPlayers={currentPlayerList}  squares={squaresFE} isOver={true} />
          </div>
        </div>
        <button className='play-again-button' onClick={playAgain}>Play Again</button>
      </div>
    );
  }

  // Determining which content to display to user
  if (!room) {
    return noRoom();
  } else if (room && !winner) {
    return inGameRoom();
  } else {
    return inGameRoomGameOver();
  }

}

export default App;