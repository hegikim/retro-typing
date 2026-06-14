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

// 특수기호 및 불규칙 공백 제거 (채점 및 가독성 싱크 통합 정제)
function removeSpecialChars(text) {
    // 1. 한글, 영어, 숫자, 필수 문장부호(. , ? !) 및 공백만 남김
    let filtered = text.replace(/[^ㄱ-ㅎㅏ-ㅣ가-힣a-zA-Z0-9.,?! ]/g, "");
    // 2. PDF 등에서 유입된 뒤죽박죽 연속된 공백(\s+)을 무조건 깔끔하게 딱 1칸(" ")으로 통일
    return filtered.replace(/\s+/g, " ").trim();
}

// 제목, 목차, 서식 기호 필터링
function isTitleOrTrashLine(line) {
    const trimmed = line.trim();
    if (trimmed.length <= 3) return true;
    if (/^\d+$/.test(trimmed)) return true;
    if (/^[\s#\-\*•]+/.test(trimmed) || /^\d+\s*[\.\)]/.test(trimmed)) return true;
    
    const words = trimmed.split(/\s+/);
    if (words.length <= 3) return true;
    
    return false; 
}

// 원문 텍스트 분리 정제기
function parseRawText(rawText) {
    if (!rawText || rawText.trim().length === 0) return [];
    
    return rawText.split(/[.!?\n]+/)
                  .map(s => {
                      // 쪼개진 각 문장 내의 불규칙한 다중 공백을 1칸으로 사전 압축 정돈
                      return s.replace(/\s+/g, " ").trim();
                  })
                  .filter(s => {
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
        alert("가져올 수 있는 유효한 연습 문장이 없습니다.");
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
    
    // 가져온 원문 자체를 규칙에 맞춰 공백 1칸짜리 완전체 정제 텍스트로 고정
    let rawSentence = practiceData[currentIndexInArray];
    currentText = removeSpecialChars(rawSentence);
    cleanCompareText = currentText; // 공백이 완벽히 정돈되어 둘이 일치함

    userInputEl.value = "";
    renderTextVisuals(""); 
    currentModeEl.innerText = `mode: ${modeName} (left: ${practiceData.length})`;
}

// [수정 완료] 실시간 조합 중일 때는 오타 패널티 색상을 띄우지 않고 자연스러운 흐름 유지
function renderTextVisuals(typed) {
    let htmlOutput = "";
    const currentLength = typed.length;

    for (let i = 0; i < currentText.length; i++) {
        const char = currentText[i];

        if (i < currentLength) {
            // [요청 반영] 실시간 타이핑 중 지나간 글자는 오타 여부 상관없이 무조건 깨끗한 흰색(Correct) 유지
            // 실제 맞고 틀린 정산은 엔터를 누를 때만 판정하여 상단 보드에 반영
            htmlOutput += `<span class="char-correct">${char}</span>`;
        } else if (i === currentLength) {
            // 현재 입력해야 하는 글자 위치만 포인트 색상 스위칭
            htmlOutput += `<span class="char-current">${char}</span>`;
        } else {
            // 아직 도달하지 않은 미래의 글자 구간 (차분한 회색)
            htmlOutput += `<span>${char}</span>`;
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

    // 실시간 비주얼 업데이트 (조합 버그 제어형)
    renderTextVisuals(typed);
    if (typed.length > 0) totalTyped++;

    const minutes = totalElapsedTime / 1000 / 60;
    if (minutes > 0) {
        const cpm = Math.round(totalTyped / minutes) || 0;
        cpmEl.innerText = cpm;
    }
});

// [최종 정산] 엔터를 누르는 시점에 전체 문장을 최종 대조하여 오타 개수 확정 판정
userInputEl.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        e.preventDefault();
        
        let typed = userInputEl.value; // 마지막 공백 유연성 유지를 위해 trim 제거
        let target = cleanCompareText;

        let localErrors = 0;
        const maxLength = Math.max(typed.length, target.length);
        
        // 엔터 시점 오타 대조 연산
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
        
        // 정산 피드백을 눈으로 인지할 수 있도록 일시적으로 오타 결과를 빨갛게 피드백 화면 전환
        let finalHtml = "";
        for (let i = 0; i < target.length; i++) {
            if (i < typed.length) {
                if (typed[i] === target[i]) {
                    finalHtml += `<span class="char-correct">${target[i]}</span>`;
                } else {
                    finalHtml += `<span class="char-incorrect">${target[i] === " " ? " " : target[i]}</span>`;
                }
            } else {
                finalHtml += `<span class="char-incorrect">${target[i] === " " ? " " : target[i]}</span>`;
            }
        }
        targetParagraphEl.innerHTML = finalHtml;

        // 0.25초 뒤 다음 문제로 부드럽게 스위칭
        setTimeout(() => {
            nextQuestion(currentModeEl.innerText.split('(')[0].replace('mode: ', '').trim());
        }, 250);
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
