// Tomodoro Focus - Pure JavaScript Version

document.addEventListener("DOMContentLoaded", () => {
    // DOM Elements
    const app = document.getElementById("app");
    const settingsModal = document.getElementById("settingsModal");
    const settingsOverlay = document.getElementById("settingsOverlay");
    const toggleSettingsBtn = document.getElementById("toggleSettingsBtn");
    const closeSettingsModalBtn = document.getElementById("closeSettingsModalBtn");

    // Pomodoro Info Modal Elements
    const pomodoroInfoModal = document.getElementById("pomodoroInfoModal");
    const pomodoroInfoOverlay = document.getElementById("pomodoroInfoOverlay");
    const closePomodoroInfoModalBtn = document.getElementById("closePomodoroInfoModalBtn");
    const confirmPomodoroInfoBtn = document.getElementById("confirmPomodoroInfoBtn");
    const askLaterPomodoroInfoBtn = document.getElementById("askLaterPomodoroInfoBtn");

    // Cycle Confirmation Modal Elements
    const cycleConfirmModal = document.getElementById("cycleConfirmModal");
    const cycleConfirmOverlay = document.getElementById("cycleConfirmOverlay");
    const cycleConfirmTitle = document.getElementById("cycleConfirmTitle");
    const cycleConfirmMessage = document.getElementById("cycleConfirmMessage");
    const startNextCycleBtn = document.getElementById("startNextCycleBtn");
    const dismissCycleBtn = document.getElementById("dismissCycleBtn");

    // Timer elements
    const timeDisplay = document.getElementById("timeDisplay");
    const cycleDisplay = document.getElementById("cycleDisplay");
    const modePomodoroBtn = document.getElementById("modePomodoroBtn");
    const modeShortBreakBtn = document.getElementById("modeShortBreakBtn");
    const modeLongBreakBtn = document.getElementById("modeLongBreakBtn");
    const startTimerBtn = document.getElementById("startTimerBtn");
    const resetTimerBtn = document.getElementById("resetTimerBtn");

    // Task elements
    const newTaskInput = document.getElementById("newTaskInput");
    const taskPrioritySelect = document.getElementById("taskPrioritySelect");
    const addTaskBtn = document.getElementById("addTaskBtn");
    const taskList = document.getElementById("taskList");

    // Settings elements (inside modal)
    const bgColorPicker = document.getElementById("bgColorPicker");
    const btnColorPicker = document.getElementById("btnColorPicker");
    const themeDarkRadio = document.getElementById("themeDarkRadio");
    const themeLightRadio = document.getElementById("themeLightRadio");
    const bgImageUpload = document.getElementById("bgImageUpload");
    const youtubeLinkInput = document.getElementById("youtubeLinkInput");
    const cycleModeManualRadio = document.getElementById("cycleModeManualRadio");
    const cycleModeAutoRadio = document.getElementById("cycleModeAutoRadio");
    const cycleNotificationConfirm = document.getElementById("cycleNotificationConfirm");
    const pomodoroTimeInput = document.getElementById("pomodoroTimeInput");
    const shortBreakTimeInput = document.getElementById("shortBreakTimeInput");
    const longBreakTimeInput = document.getElementById("longBreakTimeInput");
    const resetSettingsBtn = document.getElementById("resetSettingsBtn");
    const videoFrameContainer = document.getElementById("videoFrameContainer");
    const youtubeIframe = document.getElementById("youtubeIframe");

    // Timer state
    let currentMode = "pomodoro"; // pomodoro, shortBreak, longBreak
    let timerInterval = null;
    let timeLeft = 0; // in seconds
    let isTimerRunning = false;
    let pomodorosCompletedSession = 0; // Pomodoros completed in the current session of 4
    let totalPomodorosCompleted = 0; // Total pomodoros completed overall
    const POMODOROS_PER_SESSION = 4;
    let nextModeToStart = null; // For cycle confirmation

    // YouTube Player API
    let ytPlayer;
    let youtubeAPILoaded = false;

    // Default times
    const defaultTimes = {
        pomodoro: 25 * 60,
        shortBreak: 5 * 60,
        longBreak: 15 * 60,
    };

    let customTimes = { ...defaultTimes };
    let tasks = []; // Each task: { id, name, priority, done, subtasks: [{id, name, done}] }
    let currentTheme = "dark";
    let currentBgImage = "";
    let currentBgColor = "#1e1e1e";
    let currentBtnColor = "#f04e4e";
    let isAutoMode = false;
    let requireCycleConfirmation = true;
    let pomodoroInfoShown = false;
    let currentYoutubeLink = "";

    // --- YouTube Player API Functions ---
    function loadYouTubeAPI() {
        if (!youtubeAPILoaded && (typeof(YT) == 'undefined' || typeof(YT.Player) == 'undefined')) {
            const tag = document.createElement('script');
            tag.src = "https://www.youtube.com/iframe_api";
            const firstScriptTag = document.getElementsByTagName('script')[0];
            firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
            youtubeAPILoaded = true;
        } else if (typeof(YT) !== 'undefined' && typeof(YT.Player) !== 'undefined'){
            if (youtubeIframe && youtubeIframe.src.includes('embed') && !ytPlayer) {
                initializePlayer();
            }
        }
    }

    window.onYouTubeIframeAPIReady = function() {
        initializePlayer();
    };

    function initializePlayer() {
        if (document.getElementById('youtubeIframe') && document.getElementById('youtubeIframe').src.includes('embed')) {
            if (ytPlayer && typeof ytPlayer.destroy === 'function') {
                ytPlayer.destroy();
            }
            ytPlayer = new YT.Player('youtubeIframe', {
                events: {
                    // 'onReady': onPlayerReady, 
                    // 'onStateChange': onPlayerStateChange 
                }
            });
        }
    }

    const pauseYouTubeVideo = () => {
        if (ytPlayer && typeof ytPlayer.pauseVideo === 'function' && ytPlayer.getPlayerState && ytPlayer.getPlayerState() === YT.PlayerState.PLAYING) {
            ytPlayer.pauseVideo();
        }
    };

    const playYouTubeVideo = () => {
        if (ytPlayer && typeof ytPlayer.playVideo === 'function' && videoFrameContainer.style.display === 'flex') {
            if (ytPlayer.getPlayerState && (ytPlayer.getPlayerState() === YT.PlayerState.PAUSED || ytPlayer.getPlayerState() === YT.PlayerState.CUED || ytPlayer.getPlayerState() === YT.PlayerState.ENDED)) {
                 ytPlayer.playVideo();
            }
        }
    };

    // --- Utility Functions ---
    const formatTime = (seconds) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
    };

    const getYoutubeEmbedUrl = (url) => {
        try {
            const urlObj = new URL(url);
            let videoId = urlObj.searchParams.get("v");
            if (!videoId && urlObj.hostname === "youtu.be") {
                videoId = urlObj.pathname.substring(1);
            }
            return videoId ? `https://www.youtube.com/embed/${videoId}?autoplay=0&enablejsapi=1&origin=${window.location.origin}` : "";
        } catch {
            return "";
        }
    };

    const playNotificationSound = () => {
        const audio = new Audio("https://www.soundjay.com/misc/sounds/bell-ringing-05.mp3"); 
        audio.play().catch(e => console.error("Error playing sound:", e));
    };

    const showDesktopNotification = (message) => {
        if (Notification.permission === "granted") {
            new Notification("⏱️ Tomodoro Focus", { body: message });
        } else if (Notification.permission !== "denied") {
            Notification.requestPermission().then(permission => {
                if (permission === "granted") {
                    new Notification("⏱️ Tomodoro Focus", { body: message });
                }
            });
        }
    };

    // --- Modal Open/Close Functions ---
    const openModal = (modal, overlay) => {
        overlay.classList.add("open");
        modal.classList.add("open");
        const focusable = modal.querySelector('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
        if (focusable) focusable.focus();
    };

    const closeModal = (modal, overlay) => {
        modal.classList.remove("open");
        overlay.classList.remove("open");
    };

    // --- Load from LocalStorage ---
    const loadSettings = () => {
        const savedTimes = localStorage.getItem("tomodoro_customTimes");
        if (savedTimes) {
            const parsedTimes = JSON.parse(savedTimes);
            customTimes.pomodoro = (parsedTimes.pomodoro || defaultTimes.pomodoro / 60) * 60;
            customTimes.shortBreak = (parsedTimes.shortBreak || defaultTimes.shortBreak / 60) * 60;
            customTimes.longBreak = (parsedTimes.longBreak || defaultTimes.longBreak / 60) * 60;
        } else {
            customTimes = { ...defaultTimes }; 
        }

        const savedTasks = localStorage.getItem("tomodoro_tasks");
        if (savedTasks) tasks = JSON.parse(savedTasks).map(task => ({...task, subtasks: task.subtasks || []})); // Ensure subtasks array exists

        currentTheme = localStorage.getItem("tomodoro_theme") || "dark";
        currentBgImage = localStorage.getItem("tomodoro_bgImage") || "";
        currentBgColor = localStorage.getItem("tomodoro_bgColor") || "#1e1e1e";
        currentBtnColor = localStorage.getItem("tomodoro_btnColor") || "#f04e4e";
        isAutoMode = localStorage.getItem("tomodoro_isAutoMode") === "true";
        requireCycleConfirmation = localStorage.getItem("tomodoro_requireCycleConfirm") === null ? true : localStorage.getItem("tomodoro_requireCycleConfirm") === "true";
        pomodoroInfoShown = localStorage.getItem("tomodoro_pomodoroInfoShown") === "true";
        currentYoutubeLink = localStorage.getItem("tomodoro_youtubeLink") || "";
        pomodorosCompletedSession = parseInt(localStorage.getItem("tomodoro_pomodorosCompletedSession") || "0");
        totalPomodorosCompleted = parseInt(localStorage.getItem("tomodoro_totalPomodorosCompleted") || "0");
        
        applySettingsToDOM();
        renderTasks();
        updateCycleDisplay(); 
        setMode(currentMode, false); 
    };

    // --- Save to LocalStorage ---
    const saveCustomTimes = () => localStorage.setItem("tomodoro_customTimes", JSON.stringify({ pomodoro: customTimes.pomodoro / 60, shortBreak: customTimes.shortBreak / 60, longBreak: customTimes.longBreak / 60 }));
    const saveTasks = () => localStorage.setItem("tomodoro_tasks", JSON.stringify(tasks));
    const saveTheme = () => localStorage.setItem("tomodoro_theme", currentTheme);
    const saveBgImage = () => localStorage.setItem("tomodoro_bgImage", currentBgImage);
    const saveBgColor = () => localStorage.setItem("tomodoro_bgColor", currentBgColor);
    const saveBtnColor = () => localStorage.setItem("tomodoro_btnColor", currentBtnColor);
    const saveAutoMode = () => localStorage.setItem("tomodoro_isAutoMode", isAutoMode.toString());
    const saveRequireCycleConfirmation = () => localStorage.setItem("tomodoro_requireCycleConfirm", requireCycleConfirmation.toString());
    const savePomodoroInfoShown = () => localStorage.setItem("tomodoro_pomodoroInfoShown", pomodoroInfoShown.toString());
    const saveYoutubeLink = () => localStorage.setItem("tomodoro_youtubeLink", currentYoutubeLink);
    const savePomodorosCompletedSession = () => localStorage.setItem("tomodoro_pomodorosCompletedSession", pomodorosCompletedSession.toString());
    const saveTotalPomodorosCompleted = () => localStorage.setItem("tomodoro_totalPomodorosCompleted", totalPomodorosCompleted.toString());


    // --- Apply Settings to DOM ---
    const applySettingsToDOM = () => {
        app.className = `app ${currentTheme}`;
        document.body.style.backgroundImage = currentBgImage ? `url(${currentBgImage})` : "none";
        document.body.style.backgroundColor = currentBgColor;
        app.style.backgroundColor = "transparent"; // App background should be transparent to let body show through

        themeDarkRadio.checked = currentTheme === "dark";
        themeLightRadio.checked = currentTheme === "light";
        bgColorPicker.value = currentBgColor;

        const allButtons = document.querySelectorAll("button");
        allButtons.forEach(btn => {
            if (!btn.classList.contains("active") && !btn.classList.contains("close-modal-btn") && !btn.classList.contains("primary-btn") && !btn.classList.contains("danger-btn") && btn.id !== "toggleSettingsBtn" && btn.id !== "addTaskBtn") {
                 btn.style.backgroundColor = currentBtnColor;
            }
        });
        if (document.getElementById("addTaskBtn")) document.getElementById("addTaskBtn").style.backgroundColor = ""; 
        if (document.getElementById("resetSettingsBtn")) document.getElementById("resetSettingsBtn").style.backgroundColor = ""; 

        btnColorPicker.value = currentBtnColor;
        
        pomodoroTimeInput.value = customTimes.pomodoro / 60;
        shortBreakTimeInput.value = customTimes.shortBreak / 60;
        longBreakTimeInput.value = customTimes.longBreak / 60;

        cycleModeAutoRadio.checked = isAutoMode;
        cycleModeManualRadio.checked = !isAutoMode;
        cycleNotificationConfirm.checked = requireCycleConfirmation;

        youtubeLinkInput.value = currentYoutubeLink;
        if (currentYoutubeLink) {
            const embedUrl = getYoutubeEmbedUrl(currentYoutubeLink);
            if (embedUrl) {
                if (youtubeIframe.src !== embedUrl) {
                    youtubeIframe.src = embedUrl;
                    if (youtubeAPILoaded && (typeof(YT) !== 'undefined' && typeof(YT.Player) !== 'undefined')) {
                        setTimeout(initializePlayer, 100);
                    }
                }
                videoFrameContainer.style.display = "flex";
                loadYouTubeAPI();
            } else {
                videoFrameContainer.style.display = "none";
                youtubeIframe.src = "";
                if(ytPlayer && typeof ytPlayer.destroy === 'function') {
                    ytPlayer.destroy();
                    ytPlayer = null;
                }
            }
        } else {
            videoFrameContainer.style.display = "none";
            youtubeIframe.src = "";
            if(ytPlayer && typeof ytPlayer.destroy === 'function') {
                ytPlayer.destroy();
                ytPlayer = null;
            }
        }
        updateCycleDisplay();
    };
    
    // --- Cycle Display ---
    const updateCycleDisplay = () => {
        let cycleText = "";
        if (currentMode === "pomodoro") {
            cycleText = `Foco: ${pomodorosCompletedSession + 1}/${POMODOROS_PER_SESSION}`;
        } else if (currentMode === "shortBreak") {
            cycleText = "Pausa Curta";
        } else if (currentMode === "longBreak") {
            cycleText = "Pausa Longa";
        }
        cycleDisplay.textContent = `Foco: ${(pomodorosCompletedSession % POMODOROS_PER_SESSION) + 1}/${POMODOROS_PER_SESSION} | Completos: ${Math.floor(totalPomodorosCompleted / POMODOROS_PER_SESSION)}`;
    };

    // --- Timer Logic ---
    const updateTimerDisplay = () => {
        timeDisplay.textContent = formatTime(timeLeft);
        const cycleTextForTitle = cycleDisplay.textContent.includes(' (') ? cycleDisplay.textContent.substring(0, cycleDisplay.textContent.indexOf(' (')) : cycleDisplay.textContent;
        document.title = `${formatTime(timeLeft)} - ${cycleTextForTitle} - Tomodoro Focus`;
    };

    const setMode = (mode, autoStartNext = false) => {
        currentMode = mode;
        timeLeft = customTimes[mode];
        isTimerRunning = false;
        clearInterval(timerInterval);
        updateTimerDisplay();
        updateCycleDisplay();

        [modePomodoroBtn, modeShortBreakBtn, modeLongBreakBtn].forEach(btn => {
            btn.classList.remove("active");
            btn.setAttribute("aria-pressed", "false");
        });
        
        const activeBtn = mode === "pomodoro" ? modePomodoroBtn : (mode === "shortBreak" ? modeShortBreakBtn : modeLongBreakBtn);
        activeBtn.classList.add("active");
        activeBtn.setAttribute("aria-pressed", "true");
        
        startTimerBtn.textContent = "Iniciar";

        if (autoStartNext) {
            if (!pomodoroInfoShown && currentMode === "pomodoro" && pomodorosCompletedSession === 0 && totalPomodorosCompleted === 0) {
                openModal(pomodoroInfoModal, pomodoroInfoOverlay);
            } else {
                startTimerLogic(); 
            }
        }
    };

    const handleCycleEnd = () => {
        isTimerRunning = false;
        clearInterval(timerInterval);
        playNotificationSound();
        pauseYouTubeVideo();

        let nextMode;
        let message;

        if (currentMode === "pomodoro") {
            pomodorosCompletedSession++;
            totalPomodorosCompleted++;
            savePomodorosCompletedSession();
            saveTotalPomodorosCompleted();
            if (pomodorosCompletedSession > 0 && pomodorosCompletedSession % POMODOROS_PER_SESSION === 0) {
                nextMode = "longBreak";
                message = "Sessão de foco completa! Hora de uma pausa longa.";
            } else {
                nextMode = "shortBreak";
                message = "Pomodoro completo! Hora de uma pausa curta.";
            }
        } else { // shortBreak or longBreak
            nextMode = "pomodoro";
            message = "Pausa completa! Hora de focar.";
        }

        showDesktopNotification(message);
        updateCycleDisplay();

        if (requireCycleConfirmation) {
            cycleConfirmTitle.textContent = message;
            cycleConfirmMessage.textContent = `Pronto para iniciar o modo ${nextMode === "pomodoro" ? "Foco" : (nextMode === "shortBreak" ? "Pausa Curta" : "Pausa Longa")}?`;
            nextModeToStart = nextMode;
            openModal(cycleConfirmModal, cycleConfirmOverlay);
        } else if (isAutoMode) {
            setMode(nextMode, true);
        } else {
            setMode(nextMode, false);
            startTimerBtn.textContent = "Iniciar";
        }
    };

    const startTimerLogic = () => {
        if (isTimerRunning) return;
        isTimerRunning = true;
        startTimerBtn.textContent = "Pausar";
        playYouTubeVideo();

        timerInterval = setInterval(() => {
            timeLeft--;
            updateTimerDisplay();
            if (timeLeft <= 0) {
                handleCycleEnd();
            }
        }, 1000);
    };

    startTimerBtn.addEventListener("click", () => {
        if (!isTimerRunning) {
            if (!pomodoroInfoShown && currentMode === "pomodoro" && pomodorosCompletedSession === 0 && totalPomodorosCompleted === 0) {
                openModal(pomodoroInfoModal, pomodoroInfoOverlay);
            } else {
                startTimerLogic();
            }
        } else {
            isTimerRunning = false;
            clearInterval(timerInterval);
            startTimerBtn.textContent = "Retomar";
            pauseYouTubeVideo();
        }
    });

    resetTimerBtn.addEventListener("click", () => {
    pomodorosCompletedSession = 0;
    totalPomodorosCompleted = 0;
    savePomodorosCompletedSession();
    saveTotalPomodorosCompleted();
    updateCycleDisplay();

        isTimerRunning = false;
        clearInterval(timerInterval);
        timeLeft = customTimes[currentMode];
        updateTimerDisplay();
        startTimerBtn.textContent = "Iniciar";
        pauseYouTubeVideo();
    });

    [modePomodoroBtn, modeShortBreakBtn, modeLongBreakBtn].forEach(btn => {
        btn.addEventListener("click", () => {
            const newMode = btn.id.replace("mode", "").replace("Btn", "").toLowerCase();
            if (newMode === "shortbreak") newMode = "shortBreak";
            if (newMode === "longbreak") newMode = "longBreak";
            setMode(newMode);
        });
    });

    // --- Task Logic ---
    const renderTasks = () => {
        taskList.innerHTML = "";
        tasks.sort((a, b) => {
            const priorityOrder = { high: 0, medium: 1, low: 2 };
            return priorityOrder[a.priority] - priorityOrder[b.priority];
        });

        tasks.forEach(task => {
            const li = document.createElement("li");
            li.dataset.id = task.id;
            li.className = `priority-${task.priority}`;
            if (task.done) li.classList.add("done");

            const taskTextSpan = document.createElement("span");
            taskTextSpan.textContent = task.name;
            
            const taskControlsDiv = document.createElement("div");
            taskControlsDiv.className = "task-item-controls";

            const addSubtaskBtn = document.createElement("button");
            addSubtaskBtn.textContent = "+ Sub";
            addSubtaskBtn.className = "add-subtask-btn";
            addSubtaskBtn.addEventListener("click", (e) => {
                e.stopPropagation();
                const subtaskName = prompt("Nome da Subtarefa:");
                if (subtaskName && subtaskName.trim() !== "") {
                    const parentTask = tasks.find(t => t.id === task.id);
                    if (parentTask) {
                        const newSubtask = { id: Date.now().toString(), name: subtaskName.trim(), done: false };
                        parentTask.subtasks.push(newSubtask);
                        saveTasks();
                        renderTasks();
                    }
                }
            });

            const deleteBtn = document.createElement("button");
            deleteBtn.textContent = "🗑️";
            deleteBtn.className = "delete-task-btn";
            deleteBtn.setAttribute("aria-label", "Excluir tarefa");
            deleteBtn.addEventListener("click", (e) => {
                e.stopPropagation();
                tasks = tasks.filter(t => t.id !== task.id);
                saveTasks();
                renderTasks();
            });

            taskControlsDiv.appendChild(addSubtaskBtn);
            taskControlsDiv.appendChild(deleteBtn);

            li.appendChild(taskTextSpan);
            li.appendChild(taskControlsDiv);

            if (task.done) {
                const doneOverlay = document.createElement("div");
                doneOverlay.className = "task-done-overlay";
                doneOverlay.textContent = "Tarefa Finalizada";
                li.appendChild(doneOverlay);
            }

            li.addEventListener("click", () => {
                task.done = !task.done;
                // If marking task as done, mark all subtasks as done
                if (task.done) {
                    task.subtasks.forEach(sub => sub.done = true);
                } else {
                // If unmarking task, unmark all subtasks only if all were done
                    const allSubtasksDone = task.subtasks.every(sub => sub.done);
                    if(allSubtasksDone && task.subtasks.length > 0) {
                        task.subtasks.forEach(sub => sub.done = false);
                    }
                }
                saveTasks();
                renderTasks();
            });

            taskList.appendChild(li);

            // Render Subtasks
            if (task.subtasks && task.subtasks.length > 0) {
                const subtaskListUl = document.createElement("ul");
                subtaskListUl.className = "subtask-list";
                task.subtasks.forEach(subtask => {
                    const subLi = document.createElement("li");
                    subLi.dataset.id = subtask.id;
                    subLi.className = "subtask-item";
                    if (subtask.done) subLi.classList.add("done");

                    const subtaskTextSpan = document.createElement("span");
                    subtaskTextSpan.textContent = subtask.name;

                    const subtaskDeleteBtn = document.createElement("button");
                    subtaskDeleteBtn.textContent = "🗑️";
                    subtaskDeleteBtn.className = "delete-subtask-btn";
                    subtaskDeleteBtn.setAttribute("aria-label", "Excluir subtarefa");
                    subtaskDeleteBtn.addEventListener("click", (e) => {
                        e.stopPropagation();
                        task.subtasks = task.subtasks.filter(s => s.id !== subtask.id);
                        // Check if parent task should become undone if a subtask is deleted and was the only thing keeping it done
                        const allRemainingSubtasksDone = task.subtasks.every(s => s.done);
                        if (task.done && task.subtasks.length > 0 && !allRemainingSubtasksDone) {
                            task.done = false; 
                        } else if (task.done && task.subtasks.length === 0) {
                            // If all subtasks are deleted, the parent task remains as it was (done or not done)
                            // Or, you might want to set task.done = false if no subtasks are left and it was previously done because of them.
                            // For now, let's keep it simple: if it was done, it stays done unless explicitly undone.
                        }
                        saveTasks();
                        renderTasks();
                    });
                    
                    subLi.appendChild(subtaskTextSpan);
                    subLi.appendChild(subtaskDeleteBtn);

                    if (subtask.done) {
                        const subDoneOverlay = document.createElement("div");
                        subDoneOverlay.className = "task-done-overlay subtask-done-overlay";
                        subDoneOverlay.textContent = "Finalizada";
                        subLi.appendChild(subDoneOverlay);
                    }

                    subLi.addEventListener("click", (e) => {
                        e.stopPropagation(); 
                        subtask.done = !subtask.done;
                        saveTasks();
                        renderTasks();
                    });

                    subtaskListUl.appendChild(subLi);
                });
                taskList.appendChild(subtaskListUl);

            }
        });
    };

    addTaskBtn.addEventListener("click", () => {
        const taskName = newTaskInput.value.trim();
        if (taskName) {
            const newTask = {
                id: Date.now().toString(),
                name: taskName,
                priority: taskPrioritySelect.value,
                done: false,
                subtasks: [] // Initialize with an empty subtasks array
            };
            tasks.push(newTask);
            saveTasks();
            renderTasks();
            newTaskInput.value = "";
        }
    });

    newTaskInput.addEventListener("keypress", (e) => {
        if (e.key === "Enter") {
            addTaskBtn.click();
        }
    });

    // --- Settings Modal Logic ---
    toggleSettingsBtn.addEventListener("click", () => openModal(settingsModal, settingsOverlay));
    closeSettingsModalBtn.addEventListener("click", () => closeModal(settingsModal, settingsOverlay));
    settingsOverlay.addEventListener("click", () => closeModal(settingsModal, settingsOverlay));

    // --- Pomodoro Info Modal Logic ---
    closePomodoroInfoModalBtn.addEventListener("click", () => {
        closeModal(pomodoroInfoModal, pomodoroInfoOverlay);
        pomodoroInfoShown = true;
        savePomodoroInfoShown();
    });
    pomodoroInfoOverlay.addEventListener("click", () => {
        closeModal(pomodoroInfoModal, pomodoroInfoOverlay);
        pomodoroInfoShown = true;
        savePomodoroInfoShown();
    });
    confirmPomodoroInfoBtn.addEventListener("click", () => {
        closeModal(pomodoroInfoModal, pomodoroInfoOverlay);
        pomodoroInfoShown = true;
        savePomodoroInfoShown();
        requireCycleConfirmation = cycleNotificationConfirm.checked; // User might have changed this in settings already
        saveRequireCycleConfirmation();
        startTimerLogic(); 
    });
    askLaterPomodoroInfoBtn.addEventListener("click", () => {
        closeModal(pomodoroInfoModal, pomodoroInfoOverlay);
        // pomodoroInfoShown remains false
    });

    // --- Cycle Confirmation Modal Logic ---
    startNextCycleBtn.addEventListener("click", () => {
        closeModal(cycleConfirmModal, cycleConfirmOverlay);
        if (nextModeToStart) {
            setMode(nextModeToStart, true);
            nextModeToStart = null;
        }
    });
    dismissCycleBtn.addEventListener("click", () => {
        closeModal(cycleConfirmModal, cycleConfirmOverlay);
        if (nextModeToStart) {
            setMode(nextModeToStart, false); // Set the mode, but don't auto-start
            startTimerBtn.textContent = "Iniciar";
            nextModeToStart = null;
        }
    });
    cycleConfirmOverlay.addEventListener("click", () => {
        closeModal(cycleConfirmModal, cycleConfirmOverlay);
        if (nextModeToStart) {
            setMode(nextModeToStart, false);
            startTimerBtn.textContent = "Iniciar";
            nextModeToStart = null;
        }
    });

    // --- Settings Event Listeners ---
    bgColorPicker.addEventListener("input", (e) => {
        currentBgColor = e.target.value;
        document.body.style.backgroundColor = currentBgColor;
        saveBgColor();
    });

    btnColorPicker.addEventListener("input", (e) => {
        currentBtnColor = e.target.value;
        const allButtons = document.querySelectorAll("button");
        allButtons.forEach(btn => {
            if (!btn.classList.contains("active") && !btn.classList.contains("close-modal-btn") && !btn.classList.contains("primary-btn") && !btn.classList.contains("danger-btn") && btn.id !== "toggleSettingsBtn" && btn.id !== "addTaskBtn") {
                 btn.style.backgroundColor = currentBtnColor;
            }
        });
        saveBtnColor();
    });

    themeDarkRadio.addEventListener("change", () => {
        currentTheme = "dark";
        app.className = `app ${currentTheme}`;
        saveTheme();
    });

    themeLightRadio.addEventListener("change", () => {
        currentTheme = "light";
        app.className = `app ${currentTheme}`;
        saveTheme();
    });

    bgImageUpload.addEventListener("change", (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                currentBgImage = event.target.result;
                document.body.style.backgroundImage = `url(${currentBgImage})`;
                saveBgImage();
            };
            reader.readAsDataURL(file);
        } else {
            currentBgImage = "";
            document.body.style.backgroundImage = "none";
            saveBgImage();
        }
    });

    youtubeLinkInput.addEventListener("change", (e) => {
        currentYoutubeLink = e.target.value.trim();
        saveYoutubeLink();
        const embedUrl = getYoutubeEmbedUrl(currentYoutubeLink);
        if (embedUrl) {
            if (youtubeIframe.src !== embedUrl) {
                youtubeIframe.src = embedUrl;
                if (youtubeAPILoaded && (typeof(YT) !== 'undefined' && typeof(YT.Player) !== 'undefined')) {
                    setTimeout(initializePlayer, 100);
                }
            }
            videoFrameContainer.style.display = "flex";
            loadYouTubeAPI();
        } else {
            videoFrameContainer.style.display = "none";
            youtubeIframe.src = "";
            if(ytPlayer && typeof ytPlayer.destroy === 'function') {
                ytPlayer.destroy();
                ytPlayer = null;
            }
        }
    });

    cycleModeAutoRadio.addEventListener("change", () => {
        isAutoMode = true;
        saveAutoMode();
    });
    cycleModeManualRadio.addEventListener("change", () => {
        isAutoMode = false;
        saveAutoMode();
    });
    cycleNotificationConfirm.addEventListener("change", (e) => {
        requireCycleConfirmation = e.target.checked;
        saveRequireCycleConfirmation();
    });

    pomodoroTimeInput.addEventListener("change", (e) => {
        customTimes.pomodoro = Math.max(1, parseInt(e.target.value)) * 60;
        if (currentMode === "pomodoro" && !isTimerRunning) timeLeft = customTimes.pomodoro;
        updateTimerDisplay();
        saveCustomTimes();
    });
    shortBreakTimeInput.addEventListener("change", (e) => {
        customTimes.shortBreak = Math.max(1, parseInt(e.target.value)) * 60;
        if (currentMode === "shortBreak" && !isTimerRunning) timeLeft = customTimes.shortBreak;
        updateTimerDisplay();
        saveCustomTimes();
    });
    longBreakTimeInput.addEventListener("change", (e) => {
        customTimes.longBreak = Math.max(1, parseInt(e.target.value)) * 60;
        if (currentMode === "longBreak" && !isTimerRunning) timeLeft = customTimes.longBreak;
        updateTimerDisplay();
        saveCustomTimes();
    });

    resetSettingsBtn.addEventListener("click", () => {
        if (confirm("Tem certeza que deseja resetar todas as configurações para os padrões?")) {
            localStorage.removeItem("tomodoro_customTimes");
            localStorage.removeItem("tomodoro_theme");
            localStorage.removeItem("tomodoro_bgImage");
            localStorage.removeItem("tomodoro_bgColor");
            localStorage.removeItem("tomodoro_btnColor");
            localStorage.removeItem("tomodoro_isAutoMode");
            localStorage.removeItem("tomodoro_requireCycleConfirm");
            localStorage.removeItem("tomodoro_pomodoroInfoShown");
            localStorage.removeItem("tomodoro_youtubeLink");
            // Keep tasks and cycle counts
            // localStorage.removeItem("tomodoro_tasks");
            // localStorage.removeItem("tomodoro_pomodorosCompletedSession");
            // localStorage.removeItem("tomodoro_totalPomodorosCompleted");
            
            // Reset in-memory variables to defaults
            customTimes = { ...defaultTimes };
            currentTheme = "dark";
            currentBgImage = "";
            currentBgColor = "#1e1e1e";
            currentBtnColor = "#f04e4e";
            isAutoMode = false;
            requireCycleConfirmation = true;
            pomodoroInfoShown = false;
            currentYoutubeLink = "";
            // pomodorosCompletedSession = 0; // Or keep them if preferred
            // totalPomodorosCompleted = 0;
            
            loadSettings(); // Reload and re-apply everything except total count and tasks
            closeModal(settingsModal, settingsOverlay);
        }
    });

    // --- Initial Load ---
    loadSettings(); 
    Notification.requestPermission();

});

