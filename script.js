// 1. 변수 및 데이터 저장소 초기화
let newsTitles = [];
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

// 3. 구글 뉴스 RSS 실시간 파싱 및 프록시 우회 로직
async function fetchGoogleNews() {
    // 구글 뉴스 토픽 RSS 주소 (주요 뉴스)
    const googleNewsUrl = 'https://news.google.com/rss?hl=ko&gl=KR&ceid=KR:ko';
    // CORS 에러 우회를 위한 무료 프록시 서버
    const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(googleNewsUrl)}`;

    try {
        const response = await fetch(proxyUrl);
        if (!response.ok) throw new Error('네트워크 응답 실패');
        
        const data = await response.json();
        
        // XML 문자열을 DOM 객체로 파싱
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(data.contents, "text/xml");
        const items = xmlDoc.getElementsByTagName('item');
        
        newsTitles = [];
        for (let i = 0; i < items.length; i++) {
            let title = items[i].getElementsByTagName('title')[0].textContent;
            
            // 뉴스 제목 끝에 붙는 언론사 이름(예: - 연합뉴스) 잘라내기 기법
            const dashIndex = title.lastIndexOf(' - ');
            if (dashIndex !== -1) {
                title = title.substring(0, dashIndex).trim();
            }
            
            // 너무 짧거나 특수문자만 있는 제목 방어 코드
            if (title.length > 5) {
                newsTitles.push(title);
            }
        }

        if (newsTitles.length === 0) throw new Error('추출된 뉴스 없음');

        // 로딩 성공 후 입력창 활성화
        userInputEl.disabled = false;
        userInputEl.placeholder = "위 뉴스 제목을 입력하세요";
        nextQuestion();

    } catch (error) {
        console.error('뉴스 로드 실패:', error);
        targetTextEl.innerText = "뉴스를 불러오지 못했습니다. 백업 데이터로 시작합니다.";
        // 오프라인 상태 대비용 비상 데이터 체계
        newsTitles = [
            "실시간 구글 뉴스를 불러오는 중에 통신 오류가 발생했습니다.",
            "인터넷 연결 상태를 확인하시거나 새로고침을 눌러보세요.",
            "정확한 타자 연습과 모바일 오타 교정을 진행해 보세요."
        ];
        userInputEl.disabled = false;
        userInputEl.placeholder = "입력창 활성화됨";
        nextQuestion();
    }
}

// 4. 뉴스 리스트에서 랜덤하게 한 문장 추출 (중복 제거)
function nextQuestion() {
    // 모든 뉴스를 한 번씩 다 친 경우 다시 구글 뉴스 서버 최신화
    if (newsTitles.length === 0) {
        userInputEl.disabled = true;
        targetTextEl.innerText = "최신 뉴스를 다시 업데이트하고 있습니다...";
        currentModeEl.innerText = "새로고침 중";
        fetchGoogleNews();
        return;
    }

    currentIndexInArray = Math.floor(Math.random() * newsTitles.length);
    currentText = newsTitles[currentIndexInArray];
    
    targetTextEl.innerText = currentText;
    userInputEl.value = "";
    userInputEl.classList.remove('error');
    currentModeEl.innerText = `남은 뉴스 개수: ${newsTitles.length}개`;
}

// 5. 입력 감지 및 통계 연산 로직
userInputEl.addEventListener('input', () => {
    if (!startTime) {
        startTime = new Date(); 
    }

    const typed = userInputEl.value;
    const currentTarget = currentText.substring(0, typed.length);

    // 실시간 오타 색상 피드백
    if (typed !== currentTarget) {
        userInputEl.classList.add('error');
        totalErrors++;
    } else {
        userInputEl.classList.remove('error');
    }

    totalTyped++;

    // 분당 타수(CPM) 및 정확도 연산
    const timeElapsed = (new Date() - startTime) / 1000 / 60;
    const cpm = Math.round((totalTyped / timeElapsed)) || 0;
    let accuracy = Math.round(((totalTyped - totalErrors) / totalTyped) * 100) || 100;
    if (accuracy < 0) accuracy = 0;

    cpmEl.innerText = cpm;
    accuracyEl.innerText = accuracy;
    errorsEl.innerText = totalErrors;

    // 완벽하게 다 입력하면 배열에서 지우고 다음 뉴스로 바꿈
    if (typed === currentText) {
        newsTitles.splice(currentIndexInArray, 1); // 소진된 뉴스 제거
        nextQuestion();
    }
});

// 시스템 기동
fetchGoogleNews();
