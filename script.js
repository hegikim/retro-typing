let practiceData = [];
let currentText = "";
let currentIndexInArray = -1;

let startTime = null;
let totalTyped = 0;
let totalErrors = 0;

const targetTextEl = document.getElementById('target-text');
const userInputEl = document.getElementById('user-input');
const textPasteArea = document.getElementById('text-paste-area');
const btnLoadPaste = document.getElementById('btn-load-paste');
const fileInput = document.getElementById('file-input');
const cpmEl = document.getElementById('cpm');
const accuracyEl = document.getElementById('accuracy');
const errorsEl = document.getElementById('errors');
const currentModeEl = document.getElementById('current-mode');

const defaultData = [
    "정확도가 속도보다 훨씬 더 중요합니다.",
    "모바일 오타를 줄이기 위한 레트로 타자 연습기입니다.",
    "소음과 진동(NVH)은 차량의 품질을 결정하는 중요한 요소입니다.",
    "Practice makes perfect. Take your time."
];

// [수정됨] 키보드가 올라올 때 사파리 주소창을 피해 입력창을 화면 중앙으로 부드럽게 끌어올림
userInputEl.addEventListener('focus', () => {
    setTimeout(() => {
        userInputEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 300); // 아이폰 키보드가 올라오는 애니메이션 시간(약 0.3초) 대기 후 작동
});

function parseRawText(rawText) {
    if (!rawText || rawText.trim().length === 0) return [];
    let cleanText = rawText.replace(/['"‘’“”`]/g, "").replace(/\s+/g, " ");
    return cleanText.split(/[.!?\n]+/)
                    .map(s => s.trim())
                    .filter(s => s.length > 3 && s.length < 120);
}

function loadSentences(sentences, modeName) {
    if (sentences.length === 0) {
        alert("인식 가능한 문장이 없습니다. 텍스트를 다시 확인해 주세요.");
        return;
    }
    practiceData = sentences;
    localStorage.setItem('savedTypingData', JSON.stringify(practiceData));
    
    userInputEl.disabled = false;
    userInputEl.placeholder = "첫 글자를 입력하면 시작됩니다.";
    textPasteArea.value = ""; 
    
    startTime = null;
    totalTyped = 0;
    totalErrors = 0;
    cpmEl.innerText = "0";
    accuracyEl.innerText = "100";
    errorsEl.innerText = "0";

    nextQuestion(modeName);
}

function nextQuestion(modeName = "사용자 데이터") {
    if (practiceData.length === 0) {
        practiceData = [...defaultData];
        localStorage.removeItem('savedTypingData');
        currentModeEl.innerText = "모드: 기본 문장 완료";
        targetTextEl.innerText = "모든 문장을 완료했습니다! 새로운 글을 장착해 주세요.";
        userInputEl.disabled = true;
        userInputEl.value = "";
        return;
    }

    currentIndexInArray = Math.floor(Math.random() * practiceData.length);
    currentText = practiceData[currentIndexInArray].trim();
    
    targetTextEl.innerText = currentText;
    userInputEl.value = "";
    userInputEl.classList.remove('error');
    currentModeEl.innerText = `모드: ${modeName} (남은 문장: ${practiceData.length}개)`;
}

userInputEl.addEventListener('input', () => {
    let typed = userInputEl.value;

    if (typed === " " && !currentText.startsWith(" ")) {
        userInputEl.value = "";
        return;
    }

    if (!startTime && typed.length > 0) {
        startTime = new Date(); 
    }

    const currentTarget = currentText.substring(0, typed.length);

    if (typed !== currentTarget) {
        userInputEl.classList.add('error');
        totalErrors++;
    } else {
        userInputEl.classList.remove('error');
    }

    if (typed.length > 0) totalTyped++;

    if (startTime) {
        const timeElapsed = (new Date() - startTime) / 1000 / 60;
        const cpm = Math.round((totalTyped / timeElapsed)) || 0;
        let accuracy = Math.round(((totalTyped - totalErrors) / totalTyped) * 100) || 100;
        if (accuracy < 0) accuracy = 0;

        cpmEl.innerText = cpm;
        accuracyEl.innerText = accuracy;
        errorsEl.innerText = totalErrors;
    }

    if (typed === currentText) {
        practiceData.splice(currentIndexInArray, 1);
        if (currentModeEl.innerText.includes("기본")) {
            localStorage.setItem('savedTypingData', JSON.stringify(practiceData));
        }
        nextQuestion(currentModeEl.innerText.split('(')[0].replace('모드: ', '').trim());
    }
});

btnLoadPaste.addEventListener('click', () => {
    const parsed = parseRawText(textPasteArea.value);
    loadSentences(parsed, "텍스트 붙여넣기");
});

fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(event) {
        const parsed = parseRawText(event.target.result);
        loadSentences(parsed, file.name.replace('.txt', ''));
    };
    reader.readAsText(file, "UTF-8");
});

function init() {
    const saved = localStorage.getItem('savedTypingData');
    if (saved) {
        practiceData = JSON.parse(saved);
        userInputEl.disabled = false;
        userInputEl.placeholder = "이어서 입력하세요.";
        nextQuestion("저장된 데이터");
    } else {
        practiceData = [...defaultData];
        currentModeEl.innerText = "모드: 텍스트 공급 필요";
    }
}

init();
