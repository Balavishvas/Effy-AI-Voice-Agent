// Elements
const btnConnect = document.getElementById('btn-connect');
const btnMute = document.getElementById('btn-mute');
const connectionStatus = document.getElementById('connection-status');
const assistantState = document.getElementById('assistant-state');
const subStatus = document.getElementById('sub-status');
const sphere = document.getElementById('sphere');

let room = null;
let audioContext = null;
let analyser = null;
let localAudioTrack = null;
let animationFrameId = null;

// Update UI Connection States
function updateConnectionState(state) {
    const indicator = connectionStatus.querySelector('.status-indicator');
    const text = connectionStatus.querySelector('.status-text');

    indicator.className = 'status-indicator';
    
    if (state === 'connected') {
        indicator.classList.add('online');
        text.textContent = 'Connected';
        btnConnect.classList.add('btn-secondary');
        btnConnect.classList.remove('btn-primary');
        btnConnect.innerHTML = `
            <svg viewBox="0 0 24 24" width="24" height="24">
                <path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 16H9v-6h2v6zm4 0h-2v-6h2v6z"/>
            </svg>
            <span>Disconnect</span>
        `;
        btnConnect.disabled = false;
        btnMute.disabled = false;
    } else if (state === 'connecting') {
        indicator.classList.add('connecting');
        text.textContent = 'Connecting...';
        btnConnect.disabled = true;
        btnMute.disabled = true;
        sphere.className = 'assistant-sphere connecting-state';
        assistantState.textContent = 'Connecting...';
        subStatus.textContent = 'Setting up secure audio channel';
    } else {
        indicator.classList.add('offline');
        text.textContent = 'Disconnected';
        btnConnect.disabled = false;
        btnConnect.classList.remove('btn-secondary');
        btnConnect.classList.add('btn-primary');
        btnConnect.innerHTML = `
            <svg viewBox="0 0 24 24" width="24" height="24">
                <path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z"/>
            </svg>
            <span>Start Session</span>
        `;
        btnMute.disabled = true;
        btnMute.classList.remove('active');
        btnMute.innerHTML = `
            <svg viewBox="0 0 24 24" width="24" height="24">
                <path fill="currentColor" d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.48 6-3.3 6-6.72h-1.7z"/>
            </svg>
            <span>Mute Mic</span>
        `;
        sphere.className = 'assistant-sphere idle';
        assistantState.textContent = 'Ready to talk';
        subStatus.textContent = 'Click start to connect with Effi';
    }
}

// Visualizer / Audio Analyzer loop
function setupVisualizer(mediaStream) {
    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
    }

    try {
        if (!audioContext) {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }
        
        const source = audioContext.createMediaStreamSource(mediaStream);
        analyser = audioContext.createAnalyser();
        analyser.fftSize = 64;
        source.connect(analyser);

        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        function draw() {
            animationFrameId = requestAnimationFrame(draw);
            analyser.getByteFrequencyData(dataArray);

            let sum = 0;
            for (let i = 0; i < bufferLength; i++) {
                sum += dataArray[i];
            }
            const average = sum / bufferLength;
            
            // Normalize level to a multiplier
            const level = average / 128; // 0 to 2 range
            
            // Scale and glow based on volume
            const scale = 1 + (level * 0.35);
            const glow = 20 + (level * 60);
            
            if (sphere.classList.contains('speaking')) {
                sphere.style.transform = `scale(${scale})`;
                sphere.style.boxShadow = `0 0 ${glow}px rgba(243, 85, 136, ${0.4 + level * 0.3}), inset 0 0 20px rgba(255, 255, 255, 0.3)`;
            } else if (sphere.classList.contains('listening')) {
                sphere.style.transform = `scale(${scale})`;
                sphere.style.boxShadow = `0 0 ${glow}px rgba(0, 242, 254, ${0.4 + level * 0.3}), inset 0 0 20px rgba(255, 255, 255, 0.3)`;
            }
        }
        draw();
    } catch (e) {
        console.error('Failed to setup audio visualization:', e);
    }
}

// Connect Session
async function startSession() {
    updateConnectionState('connecting');

    try {
        // 1. Get connection token
        const response = await fetch('/api/token');
        if (!response.ok) {
            throw new Error('Failed to fetch LiveKit token');
        }
        const data = await response.json();
        
        // 2. Fetch server URL from the api or default
        // We'll fall back to parsing from location or default
        const livekitUrl = data.url || 'wss://effi-e715evy8.livekit.cloud';
        
        // 3. Create room instance
        room = new LivekitClient.Room({
            adaptiveStream: true,
            dynacast: true,
        });

        // 4. Attach event listeners
        room.on(LivekitClient.RoomEvent.TrackSubscribed, (track, publication, participant) => {
            if (track.kind === 'audio') {
                // Attach the track to an HTMLAudioElement to hear it
                const element = track.attach();
                document.body.appendChild(element);
                
                // Track visualizer for the speaker (agent)
                sphere.className = 'assistant-sphere speaking';
                assistantState.textContent = 'Effi is speaking';
                subStatus.textContent = 'Listening to her friendly advice';
                
                if (track.mediaStream) {
                    setupVisualizer(track.mediaStream);
                }
            }
        });

        room.on(LivekitClient.RoomEvent.TrackUnsubscribed, (track, publication, participant) => {
            if (track.kind === 'audio') {
                track.detach();
            }
        });

        room.on(LivekitClient.RoomEvent.ActiveSpeakersChanged, (speakers) => {
            const agentSpeaker = speakers.find(s => s.identity.includes('agent') || s.isAgent);
            const userSpeaker = speakers.find(s => s === room.localParticipant);

            if (agentSpeaker) {
                sphere.className = 'assistant-sphere speaking';
                assistantState.textContent = 'Effi is speaking';
                subStatus.textContent = 'Listening to her friendly advice';
            } else if (userSpeaker) {
                sphere.className = 'assistant-sphere listening';
                assistantState.textContent = 'Effi is listening';
                subStatus.textContent = 'Go ahead, speak your mind...';
            } else {
                sphere.className = 'assistant-sphere idle';
                sphere.style.transform = 'scale(1)';
                sphere.style.boxShadow = '';
                assistantState.textContent = 'Connected';
                subStatus.textContent = 'Waiting for conversation...';
            }
        });

        room.on(LivekitClient.RoomEvent.Disconnected, () => {
            if (animationFrameId) {
                cancelAnimationFrame(animationFrameId);
            }
            updateConnectionState('disconnected');
        });

        // 5. Connect to room
        await room.connect(livekitUrl, data.token);
        
        // 6. Publish mic
        localAudioTrack = await LivekitClient.createLocalAudioTrack();
        await room.localParticipant.publishTrack(localAudioTrack);

        updateConnectionState('connected');
        assistantState.textContent = 'Connected to Effi';
        subStatus.textContent = 'Start speaking to start the conversation!';
        
        // Enable visualizer for user mic
        if (localAudioTrack.mediaStream) {
            setupVisualizer(localAudioTrack.mediaStream);
        }

    } catch (error) {
        console.error('Session failed to start:', error);
        alert('Could not start session. Make sure the agent backend is running and LiveKit credentials are correct.');
        updateConnectionState('disconnected');
    }
}

// Disconnect Session
async function endSession() {
    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
    }
    if (localAudioTrack) {
        localAudioTrack.stop();
        localAudioTrack = null;
    }
    if (room) {
        await room.disconnect();
        room = null;
    }
    updateConnectionState('disconnected');
}

// Handle Connection Button Click
btnConnect.addEventListener('click', () => {
    if (room && room.state === 'connected') {
        endSession();
    } else {
        startSession();
    }
});

// Handle Mute Button Click
btnMute.addEventListener('click', async () => {
    if (!room || !localAudioTrack) return;
    
    if (localAudioTrack.isMuted) {
        await localAudioTrack.unmute();
        btnMute.classList.remove('active');
        btnMute.innerHTML = `
            <svg viewBox="0 0 24 24" width="24" height="24">
                <path fill="currentColor" d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.48 6-3.3 6-6.72h-1.7z"/>
            </svg>
            <span>Mute Mic</span>
        `;
        assistantState.textContent = 'Mic unmuted';
    } else {
        await localAudioTrack.mute();
        btnMute.classList.add('active');
        btnMute.innerHTML = `
            <svg viewBox="0 0 24 24" width="24" height="24">
                <path fill="currentColor" d="M19 11h-1.7c0 .74-.16 1.43-.43 2.05l1.23 1.23c.56-.98.9-2.09.9-3.28zm-4.02.17l-9.5-9.5L4.22 3l4.63 4.63C8.3 8.35 8 9.14 8 10v1c0 2.21 1.79 4 4 4 .98 0 1.86-.35 2.55-.93l4.13 4.13 1.27-1.27-9.97-9.97zM12 4c1.66 0 3 1.34 3 3v4c0 .44-.1.85-.27 1.22l2.36 2.36c.57-.96.91-2.08.91-3.58V10c0-3.31-2.69-6-6-6v3.17L12 4.17z"/>
            </svg>
            <span>Unmute Mic</span>
        `;
        assistantState.textContent = 'Mic muted';
    }
});
