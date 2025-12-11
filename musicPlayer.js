const folderToggleBtn = document.getElementById('folderToggleBtn');
const folderPanel = document.getElementById('folderPanel');
const overlay = document.getElementById('overlay');
const closeFolderPanelBtn = document.getElementById('closeFolderPanel');
const folderListElement = document.getElementById('folderList');
const dragDropArea = document.getElementById('dragDropArea');
const fileInput = document.getElementById('fileInput');
const playlistElement = document.getElementById('playlist');
const trackTitleElement = document.getElementById('trackTitle');
const trackArtistElement = document.getElementById('trackArtist');
const playPauseBtn = document.getElementById('playPauseBtn');
const playIcon = document.getElementById('playIcon');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const progressElement = document.getElementById('progress');
const progressBar = document.getElementById('progressBar');
const currentTimeElement = document.getElementById('currentTime');
const durationElement = document.getElementById('duration');
const volumeSlider = document.getElementById('volumeSlider');

// Define folders with their names and icons
const folders = [
    { id: 1, name: "Neutral", icon: "🙂"},
    { id: 2, name: "Happy", icon: "😄"},
    { id: 3, name: "Sad", icon: "😭" },
    { id: 4, name: "Angry", icon: "😡"},
    { id: 5, name: "Disgusted", icon: "🤢"},
    { id: 6, name: "Fearful", icon: "😱" },
    { id: 7, name: "Surprised", icon: "😆" }
];

// Store tracks for each folder with file objects
let tracks = {
    1: [], 2: [], 3: [],  4: [],  5: [], 6: [], 7: []
};

// Current player state
const audioPlayer = document.getElementById('audioPlayer');
let currentFolderId = null;
let currentTrackIndex = null;
let isPlaying = false;
let currentVolume = 0.5;
let allTracks = []; 
let objectURLs = {};

// Initialize the app
function initializeApp() {
    renderFolders();
    setupEventListeners();
    updatePlaylist();
    
    // Set initial volume
    audioPlayer.volume = currentVolume;
    
    // Auto-select first folder
    selectFolder(1);
    
    // Expose functions to global scope for moodDetect.js to access
    window.selectFolder = selectFolder;
    window.playTrack = playTrack;
    window.updatePlaylist = updatePlaylist;
    window.currentFolderId = currentFolderId;
    window.allTracks = allTracks;
    window.isPlaying = isPlaying;
    window.trackTitleElement = trackTitleElement;
    window.trackArtistElement = trackArtistElement;
}

// Render folder list
function renderFolders() {
    folderListElement.innerHTML = '';
    
    folders.forEach(folder => {
        const folderItem = document.createElement('div');
        folderItem.className = 'folder-item';
        folderItem.innerHTML = `
            <span class="folder-icon">${folder.icon}</span>
            ${folder.name}
            <span class="track-count">${tracks[folder.id].length}</span>
        `;
        folderItem.dataset.folderId = folder.id;
        
        // Add click event to select folder
        folderItem.addEventListener('click', () => {selectFolder(folder.id);});
        
        folderListElement.appendChild(folderItem);
    });
}

// Select a folder
function selectFolder(folderId) {
    currentFolderId = folderId;
    
    // Update UI
    document.querySelectorAll('.folder-item').forEach(item => {
        item.classList.remove('active');
        if (parseInt(item.dataset.folderId) === folderId) {
            item.classList.add('active');
        }
    });
    
    // Update folder track counts
    updateFolderTrackCounts();
    
    // Update playlist to show only tracks from this folder
    updatePlaylist();
    
    // Reset current track selection if it's not from this folder
    if (currentTrackIndex !== null) {
        const currentTrack = allTracks[currentTrackIndex];
        if (currentTrack.folderId !== currentFolderId) {
            currentTrackIndex = null;
            trackTitleElement.textContent = 'No Track Selected';
            trackArtistElement.textContent = 'Select a track to play';
            
            // Clear audio source
            audioPlayer.src = '';
            
            // Update play button
            updatePlayButton();
        }
    }
    
    console.log(`Selected ${folders.find(f => f.id === folderId)?.name} folder`);
}

// Update track count badges
function updateFolderTrackCounts() {
    document.querySelectorAll('.folder-item').forEach(item => {
        const folderId = parseInt(item.dataset.folderId);
        const trackCount = tracks[folderId].length;
        item.querySelector('.track-count').textContent = trackCount;
    });
}

// Toggle folder panel
function toggleFolderPanel() {
    folderPanel.classList.toggle('show');
    overlay.classList.toggle('show');
    
    // Prevent body scrolling when panel is open
    if (folderPanel.classList.contains('show')) {
        document.body.style.overflow = 'hidden';
    } else {
        document.body.style.overflow = 'auto';
    }
}

// Add a track to a folder
function addTrackToFolder(folderId, file, title, artist, duration) {
    // Create object URL for the file
    const objectURL = URL.createObjectURL(file);
    
    const trackId = Date.now() + Math.random(); 
    const newTrack = {
        id: trackId,
        title: title,
        artist: artist,
        duration: duration,
        folderId: folderId,
        file: file,
        objectURL: objectURL
    };
    
    tracks[folderId].push(newTrack);
    allTracks.push(newTrack);
    
    // Store object URL for cleanup
    objectURLs[trackId] = objectURL;
    
    updateFolderTrackCounts();
    
    // Only update playlist if this track belongs to the current folder
    if (folderId === currentFolderId) {
        updatePlaylist();
    }
    
    return newTrack;
}

// Update playlist display - only show tracks from current folder
function updatePlaylist() {
    playlistElement.innerHTML = '';
    
    // Get tracks only from the current folder
    const currentFolderTracks = allTracks.filter(track => track.folderId === currentFolderId);
    
    if (currentFolderTracks.length === 0) {
        playlistElement.innerHTML = `
            <div class="text-center text-muted py-4">
                No tracks in ${folders.find(f => f.id === currentFolderId)?.name || 'this'} folder
            </div>
        `;
        return;
    }
    
    // We need to map the current folder track indices to allTracks indices
    const trackIndices = currentFolderTracks.map(track => 
        allTracks.findIndex(t => t.id === track.id)
    );
    
    currentFolderTracks.forEach((track, localIndex) => {
        const allTracksIndex = trackIndices[localIndex];
        const folder = folders.find(f => f.id === track.folderId);
        const folderIcon = folder ? folder.icon : '📁';
        
        const playlistItem = document.createElement('div');
        playlistItem.className = 'playlist-item';
        
        // Check if this track is currently playing
        if (currentTrackIndex === allTracksIndex) {
            playlistItem.classList.add('playing');
        }
        
        // Build inner HTML
        playlistItem.innerHTML = `
            <div class="d-flex justify-content-between align-items-center">
                <div>
                    <div class="d-flex align-items-center">
                        <span class="me-2">${folderIcon}</span>
                        <div>
                            <div class="fw-medium">${track.title}</div>
                            <small class="text-muted">${track.artist}</small>
                        </div>
                    </div>
                </div>
                <div>
                    <span class="badge bg-light text-dark">${track.duration}</span>
                </div>
            </div>
        `;
        
        playlistItem.dataset.trackIndex = allTracksIndex;
        
        playlistItem.addEventListener('click', () => {
            selectTrackFromPlaylist(allTracksIndex);
        });
        
        playlistElement.appendChild(playlistItem);
    });
}

// Select a track from playlist
function selectTrackFromPlaylist(trackIndex) {
    if (trackIndex < 0 || trackIndex >= allTracks.length) return;
    
    const track = allTracks[trackIndex];
    currentTrackIndex = trackIndex;
    
    // Update UI
    updatePlaylist();
    
    // Update now playing info
    trackTitleElement.textContent = track.title;
    trackArtistElement.textContent = track.artist;
    
    // Use the object URL from the uploaded file
    if (track.objectURL) {
        audioPlayer.src = track.objectURL;
    } else {
        console.error("No object URL found for track");
        return;
    }
    
    // DON'T auto-play - just update the play button
    updatePlayButton();
}

// Play the current track
function playTrack() {
    if (currentTrackIndex === null) return;
    
    // If audio source is not set, set it first
    if (!audioPlayer.src && allTracks[currentTrackIndex]?.objectURL) {
        audioPlayer.src = allTracks[currentTrackIndex].objectURL;
    }
    
    // Check if we have a valid source
    if (!audioPlayer.src || audioPlayer.src === '') {
        console.log("No audio source available");
        return;
    }
    
    audioPlayer.play().then(() => {
        isPlaying = true;
        updatePlayButton();
        
        // Pause mood detection when music starts playing
        if (window.moodDetect && typeof window.moodDetect.pauseDetection === 'function') {
            window.moodDetect.pauseDetection();
        }
        
        console.log("Playing track, mood detection paused");
    }).catch(error => {
        console.log("Error playing audio:", error);
    });
}

// Pause the current track
function pauseTrack() {
    audioPlayer.pause();
    isPlaying = false;
    updatePlayButton();
    
    // Resume mood detection when music is paused
    if (window.moodDetect && typeof window.moodDetect.resumeDetection === 'function') {
        window.moodDetect.resumeDetection();
    }
    
    console.log("Track paused, mood detection resumed");
}

// Update play button
function updatePlayButton() {
    if (isPlaying) {
        playIcon.className = "bi bi-pause"; // Change to pause icon
        playPauseBtn.title = "Pause";
    } else {
        playIcon.className = "bi bi-play"; // Change to play icon
        playPauseBtn.title = "Play";
    }
}

// Select next track in current folder (without auto-playing)
function playNextTrack() {
    // Get tracks only from current folder
    const currentFolderTracks = allTracks.filter(track => track.folderId === currentFolderId);
    
    if (currentFolderTracks.length === 0) {
        console.log(`No tracks in ${folders.find(f => f.id === currentFolderId)?.name} folder`);
        return;
    }
    
    if (currentTrackIndex === null) {
        // Select first track in current folder
        const firstTrack = currentFolderTracks[0];
        currentTrackIndex = allTracks.findIndex(t => t.id === firstTrack.id);
        
        // Update UI
        updatePlaylist();
        trackTitleElement.textContent = firstTrack.title;
        trackArtistElement.textContent = firstTrack.artist;
        
        if (firstTrack.objectURL) {
            audioPlayer.src = firstTrack.objectURL;
        }
        
        updatePlayButton();
    } else {
        // Get current track
        const currentTrack = allTracks[currentTrackIndex];
        
        // If current track is not from this folder, select first track in folder
        if (currentTrack.folderId !== currentFolderId) {
            const firstTrack = currentFolderTracks[0];
            currentTrackIndex = allTracks.findIndex(t => t.id === firstTrack.id);
            
            // Update UI
            updatePlaylist();
            trackTitleElement.textContent = firstTrack.title;
            trackArtistElement.textContent = firstTrack.artist;
            
            if (firstTrack.objectURL) {
                audioPlayer.src = firstTrack.objectURL;
            }
            
            updatePlayButton();
            return;
        }
        
        // Find index within current folder tracks
        const currentFolderIndex = currentFolderTracks.findIndex(t => t.id === currentTrack.id);
        
        // Calculate next index (loop back to start if at end)
        let nextFolderIndex = currentFolderIndex + 1;
        if (nextFolderIndex >= currentFolderTracks.length) {
            nextFolderIndex = 0;
        }
        
        // Get next track
        const nextTrack = currentFolderTracks[nextFolderIndex];
        currentTrackIndex = allTracks.findIndex(t => t.id === nextTrack.id);
        
        // Update UI
        updatePlaylist();
        trackTitleElement.textContent = nextTrack.title;
        trackArtistElement.textContent = nextTrack.artist;
        
        if (nextTrack.objectURL) {
            audioPlayer.src = nextTrack.objectURL;
        }
        
        updatePlayButton();
    }
}

// Select previous track in current folder (without auto-playing)
function playPreviousTrack() {
    // Get tracks only from current folder
    const currentFolderTracks = allTracks.filter(track => track.folderId === currentFolderId);
    
    if (currentFolderTracks.length === 0) {
        console.log(`No tracks in ${folders.find(f => f.id === currentFolderId)?.name} folder`);
        return;
    }
    
    if (currentTrackIndex === null) {
        // Select last track in current folder
        const lastTrack = currentFolderTracks[currentFolderTracks.length - 1];
        currentTrackIndex = allTracks.findIndex(t => t.id === lastTrack.id);
        
        // Update UI
        updatePlaylist();
        trackTitleElement.textContent = lastTrack.title;
        trackArtistElement.textContent = lastTrack.artist;
        
        if (lastTrack.objectURL) {
            audioPlayer.src = lastTrack.objectURL;
        }
        
        updatePlayButton();
    } else {
        // Get current track
        const currentTrack = allTracks[currentTrackIndex];
        
        // If current track is not from this folder, select last track in folder
        if (currentTrack.folderId !== currentFolderId) {
            const lastTrack = currentFolderTracks[currentFolderTracks.length - 1];
            currentTrackIndex = allTracks.findIndex(t => t.id === lastTrack.id);
            
            // Update UI
            updatePlaylist();
            trackTitleElement.textContent = lastTrack.title;
            trackArtistElement.textContent = lastTrack.artist;
            
            if (lastTrack.objectURL) {
                audioPlayer.src = lastTrack.objectURL;
            }
            
            updatePlayButton();
            return;
        }
        
        // Find index within current folder tracks
        const currentFolderIndex = currentFolderTracks.findIndex(t => t.id === currentTrack.id);
        
        // Calculate previous index (loop to end if at start)
        let prevFolderIndex = currentFolderIndex - 1;
        if (prevFolderIndex < 0) {
            prevFolderIndex = currentFolderTracks.length - 1;
        }
        
        // Get previous track
        const prevTrack = currentFolderTracks[prevFolderIndex];
        currentTrackIndex = allTracks.findIndex(t => t.id === prevTrack.id);
        
        // Update UI
        updatePlaylist();
        trackTitleElement.textContent = prevTrack.title;
        trackArtistElement.textContent = prevTrack.artist;
        
        if (prevTrack.objectURL) {
            audioPlayer.src = prevTrack.objectURL;
        }
        
        updatePlayButton();
    }
}

// Update progress bar
function updateProgress() {
    if (!isNaN(audioPlayer.duration) && audioPlayer.duration > 0) {
        const progressPercent = (audioPlayer.currentTime / audioPlayer.duration) * 100;
        progressElement.style.width = `${progressPercent}%`;
        
        // Update time displays
        currentTimeElement.textContent = formatTime(audioPlayer.currentTime);
        durationElement.textContent = formatTime(audioPlayer.duration);
    }
}

// Format time in MM:SS
function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

// Get duration from audio file
function getAudioDuration(file) {
    return new Promise((resolve) => {
        const audio = new Audio();
        audio.src = URL.createObjectURL(file);
        
        audio.addEventListener('loadedmetadata', () => {
            const duration = audio.duration;
            URL.revokeObjectURL(audio.src);
            resolve(duration);
        });
        
        audio.addEventListener('error', () => {
            resolve(0); // Default to 0 if can't get duration
        });
    });
}

// Set progress when user clicks on progress bar
function setProgress(e) {
    const progressBarRect = progressBar.getBoundingClientRect();
    const clickPosition = e.clientX - progressBarRect.left;
    const progressBarWidth = progressBarRect.width;
    const percentage = clickPosition / progressBarWidth;
    
    if (!isNaN(audioPlayer.duration)) {
        audioPlayer.currentTime = percentage * audioPlayer.duration;
    }
}

// Handle file drop
async function handleFileDrop(e) {
    e.preventDefault();
    dragDropArea.classList.remove('dragover');
    
    // Auto-select first folder if none selected
    if (currentFolderId === null) {
        selectFolder(1); // Auto-select first folder
    }
    
    const files = e.dataTransfer.files;
    await handleFiles(files);
}

// Handle file selection
async function handleFiles(files) {
    // Auto-select first folder if none selected
    if (currentFolderId === null) {
        selectFolder(1); // Auto-select first folder
    }
    
    let addedCount = 0;
    
    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        // Check if it's an audio file
        if (file.type.startsWith('audio/') || file.name.toLowerCase().endsWith('.mp3')) {
            // Extract filename without extension for title
            const fileName = file.name.replace(/\.[^/.]+$/, "");
            
            // Get audio duration
            const durationSeconds = await getAudioDuration(file);
            const durationFormatted = formatTime(durationSeconds);
            
            // Add track to folder with the actual file
            addTrackToFolder(
                currentFolderId,
                file,
                fileName,
                "Unknown Artist",
                durationFormatted
            );
            
            addedCount++;
            
            console.log(`Added file to folder ${currentFolderId}: ${file.name}`);
        }
    }
    
    if (addedCount > 0) {
        console.log(`Added ${addedCount} track(s) to folder`);
        
        // Just update the UI 
        updatePlaylist();
    } else {
        console.log("No valid audio files found");
    }
}

// Setup event listeners
function setupEventListeners() {
    // Folder panel toggle
    folderToggleBtn.addEventListener('click', toggleFolderPanel);
    closeFolderPanelBtn.addEventListener('click', toggleFolderPanel);
    overlay.addEventListener('click', toggleFolderPanel);
    
    // Play/Pause button
    playPauseBtn.addEventListener('click', () => {
        if (currentTrackIndex === null) {
            // If no track selected, select first track from current folder
            const currentFolderTracks = allTracks.filter(track => track.folderId === currentFolderId);
            
            if (currentFolderTracks.length > 0) {
                const firstTrack = currentFolderTracks[0];
                currentTrackIndex = allTracks.findIndex(t => t.id === firstTrack.id);
                
                // Update UI
                updatePlaylist();
                trackTitleElement.textContent = firstTrack.title;
                trackArtistElement.textContent = firstTrack.artist;
                
                // Set audio source
                if (firstTrack.objectURL) {
                    audioPlayer.src = firstTrack.objectURL;
                }
                
                // Update play button
                updatePlayButton();
                console.log("Selected first track from current folder");
            } else {
                console.log(`No tracks in ${folders.find(f => f.id === currentFolderId)?.name} folder`);
            }
            return;
        }
        
        if (isPlaying) {
            pauseTrack();
        } else {
            playTrack();
        }
    });
    
    // Previous/Next buttons
    prevBtn.addEventListener('click', playPreviousTrack);
    nextBtn.addEventListener('click', playNextTrack);
    
    // Audio player events
    audioPlayer.addEventListener('timeupdate', updateProgress);
    audioPlayer.addEventListener('ended', playNextTrack);
    
    // Progress bar click
    progressBar.addEventListener('click', setProgress);
    
    // Volume slider
    volumeSlider.addEventListener('input', (e) => {
        currentVolume = e.target.value;
        audioPlayer.volume = currentVolume;
    });
    
    // Drag and drop events
    dragDropArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        dragDropArea.classList.add('dragover');
    });
    
    dragDropArea.addEventListener('dragleave', () => {
        dragDropArea.classList.remove('dragover');
    });
    
    dragDropArea.addEventListener('drop', handleFileDrop);
    
    // Click to browse files
    dragDropArea.addEventListener('click', () => {
        // Auto-select first folder if none selected
        if (currentFolderId === null) {
            selectFolder(1); // Auto-select first folder
        }
        fileInput.click();
    });
    
    // File input change
    fileInput.addEventListener('change', async (e) => {
        await handleFiles(e.target.files);
        // Reset file input
        fileInput.value = '';
    });
    
    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        // Space bar to play/pause (if not in input field)
        if (e.code === 'Space' && e.target.tagName !== 'INPUT') {
            e.preventDefault();
            playPauseBtn.click();
        }
        
        // Right arrow for next track
        if (e.code === 'ArrowRight') {
            nextBtn.click();
        }
        
        // Left arrow for previous track
        if (e.code === 'ArrowLeft') {
            prevBtn.click();
        }
    });
    
    // Clean up object URLs when page unloads
    window.addEventListener('beforeunload', () => {
        for (const trackId in objectURLs) {
            URL.revokeObjectURL(objectURLs[trackId]);
        }
    });
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', initializeApp);