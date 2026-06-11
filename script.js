// 1. 상태 변수 정의
let practiceData = [];
let currentText = "";
let currentIndexInArray = -1;

let startTime = null;
let totalTyped = 0;
let totalErrors = 0;

// 기본 백업 문장 세트
const defaultData = [
    "정확도가 속도보다 훨씬 더 중요합니다.",
    "모바일 오타를 줄이기 위한 레트로 타자 연습기입니다.",
    "소음과 진동(NVH)은 차량의 품질을 결정하는 중요한 요소입니다.",
    "Practice makes perfect. Take your time."
];

// 2. HTML 요소 매핑
const mainContainer = document.getElementById('main-container');
const targetTextEl = document.getElementById('target-text');
const userInputEl = document.getElementById('user-input');
const textPasteArea = document.getElementById('text-paste-area');
const btnLoadPaste = document.getElementById('btn-load-paste');
const fileInput = document.getElementById('file-input');
const cpmEl = document.getElementById('cpm');
const accuracyEl = document.getElementById('accuracy');
const errorsEl = document.getElementById('errors');
const currentModeEl = document.getElementById('current-mode');

// 3. [iOS 버그 해결] 키보드가 올라올 때 화면 위치를 가상 뷰포트에 고정
if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', () => {
        // 실제 눈에 보이는 화면 높이만큼 컨테이너 크기를 강제 고정
        mainContainer.style.height = `${window.visualViewport.height}px`;
        // 사파리가 화면을 위로 밀어 올리는 현상을 원천 방어
        window.scrollTo(0, 0); 
    });
}

// 4. 원문 텍스트 문장 정제 및 분리 처리기
function parseRawText(rawText) {
    if (!rawText || rawText.trim().length === 0) return [];
    
    // 불필요한 따옴표 제거 및 연속된 공백 하나로 정돈
    let cleanText = rawText.replace(/['"‘’“”`]/g, "").replace(/\s+/g, " ");
    
    // 마침표, 줄바꿈 기준으로 문장 분리 후 공백 제거
    return cleanText.split(/[.!?\n]+/)
                    .map(s => s.trim())
                    .filter(s => s.length > 3 && s.length < 120);
}

// 5. 로컬스토리지 저장 및 데이터 장착 완료 처리
function loadSentences(sentences, modeName) {
    if (sentences.length === 0) {
        alert("인식 가능한 문장이 없습니다. 텍스트를 다시 확인해 주세요.");
        return;
    }
    practiceData = sentences;
    localStorage.setItem('savedTypingData', JSON.stringify(practiceData));
    
    userInputEl.disabled = false;
    userInputEl.placeholder = "첫 글자를 입력하면 측정이 시작됩니다.";
    textPasteArea.value = ""; // 입력창 비우기
    
    // 통계 초기화
    startTime = null;
    totalTyped = 0;
    totalErrors = 0;
    cpmEl.innerText = "0";
    accuracyEl.innerText = "100";
    errorsEl.innerText = "0";

    nextQuestion(modeName);
}

// 6. 다음 문제 출제 로직
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
    // 문장 자체의 앞뒤 공백을 철저하게 잘라내어 원천 차단
    currentText = practiceData[currentIndexInArray].trim();
    
    targetTextEl.innerText = currentText;
    userInputEl.value = "";
    userInputEl.classList.remove('error');
    currentModeEl.innerText = `모드: ${modeName} (남은 문장: ${practiceData.length}개)`;
}

// 7. [첫 글자 공백 버그 해결] 실시간 입력 감지 및 오타 연산
userInputEl.addEventListener('input', () => {
    let typed = userInputEl.value;

    // 해결 포인트: 첫 글자를 입력할 때 실수로 띄어쓰기(공백)를 누른 경우
    // 원문 문장이 공백으로 시작하지 않는다면 오답 처리하지 않고 즉시 지워버립니다.
    if (typed === " " && !currentText.startsWith(" ")) {
        userInputEl.value = "";
        return;
    }

    if (!startTime && typed.length > 0) {
        startTime = new Date(); 
    }

    const currentTarget = currentText.substring(0, typed.length);

    // 오타 실시간 피드백
    if (typed !== currentTarget) {
        userInputEl.classList.add('error');
        totalErrors++;
    } else {
        userInputEl.classList.remove('error');
    }

    if (typed.length > 0) totalTyped++;

    // 통계 계산
    if (startTime) {
        const timeElapsed = (new Date() - startTime) / 1000 / 60;
        const cpm = Math.round((totalTyped / timeElapsed)) || 0;
        let accuracy = Math.round(((totalTyped - totalErrors) / totalTyped) * 100) || 100;
        if (accuracy < 0) accuracy = 0;

        cpmEl.innerText = cpm;
        accuracyEl.innerText = accuracy;
        errorsEl.innerText = totalErrors;
    }

    // 한 문장 완료 검사
    if (typed === currentText) {
        practiceData.splice(currentIndexInArray, 1);
        // 완료될 때마다 금고 상태 실시간 백업
        if (currentModeEl.innerText.includes("기본")) {
            localStorage.setItem('savedTypingData', JSON.stringify(practiceData));
        }
        nextQuestion(currentModeEl.innerText.split('(')[0].replace('모드: ', '').trim());
    }
});

// 8. 이벤트 리스너 연동 (직접 붙여넣기 기능)
btnLoadPaste.addEventListener('click', () => {
    const parsed = parseRawText(textPasteArea.value);
    loadSentences(parsed, "텍스트 붙여넣기");
});

// 9. 이벤트 리스너 연동 (TXT 파일 업로드 기능)
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

// 10. 초기화 구동 시스템
function init() {
    const saved = localStorage.getItem('savedTypingData');
    if (saved) {
        practiceData = JSON.parse(saved);
        userInputEl.disabled = false;
        userInputEl.placeholder = "이어서 입력하세요.";
        nextQuestion("저장된 데이터");
    } else {
        // 최초 진입 시 기본 셋 대기
        practiceData = [...defaultData];
        currentModeEl.innerText = "모드: 텍스트 공급 필요";
    }
}

init();
