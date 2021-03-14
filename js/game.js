
// constants
var HORIZONTAL_BOARD_PIXELS = 320;
var VERTICAL_BOARD_PIXELS = 320;
var HORIZONTAL_CELL_PIXELS = 45.4;
var VERTICAL_CELL_PIXELS = 46;
var TOTAL_COLUMNS = 7;
var TOTAL_ROWS = 7;
var HUMAN_WIN_SCORE = -100;
var COMPUTER_WIN_SCORE = 100;
var NO_WIN_SCORE = 0;

// global variables
var canvas;
var context;
var currentBoard;
var currentPlayer;
var $messageDiv;

// object used by the AI to consider potential moves
var thinkNode = function (board) {
    this.board = new Array();       // the board that is being considered
    this.score;                     // score assigned to this board

    // adds a token to the board
    this.setMove = function (col, row, player) {
        if (this.board[col].length < TOTAL_ROWS) {
            this.board[col][row] = player;
        }
    }

    // clone the board passed in to create my own board instance
    for (var col = 0; col < TOTAL_COLUMNS; col++) {
        this.board[col] = new Array();
        for (var row = 0; row < board[col].length; row++) {
            this.board[col][row] = board[col][row];
        }
    }
}

// singleton to preload images
var preloader = new function () {
    this.imageArray = new Array();  // holds images, keyed by src
    this.countImagesToLoad = 0;     // so we know when all images have been loaded    

    // loads images from an array of src values
    this.preload = function (srcArray, allLoadedCallback) {
        this.countImagesToLoad += srcArray.length;
        for (var i = 0; i < srcArray.length; i++) {
            // create new image and set onload callback
            var image = new Image();
            image.onload = this.getImageLoadedCallback(this, allLoadedCallback);

            // set image's src and add to our image array
            var src = srcArray[i];
            image.src = src;
            this.imageArray[src] = image;
        }
    }

    // returns a function object, which has stuff within to run when an image finishes loading
    this.getImageLoadedCallback = function (preloaderObj, allLoadedCallback) {
        return function () {
            preloaderObj.countImagesToLoad--;
            if (preloaderObj.countImagesToLoad == 0) {
                // all images are now loaded, call the final callback function
                allLoadedCallback();
            }
        }
    }

    // returns a preloaded image
    this.getImage = function (src) {
        return this.imageArray[src];
    }
}

$(document).ready(function () {
    // attempt to get canvas and its context
    canvas = document.getElementById('canvas');
    if (canvas && canvas.getContext) {
        // canvas is supported
        context = canvas.getContext('2d');

        // grab message div
        $messageDiv = $('#message');

        // preload images and call resetGame() when done to initialize game
        preloader.preload(['images/board.jpg', 'images/token1.png', 'images/token2.png'], resetGame);
    }
    else {
        // canvas is not supported
        alert('Your browser does not support HTML5 Canvas.');
    }
});

// reset game
function resetGame() {
    // unbind click event that resets game (for when it's there from a game ending)
    $('#canvas').unbind('click', resetGame);

    // draw board on canvas
    //context.drawImage(preloader.getImage('images/board.jpg'), 0, 0);
	canvas.width = canvas.width;
    // initialize board to an array of empty arrays
    currentBoard = new Array();
    for (var col = 0; col < TOTAL_COLUMNS; col++) {
        currentBoard[col] = new Array();
    }

    // human goes first
    goHumanTurn();
}

// sets event to wait for human to click
function goHumanTurn() {
    currentPlayer = 1;
    $messageDiv.text('Your turn.');

    // wait for user to click board
    $(canvas).click(boardClick);
}

// handler for when human clicks on board
function boardClick(event) {
    // unbind click event to prevent repeated triggering
    $('#canvas').unbind('click', boardClick);

    // get x-coordinate of click on board
    var x = event.pageX - $(event.target).offset().left;

    // convert x-coordinate to column index
    // the very last pixel is actually out of bounds, so we use min() to bump it down
    var col = Math.min(Math.floor(x / HORIZONTAL_CELL_PIXELS), TOTAL_COLUMNS - 1);

    // row index is simply the number of tokens already in the column
    var row = currentBoard[col].length;
    if (row < TOTAL_ROWS) {
        // column isn't full yet, this move is valid
        currentBoard[col][row] = currentPlayer;
        drawToken(col, row);

        // check end game conditions
        if (checkWin(currentBoard, col, row, true)) {
            // human wins
            $messageDiv.text('You win! Click the board to restart.');
            $(canvas).click(resetGame);
        }
        else if (checkBoardFull(currentBoard)) {
            // tie
            $messageDiv.text('It\'s a tie! Click the board to restart.');
            $(canvas).click(resetGame);
        }
        else {
            // pass turn to computer
            goComputerTurn();
        }
    }
    else {
        // column is full, move is invalid, rebind click event so human can try again
        $(canvas).click(boardClick);
    }
}

// initiates AI after small pause
function goComputerTurn() {
    currentPlayer = 2;
    $messageDiv.text('Computer is thinking...');

    setTimeout(makeComputerMove, 200);
}

// makes the computer's move
function makeComputerMove() {
    // think iteratively up to max depth to pick move
    var col;
    for (var depth = 0; depth <= 4; depth++) {
        var origin = new thinkNode(currentBoard);
        var tentativeCol = think(origin, 2, depth);

        if (origin.score == HUMAN_WIN_SCORE) {
            // AI has realized it can lose, keep previous undiscouraged col value
            // this solves the "apathy" problem
            break;
        }
        else if (origin.score == COMPUTER_WIN_SCORE) {
            // AI knows how to win, no need to think deeper, use this col value
            // this solves the "cocky" problem
            col = tentativeCol;
            break;
        }
        else {
            // use this more deeply considered col value (for now)
            col = tentativeCol;
        }
    }

    // row index is simply the number of tokens already in the column
    var row = currentBoard[col].length;

    // make the move
    currentBoard[col][row] = currentPlayer;
    drawToken(col, row);

    // check end game conditions
    if (checkWin(currentBoard, col, row, true)) {
        // computer wins
        $messageDiv.text('Computer wins! Click the board to restart.');
        $(canvas).click(resetGame);
    }
    else if (checkBoardFull(currentBoard)) {
        // tie
        $messageDiv.text('It\'s a tie! Click the board to restart.');
        $(canvas).click(resetGame);
    }
    else {
        // pass turn to human
        goHumanTurn();
    } 
}

// recursive function to pick the computer's next move
function think(node, player, recursionsRemaining) {
    var childNodes = new Array();

    // consider a move in each column
    for (var col = 0; col < TOTAL_COLUMNS; col++) {
        // make sure column isn't already full
        var row = node.board[col].length;
        if (row < TOTAL_ROWS) {
            // create new child node to represent this potential move
            var childNode = new thinkNode(node.board);
            childNodes[col] = childNode;
            childNode.setMove(col, row, player);

            // determine score for this move
            if (checkWin(childNode.board, col, row, false)) {
                // someone would win with this move, set score depending on who it is
                // recursion stops here, since there's no point thinking past a win
                if (player == 1) {
                    // it's the human, boo!
                    childNode.score = HUMAN_WIN_SCORE;
                }
                else {
                    // it's the computer, hooray!
                    childNode.score = COMPUTER_WIN_SCORE;
                }
            }
            else if (recursionsRemaining > 0) {
                // not a win and there are recursions remaining, so keep thinking deeper
                var nextPlayer = (player == 1) ? 2 : 1;
                think(childNode, nextPlayer, recursionsRemaining - 1);
            }
            else {
                // no win, no recursions remaining, this is a very boring end of the line
                childNode.score = NO_WIN_SCORE;
            }

            // keep track of the most significant score of the child nodes in this loop
            if (node.score == undefined) {
                // no score yet, gotta have something, may as well use this one (for now)
                node.score = childNode.score;
            }
            else if (player == 1 && childNode.score < node.score) {
                // assume human will always pick the lowest scoring move (least favorable to computer)
                node.score = childNode.score;
            }
            else if (player == 2 && childNode.score > node.score) {
                // computer should always pick the highest scoring move (most favorable to computer)
                node.score = childNode.score;
            }
        }
    }

    // save the column indexes of all moves tied for the most significant score
    var candidates = new Array();
    for (var col = 0; col < TOTAL_COLUMNS; col++) {
        if (childNodes[col] != undefined && childNodes[col].score == node.score) {
            candidates.push(col);
        }
    }

    // randomly pick one of these candidate column indexes as the move
    var moveCol = candidates[Math.floor(Math.random() * candidates.length)];
    return moveCol;
}

// returns true if the board is full
function checkBoardFull(board) {
    for (var col = 0; col < TOTAL_COLUMNS; col++) {
        if (board[col].length < TOTAL_ROWS) {
            // found an unfilled column
            return false;
        }
    }

    // all columns are full
    return true;
}

// returns true if player has 4 tokens in a row on the board
function checkWin(board, lastMoveCol, lastMoveRow, isDrawWinLine) {
    // find out who made the last move (this is who we'll be checking for a win)
    var player = getTokenAt(board, lastMoveCol, lastMoveRow);

    // use helper function to check all 4 possible win directions
    if (checkWinHelper(board, player, lastMoveCol, lastMoveRow, 0, 1, isDrawWinLine)) {
        // vertical win
        return true;
    }
    else if (checkWinHelper(board, player, lastMoveCol, lastMoveRow, 1, 0, isDrawWinLine)) {
        // horizontal win
        return true;
    }
    else if (checkWinHelper(board, player, lastMoveCol, lastMoveRow, 1, 1, isDrawWinLine)) {
        // diagonal "/" win
        return true;
    }
    else if (checkWinHelper(board, player, lastMoveCol, lastMoveRow, 1, -1, isDrawWinLine)) {
        // diagonal "\" win
        return true;
    }
    else {
        // no win
        return false;
    }
}

// helper function to check for a current win state
function checkWinHelper(board, player, lastMoveCol, lastMoveRow, colStep, rowStep, isDrawWinLine) {
    // keep track of number of consecutive player tokens
    var consecutiveCount = 0;

    // check from 3 tokens before to 3 tokens after the last placed token
    // this covers all possible streaks of 4 tokens that include the last placed token
    for (var i = -3; i <= 3; i++) {
        if (getTokenAt(board, lastMoveCol + i * colStep, lastMoveRow + i * rowStep) == player) {
            // the player's token is here, increment count and check if we've reached 4
            consecutiveCount++;
            if (consecutiveCount == 4) {
                // yep, this is a win
                if (isDrawWinLine) {
                    // the win line goes from the row/column of 3 steps ago to the row/column of the current step
                    drawWinLine(lastMoveCol + (i - 3) * colStep, lastMoveRow + (i - 3) * rowStep,
                        lastMoveCol + i * colStep, lastMoveRow + i * rowStep);
                }
                return true;
            }
        }
        else {
            // not the player's token, streak broken, reset count
            consecutiveCount = 0;
        }
    }

    // win condition not met
    return false;
}

// safe way to get the value of the token at the specified location on the board
function getTokenAt(board, col, row) {
    var token = 0;
    if (board[col] != undefined && board[col][row] != undefined) {
        token = board[col][row];
    }
    return token;
}

// draws the token onto the board
function drawToken(col, row) {
    // map column/row indexes to x/y-coordinates
    var x = col * HORIZONTAL_CELL_PIXELS + 1;
    var y = VERTICAL_BOARD_PIXELS - (row + 1) * VERTICAL_CELL_PIXELS;

    // draw current player's token
    if (currentPlayer == 1) {
        context.drawImage(preloader.getImage('images/token1.png'), x, y)
    }
    else {
        context.drawImage(preloader.getImage('images/token2.png'), x, y)
    }
}

// draws a line on the board to show a win
function drawWinLine(startColIndex, startRowIndex, endColIndex, endRowIndex) {
    // map column/row indexes to x/y-coordinates
    var startX = (startColIndex + 0.5) * HORIZONTAL_CELL_PIXELS + 1;
    var startY = VERTICAL_BOARD_PIXELS - (startRowIndex + 0.5) * VERTICAL_CELL_PIXELS;
    var endX = (endColIndex + 0.5) * HORIZONTAL_CELL_PIXELS + 1;
    var endY = VERTICAL_BOARD_PIXELS - (endRowIndex + 0.5) * VERTICAL_CELL_PIXELS;

    // draw a thick white line
    context.strokeStyle = "#ffffff";
    context.lineWidth = 3;
    context.lineCap = 'round';
    context.beginPath();
    context.moveTo(startX, startY);
    context.lineTo(endX, endY);
    context.stroke();
}