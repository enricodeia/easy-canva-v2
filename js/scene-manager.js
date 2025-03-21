// Enhanced initEditor function with animation and physics support
function initEditor() {
    // Scene manager to keep track of all objects and their properties
    class EnhancedSceneManager extends SceneManager {
        constructor() {
            super();
            
            // Add new properties for advanced features
            this.groups = []; // For object grouping
            this.shortcuts = {}; // For keyboard shortcuts
            this.customUI = {}; // For UI customization
        }
        
        // Get object by UUID
        getObjectByUUID(uuid) {
            const objectData = this.objects.find(obj => obj.object.uuid === uuid);
            if (objectData) {
                return objectData.object;
            }
            return null;
        }
        
        // Get object data by UUID
        getObjectDataByUUID(uuid) {
            return this.objects.find(obj => obj.object.uuid === uuid);
        }
        
        // Create a group from selected objects
        createGroup(objects, name) {
            const group = new THREE.Group();
            group.name = name || `Group ${this.groups.length + 1}`;
            
            // Add objects to group
            objects.forEach(obj => {
                // Get world position
                const worldPos = new THREE.Vector3();
                obj.getWorldPosition(worldPos);
                
                // Remove from current parent
                obj.parent.remove(obj);
                
                // Add to group
                group.add(obj);
                
                // Adjust position to maintain world position
                obj.position.copy(worldPos).sub(group.position);
            });
            
            // Add group to scene
            scene.add(group);
            
            // Add to scene manager
            const groupData = this.addObject(group, group.name);
            
            // Add to groups array
            this.groups.push(groupData);
            
            // Update UI
            this.updateLayerPanel();
            
            return groupData;
        }
        
        // Ungroup a group
        ungroup(groupId) {
            const groupData = this.objects.find(obj => obj.id === groupId);
            if (!groupData || !(groupData.object instanceof THREE.Group)) {
                return false;
            }
            
            const group = groupData.object;
            const parent = group.parent;
            
            // Get all children
            const children = [...group.children];
            
            // Move each child to the parent
            children.forEach(child => {
                // Get world position
                const worldPos = new THREE.Vector3();
                child.getWorldPosition(worldPos);
                
                // Remove from group
                group.remove(child);
                
                // Add to parent
                parent.add(child);
                
                // Adjust position to maintain world position
                child.position.copy(worldPos);
                
                // Add to scene manager if not already there
                if (!this.objects.some(obj => obj.object === child)) {
                    this.addObject(child, child.name || 'Ungrouped Object');
                }
            });
            
            // Remove group from scene
            parent.remove(group);
            
            // Remove from scene manager
            this.removeObject(groupData.id);
            
            // Remove from groups array
            const groupIndex = this.groups.findIndex(g => g.id === groupData.id);
            if (groupIndex !== -1) {
                this.groups.splice(groupIndex, 1);
            }
            
            // Update UI
            this.updateLayerPanel();
            
            return true;
        }
        
        // Register a keyboard shortcut
        registerShortcut(key, ctrlKey, shiftKey, callback, description) {
            const shortcutId = `${ctrlKey ? 'Ctrl+' : ''}${shiftKey ? 'Shift+' : ''}${key}`;
            this.shortcuts[shortcutId] = {
                key,
                ctrlKey: ctrlKey || false,
                shiftKey: shiftKey || false,
                callback,
                description: description || `Shortcut ${shortcutId}`
            };
            
            console.log(`Registered shortcut: ${shortcutId} - ${description}`);
            
            // Update shortcuts panel if exists
            this.updateShortcutsPanel();
        }
        
        // Update shortcuts panel in UI
        updateShortcutsPanel() {
            const shortcutsPanel = document.getElementById('shortcutsPanel');
            if (!shortcutsPanel) return;
            
            // Clear existing content
            shortcutsPanel.innerHTML = '';
            
            // Add all shortcuts
            for (const [id, shortcut] of Object.entries(this.shortcuts)) {
                const item = document.createElement('div');
                item.className = 'shortcut-item';
                
                const key = document.createElement('span');
                key.className = 'shortcut-key';
                key.textContent = id;
                
                const desc = document.createElement('span');
                desc.className = 'shortcut-description';
                desc.textContent = shortcut.description;
                
                item.appendChild(key);
                item.appendChild(desc);
                shortcutsPanel.appendChild(item);
            }
        }
        
        // Set up default keyboard shortcuts
        setupDefaultShortcuts(commandManager) {
            // Delete selected object
            this.registerShortcut('Delete', false, false, () => {
                if (this.selectedObject) {
                    const command = new RemoveObjectCommand(
                        scene, 
                        this.selectedObject.object, 
                        `Delete ${this.selectedObject.name}`
                    );
                    commandManager.execute(command);
                }
            }, 'Delete selected object');
            
            // Duplicate selected object
            this.registerShortcut('d', true, false, () => {
                if (this.selectedObject) {
                    const original = this.selectedObject.object;
                    
                    // Clone the object
                    const clone = original.clone();
                    clone.name = `${original.name} (Copy)`;
                    
                    // Offset position slightly
                    clone.position.x += 0.2;
                    clone.position.z += 0.2;
                    
                    // Add to scene
                    const command = new AddObjectCommand(
                        scene, 
                        clone, 
                        original.parent, 
                        `Duplicate ${original.name}`
                    );
                    commandManager.execute(command);
                    
                    // Select the new object
                    const newObj = this.addObject(clone, clone.name);
                    this.selectObject(newObj.id);
                }
            }, 'Duplicate object (Ctrl+D)');
            
            // Group selected objects
            this.registerShortcut('g', true, false, () => {
                // TODO: Implement multi-selection first
                console.log('Group objects shortcut triggered');
            }, 'Group selected objects (Ctrl+G)');
            
            // Save scene
            this.registerShortcut('s', true, false, () => {
                exportScene();
            }, 'Save scene (Ctrl+S)');
        }
        
        // Update scene hierarchy visualization
        updateHierarchyPanel() {
            const hierarchyPanel = document.getElementById('hierarchyPanel');
            if (!hierarchyPanel) return;
            
            // Clear existing content
            hierarchyPanel.innerHTML = '';
            
            // Create a tree structure
            const createTreeItem = (obj, depth = 0) => {
                const item = document.createElement('div');
                item.className = 'hierarchy-item';
                item.dataset.id = obj.id;
                item.style.paddingLeft = `${depth * 20}px`;
                
                // Add toggle button if object has children
                if (obj.object.children && obj.object.children.length > 0) {
                    const toggle = document.createElement('span');
                    toggle.className = 'hierarchy-toggle';
                    toggle.textContent = '▼';
                    toggle.addEventListener('click', (e) => {
                        e.stopPropagation();
                        const childContainer = item.nextElementSibling;
                        if (childContainer) {
                            childContainer.style.display = 
                                childContainer.style.display === 'none' ? 'block' : 'none';
                            toggle.textContent = 
                                childContainer.style.display === 'none' ? '►' : '▼';
                        }
                    });
                    item.appendChild(toggle);
                } else {
                    const spacer = document.createElement('span');
                    spacer.className = 'hierarchy-spacer';
                    spacer.textContent = ' ';
                    item.appendChild(spacer);
                }
                
                // Add icon based on object type
                const icon = document.createElement('span');
                icon.className = 'hierarchy-icon';
                
                if (obj.object instanceof THREE.Mesh) {
                    icon.textContent = '■';
                } else if (obj.object instanceof THREE.Group) {
                    icon.textContent = '⚃';
                } else if (obj.object instanceof THREE.Light) {
                    icon.textContent = '☀';
                } else if (obj.object instanceof THREE.Camera) {
                    icon.textContent = '⌖';
                } else {
                    icon.textContent = '○';
                }
                
                // Add highlight if selected
                if (this.selectedObject && this.selectedObject.id === obj.id) {
                    icon.classList.add('selected');
                }
                
                item.appendChild(icon);
                
                // Add name
                const name = document.createElement('span');
                name.className = 'hierarchy-name';
                name.textContent = obj.name;
                
                // Add highlight if selected
                if (this.selectedObject && this.selectedObject.id === obj.id) {
                    name.classList.add('selected');
                }
                
                item.appendChild(name);
                
                // Add visibility toggle
                const visToggle = document.createElement('span');
                visToggle.className = 'hierarchy-visibility';
                visToggle.textContent = obj.visible ? '👁' : '👁‍🗨';
                visToggle.addEventListener('click', (e) => {
                    e.stopPropagation();
                    obj.visible = !obj.visible;
                    obj.object.visible = obj.visible;
                    visToggle.textContent = obj.visible ? '👁' : '👁‍🗨';
                });
                item.appendChild(visToggle);
                
                // Add click event for selecting
                item.addEventListener('click', () => {
                    this.selectObject(obj.id);
                });
                
                return item;
            };
            
            // Add top-level objects
            const topLevelObjects = this.objects.filter(obj => 
                obj.object.parent === scene || obj.object.parent === null
            );
            
            // Build the hierarchy
            const buildHierarchy = (objects, parent, depth = 0) => {
                objects.forEach(obj => {
                    const item = createTreeItem(obj, depth);
                    hierarchyPanel.appendChild(item);
                    
                    // Check for children
                    const childObjects = this.objects.filter(child => 
                        child.object.parent === obj.object
                    );
                    
                    if (childObjects.length > 0) {
                        const childContainer = document.createElement('div');
                        childContainer.className = 'hierarchy-children';
                        hierarchyPanel.appendChild(childContainer);
                        
                        // Recursively build children
                        buildHierarchy(childObjects, childContainer, depth + 1);
                    }
                });
            };
            
            buildHierarchy(topLevelObjects, hierarchyPanel);
        }
    }

    // Initialize THREE.js scene, renderer, camera
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0c0c0c);
    
    // Get canvas element
    const canvas = document.getElementById('three-canvas');
    if (!canvas) {
        console.error('Canvas element not found');
        return;
    }
    
    // Set up renderer
    const renderer = new THREE.WebGLRenderer({ 
        antialias: true,
        canvas: canvas
    });
    renderer.setSize(window.innerWidth - 640, window.innerHeight); // Adjusted for both sidebars
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1;
    renderer.outputEncoding = THREE.sRGBEncoding;
    
    // Camera setup
    const aspectRatio = (window.innerWidth - 640) / window.innerHeight;
    const perspectiveCamera = new THREE.PerspectiveCamera(75, aspectRatio, 0.1, 1000);
    const orthographicCamera = new THREE.OrthographicCamera(
        -5 * aspectRatio, 5 * aspectRatio, 5, -5, 0.1, 1000
    );
    
    // Set initial camera position and target
    let camera = perspectiveCamera;
    camera.position.set(0, 2, 5);
    const cameraTarget = new THREE.Vector3(0, 0, 0);
    camera.lookAt(cameraTarget);
    
    // Create enhanced scene manager
    const sceneManager = new EnhancedSceneManager();
    
    // Create command manager for undo/redo
    const commandManager = new CommandManager();
    
    // Set up orbit controls
    const orbitControls = new THREE.OrbitControls(camera, renderer.domElement);
    orbitControls.enableDamping = true;
    orbitControls.dampingFactor = 0.05;
    
    // Create animation manager
    const animationManager = new AnimationManager(sceneManager, camera, orbitControls);
    
    // Create physics manager
    const physicsManager = new PhysicsManager(sceneManager);
    
    // Add managers to scene manager for access
    sceneManager.animationManager = animationManager;
    sceneManager.physicsManager = physicsManager;
    sceneManager.commandManager = commandManager;
    sceneManager.scene = scene;
    
    // Set up default keyboard shortcuts
    sceneManager.setupDefaultShortcuts(commandManager);
    
    // Initial scene setup (lights, grid, ground plane) - using existing code
    // ...
    
    // Animation loop
    function animate(time) {
        requestAnimationFrame(animate);
        
        // Update physics
        physicsManager.animate(time);
        
        // Update orbit controls
        orbitControls.update();
        
        // Render scene
        renderer.render(scene, camera);
    }
    
    // Start animation loop
    animate();
    
    // Window resize handler with support for both sidebars
    window.addEventListener('resize', () => {
        const width = window.innerWidth - 640; // Left sidebar (320px) + right sidebar (320px)
        const height = window.innerHeight;
        
        // Update camera aspect ratio
        if (camera === perspectiveCamera) {
            perspectiveCamera.aspect = width / height;
            perspectiveCamera.updateProjectionMatrix();
        } else {
            orthographicCamera.left = -5 * (width / height);
            orthographicCamera.right = 5 * (width / height);
            orthographicCamera.updateProjectionMatrix();
        }
        
        // Update renderer size
        renderer.setSize(width, height);
    });
    
    // Add UI for the right sidebar
    function setupRightSidebar() {
        // Create right sidebar element if not exists
        let rightSidebar = document.getElementById('right-sidebar');
        if (!rightSidebar) {
            // Create the right sidebar element
            rightSidebar = document.createElement('div');
            rightSidebar.id = 'right-sidebar';
            document.querySelector('.app-container').appendChild(rightSidebar);
            
            // Load the HTML content
            rightSidebar.innerHTML = `
                <!-- Right sidebar HTML here -->
                <div class="sidebar-header">
                    <h2>Animation & Physics</h2>
                </div>
                
                <!-- Undo/Redo buttons -->
                <div id="history-actions">
                    <button id="undoBtn" class="icon-btn" disabled>⟲ Undo</button>
                    <button id="redoBtn" class="icon-btn" disabled>⟳ Redo</button>
                </div>
                
                <!-- Main tabs navigation -->
                <div class="tabs-container">
                    <div class="tabs-header">
                        <button class="tab-btn active" data-tab="animation">Animation</button>
                        <button class="tab-btn" data-tab="physics">Physics</button>
                        <button class="tab-btn" data-tab="timeline">Timeline</button>
                    </div>
                    
                    <!-- Animation Tab -->
                    <div class="tab-content active" id="animation-tab">
                        <!-- Animation tab content from right-panel-html -->
                    </div>
                    
                    <!-- Physics Tab -->
                    <div class="tab-content" id="physics-tab">
                        <!-- Physics tab content from right-panel-html -->
                    </div>
                    
                    <!-- Timeline Tab -->
                    <div class="tab-content" id="timeline-tab">
                        <!-- Timeline tab content from right-panel-html -->
                    </div>
                </div>
            `;
        }
        
        // Set up undo/redo buttons
        const undoBtn = document.getElementById('undoBtn');
        const redoBtn = document.getElementById('redoBtn');
        
        if (undoBtn) {
            undoBtn.addEventListener('click', () => {
                commandManager.undo();
            });
        }
        
        if (redoBtn) {
            redoBtn.addEventListener('click', () => {
                commandManager.redo();
            });
        }
        
        // Set up tab switching
        const tabBtns = rightSidebar.querySelectorAll('.tab-btn');
        const tabContents = rightSidebar.querySelectorAll('.tab-content');
        
        tabBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                // Remove active class from all tabs
                tabBtns.forEach(tab => tab.classList.remove('active'));
                tabContents.forEach(content => content.classList.remove('active'));
                
                // Add active class to clicked tab
                btn.classList.add('active');
                
                // Show corresponding content
                const tabId = btn.dataset.tab;
                const contentTab = document.getElementById(`${tabId}-tab`);
                if (contentTab) {
                    contentTab.classList.add('active');
                }
            });
        });
        
        // Initialize tabs with actual content
        initAnimationTab();
        initPhysicsTab();
        initTimelineTab();
    }
    
    // Initialize animation tab
    function initAnimationTab() {
        const animationTab = document.getElementById('animation-tab');
        if (!animationTab) return;
        
        // Populate with animation controls content
        animationTab.innerHTML = `
            <!-- Camera Animation Section -->
            <div class="control-group">
                <div class="group-header">
                    <h3>Camera Animation</h3>
                    <div class="btn-group">
                        <button id="addKeyframe" class="icon-btn">+ Keyframe</button>
                        <button id="previewAnimation" class="icon-btn">Preview</button>
                    </div>
                </div>
                
                <!-- Keyframes List -->
                <div id="keyframesPanel">
                    <div class="keyframes-header">
                        <span class="keyframe-time">Time</span>
                        <span class="keyframe-position">Position</span>
                        <span class="keyframe-target">Target</span>
                        <span class="keyframe-controls"></span>
                    </div>
                    <ul id="keyframesList">
                        <!-- Keyframes will be listed here -->
                    </ul>
                </div>
                
                <!-- Animation Settings -->
                <div class="property">
                    <label for="animationDuration">Duration (seconds):</label>
                    <input type="number" id="animationDuration" min="0.1" step="0.1" value="5">
                </div>
                
                <div class="property">
                    <label for="animationEasing">Easing:</label>
                    <select id="animationEasing">
                        <option value="power1.inOut">Power 1 (Smooth)</option>
                        <option value="power2.inOut">Power 2 (Smoother)</option>
                        <option value="power3.inOut">Power 3 (Very Smooth)</option>
                        <option value="none.none">Linear</option>
                        <option value="elastic.out">Elastic</option>
                        <option value="bounce.out">Bounce</option>
                        <option value="back.inOut">Back</option>
                    </select>
                </div>
                
                <div class="property">
                    <div class="checkbox-group">
                        <input type="checkbox" id="loopAnimation">
                        <label for="loopAnimation">Loop Animation</label>
                    </div>
                </div>
            </div>
            
            <!-- Scroll Animation Section -->
            <div class="control-group">
                <div class="group-header">
                    <h3>Scroll Settings</h3>
                </div>
                
                <div class="property">
                    <div class="checkbox-group">
                        <input type="checkbox" id="enableScrollAnimation">
                        <label for="enableScrollAnimation">Enable Scroll Animation</label>
                    </div>
                </div>
                
                <div class="property">
                    <label for="scrollTriggerStart">Start Position (%):</label>
                    <input type="number" id="scrollTriggerStart" min="0" max="100" step="1" value="0">
                </div>
                
                <div class="property">
                    <label for="scrollTriggerEnd">End Position (%):</label>
                    <input type="number" id="scrollTriggerEnd" min="0" max="100" step="1" value="100">
                </div>
                
                <div class="property">
                    <label for="scrollScrubbing">Scrubbing:</label>
                    <select id="scrollScrubbing">
                        <option value="true">Smooth</option>
                        <option value="false">Instant</option>
                    </select>
                </div>
            </div>
            
            <!-- Export Options -->
            <div class="control-group">
                <div class="group-header">
                    <h3>Export</h3>
                </div>
                
                <div class="property">
                    <button id="exportAnimation" class="primary-btn full-width">Export Animation Code</button>
                </div>
            </div>
        `;
        
        // Initialize animation manager
        animationManager.updateUI();
    }
    
    // Initialize physics tab
    function initPhysicsTab() {
        const physicsTab = document.getElementById('physics-tab');
        if (!physicsTab) return;
        
        // Populate with physics controls content
        physicsTab.innerHTML = `
            <!-- Global Physics Settings -->
            <div class="control-group">
                <div class="group-header">
                    <h3>Physics World</h3>
                    <div class="btn-group">
                        <button id="togglePhysics" class="icon-btn">Start</button>
                        <button id="resetPhysics" class="icon-btn">Reset</button>
                    </div>
                </div>
                
                <div class="property">
                    <label>Gravity:</label>
                    <div class="vertical-inputs">
                        <div class="input-group">
                            <label for="gravityX">X:</label>
                            <input type="number" id="gravityX" step="0.1" value="0">
                        </div>
                        <div class="input-group">
                            <label for="gravityY">Y:</label>
                            <input type="number" id="gravityY" step="0.1" value="-9.8">
                        </div>
                        <div class="input-group">
                            <label for="gravityZ">Z:</label>
                            <input type="number" id="gravityZ" step="0.1" value="0">
                        </div>
                    </div>
                </div>
                
                <div class="property">
                    <div class="checkbox-group">
                        <input type="checkbox" id="showPhysicsDebug">
                        <label for="showPhysicsDebug">Show Physics Debug</label>
                    </div>
                </div>
            </div>
            
            <!-- Object Physics Properties -->
            <div class="control-group disabled" id="objectPhysicsProperties">
                <div class="group-header">
                    <h3>Object Physics</h3>
                    <span class="selected-name">No selection</span>
                </div>
                
                <div class="property">
                    <label for="physicsType">Physics Type:</label>
                    <select id="physicsType">
                        <option value="static">Static</option>
                        <option value="dynamic">Dynamic</option>
                        <option value="kinematic">Kinematic</option>
                    </select>
                </div>
                
                <div class="property">
                    <label for="collisionShape">Collision Shape:</label>
                    <select id="collisionShape">
                        <option value="auto">Auto (Based on Geometry)</option>
                        <option value="box">Box</option>
                        <option value="sphere">Sphere</option>
                        <option value="cylinder">Cylinder</option>
                        <option value="compound">Compound</option>
                    </select>
                </div>
                
                <div class="property">
                    <label for="mass">Mass:</label>
                    <input type="number" id="mass" min="0" step="0.1" value="1">
                </div>
                
                <div class="property">
                    <div class="vertical-inputs">
                        <div class="input-group">
                            <label for="friction">Friction:</label>
                            <input type="number" id="friction" min="0" max="1" step="0.01" value="0.3">
                        </div>
                        <div class="input-group">
                            <label for="restitution">Restitution:</label>
                            <input type="number" id="restitution" min="0" max="1" step="0.01" value="0.3">
                        </div>
                    </div>
                </div>
                
                <div class="property">
                    <button id="applyPhysics" class="primary-btn">Apply Physics</button>
                </div>
            </div>
            
            <!-- Physics Presets -->
            <div class="control-group">
                <div class="group-header">
                    <h3>Physics Presets</h3>
                </div>
                
                <div class="property">
                    <button class="preset-btn" data-preset="dropTest">Drop Test</button>
                    <button class="preset-btn" data-preset="domino">Domino Effect</button>
                    <button class="preset-btn" data-preset="ragdoll">Ragdoll</button>
                </div>
            </div>
        `;
        
        // Initialize physics manager
        physicsManager.updateUI();
    }
    
    // Initialize timeline tab
    function initTimelineTab() {
        const timelineTab = document.getElementById('timeline-tab');
        if (!timelineTab) return;
        
        // Populate with timeline controls content
        timelineTab.innerHTML = `
            <div class="control-group">
                <div class="group-header">
                    <h3>Animation Timeline</h3>
                    <div class="btn-group">
                        <button id="playTimeline" class="icon-btn">Play</button>
                        <button id="stopTimeline" class="icon-btn">Stop</button>
                    </div>
                </div>
                
                <div class="timeline-container">
                    <!-- Timeline ruler -->
                    <div class="timeline-ruler" id="timelineRuler">
                        <!-- Time markers will be generated here -->
                    </div>
                    
                    <!-- Timeline tracks -->
                    <div class="timeline-tracks" id="timelineTracks">
                        <!-- Tracks will be generated here -->
                    </div>
                    
                    <!-- Timeline scrubber -->
                    <div class="timeline-scrubber" id="timelineScrubber"></div>
                </div>
                
                <div class="property">
                    <label for="timelineZoom">Zoom:</label>
                    <input type="range" id="timelineZoom" min="0.1" max="2" step="0.1" value="1">
                </div>
            </div>
            
            <!-- History Panel -->
            <div class="control-group">
                <div class="group-header">
                    <h3>History</h3>
                </div>
                
                <div id="historyPanel" class="history-panel">
                    <!-- Command history will be displayed here -->
                </div>
            </div>
            
            <!-- Shortcuts Panel -->
            <div class="control-group">
                <div class="group-header">
                    <h3>Keyboard Shortcuts</h3>
                </div>
                
                <div id="shortcutsPanel" class="shortcuts-panel">
                    <!-- Shortcuts will be displayed here -->
                </div>
            </div>
        `;
        
        // Initialize timeline UI
        if (animationManager.keyframes.length >= 2) {
            animationManager.updateTimelineUI();
        }
        
        // Initialize history panel
        commandManager.updateUI();
        
        // Initialize shortcuts panel
        sceneManager.updateShortcutsPanel();
        
        // Setup timeline zoom
        const timelineZoom = document.getElementById('timelineZoom');
        if (timelineZoom) {
            timelineZoom.addEventListener('input', (e) => {
                const zoomValue = parseFloat(e.target.value);
                const timelineTracks = document.getElementById('timelineTracks');
                if (timelineTracks) {
                    timelineTracks.style.width = `${zoomValue * 100}%`;
                }
            });
        }
    }
    
    // Initialize the right sidebar
    setupRightSidebar();
    
    // Start with an initial scene setup (existing from your original code)
    // ...
    
    // Return object for external access
    return {
        scene,
        camera,
        renderer,
        sceneManager,
        animationManager,
        physicsManager,
        commandManager,
        orbitControls
    };
}

// Modify SceneManager's selectObject method to update physicsPropery panel when selection changes
function enhanceSelectObjectMethod() {
    // Store the original method for use
    const originalSelectObject = SceneManager.prototype.selectObject;
    
    // Override the selectObject method
    SceneManager.prototype.selectObject = function(id) {
        // Call the original method first
        originalSelectObject.call(this, id);
        
        // Update physics panel
        if (this.physicsManager) {
            if (id === null) {
                this.physicsManager.onObjectSelected(null);
            } else {
                const objectData = this.objects.find(obj => obj.id === id);
                if (objectData) {
                    this.physicsManager.onObjectSelected(objectData);
                }
            }
        }
        
        // Update hierarchy panel if available
        if (typeof this.updateHierarchyPanel === 'function') {
            this.updateHierarchyPanel();
        }
    };
}

// Call the enhancement function early
enhanceSelectObjectMethod();

// When the DOM is loaded, initialize the editor
document.addEventListener('DOMContentLoaded', function() {
    // Initialize editor with new features
    window.editorInstance = initEditor();
});
