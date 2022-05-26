let accept_input = false;

const State = Object.freeze({
    WaitingForStart: 0,
    Waiting: 1,
    NewFig: 2,
    NewFigNaming: 3,
    Quiz: 4
});

let currentState = State.Waiting;

const form = document.getElementById('form');
const input = document.getElementById('input');
const imageArea = document.getElementById('img');
const text1 = document.getElementById('text1');
const text2 = document.getElementById('text2');
const text3 = document.getElementById('text3');

function setText(t1, t2, t3) {
    text1.innerHTML = t1;
    text2.innerHTML = t2;
    text3.innerHTML = t3;
}

form.addEventListener('submit', (event) => {
    event.preventDefault();
    submit();
})

let answer;

function submit() {
    let inputText = input.value;

    switch (currentState) {
        case State.NewFigNaming:
            box.send(JSON.stringify({
                message: 'name',
                input: inputText
            }));
            break;
        case State.Quiz:
            if (inputText == answer)
                box.send(JSON.stringify({
                    message: 'answer',
                    input: inputText
                }));
            break;
    }
}

function setInputActive(active) {
    input.disabled = !active;
    if (active) input.focus();
    else input.blur();
}

window.onload = function () {
    const box = new ReconnectingWebSocket(location.protocol.replace("http", "ws") + "//" + location.host + "/ws");

    let server_connection = false;

    window.addEventListener('keydown', onKeyDown);

    box.onmessage = (message) => {
        let data = JSON.parse(message.data);
        switch (data.message) {
            case 'press key':
                currentState = State.WaitingForStart;
                setInputActive(false);
                break;
            case 'game start': // ゲーム開始（1度のみ）
                currentState = State.Waiting;
                gameStart();
                setInputActive(false);
                break;
            
            case 'new fig': // 命名の出題
                currentState = State.NewFig;
                displayFig(data.figId); // 画像表示
                setInputActive(false);
                break;
            case 'input name': // 命名権付与
                if (data.isOk) {
                    currentState = State.NewFigNaming;
                    setInputActive(true);
                } else {
                    currentState = State.Waiting;
                    setInputActive(false);
                }
                break;
            case 'invalid input': // 命名が不正
                setText('やり直せよコラ', '', '');
                break;
            case 'given name':
                // 名前はこれになりました
                displayFig(data.figId);
                setText('名前は', data.name, 'です');
                setInputActive(false);
                break;
            
            case 'quiz':
                currentState = State.Quiz;
                displayFig(data.figId); // 画像表示
                answer = data.answer; // 回答登録
                setInputActive(true);
                break;
            case 'correct answer':
                setText('正解だよ', '', '');
                break;
            case 'failed':
                setText('遅かったよ', '', '');
                break;
            
            case 'clear':
                deleteFig();
                break;
        }
    };

    box.onclose = () => {
        console.log('box closed');
        server_connection = false;
        document.getElementById('log').textContent = 'Connecting to the server...';
        this.box = new ReconnectingWebSocket(box.url);
    };

    box.onopen = () => {
        console.log('connected to server');
        document.getElementById('log').textContent = 'Connected';
        server_connection = true;
        box.send(JSON.stringify({
            id: myId,
            message: 'first connection'
        }));
    };
};

function displayFig(figId) {
    // 送られてきた画像を表示
    imageArea.style.display = 'block';
    imageArea.src = 'fig/' + String(figId) + '.png';
    imageArea.width = 200;
    imageArea.height = 200;
}

function gameStart() {
    // カウントダウンしてゲーム開始
    let cnt = 3;
    const intervalId = setInterval(() => {
        setText('', cnt, '');
		cnt--;
		if (cnt < 0) clearInterval(intervalId);
	}, 1000);
}

function deleteFig() {
    imageArea.style.display = 'none';
}

function onKeyDown(event) {
    switch (currentState) {
        case State.WaitingForStart:
        case State.NewFig:
            if (event.key == 'Enter') {
                box.send(JSON.stringify({
                    message: 'key',
                    key: 'Enter'
                }));
            }
            break;
    }    
}

