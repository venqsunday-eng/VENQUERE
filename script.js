// ===============================
// VENQUERE CHAT - FULL SCRIPT
// ===============================


const chatContent = document.querySelector(".chat-content");
const chatInput = document.getElementById("chatInput");
const sendButton = document.getElementById("sendButton");
const voiceButton = document.getElementById("voiceButton");
const extraButton = document.getElementById("extraButton");

const plusButton = document.getElementById("plusButton");
const attachmentMenu = document.getElementById("attachmentMenu");
const attachmentPreview = document.getElementById("attachmentPreview");

// File inputs
const photoInput = document.getElementById("photoInput");
const videoInput = document.getElementById("videoInput");
const audioInput = document.getElementById("audioInput");
const documentInput = document.getElementById("documentInput");
const cameraInput = document.getElementById("cameraInput");

const photoButton = document.getElementById("photoButton");
const videoButton = document.getElementById("videoButton");
const audioButton = document.getElementById("audioButton");
const documentButton = document.getElementById("documentButton");
const linkButton = document.getElementById("linkButton");
const cameraButton = document.getElementById("cameraButton");
const locationButton = document.getElementById("locationButton");

// ===============================
// STORAGE
// ===============================

const MESSAGE_STORAGE = "venquere_chat_messages_v2";

let messages = [];

try {
    messages = JSON.parse(
        localStorage.getItem(MESSAGE_STORAGE) || "[]"
    );
} catch {
    messages = [];
}

// ===============================
// MESSAGE ID
// ===============================

function createMessageId() {
    if (window.crypto && crypto.randomUUID) {
        return crypto.randomUUID();
    }

    return Date.now().toString() + Math.random().toString(16).slice(2);
}

// ===============================
// SAVE MESSAGES
// ===============================

function saveMessages() {
    localStorage.setItem(
        MESSAGE_STORAGE,
        JSON.stringify(messages)
    );
}

// ===============================
// MESSAGE TIME
// ===============================

function getTime() {
    return new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit"
    });
}

// ===============================
// DISPLAY MESSAGE
// ===============================

function displayMessage(message) {
    const chatContent = document.querySelector(".chat-content");
    if (!chatContent) return;

    const messageBox = document.createElement("div");

    messageBox.className = "message me saved-message";
    messageBox.dataset.id = message.id;

    messageBox.innerHTML = `
        <div class="message-main">
            <div class="message-text">
                ${escapeHTML(message.text || "").replace(/\n/g, "<br>")}
            </div>

            <div class="message-attachments"></div>

            <div class="message-time">
                ${message.time}
            </div>
        </div>

        <button
            type="button"
            class="message-more"
            title="Options">
            ⋮
        </button>
    `;

    if (message.starred) {
        messageBox.classList.add("starred");
    }

    if (message.pinned) {
        messageBox.classList.add("pinned");
    }

    chatContent.appendChild(messageBox);

    createMessageActions(messageBox, message);

    // Onyesha picha/video zilizotumwa
    if (message.attachments && message.attachments.length > 0) {
        const attachmentsBox =
            messageBox.querySelector(".message-attachments");

        message.attachments.forEach(id => {
            showSentAttachment(id, attachmentsBox);
        });
    }

    chatContent.scrollTop = chatContent.scrollHeight;
}

// ===============================
// ESCAPE HTML
// ===============================

function escapeHTML(text) {

    const div = document.createElement("div");

    div.textContent = text;

    return div.innerHTML;
}

// ===============================
// LOAD MESSAGES
// ===============================

function loadMessages() {

    const chatContent =
        document.querySelector(".chat-content");

    if (!chatContent) return;

    document
        .querySelectorAll(".saved-message")
        .forEach(el => el.remove());

    messages.forEach(message => {
        displayMessage(message);
    });
}

// ===============================
// SEND MESSAGE
// ===============================

// ===============================
// SEND MESSAGE
// ===============================

function sendMessage(text) {

    text = text.trim();

    // =========================
    // SEND PENDING VOICE
    // =========================

    if (pendingVoice) {

        const voiceToSend = pendingVoice;

        pendingVoice = null;

        const transcript =
            text || voiceToSend.transcript || "";

        saveVoiceMessage(
            voiceToSend.audioBlob,
            transcript
        );

        if (attachmentPreview) {

            attachmentPreview
                .querySelectorAll(".voice-preview-item")
                .forEach(item => item.remove());

        }

        chatInput.value = "";

        chatInput.focus();

        return;
    }

    // =========================
    // SEND ATTACHMENTS
    // =========================

    const attachmentIds = [];

    if (attachmentPreview) {

        attachmentPreview
            .querySelectorAll(".attachment-item")
            .forEach(item => {

                if (
                    item.dataset.id &&
                    !item.classList.contains("voice-preview-item")
                ) {

                    attachmentIds.push(
                        item.dataset.id
                    );

                }

            });

    }

    // =========================
    // NOTHING TO SEND
    // =========================

    if (
        !text &&
        attachmentIds.length === 0
    ) {
        return;
    }

    // =========================
    // CREATE MESSAGE
    // =========================

    const message = {

        id: createMessageId(),

        text: text,

        attachments: attachmentIds,

        time: getTime(),

        createdAt:
            new Date().toISOString(),

        starred: false,

        pinned: false

    };

    messages.push(message);

    saveMessages();

    displayMessage(message);

    chatInput.value = "";

    if (attachmentPreview) {
        attachmentPreview.innerHTML = "";
    }

    chatInput.focus();

}
// ===============================
// SEND BUTTON
// ===============================

if (sendButton) {

    sendButton.addEventListener("click", () => {

        sendMessage(chatInput.value);

    });
}

// ===============================
// ENTER TO SEND
// ===============================
document.addEventListener("keydown", event => {

    if (event.key === "Enter" && !event.shiftKey) {

        const hasText =
            chatInput &&
            chatInput.value.trim() !== "";

        const hasAttachment =
            attachmentPreview &&
            attachmentPreview.querySelector(".attachment-item");

        if (!hasText && !hasAttachment) return;

        event.preventDefault();

        sendMessage(
            chatInput ? chatInput.value : ""
        );
    }

});

// ===============================
// MESSAGE OPTIONS
// ===============================

function createMessageActions(messageBox, message) {

    const moreButton =
        messageBox.querySelector(".message-more");

    moreButton.addEventListener("click", event => {

        event.stopPropagation();

        closeAllMessageMenus();

        const menu =
            document.createElement("div");

        menu.className = "message-menu";

        menu.innerHTML = `

            <button data-action="delete">
                🗑️ Delete
            </button>

            <button data-action="copy">
                📋 Copy
            </button>

            <button data-action="reply">
                ↩️ Reply
            </button>

            <button data-action="star">
                ${message.starred ? "⭐ Unstar" : "⭐ Star"}
            </button>

            <button data-action="pin">
                ${message.pinned ? "📌 Unpin" : "📌 Pin"}
            </button>

            <button data-action="info">
                ℹ️ Info
            </button>

        `;

        messageBox.appendChild(menu);

        menu
            .querySelectorAll("button")
            .forEach(button => {

                button.addEventListener(
                    "click",
                    event => {

                        event.stopPropagation();

                        const action =
                            button.dataset.action;

                        handleMessageAction(
                            action,
                            message,
                            messageBox,
                            menu
                        );
                    }
                );

            });

    });
}

// ===============================
// HANDLE MESSAGE ACTION
// ===============================

function handleMessageAction(
    action,
    message,
    messageBox,
    menu
) {

    if (action === "delete") {

        const confirmDelete =
            confirm(
                "Unataka kufuta message hii?"
            );

        if (!confirmDelete) return;

        messages =
            messages.filter(
                item => item.id !== message.id
            );

        saveMessages();

        messageBox.remove();

        return;
    }

    if (action === "copy") {

        navigator.clipboard
            .writeText(message.text)
            .then(() => {

                alert("Message ime-copywa ✅");

            })
            .catch(() => {

                alert(
                    "Copy haikuweza kufanyika."
                );

            });

        menu.remove();

        return;
    }

    if (action === "reply") {

        chatInput.value =
            `↩️ ${message.text}`;

        chatInput.focus();

        menu.remove();

        return;
    }

    if (action === "star") {

        message.starred =
            !message.starred;

        saveMessages();

        messageBox.classList.toggle(
            "starred",
            message.starred
        );

        menu.remove();

        return;
    }

    if (action === "pin") {

        message.pinned =
            !message.pinned;

        saveMessages();

        messageBox.classList.toggle(
            "pinned",
            message.pinned
        );

        menu.remove();

        return;
    }

    if (action === "info") {

        alert(
            "Message info\n\n" +
            "Time: " +
            message.time +
            "\n\n" +
            "Sent: " +
            new Date(
                message.createdAt
            ).toLocaleString()
        );

        menu.remove();

        return;
    }
}

// ===============================
// CLOSE MESSAGE MENUS
// ===============================

function closeAllMessageMenus() {

    document
        .querySelectorAll(".message-menu")
        .forEach(menu => menu.remove());
}

document.addEventListener("click", () => {

    closeAllMessageMenus();

    const emojiPicker =
        document.querySelector(".emoji-picker");

    if (emojiPicker) {
        emojiPicker.remove();
    }

});

// ===============================
// ATTACHMENT MENU
// ===============================

if (plusButton) {

    plusButton.addEventListener("click", event => {

        event.stopPropagation();

        attachmentMenu.classList.toggle(
            "show"
        );

    });
}

// ===============================
// OPEN FILE INPUTS
// ===============================

if (photoButton) {
    photoButton.onclick = () =>
        photoInput.click();
}

if (videoButton) {
    videoButton.onclick = () =>
        videoInput.click();
}

if (audioButton) {
    audioButton.onclick = () =>
        audioInput.click();
}

if (documentButton) {
    documentButton.onclick = () =>
        documentInput.click();
}

if (cameraButton) {
    cameraButton.onclick = () =>
        cameraInput.click();
}

// ===============================
// INDEXED DB
// ===============================

let db;

const DB_NAME = "VENQUERE_CHAT";
const DB_VERSION = 1;
const STORE_NAME = "attachments";

const request =
    indexedDB.open(
        DB_NAME,
        DB_VERSION
    );

request.onupgradeneeded = event => {

    db = event.target.result;

    if (!db.objectStoreNames.contains(STORE_NAME)) {

        db.createObjectStore(
            STORE_NAME,
            {
                keyPath: "id"
            }
        );
    }
};

request.onsuccess = event => {

    db = event.target.result;

    loadAttachments();
};

request.onerror = () => {

    console.log(
        "IndexedDB haikufunguka."
    );

};

// ===============================
// SAVE ATTACHMENT
// ===============================

function saveAttachment(file) {

    if (!db) return;

    const attachment = {

        id: createMessageId(),

        name: file.name,

        type: file.type,

        size: file.size,

        blob: file,

        createdAt:
            new Date().toISOString()

    };

    const transaction =
        db.transaction(
            STORE_NAME,
            "readwrite"
        );

    transaction
        .objectStore(STORE_NAME)
        .put(attachment);

    transaction.oncomplete = () => {

        createAttachmentPreview(
            attachment
        );

    };
}

// ===============================
// LOAD ATTACHMENTS
// ===============================

function loadAttachments() {

    if (!db) return;

    const transaction =
        db.transaction(
            STORE_NAME,
            "readonly"
        );

    const store =
        transaction.objectStore(
            STORE_NAME
        );

    const request =
        store.getAll();

    request.onsuccess = () => {

        attachmentPreview.innerHTML = "";

        request.result.forEach(
            attachment => {

                createAttachmentPreview(
                    attachment
                );

            }
        );
    };
}

// ===============================
// ATTACHMENT PREVIEW
// ===============================

function createAttachmentPreview(
    attachment
) {

    if (!attachmentPreview) return;

    const item =
        document.createElement("div");

    item.className =
        "attachment-item";

    item.dataset.id =
        attachment.id;

    const url =
        URL.createObjectURL(
            attachment.blob
        );

    if (
        attachment.type &&
        attachment.type.startsWith("image/")
    ) {

        item.innerHTML = `

            <div class="attachment-thumbnail">
                <img src="${url}">
            </div>

            <button
                type="button"
                class="attachment-delete">
                ×
            </button>

        `;

    } else if (
        attachment.type &&
        attachment.type.startsWith("video/")
    ) {

        item.innerHTML = `

            <div class="attachment-thumbnail">
                <video
                    src="${url}"
                    muted>
                </video>
            </div>

            <button
                type="button"
                class="attachment-delete">
                ×
            </button>

        `;

    } else if (
        attachment.type &&
        attachment.type.startsWith("audio/")
    ) {

        item.innerHTML = `

            <div class="attachment-icon">
                🎵
            </div>

            <div class="attachment-name">
                ${escapeHTML(attachment.name)}
            </div>

            <button
                type="button"
                class="attachment-delete">
                ×
            </button>

        `;

    } else {

        item.innerHTML = `

            <div class="attachment-icon">
                📄
            </div>

            <div class="attachment-name">
                ${escapeHTML(attachment.name)}
            </div>

            <button
                type="button"
                class="attachment-delete">
                ×
            </button>

        `;
    }

    attachmentPreview.appendChild(item);

    const deleteButton =
        item.querySelector(
            ".attachment-delete"
        );

    deleteButton.addEventListener(
        "click",
        () => {

            deleteAttachment(
                attachment.id,
                item
            );

        }
    );
}

// SHOW SENT ATTACHMENT
function showSentAttachment(id, container) {
    if (!db || !container) return;

    const transaction = db.transaction(
        STORE_NAME,
        "readonly"
    );

    const store = transaction.objectStore(
        STORE_NAME
    );

    const request = store.get(id);

    request.onsuccess = () => {
        const attachment = request.result;

        if (!attachment) return;

        const url = URL.createObjectURL(
            attachment.blob
        );

        const item =
            document.createElement("div");

        item.className = "sent-attachment";

        if (
            attachment.type &&
            attachment.type.startsWith("image/")
        ) {
            item.innerHTML = `
                <img
                    src="${url}"
                    class="sent-image"
                >
            `;
        } else if (
            attachment.type &&
            attachment.type.startsWith("video/")
        ) {
            item.innerHTML = `
                <video
                    src="${url}"
                    class="sent-video"
                    controls>
                </video>
            `;
        } else {
            item.innerHTML = `
                <div class="sent-file">
                    📄 ${escapeHTML(attachment.name)}
                </div>
            `;
        }

        container.appendChild(item);
    };
}

// ===============================
// DELETE ATTACHMENT
// ===============================

function deleteAttachment(
    id,
    element
) {

    if (!db) return;

    const transaction =
        db.transaction(
            STORE_NAME,
            "readwrite"
        );

    transaction
        .objectStore(STORE_NAME)
        .delete(id);

    transaction.oncomplete = () => {

        element.remove();

    };
}

// ===============================
// FILE INPUT HANDLERS
// ===============================

function setupFileInput(input) {

    if (!input) return;

    input.addEventListener(
        "change",
        () => {

            if (
                input.files &&
                input.files.length > 0
            ) {

                Array.from(
                    input.files
                ).forEach(file => {

                    saveAttachment(file);

                });
            }

            input.value = "";

            attachmentMenu.classList.remove(
                "show"
            );

        }
    );
}

setupFileInput(photoInput);
setupFileInput(videoInput);
setupFileInput(audioInput);
setupFileInput(documentInput);
setupFileInput(cameraInput);

// ===============================
// LINK
// ===============================

if (linkButton) {

    linkButton.addEventListener(
        "click",
        () => {

            const link =
                prompt(
                    "Weka link hapa:"
                );

            if (!link) return;

            chatInput.value +=
                (chatInput.value ? " " : "") +
                link;

            chatInput.focus();

            attachmentMenu.classList.remove(
                "show"
            );

        }
    );
}

// ===============================
// LOCATION
// ===============================

if (locationButton) {

    locationButton.addEventListener(
        "click",
        () => {

            if (!navigator.geolocation) {

                alert(
                    "Browser yako hai-support location."
                );

                return;
            }

            navigator.geolocation.getCurrentPosition(
                position => {

                    const lat =
                        position.coords.latitude;

                    const lon =
                        position.coords.longitude;

                    const locationText =
                        `📍 Location: ${lat}, ${lon}`;

                    chatInput.value =
                        locationText;

                    chatInput.focus();

                },
                () => {

                    alert(
                        "Imeshindikana kupata location."
                    );

                }
            );

            attachmentMenu.classList.remove(
                "show"
            );

        }
    );
}



// ===============================
// VOICE RECORDING + TRANSCRIPTION
// ===============================

let mediaRecorder = null;
let audioChunks = [];
let recording = false;
let recordingStream = null;
let pendingVoice = null;

let recognition = null;
let voiceLanguage = "auto";
const voiceLanguages = {
    auto: "🌍 Auto Detect",
    "sw-KE": "🇰🇪 Kiswahili",
    "en-US": "🇺🇸 English",
    "en-GB": "🇬🇧 English (UK)",
    "fr-FR": "🇫🇷 Français",
    "es-ES": "🇪🇸 Español",
    "de-DE": "🇩🇪 Deutsch",
    "it-IT": "🇮🇹 Italiano",
    "pt-PT": "🇵🇹 Português",
    "ar-SA": "🇸🇦 العربية",
    "hi-IN": "🇮🇳 हिन्दी",
    "ur-PK": "🇵🇰 اردو",
    "zh-CN": "🇨🇳 中文",
    "zh-TW": "🇹🇼 中文 (繁體)",
    "ja-JP": "🇯🇵 日本語",
    "ko-KR": "🇰🇷 한국어",
    "ru-RU": "🇷🇺 Русский",
    "tr-TR": "🇹🇷 Türkçe",
    "nl-NL": "🇳🇱 Nederlands",
    "pl-PL": "🇵🇱 Polski",
    "uk-UA": "🇺🇦 Українська",
    "el-GR": "🇬🇷 Ελληνικά",
    "he-IL": "🇮🇱 עברית",
    "fa-IR": "🇮🇷 فارسی",
    "bn-BD": "🇧🇩 বাংলা",
    "ta-IN": "🇮🇳 தமிழ்",
    "te-IN": "🇮🇳 తెలుగు",
    "th-TH": "🇹🇭 ไทย",
    "vi-VN": "🇻🇳 Tiếng Việt",
    "id-ID": "🇮🇩 Bahasa Indonesia",
    "ms-MY": "🇲🇾 Bahasa Melayu",
    "fil-PH": "🇵🇭 Filipino",
    "am-ET": "🇪🇹 Amharic",
    "ha-NG": "🇳🇬 Hausa",
    "yo-NG": "🇳🇬 Yoruba",
    "ig-NG": "🇳🇬 Igbo",
    "zu-ZA": "🇿🇦 isiZulu",
    "xh-ZA": "🇿🇦 isiXhosa",
    "af-ZA": "🇿🇦 Afrikaans",
    "sv-SE": "🇸🇪 Svenska",
    "da-DK": "🇩🇰 Dansk",
    "no-NO": "🇳🇴 Norsk",
    "fi-FI": "🇫🇮 Suomi",
    "cs-CZ": "🇨🇿 Čeština",
    "sk-SK": "🇸🇰 Slovenčina",
    "hu-HU": "🇭🇺 Magyar",
    "ro-RO": "🇷🇴 Română",
    "bg-BG": "🇧🇬 Български",
    "hr-HR": "🇭🇷 Hrvatski",
    "sr-RS": "🇷🇸 Српски",
    "sl-SI": "🇸🇮 Slovenščina",
    "ne-NP": "🇳🇵 नेपाली",
    "si-LK": "🇱🇰 සිංහල",
    "ml-IN": "🇮🇳 മലയാളം",
    "kn-IN": "🇮🇳 ಕನ್ನಡ",
    "gu-IN": "🇮🇳 ગુજરાતી",
    "mr-IN": "🇮🇳 मराठी",
    "pa-IN": "🇮🇳 ਪੰਜਾਬੀ"
};
let finalTranscript = "";
let interimTranscript = "";

const VOICE_STORAGE = "venquere_saved_voice_messages";

let savedVoices = [];

try {
    savedVoices = JSON.parse(
        localStorage.getItem(VOICE_STORAGE) || "[]"
    );
} catch {
    savedVoices = [];
}

// ===============================
// SPEECH RECOGNITION
// ===============================

const SpeechRecognition =
    window.SpeechRecognition ||
    window.webkitSpeechRecognition;

if (SpeechRecognition) {

   recognition = new SpeechRecognition();

recognition.lang =
    voiceLanguage === "auto"
        ? "sw-KE"
        : voiceLanguage;

recognition.continuous = true;

recognition.onresult = function (event) {

    let transcript = "";

    for (let i = 0; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
    }

    transcript = transcript.trim();

    if (chatInput) {
        chatInput.value = transcript;

        // Fanya browser itambue kuwa value imebadilika
        chatInput.dispatchEvent(
            new Event("input", { bubbles: true })
        );
    }

    console.log("Speech:", transcript);
};

    recognition.onend = function () {

        if (recording) {

            try {
                recognition.start();
            } catch (error) {
                console.log(error);
            }
        }
    };

}

// ===============================
// SAVE VOICE
// ===============================

function saveVoiceMessage(audioBlob, transcript) {

    const reader = new FileReader();

    reader.onload = function () {

        const voiceMessage = {

            id: createMessageId(),

            audio: reader.result,

            transcript: transcript,

            time: getTime(),

            createdAt:
                new Date().toISOString()
        };

        savedVoices.push(voiceMessage);

        localStorage.setItem(
            VOICE_STORAGE,
            JSON.stringify(savedVoices)
        );

        displayVoiceMessage(
            voiceMessage
        );
    };

    reader.readAsDataURL(audioBlob);
}

function showPendingVoicePreview() {

    if (!attachmentPreview || !pendingVoice) return;

    // Ondoa preview ya voice iliyopita
    attachmentPreview
        .querySelectorAll(".voice-preview-item")
        .forEach(item => item.remove());

    const item = document.createElement("div");

    item.className =
        "attachment-item voice-preview-item";

    const url = URL.createObjectURL(
        pendingVoice.audioBlob
    );

    item.innerHTML = `
        <div class="voice-preview-audio">
            <audio
                src="${url}"
                controls>
            </audio>
        </div>

        <button
            type="button"
            class="attachment-delete">
            ×
        </button>
    `;

    attachmentPreview.appendChild(item);

    item.querySelector(
        ".attachment-delete"
    ).addEventListener(
        "click",
        () => {

            pendingVoice = null;

            item.remove();

            if (chatInput) {
                chatInput.value = "";
            }
        }
    );
}

// ===============================
// DISPLAY SAVED VOICE
// ===============================

function displayVoiceMessage(voiceMessage) {

    if (!chatContent) return;

    const recordingMessage =
        document.createElement("div");

    recordingMessage.className =
        "recording-message saved-voice";

    recordingMessage.dataset.id =
        voiceMessage.id;

    const audio =
        document.createElement("audio");

    audio.className =
        "recorded-audio";

    audio.controls = true;

    audio.src =
        voiceMessage.audio;

    recordingMessage.appendChild(audio);

    if (voiceMessage.transcript) {

        const transcriptBox =
            document.createElement("div");

        transcriptBox.className =
            "recording-text";

        transcriptBox.textContent =
            voiceMessage.transcript;

        recordingMessage.appendChild(
            transcriptBox
        );
    }

    const deleteButton =
        document.createElement("button");

    deleteButton.className =
        "voice-delete";

    deleteButton.type = "button";

    deleteButton.textContent = "🗑️";

    recordingMessage.appendChild(
        deleteButton
    );

    chatContent.appendChild(
        recordingMessage
    );

    chatContent.scrollTop =
        chatContent.scrollHeight;

    deleteButton.addEventListener(
        "click",
        function () {

            savedVoices =
                savedVoices.filter(
                    voice =>
                        voice.id !==
                        voiceMessage.id
                );

            localStorage.setItem(
                VOICE_STORAGE,
                JSON.stringify(savedVoices)
            );

            recordingMessage.remove();
        }
    );
}

// ===============================
// LOAD VOICES AFTER REFRESH
// ===============================

function loadVoiceMessages() {

    if (!chatContent) return;

    document
        .querySelectorAll(".saved-voice")
        .forEach(
            element => element.remove()
        );

    savedVoices.forEach(
        voiceMessage => {

            displayVoiceMessage(
                voiceMessage
            );
        }
    );
}

// ===============================
// START / STOP VOICE
// ===============================

// VOICE LANGUAGE SELECTOR
const voiceLanguageSelect = document.createElement("select");

voiceLanguageSelect.id = "voiceLanguageSelect";
voiceLanguageSelect.title = "Chagua lugha ya voice";

Object.entries(voiceLanguages).forEach(([code, name]) => {
    const option = document.createElement("option");
    option.value = code;
    option.textContent = name;
    voiceLanguageSelect.appendChild(option);
});

voiceLanguageSelect.value = "auto";

voiceLanguageSelect.addEventListener("change", function () {
    voiceLanguage = this.value;

    if (recognition) {
        recognition.lang =
            voiceLanguage === "auto"
                ? "sw-KE"
                : voiceLanguage;
    }
});
voiceButton.parentElement.insertBefore(
    voiceLanguageSelect,
    voiceButton
);
if (voiceButton) {

    voiceButton.addEventListener(
        "click",
        async function () {

            // =========================
            // STOP RECORDING
            // =========================

            if (recording) {

                recording = false;

                if (mediaRecorder) {
                    mediaRecorder.stop();
                }

                if (recognition) {

                    try {
                        recognition.stop();
                    } catch (error) {
                        console.log(error);
                    }
                }

                voiceButton.classList.remove(
                    "recording"
                );

                voiceButton.textContent =
                    "🎙️";

                return;
            }

            // =========================
            // START RECORDING
            // =========================

            try {

                recordingStream =
                    await navigator.mediaDevices
                        .getUserMedia({
                            audio: true
                        });

                audioChunks = [];

                mediaRecorder =
                    new MediaRecorder(
                        recordingStream
                    );

                mediaRecorder.ondataavailable =
                    function (event) {

                        if (
                            event.data.size > 0
                        ) {

                            audioChunks.push(
                                event.data
                            );
                        }
                    };

               mediaRecorder.onstop =
    function () {

        const audioBlob =
            new Blob(
                audioChunks,
                {
                    type: "audio/webm"
                }
            );

        const transcript =
            chatInput
                ? chatInput.value.trim()
                : "";

        pendingVoice = {
            audioBlob: audioBlob,
            transcript: transcript
        };

        showPendingVoicePreview();

        if (recordingStream) {

            recordingStream
                .getTracks()
                .forEach(
                    track => track.stop()
                );

            recordingStream = null;
        }

        finalTranscript = "";
        interimTranscript = "";
    };

                if (recognition) {

                    try {
                        recognition.start();
                    } catch (error) {
                        console.log(error);
                    }
                }

                voiceButton.classList.add(
                    "recording"
                );

                voiceButton.textContent =
                    "⏹️";

            } catch (error) {

                console.error(
                    "Microphone error:",
                    error
                );

                alert(
                    "Ruhusu microphone ili kurecord sauti."
                );
            }
        }
    );
}

// ===============================
// LOAD VOICES
// ===============================

loadVoiceMessages();


// ===============================
// EMOJI DATA
// ===============================

const emojiCategories = {
"🏴": [
    "ke","rw","ug","tz","bi","ss","et","so",
    "ng","gh","za","eg","in","cn","jp","kr",
    "fr","de","it","es","gb","us","ca","br",
    "au","at","be","ch","nl","pt","se","no",
    "dk","fi","ie","pl","ua","tr","ru","gr",
    "il","sa","ae","qa","pk","bd","np","lk",
    "th","vn","id","my","ph","sg","nz","mx",
    "ar","cl","co","pe","uy","ve","jm","cu"
],


    "😀": [
        "😀","😃","😄","😁","😆","😅","😂","🤣",
        "😊","😇","🙂","🙃","😉","😌","😍","🥰",
        "😘","😗","😙","😚","😋","😛","😝","😜",
        "🤪","🤨","🧐","🤓","😎","🤩","🥳","😏",
        "😒","😞","😔","😟","😕","🙁","☹️","😣",
        "😖","😫","😩","🥺","😢","😭","😤","😠",
        "😡","🤬","🤯","😳","🥵","🥶","😱","😨",
        "😰","😥","😓","🤗","🤔","🫣","🤭","🫢"
    ],

    "👋": [
        "👋","🤚","🖐️","✋","🖖","👌","🤏","✌️",
        "🤞","🤟","🤘","🤙","👈","👉","👆","👇",
        "☝️","👍","👎","✊","👊","🤛","🤜","👏",
        "🙌","👐","🤲","🙏","💪","🫶","🫰","🤝",
        "👀","👂","👃","🧠","👄","💋","👶","🧒"
    ],

    "🐶": [
        "🐶","🐱","🐭","🐹","🐰","🦊","🐻","🐼",
        "🐨","🐯","🦁","🐮","🐷","🐸","🐵","🙈",
        "🙉","🙊","🐔","🐧","🐦","🐤","🦆","🦅",
        "🦉","🐺","🐗","🐴","🦄","🐝","🐛","🦋",
        "🐌","🐞","🐜","🪲","🐢","🐍","🦎","🦖",
        "🐙","🦀","🐠","🐟","🐬","🐳","🐋","🦈"
    ],

    "🍔": [
        "🍏","🍎","🍐","🍊","🍋","🍌","🍉","🍇",
        "🍓","🫐","🍒","🍑","🥭","🍍","🥥","🥝",
        "🍅","🥑","🍆","🥔","🥕","🌽","🌶️","🥒",
        "🍔","🍟","🍕","🌭","🌮","🌯","🥪","🍿",
        "🍩","🍪","🎂","🍰","🧁","🍫","🍬","🍭",
        "☕","🍵","🥤","🧃","🍹","🍺","🍷","🍽️"
    ],

    "⚽": [
        "⚽","🏀","🏈","⚾","🥎","🎾","🏐","🏉",
        "🥏","🎱","🏓","🏸","🏒","🏑","🥍","🏏",
        "⛳","🏹","🎣","🥊","🥋","🎽","🛹","🛼",
        "🏆","🥇","🥈","🥉","🏅","🎖️","🎮","🎯",
        "🎲","🧩","🎨","🎭","🎬","🎤","🎧","🎼"
    ],

    "🚗": [
        "🚗","🚕","🚙","🚌","🚎","🏎️","🚓","🚑",
        "🚒","🚐","🛻","🚚","🚛","🚜","🛵","🏍️",
        "🚲","✈️","🚁","🚀","🛸","🚢","⛵","🚤",
        "🏠","🏢","🏥","🏦","🏫","🏨","🗼","🗽",
        "🌍","🌎","🌏","🏖️","🏝️","⛰️","🏕️","🌋"
    ],

    "💡": [
        "💡","🔦","🕯️","📱","💻","⌨️","🖥️","🖨️",
        "📷","📹","🎥","📺","📻","☎️","📞","📟",
        "🔋","🔌","💾","💿","📀","📎","📌","📍",
        "✂️","🔑","🔒","🔓","🔨","🔧","⚙️","🧰",
        "📚","📖","📝","✏️","📅","📁","📂","🗂️"
    ],

    "🔣": [
        "❤️","🧡","💛","💚","💙","💜","🖤","🤍",
        "🤎","💔","❣️","💕","💞","💓","💗","💖",
        "💘","💝","💟","☮️","✝️","☪️","🕉️","☯️",
        "☢️","☣️","⚠️","❗","❓","‼️","⁉️","⭕",
        "❌","✅","➕","➖","✖️","➗","💯","♻️"
    ],

   

};

// ===============================
// EMOJI PICKER
// ===============================

function createEmojiPicker() {

    const existing = document.querySelector(".emoji-picker");

    if (existing) {
        existing.remove();
        return;
    }

    const picker = document.createElement("div");

    picker.className = "emoji-picker";

    // Position mapema ili isionekane chini ya page
    picker.style.position = "fixed";
    picker.style.zIndex = "10000";
    picker.style.width = "300px";
    picker.style.maxHeight = "330px";
    picker.style.background = "white";
    picker.style.borderRadius = "16px";
    picker.style.boxShadow = "0 10px 35px rgba(0,0,0,.25)";
    picker.style.padding = "8px";
    picker.style.overflow = "hidden";

    picker.innerHTML = `

        <div class="emoji-tabs">

            ${Object.keys(emojiCategories)
                .map(
                    key => `
                    <button
                        type="button"
                        data-category="${key}">
                        ${key}
                    </button>
                `
                )
                .join("")}

        </div>

        <div class="emoji-grid"></div>
    `;

    const rect = extraButton.getBoundingClientRect();

    picker.style.bottom =
        `${window.innerHeight - rect.top + 10}px`;

    picker.style.left =
        `${Math.max(10, rect.left - 250)}px`;

    document.body.appendChild(picker);

    const grid = picker.querySelector(".emoji-grid");

    function showCategory(category) {

        grid.innerHTML = "";

        // FLAG CATEGORY
        if (category === "🏴") {

            emojiCategories[category].forEach(countryCode => {

                const button = document.createElement("button");

                button.type = "button";
                button.title = countryCode.toUpperCase();

                const flag = document.createElement("img");

                flag.src =
                    `https://flagcdn.com/w80/${countryCode}.png`;

                flag.alt = "";

                flag.style.width = "32px";
                flag.style.height = "22px";
                flag.style.objectFit = "cover";
                flag.style.borderRadius = "3px";
                flag.style.display = "block";

                button.appendChild(flag);

                button.addEventListener("click", event => {

                    event.stopPropagation();

                    insertEmoji(
                        countryCode
                    );

                });

                grid.appendChild(button);

            });

            return;
        }

        // NORMAL EMOJIS
        emojiCategories[category].forEach(emoji => {

            const button = document.createElement("button");

            button.type = "button";

            button.textContent = emoji;

            button.addEventListener("click", event => {

                event.stopPropagation();

                insertEmoji(emoji);

            });

            grid.appendChild(button);

        });
    }

    picker
        .querySelectorAll(".emoji-tabs button")
        .forEach(button => {

            button.addEventListener("click", event => {

                event.stopPropagation();

                showCategory(
                    button.dataset.category
                );

            });

        });

    showCategory("😀");
}

// ===============================
// INSERT EMOJI
// ===============================

function insertEmoji(emoji) {

    const start =
        chatInput.selectionStart;

    const end =
        chatInput.selectionEnd;

    const text =
        chatInput.value;

    chatInput.value =
        text.slice(0, start) +
        emoji +
        text.slice(end);

    chatInput.focus();

    const newPosition =
        start + emoji.length;

    chatInput.setSelectionRange(
        newPosition,
        newPosition
    );
}

// ===============================
// EMOJI BUTTON
// ===============================

if (extraButton) {

    extraButton.addEventListener(
        "click",
        event => {

            event.stopPropagation();

            createEmojiPicker();

        }
    );
}

// ===============================
// DYNAMIC STYLES
// ===============================

const dynamicStyle =
    document.createElement("style");

dynamicStyle.textContent = `

.message {
    position: relative;
    display: flex;
    align-items: flex-start;
    gap: 8px;
    max-width: 75%;
    margin: 10px 0;
    padding: 10px 38px 10px 12px;
    border-radius: 14px;
}

.message-main {
    min-width: 0;
}

.message-text {
    word-break: break-word;
    overflow-wrap: anywhere;
}

.message-time {
    font-size: 10px;
    opacity: .65;
    margin-top: 4px;
}

.message-more {
    position: absolute;
    right: 5px;
    top: 5px;
    width: 28px;
    height: 28px;
    border: none;
    background: transparent;
    cursor: pointer;
    font-size: 20px;
    line-height: 1;
    border-radius: 50%;
}

.message-more:hover {
    background: rgba(0,0,0,.08);
}

.message-menu {
    position: absolute;
    right: 5px;
    top: 38px;
    z-index: 9999;
    width: 160px;
    background: white;
    border-radius: 12px;
    padding: 6px;
    box-shadow: 0 8px 25px rgba(0,0,0,.2);
}

.message-menu button {
    width: 100%;
    border: none;
    background: transparent;
    padding: 9px 10px;
    text-align: left;
    cursor: pointer;
    border-radius: 8px;
    font-size: 14px;
}

.message-menu button:hover {
    background: #f1ecff;
}

.message.starred {
    box-shadow: 0 0 0 2px rgba(255,193,7,.45);
}

.message.pinned::after {
    content: "📌";
    position: absolute;
    right: 7px;
    bottom: -8px;
    font-size: 13px;
}

.emoji-picker {
    z-index: 10000;
    width: 300px;
    max-height: 330px;
    background: white;
    border-radius: 16px;
    box-shadow: 0 10px 35px rgba(0,0,0,.25);
    padding: 8px;
    overflow: hidden;
}

.emoji-tabs {
    display: flex;
    gap: 3px;
    overflow-x: auto;
    padding-bottom: 7px;
}

.emoji-tabs button {
    flex: 0 0 auto;
    border: none;
    background: #f2f2f2;
    border-radius: 8px;
    padding: 7px;
    cursor: pointer;
    font-size: 18px;
}

.emoji-tabs button:hover {
    background: #e6dcff;
}

.emoji-grid {
    display: grid;
    grid-template-columns: repeat(8, 1fr);
    gap: 3px;
    max-height: 260px;
    overflow-y: auto;
}

.emoji-grid button {
    border: none;
    background: transparent;
    cursor: pointer;
    font-size: 22px;
    padding: 5px;
    border-radius: 7px;
}

.emoji-grid button:hover {
    background: #f0eaff;
}

.attachment-thumbnail {
    width: 52px;
    height: 52px;
    border-radius: 9px;
    overflow: hidden;
    flex-shrink: 0;
}

.attachment-thumbnail img,
.attachment-thumbnail video {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
}

.attachment-item {
    position: relative;
    width: 52px;
    min-width: 52px;
    height: 52px;
    display: flex;
    align-items: center;
    justify-content: center;
}

.attachment-icon {
    width: 52px;
    height: 52px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 25px;
    background: #f1ecff;
    border-radius: 9px;
}

.attachment-name {
    display: none;
}

.attachment-delete {
    position: absolute;
    right: -6px;
    top: -6px;
    width: 20px;
    height: 20px;
    border: none;
    border-radius: 50%;
    background: #e53935;
    color: white;
    cursor: pointer;
    font-size: 14px;
    line-height: 20px;
    padding: 0;
}

.composer-voice.recording {
    animation: voicePulse 1s infinite;
}

@keyframes voicePulse {
    50% {
        transform: scale(1.12);
    }
}

`;

document.head.appendChild(
    dynamicStyle
);

// ===============================
// START
// ===============================

loadMessages();

const sentAttachmentStyle = document.createElement("style");

sentAttachmentStyle.textContent = `
.sent-attachment {
    margin-top: 8px;
}

.sent-image,
.sent-video {
    width: 180px;
    max-width: 100%;
    max-height: 220px;
    object-fit: cover;
    border-radius: 10px;
    display: block;
}

.sent-file {
    padding: 8px 10px;
    background: #f1ecff;
    border-radius: 8px;
    font-size: 13px;
}
`;

document.head.appendChild(sentAttachmentStyle);