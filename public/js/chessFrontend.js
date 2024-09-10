
const socket = io();
const chess = new Chess();

const boardElement = document.querySelector(".chessboard")

let draggedPiece = null;
let sourceSquare = null;
let playerRole = null;

const showNotification = (message, displayDurationInSeconds) => {
    const notifyElement = document.getElementById("Notify");

    // Show the message
    notifyElement.innerText = message;

    // After the specified time, clear the message
    setTimeout(() => {
        const invisibleChar = "\u200D";
        notifyElement.innerText = invisibleChar;  // Clear the notification after n seconds
    }, displayDurationInSeconds * 1000);  // Convert seconds to milliseconds
};


const gameEnd = document.getElementById("gameEnd");

socket.on("checkmate", (turn) => {
    var audio = new Audio(
        'gameOver.mp3'); 
    audio.play();
    gameEnd.innerHTML = `
    <div class="absolute inset-0 bg-black bg-opacity-80 flex flex-col items-center justify-center h-full z-50">
    <h1 class="text-center text-3xl font-medium text-white p-5 rounded-lg shadow-lg my-4">
        ${turn === "b" ? "White Warriors" : "Black Beasts"} win the game! 
        ${turn === "b" ? "Black Beasts" : "White Warriors"} put up a valiant fight but ultimately lose.
    </h1>
    
    <!-- Reset Button with small size and dark, blurred background -->
    <button onclick="socket.emit('newGame' )" id="newGame" class="bg-opacity-70 bg-red-800 text-white py-1 px-4 rounded-full w-60 font-semibold 
        shadow-md hover:bg-gray-700 transition-transform duration-200 ease-in-out transform hover:scale-105 backdrop-blur-md">
        New Game
    </button>
</div>`

});

socket.on("draw", () => {
    var audio = new Audio(
        'gameOver.mp3'); 
    audio.play();
    gameEnd.innerHTML = `
        <h1>Game Draws!</h1>
        <a href="/">New Game</a>
    `;
});


const renderBoard = () => {
    const board = chess.board();    //an 2d array[[{type: 'k', color: 'b'}...]...]

    // purana board htaa bhai avi
    boardElement.innerHTML = "";
    board.forEach((row, rowidx) => {
        row.forEach((square, squareidx) => {
            const squareElement = document.createElement("div");
            // ab har square ko do class dege ek to square to know its a sq class and one light hga yaa dark to now its color
            squareElement.classList.add("square", 
                (rowidx + squareidx) % 2 === 0 ? "light" : "dark"
            );

            // ye hum save kara hai saari squ ka dataset, fir jab drop krege to ise use krege kaha drop krne hai
            squareElement.dataset.row = rowidx;
            squareElement.dataset.col = squareidx;

            // agar square null nai hai mtlb koi baitha hai sq pe, to kon baitha hai ye dekho white hai black hai or kya hai
            if (square){
                const pieceElement = document.createElement("div");
                // giving two class to every goti, piece that its a goti hai white or black that konse rang ki goti
                pieceElement.classList.add("piece", 
                    square.color === 'w' ?  "white" : "black");

                pieceElement.innerText = getPieceUnicode(square);
                pieceElement.draggable = playerRole === square.color;   //adding a draggleble field for peiceElement on the basis of if player role == the color of piece on square that is trying to be picked

                pieceElement.addEventListener("dragstart", (e) => {
                    if(pieceElement.draggable){
                        draggedPiece = pieceElement;
                        sourceSquare = {row: rowidx, col : squareidx};      //kaha se uthaya usne piece ko

                        e.dataTransfer.setData("text/plain", "");       //just a good pracitce for dragging
                    }
                });

                // dragg end hogya to
                pieceElement.addEventListener("dragend", (e)=> {
                    draggedPiece = null;
                    sourceSquare = null;
                });

                // box pe hath ghoda attach krdo
                squareElement.appendChild(pieceElement);
            }

            // kisi ke upr drag krne ki kosis
            squareElement.addEventListener("dragover", (e)=>{
                e.preventDefault();
            });

            squareElement.addEventListener("drop", (e)=>{
                e.preventDefault();
                if(draggedPiece){
                    const targetSource = {
                        row : parseInt(squareElement.dataset.row),
                        col: parseInt(squareElement.dataset.col)
                    };

                    // isse usspe daalo
                    handleMove(sourceSquare, targetSource);
                    
                }
            })
            
            boardElement.appendChild(squareElement);
        });
        
    });
    
    if(playerRole === "b"){
        boardElement.classList.add("flipped")
    }
    else{
        boardElement.classList.remove("flipped")
    }
    
    // ab board ban gyaa to use daal do fir frontend pe


};















const resetGame = document.getElementById("resetGame");

resetGame.addEventListener('click', ()=> {
    gameEnd.innerHTML = `    <h2 class="text-3xl font-bold text-red-500 tracking-wider 
        drop-shadow-sm hover:text-red-400 transition duration-200 ease-in-out">
     Chess.avi
 </h2>`;
 socket.emit("resetBoard");
});

socket.on('newGame', ()=> {
    gameEnd.innerHTML = `    <h2 class="text-3xl font-bold text-red-500 tracking-wider 
        drop-shadow-sm hover:text-red-400 transition duration-200 ease-in-out">
     Chess.avi
    </h2>`;
    socket.emit("resetBoard");
});

// handling Undo on button click
const undoButton = document.getElementById("undoButton");

undoButton.addEventListener('click', ()=> {
    socket.emit("undo");
}
);




const handleMove = (source, target) => {
    const move = {
        from: `${String.fromCharCode(97+source.col)}${8- source.row}`,
        to:`${String.fromCharCode(97+target.col)}${8- target.row}`,
        promotion: 'q'
    }
    socket.emit("move", move);

};

const getPieceUnicode = (piece) => {

    const unicodePieces = {
        'k': '\u2654', // White King
        'K': '\u265A', // Black King
        'q': '\u2655', // White Queen
        'Q': '\u265B', // Black Queen
        'r': '\u2656', // White Rook
        'R': '\u265C', // Black Rook
        'b': '\u2657', // White Bishop
        'B': '\u265D', // Black Bishop
        'n': '\u2658', // White Knight
        'N': '\u265E', // Black Knight
        'p': '\u2659', // White Pawn
        'P': '\u265F'  // Black Pawn
    };
    return unicodePieces[piece.type] || "";
};


socket.on("playerRole", function (role){
    playerRole = role;
    renderBoard();
});

socket.on("spectatorRole", ()=>{
    showNotification("You are in spectator role!", 1);

    playerRole=null;
    renderBoard();
});

socket.on("boardState", (fen)=>{
    chess.load(fen);
    renderBoard();
})

socket.on("move", (move)=>{
    console.log(move);
    var audio = new Audio('move.mp3'); 
    audio.play(); 
renderBoard();
})


socket.on("invalidMove", (move)=>{
    var audio = new Audio( 
        'invalidMove.mp3'); 
    audio.play(); 
    showNotification("Wrong Move, Try something else!", 1)
});

socket.on("notYourTurn", (move, turn)=>{
    var audio = new Audio( 
        '../notYourTurn.mp3'); 
    audio.play(); 
    showNotification(`It's ${turn==='w'? "White" : "Black"}'s Turn`, 1)
});

// socket.on("attacked", ()=>{
//     console.log("Attack")
//     var audio = new Audio( 
//         'https://assets.mixkit.co/active_storage/sfx/2151/2151-preview.mp3'); 
//     audio.play(); 
// });

renderBoard();

