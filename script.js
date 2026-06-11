// 1. 변수 및 데이터 저장소 초기화
let newsData = []; 
let currentText = "";
let currentLink = "";
let currentIndexInArray = -1;

let startTime = null;
let totalTyped = 0;
let totalErrors = 0;

// 2. 네트워크 지연/실패 시 즉시 전환될 비상 백업 데이터 (한영 혼합)
const backupData = [
    { title: "정확도가 속도보다 훨씬 더 중요합니다.", link: "https://news.google.com" },
    { title: "모바일 오타를 줄이기 위한 레트로 타자 연습기입니다.", link: "https://news.google.com" },
    { title: "꾸준한 연습이 완벽을 만듭니다. 천천히 입력해 보세요.", link: "https://news.google.com" },
    { title: "소음과 진동(NVH)은 차량의 품질을 결정하는 중요한 요소입니다.", link: "https://news.google.com" },
    { title: "Practice makes perfect. Take your time.", link: "https://news.google.com" },
    { title: "Slow Horses and Silo are great serialized dramas.", link: "https://news.google.com" }
];

// 3. HTML 요소 가져오기
const targetTextEl = document.getElementById('target-text');
const userInputEl = document.getElementById('user-input');
const cpmEl = document.getElementById('cpm');
const accuracyEl = document.getElementById('accuracy');
const errorsEl = document.getElementById('errors');
const currentModeEl = document.getElementById('current-mode');
const newsLinkEl = document.getElementById('news-link');

// 4. 구글 뉴스 RSS 파싱 (타임아웃 안전장치 포함)
async function fetchGoogleNews() {
    const googleNewsUrl = 'https://news.google.com/rss?hl=ko&gl=KR&ceid=KR:ko';
    const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(googleNewsUrl)}`;

    // 5초 동안 응답이 없으면 강제로 요청을 취소하는 컨트롤러 생성
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); 

    try {
        const response = await fetch(proxyUrl, { signal: controller.signal });
        clearTimeout(timeoutId); // 제한 시간 내에 응답이 오면 타이머 해제
        
        if (!response.ok) throw new Error('네트워크 응답 실패');
        const data = await response.json();
        
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(data.contents, "text/xml");
        const items = xmlDoc.getElementsByTagName('item');
        
        newsData = [];
        for (let i = 0; i < items.length; i++) {
            let title = items[i].getElementsByTagName('title')[0].textContent;
            let link = items[i].getElementsByTagName('link')[0].textContent;
            
            const dashIndex = title.lastIndexOf(' - ');
            if (dashIndex !== -1) {
                title = title.substring(0, dashIndex).trim();
            }
            
            if (title.length > 5) {
                newsData.push({ title: title, link: link });
            }
        }

        if (newsData.length === 0) throw new Error('추출된 뉴스 없음');

        // 뉴스 로드 성공 시 가이드 메시지 변경
        userInputEl.placeholder = "위 뉴스 제목을 입력하세요";
        nextQuestion();

    } catch (error) {
        console.warn('뉴스 로딩 실패 또는 시간 초과. 백업 모드로 전환합니다.', error);
        // 서버가 무응답이거나 에러 나면 즉시 백업 데이터 세트로 판을 깔아줍니다.
        newsData = [...backupData]; 
        
        userInputEl.placeholder = "백업 문장으로 연습을 시작합니다.";
        nextQuestion();
    }
}

// 5. 다음 문제 출제 로직
function nextQuestion() {
    // 입력창이 잠겨있다면 즉시 해제하여 타이핑이 가능하게 만듭니다.
    userInputEl.disabled = false;

    if (newsData.length === 0) {
        targetTextEl.innerText = "최신 뉴스를 다시 불러오는 중입니다...";
        currentModeEl.innerText = "새로고침 중";
        fetchGoogleNews();
        return;
    }

    currentIndexInArray = Math.floor(Math.random() * newsData.length);
    currentText = newsData[currentIndexInArray].title;
    currentLink = newsData[currentIndexInArray].link;
    
    targetTextEl.innerText = currentText;
    userInputEl.value = "";
    userInputEl.classList.remove('error');
    
    // 출처가 백업 데이터인지 진짜 뉴스인지에 따라 안내 문구 분기
    if (currentLink.includes("news.google.com") && newsData.length <= backupData.length) {
        currentModeEl.innerText = "모드: 기본 백업 문장 연습";
        newsLinkEl.style.display = 'none'; // 백업일 땐 링크 숨기기
    } else {
        currentModeEl.innerText = `남은 실시간 뉴스: ${newsData.length}개`;
        newsLinkEl.href = currentLink;
        newsLinkEl.style.display = 'inline-block';
    }
}

// 6. 입력 감지 및 통계 연산 로직
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
        newsData.splice(currentIndexInArray, 1);
        nextQuestion();
    }
});

// 첫 기동 시 비상 데이터로 즉시 입력창을 열어두고 뉴스를 가져옵니다.
currentText = "뉴스를 받아오는 동안 기본 문장으로 먼저 연습을 시작하세요!";
targetTextEl.innerText = currentText;
userInputEl.disabled = false;
userInputEl.placeholder = "여기에 바로 입력하시면 시작됩니다.";
currentModeEl.innerText = "서버 연결 시도 중...";

// 백그라운드에서 뉴스 수신 시작
fetchGoogleNews();
