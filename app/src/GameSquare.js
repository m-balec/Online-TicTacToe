import React, {useState, useEffect} from 'react';
import './App.css';

function GameSquare(props) {
    const [style, setStyle] = useState('grid-item');
    const [isOver, setIsOver] = useState(false);


    useEffect(() => {

        // Setting isOver when appropriate
        if (props.isOver !== isOver) {
            setIsOver(props.isOver);
        }

        // not happy with this nesting, but had troubles with null/undefined values otherwise :/
        if (props.squares) {
            if (props.squares.p1Squares) {
                if (props.squares.p1Squares.includes(props.coords)) {
    
                    let newStyle = style;
                    newStyle += ' player1';
                    setStyle(newStyle);
                }
                if (props.squares.p2Squares.includes(props.coords)) {
    
                    let newStyle = style;
                    newStyle += ' player2';
                    setStyle(newStyle);
                }
                if (!props.squares.p1Squares.includes(props.coords) && !props.squares.p2Squares.includes(props.coords)) {
                    setStyle('grid-item');
                }
            }
        } else {
            setStyle('grid-item'); // Doesn't work?
        }

        // if game is over, change css to make gameboard un-clickable
        if (isOver) {
            let noTouchStyle = style;
            noTouchStyle += ' no-click';
            setStyle(noTouchStyle);
        }


    }, [props.coords, style, props.playerTurn, props.squares, props.isOver, isOver]);

    // Function to alert server a user has clicked a square
    const changeCol = () => {
        props.socket.emit('playerTurn', props.coords, props.socket.id, props.room);
    }

    if (isOver) {
        return (
            <div className={style}></div>
        );
    } else {
        return (
            <div className={style} onClick={changeCol}></div>
        );
    }

}

export default GameSquare;