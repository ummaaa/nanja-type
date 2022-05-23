'use strict';

const express = require('express');
const { json } = require('express/lib/response');
const { Server } = require('ws');

const PORT = process.env.PORT || 3000;
const INDEX = '/pages/';

const server = express()
    .use(express.static('public'))
    .listen(PORT, () => console.log(`Listening on ${PORT}`));

const wss = new Server({ server });
const playerId = new Set();
const player = {};
const canvas = { width: 300, height: 500 };
const malletRadius = 15;
const puck = {
    radius: 10,
    position: { x: canvas.width / 2, y: canvas.height / 2 },
    velocity: { x: 0, y: 0 }
};
const animateTime = 50;
let game = true;
let p1Status = '';
let p2Status = '';

wss.on('connection', (ws) => {
    console.log('Client connected');
    ws.on('message', message => {
        let ms = JSON.parse(message);
        switch (ms.message) {
            case 'first connection':
                ws.id = ms.id;
                if (playerId.size < 2) {
                    playerId.add(ms.id);
                    player[ms.id] = { x: canvas.width / 2, y: canvas.height - 30 };
                }
                break;
            case 'move':
                if (playerId.has(ms.id)) {
                    player[ms.id] = ms.coord;
                }
                break;
            case 'start':
                if (puck.velocity.x == 0 && puck.velocity.y == 0) {
                    puck.velocity.x = 0;
                    puck.velocity.y = 10;
                }
                game = true;
                break;
            case 'reset':
                if (puck.velocity.x == 0 && puck.velocity.y == 0) {
                    puck.position.x = canvas.width / 2;
                    puck.position.y = canvas.height / 2;
                }
                game = true;
                break;
        }
    });
    ws.on('close', () => {
        console.log('Client disconnected');
        playerId.delete(ws.id);
    });
});

setInterval(() => {
    if (game) {
        calcPosition();
        wss.clients.forEach((client) => {
            let p1, p2, puckPos;
            if (playerId.has(client.id)) {
                let opponent = [...playerId].filter(e => (e != client.id))[0];
                p1 = client.id;
                p2 = opponent;
                if ([...playerId][0] === client.id) {
                    puckPos = puck.position;
                } else {
                    puckPos = reverse(puck.position);
                }
            } else {
                [p1, p2] = [...playerId];
                puckPos = puck.position;
            }
            client.send(JSON.stringify({
                p1: player[p1],
                p2: reverse(player[p2]),
                puck: puckPos,
                message: 'ongame'
            }));
        });
    } else {
        wss.clients.forEach((ws) => {
            switch (ws.id) {
                case [...playerId][0]:
                    ws.send(JSON.stringify({ message: p1Status }));
                    break;
                case [...playerId][1]:
                    ws.send(JSON.stringify({ message: p2Status }));
                    break;
                default:
                    break;
            }
        });
    }
}, animateTime);

function calcPosition() {
    for (let id of [...playerId]) {
        let pos;
        if ([...playerId][0] === id) {
            pos = player[id];
        } else {
            pos = reverse(player[id]);
        }
        if (distance2(puck.position, pos) <= (puck.radius + malletRadius) ** 2) {
            let vec = {
                x: puck.position.x - pos.x,
                y: puck.position.y - pos.y
            };
            puck.velocity = reflect(puck.velocity, vec);
        }
    }
    puck.position.x += puck.velocity.x;
    puck.position.y += puck.velocity.y;
    if (puck.position.x < puck.radius) {
        puck.velocity = reflect(puck.velocity, { x: 1, y: 0 });
    } else if (puck.position.x > canvas.width - puck.radius) {
        puck.velocity = reflect(puck.velocity, { x: -1, y: 0 });
    }
    if (puck.position.y < puck.radius) {
        p1Status = 'win';
        p2Status = 'lose';
        puck.velocity = { x: 0, y: 0 };
        game = false;
    } else if (canvas.height - puck.radius < puck.position.y) {
        p1Status = 'lose';
        p2Status = 'win';
        puck.velocity = { x: 0, y: 0 };
        game = false;
    }
}

function distance2(pos1, pos2) {
    return (pos1.x - pos2.x) ** 2 + (pos1.y - pos2.y) ** 2;
}

function reflect(vel, vec) {
    let len = Math.sqrt(vec.x ** 2 + vec.y ** 2);
    let n = { x: vec.x / len, y: vec.y / len };
    let prod = vel.x * n.x + vel.y * n.y;
    return {
        x: vel.x - 2 * prod * n.x,
        y: vel.y - 2 * prod * n.y
    };
}

function reverse(pos) {
    if (!pos) {
        return;
    }
    return {
        x: canvas.width - pos.x,
        y: canvas.height - pos.y
    };
}