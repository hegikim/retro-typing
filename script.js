pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';

let practiceData = [];
let currentText = "";
let cleanCompareText = "";
let currentIndexInArray = -1;

let startTime = null;
let totalTyped = 0;
let totalErrors = 0;

// [고성능 사운드 시스템] 무지연 주파수 오디오 컨텍스트 엔진 초기화
let audioCtx = null;
let isSoundOn = true;

const targetParagraphEl = document.getElementById('target-paragraph');
const userInputEl = document.getElementById('user-input');
const textPasteArea = document.getElementById('text-paste-area');
const btnLoadPaste = document.getElementById('btn-load-paste');
const fileInput = document.getElementById('file-input');
const cpmEl = document.getElementById('cpm');
const accuracyEl = document.getElementById('accuracy');
const errorsEl = document.getElementById('errors');
const currentModeEl = document.getElementById('current-mode');
const btnSoundToggle = document.getElementById('btn-sound-toggle');

const defaultData = [
    "정확도가 속도보다 훨씬 더 중요합니다. 천천히 정확하게 입력하는 연습을 하세요.",
    "모바일 오타를 줄이기 위한 나만의 맞춤형 레트로 타자 연습기 공간입니다.",
    "소음과 진동(NVH)은 차량이나 기계 시스템의 감성 품질을 결정짓는 핵심 요소입니다."
];

// 기계식 키보드 청축/갈축 사운드를 실시간 전자 파형으로 합성하는 함수 (렉 발생 차단)
function playClickSound() {
    if (!isSoundOn) return;
    
    try {
        if (!audioCtx) {
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        }
        
        // 연타 시 소리가 겹치도록 독립 노드 실시간 생성
        const osc = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        
        osc.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        
        // 기계식 키보드 특유의 틱 스타일 주파수 믹싱
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(120, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(40, audioCtx.currentTime + 0.08);
        
        // 아주 짧고 가볍게 툭 치고 빠지는 볼륨 제어
        gainNode.gain.setValueAtTime(0.15, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.08);
        
        osc.start();
        osc.stop(audioCtx.currentTime + 0.08);
    } catch (e) {
        console.warn("오디오 엔진 구동 실패:", e);
    }
}

// 사운드 토글 관리 버튼 이벤트
btnSoundToggle.addEventListener('click', () => {
    isSoundOn = !isSoundOn;
    btnSoundToggle.innerText = isSoundOn ? "🔊 sound on" : "🔇 sound off";
    userInputEl.focus();
});

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
    
    startTime = null;
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

    // 소리 지연 없는 엔진 발사
    playClickSound();

    if (!startTime && typed.length > 0) {
        startTime = new Date(); 
    }

    renderTextVisuals(typed);
    if (typed.length > 0) totalTyped++;

    if (startTime) {
        const timeElapsed = (new Date() - startTime) / 1000 / 60;
        const cpm = Math.round((totalTyped / timeElapsed)) || 0;
        cpmEl.innerText = cpm;
    }
});

// 엔터 입력 시 정산 및 무조건 다음 강제 전환
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
