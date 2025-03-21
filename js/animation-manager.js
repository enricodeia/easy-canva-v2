// Animation Manager Class
// Handles camera animation with GSAP integration and keyframe management
class AnimationManager {
    constructor(sceneManager, camera, controls) {
        // Store references
        this.sceneManager = sceneManager;
        this.camera = camera;
        this.controls = controls;
        
        // Animation properties
        this.keyframes = [];
        this.duration = 5; // seconds
        this.easing = "power2.inOut";
        this.isLooping = false;
        
        // Scroll animation properties
        this.isScrollEnabled = false;
        this.scrollStart = 0; // percentage
        this.scrollEnd = 100; // percentage
        this.smoothScrubbing = true;
        
        // Timeline
        this.timeline = null;
        this.isPlaying = false;
        
        // Camera path for visualization
        this.cameraPath = null;
        this.cameraPathPoints = [];
        this.pathHelper = null;
        
        // Load GSAP dynamically
        this.loadGSAP();
    }
    
    // Load GSAP dynamically
    async loadGSAP() {
        try {
            // Load the GSAP script dynamically
            const gsapScript = document.createElement('script');
            gsapScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/gsap/3.11.4/gsap.min.js';
            gsapScript.async = true;
            
            // Load ScrollTrigger
            const scrollTriggerScript = document.createElement('script');
            scrollTriggerScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/gsap/3.11.4/ScrollTrigger.min.js';
            scrollTriggerScript.async = true;
            
            document.head.appendChild(gsapScript);
            document.head.appendChild(scrollTriggerScript);
            
            // Wait for GSAP to load
            gsapScript.onload = () => {
                console.log('GSAP loaded successfully');
                
                // Initialize after ScrollTrigger is loaded
                scrollTriggerScript.onload = () => {
                    console.log('ScrollTrigger loaded successfully');
                    
                    // Register the plugin
                    gsap.registerPlugin(ScrollTrigger);
                    
                    // Now GSAP is ready to use
                    this.initializeGSAP();
                };
            };
        } catch (error) {
            console.error('Error loading GSAP:', error);
        }
    }
    
    // Initialize GSAP after loading
    initializeGSAP() {
        // Create initial empty timeline
        this.timeline = gsap.timeline({
            paused: true,
            onComplete: () => {
                if (this.isLooping) {
                    this.timeline.restart();
                }
            }
        });
        
        // Update UI
        this.updateUI();
    }
    
    // Add a keyframe at current camera position and time
    addKeyframe(time) {
        if (!this.camera) return;
        
        // If time is not provided, calculate it based on existing keyframes
        if (time === undefined) {
            time = this.keyframes.length > 0 
                ? this.keyframes[this.keyframes.length - 1].time + 1 
                : 0;
        }
        
        // Create keyframe object
        const keyframe = {
            id: Date.now().toString(),
            time: time, // seconds
            position: this.camera.position.clone(),
            target: this.controls.target.clone()
        };
        
        // Add to keyframes array (ensuring chronological order)
        this.keyframes.push(keyframe);
        this.keyframes.sort((a, b) => a.time - b.time);
        
        // Update the animation
        this.updateAnimation();
        
        // Update UI
        this.updateKeyframesUI();
        
        // Update camera path visualization
        this.updateCameraPath();
        
        return keyframe;
    }
    
    // Remove a keyframe by ID
    removeKeyframe(id) {
        const index = this.keyframes.findIndex(kf => kf.id === id);
        if (index !== -1) {
            this.keyframes.splice(index, 1);
            
            // Update the animation
            this.updateAnimation();
            
            // Update UI
            this.updateKeyframesUI();
            
            // Update camera path visualization
            this.updateCameraPath();
        }
    }
    
    // Update keyframe at specific ID with current camera position
    updateKeyframe(id) {
        const keyframe = this.keyframes.find(kf => kf.id === id);
        if (keyframe) {
            keyframe.position = this.camera.position.clone();
            keyframe.target = this.controls.target.clone();
            
            // Update the animation
            this.updateAnimation();
            
            // Update UI
            this.updateKeyframesUI();
            
            // Update camera path visualization
            this.updateCameraPath();
        }
    }
    
    // Create or update the GSAP animation
    updateAnimation() {
        // Check if we have GSAP and at least 2 keyframes
        if (!window.gsap || this.keyframes.length < 2) return;
        
        // Clear the existing timeline
        this.timeline.clear();
        
        // Create a fresh timeline
        this.timeline = gsap.timeline({
            paused: true,
            onComplete: () => {
                if (this.isLooping) {
                    this.timeline.restart();
                }
            }
        });
        
        // Loop through keyframes to create animation segments
        for (let i = 1; i < this.keyframes.length; i++) {
            const prevKeyframe = this.keyframes[i-1];
            const currentKeyframe = this.keyframes[i];
            const segmentDuration = currentKeyframe.time - prevKeyframe.time;
            
            // Skip if segment has no duration
            if (segmentDuration <= 0) continue;
            
            // Create animation for camera position (x, y, z)
            this.timeline.to(this.camera.position, {
                x: currentKeyframe.position.x,
                y: currentKeyframe.position.y,
                z: currentKeyframe.position.z,
                duration: segmentDuration,
                ease: this.easing,
                onUpdate: () => {
                    // Ensure camera matrix is updated
                    this.camera.updateProjectionMatrix();
                }
            }, prevKeyframe.time);
            
            // Create animation for camera target (for orbit controls)
            this.timeline.to(this.controls.target, {
                x: currentKeyframe.target.x,
                y: currentKeyframe.target.y,
                z: currentKeyframe.target.z,
                duration: segmentDuration,
                ease: this.easing,
                onUpdate: () => {
                    // Update orbit controls
                    this.controls.update();
                }
            }, prevKeyframe.time);
        }
        
        // Setup scroll trigger if enabled
        if (this.isScrollEnabled) {
            this.setupScrollTrigger();
        } else {
            // Kill any existing scroll trigger
            if (this.timeline.scrollTrigger) {
                this.timeline.scrollTrigger.kill();
                this.timeline.scrollTrigger = null;
            }
        }
    }
    
    // Configure scroll trigger animation
    setupScrollTrigger() {
        if (!window.gsap || !window.ScrollTrigger) return;
        
        // Kill any existing scroll trigger
        if (this.timeline.scrollTrigger) {
            this.timeline.scrollTrigger.kill();
        }
        
        // Create a scroll container if it doesn't exist
        let scrollContainer = document.getElementById('scroll-container');
        if (!scrollContainer) {
            // Create a container that will hold our scroll space
            scrollContainer = document.createElement('div');
            scrollContainer.id = 'scroll-container';
            scrollContainer.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 5px;
                height: 100vh;
                z-index: -1;
                background: transparent;
                overflow-y: auto;
                pointer-events: none;
            `;
            
            // Create inner scroll space (height based on animation duration)
            const scrollInner = document.createElement('div');
            scrollInner.id = 'scroll-inner';
            scrollInner.style.cssText = `
                height: 300vh; /* Will be adjusted dynamically */
                width: 1px;
            `;
            
            scrollContainer.appendChild(scrollInner);
            document.body.appendChild(scrollContainer);
        }
        
        // Set the scroll trigger
        this.timeline.scrollTrigger = ScrollTrigger.create({
            trigger: '#scroll-inner',
            start: `top ${this.scrollStart}%`,
            end: `bottom ${this.scrollEnd}%`,
            scrub: this.smoothScrubbing ? 0.5 : false,
            markers: true,
            onUpdate: (self) => {
                // Update timeline scrubber UI if available
                const scrubber = document.getElementById('timelineScrubber');
                if (scrubber) {
                    // Calculate position based on progress
                    const progress = self.progress;
                    const totalTime = this.keyframes[this.keyframes.length - 1].time;
                    const currentTime = progress * totalTime;
                    
                    // Update scrubber position
                    this.updateTimelineScrubber(currentTime);
                }
            }
        });
    }
    
    // Play the animation
    play() {
        if (!this.timeline || this.keyframes.length < 2) return;
        
        this.isPlaying = true;
        this.timeline.play();
        
        // Update play button state
        const playBtn = document.getElementById('playTimeline');
        if (playBtn) {
            playBtn.textContent = 'Pause';
        }
    }
    
    // Pause the animation
    pause() {
        if (!this.timeline) return;
        
        this.isPlaying = false;
        this.timeline.pause();
        
        // Update play button state
        const playBtn = document.getElementById('playTimeline');
        if (playBtn) {
            playBtn.textContent = 'Play';
        }
    }
    
    // Stop the animation and return to first frame
    stop() {
        if (!this.timeline) return;
        
        this.isPlaying = false;
        this.timeline.pause(0);
        
        // Update play button state
        const playBtn = document.getElementById('playTimeline');
        if (playBtn) {
            playBtn.textContent = 'Play';
        }
        
        // Reset camera to first keyframe if available
        if (this.keyframes.length > 0) {
            const firstKF = this.keyframes[0];
            this.camera.position.copy(firstKF.position);
            this.controls.target.copy(firstKF.target);
            this.controls.update();
        }
        
        // Update timeline scrubber
        this.updateTimelineScrubber(0);
    }
    
    // Toggle animation playback
    togglePlay() {
        if (this.isPlaying) {
            this.pause();
        } else {
            this.play();
        }
    }
    
    // Change animation duration
    setDuration(duration) {
        this.duration = duration;
        this.updateAnimation();
    }
    
    // Change animation easing
    setEasing(easing) {
        this.easing = easing;
        this.updateAnimation();
    }
    
    // Toggle animation looping
    toggleLooping(isLooping) {
        this.isLooping = isLooping;
    }
    
    // Toggle scroll-based animation
    toggleScrollAnimation(isEnabled) {
        this.isScrollEnabled = isEnabled;
        
        if (isEnabled) {
            this.setupScrollTrigger();
        } else if (this.timeline && this.timeline.scrollTrigger) {
            this.timeline.scrollTrigger.kill();
            this.timeline.scrollTrigger = null;
        }
    }
    
    // Set scroll animation parameters
    setScrollParameters(start, end, smooth) {
        this.scrollStart = start;
        this.scrollEnd = end;
        this.smoothScrubbing = smooth;
        
        if (this.isScrollEnabled) {
            this.setupScrollTrigger();
        }
    }
    
    // Create or update camera path visualization
    updateCameraPath() {
        if (this.keyframes.length < 2) {
            // Remove existing path if not enough keyframes
            if (this.pathHelper) {
                this.sceneManager.scene.remove(this.pathHelper);
                this.pathHelper = null;
            }
            return;
        }
        
        // Calculate path points with extra interpolated points for smoother curves
        this.cameraPathPoints = [];
        
        // For each segment between keyframes, create interpolated points
        for (let i = 0; i < this.keyframes.length - 1; i++) {
            const start = this.keyframes[i];
            const end = this.keyframes[i + 1];
            const segmentDuration = end.time - start.time;
            
            // Skip if segment has no duration
            if (segmentDuration <= 0) continue;
            
            // Add start point
            this.cameraPathPoints.push(start.position.clone());
            
            // Add interpolated points (10 points per segment for a smooth curve)
            const steps = 10;
            for (let step = 1; step < steps; step++) {
                const t = step / steps;
                
                // Use GSAP's ease to calculate interpolated position
                const easedT = this.getEasedTime(t, this.easing);
                
                const interpX = start.position.x + (end.position.x - start.position.x) * easedT;
                const interpY = start.position.y + (end.position.y - start.position.y) * easedT;
                const interpZ = start.position.z + (end.position.z - start.position.z) * easedT;
                
                this.cameraPathPoints.push(new THREE.Vector3(interpX, interpY, interpZ));
            }
        }
        
        // Add the last keyframe position
        this.cameraPathPoints.push(this.keyframes[this.keyframes.length - 1].position.clone());
        
        // Create or update the path visualization
        if (!this.pathHelper) {
            // Create curve from points
            const curve = new THREE.CatmullRomCurve3(this.cameraPathPoints);
            
            // Create geometry from curve
            const tubeGeometry = new THREE.TubeGeometry(curve, 100, 0.1, 8, false);
            
            // Create material
            const tubeMaterial = new THREE.MeshBasicMaterial({
                color: 0x00ff00,
                transparent: true,
                opacity: 0.5,
                wireframe: false
            });
            
            // Create mesh
            this.pathHelper = new THREE.Mesh(tubeGeometry, tubeMaterial);
            this.sceneManager.scene.add(this.pathHelper);
        } else {
            // Update existing path
            const curve = new THREE.CatmullRomCurve3(this.cameraPathPoints);
            this.pathHelper.geometry.dispose();
            this.pathHelper.geometry = new THREE.TubeGeometry(curve, 100, 0.1, 8, false);
        }
    }
    
    // Helper to convert easing string to actual eased value
    getEasedTime(t, easing) {
        // Simple implementation for common easing types
        switch (easing) {
            case 'power1.inOut':
                return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
            case 'power2.inOut':
                return t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1;
            case 'elastic.out':
                const p = 0.3;
                return Math.pow(2, -10 * t) * Math.sin((t - p / 4) * (2 * Math.PI) / p) + 1;
            case 'bounce.out':
                if (t < (1 / 2.75)) {
                    return 7.5625 * t * t;
                } else if (t < (2 / 2.75)) {
                    return 7.5625 * (t -= (1.5 / 2.75)) * t + 0.75;
                } else if (t < (2.5 / 2.75)) {
                    return 7.5625 * (t -= (2.25 / 2.75)) * t + 0.9375;
                } else {
                    return 7.5625 * (t -= (2.625 / 2.75)) * t + 0.984375;
                }
            case 'back.inOut':
                const s = 1.70158 * 1.525;
                if (t < 0.5) {
                    return 0.5 * (t * t * ((s + 1) * 2 * t - s));
                } else {
                    return 0.5 * ((t - 2) * (t - 2) * ((s + 1) * (t * 2 - 2) + s) + 2);
                }
            default: // Linear
                return t;
        }
    }
    
    // Update keyframes list in the UI
    updateKeyframesUI() {
        const keyframesList = document.getElementById('keyframesList');
        if (!keyframesList) return;
        
        // Clear existing list
        keyframesList.innerHTML = '';
        
        // Add keyframes to list
        this.keyframes.forEach((keyframe, index) => {
            const li = document.createElement('li');
            li.dataset.id = keyframe.id;
            li.className = 'keyframe-item';
            
            // Time display
            const timeSpan = document.createElement('span');
            timeSpan.className = 'keyframe-item-time';
            timeSpan.textContent = `${keyframe.time.toFixed(1)}s`;
            
            // Position info
            const posSpan = document.createElement('span');
            posSpan.className = 'keyframe-item-position';
            posSpan.title = `X: ${keyframe.position.x.toFixed(2)}, Y: ${keyframe.position.y.toFixed(2)}, Z: ${keyframe.position.z.toFixed(2)}`;
            posSpan.textContent = `Pos (${keyframe.position.x.toFixed(1)}, ${keyframe.position.y.toFixed(1)}, ${keyframe.position.z.toFixed(1)})`;
            
            // Target info
            const targetSpan = document.createElement('span');
            targetSpan.className = 'keyframe-item-target';
            targetSpan.title = `X: ${keyframe.target.x.toFixed(2)}, Y: ${keyframe.target.y.toFixed(2)}, Z: ${keyframe.target.z.toFixed(2)}`;
            targetSpan.textContent = `Target (${keyframe.target.x.toFixed(1)}, ${keyframe.target.y.toFixed(1)}, ${keyframe.target.z.toFixed(1)})`;
            
            // Control buttons
            const controlsDiv = document.createElement('div');
            controlsDiv.className = 'keyframe-item-controls';
            
            // Update button
            const updateBtn = document.createElement('button');
            updateBtn.title = 'Update to current camera';
            updateBtn.textContent = '✓';
            updateBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.updateKeyframe(keyframe.id);
            });
            
            // Delete button
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'delete-btn';
            deleteBtn.title = 'Delete keyframe';
            deleteBtn.textContent = '×';
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.removeKeyframe(keyframe.id);
            });
            
            // Add elements to controls div
            controlsDiv.appendChild(updateBtn);
            controlsDiv.appendChild(deleteBtn);
            
            // Add all elements to list item
            li.appendChild(timeSpan);
            li.appendChild(posSpan);
            li.appendChild(targetSpan);
            li.appendChild(controlsDiv);
            
            // Add item to list
            keyframesList.appendChild(li);
            
            // Add click event for selecting this keyframe
            li.addEventListener('click', () => {
                // Move camera to this keyframe
                this.camera.position.copy(keyframe.position);
                this.controls.target.copy(keyframe.target);
                this.controls.update();
                
                // Update timeline scrubber
                this.updateTimelineScrubber(keyframe.time);
                
                // Update selected state
                document.querySelectorAll('#keyframesList li').forEach(item => {
                    item.classList.remove('selected');
                });
                li.classList.add('selected');
            });
        });
        
        // Update the timeline UI
        this.updateTimelineUI();
    }
    
    // Update animation settings UI
    updateUI() {
        // Duration input
        const durationInput = document.getElementById('animationDuration');
        if (durationInput) {
            durationInput.value = this.duration;
            durationInput.addEventListener('input', (e) => {
                this.setDuration(parseFloat(e.target.value));
            });
        }
        
        // Easing dropdown
        const easingSelect = document.getElementById('animationEasing');
        if (easingSelect) {
            easingSelect.value = this.easing;
            easingSelect.addEventListener('change', (e) => {
                this.setEasing(e.target.value);
            });
        }
        
        // Loop checkbox
        const loopCheckbox = document.getElementById('loopAnimation');
        if (loopCheckbox) {
            loopCheckbox.checked = this.isLooping;
            loopCheckbox.addEventListener('change', (e) => {
                this.toggleLooping(e.target.checked);
            });
        }
        
        // Scroll animation checkbox
        const scrollCheckbox = document.getElementById('enableScrollAnimation');
        if (scrollCheckbox) {
            scrollCheckbox.checked = this.isScrollEnabled;
            scrollCheckbox.addEventListener('change', (e) => {
                this.toggleScrollAnimation(e.target.checked);
            });
        }
        
        // Scroll start input
        const scrollStartInput = document.getElementById('scrollTriggerStart');
        if (scrollStartInput) {
            scrollStartInput.value = this.scrollStart;
            scrollStartInput.addEventListener('input', (e) => {
                const scrollEnd = document.getElementById('scrollTriggerEnd');
                const scrubbing = document.getElementById('scrollScrubbing');
                this.setScrollParameters(
                    parseFloat(e.target.value),
                    scrollEnd ? parseFloat(scrollEnd.value) : this.scrollEnd,
                    scrubbing ? scrubbing.value === 'true' : this.smoothScrubbing
                );
            });
        }
        
        // Scroll end input
        const scrollEndInput = document.getElementById('scrollTriggerEnd');
        if (scrollEndInput) {
            scrollEndInput.value = this.scrollEnd;
            scrollEndInput.addEventListener('input', (e) => {
                const scrollStart = document.getElementById('scrollTriggerStart');
                const scrubbing = document.getElementById('scrollScrubbing');
                this.setScrollParameters(
                    scrollStart ? parseFloat(scrollStart.value) : this.scrollStart,
                    parseFloat(e.target.value),
                    scrubbing ? scrubbing.value === 'true' : this.smoothScrubbing
                );
            });
        }
        
        // Scrubbing select
        const scrubbingSelect = document.getElementById('scrollScrubbing');
        if (scrubbingSelect) {
            scrubbingSelect.value = this.smoothScrubbing ? 'true' : 'false';
            scrubbingSelect.addEventListener('change', (e) => {
                const scrollStart = document.getElementById('scrollTriggerStart');
                const scrollEnd = document.getElementById('scrollTriggerEnd');
                this.setScrollParameters(
                    scrollStart ? parseFloat(scrollStart.value) : this.scrollStart,
                    scrollEnd ? parseFloat(scrollEnd.value) : this.scrollEnd,
                    e.target.value === 'true'
                );
            });
        }
        
        // Add keyframe button
        const addKeyframeBtn = document.getElementById('addKeyframe');
        if (addKeyframeBtn) {
            addKeyframeBtn.addEventListener('click', () => {
                this.addKeyframe();
            });
        }
        
        // Preview animation button
        const previewBtn = document.getElementById('previewAnimation');
        if (previewBtn) {
            previewBtn.addEventListener('click', () => {
                this.togglePlay();
            });
        }
        
        // Play button
        const playBtn = document.getElementById('playTimeline');
        if (playBtn) {
            playBtn.addEventListener('click', () => {
                this.togglePlay();
            });
        }
        
        // Stop button
        const stopBtn = document.getElementById('stopTimeline');
        if (stopBtn) {
            stopBtn.addEventListener('click', () => {
                this.stop();
            });
        }
        
        // Export animation button
        const exportBtn = document.getElementById('exportAnimation');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => {
                this.exportAnimationCode();
            });
        }
    }
    
    // Update timeline UI
    updateTimelineUI() {
        if (this.keyframes.length < 2) return;
        
        const timelineRuler = document.getElementById('timelineRuler');
        const timelineTracks = document.getElementById('timelineTracks');
        if (!timelineRuler || !timelineTracks) return;
        
        // Clear existing content
        timelineRuler.innerHTML = '';
        timelineTracks.innerHTML = '';
        
        // Get total animation duration from last keyframe time
        const totalDuration = this.keyframes[this.keyframes.length - 1].time;
        
        // Create ruler markers (one per second)
        for (let i = 0; i <= totalDuration; i++) {
            const marker = document.createElement('div');
            marker.className = 'time-marker' + (i % 5 === 0 ? ' major' : '');
            marker.style.left = `${(i / totalDuration) * 100}%`;
            marker.textContent = i % 5 === 0 ? `${i}s` : '';
            timelineRuler.appendChild(marker);
        }
        
        // Create a track for camera position
        const posTrack = document.createElement('div');
        posTrack.className = 'timeline-track';
        
        const posLabel = document.createElement('div');
        posLabel.className = 'timeline-track-label';
        posLabel.textContent = 'Camera';
        
        const posContent = document.createElement('div');
        posContent.className = 'timeline-track-content';
        
        // Add keyframes to track
        this.keyframes.forEach(keyframe => {
            const keyframeEl = document.createElement('div');
            keyframeEl.className = 'timeline-keyframe';
            keyframeEl.style.left = `${(keyframe.time / totalDuration) * 100}%`;
            keyframeEl.dataset.id = keyframe.id;
            keyframeEl.title = `${keyframe.time}s`;
            
            // Add click event
            keyframeEl.addEventListener('click', () => {
                // Select this keyframe
                document.querySelectorAll('.timeline-keyframe').forEach(kf => {
                    kf.classList.remove('selected');
                });
                keyframeEl.classList.add('selected');
                
                // Move camera to this keyframe
                this.camera.position.copy(keyframe.position);
                this.controls.target.copy(keyframe.target);
                this.controls.update();
                
                // Update timeline scrubber
                this.updateTimelineScrubber(keyframe.time);
                
                // Update keyframes list selection
                document.querySelectorAll('#keyframesList li').forEach(item => {
                    item.classList.remove('selected');
                    if (item.dataset.id === keyframe.id) {
                        item.classList.add('selected');
                    }
                });
            });
            
            posContent.appendChild(keyframeEl);
        });
        
        posTrack.appendChild(posLabel);
        posTrack.appendChild(posContent);
        timelineTracks.appendChild(posTrack);
        
        // Create a track for target position
        const targetTrack = document.createElement('div');
        targetTrack.className = 'timeline-track';
        
        const targetLabel = document.createElement('div');
        targetLabel.className = 'timeline-track-label';
        targetLabel.textContent = 'Target';
        
        const targetContent = document.createElement('div');
        targetContent.className = 'timeline-track-content';
        
        // Add keyframes to track
        this.keyframes.forEach(keyframe => {
            const keyframeEl = document.createElement('div');
            keyframeEl.className = 'timeline-keyframe';
            keyframeEl.style.left = `${(keyframe.time / totalDuration) * 100}%`;
            keyframeEl.dataset.id = keyframe.id;
            keyframeEl.title = `${keyframe.time}s`;
            
            // Add click event (same as camera position track)
            keyframeEl.addEventListener('click', () => {
                document.querySelectorAll('.timeline-keyframe').forEach(kf => {
                    kf.classList.remove('selected');
                });
                keyframeEl.classList.add('selected');
                
                this.camera.position.copy(keyframe.position);
                this.controls.target.copy(keyframe.target);
                this.controls.update();
                
                this.updateTimelineScrubber(keyframe.time);
                
                document.querySelectorAll('#keyframesList li').forEach(item => {
                    item.classList.remove('selected');
                    if (item.dataset.id === keyframe.id) {
                        item.classList.add('selected');
                    }
                });
            });
            
            targetContent.appendChild(keyframeEl);
        });
        
        targetTrack.appendChild(targetLabel);
        targetTrack.appendChild(targetContent);
        timelineTracks.appendChild(targetTrack);
        
        // Add the scrubber
        const scrubber = document.getElementById('timelineScrubber');
        if (scrubber) {
            scrubber.style.left = '0%';
        }
    }
    
    // Update timeline scrubber position
    updateTimelineScrubber(time) {
        const scrubber = document.getElementById('timelineScrubber');
        if (!scrubber || this.keyframes.length < 2) return;
        
        const totalDuration = this.keyframes[this.keyframes.length - 1].time;
        const percentage = (time / totalDuration) * 100;
        
        scrubber.style.left = `${percentage}%`;
    }
    
    // Export animation code
    exportAnimationCode() {
        if (this.keyframes.length < 2) {
            alert('You need at least 2 keyframes to export animation');
            return;
        }
        
        let code = `// GSAP Camera Animation Code\n`;
        code += `// Total keyframes: ${this.keyframes.length}\n\n`;
        
        // Add GSAP imports
        code += `// Import GSAP (in your HTML or via import):\n`;
        code += `// <script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.11.4/gsap.min.js"></script>\n`;
        if (this.isScrollEnabled) {
            code += `// <script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.11.4/ScrollTrigger.min.js"></script>\n`;
            code += `// gsap.registerPlugin(ScrollTrigger);\n`;
        }
        code += `\n`;
        
        // Keyframes data
        code += `// Keyframes data\n`;
        code += `const keyframes = [\n`;
        this.keyframes.forEach(kf => {
            code += `  {\n`;
            code += `    time: ${kf.time},\n`;
            code += `    position: { x: ${kf.position.x.toFixed(2)}, y: ${kf.position.y.toFixed(2)}, z: ${kf.position.z.toFixed(2)} },\n`;
            code += `    target: { x: ${kf.target.x.toFixed(2)}, y: ${kf.target.y.toFixed(2)}, z: ${kf.target.z.toFixed(2)} }\n`;
            code += `  },\n`;
        });
        code += `];\n\n`;
        
        // Animation function
        code += `// Animation setup function\n`;
        code += `function setupCameraAnimation(camera, controls) {\n`;
        code += `  // Create timeline\n`;
        code += `  const timeline = gsap.timeline({\n`;
        code += `    paused: ${!this.isScrollEnabled},\n`;
        if (this.isLooping && !this.isScrollEnabled) {
            code += `    repeat: -1, // Loop indefinitely\n`;
        }
        code += `  });\n\n`;
        
        // Add animation segments
        code += `  // Add animation segments\n`;
        code += `  for (let i = 1; i < keyframes.length; i++) {\n`;
        code += `    const prevKeyframe = keyframes[i-1];\n`;
        code += `    const currentKeyframe = keyframes[i];\n`;
        code += `    const segmentDuration = currentKeyframe.time - prevKeyframe.time;\n\n`;
        
        code += `    // Skip if segment has no duration\n`;
        code += `    if (segmentDuration <= 0) continue;\n\n`;
        
        code += `    // Camera position animation\n`;
        code += `    timeline.to(camera.position, {\n`;
        code += `      x: currentKeyframe.position.x,\n`;
        code += `      y: currentKeyframe.position.y,\n`;
        code += `      z: currentKeyframe.position.z,\n`;
        code += `      duration: segmentDuration,\n`;
        code += `      ease: "${this.easing}",\n`;
        code += `      onUpdate: () => camera.updateProjectionMatrix()\n`;
        code += `    }, prevKeyframe.time);\n\n`;
        
        code += `    // Camera target animation (for orbit controls)\n`;
        code += `    timeline.to(controls.target, {\n`;
        code += `      x: currentKeyframe.target.x,\n`;
        code += `      y: currentKeyframe.target.y,\n`;
        code += `      z: currentKeyframe.target.z,\n`;
        code += `      duration: segmentDuration,\n`;
        code += `      ease: "${this.easing}",\n`;
        code += `      onUpdate: () => controls.update()\n`;
        code += `    }, prevKeyframe.time);\n`;
        code += `  }\n\n`;
        
        // Add scroll trigger configuration if enabled
        if (this.isScrollEnabled) {
            code += `  // Set up scroll trigger\n`;
            code += `  ScrollTrigger.create({\n`;
            code += `    trigger: "#your-scroll-container", // Replace with your container\n`;
            code += `    start: "top ${this.scrollStart}%",\n`;
            code += `    end: "bottom ${this.scrollEnd}%",\n`;
            code += `    scrub: ${this.smoothScrubbing ? 0.5 : false},\n`;
            code += `    animation: timeline,\n`;
            code += `    markers: true // Remove in production\n`;
            code += `  });\n\n`;
        }
        
        code += `  return timeline;\n`;
        code += `}\n\n`;
        
        // Add usage example
        code += `// Usage example:\n`;
        code += `// const cameraTimeline = setupCameraAnimation(camera, controls);\n`;
        if (!this.isScrollEnabled) {
            code += `// cameraTimeline.play();\n`;
        }
        
        // Create a function to copy to clipboard
        const copyToClipboard = (text) => {
            try {
                navigator.clipboard.writeText(text).then(() => {
                    alert('Animation code copied to clipboard!');
                });
            } catch (err) {
                // Fallback for older browsers
                const textarea = document.createElement('textarea');
                textarea.value = text;
                document.body.appendChild(textarea);
                textarea.select();
                document.execCommand('copy');
                document.body.removeChild(textarea);
                alert('Animation code copied to clipboard!');
            }
        };
        
        // Copy the code to clipboard
        copyToClipboard(code);
    }
}

// Initialize function exposed to the window object
function initAnimationManager(scene, camera, controls) {
    // Create and return a new AnimationManager instance
    const animationManager = new AnimationManager(window.sceneManager, camera, controls);
    
    console.log('Animation Manager initialized');
    return animationManager;
}

// Expose the initialization function to the window
window.initAnimationManager = initAnimationManager;
