let faceApi;
let detections = [];
let video;

//Theme colors for each emotion
const emotionColors = {
  neutral: "#ffffff",     
  happy: "#ffdc13ff",    
  angry: "#a00c0cff",    
  sad: "#868686ff",       
  disgusted: "#2a6e19ff", 
  surprised: "#ff89b8ff", 
  fearful: "#6e337aff"    
};

// Emotion to folder mapping 
const emotionToFolderMap = {
  neutral: 1,
  happy: 2,
  sad: 3,
  angry: 4,
  disgusted: 5,
  fearful: 6,
  surprised: 7
};

// Current and target UI state (default setting)
let currentEmotion = "neutral";
let targetEmotion = "neutral";
let emotionCounts = {
  neutral: 0,
  happy: 0,
  angry: 0,
  sad: 0,
  disgusted: 0,
  surprised: 0,
  fearful: 0
};

// For smooth transitions 
let transitionProgress = 0;
const TRANSITION_SPEED = 0.02; 
let lastUpdateTime = 0;
const UPDATE_INTERVAL = 1000; 

// Mood detection control
let isDetectionActive = true;

function setup() {
  video = createCapture(VIDEO);
  video.size(320, 240);
  video.hide();
  
  // hide unwanted canvas for camera
  createCanvas(320, 240).hide();
  
  const faceOptions = {
    withLandmarks: true,
    withExpressions: true,
    withDescriptors: true,
    minConfidence: 0.5
  };

  faceapi = ml5.faceApi(video, faceOptions, faceReady);
  lastUpdateTime = millis();
}

function faceReady() {
  faceapi.detect(gotFaces);
}

function gotFaces(error, result) {
  if (error) {
    console.log(error);
    return;
  }
  detections = result;
  if (isDetectionActive) {
    faceapi.detect(gotFaces);
  }
}

function updateEmotion() {
  // Skip emotion update if detection is paused
  if (!isDetectionActive) {
    console.log("Mood detection paused (music is playing)");
    return;
  }
  
  if (detections.length > 0) {
    let {neutral, happy, angry, sad, disgusted, surprised, fearful} = detections[0].expressions;
    
    let maxVal = neutral;
    let frameEmotion = "neutral";
    
    const emotions = [
      {name: "happy", value: happy},
      {name: "angry", value: angry},
      {name: "sad", value: sad},
      {name: "disgusted", value: disgusted},
      {name: "surprised", value: surprised},
      {name: "fearful", value: fearful},
      {name: "neutral", value: neutral}
    ];
    
    emotions.forEach(emotion => {
      if (emotion.value > maxVal) {
        maxVal = emotion.value;
        frameEmotion = emotion.name;
      }
    });

    emotionCounts[frameEmotion]++;
    
    const currentTime = millis();
    if (currentTime - lastUpdateTime > UPDATE_INTERVAL) {
      // Find highes number of emotion detected
      let maxCount = 0;
      let newTargetEmotion = targetEmotion;
      
      for (let emotion in emotionCounts) {
        if (emotionCounts[emotion] > maxCount) {
          maxCount = emotionCounts[emotion];
          newTargetEmotion = emotion;
        }
      }

      if (newTargetEmotion !== targetEmotion && maxCount > 3) {
        targetEmotion = newTargetEmotion;
        console.log("Target emotion changed to:", targetEmotion);
        transitionProgress = 0;
        
        // Trigger folder change when emotion changes
        triggerFolderChangeForEmotion(targetEmotion);
      }
      
      // Reset counts for next period
      for (let emotion in emotionCounts) {
        emotionCounts[emotion] = 0;
      }
      
      lastUpdateTime = currentTime;
    }
    
    // Check if the detection is working in console
    console.log(`Current: ${currentEmotion} | Target: ${targetEmotion} | Progress: ${Math.round(transitionProgress * 100)}%`);
  }
}

function triggerFolderChangeForEmotion(emotion) {
  const folderId = emotionToFolderMap[emotion];
  
  if (folderId && typeof window.selectFolder === 'function') {
    const currentFolder = window.currentFolderId || 1;
    
    // Only change if it's a different folder
    if (folderId !== currentFolder) {
      console.log(`Emotion detected: ${emotion}, changing to folder ${folderId}`);
      
      // Check if music is playing
      const isMusicPlaying = window.isPlaying || false;
      
      if (!isMusicPlaying) {
        // No music playing, change folder immediately
        console.log(`Changing to folder ${folderId} (no music playing)`);
        window.selectFolder(folderId);
      } else {
        // Music is playing, just log - folder change will happen after song ends
        console.log(`Music is playing, folder change to ${folderId} will happen after current song`);
      }
    }
  }
}

// Smoothly transition UI theme colors
function smoothTransition() {
  if (currentEmotion !== targetEmotion) {
    transitionProgress += TRANSITION_SPEED;
    
    if (transitionProgress >= 1) {
      transitionProgress = 1;
      currentEmotion = targetEmotion;
    }
    const currentColor = emotionColors[currentEmotion];
    const targetColor = emotionColors[targetEmotion];

    if (transitionProgress < 1) {
      const blendedColor = interpolateColor(currentColor, targetColor, transitionProgress);
      updateUITheme(blendedColor, targetEmotion);
    } else {
      updateUITheme(targetColor, targetEmotion);
    }
  } else if (transitionProgress === 1) {
    updateUITheme(emotionColors[currentEmotion], currentEmotion);
  }
}

function interpolateColor(color1, color2, factor) {
  const c1 = hexToRgb(color1);
  const c2 = hexToRgb(color2);
  const r = Math.round(c1.r + (c2.r - c1.r) * factor);
  const g = Math.round(c1.g + (c2.g - c1.g) * factor);
  const b = Math.round(c1.b + (c2.b - c1.b) * factor);
  
  return rgbToHex(r, g, b);
}

function hexToRgb(hex) {
  hex = hex.replace(/^#/, '');
  
  const bigint = parseInt(hex, 16);
  return {
    r: (bigint >> 16) & 255,
    g: (bigint >> 8) & 255,
    b: bigint & 255
  };
}

function rgbToHex(r, g, b) {
  return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}

function updateUITheme(color, emotion) {
  // Update CSS variables for smooth transitions
  document.documentElement.style.setProperty('--theme-color', color);
  document.documentElement.style.setProperty('--theme-emotion', emotion);
  
  // Apply theme to specific elements
  applyThemeToElements(color, emotion);
}

// Apply theme colors to various UI elements
function applyThemeToElements(color, emotion) {
  const header = document.querySelector('.player-header');
  if (header) {
    const darkerColor = darkenColor(color, 20);
    header.style.background = `linear-gradient(135deg, ${color}, ${darkerColor})`;
  }
  const playBtn = document.querySelector('.play-btn');
  if (playBtn) {
    playBtn.style.backgroundColor = color;
    playBtn.style.color = getContrastColor(color);
  }
  const progress = document.querySelector('.progress');
  if (progress) {
    progress.style.backgroundColor = color;
  }
  const activeFolder = document.querySelector('.folder-item.active');
  if (activeFolder) {
    activeFolder.style.backgroundColor = `${color}20`; // 20 = 12% opacity in hex
    activeFolder.style.borderColor = color;
  }
  const playingTrack = document.querySelector('.playlist-item.playing');
  if (playingTrack) {
    playingTrack.style.backgroundColor = `${color}20`;
    playingTrack.style.borderLeftColor = color;
  }
  const volumeSlider = document.getElementById('volumeSlider');
  if (volumeSlider) {
    volumeSlider.style.accentColor = color;
  }
  const dragDropArea = document.getElementById('dragDropArea');
  if (dragDropArea) {
    dragDropArea.style.borderColor = color;
  }
  
  updateFolderIcons(emotion);
}

// Update folder icons based on current emotion
function updateFolderIcons(currentEmotion) {
  document.querySelectorAll('.folder-item').forEach(item => {
    const folderName = item.textContent.trim().toLowerCase();
    const folderIcon = item.querySelector('.folder-icon');
    
    if (folderName.includes(currentEmotion.toLowerCase())) {
      item.style.borderColor = emotionColors[currentEmotion];
      item.style.backgroundColor = `${emotionColors[currentEmotion]}15`; // Very light
      if (folderIcon) {
        folderIcon.style.color = emotionColors[currentEmotion];
        folderIcon.style.opacity = "1";
      }
    } else if (!item.classList.contains('active')) {
      item.style.borderColor = "#e0e0e0";
      item.style.backgroundColor = "";
      if (folderIcon) {
        folderIcon.style.color = "";
        folderIcon.style.opacity = "0.7";
      }
    }
  });
}

function darkenColor(color, percent) {
  const rgb = hexToRgb(color);
  const factor = 1 - (percent / 100);
  
  return rgbToHex(
    Math.max(0, Math.floor(rgb.r * factor)),
    Math.max(0, Math.floor(rgb.g * factor)),
    Math.max(0, Math.floor(rgb.b * factor))
  );
}

function getContrastColor(hexColor) {
  const rgb = hexToRgb(hexColor);
  const luminance = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;

  return luminance > 0.5 ? "#000000" : "#ffffff";
}

// Control functions for music player
function pauseDetection() {
  isDetectionActive = false;
  console.log("Mood detection paused");
}

function resumeDetection() {
  isDetectionActive = true;
  console.log("Mood detection resumed");
  
  // Restart face detection if it was stopped
  if (faceapi && !detections) {
    faceapi.detect(gotFaces);
  }
}

function draw() {
  updateEmotion();
  smoothTransition();
}

// Export functions for external control
window.moodDetect = {
  pauseDetection: pauseDetection,
  resumeDetection: resumeDetection,
  getCurrentEmotion: () => currentEmotion,
  getTargetEmotion: () => targetEmotion
};