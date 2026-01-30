// ========================================
// MULTIPLICATION TABLE - GAME LOGIC
// ========================================

// Audio Context for sound effects
let audioContext = null;
let soundMode = 'fun'; // 'fun' or 'original'

// Audio cache for preloaded sounds
const audioCache = {};
let soundsLoaded = false;

// Sound files loaded dynamically from sounds.json
let funSounds = {
    correct: [],
    wrong: []
};

// Shuffled sound queues - ensures all sounds play before any repeats
let soundQueues = {
    correct: [],
    wrong: []
};

// Fisher-Yates shuffle algorithm
function shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

function initAudio() {
    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    return audioContext;
}

// ========================================
// DYNAMIC SOUND LOADING
// ========================================

// Load sound file list from sounds.json manifest
async function loadSoundManifest() {
    try {
        const response = await fetch('sounds.json');
        if (!response.ok) {
            throw new Error(`Failed to load sounds.json: ${response.status}`);
        }
        const manifest = await response.json();
        funSounds.correct = manifest.correct || [];
        funSounds.wrong = manifest.wrong || [];
        console.log(`🎵 Loaded sound manifest: ${funSounds.correct.length} success sounds, ${funSounds.wrong.length} fail sounds`);
    } catch (error) {
        console.error('Failed to load sound manifest:', error);
        // Fallback to empty arrays - synthesized sounds will be used
    }
}

// Preload all sounds using HTML5 Audio for reliability
async function preloadSounds() {
    if (soundsLoaded) return;
    
    // First, load the sound manifest if not already loaded
    if (funSounds.correct.length === 0 && funSounds.wrong.length === 0) {
        await loadSoundManifest();
    }
    
    console.log('🔊 Preloading sounds...');
    
    const allUrls = [...funSounds.correct, ...funSounds.wrong];
    
    const loadPromises = allUrls.map(url => {
        return new Promise((resolve) => {
            const audio = new Audio();
            audio.preload = 'auto';
            
            audio.addEventListener('canplaythrough', () => {
                audioCache[url] = audio;
                console.log(`✅ Loaded: ${url}`);
                resolve();
            }, { once: true });
            
            audio.addEventListener('error', (e) => {
                console.warn(`⚠️ Failed to load: ${url}`, e);
                resolve(); // Don't block on errors
            }, { once: true });
            
            audio.src = url;
            audio.load();
        });
    });
    
    await Promise.all(loadPromises);
    soundsLoaded = true;
    console.log('🎉 All sounds preloaded!');
}

// Get next sound from shuffled queue (refills when empty)
function getNextSound(category) {
    const urls = funSounds[category];
    if (!urls || urls.length === 0) {
        return null;
    }
    
    // If queue is empty, refill with a fresh shuffle
    if (soundQueues[category].length === 0) {
        soundQueues[category] = shuffleArray(urls);
        console.log(`🔀 Reshuffled ${category} sounds queue (${soundQueues[category].length} sounds)`);
    }
    
    // Pop and return the next sound
    return soundQueues[category].pop();
}

// Play next sound from shuffled queue
function playRandomFunSound(category, volume = 0.7) {
    const url = getNextSound(category);
    
    if (!url) {
        // Fallback to synthesized sounds if no MP3s available
        console.log(`⚠️ No ${category} sounds loaded, using synthesized fallback`);
        if (category === 'correct') {
            playApplause();
        } else {
            playWahWahWah();
        }
        return;
    }
    
    console.log(`🎵 Playing ${category}: ${url} (${soundQueues[category].length} remaining in queue)`);
    
    // Use HTML5 Audio - simple and reliable
    const audio = new Audio(url);
    audio.volume = volume;
    audio.play().catch(e => console.warn('Audio play failed:', e));
}

// ========================================
// SOUND EFFECTS
// ========================================

function playNote(frequency, duration, type = 'sine', volume = 0.3) {
    const ctx = initAudio();
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, ctx.currentTime);
    
    gainNode.gain.setValueAtTime(volume, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration / 1000);
    
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + duration / 1000);
}

function playMelody(notes, type = 'sine') {
    const ctx = initAudio();
    let time = ctx.currentTime;
    
    notes.forEach(([freq, dur]) => {
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();
        
        oscillator.type = type;
        oscillator.frequency.setValueAtTime(freq, time);
        
        gainNode.gain.setValueAtTime(0.3, time);
        gainNode.gain.exponentialRampToValueAtTime(0.01, time + dur / 1000);
        
        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);
        
        oscillator.start(time);
        oscillator.stop(time + dur / 1000);
        
        time += dur / 1000;
    });
}

// ========================================
// ORIGINAL MELODIES (from PowerShell script)
// ========================================

const correctMelodies = [
    // Twinkle Twinkle (first 6 notes)
    [[523, 100], [523, 100], [784, 100], [784, 100], [880, 100], [880, 100]],
    // Mary Had a Little Lamb
    [[659, 100], [587, 100], [523, 100], [587, 100], [659, 100], [659, 100]],
    // Happy Birthday snippet
    [[523, 100], [523, 100], [587, 100], [523, 100], [698, 100], [659, 100]],
    // London Bridge
    [[587, 100], [523, 100], [493, 100], [523, 100], [587, 100], [587, 100]],
    // Ascending jingle
    [[523, 80], [587, 80], [659, 80], [698, 80], [784, 80], [880, 80]],
    // Victory fanfare
    [[523, 100], [659, 100], [784, 150], [1047, 200]],
    // Celebration
    [[784, 80], [880, 80], [988, 80], [1047, 150]]
];

const wrongMelodies = [
    // Descending sad
    [[523, 100], [466, 100], [440, 100], [392, 100]],
    // Minor descending
    [[659, 100], [622, 100], [587, 100], [523, 100]],
    // Game over
    [[400, 150], [350, 150], [300, 200]],
    // Try again
    [[500, 100], [400, 150]]
];

// ========================================
// FUN APPLAUSE & CROWD SOUNDS
// ========================================

function createNoiseBuffer(duration) {
    const ctx = initAudio();
    const sampleRate = ctx.sampleRate;
    const bufferSize = sampleRate * duration;
    const buffer = ctx.createBuffer(1, bufferSize, sampleRate);
    const data = buffer.getChannelData(0);
    
    for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
    }
    return buffer;
}

// Base clapping sound
function playClapBurst(startTime, volume = 0.15, filterFreq = 1200) {
    const ctx = initAudio();
    const noiseBuffer = createNoiseBuffer(0.06);
    const noiseSource = ctx.createBufferSource();
    noiseSource.buffer = noiseBuffer;
    
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = filterFreq + Math.random() * 400;
    filter.Q.value = 0.8;
    
    const gainNode = ctx.createGain();
    gainNode.gain.setValueAtTime(0, startTime);
    gainNode.gain.linearRampToValueAtTime(volume, startTime + 0.003);
    gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + 0.05);
    
    noiseSource.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    noiseSource.start(startTime);
    noiseSource.stop(startTime + 0.06);
}

// Theater applause - sustained, elegant clapping
function playTheaterApplause() {
    const ctx = initAudio();
    const now = ctx.currentTime;
    const duration = 1.5;
    
    // Many overlapping claps with crescendo then fade
    for (let i = 0; i < 40; i++) {
        const t = now + Math.random() * duration;
        const progress = (t - now) / duration;
        // Crescendo then decrescendo
        const envelope = progress < 0.3 ? progress / 0.3 : 1 - ((progress - 0.3) / 0.7) * 0.6;
        const volume = 0.08 + envelope * 0.12;
        playClapBurst(t, volume, 1000);
    }
    
    // Add some "bravo" cheers
    setTimeout(() => playBravo(), 300);
}

// Basketball game - energetic bursts with sneaker squeaks and cheering
function playBasketballCrowd() {
    const ctx = initAudio();
    const now = ctx.currentTime;
    
    // Quick intense clapping burst
    for (let i = 0; i < 25; i++) {
        const t = now + i * 0.03 + Math.random() * 0.02;
        playClapBurst(t, 0.12 + Math.random() * 0.1, 1400);
    }
    
    // Crowd roar
    playCrowdRoar(now, 0.8);
    
    // Someone yells YES!
    playYesShout(now + 0.2);
    
    // Air horn
    playAirHorn(now + 0.5);
}

// Soccer goal celebration - building roar with "GOAL!"
function playSoccerCrowd() {
    const ctx = initAudio();
    const now = ctx.currentTime;
    
    // Building crowd roar
    playCrowdRoar(now, 1.2, true);
    
    // Scattered intense clapping
    for (let i = 0; i < 30; i++) {
        const t = now + 0.1 + Math.random() * 0.8;
        playClapBurst(t, 0.1 + Math.random() * 0.08, 1300);
    }
    
    // GOAL shout
    playGoalShout(now + 0.15);
    
    // Vuvuzela-like horn
    playVuvuzela(now + 0.4);
}

// Stadium standing ovation
function playStandingOvation() {
    const ctx = initAudio();
    const now = ctx.currentTime;
    
    // Massive sustained applause
    for (let i = 0; i < 60; i++) {
        const t = now + Math.random() * 1.8;
        playClapBurst(t, 0.06 + Math.random() * 0.08, 1100 + Math.random() * 400);
    }
    
    // Multiple cheers
    playWoohoo(now + 0.1);
    playYesShout(now + 0.4);
    playWhistle(now + 0.7);
    playCrowdRoar(now + 0.2, 1.0);
}

// Kids cheering (classroom celebration)
function playKidsCheering() {
    const ctx = initAudio();
    const now = ctx.currentTime;
    
    // Higher pitched excited clapping
    for (let i = 0; i < 20; i++) {
        const t = now + i * 0.04 + Math.random() * 0.02;
        playClapBurst(t, 0.1 + Math.random() * 0.08, 1800);
    }
    
    // Yay! sounds (higher pitched)
    playYaySound(now + 0.1);
    playYaySound(now + 0.3);
    
    // Excited woohoo
    playWoohoo(now + 0.15);
}

// Simple quick applause
function playQuickApplause() {
    const ctx = initAudio();
    const now = ctx.currentTime;
    
    for (let i = 0; i < 15; i++) {
        const t = now + i * 0.04 + Math.random() * 0.02;
        playClapBurst(t, 0.12 + Math.random() * 0.08, 1200);
    }
    
    playYesShout(now + 0.1);
}

// ========================================
// CROWD VOICE EFFECTS
// ========================================

// Synthesized "YES!" shout
function playYesShout(startTime) {
    const ctx = initAudio();
    startTime = startTime || ctx.currentTime;
    
    // Create multiple oscillators for vowel formants
    const formants = [
        { freq: 400, gain: 0.3 },   // Y sound start
        { freq: 700, gain: 0.25 },
        { freq: 2300, gain: 0.15 }
    ];
    
    formants.forEach(f => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const filter = ctx.createBiquadFilter();
        
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(150 + Math.random() * 50, startTime);
        
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(f.freq, startTime);
        filter.frequency.linearRampToValueAtTime(f.freq * 1.5, startTime + 0.1); // EH sound
        filter.frequency.linearRampToValueAtTime(2500, startTime + 0.25); // S sound
        filter.Q.value = 5;
        
        gain.gain.setValueAtTime(0, startTime);
        gain.gain.linearRampToValueAtTime(f.gain, startTime + 0.02);
        gain.gain.setValueAtTime(f.gain * 0.8, startTime + 0.15);
        gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.35);
        
        osc.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);
        
        osc.start(startTime);
        osc.stop(startTime + 0.4);
    });
    
    // Add "S" hiss
    const noiseBuffer = createNoiseBuffer(0.15);
    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuffer;
    const hpFilter = ctx.createBiquadFilter();
    hpFilter.type = 'highpass';
    hpFilter.frequency.value = 4000;
    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0, startTime + 0.2);
    noiseGain.gain.linearRampToValueAtTime(0.15, startTime + 0.25);
    noiseGain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.4);
    noise.connect(hpFilter);
    hpFilter.connect(noiseGain);
    noiseGain.connect(ctx.destination);
    noise.start(startTime + 0.2);
    noise.stop(startTime + 0.45);
}

// "GOAL!" shout
function playGoalShout(startTime) {
    const ctx = initAudio();
    startTime = startTime || ctx.currentTime;
    
    // Long sustained "GOOOOOAL"
    const osc = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();
    
    osc.type = 'sawtooth';
    osc2.type = 'sawtooth';
    
    // Pitch rises with excitement
    osc.frequency.setValueAtTime(120, startTime);
    osc.frequency.linearRampToValueAtTime(180, startTime + 0.6);
    osc2.frequency.setValueAtTime(122, startTime);
    osc2.frequency.linearRampToValueAtTime(183, startTime + 0.6);
    
    filter.type = 'bandpass';
    // GO -> OOO -> AL sound
    filter.frequency.setValueAtTime(500, startTime);
    filter.frequency.setValueAtTime(400, startTime + 0.1);
    filter.frequency.linearRampToValueAtTime(700, startTime + 0.5);
    filter.Q.value = 3;
    
    gain.gain.setValueAtTime(0, startTime);
    gain.gain.linearRampToValueAtTime(0.25, startTime + 0.05);
    gain.gain.setValueAtTime(0.25, startTime + 0.5);
    gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.7);
    
    osc.connect(filter);
    osc2.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    
    osc.start(startTime);
    osc2.start(startTime);
    osc.stop(startTime + 0.75);
    osc2.stop(startTime + 0.75);
}

// "Bravo!" call
function playBravo() {
    const ctx = initAudio();
    const now = ctx.currentTime;
    
    // BRA - VO syllables
    const syllables = [
        { start: 0, dur: 0.2, freqs: [600, 1100] },
        { start: 0.25, dur: 0.3, freqs: [500, 800] }
    ];
    
    syllables.forEach(syl => {
        const osc = ctx.createOscillator();
        const filter = ctx.createBiquadFilter();
        const gain = ctx.createGain();
        
        osc.type = 'sawtooth';
        osc.frequency.value = 130 + Math.random() * 30;
        
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(syl.freqs[0], now + syl.start);
        filter.frequency.linearRampToValueAtTime(syl.freqs[1], now + syl.start + syl.dur);
        filter.Q.value = 4;
        
        gain.gain.setValueAtTime(0, now + syl.start);
        gain.gain.linearRampToValueAtTime(0.2, now + syl.start + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.01, now + syl.start + syl.dur);
        
        osc.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);
        
        osc.start(now + syl.start);
        osc.stop(now + syl.start + syl.dur + 0.1);
    });
}

// "Yay!" high pitched
function playYaySound(startTime) {
    const ctx = initAudio();
    startTime = startTime || ctx.currentTime;
    
    const osc = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();
    
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(250 + Math.random() * 100, startTime);
    osc.frequency.linearRampToValueAtTime(350 + Math.random() * 100, startTime + 0.15);
    
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1500, startTime);
    filter.frequency.linearRampToValueAtTime(2000, startTime + 0.15);
    filter.Q.value = 3;
    
    gain.gain.setValueAtTime(0, startTime);
    gain.gain.linearRampToValueAtTime(0.15, startTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.25);
    
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    
    osc.start(startTime);
    osc.stop(startTime + 0.3);
}

// Crowd roar (ambient cheering)
function playCrowdRoar(startTime, duration = 0.8, building = false) {
    const ctx = initAudio();
    startTime = startTime || ctx.currentTime;
    
    const noiseBuffer = createNoiseBuffer(duration + 0.2);
    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuffer;
    
    // Multiple bandpass filters for voice-like quality
    const filter1 = ctx.createBiquadFilter();
    filter1.type = 'bandpass';
    filter1.frequency.value = 400;
    filter1.Q.value = 1;
    
    const filter2 = ctx.createBiquadFilter();
    filter2.type = 'bandpass';
    filter2.frequency.value = 1200;
    filter2.Q.value = 2;
    
    const gain = ctx.createGain();
    
    if (building) {
        gain.gain.setValueAtTime(0.02, startTime);
        gain.gain.linearRampToValueAtTime(0.25, startTime + duration * 0.4);
        gain.gain.setValueAtTime(0.25, startTime + duration * 0.7);
        gain.gain.exponentialRampToValueAtTime(0.02, startTime + duration);
    } else {
        gain.gain.setValueAtTime(0.2, startTime);
        gain.gain.exponentialRampToValueAtTime(0.02, startTime + duration);
    }
    
    noise.connect(filter1);
    noise.connect(filter2);
    filter1.connect(gain);
    filter2.connect(gain);
    gain.connect(ctx.destination);
    
    noise.start(startTime);
    noise.stop(startTime + duration + 0.1);
}

// ========================================
// STADIUM INSTRUMENTS
// ========================================

function playWhistle(startTime) {
    const ctx = initAudio();
    startTime = startTime || ctx.currentTime;
    
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1000, startTime);
    osc.frequency.linearRampToValueAtTime(2000, startTime + 0.15);
    osc.frequency.linearRampToValueAtTime(1800, startTime + 0.3);
    
    gain.gain.setValueAtTime(0, startTime);
    gain.gain.linearRampToValueAtTime(0.2, startTime + 0.02);
    gain.gain.setValueAtTime(0.2, startTime + 0.25);
    gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.35);
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.start(startTime);
    osc.stop(startTime + 0.4);
}

function playWoohoo(startTime) {
    const ctx = initAudio();
    startTime = startTime || ctx.currentTime;
    
    // "Woo" part
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(300, startTime);
    osc1.frequency.linearRampToValueAtTime(500, startTime + 0.15);
    gain1.gain.setValueAtTime(0.2, startTime);
    gain1.gain.exponentialRampToValueAtTime(0.01, startTime + 0.2);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(startTime);
    osc1.stop(startTime + 0.2);
    
    // "Hoo" part
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(400, startTime + 0.2);
    osc2.frequency.linearRampToValueAtTime(600, startTime + 0.35);
    gain2.gain.setValueAtTime(0.25, startTime + 0.2);
    gain2.gain.exponentialRampToValueAtTime(0.01, startTime + 0.45);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(startTime + 0.2);
    osc2.stop(startTime + 0.5);
}

function playAirHorn(startTime) {
    const ctx = initAudio();
    startTime = startTime || ctx.currentTime;
    
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const osc3 = ctx.createOscillator();
    const gain = ctx.createGain();
    
    // Air horn is typically a major chord
    osc1.type = 'sawtooth';
    osc2.type = 'sawtooth';
    osc3.type = 'sawtooth';
    
    osc1.frequency.value = 480;
    osc2.frequency.value = 600;
    osc3.frequency.value = 720;
    
    gain.gain.setValueAtTime(0, startTime);
    gain.gain.linearRampToValueAtTime(0.15, startTime + 0.02);
    gain.gain.setValueAtTime(0.15, startTime + 0.3);
    gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.5);
    
    osc1.connect(gain);
    osc2.connect(gain);
    osc3.connect(gain);
    gain.connect(ctx.destination);
    
    osc1.start(startTime);
    osc2.start(startTime);
    osc3.start(startTime);
    osc1.stop(startTime + 0.55);
    osc2.stop(startTime + 0.55);
    osc3.stop(startTime + 0.55);
}

function playVuvuzela(startTime) {
    const ctx = initAudio();
    startTime = startTime || ctx.currentTime;
    
    const osc = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = 'sawtooth';
    osc2.type = 'square';
    
    // Vuvuzela is around Bb (233 Hz)
    osc.frequency.value = 233;
    osc2.frequency.value = 235; // Slight detune for buzz
    
    gain.gain.setValueAtTime(0, startTime);
    gain.gain.linearRampToValueAtTime(0.12, startTime + 0.05);
    gain.gain.setValueAtTime(0.1, startTime + 0.4);
    gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.6);
    
    osc.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);
    
    osc.start(startTime);
    osc2.start(startTime);
    osc.stop(startTime + 0.65);
    osc2.stop(startTime + 0.65);
}

function playPartyHorn(startTime) {
    const ctx = initAudio();
    startTime = startTime || ctx.currentTime;
    
    const osc = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = 'sawtooth';
    osc2.type = 'square';
    
    osc.frequency.setValueAtTime(220, startTime);
    osc.frequency.linearRampToValueAtTime(440, startTime + 0.1);
    osc.frequency.setValueAtTime(440, startTime + 0.4);
    
    osc2.frequency.setValueAtTime(223, startTime);
    osc2.frequency.linearRampToValueAtTime(446, startTime + 0.1);
    
    gain.gain.setValueAtTime(0, startTime);
    gain.gain.linearRampToValueAtTime(0.15, startTime + 0.02);
    gain.gain.setValueAtTime(0.12, startTime + 0.35);
    gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.5);
    
    osc.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);
    
    osc.start(startTime);
    osc2.start(startTime);
    osc.stop(startTime + 0.5);
    osc2.stop(startTime + 0.5);
}

// ========================================
// APPLAUSE SELECTOR
// ========================================

const applauseFunctions = [
    playTheaterApplause,
    playBasketballCrowd,
    playSoccerCrowd,
    playStandingOvation,
    playKidsCheering,
    playQuickApplause
];

function playApplause(variant) {
    if (variant === undefined) {
        variant = Math.floor(Math.random() * applauseFunctions.length);
    }
    const names = ['Theater', 'Basketball', 'Soccer', 'Standing Ovation', 'Kids Cheering', 'Quick Applause'];
    console.log(`🎉 Playing: ${names[variant % applauseFunctions.length]}`);
    applauseFunctions[variant % applauseFunctions.length]();
}

// ========================================
// FUN FUNNY WRONG SOUNDS
// ========================================

function playBoing() {
    const ctx = initAudio();
    const now = ctx.currentTime;
    
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(150, now);
    osc.frequency.exponentialRampToValueAtTime(600, now + 0.1);
    osc.frequency.exponentialRampToValueAtTime(100, now + 0.4);
    
    gain.gain.setValueAtTime(0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.start(now);
    osc.stop(now + 0.5);
}

function playSlideWhistleDown() {
    const ctx = initAudio();
    const now = ctx.currentTime;
    
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1200, now);
    osc.frequency.exponentialRampToValueAtTime(100, now + 0.6);
    
    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.7);
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.start(now);
    osc.stop(now + 0.7);
}

function playWahWahWah() {
    const ctx = initAudio();
    const now = ctx.currentTime;
    
    // Classic "wah wah wah" sad trombone
    const notes = [
        { freq: 311, time: 0, dur: 0.3 },
        { freq: 293, time: 0.35, dur: 0.3 },
        { freq: 277, time: 0.7, dur: 0.5 }
    ];
    
    notes.forEach(note => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(note.freq, now + note.time);
        
        // Add vibrato
        const lfo = ctx.createOscillator();
        const lfoGain = ctx.createGain();
        lfo.frequency.value = 5;
        lfoGain.gain.value = 10;
        lfo.connect(lfoGain);
        lfoGain.connect(osc.frequency);
        lfo.start(now + note.time);
        lfo.stop(now + note.time + note.dur);
        
        gain.gain.setValueAtTime(0.15, now + note.time);
        gain.gain.exponentialRampToValueAtTime(0.01, now + note.time + note.dur);
        
        osc.connect(gain);
        gain.connect(ctx.destination);
        
        osc.start(now + note.time);
        osc.stop(now + note.time + note.dur);
    });
}

function playCartoonBonk() {
    const ctx = initAudio();
    const now = ctx.currentTime;
    
    // Impact sound
    const noiseBuffer = createNoiseBuffer(0.1);
    const noiseSource = ctx.createBufferSource();
    noiseSource.buffer = noiseBuffer;
    
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1000, now);
    filter.frequency.exponentialRampToValueAtTime(100, now + 0.1);
    
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
    
    noiseSource.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    
    noiseSource.start(now);
    noiseSource.stop(now + 0.15);
    
    // Add a low "bong"
    const osc = ctx.createOscillator();
    const oscGain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(150, now);
    osc.frequency.exponentialRampToValueAtTime(80, now + 0.3);
    oscGain.gain.setValueAtTime(0.3, now);
    oscGain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);
    osc.connect(oscGain);
    oscGain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.35);
}

function playQuack() {
    const ctx = initAudio();
    const now = ctx.currentTime;
    
    // Duck quack sound
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(500, now);
    osc.frequency.setValueAtTime(300, now + 0.05);
    osc.frequency.setValueAtTime(450, now + 0.1);
    osc.frequency.setValueAtTime(250, now + 0.15);
    
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.setValueAtTime(0.15, now + 0.08);
    gain.gain.setValueAtTime(0.2, now + 0.12);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.start(now);
    osc.stop(now + 0.25);
}

function playSpring() {
    const ctx = initAudio();
    const now = ctx.currentTime;
    
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = 'sine';
    
    // Spring oscillation
    for (let i = 0; i < 8; i++) {
        const t = now + i * 0.05;
        const freq = 200 + Math.sin(i * 2) * 150 * (1 - i / 10);
        osc.frequency.setValueAtTime(freq, t);
    }
    
    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.start(now);
    osc.stop(now + 0.5);
}

const funnyWrongSounds = [
    playBoing,
    playSlideWhistleDown,
    playWahWahWah,
    playCartoonBonk,
    playQuack,
    playSpring
];

// ========================================
// MAIN SOUND FUNCTIONS
// ========================================

function playCorrectSound() {
    console.log(`🔊 Sound mode: ${soundMode}`);
    if (soundMode === 'fun') {
        playRandomFunSound('correct', 0.6);
    } else {
        const melody = correctMelodies[Math.floor(Math.random() * correctMelodies.length)];
        playMelody(melody, 'sine');
    }
}

function playWrongSound() {
    if (soundMode === 'fun') {
        playRandomFunSound('wrong', 0.5);
    } else {
        const melody = wrongMelodies[Math.floor(Math.random() * wrongMelodies.length)];
        playMelody(melody, 'triangle');
    }
}

function playButtonClick() {
    playNote(800, 50, 'sine', 0.1);
}

function playStreakSound() {
    if (soundMode === 'fun') {
        // Play the best applause sound for streaks
        playRandomFunSound('correct', 0.8);
    } else {
        playMelody([[523, 80], [659, 80], [784, 80], [1047, 150]], 'sine');
    }
}

// ========================================
// CONFETTI EFFECTS
// ========================================

const confettiColors = ['#f093fb', '#f5576c', '#667eea', '#00cec9', '#fdcb6e', '#00b894', '#fd79a8'];
const confettiShapes = ['circle', 'square', 'triangle'];

function createConfetti(count = 50) {
    const container = document.getElementById('confetti-container');
    
    for (let i = 0; i < count; i++) {
        setTimeout(() => {
            const confetti = document.createElement('div');
            confetti.className = 'confetti';
            
            const color = confettiColors[Math.floor(Math.random() * confettiColors.length)];
            const shape = confettiShapes[Math.floor(Math.random() * confettiShapes.length)];
            const size = Math.random() * 10 + 8;
            const startX = Math.random() * window.innerWidth;
            const rotation = Math.random() * 360;
            const duration = Math.random() * 2 + 2;
            
            confetti.style.left = `${startX}px`;
            confetti.style.top = '-20px';
            confetti.style.width = `${size}px`;
            confetti.style.height = `${size}px`;
            confetti.style.backgroundColor = color;
            confetti.style.transform = `rotate(${rotation}deg)`;
            confetti.style.animationDuration = `${duration}s`;
            
            if (shape === 'circle') {
                confetti.style.borderRadius = '50%';
            } else if (shape === 'triangle') {
                confetti.style.width = '0';
                confetti.style.height = '0';
                confetti.style.backgroundColor = 'transparent';
                confetti.style.borderLeft = `${size/2}px solid transparent`;
                confetti.style.borderRight = `${size/2}px solid transparent`;
                confetti.style.borderBottom = `${size}px solid ${color}`;
            }
            
            container.appendChild(confetti);
            
            // Remove confetti after animation
            setTimeout(() => confetti.remove(), duration * 1000);
        }, i * 30);
    }
}

function createStarBurst(x, y) {
    const container = document.getElementById('confetti-container');
    const stars = ['⭐', '✨', '💫', '🌟', '✨'];
    
    for (let i = 0; i < 8; i++) {
        const star = document.createElement('div');
        const emoji = stars[Math.floor(Math.random() * stars.length)];
        star.innerHTML = emoji;
        star.style.cssText = `
            position: absolute;
            left: ${x}px;
            top: ${y}px;
            font-size: 2rem;
            pointer-events: none;
            animation: starBurst 0.8s ease-out forwards;
            --angle: ${i * 45}deg;
        `;
        container.appendChild(star);
        
        setTimeout(() => star.remove(), 800);
    }
}

// Add star burst animation dynamically
const styleSheet = document.createElement('style');
styleSheet.textContent = `
    @keyframes starBurst {
        0% {
            transform: translate(-50%, -50%) scale(0);
            opacity: 1;
        }
        100% {
            transform: translate(
                calc(-50% + cos(var(--angle)) * 100px),
                calc(-50% + sin(var(--angle)) * 100px)
            ) scale(1);
            opacity: 0;
        }
    }
`;
document.head.appendChild(styleSheet);

// ========================================
// GAME STATE
// ========================================

const gameState = {
    score: 0,
    streak: 0,
    correctCount: 0,
    currentA: 0,
    currentB: 0,
    correctAnswer: 0,
    attempts: 0
};

// Weights for numbers 1..10 (higher = more likely)
// Harder numbers like 7, 8, 9 appear more often
const numberWeights = [
    1,  // 1
    1,  // 2
    2,  // 3
    2,  // 4
    3,  // 5
    3,  // 6
    4,  // 7
    4,  // 8
    5,  // 9
    2   // 10
];

// Hebrew compliments
const compliments = [
    "נדירה!",
    "מושלמת!",
    "מהממת!",
    "גאונה!",
    "גאונה של אבא!",
    "גאונה של אמא!",
    "מטורף!",
    "כל הכבוד!",
    "את צודקת!",
    "פנטסטי!",
    "מושלם!",
    "יופי!",
    "בראבו!",
    "נפלא!",
    "נהדר!",
    "טוב מאד!",
    "נכון מאד!",
    "מעולה!",
    "תשובה נכונה!",
    "יפה מאוד!",
    "המשיכי כך!",
    "את אלופה!",
    "מצוין!"
];

const encouragements = [
    "לא נכון, נסי שוב! 💪",
    "כמעט! נסי עוד פעם 🌟",
    "עוד ניסיון אחד! 😊",
    "את יכולה! נסי שוב 💫"
];

const streakMessages = {
    5: "🔥 רצף של 5! מדהים!",
    10: "⭐ רצף של 10! כוכבת!",
    15: "🌟 רצף של 15! אלופה!",
    20: "👑 רצף של 20! מלכה!",
    25: "🎉 רצף של 25! אגדה!",
    50: "🏆 רצף של 50! גאונה אמיתית!"
};

// ========================================
// UTILITY FUNCTIONS
// ========================================

function getWeightedRandomNumber(weights) {
    const totalWeight = weights.reduce((sum, w) => sum + w, 0);
    let random = Math.random() * totalWeight;
    
    for (let i = 0; i < weights.length; i++) {
        random -= weights[i];
        if (random <= 0) {
            return i + 1;
        }
    }
    return weights.length;
}

function getRandomItem(array) {
    return array[Math.floor(Math.random() * array.length)];
}

// ========================================
// DOM ELEMENTS
// ========================================

const elements = {
    welcomeScreen: document.getElementById('welcome-screen'),
    gameScreen: document.getElementById('game-screen'),
    startBtn: document.getElementById('start-btn'),
    numA: document.getElementById('num-a'),
    numB: document.getElementById('num-b'),
    answerInput: document.getElementById('answer-input'),
    submitBtn: document.getElementById('submit-btn'),
    feedback: document.getElementById('feedback'),
    feedbackEmoji: document.getElementById('feedback-emoji'),
    feedbackText: document.getElementById('feedback-text'),
    streakDisplay: document.getElementById('streak'),
    scoreDisplay: document.getElementById('score'),
    correctCountDisplay: document.getElementById('correct-count'),
    questionCard: document.getElementById('question-card'),
    streakMilestone: document.getElementById('streak-milestone'),
    numberPad: document.querySelector('.number-pad'),
    soundToggleBtn: document.getElementById('sound-toggle-btn')
};

// ========================================
// GAME FUNCTIONS
// ========================================

function generateNewQuestion() {
    gameState.currentA = getWeightedRandomNumber(numberWeights);
    gameState.currentB = getWeightedRandomNumber(numberWeights);
    gameState.correctAnswer = gameState.currentA * gameState.currentB;
    gameState.attempts = 0;
    
    elements.numA.textContent = gameState.currentA;
    elements.numB.textContent = gameState.currentB;
    elements.answerInput.value = '';
    elements.answerInput.classList.remove('correct', 'wrong');
    elements.feedback.classList.add('hidden');
    
    // Add pop animation to numbers
    elements.numA.style.animation = 'none';
    elements.numB.style.animation = 'none';
    setTimeout(() => {
        elements.numA.style.animation = 'pulse 0.3s ease';
        elements.numB.style.animation = 'pulse 0.3s ease';
    }, 10);
    
    elements.answerInput.focus();
}

function showFeedback(isCorrect, message) {
    elements.feedback.classList.remove('hidden', 'success', 'error');
    elements.feedback.classList.add(isCorrect ? 'success' : 'error');
    elements.feedbackText.textContent = message;
    elements.feedbackEmoji.textContent = isCorrect ? '🎉' : '🤔';
}

function updateStats() {
    elements.streakDisplay.textContent = gameState.streak;
    elements.scoreDisplay.textContent = gameState.score;
    elements.correctCountDisplay.textContent = gameState.correctCount;
}

function showStreakMilestone(streak) {
    const message = streakMessages[streak];
    if (message) {
        elements.streakMilestone.querySelector('.milestone-text')?.remove();
        const textSpan = document.createElement('span');
        textSpan.className = 'milestone-text';
        textSpan.textContent = message;
        elements.streakMilestone.appendChild(textSpan);
        elements.streakMilestone.classList.remove('hidden');
        
        playStreakSound();
        createConfetti(100);
        
        setTimeout(() => {
            elements.streakMilestone.classList.add('hidden');
        }, 2500);
    }
}

function checkAnswer() {
    const userAnswer = parseInt(elements.answerInput.value, 10);
    
    if (isNaN(userAnswer)) {
        elements.answerInput.classList.add('wrong');
        setTimeout(() => elements.answerInput.classList.remove('wrong'), 400);
        return;
    }
    
    gameState.attempts++;
    
    if (userAnswer === gameState.correctAnswer) {
        // Correct answer!
        playCorrectSound();
        
        gameState.streak++;
        gameState.correctCount++;
        
        // Score based on attempts (more points for first try)
        const points = gameState.attempts === 1 ? 10 : 5;
        gameState.score += points * (1 + Math.floor(gameState.streak / 5) * 0.1);
        gameState.score = Math.floor(gameState.score);
        
        updateStats();
        
        const compliment = getRandomItem(compliments);
        showFeedback(true, compliment);
        
        elements.answerInput.classList.add('correct');
        elements.questionCard.classList.add('celebrate');
        
        // Create confetti effect
        createConfetti(30);
        
        // Check for streak milestones
        if (streakMessages[gameState.streak]) {
            setTimeout(() => showStreakMilestone(gameState.streak), 500);
        }
        
        setTimeout(() => {
            elements.questionCard.classList.remove('celebrate');
            generateNewQuestion();
        }, 1500);
        
    } else {
        // Wrong answer
        playWrongSound();
        
        gameState.streak = 0;
        updateStats();
        
        const encouragement = getRandomItem(encouragements);
        showFeedback(false, encouragement);
        
        elements.answerInput.classList.add('wrong');
        elements.questionCard.classList.add('shake');
        
        setTimeout(() => {
            elements.answerInput.classList.remove('wrong');
            elements.questionCard.classList.remove('shake');
            elements.answerInput.value = '';
            elements.answerInput.focus();
        }, 600);
    }
}

function startGame() {
    // Initialize audio on user interaction
    initAudio();
    playButtonClick();
    
    // Preload high-quality sounds in background
    preloadSounds();
    
    elements.welcomeScreen.classList.remove('active');
    elements.gameScreen.classList.add('active');
    
    generateNewQuestion();
}

// ========================================
// EVENT LISTENERS
// ========================================

elements.startBtn.addEventListener('click', startGame);

// Submit button is now in the numpad - handled by handleNumpadInput

elements.answerInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        checkAnswer();
    }
});

// Number pad handler
function processNumpadButton(btn) {
    playButtonClick();
    
    if (btn.dataset.action === 'clear') {
        elements.answerInput.value = elements.answerInput.value.slice(0, -1);
    } else if (btn.dataset.action === 'submit') {
        checkAnswer();
    } else if (btn.dataset.num !== undefined) {
        elements.answerInput.value += btn.dataset.num;
    }
}

// Track if touch already handled this interaction
let touchHandled = false;

// Touchstart for instant response on touch devices
elements.numberPad.addEventListener('touchstart', (e) => {
    const btn = e.target.closest('.num-btn');
    if (!btn) return;
    
    e.preventDefault(); // Prevent click from firing
    touchHandled = true;
    processNumpadButton(btn);
}, { passive: false });

// Click for mouse/keyboard users
elements.numberPad.addEventListener('click', (e) => {
    if (touchHandled) {
        touchHandled = false;
        return;
    }
    
    const btn = e.target.closest('.num-btn');
    if (!btn) return;
    
    processNumpadButton(btn);
});

// Sound toggle
elements.soundToggleBtn.addEventListener('click', () => {
    initAudio();
    
    // Toggle sound mode
    soundMode = soundMode === 'fun' ? 'original' : 'fun';
    elements.soundToggleBtn.dataset.mode = soundMode;
    
    // Update active state on options
    const options = elements.soundToggleBtn.querySelectorAll('.toggle-option');
    options.forEach(opt => {
        opt.classList.toggle('active', opt.dataset.value === soundMode);
    });
    
    // Play a sample sound to indicate the change
    playButtonClick();
    setTimeout(() => {
        if (soundMode === 'fun') {
            preloadSounds(); // Ensure sounds are loaded
            playRandomFunSound('correct', 0.5);
        } else {
            playMelody([[523, 100], [659, 100], [784, 100]], 'sine');
        }
    }, 100);
});

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
    // Start game on Enter from welcome screen
    if (elements.welcomeScreen.classList.contains('active') && e.key === 'Enter') {
        startGame();
    }
});

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    elements.answerInput.focus();
});

// ========================================
// TOUCH SUPPORT - Prevent zoom on double tap
// ========================================

let lastTouchEnd = 0;
document.addEventListener('touchend', (e) => {
    const now = Date.now();
    if (now - lastTouchEnd <= 300) {
        e.preventDefault();
    }
    lastTouchEnd = now;
}, false);

// ========================================
// PREVENT MOBILE KEYBOARD
// ========================================

// The input has inputmode="none" which prevents the virtual keyboard.
// We also make it readonly on touch devices to ensure no keyboard appears.
const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
if (isTouchDevice) {
    elements.answerInput.readOnly = true;
}
