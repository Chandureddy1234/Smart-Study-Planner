// Smart Study Planner - Working Version

// App Data Storage Keys
const STORAGE_KEYS = {
  goals: "goals",
  sessions: "sessions", 
  settings: "settings",
  streaks: "streaks"
};

// Default Settings
const DEFAULT_SETTINGS = {
  timer: { focus: 25, short: 5 },
  theme: "light",
  autoCycle: true,
  soundOnPhaseChange: true,
  notifOnPhaseChange: false,
  dailyTarget: 120
};

// Initialize localStorage if empty
if (!localStorage.getItem(STORAGE_KEYS.goals)) {
  localStorage.setItem(STORAGE_KEYS.goals, "[]");
}
if (!localStorage.getItem(STORAGE_KEYS.sessions)) {
  localStorage.setItem(STORAGE_KEYS.sessions, "[]");
}
if (!localStorage.getItem(STORAGE_KEYS.settings)) {
  localStorage.setItem(STORAGE_KEYS.settings, JSON.stringify(DEFAULT_SETTINGS));
}
if (!localStorage.getItem(STORAGE_KEYS.streaks)) {
  localStorage.setItem(STORAGE_KEYS.streaks, JSON.stringify({current: 0, best: 0, lastDate: null}));
}

// Load data from localStorage
let goals = JSON.parse(localStorage.getItem(STORAGE_KEYS.goals) || "[]");
let sessions = JSON.parse(localStorage.getItem(STORAGE_KEYS.sessions) || "[]");
let settings = JSON.parse(localStorage.getItem(STORAGE_KEYS.settings) || JSON.stringify(DEFAULT_SETTINGS));
let streaks = JSON.parse(localStorage.getItem(STORAGE_KEYS.streaks) || JSON.stringify({current: 0, best: 0, lastDate: null}));

// Timer state variables
let timerInterval = null;
let focusTotalSec = settings.timer.focus * 60;
let breakTotalSec = settings.timer.short * 60;
let timeLeft = settings.timer.focus * 60;
let isRunning = false;
let timerState = "idle";
let phase = "focus";

// Utility functions
function generateId() {
  return Math.random().toString(36).substr(2, 9);
}

function getTodayDate() {
  return new Date().toISOString().split("T")[0];
}

function showToast(message, type, duration) {
  type = type || "info";
  duration = duration || 3000;
  
  const toast = document.createElement("div");
  toast.style.position = "fixed";
  toast.style.top = "20px";
  toast.style.right = "20px";
  toast.style.zIndex = "1000";
  toast.style.padding = "12px 16px";
  toast.style.borderRadius = "6px";
  toast.style.color = "white";
  toast.style.fontWeight = "500";
  
  if (type === "success") {
    toast.style.background = "#22C55E";
  } else if (type === "error") {
    toast.style.background = "#E74C3C";
  } else {
    toast.style.background = "#333";
  }
  
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(function() { toast.remove(); }, duration);
}

// Navigation function
function showPage(pageId) {
  // Hide all pages
  const pages = document.querySelectorAll(".page");
  for (let i = 0; i < pages.length; i++) {
    pages[i].classList.remove("active");
  }
  
  // Show selected page
  const targetPage = document.getElementById(pageId);
  if (targetPage) {
    targetPage.classList.add("active");
    
    // Refresh page data
    if (pageId === "goalsPage") {
      renderGoals();
    } else if (pageId === "dashboardPage") {
      renderSessions();
      updateKPIs();
      updateStreaks();
      renderWeekTimeline();
    }
  }
}

// Theme management
function applyTheme() {
  const isDark = settings.theme === "dark" || 
    (settings.theme === "auto" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  
  if (isDark) {
    document.body.classList.add("dark");
  } else {
    document.body.classList.remove("dark");
  }
  
  const themeBtn = document.getElementById("themeToggleBtn");
  if (themeBtn) {
    // Sun when dark (to indicate you can switch to light), moon when light
    themeBtn.textContent = isDark ? "☀️" : "🌙";
  }
}

// Goals functions
function renderGoals() {
  const goalList = document.getElementById("goalList");
  if (!goalList) return;
  
  goalList.innerHTML = "";
  
  if (goals.length === 0) {
    goalList.innerHTML = "<li class=\"muted\">No goals yet. Add one above!</li>";
    return;
  }

  for (let i = 0; i < goals.length; i++) {
    const goal = goals[i];
    const li = document.createElement("li");
    
    let deadlineText = "No deadline";
    if (goal.deadline) {
      const date = new Date(goal.deadline);
      if (!isNaN(date.getTime())) {
        deadlineText = "Due " + date.toLocaleDateString();
      }
    }
    
    li.innerHTML = "<div style=\"display: flex; align-items: center; justify-content: space-between; width: 100%;\">" +
      "<div><strong>" + goal.title + "</strong><div class=\"muted\">" + deadlineText + "</div></div>" +
      "<div style=\"display: flex; gap: 8px;\">" +
      "<button class=\"btn-outline\" onclick=\"editGoal('" + goal.id + "')\">Edit</button>" +
      "<button class=\"btn-danger\" onclick=\"deleteGoal('" + goal.id + "')\">Delete</button>" +
      "</div></div>";
    goalList.appendChild(li);
  }
  
  populateQuickGoalSelect();
}

function addGoal() {
  const titleInput = document.getElementById("goalTitle");
  const deadlineInput = document.getElementById("goalDeadline");
  
  if (!titleInput) {
    showToast("Goal form not found", "error");
    return;
  }
  
  const title = titleInput.value.trim();
  const deadline = deadlineInput ? deadlineInput.value : "";
  
  if (!title) {
    showToast("Please enter a goal title", "error");
    titleInput.focus();
    return;
  }
  
  const newGoal = {
    id: generateId(),
    title: title,
    deadline: deadline
  };
  
  goals.push(newGoal);
  localStorage.setItem(STORAGE_KEYS.goals, JSON.stringify(goals));
  
  // Clear form
  const form = document.getElementById("goalForm");
  if (form) form.reset();
  
  renderGoals();
  updateKPIs();
  showToast("Goal added!", "success");
  showPage("goalsPage");
}

function editGoal(goalId) {
  const goal = goals.find(function(g) { return g.id === goalId; });
  if (!goal) {
    showToast("Goal not found", "error");
    return;
  }
  
  const newTitle = prompt("Edit goal title:", goal.title);
  if (newTitle === null) return;
  
  const newDeadline = prompt("Edit deadline (YYYY-MM-DD):", goal.deadline || "");
  if (newDeadline === null) return;
  
  if (!newTitle.trim()) {
    showToast("Title cannot be empty", "error");
    return;
  }
  
  goal.title = newTitle.trim();
  goal.deadline = newDeadline.trim();
  
  localStorage.setItem(STORAGE_KEYS.goals, JSON.stringify(goals));
  renderGoals();
  updateKPIs();
  showToast("Goal updated", "success");
}

function deleteGoal(goalId) {
  if (!confirm("Delete this goal?")) return;
  
  goals = goals.filter(function(goal) { return goal.id !== goalId; });
  localStorage.setItem(STORAGE_KEYS.goals, JSON.stringify(goals));
  renderGoals();
  updateKPIs();
  showToast("Goal deleted", "success");
}

// Sessions functions
function renderSessions() {
  const sessionsList = document.getElementById("todaysSessions");
  if (!sessionsList) return;
  
  const today = getTodayDate();
  const todaySessions = sessions.filter(function(session) { return session.date === today; });
  
  if (todaySessions.length === 0) {
    sessionsList.innerHTML = "<li class=\"muted\">No sessions today. <button id=\"quickAddBtn\" class=\"btn-outline\">+ Add one!</button></li>";
    return;
  }
  
  let html = "";
  for (let i = 0; i < todaySessions.length; i++) {
    const session = todaySessions[i];
    const title = session.title || "Study Session";
    const completeBtn = session.status === "planned" ? 
      "<button onclick=\"completeSession('" + session.id + "')\" class=\"btn-primary\">Complete</button>" : 
      "<span style=\"color: var(--color-success);\">✓ Done</span>";
    
    html += "<li><div style=\"display: flex; align-items: center; justify-content: space-between; width: 100%;\">" +
      "<div><strong>" + title + "</strong><div class=\"muted\">" + session.duration + " min • " + session.status + "</div></div>" +
      "<div style=\"display: flex; gap: 8px;\">" + completeBtn +
      "<button onclick=\"editSession('" + session.id + "')\" class=\"btn-outline\">Edit</button>" +
      "<button onclick=\"deleteSession('" + session.id + "')\" class=\"btn-danger\">Delete</button>" +
      "</div></div></li>";
  }
  sessionsList.innerHTML = html;
}

function completeSession(sessionId) {
  const session = sessions.find(function(s) { return s.id === sessionId; });
  if (session) {
    session.status = "completed";
    localStorage.setItem(STORAGE_KEYS.sessions, JSON.stringify(sessions));
    renderSessions();
    updateStreaks();
    updateKPIs();
    showToast("Session completed!", "success");
  }
}

function editSession(sessionId) {
  const session = sessions.find(function(s) { return s.id === sessionId; });
  if (!session) {
    showToast("Session not found", "error");
    return;
  }
  
  const newTitle = prompt("Edit session title:", session.title || "");
  if (newTitle === null) return;
  
  const newDuration = prompt("Edit duration (minutes):", session.duration || 25);
  if (newDuration === null) return;
  
  const duration = parseInt(newDuration);
  if (!newTitle.trim() || isNaN(duration) || duration <= 0) {
    showToast("Invalid input", "error");
    return;
  }
  
  session.title = newTitle.trim();
  session.duration = duration;
  
  localStorage.setItem(STORAGE_KEYS.sessions, JSON.stringify(sessions));
  renderSessions();
  updateKPIs();
  showToast("Session updated", "success");
}

function deleteSession(sessionId) {
  if (!confirm("Delete this session?")) return;
  
  sessions = sessions.filter(function(session) { return session.id !== sessionId; });
  localStorage.setItem(STORAGE_KEYS.sessions, JSON.stringify(sessions));
  renderSessions();
  updateKPIs();
  showToast("Session deleted", "success");
}

// Timer functions
function updateTimerDisplay() {
  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  
  const clockEl = document.getElementById("timerClock");
  if (clockEl) {
    clockEl.textContent = (minutes < 10 ? "0" : "") + minutes + ":" + (seconds < 10 ? "0" : "") + seconds;
  }
  
  const modeEl = document.getElementById("timerMode");
  if (modeEl) {
    if (timerState === "running") {
      modeEl.textContent = phase === "break" ? "On Break" : "Focusing...";
    } else if (timerState === "paused") {
      modeEl.textContent = phase === "break" ? "Break Paused" : "Paused";
    } else {
      modeEl.textContent = phase === "break" ? "Break Ready" : "Ready to Focus";
    }
  }
  
  // Update progress ring
  const ring = document.querySelector(".ring-progress");
  if (ring && focusTotalSec > 0) {
    const totalTime = phase === "focus" ? focusTotalSec : breakTotalSec;
    const progress = Math.max(0, Math.min(1, timeLeft / totalTime));
    const circumference = 339.292;
    ring.setAttribute("stroke-dashoffset", circumference * (1 - progress));
  }
}

function startTimer() {
  if (isRunning) return;
  
  if (timeLeft <= 0) {
    timeLeft = phase === "focus" ? focusTotalSec : breakTotalSec;
  }
  
  isRunning = true;
  timerState = "running";
  
  const timerSection = document.querySelector(".timer-section");
  if (timerSection && phase === "focus") {
    timerSection.classList.add("focusing");
  }
  
  showToast(phase === "focus" ? "Focus session started" : "Break started");
  
  timerInterval = setInterval(function() {
    timeLeft--;
    if (timeLeft <= 0) {
      timeLeft = 0;
      updateTimerDisplay();
      clearInterval(timerInterval);
      isRunning = false;
      timerState = "idle";
      handlePhaseEnd();
      return;
    }
    updateTimerDisplay();
  }, 1000);
  
  updateTimerDisplay();
}

function pauseTimer() {
  clearInterval(timerInterval);
  isRunning = false;
  timerState = "paused";
  
  const timerSection = document.querySelector(".timer-section");
  if (timerSection) {
    timerSection.classList.remove("focusing");
  }
  
  showToast("Timer paused");
  updateTimerDisplay();
}

function resetTimer() {
  clearInterval(timerInterval);
  isRunning = false;
  timerState = "idle";
  phase = "focus";
  timeLeft = focusTotalSec;
  
  const timerSection = document.querySelector(".timer-section");
  if (timerSection) {
    timerSection.classList.remove("focusing");
    timerSection.classList.remove("break");
  }
  
  showToast("Timer reset");
  updateTimerDisplay();
}

function handlePhaseEnd() {
  const nextPhase = phase === "focus" ? "break" : "focus";
  const message = phase === "focus" ? "Break time!" : "Back to focus!";
  
  if (phase === "focus") {
    updateStreaks();
  }
  
  // Play sound if enabled
  if (settings.soundOnPhaseChange) {
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = 880;
      oscillator.type = "sine";
      
      gainNode.gain.setValueAtTime(0, audioContext.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.2, audioContext.currentTime + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.3);
      
      oscillator.start();
      oscillator.stop(audioContext.currentTime + 0.3);
    } catch (e) {
      console.log("Audio not supported");
    }
  }
  
  // Show notification if enabled
  if (settings.notifOnPhaseChange && "Notification" in window && Notification.permission === "granted") {
    new Notification("Smart Study Planner", { body: message });
  }
  
  // Switch to next phase
  phase = nextPhase;
  timeLeft = nextPhase === "focus" ? focusTotalSec : breakTotalSec;
  
  const timerSection = document.querySelector(".timer-section");
  if (timerSection) {
    timerSection.classList.toggle("break", phase === "break");
  }
  
  updateTimerDisplay();
  
  // Auto-start next phase if enabled
  if (settings.autoCycle) {
    startTimer();
  } else {
    showToast(message);
  }
}

// KPIs and Statistics
function updateStreaks() {
  const today = getTodayDate();
  
  if (streaks.lastDate !== today) {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split("T")[0];
    
    if (streaks.lastDate === yesterdayStr) {
      streaks.current += 1;
    } else {
      streaks.current = 1;
    }
    
    streaks.best = Math.max(streaks.best, streaks.current);
    streaks.lastDate = today;
    localStorage.setItem(STORAGE_KEYS.streaks, JSON.stringify(streaks));
  }
  
  const streakEl = document.getElementById("kpi-streak");
  if (streakEl) {
    streakEl.textContent = streaks.current;
  }
}

function updateKPIs() {
  const today = getTodayDate();
  
  // Todays completed sessions
  const todayCompleted = sessions.filter(function(session) {
    return session.date === today && session.status === "completed";
  });
  
  const totalMinutes = todayCompleted.reduce(function(total, session) {
    return total + (parseInt(session.duration) || 0);
  }, 0);
  
  // Update todays hours
  const hoursEl = document.getElementById("kpi-today-hours");
  if (hoursEl) {
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    if (hours > 0) {
      hoursEl.textContent = hours + "h" + (minutes > 0 ? " " + minutes + "m" : "");
    } else {
      hoursEl.textContent = minutes + "m";
    }
  }
  
  // Goals due soon
  const now = new Date();
  const soonDeadlines = goals.filter(function(goal) {
    if (!goal.deadline) return false;
    const deadline = new Date(goal.deadline);
    const diffTime = deadline - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays >= 0 && diffDays <= 7;
  });
  
  const deadlinesEl = document.getElementById("kpi-deadlines");
  if (deadlinesEl) {
    deadlinesEl.textContent = soonDeadlines.length;
  }
  
  // Daily target progress
  const targetEl = document.getElementById("kpi-focus-target");
  if (targetEl) {
    const target = settings.dailyTarget || 120;
    const progress = Math.min(100, Math.round((totalMinutes / target) * 100));
    targetEl.textContent = progress + "%";
  }
  
  // Average focus time
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const weekAgoStr = weekAgo.toISOString().split("T")[0];
  
  const recentSessions = sessions.filter(function(session) {
    return session.date >= weekAgoStr && session.status === "completed";
  });
  
  const avgEl = document.getElementById("kpi-avg-focus");
  if (avgEl) {
    if (recentSessions.length > 0) {
      const totalMinutes = recentSessions.reduce(function(total, session) {
        return total + (parseInt(session.duration) || 0);
      }, 0);
      const avgMinutes = Math.round(totalMinutes / recentSessions.length);
      avgEl.textContent = avgMinutes + "m";
    } else {
      avgEl.textContent = "—";
    }
  }
  // Flashcards (placeholder until implemented)
  const flashcardsDue = document.getElementById("kpi-flashcards-due");
  if (flashcardsDue) flashcardsDue.textContent = "0";
}

function renderWeekTimeline() {
  const timeline = document.getElementById("weekTimeline");
  if (!timeline) return;
  
  const today = new Date();
  let html = "";
  
  for (let i = 0; i < 7; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);
    const dateStr = date.toISOString().split("T")[0];
    
    const daySessions = sessions.filter(function(session) { return session.date === dateStr; });
    const completedMinutes = daySessions
      .filter(function(session) { return session.status === "completed"; })
      .reduce(function(total, session) { return total + (parseInt(session.duration) || 0); }, 0);
    
    const label = date.toLocaleDateString("en", { weekday: "short" }).toUpperCase();
    const dayNum = date.getDate();
    const isToday = dateStr === getTodayDate();
    const hasSessions = daySessions.length > 0;
    
    html += "<div class=\"week-day" + (isToday ? " today" : "") + (hasSessions ? " has-sessions" : "") + "\"><div class=\"wd-label\">" + label + "</div><div class=\"wd-date\">" + dayNum + "</div><div class=\"wd-count\">" + completedMinutes + "m</div><div class=\"wd-progress\" style=\"width: " + Math.min(100, (completedMinutes / 60) * 100) + "%\"></div></div>";
  }
  
  timeline.innerHTML = html;
}

// Modal functions
function showQuickAdd() {
  const modal = document.getElementById("quickAddModal");
  if (modal) {
    populateQuickGoalSelect();
    modal.setAttribute("aria-hidden", "false");
    
    const goalSelect = modal.querySelector("#quickGoalSelect");
    if (goalSelect) goalSelect.focus();
  }
}

function populateQuickGoalSelect() {
  const select = document.getElementById("quickGoalSelect");
  if (!select) return;
  
  select.innerHTML = "<option value=\"\">Choose a goal...</option>";
  
  for (let i = 0; i < goals.length; i++) {
    const goal = goals[i];
    const option = document.createElement("option");
    option.value = goal.id;
    option.textContent = goal.title;
    select.appendChild(option);
  }
}

// Initialize the app
function initializeApp() {
  // Set up settings form
  const focusSelect = document.getElementById("setFocus");
  const shortSelect = document.getElementById("setShort");
  const themeSelect = document.getElementById("themeSelect");
  const autoCycleToggle = document.getElementById("autoCycleToggle");
  const soundToggle = document.getElementById("soundToggle");
  const notifToggle = document.getElementById("notifToggle");
  
  if (focusSelect) focusSelect.value = settings.timer.focus;
  if (shortSelect) shortSelect.value = settings.timer.short;
  if (themeSelect) themeSelect.value = settings.theme;
  if (autoCycleToggle) autoCycleToggle.checked = settings.autoCycle;
  if (soundToggle) soundToggle.checked = settings.soundOnPhaseChange;
  if (notifToggle) notifToggle.checked = settings.notifOnPhaseChange;
  // Pre-fill daily target input
  const targetInput = document.getElementById("focusTargetInput");
  if (targetInput && settings.dailyTarget) targetInput.value = settings.dailyTarget;
  // Indicate API key presence (do not show key)
  if (localStorage.getItem('geminiApiKey')) {
    const apiInput = document.getElementById('geminiApiKey');
    if (apiInput) apiInput.placeholder = 'Key saved (hidden)';
  }
  
  applyTheme();
  updateTimerDisplay();
  showPage("dashboardPage");
  
  console.log("Smart Study Planner initialized");
}

// Event listeners setup
document.addEventListener("DOMContentLoaded", function() {
  // Navigation
  const navButtons = document.querySelectorAll("nav button[data-page]");
  for (let i = 0; i < navButtons.length; i++) {
    navButtons[i].addEventListener("click", function() {
      showPage(this.dataset.page);
    });
  }
  
  // Theme toggle
  const themeToggle = document.getElementById("themeToggleBtn");
  if (themeToggle) {
    themeToggle.addEventListener("click", function() {
      settings.theme = settings.theme === "dark" ? "light" : "dark";
      localStorage.setItem(STORAGE_KEYS.settings, JSON.stringify(settings));
      applyTheme();
      showToast("Theme: " + settings.theme, "success");
    });
  }
  
  // Goal form
  const goalForm = document.getElementById("goalForm");
  if (goalForm) {
    goalForm.addEventListener("submit", function(e) {
      e.preventDefault();
      addGoal();
    });
  }
  
  // Quick add button (delegated)
  document.addEventListener("click", function(e) {
    if (e.target.id === "quickAddBtn") {
      showQuickAdd();
    }
  });
  
  // Timer controls
  const startBtn = document.getElementById("startTimerBtn");
  const pauseBtn = document.getElementById("pauseTimerBtn");
  const resetBtn = document.getElementById("resetTimerBtn");
  
  if (startBtn) startBtn.addEventListener("click", startTimer);
  if (pauseBtn) pauseBtn.addEventListener("click", pauseTimer);
  if (resetBtn) resetBtn.addEventListener("click", resetTimer);
  
  // Modal close
  const closeModalBtn = document.getElementById("closeQuickAddBtn");
  if (closeModalBtn) {
    closeModalBtn.addEventListener("click", function() {
      const modal = document.getElementById("quickAddModal");
      if (modal) modal.setAttribute("aria-hidden", "true");
    });
  }
  
  // Quick session form
  const quickSessionForm = document.getElementById("quickSessionForm");
  if (quickSessionForm) {
    quickSessionForm.addEventListener("submit", function(e) {
      e.preventDefault();
      
      const goalId = document.getElementById("quickGoalSelect").value;
      const duration = parseInt(document.getElementById("quickDuration").value);
      const technique = document.getElementById("quickTechnique").value;
      
      if (!goalId) {
        showToast("Please select a goal", "error");
        return;
      }
      
      const newSession = {
        id: generateId(),
        goalId: goalId,
        date: getTodayDate(),
        duration: duration,
        technique: technique,
        status: "planned",
        title: technique
      };
      
      sessions.push(newSession);
      localStorage.setItem(STORAGE_KEYS.sessions, JSON.stringify(sessions));
      
      const modal = document.getElementById("quickAddModal");
      if (modal) modal.setAttribute("aria-hidden", "true");
      
      renderSessions();
      updateKPIs();
      showToast("Session added!", "success");
    });
  }
  
  // Settings save
  const saveSettingsBtn = document.getElementById("saveSettingsBtn");
  if (saveSettingsBtn) {
    saveSettingsBtn.addEventListener("click", function() {
      const focusTime = parseInt(document.getElementById("setFocus").value);
      const breakTime = parseInt(document.getElementById("setShort").value);
      
      if (focusTime && breakTime) {
        settings.timer.focus = focusTime;
        settings.timer.short = breakTime;
        localStorage.setItem(STORAGE_KEYS.settings, JSON.stringify(settings));
        
        focusTotalSec = focusTime * 60;
        breakTotalSec = breakTime * 60;
        phase = "focus";
        timeLeft = focusTotalSec;
        timerState = "idle";
        updateTimerDisplay();
        
        showToast("Timer settings saved!", "success");
      }
    });
  }
  
  const saveFocusTargetBtn = document.getElementById("saveFocusTargetBtn");
  if (saveFocusTargetBtn) {
    saveFocusTargetBtn.addEventListener("click", function() {
      const target = parseInt(document.getElementById("focusTargetInput").value);
      if (target && target >= 15) {
        settings.dailyTarget = target;
        localStorage.setItem(STORAGE_KEYS.settings, JSON.stringify(settings));
        updateKPIs();
        showToast("Daily target saved!", "success");
      } else {
        showToast("Enter valid target (15+ min)", "error");
      }
    });
  }
  
  // Notifications
  const enableNotifsBtn = document.getElementById("enableNotifsBtn");
  if (enableNotifsBtn) {
    enableNotifsBtn.addEventListener("click", function() {
      if ("Notification" in window) {
        Notification.requestPermission().then(function(permission) {
          const status = document.getElementById("notifStatus");
          if (status) {
            status.textContent = permission === "granted" ? "Enabled" : "Denied";
          }
          showToast(
            permission === "granted" ? "Notifications enabled!" : "Notifications denied",
            permission === "granted" ? "success" : "error"
          );
        });
      } else {
        showToast("Notifications not supported", "error");
      }
    });
  }
  
  // Data export
  const exportBtn = document.getElementById("exportBtn");
  if (exportBtn) {
    exportBtn.addEventListener("click", function() {
      const data = {
        goals: goals,
        sessions: sessions,
        settings: settings,
        streaks: streaks
      };
      
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "study-planner-backup-" + getTodayDate() + ".json";
      a.click();
      URL.revokeObjectURL(url);
      
      showToast("Data exported!", "success");
    });
  }
  
  // Data import
  const importBtn = document.getElementById("importBtn");
  const importFile = document.getElementById("importFile");
  if (importBtn && importFile) {
    importBtn.addEventListener("click", function() {
      importFile.click();
    });
    
    importFile.addEventListener("change", function(e) {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
          try {
            const data = JSON.parse(e.target.result);
            
            goals = data.goals || [];
            sessions = data.sessions || [];
            settings = Object.assign({}, DEFAULT_SETTINGS, data.settings);
            streaks = data.streaks || {current: 0, best: 0, lastDate: null};
            
            localStorage.setItem(STORAGE_KEYS.goals, JSON.stringify(goals));
            localStorage.setItem(STORAGE_KEYS.sessions, JSON.stringify(sessions));
            localStorage.setItem(STORAGE_KEYS.settings, JSON.stringify(settings));
            localStorage.setItem(STORAGE_KEYS.streaks, JSON.stringify(streaks));
            
            renderGoals();
            renderSessions();
            updateKPIs();
            updateStreaks();
            renderWeekTimeline();
            
            focusTotalSec = settings.timer.focus * 60;
            breakTotalSec = settings.timer.short * 60;
            phase = "focus";
            timeLeft = focusTotalSec;
            timerState = "idle";
            updateTimerDisplay();
            
            showToast("Data imported!", "success");
          } catch (error) {
            showToast("Invalid backup file", "error");
          }
        };
        reader.readAsText(file);
      }
    });
  }
  
  // Clear data
  const clearDataBtn = document.getElementById("clearDataBtn");
  if (clearDataBtn) {
    clearDataBtn.addEventListener("click", function() {
      if (confirm("Delete all data? This cannot be undone.")) {
        localStorage.clear();
        location.reload();
      }
    });
  }
  
  // Theme select
  const themeSelect = document.getElementById("themeSelect");
  if (themeSelect) {
    themeSelect.addEventListener("change", function(e) {
      settings.theme = e.target.value;
      localStorage.setItem(STORAGE_KEYS.settings, JSON.stringify(settings));
      applyTheme();
    });
  }
  
  // Setting toggles
  const autoCycleToggle = document.getElementById("autoCycleToggle");
  if (autoCycleToggle) {
    autoCycleToggle.addEventListener("change", function(e) {
      settings.autoCycle = e.target.checked;
      localStorage.setItem(STORAGE_KEYS.settings, JSON.stringify(settings));
    });
  }
  
  const soundToggle = document.getElementById("soundToggle");
  if (soundToggle) {
    soundToggle.addEventListener("change", function(e) {
      settings.soundOnPhaseChange = e.target.checked;
      localStorage.setItem(STORAGE_KEYS.settings, JSON.stringify(settings));
    });
  }
  
  const notifToggle = document.getElementById("notifToggle");
  if (notifToggle) {
    notifToggle.addEventListener("change", function(e) {
      settings.notifOnPhaseChange = e.target.checked;
      localStorage.setItem(STORAGE_KEYS.settings, JSON.stringify(settings));
      
      if (settings.notifOnPhaseChange && "Notification" in window && Notification.permission !== "granted") {
        Notification.requestPermission();
      }
    });
  }
  
  // Auto theme detection
  if (window.matchMedia) {
    window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", applyTheme);
  }
  
  // Initialize the app
  initializeApp();

  // API Key save handler
  const saveApiKeyBtn = document.getElementById('saveApiKeyBtn');
  if (saveApiKeyBtn) {
    saveApiKeyBtn.addEventListener('click', () => {
      const apiInput = document.getElementById('geminiApiKey');
      if (!apiInput) return;
      const val = apiInput.value.trim();
      if (!val) {
        showToast('Enter an API key first', 'error');
        return;
      }
      localStorage.setItem('geminiApiKey', val);
      apiInput.value = '';
      apiInput.placeholder = 'Key saved (hidden)';
      showToast('API key saved locally', 'success');
    });
  }
});

// Global functions for onclick handlers (HTML compatibility)
window.showPage = showPage;
window.showQuickAdd = showQuickAdd;
window.editGoal = editGoal;
window.deleteGoal = deleteGoal;
window.completeSession = completeSession;
window.editSession = editSession;
window.deleteSession = deleteSession;
window.startTimer = startTimer;
window.pauseTimer = pauseTimer;
window.resetTimer = resetTimer;
