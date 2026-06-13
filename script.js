pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';

let practiceData = [];
let currentText = "";
let cleanCompareText = "";
let currentIndexInArray = -1;

let totalElapsedTime = 0;   
let lastTapTime = null;      
let timerActive = false;     

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

// [변경됨] 마침표, 쉼표, 물음표, 느낌표(. , ? !)는 지우지 않고 채점용 텍스트에 그대로 남겨둠
function removeSpecialChars(text) {
    // 한글, 영어, 공백 및 . , ? ! 를 제외한머지 특수기호만 제거
    return text.replace(/[^ㄱ-ㅎㅏ-ㅣ가-힣a-zA-Z0-9.,?! ]/g, "").replace(/\s+/g, " ");
}

// [신규] 제목, 목차, 서식 기호가 가득한 무의미한 줄을 걸러내는 필터링 함수
function isTitleOrTrashLine(line) {
    const trimmed = line.trim();
    
    // 1. 공백이거나 너무 짧은 라인 패스
    if (trimmed.length <= 3) return true;
    
    // 2. 숫자로만 채워진 라인 패스 (페이지 번호 등)
    if (/^\d+$/.test(trimmed)) return true;
    
    // 3. 마크다운 서식이나 리스트 기호로 시작하는 제목 스타일 패스 (### , - , 1. )
    if (/^[\s#\-\*•]+/.test(trimmed) || /^\d+\s*[\.\)]/.test(trimmed)) return true;
    
    // 4. 띄어쓰기로 분리했을 때 단어 수가 3개 이하인 경우 제목으로 판단하고 패스
    const words = trimmed.split(/\s+/);
    if (words.length <= 3) return true;
    
    return false; // 통과 (정상 문장)
}

// 텍스트 분리 및 제목 필터 탑재
function parseRawText(rawText) {
    if (!rawText || rawText.trim().length === 0) return [];
    
    // 줄바꿈 또는 문장 구별 부호로 쪼갠 뒤 정제 구문 통과
    return rawText.split(/[.!?\n]+/)
                  .map(s => s.trim())
                  .filter(s => {
                      // 기존 글자수 제한 조건 + 새로 만든 제목 필터링 조건 대조
                      return s.length > 5 && s.length < 150 && !isTitleOrTrashLine(s);
                  });
}

function updateCPMTimer() {
    if (!timerActive || !lastTapTime) return;

    const now = new Date();
    const diff = now - lastTapTime;

    if (diff > 4000) {
        timerActive = false;
        lastTapTime = null;
        return;
    }

    totalElapsedTime += diff;
    lastTapTime = now;

    const minutes = totalElapsedTime / 1000 / 60;
    if (minutes > 0) {
        const cpm = Math.round(totalTyped / minutes) || 0;
        cpmEl.innerText = cpm;
    }
}

setInterval(updateCPMTimer, 200);

function loadSentences(sentences, modeName) {
    if (sentences.length === 0) {
        alert("가져올 수 있는 유효한 연습 문장이 없습니다. 제목이나 서식을 제외한 본문 위주로 유입시켜 주세요.");
        return;
    }
    
    practiceData = []; 
    practiceData = sentences;
    localStorage.setItem('savedTypingData', JSON.stringify(practiceData));
    
    userInputEl.disabled = false;
    userInputEl.placeholder = "타이핑 후 Enter를 누르면 정산됩니다.";
    textPasteArea.value = ""; 
    
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
        targetParagraphEl.innerHTML = "모든 본문 문장을 완료했습니다! 새로운 문서 데이터를 불러와 주세요.";
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

// [변경됨] 채점용 정제 문자 세트(cleanCompareText)의 기준에 맞춰 4종 문장부호 채점 하이라이트 매칭
function renderTextVisuals(typed) {
    let htmlOutput = "";
    let typedIdx = 0;

    for (let i = 0; i < currentText.length; i++) {
        const char = currentText[i];
        
        // . , ? ! 는 제외하고 나머지 불필요한 괄호, 쌍따옴표 등만 자동 통과시킴
        const isSpecial = /[^ㄱ-ㅎㅏ-ㅣ가-힣a-zA-Z0-9.,?! ]/.test(char);

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

    const now = new Date();
    if (!timerActive) {
        lastTapTime = now;
        timerActive = true;
    } else {
        const diff = now - lastTapTime;
        if (diff < 4000) {
            totalElapsedTime += diff;
        }
        lastTapTime = now;
    }

    renderTextVisuals(typed);
    if (typed.length > 0) totalTyped++;

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
