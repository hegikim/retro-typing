pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';

let practiceData = [];
let currentText = "";
let cleanCompareText = "";
let currentIndexInArray = -1;

// [스마트 타이머 변수 구조]
let totalElapsedTime = 0;   // 순수하게 타이핑에 사용된 총 누적 시간 (밀리초)
let lastTapTime = null;      // 마지막으로 자판을 누른 시점
let timerActive = false;     // 현재 타이머 카운팅 상태 여부

let totalTyped = 0;
let totalErrors = 0;

const targetParagraphEl = document.getElementById('target-paragraph');
const userInputEl = document.getElementById('user-input');
const textPasteArea = document.getElementById('text-paste-area');
const btnLoadPaste = document.getElementById('btn-load-paste');
const fileInput = document.getElementById('file-input');
const cpmEl = document.getElementById('cpm');
const accuracyEl = document.getElementById('accuracy');
const errorsEl = document.getElementById('errors');
const currentModeEl = document.getElementById('current-mode');

const defaultData = [
    "정확도가 속도보다 훨씬 더 중요합니다. 천천히 정확하게 입력하는 연습을 하세요.",
    "모바일 오타를 줄이기 위한 나만의 맞춤형 레트로 타자 연습기 공간입니다.",
    "소음과 진동(NVH)은 차량이나 기계 시스템의 감성 품질을 결정짓는 핵심 요소입니다."
];

userInputEl.addEventListener('focus', () => {
    setTimeout(() => {
        userInputEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 300);
});

function removeSpecialChars(text) {
    return text.replace(/[^ㄱ-ㅎㅏ-ㅣ가-힣a-zA-Z ]/g, "").replace(/\s+/g, " ");
}

function parseRawText(rawText) {
    if (!rawText || rawText.trim().length === 0) return [];
    return rawText.split(/[.!?\n]+/)
                  .map(s => s.trim())
                  .filter(s => s.length > 2 && s.length < 150);
}

// 스마트 타이머 누적 시스템 정산기
function updateCPMTimer() {
    if (!timerActive || !lastTapTime) return;

    const now = new Date();
    const diff = now - lastTapTime;

    // 마지막 입력 후 4초가 지나면 유저가 자리를 비운 것으로 간주 (자동 일시정지)
    if (diff > 4000) {
        timerActive = false;
        lastTapTime = null;
        return;
    }

    // 4초 이내의 정상 흐름일 때는 경과 시간을 실시간으로 누적 수집
    totalElapsedTime += diff;
    lastTapTime = now;

    // 분 단위 변환 후 실시간 CPM 표기
    const minutes = totalElapsedTime / 1000 / 60;
    if (minutes > 0) {
        const cpm = Math.round(totalTyped / minutes) || 0;
        cpmEl.innerText = cpm;
    }
}

// 실시간 주기적 타이머 보정 주기 가동 (0.2초마다 유저 자리비움 모니터링)
setInterval(updateCPMTimer, 200);

function loadSentences(sentences, modeName) {
    if (sentences.length === 0) {
        alert("가져올 수 있는 문장이 없습니다.");
        return;
    }
    
    practiceData = []; 
    practiceData = sentences;
    localStorage.setItem('savedTypingData', JSON.stringify(practiceData));
    
    userInputEl.disabled = false;
    userInputEl.placeholder = "타이핑 후 Enter를 누르면 다음 문장으로 갑니다.";
    textPasteArea.value = ""; 
    
    // 타이머 및 통계값 완전 리셋
    totalElapsedTime = 0;
    lastTapTime = null;
    timerActive = false;
    totalTyped = 0;
    totalErrors = 0;
    cpmEl.innerText = "0";
    accuracyEl.innerText = "100";
    errorsEl.innerText = "0";

    nextQuestion(modeName);
}

function nextQuestion(modeName = "user data") {
    if (practiceData.length === 0) {
        practiceData = [...defaultData];
        localStorage.removeItem('savedTypingData');
        currentModeEl.innerText = "mode: clear";
        targetParagraphEl.innerHTML = "모든 문장을 완료했습니다! 새로운 글이나 파일을 장착해 주세요.";
        userInputEl.disabled = true;
        userInputEl.value = "";
        return;
    }

    currentIndexInArray = Math.floor(Math.random() * practiceData.length);
    currentText = practiceData[currentIndexInArray].trim();
    cleanCompareText = removeSpecialChars(currentText).trim();

    userInputEl.value = "";
    renderTextVisuals(""); 
    currentModeEl.innerText = `mode: ${modeName} (left: ${practiceData.length})`;
}

function renderTextVisuals(typed) {
    let htmlOutput = "";
    let typedIdx = 0;

    for (let i = 0; i < currentText.length; i++) {
        const char = currentText[i];
        const isSpecial = /[^ㄱ-ㅎㅏ-ㅣ가-힣a-zA-Z ]/.test(char);

        if (isSpecial) {
            htmlOutput += `<span class="char-correct">${char}</span>`;
        } else {
            if (typedIdx < typed.length) {
                if (typed[typedIdx] === char) {
                    htmlOutput += `<span class="char-correct">${char}</span>`;
                } else {
                    htmlOutput += `<span class="char-incorrect">${char === " " ? " " : char}</span>`;
                }
                typedIdx++;
            } else if (typedIdx === typed.length) {
                htmlOutput += `<span class="char-current">${char}</span>`;
                typedIdx++;
            } else {
                htmlOutput += `<span>${char}</span>`;
            }
        }
    }
    targetParagraphEl.innerHTML = htmlOutput;
}

userInputEl.addEventListener('input', () => {
    let typed = userInputEl.value;

    if (typed === " " && !cleanCompareText.startsWith(" ")) {
        userInputEl.value = "";
        return;
    }

    // [타이머 엔진 트리거 인터셉트]
    const now = new Date();
    if (!timerActive) {
        // 일시정지 상태였거나 첫 자를 치는 순간 타이머 세션 오픈
        lastTapTime = now;
        timerActive = true;
    } else {
        // 타이머가 돌고 있다면 이전 타건과 현재 타건 사이의 간격을 밀리초 단위로 수집
        const diff = now - lastTapTime;
        if (diff < 4000) {
            totalElapsedTime += diff;
        }
        lastTapTime = now;
    }

    renderTextVisuals(typed);
    if (typed.length > 0) totalTyped++;

    // 실시간 cpm 즉시 정산 반영
    const minutes = totalElapsedTime / 1000 / 60;
    if (minutes > 0) {
        const cpm = Math.round(totalTyped / minutes) || 0;
        cpmEl.innerText = cpm;
    }
});

userInputEl.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        e.preventDefault();
        
        let typed = userInputEl.value.trim();
        let target = cleanCompareText;

        let localErrors = 0;
        const maxLength = Math.max(typed.length, target.length);
        
        for (let i = 0; i < maxLength; i++) {
            if (typed[i] !== target[i]) {
                localErrors++;
            }
        }

        totalErrors += localErrors;

        let accuracy = Math.round(((totalTyped - totalErrors) / totalTyped) * 100) || 100;
        if (accuracy < 0) accuracy = 0;
        
        accuracyEl.innerText = accuracy;
        errorsEl.innerText = totalErrors;

        // 엔터를 쳤으므로 현재 문장의 일시적인 타이머 세션 오프
        timerActive = false;
        lastTapTime = null;

        practiceData.splice(currentIndexInArray, 1);
        if (!currentModeEl.innerText.includes("공급 필요")) {
            localStorage.setItem('savedTypingData', JSON.stringify(practiceData));
        }
        
        setTimeout(() => {
            nextQuestion(currentModeEl.innerText.split('(')[0].replace('mode: ', '').trim());
        }, 100);
    }
});

btnLoadPaste.addEventListener('click', () => {
    const parsed = parseRawText(textPasteArea.value);
    loadSentences(parsed, "paste");
});

fileInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    currentModeEl.innerText = "reading file...";

    if (file.type === "application/pdf" || file.name.endsWith('.pdf')) {
        const reader = new FileReader();
        reader.onload = async function(event) {
            const typedarray = new Uint8Array(event.target.result);
            try {
                const pdf = await pdfjsLib.getDocument(typedarray).promise;
                let fullText = "";
                for (let i = 1; i <= pdf.numPages; i++) {
                    const page = await pdf.getPage(i);
                    const textContent = await page.getTextContent();
                    const pageText = textContent.items.map(item => item.str).join(" ");
                    fullText += pageText + "\n";
                }
                const parsed = parseRawText(fullText);
                loadSentences(parsed, file.name.replace('.pdf', ''));
            } catch (error) {
                console.error(error);
                alert("PDF 텍스트 추출 실패");
                init();
            }
        };
        reader.readAsArrayBuffer(file);
    } else {
        const reader = new FileReader();
        reader.onload = function(event) {
            const parsed = parseRawText(event.target.result);
            loadSentences(parsed, file.name.replace('.txt', ''));
        };
        reader.readAsText(file, "UTF-8");
    }
});

function init() {
    const saved = localStorage.getItem('savedTypingData');
    if (saved) {
        practiceData = JSON.parse(saved);
        userInputEl.disabled = false;
        userInputEl.placeholder = "터치하여 타이핑을 시작하세요.";
        nextQuestion("saved data");
    } else {
        practiceData = [...defaultData];
        currentModeEl.innerText = "mode: need text";
    }
}

init();
