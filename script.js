// 1. 변수 및 데이터 저장소 초기화 (객체 배열로 변경)
let newsData = []; 
let currentText = "";
let currentLink = "";
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
const newsLinkEl = document.getElementById('news-link'); // 링크 엘리먼트 추가

// 3. 구글 뉴스 RSS 실시간 파싱 및 프록시 우회 로직
async function fetchGoogleNews() {
    const googleNewsUrl = 'https://news.google.com/rss?hl=ko&gl=KR&ceid=KR:ko';
    const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(googleNewsUrl)}`;

    try {
        const response = await fetch(proxyUrl);
        if (!response.ok) throw new Error('네트워크 응답 실패');
        
        const data = await response.json();
        
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(data.contents, "text/xml");
        const items = xmlDoc.getElementsByTagName('item');
        
        newsData = []; // 초기화
        for (let i = 0; i < items.length; i++) {
            let title = items[i].getElementsByTagName('title')[0].textContent;
            let link = items[i].getElementsByTagName('link')[0].textContent; // 뉴스 기사 링크 추출
            
            // 뉴스 제목 끝에 붙는 언론사 이름 잘라내기
            const dashIndex = title.lastIndexOf(' - ');
            if (dashIndex !== -1) {
                title = title.substring(0, dashIndex).trim();
            }
            
            if (title.length > 5) {
                // 제목과 링크를 하나의 쌍으로 저장
                newsData.push({ title: title, link: link });
            }
        }

        if (newsData.length === 0) throw new Error('추출된 뉴스 없음');

        userInputEl.disabled = false;
        userInputEl.placeholder = "위 뉴스 제목을 입력하세요";
        nextQuestion();

    } catch (error) {
        console.error('뉴스 로드 실패:', error);
        targetTextEl.innerText = "뉴스를 불러오지 못했습니다. 백업 데이터로 시작합니다.";
        newsData = [
            { title: "실시간 구글 뉴스를 불러오는 중에 통신 오류가 발생했습니다.", link: "https://news.google.com" },
            { title: "인터넷 연결 상태를 확인하시거나 새로고침을 눌러보세요.", link: "https://news.google.com" },
            { title: "정확한 타자 연습과 모바일 오타 교정을 진행해 보세요.", link: "https://news.google.com" }
        ];
        userInputEl.disabled = false;
        userInputEl.placeholder = "입력창 활성화됨";
        nextQuestion();
    }
}

// 4. 뉴스 리스트에서 랜덤하게 한 문장 추출
function nextQuestion() {
    if (newsData.length === 0) {
        userInputEl.disabled = true;
        newsLinkEl.style.display = 'none'; // 링크 숨기기
        targetTextEl.innerText = "최신 뉴스를 다시 업데이트하고 있습니다...";
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
    
    // 하단 정보 업데이트
    currentModeEl.innerText = `남은 실시간 뉴스: ${newsData.length}개`;
    
    // 구글 뉴스 출처 링크 활성화 및 주소 매핑
    newsLinkEl.href = currentLink;
    newsLinkEl.style.display = 'inline-block'; 
}

// 5. 입력 감지 및 통계 연산 로직
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
        newsData.splice(currentIndexInArray, 1); // 소진된 뉴스 제거
        nextQuestion();
    }
});

// 시스템 기동
fetchGoogleNews();
