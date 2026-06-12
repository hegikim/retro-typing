// 라이브러리 초기화 설정
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';

let practiceData = [];
let currentText = "";
let currentIndexInArray = -1;

let startTime = null;
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

// 문장 정제 필터 (기호 정리)
function parseRawText(rawText) {
    if (!rawText || rawText.trim().length === 0) return [];
    let cleanText = rawText.replace(/['"‘’“”`]/g, "").replace(/\s+/g, " ");
    return cleanText.split(/[.!?\n]+/)
                    .map(s => s.trim())
                    .filter(s => s.length > 2 && s.length < 150);
}

// 새 데이터 로드 및 덮어쓰기 교체 처리
function loadSentences(sentences, modeName) {
    if (sentences.length === 0) {
        alert("가져올 수 있는 유효한 문장이 없습니다. PDF 파일에 텍스트가 올바르게 포함되어 있는지 확인해 주세요.");
        return;
    }
    
    practiceData = []; 
    practiceData = sentences;
    localStorage.setItem('savedTypingData', JSON.stringify(practiceData));
    
    userInputEl.disabled = false;
    userInputEl.placeholder = "터치하여 타이핑을 시작하세요.";
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
        currentModeEl.innerText = "모드: 연습 완료";
        targetParagraphEl.innerHTML = "단락을 모두 완료했습니다! 새로운 글이나 파일을 장착해 주세요.";
        userInputEl.disabled = true;
        userInputEl.value = "";
        return;
    }

    currentIndexInArray = Math.floor(Math.random() * practiceData.length);
    currentText = practiceData[currentIndexInArray].trim();
    
    userInputEl.value = "";
    renderTextVisuals(""); 
    currentModeEl.innerText = `모드: ${modeName} (남은 문장: ${practiceData.length}개)`;
}

function renderTextVisuals(typed) {
    let htmlOutput = "";
    const currentLength = typed.length;

    for (let i = 0; i < currentText.length; i++) {
        const char = currentText[i];

        if (i < currentLength) {
            if (typed[i] === char) {
                htmlOutput += `<span class="char-correct">${char}</span>`;
            } else {
                htmlOutput += `<span class="char-incorrect">${char === " " ? " " : char}</span>`;
            }
        } else if (i === currentLength) {
            htmlOutput += `<span class="char-current">${char}</span>`;
        } else {
            htmlOutput += `<span>${char}</span>`;
        }
    }
    targetParagraphEl.innerHTML = htmlOutput;
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

    renderTextVisuals(typed);

    if (typed.length > 0 && typed[typed.length - 1] !== currentText[typed.length - 1]) {
        totalErrors++;
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
        if (!currentModeEl.innerText.includes("공급 필요")) {
            localStorage.setItem('savedTypingData', JSON.stringify(practiceData));
        }
        nextQuestion(currentModeEl.innerText.split('(')[0].replace('모드: ', '').trim());
    }
});

btnLoadPaste.addEventListener('click', () => {
    const parsed = parseRawText(textPasteArea.value);
    loadSentences(parsed, "텍스트 붙여넣기");
});

// [비동기 PDF / TXT 통합 분기 처리기]
fileInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    currentModeEl.innerText = "파일을 읽어오는 중...";

    if (file.type === "application/pdf" || file.name.endsWith('.pdf')) {
        // PDF 처리 엔진 구동
        const reader = new FileReader();
        reader.onload = async function(event) {
            const typedarray = new Uint8Array(event.target.result);
            try {
                const pdf = await pdfjsLib.getDocument(typedarray).promise;
                let fullText = "";
                
                // 각 페이지를 순회하며 텍스트 레이어 수집
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
                alert("PDF 파일에서 텍스트를 추출하는 데 실패했습니다. 스캔된 이미지형 PDF인지 확인해 주세요.");
                init();
            }
        };
        reader.readAsArrayBuffer(file);
    } else {
        // 일반 TXT 파일 처리
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
        userInputEl.placeholder = "터치하여 타이핑을 시작하세요";
        nextQuestion("저장된 데이터");
    } else {
        practiceData = [...defaultData];
        currentModeEl.innerText = "모드: 텍스트 공급 필요";
    }
}

init();
