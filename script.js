// ===============================
// VENQUERE CHAT - FULL SCRIPT
// ===============================

const chatContent = document.querySelector(".chat-content");
const chatInput = document.getElementById("chatInput");
const sendButton = document.getElementById("sendButton");
const voiceButton = document.getElementById("voiceButton");
const extraButton = document.getElementById("extraButton");
const plusButton = document.getElementById("plusButton");
const attachmentPreview = document.getElementById("attachmentPreview");

const MESSAGE_STORAGE = "venquere_chat_messages_v2";
const VOICE_STORAGE = "venquere_saved_voice_messages";

let messages = JSON.parse(localStorage.getItem(MESSAGE_STORAGE)) || [];
let pendingVoice = null;
let recording = false;
let mediaRecorder = null;
let voiceChunks = [];
let recognition = null;

let db;

// ===============================
// INDEXED DB
// ===============================

const request = indexedDB.open("VENQUERE_CHAT", 1);

request.onupgradeneeded = function (event) {
    db = event.target.result;

    if (!db.objectStoreNames.contains("attachments")) {
        db.createObjectStore("attachments", {
            keyPath: "id"
        });
    }
};

request.onsuccess = function (event) {
    db = event.target.result;
    loadMessages();
    loadVoiceMessages();
};

request.onerror = function () {
    console.log("IndexedDB error");
};

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
// LOAD MESSAGES
// ===============================

function loadMessages() {
    if (!chatContent) return;

    chatContent.innerHTML = "";

    messages.forEach(function (message) {
        displayMessage(message);
    });
}

// ===============================
// DISPLAY MESSAGE
// ===============================

function displayMessage(message) {
    if (!chatContent) return;

    const wrapper = document.createElement("div");
    wrapper.className = "message-wrapper";

    const messageDiv = document.createElement("div");
    messageDiv.className = "message";

    if (message.starred) {
        messageDiv.classList.add("starred");
    }

    if (message.pinned) {
        messageDiv.classList.add("pinned");
    }

    messageDiv.dataset.id = message.id;

    const textDiv = document.createElement("div");
    textDiv.className = "message-text";
    textDiv.textContent = message.text || "";

    messageDiv.appendChild(textDiv);

    if (message.attachments && message.attachments.length) {
        const attachmentsDiv = document.createElement("div");
        attachmentsDiv.className = "message-attachments";

        message.attachments.forEach(function (attachmentId) {
            loadAttachment(attachmentId, attachmentsDiv);
        });

        messageDiv.appendChild(attachmentsDiv);
    }

    const time = document.createElement("span");
    time.className = "message-time";

    time.textContent = message.time || "";

    messageDiv.appendChild(time);

    const menuButton = document.createElement("button");
    menuButton.className = "message-menu-button";
    menuButton.textContent = "⋮";

    menuButton.addEventListener("click", function (event) {
        event.stopPropagation();
        showMessageMenu(message, menuButton);
    });

    messageDiv.appendChild(menuButton);

    wrapper.appendChild(messageDiv);
    chatContent.appendChild(wrapper);

    chatContent.scrollTop = chatContent.scrollHeight;
}

// ===============================
// SEND MESSAGE
// ===============================

function sendMessage(text) {
    text = text.trim();

    const voiceToSend = pendingVoice;

    const attachmentItems =
        attachmentPreview
            ? [...attachmentPreview.querySelectorAll(".attachment-item")]
            : [];

    const attachmentIds = attachmentItems
        .filter(function (item) {
            return !item.classList.contains("voice-preview-item");
        })
        .map(function (item) {
            return item.dataset.id;
        })
        .filter(Boolean);

    if (!text && !voiceToSend && attachmentIds.length === 0) {
        return;
    }

    if (voiceToSend) {
        saveVoiceMessage(
            voiceToSend.audioBlob,
            text || "Voice message"
        );

        pendingVoice = null;

        const voicePreview =
            document.querySelector(".voice-preview-item");

        if (voicePreview) {
            voicePreview.remove();
        }
    }

    const now = new Date();

    const message = {
        id: Date.now().toString(),
        text: text,
        time: now.toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit"
        }),
        createdAt: now.toISOString(),
        starred: false,
        pinned: false,
        attachments: attachmentIds
    };

    messages.push(message);

    saveMessages();

    displayMessage(message);

    if (chatInput) {
        chatInput.value = "";
        chatInput.dispatchEvent(
            new Event("input", {
                bubbles: true
            })
        );
    }

    if (attachmentPreview) {
        attachmentPreview.innerHTML = "";
    }
}

// ===============================
// SEND BUTTON
// ===============================

if (sendButton) {
    sendButton.addEventListener("click", function () {
        sendMessage(chatInput ? chatInput.value : "");
    });
}

// ===============================
// ENTER TO SEND
// ===============================

if (chatInput) {
    chatInput.addEventListener("keydown", function (event) {
        if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();

            sendMessage(chatInput.value);
        }
    });
}

// ===============================
// MESSAGE MENU
// ===============================

function showMessageMenu(message, button) {
    const oldMenu = document.querySelector(".message-options-menu");

    if (oldMenu) {
        oldMenu.remove();
    }

    const menu = document.createElement("div");

    menu.className = "message-options-menu";

    const options = [
        {
            name: "Delete",
            action: function () {
                messages = messages.filter(function (item) {
                    return item.id !== message.id;
                });

                saveMessages();
                loadMessages();
            }
        },
        {
            name: "Copy",
            action: function () {
                navigator.clipboard.writeText(
                    message.text || ""
                );
            }
        },
        {
            name: "Reply",
            action: function () {
                if (chatInput) {
                    chatInput.value =
                        "Reply: " + (message.text || "");

                    chatInput.focus();
                }
            }
        },
        {
            name: message.starred ? "Unstar" : "Star",
            action: function () {
                message.starred = !message.starred;

                saveMessages();
                loadMessages();
            }
        },
        {
            name: message.pinned ? "Unpin" : "Pin",
            action: function () {
                message.pinned = !message.pinned;

                saveMessages();
                loadMessages();
            }
        },
        {
            name: "Info",
            action: function () {
                alert(
                    "Message time: " +
                    message.time
                );
            }
        }
    ];

    options.forEach(function (option) {
        const item = document.createElement("button");

        item.textContent = option.name;

        item.addEventListener("click", function () {
            option.action();
            menu.remove();
        });

        menu.appendChild(item);
    });

    document.body.appendChild(menu);

    const rect = button.getBoundingClientRect();

    menu.style.position = "fixed";
    menu.style.top = rect.bottom + 5 + "px";
    menu.style.left = rect.left - 100 + "px";
    menu.style.zIndex = "9999";
}

// ===============================
// ATTACHMENTS
// ===============================

function saveAttachment(file) {
    return new Promise(function (resolve, reject) {
        if (!db) {
            reject("Database not ready");
            return;
        }

        const id =
            Date.now().toString() +
            Math.random().toString(16).slice(2);

        const reader = new FileReader();

        reader.onload = function () {
            const attachment = {
                id: id,
                name: file.name,
                type: file.type,
                data: reader.result
            };

            const transaction =
                db.transaction(
                    ["attachments"],
                    "readwrite"
                );

            const store =
                transaction.objectStore("attachments");

            store.put(attachment);

            transaction.oncomplete = function () {
                resolve(id);
            };

            transaction.onerror = function () {
                reject(transaction.error);
            };
        };

        reader.onerror = function () {
            reject(reader.error);
        };

        reader.readAsDataURL(file);
    });
}

// ===============================
// LOAD ATTACHMENT
// ===============================

function loadAttachment(id, container) {
    if (!db) return;

    const transaction =
        db.transaction(
            ["attachments"],
            "readonly"
        );

    const store =
        transaction.objectStore("attachments");

    const request = store.get(id);

    request.onsuccess = function () {
        const attachment = request.result;

        if (!attachment) return;

        showSentAttachment(
            attachment,
            container
        );
    };
}

// ===============================
// SHOW SENT ATTACHMENT
// ===============================

function showSentAttachment(
    attachment,
    container
) {
    const item = document.createElement("div");

    item.className = "sent-attachment";

    if (attachment.type.startsWith("image/")) {
        const img = document.createElement("img");

        img.src = attachment.data;

        img.className = "sent-image";

        item.appendChild(img);
    }

    else if (attachment.type.startsWith("video/")) {
        const video = document.createElement("video");

        video.src = attachment.data;

        video.controls = true;

        video.className = "sent-video";

        item.appendChild(video);
    }

    else {
        const link = document.createElement("a");

        link.href = attachment.data;

        link.download = attachment.name;

        link.textContent =
            "📄 " + attachment.name;

        item.appendChild(link);
    }

    container.appendChild(item);
}

// ===============================
// ATTACHMENT PREVIEW
// ===============================

function createAttachmentPreview(
    file,
    id
) {
    if (!attachmentPreview) return;

    const item = document.createElement("div");

    item.className = "attachment-item";

    item.dataset.id = id;

    if (file.type.startsWith("image/")) {
        const img = document.createElement("img");

        img.src = URL.createObjectURL(file);

        item.appendChild(img);
    }

    else if (file.type.startsWith("video/")) {
        const video = document.createElement("video");

        video.src = URL.createObjectURL(file);

        video.controls = true;

        item.appendChild(video);
    }

    else {
        const name = document.createElement("span");

        name.textContent =
            "📄 " + file.name;

        item.appendChild(name);
    }

    const deleteButton =
        document.createElement("button");

    deleteButton.textContent = "×";

    deleteButton.addEventListener(
        "click",
        function () {
            deleteAttachment(id);
            item.remove();
        }
    );

    item.appendChild(deleteButton);

    attachmentPreview.appendChild(item);
}

// ===============================
// DELETE ATTACHMENT
// ===============================

function deleteAttachment(id) {
    if (!db) return;

    const transaction =
        db.transaction(
            ["attachments"],
            "readwrite"
        );

    const store =
        transaction.objectStore("attachments");

    store.delete(id);
}

// ===============================
// FILE INPUT
// ===============================

function handleFile(file) {
    if (!file) return;

    saveAttachment(file)
        .then(function (id) {
            createAttachmentPreview(
                file,
                id
            );
        })
        .catch(function (error) {
            console.log(error);
        });
}

// ===============================
// PLUS BUTTON
// ===============================

if (plusButton) {
    plusButton.addEventListener(
        "click",
        function () {
            const input =
                document.createElement("input");

            input.type = "file";

            input.accept =
                "image/*,video/*,audio/*,.pdf,.doc,.docx,.txt";

            input.multiple = true;

            input.addEventListener(
                "change",
                function () {
                    [...input.files].forEach(
                        handleFile
                    );
                }
            );

            input.click();
        }
    );
}

// ===============================
// LINK
// ===============================

function addLink() {
    const link =
        prompt("Weka link hapa:");

    if (!link) return;

    if (!attachmentPreview) return;

    const item =
        document.createElement("div");

    item.className =
        "attachment-item";

    item.textContent =
        "🔗 " + link;

    item.dataset.id = "";

    attachmentPreview.appendChild(item);

    if (chatInput) {
        chatInput.value =
            link;
    }
}

// ===============================
// LOCATION
// ===============================

function shareLocation() {
    if (!navigator.geolocation) {
        alert(
            "Location haipatikani kwenye browser hii."
        );

        return;
    }

    navigator.geolocation.getCurrentPosition(
        function (position) {
            const lat =
                position.coords.latitude;

            const lon =
                position.coords.longitude;

            sendMessage(
                "📍 Location: " +
                lat +
                ", " +
                lon
            );
        },
        function () {
            alert(
                "Imeshindikana kupata location."
            );
        }
    );
}

// ===============================
// VOICE RECORDING
// ===============================

if (voiceButton) {
    voiceButton.addEventListener(
        "click",
        function () {
            if (recording) {
                stopRecording();
            } else {
                startRecording();
            }
        }
    );
}

async function startRecording() {
    try {
        const stream =
            await navigator.mediaDevices.getUserMedia({
                audio: true
            });

        voiceChunks = [];

        mediaRecorder =
            new MediaRecorder(stream);

        mediaRecorder.ondataavailable =
            function (event) {
                if (event.data.size > 0) {
                    voiceChunks.push(
                        event.data
                    );
                }
            };

        mediaRecorder.onstop =
            function () {
                const audioBlob =
                    new Blob(
                        voiceChunks,
                        {
                            type:
                                "audio/webm"
                        }
                    );

                pendingVoice = {
                    audioBlob:
                        audioBlob,
                    transcript:
                        chatInput
                            ? chatInput.value
                            : ""
                };

                showPendingVoicePreview(
                    audioBlob
                );

                stream
                    .getTracks()
                    .forEach(function (track) {
                        track.stop();
                    });
            };

        mediaRecorder.start();

        recording = true;

        if (voiceButton) {
            voiceButton.classList.add(
                "recording"
            );
        }

        startSpeechRecognition();

    } catch (error) {
        console.log(error);

        alert(
            "Ruhusu microphone kwenye browser."
        );
    }
}

function stopRecording() {
    if (mediaRecorder) {
        mediaRecorder.stop();
    }

    recording = false;

    if (voiceButton) {
        voiceButton.classList.remove(
            "recording"
        );
    }

    stopSpeechRecognition();
}

// ===============================
// SPEECH TO TEXT
// ===============================

const SpeechRecognition =
    window.SpeechRecognition ||
    window.webkitSpeechRecognition;

if (SpeechRecognition) {
    recognition =
        new SpeechRecognition();

    recognition.lang =
        "sw-KE";

    recognition.continuous = true;

    recognition.interimResults = true;

    recognition.onresult =
        function (event) {
            let transcript = "";

            for (
                let i = 0;
                i < event.results.length;
                i++
            ) {
                transcript +=
                    event.results[i][0]
                        .transcript;
            }

            transcript =
                transcript.trim();

            if (chatInput) {
                chatInput.value =
                    transcript;

                chatInput.dispatchEvent(
                    new Event("input", {
                        bubbles: true
                    })
                );
            }

            console.log(
                "Speech:",
                transcript
            );
        };

    recognition.onend =
        function () {
            if (recording) {
                try {
                    recognition.start();
                } catch (error) {
                    console.log(error);
                }
            }
        };
}

function startSpeechRecognition() {
    if (!recognition) return;

    try {
        recognition.start();
    } catch (error) {
        console.log(error);
    }
}

function stopSpeechRecognition() {
    if (!recognition) return;

    try {
        recognition.stop();
    } catch (error) {
        console.log(error);
    }
}

// ===============================
// PENDING VOICE PREVIEW
// ===============================

function showPendingVoicePreview(
    audioBlob
) {
    if (!attachmentPreview) return;

    const oldPreview =
        document.querySelector(
            ".voice-preview-item"
        );

    if (oldPreview) {
        oldPreview.remove();
    }

    const item =
        document.createElement("div");

    item.className =
        "attachment-item voice-preview-item";

    const audio =
        document.createElement("audio");

    audio.controls = true;

    audio.src =
        URL.createObjectURL(audioBlob);

    item.appendChild(audio);

    const deleteButton =
        document.createElement("button");

    deleteButton.textContent = "×";

    deleteButton.onclick =
        function () {
            pendingVoice = null;
            item.remove();
        };

    item.appendChild(
        deleteButton
    );

    attachmentPreview.appendChild(
        item
    );
}

// ===============================
// SAVE VOICE MESSAGE
// ===============================

function saveVoiceMessage(
    audioBlob,
    transcript
) {
    const reader =
        new FileReader();

    reader.onload =
        function () {
            const voices =
                JSON.parse(
                    localStorage.getItem(
                        VOICE_STORAGE
                    )
                ) || [];

            voices.push({
                id:
                    Date.now().toString(),
                audio:
                    reader.result,
                transcript:
                    transcript,
                time:
                    new Date().toLocaleTimeString(
                        [],
                        {
                            hour:
                                "2-digit",
                            minute:
                                "2-digit"
                        }
                    )
            });

            localStorage.setItem(
                VOICE_STORAGE,
                JSON.stringify(voices)
            );

            displayVoiceMessage(
                voices[
                    voices.length - 1
                ]
            );
        };

    reader.readAsDataURL(
        audioBlob
    );
}

// ===============================
// DISPLAY VOICE MESSAGE
// ===============================

function displayVoiceMessage(
    voice
) {
    if (!chatContent) return;

    const wrapper =
        document.createElement("div");

    wrapper.className =
        "recording-message saved-voice";

    const audio =
        document.createElement("audio");

    audio.controls = true;

    audio.src =
        voice.audio;

    wrapper.appendChild(
        audio
    );

    const transcript =
        document.createElement("div");

    transcript.className =
        "voice-transcript";

    transcript.textContent =
        voice.transcript ||
        "Voice message";

    wrapper.appendChild(
        transcript
    );

    const deleteButton =
        document.createElement("button");

    deleteButton.textContent =
        "Delete";

    deleteButton.onclick =
        function () {
            deleteVoiceMessage(
                voice.id
            );

            wrapper.remove();
        };

    wrapper.appendChild(
        deleteButton
    );

    chatContent.appendChild(
        wrapper
    );
}

// ===============================
// LOAD VOICE MESSAGES
// ===============================

function loadVoiceMessages() {
    if (!chatContent) return;

    const voices =
        JSON.parse(
            localStorage.getItem(
                VOICE_STORAGE
            )
        ) || [];

    voices.forEach(function (voice) {
        displayVoiceMessage(
            voice
        );
    });
}

// ===============================
// DELETE VOICE MESSAGE
// ===============================

function deleteVoiceMessage(id) {
    let voices =
        JSON.parse(
            localStorage.getItem(
                VOICE_STORAGE
            )
        ) || [];

    voices =
        voices.filter(function (voice) {
            return voice.id !== id;
        });

    localStorage.setItem(
        VOICE_STORAGE,
        JSON.stringify(voices)
    );
}

// ===============================
// EMOJI PICKER
// ===============================

const emojiCategories = {
    "😀": [
        "😀","😃","😄","😁","😆","😅","😂",
        "🤣","😊","😇","🙂","🙃","😉","😌",
        "😍","🥰","😘","😗","😙","😚","😋",
        "😛","😝","😜","🤪","🤨","🧐","🤓",
        "😎","🥳","🤩","😭","😢","😡","🤔",
        "😴","😱","😮","😇","🤗","🤭","🤫"
    ],

    "👋": [
        "👋","🤚","🖐️","✋","🖖","👌","🤌",
        "🤏","✌️","🤞","🤟","🤘","🤙","👈",
        "👉","👆","👇","👍","👎","👏","🙌",
        "🙏","💪","❤️","🧡","💛","💚","💙",
        "💜","🖤","🤍","🤎","💔"
    ],

    "🐶": [
        "🐶","🐱","🐭","🐹","🐰","🦊","🐻",
        "🐼","🐨","🐯","🦁","🐮","🐷","🐸",
        "🐵","🙈","🙉","🙊","🐔","🐧","🐦",
        "🦋","🐝","🐞","🐢","🐍","🦎","🐠",
        "🐟","🐬","🐳","🦈","🐘","🦒","🦓"
    ],

    "🍔": [
        "🍎","🍊","🍋","🍌","🍉","🍇","🍓",
        "🍒","🍑","🥭","🍍","🥝","🍅","🥑",
        "🍔","🍕","🌭","🌮","🌯","🍿","🍗",
        "🍟","🍩","🍪","🎂","🍰","🍫","🍭",
        "☕","🍵","🥤","🧃"
    ],

    "⚽": [
        "⚽","🏀","🏈","⚾","🎾","🏐","🏉",
        "🥏","🎱","🏓","🏸","🥊","🥋","⛳",
        "🏆","🥇","🥈","🥉","🎮","🎯","🎳",
        "🎸","🎹","🎤","🎧","🎬","🎨"
    ],

    "🚗": [
        "🚗","🚕","🚙","🚌","🚎","🏎️","🚓",
        "🚑","🚒","🚐","🛻","🚚","🚛","🚜",
        "🏍️","🛵","🚲","✈️","🚁","🚀","🚢",
        "⛵","🚂","🚆","🚇"
    ],

    "💡": [
        "💡","🔥","⭐","🌟","✨","💫","🌈",
        "☀️","🌙","🌍","🌎","🌏","🌱","🌳",
        "🌲","🌴","🌵","🏔️","⛰️","🏕️",
        "🏠","🏢","🏙️","🏖️","🏝️"
    ],

    "🔣": [
        "❤️","💯","✅","❌","⚠️","❗","❓",
        "‼️","⁉️","⭕","🔴","🟠","🟡","🟢",
        "🔵","🟣","⚫","⚪","🔔","🔒","🔓",
        "🔑","💰","💎","🎁"
    ]
};

// ===============================
// FLAG EMOJIS / IMAGES
// ===============================

const flagCountries = [
    "ke","rw","ug","tz","bi","ss","et","so",
    "ng","gh","za","eg","in","cn","jp","kr",
    "fr","de","it","es","gb","us","ca","br",
    "au","at","be","ch","nl","pt","se","no",
    "dk","fi","ie","pl","ua","tr","ru","gr",
    "il","sa","ae","qa","pk","bd","np","lk",
    "th","vn","id","my","ph","sg","nz","mx",
    "ar","cl","co","pe","uy","ve","jm","cu"
];

// ===============================
// EXTRA EMOJI BUTTON
// ===============================

if (extraButton) {
    extraButton.addEventListener(
        "click",
        function (event) {
            event.stopPropagation();

            const oldPicker =
                document.querySelector(
                    ".emoji-picker"
                );

            if (oldPicker) {
                oldPicker.remove();
                return;
            }

            createEmojiPicker();
        }
    );
}

// ===============================
// CREATE EMOJI PICKER
// ===============================

function createEmojiPicker() {
    const picker =
        document.createElement("div");

    picker.className =
        "emoji-picker";

    const categories =
        document.createElement("div");

    categories.className =
        "emoji-categories";

    Object.keys(
        emojiCategories
    ).forEach(function (category) {
        const button =
            document.createElement("button");

        button.textContent =
            category;

        button.onclick =
            function () {
                showEmojiCategory(
                    category,
                    grid
                );
            };

        categories.appendChild(
            button
        );
    });

    const flagButton =
        document.createElement("button");

    flagButton.textContent = "🏴";

    flagButton.onclick =
        function () {
            showFlags(grid);
        };

    categories.appendChild(
        flagButton
    );

    picker.appendChild(
        categories
    );

    const grid =
        document.createElement("div");

    grid.className =
        "emoji-grid";

    picker.appendChild(grid);

    document.body.appendChild(
        picker
    );

    showEmojiCategory(
        "😀",
        grid
    );

    if (extraButton) {
        const rect =
            extraButton.getBoundingClientRect();

        picker.style.position =
            "fixed";

        picker.style.bottom =
            window.innerHeight -
            rect.top +
            10 +
            "px";

        picker.style.right =
            window.innerWidth -
            rect.right +
            "px";

        picker.style.zIndex =
            "99999";
    }
}

// ===============================
// SHOW EMOJI CATEGORY
// ===============================

function showEmojiCategory(
    category,
    grid
) {
    grid.innerHTML = "";

    const emojis =
        emojiCategories[category] || [];

    emojis.forEach(function (emoji) {
        const button =
            document.createElement("button");

        button.textContent =
            emoji;

        button.onclick =
            function () {
                insertEmoji(
                    emoji
                );
            };

        grid.appendChild(
            button
        );
    });
}

// ===============================
// SHOW FLAGS
// ===============================

function showFlags(grid) {
    grid.innerHTML = "";

    flagCountries.forEach(
        function (countryCode) {
            const img =
                document.createElement("img");

            img.src =
                "https://flagcdn.com/w80/" +
                countryCode +
                ".png";

            img.alt =
                "flag";

            img.title =
                countryCode;

            img.className =
                "emoji-flag";

            img.addEventListener(
                "click",
                function () {
                    insertEmoji(
                        "🏳️"
                    );
                }
            );

            grid.appendChild(
                img
            );
        }
    );
}

// ===============================
// INSERT EMOJI
// ===============================

function insertEmoji(emoji) {
    if (!chatInput) return;

    const start =
        chatInput.selectionStart ||
        chatInput.value.length;

    const end =
        chatInput.selectionEnd ||
        chatInput.value.length;

    const before =
        chatInput.value.substring(
            0,
            start
        );

    const after =
        chatInput.value.substring(
            end
        );

    chatInput.value =
        before +
        emoji +
        after;

    chatInput.focus();

    chatInput.selectionStart =
        chatInput.selectionEnd =
            start + emoji.length;
}

// ===============================
// CLOSE EMOJI PICKER
// ===============================

document.addEventListener(
    "click",
    function (event) {
        const picker =
            document.querySelector(
                ".emoji-picker"
            );

        if (!picker) return;

        if (
            !picker.contains(
                event.target
            ) &&
            event.target !== extraButton
        ) {
            picker.remove();
        }
    }
);

// ===============================
// DYNAMIC CSS
// ===============================

const dynamicStyle =
    document.createElement("style");

dynamicStyle.textContent = `
.message-wrapper {
    position: relative;
}

.message {
    position: relative;
}

.message-menu-button {
    border: none;
    background: transparent;
    cursor: pointer;
    font-size: 18px;
}

.message-options-menu {
    background: white;
    border-radius: 10px;
    padding: 6px;
    box-shadow: 0 4px 20px rgba(0,0,0,.2);
}

.message-options-menu button {
    display: block;
    width: 100%;
    border: none;
    background: white;
    padding: 9px 14px;
    text-align: left;
    cursor: pointer;
}

.message-options-menu button:hover {
    background: #f1f1f1;
}

.emoji-picker {
    width: 330px;
    max-height: 360px;
    background: white;
    border-radius: 16px;
    padding: 10px;
    box-shadow: 0 5px 25px rgba(0,0,0,.25);
    overflow: hidden;
}

.emoji-categories {
    display: flex;
    gap: 5px;
    overflow-x: auto;
    padding-bottom: 8px;
}

.emoji-categories button {
    border: none;
    background: transparent;
    font-size: 21px;
    cursor: pointer;
}

.emoji-grid {
    display: grid;
    grid-template-columns:
        repeat(7, 1fr);
    gap: 7px;
    max-height: 290px;
    overflow-y: auto;
}

.emoji-grid button {
    border: none;
    background: transparent;
    font-size: 25px;
    cursor: pointer;
    padding: 5px;
}

.emoji-grid button:hover {
    background: #eee;
    border-radius: 8px;
}

.emoji-flag {
    width: 32px;
    height: 22px;
    object-fit: cover;
    cursor: pointer;
    border-radius: 3px;
}

.attachment-item {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    margin: 5px;
    padding: 5px;
    background: #f2f2f2;
    border-radius: 10px;
}

.attachment-item img,
.attachment-item video {
    width: 90px;
    height: 70px;
    object-fit: cover;
    border-radius: 8px;
}

.attachment-item button {
    border: none;
    background: #ff4444;
    color: white;
    border-radius: 50%;
    width: 22px;
    height: 22px;
    cursor: pointer;
}

.voice-preview-item {
    display: flex;
    align-items: center;
}

.voice-preview-item audio {
    width: 220px;
}

.recording {
    animation: venquereRecordingPulse 1s infinite;
}

@keyframes venquereRecordingPulse {
    0% {
        transform: scale(1);
    }

    50% {
        transform: scale(1.12);
    }

    100% {
        transform: scale(1);
    }
}

.saved-voice {
    display: flex;
    flex-direction: column;
    gap: 7px;
    margin: 8px 0;
}

.saved-voice audio {
    max-width: 280px;
}

.voice-transcript {
    background: rgba(255,255,255,.15);
    padding: 7px 10px;
    border-radius: 8px;
}

.message-attachments {
    margin-top: 6px;
}

.sent-attachment {
    margin-top: 5px;
}

.sent-image,
.sent-video {
    max-width: 220px;
    max-height: 180px;
    object-fit: cover;
    border-radius: 10px;
}

.sent-file {
    padding: 8px;
}
`;

document.head.appendChild(
    dynamicStyle
);

// ===============================
// SENT ATTACHMENT CSS
// ===============================

const sentAttachmentStyle =
    document.createElement("style");

sentAttachmentStyle.textContent = `
.sent-attachment {
    display: block;
}

.sent-image,
.sent-video {
    max-width: 220px;
    max-height: 180px;
    border-radius: 10px;
    object-fit: cover;
}

.sent-attachment a {
    display: inline-block;
    padding: 8px 12px;
    background: #eeeeee;
    border-radius: 8px;
    text-decoration: none;
}
`;

document.head.appendChild(
    sentAttachmentStyle
);