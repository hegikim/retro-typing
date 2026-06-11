// 1. 연습용 데이터베이스 (한글 90%, 영문 10% 비율 고려)

const words = [
    "레트로", "타자", "연습", "모바일", "키보드", "오타", "교정", "정확도", "개발", "코딩",
    "풍동 시험", "공력 소음", "주파수 분석", "서스펜션", "데이터", "클라우드", "단축어", "자동화",
    "keyboard", "retro", "typing", "apple", "genesis", "Crimson"
];

const shortTexts = [
    "모바일 오타를 줄이기 위한 레트로 타자 연습기입니다.",
    "정확도가 속도보다 훨씬 더 중요합니다.",
    "꾸준한 연습이 완벽을 만듭니다.",
    "차량의 소음과 진동을 분석하여 품질을 높입니다.",
    "단축어를 활용하면 업무 효율이 크게 올라갑니다.",
    "느린 말들이 모여서 거대한 이야기를 완성합니다.",
    "Practice makes perfect.",
    "Slow Horses and Silo are great shows."
];

const longTexts = [
    "타자 연습은 단순히 속도를 높이는 것뿐만 아니라, 오타를 줄이고 정확하게 문장을 입력하는 습관을 기르는 데 큰 도움이 됩니다. 특히 모바일 환경에서는 화면이 작아 오타가 발생하기 쉽기 때문에 꾸준한 교정 연습이 필요합니다.",
    "소음과 진동(NVH)은 기계의 감성 품질을 결정짓는 매우 중요한 요소입니다. 주행 중 발생하는 풍절음이나 노면 소음을 최소화하기 위해 풍동 시험장과 무향실에서 끊임없는 테스트와 주파수 분석을 진행하게 됩니다.",
    "To improve your typing speed and accuracy on a mobile device, you need to focus on hitting the right keys without rushing. Take your time and build muscle memory."
];

// 2. 변수 초기화
let currentText = "";
let startTime = null;
let totalTyped = 0;
let totalErrors = 0;

// 3. HTML 요소 가져오기
const targetTextEl = document.getElementById('target-text');
const userInputEl = document.getElementById('user-input');
const cpmEl = document.getElementById('cpm');
const accuracyEl = document.getElementById('accuracy');
const errorsEl = document.getElementById('errors');
const currentModeEl = document.getElementById('current-mode');

// 4. 5:3:2 비율로 랜덤 텍스트 선택 로직
function getRandomText() {
    const rand = Math.random(); // 0.0 ~ 1.0 사이의 난수 생성
    let selectedArray;

    if (rand < 0.5) {
        // 50% 확률: 낱말
        selectedArray = words;
        currentModeEl.innerText = "모드: 낱말 연습";
    } else if (rand < 0.8) {
        // 30% 확률: 짧은 글 (0.5 ~ 0.79)
        selectedArray = shortTexts;
        currentModeEl.innerText = "모드: 짧은 글 연습";
    } else {
        // 20% 확률: 긴 글 (0.8 ~ 1.0)
        selectedArray = longTexts;
        currentModeEl.innerText = "모드: 긴 글 연습";
    }

    const randomIndex = Math.floor(Math.random() * selectedArray.length);
    return selectedArray[randomIndex];
}

// 5. 다음 문제 준비 및 화면 갱신
function nextQuestion() {
    currentText = getRandomText();
    targetTextEl.innerText = currentText;
    userInputEl.value = "";
    userInputEl.classList.remove('error'); // 오타 시각 효과 초기화
}

// 6. 타이핑 이벤트 감지 및 통계 계산 로직
userInputEl.addEventListener('input', () => {
    // 첫 타자를 칠 때 시간 측정 시작
    if (!startTime) {
        startTime = new Date(); 
    }

    const typed = userInputEl.value;
    const currentTarget = currentText.substring(0, typed.length);

    // 오타 검사 (입력한 부분까지 원본과 비교)
    if (typed !== currentTarget) {
        userInputEl.classList.add('error');
        totalErrors++;
    } else {
        userInputEl.classList.remove('error');
    }

    totalTyped++;

    // CPM(분당 타수) 및 정확도 계산
    const timeElapsed = (new Date() - startTime) / 1000 / 60; // 경과 시간(분)
    const cpm = Math.round((totalTyped / timeElapsed)) || 0;
    let accuracy = Math.round(((totalTyped - totalErrors) / totalTyped) * 100) || 100;
    if (accuracy < 0) accuracy = 0; // 정확도가 마이너스로 떨어지지 않게 방어

    // 화면에 실시간 점수 반영
    cpmEl.innerText = cpm;
    accuracyEl.innerText = accuracy;
    errorsEl.innerText = totalErrors;

    // 현재 문장을 끝까지 오타 없이 다 쳤을 경우 다음 문제로 이동
    if (typed === currentText) {
        nextQuestion();
    }
});

// 앱 시작 시 첫 문제 로드
nextQuestion();
