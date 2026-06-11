// 1. 데이터 저장소 및 기본 문장 세트 (금고가 비었을 때를 위한 기본 데이터)
let practiceData = [];

const defaultData = [
    "정확도가 속도보다 훨씬 더 중요합니다. 천천히 정확하게 입력하세요.",
    "모바일 오타를 줄이기 위한 나만의 레트로 타자 연습기입니다.",
    "꾸준한 연습이 완벽을 만듭니다. 지루하더라도 매일 조금씩 연습해 보세요.",
    "소음과 진동(NVH)은 기계의 감성 품질을 결정짓는 매우 중요한 요소입니다.",
    "Practice makes perfect. Take your time and build muscle memory.",
    "Slow Horses and Silo are great serialized thriller dramas."
];

let currentText = "";
let currentIndexInArray = -1;

let startTime = null;
let totalTyped = 0;
let totalErrors = 0;

// 2. HTML 요소 가져오기
const targetTextEl = document.getElementById('target-text');
const userInputEl = document.getElementById('user-input');
const cpmEl = document.getElementById('cpm');
const accuracyEl = document.getElementById('accuracy');
const errorsEl = document.getElementById('errors');
const currentModeEl = document.getElementById('current-mode');

// 3. 텍스트 데이터를 문장 단위로 깔끔하게 쪼개주는 전처리 함수
function splitIntoSentences(text) {
    // 뉴스 특유의 꼬리표 정보 및 불필요한 공백 제거
    let cleanText = text.replace(/\[.*?\]|\(.*?\)/g, "").trim();
    
    // 마침표(.), 물음표(?), 느낌표(!), 혹은 줄바꿈(\n) 기준으로 문장 분리
    return cleanText.split(/[.!?\n]+/)
                    .map(s => s.trim())
                    .filter(s => s.length > 6 && s.length < 120); // 너무 짧거나 너무 긴 문장 필터링
}

// 4. 아이폰 단축어 데이터 수신 및 로컬스토리지 금고 제어 엔진
function initDatabase() {
    const urlParams = new URLSearchParams(window.location.search);
    const sharedText = urlParams.get('text'); // 주소창 뒤의 ?text= 내용 낚아채기

    if (sharedText) {
        // [케이스 1] 단축어를 통해 새로운 뉴스 텍스트가 유입된 경우
        const newSentences = splitIntoSentences(decodeURIComponent(sharedText));
        
        if (newSentences.length > 0) {
            practiceData = newSentences;
            // 브라우저 내부 금고에 영구 저장 (문자열 형태로 변환하여 저장)
            localStorage.setItem('savedNewsData', JSON.stringify(practiceData));
            
            // 주소창의 지저분한 파라미터를 깔끔하게 밀어버려 재접속 시 중복 방지
            window.history.replaceState({}, document.title, window.location.pathname);
            alert(`📰 새로운 뉴스 문장 ${practiceData.length}개가 장착되었습니다!`);
        }
    } else {
        // [케이스 2] 그냥 평소처럼 접속한 경우 -> 브라우저 금고를 열어봄
        const savedData = localStorage.getItem('savedNewsData');
        if (savedData) {
            practiceData = JSON.parse(savedData);
        } else {
            // [케이스 3] 금고가 완전히 비어있는 최초 실행 시 -> 기본 세트 장착
            practiceData = [...defaultData];
        }
    }

    nextQuestion();
}

// 5. 다음 문제 출제 (무한 루프 보장)
function nextQuestion() {
    // 만약 공유된 뉴스를 다 쳤다면, 아까 저장해둔 기본 데이터 세트로 자동 복구하여 끊김 방지
    if (practiceData.length === 0) {
        practiceData = [...defaultData];
        localStorage.removeItem('savedNewsData'); // 비워진 금고 초기화
        alert("공유된 뉴스를 모두 완료하여 기본 문장 모드로 전환합니다.");
    }

    currentIndexInArray = Math.floor(Math.random() * practiceData.length);
    currentText = practiceData[currentIndexInArray];
    
    targetTextEl.innerText = currentText;
    userInputEl.value = "";
    userInputEl.classList.remove('error');
    
    // 하단 상태 표시줄 업데이트
    const isDefault = defaultData.includes(currentText);
    currentModeEl.innerText = isDefault ? `모드: 기본 문장 연습` : `남은 공유 뉴스 문장: ${practiceData.length}개`;
}

// 6. 타이핑 입력 감지 및 점수 연산
userInputEl.addEventListener('input', () => {
    if (!startTime) {
        startTime = new Date(); 
    }

    const typed = userInputEl.value;
    const currentTarget = currentText.substring(0, typed.length);

    if (typed !== currentTarget) {
        userInputEl.classList.add('error');
        totalErrors++;
    } else {
        userInputEl.classList.remove('error');
    }

    totalTyped++;

    const timeElapsed = (new Date() - startTime) / 1000 / 60;
    const cpm = Math.round((totalTyped / timeElapsed)) || 0;
    let accuracy = Math.round(((totalTyped - totalErrors) / totalTyped) * 100) || 100;
    if (accuracy < 0) accuracy = 0;

    cpmEl.innerText = cpm;
    accuracyEl.innerText = accuracy;
    errorsEl.innerText = totalErrors;

    if (typed === currentText) {
        practiceData.splice(currentIndexInArray, 1); // 친 문장 삭제
        
        // 뉴스가 남아있다면 수시로 금고 상태 최신화
        const isDefault = defaultData.includes(currentText);
        if (!isDefault) {
            localStorage.setItem('savedNewsData', JSON.stringify(practiceData));
        }
        
        nextQuestion();
    }
});

// 시스템 가동
initDatabase();
