

const fig_num = 5; // 写真の総数
const wait = 2; // 待ち時間
const max_len_of_name = 20; // 名前の長さの最大値
const limit = 5; // 1問にかけられる時間のlimit
let dict = Array(fig_num).fill(''); // dict[i]: i枚目の写真の名前
let new_game = true; // ゲーム開始時だけtrue
let first_chr; // 最初に打つ文字
let fig_i; // 今どの写真見てるか
let pos; // 今何文字目見てるか
let naming; // 命名中
let start; // 今の問題の出題時刻
let ans = ''; // 入力中の答え
let accept_input = true; // 入力受け付けるかどうか
let quiz_idx = 0; // 今何問目

window.addEventListener('keydown', main);

// ルール説明
document.getElementById('text2').innerHTML = 'ルール説明';
rule_list = [
	'新しい画像が出たら，最も早く英文字以外のキーを打った人に命名権が与えられ，x点獲得できます',
	'既に出た画像の名前を最も早く打ち終わった人は，y点獲得できます<br>',
	'既に出た画像に英文字以外のキーを打つとz点減点です',
	'画像につける名前は英文字のみで，Enterを押して確定するまではBackspaceで修正できます',
	'Enter/returnキーを押すとカウトダウンが始まり，3秒後にゲームがスタートします',
	'カウントダウンが終わると，カウントダウンの数字と同じ位置にアルファベットが1文字表示され，そのアルファベットを最も早く打った人に最初の画像に対する命名権が与えられます',
	`既に出た画像で${limit}秒以内に正解者が出なければ，次の問題に移ります`
];
rules = '';
for (rule of rule_list) rules += '<li>' + rule + '</li>';
document.getElementById('rule').innerHTML = rules;

function main(event) {
	if (!accept_input) return;
	let keyCode = event.key; // 打たれたkey
	// console.log(keyCode, naming, fig_i, dict);

	// 新しいゲームの開始
	if (new_game) {
		if (keyCode != 'Enter') return;

		accept_input = false;

		document.getElementById('rule').innerHTML = '';
		document.getElementById('text2').innerHTML = '';
		count_down(3);
		return;
	}

	// 指定された文字を最初に打った人に，最初の写真の命名権が与えられる
	if (first_chr) {
		if (keyCode === first_chr) {

			accept_input = false;

			fig_i = randint(fig_num), pos = 0;
			document.getElementById('img').width = 200;
			document.getElementById('img').height = 200;
			document.getElementById('img').src = 'fig/' + String(fig_i) + '.png';
			document.getElementById('text1').innerHTML = 'これにつける名前を入力してください';
			document.getElementById('text2').innerHTML = '';
			naming = true, first_chr = '';

			accept_input = true;

		}
		return;
	}

	if (naming) {

		// 命名完了
		if (0 < dict[fig_i].length && dict[fig_i].length <= max_len_of_name && keyCode === 'Enter') {
			
			quiz_idx += 1;
			accept_input = false;

			document.getElementById('text1').innerHTML = 'これは';
			document.getElementById('text2').innerHTML = dict[fig_i];
			document.getElementById('text3').innerHTML = 'です';
			// new Audio('mp3/register.mp3').play();
			
			/* 単語の読み上げ */
			var speak = new SpeechSynthesisUtterance();
			speak.text = 'これは' + dict[fig_i] + 'です';
			speak.lang = 'ja-JP'; // 'en-US';
			speechSynthesis.speak(speak);
			/* 単語の読み上げ終わり */

			fig_i = randint(fig_num), pos = 0;
			naming = false;
			new_quiz(3, fig_i); // 出題
			return;
		}
		else if (islower(keyCode)) {
			dict[fig_i] += keyCode;
		}
		else if (dict[fig_i] && keyCode === 'Backspace') {
			dict[fig_i] = dict[fig_i].slice(0, -1);
		}

		if (0 < dict[fig_i].length && dict[fig_i].length <= max_len_of_name) document.getElementById('text1').innerHTML = '命名中(Enterで確定)';
		else document.getElementById('text1').innerHTML = `名前は1文字以上${max_len_of_name}以下である必要があります`;

		document.getElementById('text2').innerHTML = dict[fig_i];

		return;
	}
	
	if (!dict[fig_i] && !islower(keyCode)) {

		accept_input = false;

		naming = true;
		document.getElementById('text1').innerHTML = 'これにつける名前を入力してください';

		accept_input = true;

		return;
	}
	
	if (dict[fig_i][pos] === keyCode) { //押したキーが合っていたら
		ans += keyCode;
		pos++;

		// 正解
		if (pos === dict[fig_i].length){

			accept_input = false;

			document.getElementById('img').width = 0;
			document.getElementById('img').height = 0;
			document.getElementById('text1').innerHTML = '正解！';
			document.getElementById('text2').innerHTML = ans;
			quiz_idx += 1;
			new Audio('mp3/ac.mp3').play();

			fig_i = randint(fig_num), pos = 0, ans = '';
			document.getElementById('img').src = 'fig/' + String(fig_i) + '.png';
			new_quiz(wait, fig_i); // 出題
			return;
		}
		document.getElementById('text2').innerHTML = ans;
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

// ゲーム開始のカウントダウン
function count_down(cnt) {
	const intervalId = setInterval(() => {
		document.getElementById('text2').innerHTML = cnt;
		cnt--;
		if (cnt < 0) {
			accept_input = true;
			first_chr = String.fromCharCode('a'.charCodeAt(0) + randint(26)); // first_chrを打ったらゲームスタート
			document.getElementById('text2').innerHTML = first_chr;
			new_game = false;
			// new Audio('mp3/start.mp3').play();
			clearInterval(intervalId);
		}
	}, 1000);
}

// 画面をクリアしてwait秒待ってからfig_i番目の画像を出題
function new_quiz(wait, fig_i) {
	let cnt = 0;
	const intervalId = setInterval(() => {
		document.getElementById('text1').innerHTML = '';
		document.getElementById('text2').innerHTML = '';
		document.getElementById('text3').innerHTML = '';
		document.getElementById('img').src = 'fig/' + String(fig_i) + '.png';
		document.getElementById('img').width = cnt * 200;
		document.getElementById('img').height = cnt * 200;
		cnt++;
		if (cnt > 1) {
			accept_input = true;
			if (dict[fig_i]) timer(quiz_idx); // 初めての出題じゃなかったらタイマーをセット
			clearInterval(intervalId);
		}
	}, wait * 1000);
}


function timer(quiz_idx_when_called) {
	setTimeout(()=>{
		if (quiz_idx_when_called != quiz_idx) return; // 関数が呼ばれた時と違う問題を解いてるならタイマーストップ

		accept_input = false;

		document.getElementById('text1').innerHTML = '答え';
		document.getElementById('text2').innerHTML = dict[fig_i];
		fig_i = randint(fig_num), pos = 0;
		quiz_idx += 1;
		
		new_quiz(wait, fig_i);

	}, limit * 1000);
}