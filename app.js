const express = require('express');
const socket = require('socket.io');
const http =  require('http');
const { Chess, WHITE } = require("chess.js");
const path = require('path');
const { title, disconnect } = require('process');

const app = express();
const server = http.createServer(app);

const io = socket(server); 
 
const chess = new Chess();


// console.log(chess.getCastlingRights("BLACK", { ["KING"]: true, ["QUEEN"]: true }));

let players = {}
let currentPlayer = "w";

app.set("view engine", "ejs");

app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res)=> {
    res.render("index", {title: "chess.avi"});
});

// io is our socket server, REAL TIME SERVER
io.on("connection", function (uniqueSocket) {



    // player aaya, then 
    if(!players.white){
        players.white = uniqueSocket.id;
        uniqueSocket.emit("playerRole", "w");
    }
    else if(!players.black){
        players.black = uniqueSocket.id;
        uniqueSocket.emit("playerRole", "b");
    }
    else{
        uniqueSocket.emit("spectatorRole");
    }

    // player gaya, then
    uniqueSocket.on("disconnect", ()=>{
        if(uniqueSocket.id === players.white){
            delete players.white;
        }
        else if(uniqueSocket.id === players.black){
            delete players.black;
        }
    })


    // frontend se move event aaya, koi move krne ki kosis krara
    uniqueSocket.on("move", (move)=>{
        try{
            if(chess.turn() == 'w' && uniqueSocket.id !== players.white) {
                uniqueSocket.emit("notYourTurn", move, chess.turn());
                
                return;
            }
            if(chess.turn() == 'b' && uniqueSocket.id !== players.black){
                uniqueSocket.emit("notYourTurn", move, chess.turn());
                return;
            } 

            // move could be wrong or right
            const result = chess.move(move);
            if(result){
                // chess turn will change if result is true then current player will change
                currentPlayer = chess.turn();
                io.emit("move", move);
                io.emit("boardState", chess.fen());
            }
            else{
                uniqueSocket.emit("invalidMove", move);
            }
        }
        catch(err){
            console.log(err);
            console.log("Invalid Move:", move);
            uniqueSocket.emit("invalidMove", move);

        }
        // console.log(chess.turn(), `${chess.turn() === 'w' ? 'b' : 'w' }` );
        // console.log(chess.isAttacked(move['to'],`${chess.turn() === 'w' ? 'b' : 'w' }`));
        // if(chess.isAttacked(move['to'], `${chess.turn() === 'w' ? 'b' : 'w' }`)){
        //     console.log("Attack")
        //     uniqueSocket.emit("attacked");
        // }
            // Handling gameover
        if(chess.isGameOver()){
            console.log("Game is Over!")

            if(chess.isCheckmate()){
                console.log("Check Mate")
                uniqueSocket.emit("checkmate", chess.turn());
            }
            else{
                // console.log(true)
                uniqueSocket.emit("draw");
            }

        };

    })

    // not workign
    uniqueSocket.on("undo", (move)=>{
        if(chess.turn() == 'w' && uniqueSocket.id === players.white) {
            return;
        }
        if(chess.turn() == 'b' && uniqueSocket.id === players.black){
            return;
        } 
        const undoResult = chess.undo(move);
        if (undoResult){
            io.emit("boardState", chess.fen());
        }
        
    });


    // handling reload
    uniqueSocket.on("resetBoard", ()=>{
        const resetResult = chess.reset();
        io.emit("boardState", chess.fen());
        
    });
    
    uniqueSocket.on("newGame", ()=>{
        chess.reset();
        io.emit("boardState", chess.fen());
        io.emit('newGame');
    })
    
    });
    






server.listen(3000, function () {
    console.log("Badhiya Chal raha server!");
});