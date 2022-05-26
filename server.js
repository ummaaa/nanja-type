'use strict';

const express = require('express');
const { Server } = require('ws');
const fs = require('fs');

const PORT = process.env.PORT || 3000;

const server = express()
    .use(express.static('public'))
    .listen(PORT, () => console.log(`Listening on ${PORT}`));

const wss = new Server({ server });
const clients = new Set();

const WAIT = 2; // 待ち時間
const MAX_NAME_LENGTH = 20; // 名前の長さの最大値
const LIMIT = 10; // 1問にかけられる時間のlimit
const COUNT_DOWN = 3;
let figId; // 今どの写真見てるか
let quizIdx = 0; // 今何問目
let namingId = -1;
let acceptInput = false;
let newGame = true;
let timeoutId;

const figNum = fs.readdirSync('./public/fig', { withFileTypes: true }).length;
const dict = Array(figNum).fill('');


wss.on('connection', (ws) => {
    console.log('Client connected');
    ws.on('message', message => {
        let ms = JSON.parse(message);
        console.log(ms);
        switch (ms.message) {
            case 'first connection':
                if (clients.size == 0) {
                    ws.id = 0;
                } else {
                    ws.id = Math.max(...clients) + 1;
                }
                clients.add(ws.id);
                ws.send(JSON.stringify({ message: 'press key' }));
                break;
            case 'name':
                nameFig(ms.input, ws.id);
                break;
            case 'answer':
                checkAnswer(ms.input, ws.id);
                break;
            case 'key':
                if (acceptInput) {
                    giveNamingRight(ms.key, ws.id);
                } else if (newGame) {
                    gameStart(ms.key, ws.id);
                }
                break;
        }
    });
    ws.on('close', () => {
        console.log('Client disconnected');
        clients.delete(ws.id);
    });
});


function gameStart(key, id) {
    if (key === 'Enter' && id === Math.min(...clients)) {
        newGame = false;
        sendAll({ message: 'game start' });
        setTimeout(() => {
            newQuiz(0);
        }, COUNT_DOWN * 1000);
    }
}

function checkAnswer(input, id) {
    if (input === dict[figId]) {
        clearTimeout(timeoutId);
        wss.clients.forEach(ws => {
            if (ws.id == id) {
                ws.send(JSON.stringify({ message: 'correct answer' }));
            } else {
                ws.send(JSON.stringify({ message: 'failed' }));
            }
        });
        quizIdx += 1;
        newQuiz(WAIT); // 出題
    }
}


function giveNamingRight(key, id) {
    if (key === 'Enter') {
        acceptInput = false;
        namingId = id;
        wss.clients.forEach(ws => {
            ws.send(JSON.stringify({
                message: 'input name',
                isOk: ws.id == namingId
            }));
        });
    }
}


function nameFig(input, id) {
    // 命名完了
    if (id != namingId) return;
    if (isValidName(input)) {
        dict[figId] = input;
        namingId = -1;
        sendAll({ message: 'given name', figId: figId, name: input });
        setTimeout(() => {
            newQuiz(WAIT); // 出題
        }, WAIT);
    }
    else {
        sendTo({ message: 'invalid input' }, id);
    }
}


// [0, mx)のランダムな整数を返す
function randint(mx) {
    return Math.floor(Math.random() * mx);
}

// chrが小文字化判定する
function islower(chr) {
    return chr.length === 1 && 'a' <= chr && chr <= 'z';
}

function isValidName(name) {
    if (name.length <= 0 || name.length > MAX_NAME_LENGTH) {
        return false;
    }
    for (const c of name) {
        if (!islower(c)) {
            return false;
        }
    }
    return true;
}


// 画面をクリアしてwait秒待ってからfigId番目の画像を出題
function newQuiz(wait) {
    figId = randint(figNum);
    sendAll({ message: 'clear' });
    setTimeout(() => {
        if (dict[figId]) {
            sendAll({
                message: 'quiz',
                figId: figId,
                answer: dict[figId]
            });
            timeoutId = setTimeout(() => {
                sendAll({ message: 'failed' });
                newQuiz(wait);
            }, LIMIT * 1000);
        } else {
            sendAll({ message: 'new fig', figId: figId });
            acceptInput = true;
        }
    }, wait * 1000);
}

function sendAll(message) {
    wss.clients.forEach(ws => {
        ws.send(JSON.stringify(message));
    });
}

function sendTo(message, id) {
    wss.clients.forEach(ws => {
        if (ws.id == id) {
            ws.send(JSON.stringify(message));
        }
    });
}
