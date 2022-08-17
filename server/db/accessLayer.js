const mysql = require('mysql');

class DbAccess {
    constructor(DB_HOST, DB_USER, DB_PASSWORD, DB_NAME) {
        // Instantiating new mySQL connection object
        this.con = mysql.createConnection({
            host: DB_HOST,
            user: DB_USER,
            password: DB_PASSWORD,
            database: DB_NAME
        });

        // Connecting to database using connection object
        this.con.connect((err) => {
            if (err) throw err;
            console.log('Connected to database');
        });
    }

    // Function to find gameRoom using the roomName
    findByRoomName(roomName, callback, where) {
        let selectSql = 'SELECT * FROM gameRoom ';
        let whereClause = `WHERE roomName='${roomName}';`;

        let findRoomsql = `${selectSql}${whereClause};`;

        this.con.query(findRoomsql, (err, result, fields) => {
            if (err) throw err;
            if (callback) callback(result);
        });
    }

    // Function to find gameRoom using the id of a player inside that room
    findByPlayerId(id, callback) {
        let selectSql = 'SELECT * FROM gameRoom ';
        let whereClause = `WHERE JSON_CONTAINS(players, '{"players": "${id}"}')`;

        let findRoomsql = `${selectSql}${whereClause};`;

        this.con.query(findRoomsql, (err, result, fields) => {
            if (err) throw err;
            if (callback) callback(result);
        });
    }

    // Creating new gameRoom record
    createRoom(id, roomName, callback) {
        let playersObj = {
            players: [id]
        }
        let squaresObj = {
            p1Squares: [],
            p2Squares: []
        }
        let turnsObj = {
            amount: 0,
            whos: 'p1'
        }

        // Add new record to 'gameRoom' table
        let createRoomSQL = `INSERT INTO gameRoom (roomID, roomName, players, squares, turns) VALUES ('1', '${roomName}', '${JSON.stringify(playersObj)}', '${JSON.stringify(squaresObj)}', '${JSON.stringify(turnsObj)}')`;
        this.con.query(createRoomSQL, (err, result) => {
            if (err) throw err;
            console.log(`Room ${roomName} has been created successfully.`);
            return result;
        });
        if (callback) callback();
    }

    // Update gameRoom by name
    updateRoom(fieldObj, roomName, callback) {
        // parse fieldObj to create an SQL statement that only updates the fields we have passed (leave any unspecified fields unchanged!)
        let playersUpdateStr = '';
        let squaresUpdateStr = '';
        let turnsUpdateStr = '';

        if (fieldObj.players) playersUpdateStr += ` players='${JSON.stringify(fieldObj.players)}',`;
        if (fieldObj.squares) squaresUpdateStr += ` squares='${JSON.stringify(fieldObj.squares)}',`;
        if (fieldObj.turns) turnsUpdateStr += ` turns='${JSON.stringify(fieldObj.turns)}',`;

        let finalSetStr = `${playersUpdateStr}${squaresUpdateStr}${turnsUpdateStr}`;

        // Remove trailing comma
        finalSetStr = finalSetStr.substring(0, finalSetStr.length - 1);

        //let updateRoomSQL = `UPDATE gameRoom SET players='${JSON.stringify(newPlayersOBJ)}' WHERE roomName='${roomName}';`;
        let updateRoomSQL = `UPDATE gameRoom SET${finalSetStr} WHERE roomName='${roomName}';`;

        // Executing query
        this.con.query(updateRoomSQL, (err, result) => {
            if (err) return err;
            console.log(`Room ${roomName} has been updated successfully.`);

            if (callback) callback(result);
        });
    }

    // Function to delete gameRoom by name
    deleteRoom(roomName) {
        let deleteRoomSQL = `DELETE FROM gameRoom WHERE roomName='${roomName}';`;
        this.con.query(deleteRoomSQL, (err, result) => {
            if (err) throw err;
            console.log(`Room ${roomName} has been Deleted successfully.`);
        });
    }
}

module.exports = DbAccess;