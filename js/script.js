// Wait for the DOM to be fully loaded before running any code
document.addEventListener('DOMContentLoaded', function() {
    // Add error handling
    try {
        console.log("Initializing 3D Scene Editor...");
        
        // Check if THREE is available
        if (!window.THREE) {
            throw new Error("THREE.js not loaded. Check script references in HTML.");
        }
        
        // Initialize the editor
        window.editorInstance = initEditor();
        console.log("Editor initialization complete.");
    } catch (error) {
        console.error("Error initializing editor:", error);
        // Display error to user
        const container = document.getElementById('canvas-container');
        if (container) {
            container.innerHTML = `<div class="error-message">Error initializing 3D editor: ${error.message}</div>`;
        }
    }
});

// Main initialization function
function initEditor() {
    // Create global variables
    window.scene = new THREE.Scene();
    window.renderer = null;
    window.camera = null;
    window.controls = null;
    
    // Define SceneManager globally
    window.SceneManager = class SceneManager {
        constructor() {
            this.objects = [];
            this.lights = [];
            this.selectedObject = null;
            this.objectCount = 0;
            this.lightCount = 0;
            this.raycaster = new THREE.Raycaster();
            this.mouse = new THREE.Vector2();
            this.hdrLoaded = false;
            this.hdrFileName = null;
            this.scene = window.scene;
        }
        
        // Add a 3D object to the scene
        addObject(object, name, type = 'mesh') {
            const id = Date.now().toString() + Math.floor(Math.random() * 1000);
            this.objectCount++;
            
            const objectData = {
                id,
                object,
                name: name || `Object ${this.objectCount}`,
                visible: true,
                type: type,
                textures: []
            };
            
            this.objects.push(objectData);
            this.updateLayerPanel();
            return objectData;
        }
        
        // Add a light to the scene
        addLight(light, name, type = 'light') {
            const id = 'light_' + Date.now().toString() + Math.floor(Math.random() * 1000);
            this.lightCount++;
            
            const lightData = {
                id,
                object: light,
                name: name || `Light ${this.lightCount}`,
                visible: true,
                type: type
            };
            
            this.objects.push(lightData);
            this.lights.push(lightData);
            
            this.updateLayerPanel();
            this.updateLightsPanel();
            
            return lightData;
        }

        // Remove an object from the scene
        removeObject(id) {
            const index = this.objects.findIndex(obj => obj.id === id);
            if (index !== -1) {
                const obj = this.objects[index];
                scene.remove(obj.object);
                this.objects.splice(index, 1);
                
                // If it's a light, also remove from lights array
                if (obj.type.includes('light')) {
                    const lightIndex = this.lights.findIndex(light => light.id === id);
                    if (lightIndex !== -1) {
                        this.lights.splice(lightIndex, 1);
                    }
                    this.updateLightsPanel();
                }
                
                if (this.selectedObject && this.selectedObject.id === id) {
                    this.selectObject(null);
                }
                this.updateLayerPanel();
            }
        }

        // Select an object in the scene
        selectObject(id) {
            if (id === null) {
                this.selectedObject = null;
                updateSceneInfo("Click on objects to select them");
                
                const objectProps = document.getElementById("objectProperties");
                if (objectProps) objectProps.classList.add("disabled");
                
                const materialProps = document.getElementById("materialProperties");
                if (materialProps) materialProps.classList.add("disabled");
                
                const texturesPanel = document.getElementById("texturesPanel");
                if (texturesPanel) texturesPanel.classList.add("disabled");
                
                const selectedName = document.querySelector('.selected-name');
                if (selectedName) selectedName.textContent = 'No selection';
                
                // Hide light-specific and geometry-specific controls
                const lightProperty = document.querySelector('.light-property');
                if (lightProperty) lightProperty.style.display = 'none';
                
                const geometryProperty = document.querySelector('.geometry-property');
                if (geometryProperty) geometryProperty.style.display = 'none';
                
                const scaleProperty = document.querySelector('.scale-property');
                if (scaleProperty) scaleProperty.style.display = 'none';
                
                return;
            }

            this.selectedObject = this.objects.find(obj => obj.id === id) || null;
            
            if (this.selectedObject) {
                // Update UI based on object type
                const objectProps = document.getElementById("objectProperties");
                if (objectProps) objectProps.classList.remove("disabled");
                
                const selectedName = document.querySelector('.selected-name');
                if (selectedName) selectedName.textContent = this.selectedObject.name;
                
                updateSceneInfo(`Selected: ${this.selectedObject.name}`);
                
                // Show/hide appropriate controls based on object type
                if (this.selectedObject.type.includes('light')) {
                    // Light object - show light controls, hide mesh controls
                    const lightProperty = document.querySelector('.light-property');
                    if (lightProperty) lightProperty.style.display = 'block';
                    
                    const geometryProperty = document.querySelector('.geometry-property');
                    if (geometryProperty) geometryProperty.style.display = 'none';
                    
                    const scaleProperty = document.querySelector('.scale-property');
                    if (scaleProperty) scaleProperty.style.display = 'none';
                    
                    const materialProps = document.getElementById("materialProperties");
                    if (materialProps) materialProps.classList.add("disabled");
                    
                    const texturesPanel = document.getElementById("texturesPanel");
                    if (texturesPanel) texturesPanel.classList.add("disabled");
                    
                    // Configure spotlight-specific controls
                    const spotProps = document.querySelectorAll('.spot-light-prop');
                    if (spotProps.length) {
                        if (this.selectedObject.type === 'light-spot') {
                            spotProps.forEach(el => el.style.display = 'block');
                        } else {
                            spotProps.forEach(el => el.style.display = 'none');
                        }
                    }
                    
                    // Update light controls
                    this.updateLightControls();
                } else {
                    // Mesh object - show mesh controls, hide light controls
                    const lightProperty = document.querySelector('.light-property');
                    if (lightProperty) lightProperty.style.display = 'none';
                    
                    const geometryProperty = document.querySelector('.geometry-property');
                    if (geometryProperty) geometryProperty.style.display = 'block';
                    
                    const scaleProperty = document.querySelector('.scale-property');
                    if (scaleProperty) scaleProperty.style.display = 'block';
                    
                    const materialProps = document.getElementById("materialProperties");
                    if (materialProps) materialProps.classList.remove("disabled");
                    
                    const texturesPanel = document.getElementById("texturesPanel");
                    if (texturesPanel) texturesPanel.classList.remove("disabled");
                    
                    // Update textures panel
                    this.updateTexturesPanel();
                }
                
                // Update layer panel to highlight selected object
                this.updateLayerPanel();
                // Update position/rotation/scale controls
                this.updateObjectControls();
            } else {
                updateSceneInfo("Click on objects to select them");
                
                const objectProps = document.getElementById("objectProperties");
                if (objectProps) objectProps.classList.add("disabled");
                
                const materialProps = document.getElementById("materialProperties");
                if (materialProps) materialProps.classList.add("disabled");
                
                const texturesPanel = document.getElementById("texturesPanel");
                if (texturesPanel) texturesPanel.classList.add("disabled");
                
                const selectedName = document.querySelector('.selected-name');
                if (selectedName) selectedName.textContent = 'No selection';
            }
        }

        // Update the object list in the UI
        updateLayerPanel() {
            const objectList = document.getElementById('objectList');
            if (!objectList) return;
            
            objectList.innerHTML = '';

            this.objects.forEach(obj => {
                const li = document.createElement('li');
                li.dataset.id = obj.id;
                li.classList.add('animate-fade-in');
                if (this.selectedObject && this.selectedObject.id === obj.id) {
                    li.classList.add('selected');
                }

                // Create visibility toggle
                const visCheckbox = document.createElement('input');
                visCheckbox.type = 'checkbox';
                visCheckbox.checked = obj.visible;
                visCheckbox.addEventListener('change', () => {
                    obj.visible = visCheckbox.checked;
                    obj.object.visible = visCheckbox.checked;
                });

                // Create name element
                const nameSpan = document.createElement('span');
                nameSpan.className = 'layerItemName';
                nameSpan.textContent = obj.name;
                nameSpan.addEventListener('click', () => {
                    this.selectObject(obj.id);
                });

                // Create controls
                const controls = document.createElement('div');
                controls.className = 'layerItemControls';

                // Delete button
                const deleteBtn = document.createElement('button');
                deleteBtn.textContent = '×';
                deleteBtn.title = 'Delete';
                deleteBtn.className = 'delete-btn';
                deleteBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.removeObject(obj.id);
                });

                controls.appendChild(deleteBtn);
                li.appendChild(visCheckbox);
                li.appendChild(nameSpan);
                li.appendChild(controls);
                objectList.appendChild(li);
            });
        }
        
        // Update lights panel in the UI
        updateLightsPanel() {
            const lightsPanel = document.getElementById('lightsManagerPanel');
            if (!lightsPanel) return;
            
            lightsPanel.innerHTML = '';
            
            this.lights.forEach(light => {
                const lightItem = document.createElement('div');
                lightItem.className = 'light-item';
                lightItem.dataset.id = light.id;
                
                if (this.selectedObject && this.selectedObject.id === light.id) {
                    lightItem.classList.add('selected');
                }
                
                // Light icon with color
                const lightIcon = document.createElement('div');
                lightIcon.className = 'light-icon';
                
                // Set color based on light type and color
                if (light.object.color) {
                    lightIcon.style.backgroundColor = `#${light.object.color.getHexString()}`;
                } else {
                    lightIcon.style.backgroundColor = '#ffffff';
                }
                
                // Light name
                const lightName = document.createElement('span');
                lightName.className = 'layerItemName';
                lightName.textContent = light.name;
                
                // Light visibility toggle
                const visCheckbox = document.createElement('input');
                visCheckbox.type = 'checkbox';
                visCheckbox.checked = light.visible;
                visCheckbox.addEventListener('change', () => {
                    light.visible = visCheckbox.checked;
                    light.object.visible = visCheckbox.checked;
                });
                
                // Click event for selection
                lightItem.addEventListener('click', () => {
                    this.selectObject(light.id);
                });
                
                // Add all elements
                lightItem.appendChild(visCheckbox);
                lightItem.appendChild(lightIcon);
                lightItem.appendChild(lightName);
                
                lightsPanel.appendChild(lightItem);
            });
            
            // Add "no lights" message if needed
            if (this.lights.length === 0) {
                const noLights = document.createElement('div');
                noLights.className = 'no-textures';
                noLights.textContent = 'No additional lights. Add a light from the Objects panel.';
                lightsPanel.appendChild(noLights);
            }
        }

        // Update position, rotation, scale controls
        updateObjectControls() {
            if (!this.selectedObject) return;

            const obj = this.selectedObject.object;

            // Update position inputs
            const posX = document.getElementById('positionX');
            const posY = document.getElementById('positionY');
            const posZ = document.getElementById('positionZ');
            
            if (posX && posY && posZ) {
                posX.value = obj.position.x.toFixed(2);
                posY.value = obj.position.y.toFixed(2);
                posZ.value = obj.position.z.toFixed(2);
            }

            // Update rotation inputs - convert to degrees for better UX
            const rotX = document.getElementById('rotateX');
            const rotY = document.getElementById('rotateY');
            const rotZ = document.getElementById('rotateZ');
            
            if (rotX && rotY && rotZ) {
                rotX.value = (obj.rotation.x * (180/Math.PI)).toFixed(1);
                rotY.value = (obj.rotation.y * (180/Math.PI)).toFixed(1);
                rotZ.value = (obj.rotation.z * (180/Math.PI)).toFixed(1);
            }

            // Update scale inputs (only for meshes)
            if (!this.selectedObject.type.includes('light')) {
                const scaleX = document.getElementById('scaleX');
                const scaleY = document.getElementById('scaleY');
                const scaleZ = document.getElementById('scaleZ');
                
                if (scaleX && scaleY && scaleZ) {
                    scaleX.value = obj.scale.x.toFixed(2);
                    scaleY.value = obj.scale.y.toFixed(2);
                    scaleZ.value = obj.scale.z.toFixed(2);
                }
            }

            // Update material properties if applicable
            if (obj.material) {
                const objColor = document.getElementById('objectColor');
                const metalness = document.getElementById('metalness');
                const roughness = document.getElementById('roughness');
                const wireframe = document.getElementById('wireframe');
                
                if (objColor) objColor.value = '#' + obj.material.color.getHexString();
                if (metalness) metalness.value = obj.material.metalness !== undefined ? obj.material.metalness : 0;
                if (roughness) roughness.value = obj.material.roughness !== undefined ? obj.material.roughness : 1;
                if (wireframe) wireframe.checked = obj.material.wireframe || false;
                
                // Update geometry type dropdown
                const geometrySelector = document.getElementById('changeGeometryType');
                if (geometrySelector && obj.geometry) {
                    if (obj.geometry instanceof THREE.BoxGeometry) {
                        geometrySelector.value = 'box';
                    } else if (obj.geometry instanceof THREE.SphereGeometry) {
                        geometrySelector.value = 'sphere';
                    } else if (obj.geometry instanceof THREE.CylinderGeometry) {
                        geometrySelector.value = 'cylinder';
                    } else if (obj.geometry instanceof THREE.TorusGeometry) {
                        geometrySelector.value = 'torus';
                    } else if (obj.geometry instanceof THREE.PlaneGeometry) {
                        geometrySelector.value = 'plane';
                    }
                }
            }
        }
        
        // Update light-specific controls
        updateLightControls() {
            if (!this.selectedObject || !this.selectedObject.type.includes('light')) return;
            
            const light = this.selectedObject.object;
            
            // Update common light properties
            const lightIntensity = document.getElementById('lightIntensity');
            const lightColor = document.getElementById('lightColor');
            
            if (lightIntensity) lightIntensity.value = light.intensity;
            if (lightColor) lightColor.value = '#' + light.color.getHexString();
            
            // Handle light-specific properties
            const lightDistance = document.getElementById('lightDistance');
            if (light.distance !== undefined && lightDistance) {
                lightDistance.value = light.distance;
            }
            
            const lightCastShadow = document.getElementById('lightCastShadow');
            if (light.castShadow !== undefined && lightCastShadow) {
                lightCastShadow.checked = light.castShadow;
            }
            
            // SpotLight specific properties
            if (this.selectedObject.type === 'light-spot') {
                const lightAngle = document.getElementById('lightAngle');
                const lightPenumbra = document.getElementById('lightPenumbra');
                
                if (lightAngle) lightAngle.value = THREE.MathUtils.radToDeg(light.angle).toFixed(1);
                if (lightPenumbra) lightPenumbra.value = light.penumbra;
            }
        }
        
        // Add texture to selected object
        addTexture(textureFile) {
            if (!this.selectedObject || this.selectedObject.type.includes('light')) {
                updateSceneInfo('Please select an object first', true);
                return;
            }
            
            const url = URL.createObjectURL(textureFile);
            const textureName = textureFile.name || 'Texture ' + (this.selectedObject.textures.length + 1);
            
            // Show loading message
            updateSceneInfo(`Loading texture ${textureName}...`);
            
            textureLoader.load(url, 
                // Success callback
                (texture) => {
                    // Create texture data
                    const textureData = {
                        id: Date.now().toString() + Math.floor(Math.random() * 1000),
                        name: textureName,
                        texture: texture,
                        intensity: 1.0,
                        opacity: 1.0,
                        url: url,
                        type: 'diffuse' // Default type - diffuse, normal, roughness, etc.
                    };
                    
                    // Add to object's textures
                    this.selectedObject.textures.push(textureData);
                    
                    // Apply texture to material
                    this.updateObjectMaterial();
                    
                    // Update UI
                    this.updateTexturesPanel();
                    
                    updateSceneInfo(`Texture ${textureName} added successfully`, false, 'success');
                },
                // Progress callback
                undefined,
                // Error callback
                (error) => {
                    console.error('Error loading texture:', error);
                    updateSceneInfo(`Error loading texture: ${error.message}`, true);
                    URL.revokeObjectURL(url);
                }
            );
        }
        
        // Update textures panel in UI
        updateTexturesPanel() {
            const texturesList = document.getElementById('texturesList');
            if (!texturesList) return;
            
            texturesList.innerHTML = '';
            
            if (!this.selectedObject || !this.selectedObject.textures || this.selectedObject.textures.length === 0) {
                const noTextures = document.createElement('div');
                noTextures.className = 'no-textures';
                noTextures.textContent = 'No textures added. Click the + Add button to add textures.';
                texturesList.appendChild(noTextures);
                return;
            }
            
            this.selectedObject.textures.forEach(texture => {
                const textureItem = document.createElement('div');
                textureItem.className = 'texture-item animate-fade-in';
                
                // Texture preview (use a canvas to show the actual texture)
                const previewContainer = document.createElement('div');
                previewContainer.className = 'texture-preview';
                
                // Create a mini canvas to display texture preview
                const canvas = document.createElement('canvas');
                canvas.width = 40;
                canvas.height = 40;
                const ctx = canvas.getContext('2d');
                
                // Create an image from the texture
                const image = new Image();
                image.onload = () => {
                    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
                };
                
                // If texture has an image
                if (texture.texture.image) {
                    image.src = texture.url;
                } else {
                    // Fallback - draw colored square
                    ctx.fillStyle = '#aaaaaa';
                    ctx.fillRect(0, 0, canvas.width, canvas.height);
                }
                
                previewContainer.appendChild(canvas);
                
                // Texture info
                const textureInfo = document.createElement('div');
                textureInfo.className = 'texture-info';
                
                const textureName = document.createElement('div');
                textureName.className = 'texture-name';
                textureName.textContent = texture.name;
                
                // Texture type selector
                const textureTypeContainer = document.createElement('div');
                textureTypeContainer.className = 'texture-type-container';
                
                const textureTypeLabel = document.createElement('label');
                textureTypeLabel.textContent = 'Type:';
                
                const textureTypeSelect = document.createElement('select');
                textureTypeSelect.className = 'texture-type';
                
                const textureTypes = ['diffuse', 'normal', 'roughness', 'metalness', 'emissive', 'alpha'];
                textureTypes.forEach(type => {
                    const option = document.createElement('option');
                    option.value = type;
                    option.textContent = type.charAt(0).toUpperCase() + type.slice(1);
                    option.selected = texture.type === type;
                    textureTypeSelect.appendChild(option);
                });
                
                textureTypeSelect.addEventListener('change', () => {
                    texture.type = textureTypeSelect.value;
                    this.updateObjectMaterial();
                });
                
                textureTypeContainer.appendChild(textureTypeLabel);
                textureTypeContainer.appendChild(textureTypeSelect);
                
                // Texture intensity slider
                const intensityContainer = document.createElement('div');
                intensityContainer.className = 'texture-slider-container';
                
                const intensityLabel = document.createElement('label');
                intensityLabel.textContent = 'Intensity:';
                
                const intensitySlider = document.createElement('input');
                intensitySlider.type = 'range';
                intensitySlider.min = '0';
                intensitySlider.max = '1';
                intensitySlider.step = '0.01';
                intensitySlider.value = texture.intensity;
                
                intensitySlider.addEventListener('input', () => {
                    texture.intensity = parseFloat(intensitySlider.value);
                    this.updateObjectMaterial();
                });
                
                intensityContainer.appendChild(intensityLabel);
                intensityContainer.appendChild(intensitySlider);
                
                // Texture controls (delete button)
                const textureControls = document.createElement('div');
                textureControls.className = 'texture-controls';
                
                const deleteButton = document.createElement('button');
                deleteButton.className = 'delete-texture-btn';
                deleteButton.textContent = '×';
                deleteButton.title = 'Remove Texture';
                
                deleteButton.addEventListener('click', () => {
                    const index = this.selectedObject.textures.findIndex(t => t.id === texture.id);
                    if (index !== -1) {
                        this.selectedObject.textures.splice(index, 1);
                        this.updateObjectMaterial();
                        this.updateTexturesPanel();
                    }
                });
                
                textureControls.appendChild(deleteButton);
                
                // Assemble the texture item
                textureInfo.appendChild(textureName);
                textureInfo.appendChild(textureTypeContainer);
                textureInfo.appendChild(intensityContainer);
                
                textureItem.appendChild(previewContainer);
                textureItem.appendChild(textureInfo);
                textureItem.appendChild(textureControls);
                
                texturesList.appendChild(textureItem);
            });
        }
        
        // Update object material with textures
        updateObjectMaterial() {
            if (!this.selectedObject || this.selectedObject.type.includes('light')) return;
            
            const obj = this.selectedObject.object;
            if (!obj.material) return;
            
            const textures = this.selectedObject.textures || [];
            
            // Start with a clean material (preserving color and basic properties)
            const color = obj.material.color.clone();
            const metalness = obj.material.metalness !== undefined ? obj.material.metalness : 0;
            const roughness = obj.material.roughness !== undefined ? obj.material.roughness : 1;
            const wireframe = obj.material.wireframe || false;
            
            // Create a new material (we use MeshStandardMaterial for PBR capabilities)
            const material = new THREE.MeshStandardMaterial({
                color: color,
                metalness: metalness,
                roughness: roughness,
                wireframe: wireframe
            });
            
            // Apply environment map if scene has one
            if (scene.environment) {
                material.envMap = scene.environment;
                material.envMapIntensity = 1.0;
            }
            
            // Apply textures based on their type
            textures.forEach(textureData => {
                const texture = textureData.texture;
                const intensity = textureData.intensity || 1.0;
                
                // Set proper texture settings
                texture.encoding = THREE.sRGBEncoding;
                texture.wrapS = THREE.RepeatWrapping;
                texture.wrapT = THREE.RepeatWrapping;
                
                switch (textureData.type) {
                    case 'diffuse':
                        material.map = texture;
                        material.map.encoding = THREE.sRGBEncoding;
                        break;
                    case 'normal':
                        material.normalMap = texture;
                        material.normalScale = new THREE.Vector2(intensity, intensity);
                        break;
                    case 'roughness':
                        material.roughnessMap = texture;
                        material.roughness = intensity;
                        break;
                    case 'metalness':
                        material.metalnessMap = texture;
                        material.metalness = intensity;
                        break;
                    case 'emissive':
                        material.emissiveMap = texture;
                        material.emissive = new THREE.Color(0xffffff);
                        material.emissiveIntensity = intensity;
                        break;
                    case 'alpha':
                        material.alphaMap = texture;
                        material.transparent = true;
                        material.opacity = intensity;
                        break;
                }
            });
            
            // Apply the new material
            obj.material.dispose();
            obj.material = material;
            
            // Update UI
            const objColor = document.getElementById('objectColor');
            const metalnessInput = document.getElementById('metalness');
            const roughnessInput = document.getElementById('roughness');
            const wireframeInput = document.getElementById('wireframe');
            
            if (objColor) objColor.value = '#' + material.color.getHexString();
            if (metalnessInput) metalnessInput.value = material.metalness;
            if (roughnessInput) roughnessInput.value = material.roughness;
            if (wireframeInput) wireframeInput.checked = material.wireframe;
        }
        
        // Handle click on canvas for object selection
        handleCanvasClick(event) {
            // Calculate mouse position in normalized device coordinates (-1 to +1)
            const canvasBounds = renderer.domElement.getBoundingClientRect();
            this.mouse.x = ((event.clientX - canvasBounds.left) / canvasBounds.width) * 2 - 1;
            this.mouse.y = -((event.clientY - canvasBounds.top) / canvasBounds.height) * 2 + 1;
            
            // Update the picking ray with the camera and mouse position
            this.raycaster.setFromCamera(this.mouse, camera);
            
            // Find intersections with clickable objects
            const intersects = this.raycaster.intersectObjects(scene.children, true);
            
            // Check if we hit something
            if (intersects.length > 0) {
                // Find the corresponding object in our manager
                const hitObject = intersects[0].object;
                let selectedObj = null;
                
                // Find the top-level object that contains this hit object
                for (const obj of this.objects) {
                    if (obj.object === hitObject || obj.object.getObjectById(hitObject.id)) {
                        selectedObj = obj.id;
                        break;
                    }
                }
                
                if (selectedObj) {
                    this.selectObject(selectedObj);
                }
            } else {
                // Deselect if clicking on empty space
                this.selectObject(null);
            }
        }
        
        // Change the geometry of selected object
        changeGeometry(type) {
            if (!this.selectedObject || this.selectedObject.type.includes('light')) return;
            
            const obj = this.selectedObject.object;
            if (!obj.geometry) return;
            
            // Store current position, rotation, and scale
            const position = obj.position.clone();
            const rotation = obj.rotation.clone();
            const scale = obj.scale.clone();
            const material = obj.material.clone();
            
            // Create new geometry
            let newGeometry;
            
            switch (type) {
                case 'box': 
                    newGeometry = new THREE.BoxGeometry();
                    break;
                case 'sphere': 
                    newGeometry = new THREE.SphereGeometry(0.5, 32, 32);
                    break;
                case 'cylinder': 
                    newGeometry = new THREE.CylinderGeometry(0.5, 0.5, 1, 32);
                    break;
                case 'torus': 
                    newGeometry = new THREE.TorusGeometry(0.5, 0.2, 16, 32);
                    break;
                case 'plane': 
                    newGeometry = new THREE.PlaneGeometry(1, 1);
                    break;
                default:
                    return;
            }
            
            // Dispose of old geometry
            obj.geometry.dispose();
            
            // Apply new geometry
            obj.geometry = newGeometry;
            
            // Restore position, rotation, and scale
            obj.position.copy(position);
            obj.rotation.copy(rotation);
            obj.scale.copy(scale);
            
            updateSceneInfo(`Changed geometry to ${type}`, false, 'success');
        }

        // Update HDR Environment functions
        loadHDREnvironment(file) {
            if (!file) {
                updateSceneInfo("No HDR file selected", true);
                return;
            }
            
            try {
                const url = URL.createObjectURL(file);
                
                updateSceneInfo("Loading HDR environment...");

                // Store information about the HDR file
                this.hdrFileName = file.name;
                
                // Enable delete button
                const deleteHdrBtn = document.getElementById('deleteHdr');
                if (deleteHdrBtn) {
                    deleteHdrBtn.disabled = false;
                }
                
                rgbeLoader.load(
                    url, 
                    (texture) => {
                        texture.mapping = THREE.EquirectangularReflectionMapping;
                        scene.environment = texture;
                        scene.background = texture;
                        
                        // Update all materials to use environment map
                        this.objects.forEach(obj => {
                            if (obj.object.material && !obj.type.includes('light')) {
                                obj.object.material.envMap = texture;
                                obj.object.material.needsUpdate = true;
                            }
                        });
                        
                        // Create a preview element
                        this.updateHdrPreview(texture, this.hdrFileName);
                        
                        // Mark HDR as loaded
                        this.hdrLoaded = true;
                        
                        // Clean up URL
                        URL.revokeObjectURL(url);
                        
                        updateSceneInfo('HDR environment loaded', false, 'success');
                    },
                    // Progress callback
                    (xhr) => {
                        const percent = (xhr.loaded / xhr.total * 100).toFixed(0);
                        updateSceneInfo(`Loading HDR: ${percent}%`);
                    },
                    // Error callback
                    (error) => {
                        console.error('Error loading HDR:', error);
                        updateSceneInfo('Error loading HDR environment', true);
                        URL.revokeObjectURL(url);
                        this.hdrLoaded = false;
                        this.hdrFileName = null;
                    }
                );
            } catch (error) {
                console.error('Error creating HDR environment:', error);
                updateSceneInfo('Error loading HDR environment', true);
                this.hdrLoaded = false;
                this.hdrFileName = null;
            }
        }

        // Create a preview of the HDR environment
        updateHdrPreview(texture, fileName) {
            const hdrPreview = document.getElementById('hdrPreview');
            if (!hdrPreview) return;
            
            // Clear existing content
            hdrPreview.innerHTML = '';
            
            // Create status element
            const statusEl = document.createElement('p');
            statusEl.className = 'hdr-status';
            statusEl.textContent = `Loaded: ${fileName}`;
            
            // Add preview
            hdrPreview.appendChild(statusEl);
        }

        // Remove HDR environment
        removeHDREnvironment() {
            if (!this.hdrLoaded) {
                updateSceneInfo("No HDR environment loaded", true);
                return;
            }
            
            // Reset scene environment
            scene.environment = null;
            scene.background = new THREE.Color(0x0c0c0c); // Reset to dark background
            
            // Update materials
            this.objects.forEach(obj => {
                if (obj.object.material && !obj.type.includes('light')) {
                    obj.object.material.envMap = null;
                    obj.object.material.needsUpdate = true;
                }
            });
            
            // Update UI
            const hdrPreview = document.getElementById('hdrPreview');
            if (hdrPreview) {
                hdrPreview.innerHTML = '<p class="hdr-status">No HDR Map loaded</p>';
            }
            
            // Disable delete button
            const deleteHdrBtn = document.getElementById('deleteHdr');
            if (deleteHdrBtn) {
                deleteHdrBtn.disabled = true;
            }
            
            // Reset state
            this.hdrLoaded = false;
            this.hdrFileName = null;
            
            updateSceneInfo("HDR environment removed", false, 'success');
        }
    }

    // Initialize scene, renderer, camera, and controls
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0c0c0c); // Darker background for dark theme

    // Get canvas element
    const canvas = document.getElementById('three-canvas');
    if (!canvas) {
        console.error('Canvas element not found');
        return;
    }

    // Renderer setup with antialiasing and shadows
    const renderer = new THREE.WebGLRenderer({ 
        antialias: true,
        canvas: canvas
    });
    renderer.setSize(window.innerWidth - 320, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1;
    renderer.outputEncoding = THREE.sRGBEncoding;

    // Camera setup
    const aspectRatio = (window.innerWidth - 320) / window.innerHeight;
    const perspectiveCamera = new THREE.PerspectiveCamera(75, aspectRatio, 0.1, 1000);
    const orthographicCamera = new THREE.OrthographicCamera(
        -5 * aspectRatio, 5 * aspectRatio, 
        5, -5, 0.1, 1000
    );

    // Set initial camera position and target
    let camera = perspectiveCamera;
    camera.position.set(0, 2, 5);
    const cameraTarget = new THREE.Vector3(0, 0, 0);
    camera.lookAt(cameraTarget);

    // Update scene info function with error handling and success option
    function updateSceneInfo(text, isError = false, type = 'info') {
        const infoEl = document.getElementById('scene-info');
        if (infoEl) {
            infoEl.textContent = text;
            
            // Remove all state classes
            infoEl.classList.remove('animate-fade-in', 'error', 'success');
            
            // Add appropriate class
            if (isError) {
                infoEl.classList.add('error');
            } else if (type === 'success') {
                infoEl.classList.add('success');
            }
            
            // Add animation
            void infoEl.offsetWidth; // Trigger reflow to restart animation
            infoEl.classList.add('animate-fade-in');
            
            // Auto-hide after 3 seconds for success messages
            if (type === 'success') {
                setTimeout(() => {
                    infoEl.classList.remove('success');
                    infoEl.textContent = 'Click on objects to select them';
                }, 3000);
            }
        } else {
            console.warn('Scene info element not found');
        }
    }

    // Create the scene manager
    window.sceneManager = new SceneManager();
    
    // Create the command manager
    window.commandManager = window.initCommandManager ? window.initCommandManager() : new CommandManager();
    
    // Setup the user interface
    setupTabs();
    setupEventListeners();
    setupControlEvents();
    
    // Initialize with a default object
    createNewObject('box');
    
    // Add a default light if the scene doesn't have any
    if (window.sceneManager.lights.length === 0) {
        const light = new THREE.DirectionalLight(0xffffff, 1);
        light.position.set(5, 5, 5);
        light.castShadow = true;
        scene.add(light);
        
        // Configure shadow map
        light.shadow.mapSize.width = 1024;
        light.shadow.mapSize.height = 1024;
        
        // Add to the scene manager
        window.sceneManager.addLight(light, 'Default Directional Light', 'light-directional');
    }
    
    // Add ambient light
    const sceneAmbientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(sceneAmbientLight);
    
    // Add grid helper
    const sceneGridHelper = new THREE.GridHelper(20, 20, 0x444444, 0x444444);
    scene.add(sceneGridHelper);
    
    // Set the background color
    scene.background = new THREE.Color(0x111111);
    
    // Start the animation loop
    animate();
    
    // Initialize animation manager if available
    if (window.initAnimationManager) {
        try {
            window.animationManager = window.initAnimationManager(scene, camera, controls);
            console.log("Animation manager initialized");
        } catch (e) {
            console.error("Error initializing animation manager:", e);
        }
    }
    
    // Initialize physics manager if available
    if (window.initPhysicsManager) {
        try {
            window.physicsManager = window.initPhysicsManager(scene);
            console.log("Physics manager initialized");
            if (window.enhanceSceneManager) {
                window.enhanceSceneManager(window.sceneManager);
            }
            window.sceneManager.physicsManager = window.physicsManager;
        } catch (e) {
            console.error("Error initializing physics manager:", e);
        }
    }
    
    // Handle window resize
    window.addEventListener('resize', function() {
        const width = container.clientWidth;
        const height = container.clientHeight;
        
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        
        renderer.setSize(width, height);
    });
    
    // Update scene info to indicate ready state
    updateSceneInfo("3D Scene Editor ready. Click on objects to select them.");
    
    // Return the scene manager for external access
    return window.sceneManager;
}

// Function to handle tab switching
function setupTabs() {
    const tabBtns = document.querySelectorAll('.tab-btn');
    if (!tabBtns.length) {
        console.warn('No tab buttons found');
        return;
    }
    
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            // Remove active class from all tabs and tab content
            tabBtns.forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            
            // Add active class to clicked tab
            btn.classList.add('active');
            
            // Show corresponding tab content
            const tabId = btn.dataset.tab;
            const tabContent = document.getElementById(`${tabId}-tab`);
            if (tabContent) {
                tabContent.classList.add('active');
            } else {
                console.warn(`Tab content for ${tabId} not found`);
            }
        });
    });
}

// Function to create a new object
function createNewObject(type) {
    try {
        let object;
        
        if (type.startsWith('light-')) {
            // Create a light
            switch (type) {
                case 'light-point':
                    const pointLight = new THREE.PointLight(0xffffff, 1, 100);
                    pointLight.position.set(0, 2, 0);
                    pointLight.castShadow = true;
                    object = pointLight;
                    scene.add(object);
                    window.sceneManager.addLight(object, 'Point Light', 'light-point');
                    break;
                case 'light-spot':
                    const spotLight = new THREE.SpotLight(0xffffff, 1, 100, Math.PI/4, 0.2);
                    spotLight.position.set(0, 5, 0);
                    spotLight.castShadow = true;
                    object = spotLight;
                    scene.add(object);
                    window.sceneManager.addLight(object, 'Spot Light', 'light-spot');
                    break;
                case 'light-area':
                    // Three.js doesn't have an area light in the core library,
                    // but we can simulate it with a DirectionalLight
                    const rectLight = new THREE.DirectionalLight(0xffffff, 1);
                    rectLight.position.set(0, 5, 0);
                    rectLight.castShadow = true;
                    object = rectLight;
                    scene.add(object);
                    window.sceneManager.addLight(object, 'Directional Light', 'light-area');
                    break;
            }
            
            updateSceneInfo(`Added new ${type.replace('light-', '')} light`, false, 'success');
        } else {
            // Create a mesh
            let geometry;
            
            switch (type) {
                case 'box': 
                    geometry = new THREE.BoxGeometry();
                    break;
                case 'sphere': 
                    geometry = new THREE.SphereGeometry(0.5, 32, 32);
                    break;
                case 'cylinder': 
                    geometry = new THREE.CylinderGeometry(0.5, 0.5, 1, 32);
                    break;
                case 'torus': 
                    geometry = new THREE.TorusGeometry(0.5, 0.2, 16, 32);
                    break;
                case 'plane': 
                    geometry = new THREE.PlaneGeometry(1, 1);
                    break;
                default:
                    geometry = new THREE.BoxGeometry();
            }
            
            const material = new THREE.MeshStandardMaterial({
                color: 0x3d7eff, // Use theme color
                metalness: 0,
                roughness: 1
            });
            
            object = new THREE.Mesh(geometry, material);
            object.castShadow = true;
            object.receiveShadow = true;
            
            scene.add(object);
            
            // Add to scene manager
            const objData = window.sceneManager.addObject(
                object, 
                type.charAt(0).toUpperCase() + type.slice(1)
            );
            
            // Select the new object
            window.sceneManager.selectObject(objData.id);
            
            updateSceneInfo(`Added new ${type}`, false, 'success');
        }
        
        return object;
    } catch (error) {
        console.error('Error creating new object:', error);
        updateSceneInfo(`Error creating ${type}`, true);
        return null;
    }
}

// Create event listeners with proper error handling
function setupEventListeners() {
    try {
        // Basic click handlers for UI elements
        
        // Canvas click event for object selection
        if (renderer && renderer.domElement) {
            renderer.domElement.addEventListener('click', (event) => {
                window.sceneManager.handleCanvasClick(event);
            });
        } else {
            console.warn('Renderer or domElement not available for click events');
        }
        
        // Add object button
        const addObjectBtn = document.getElementById('addObject');
        const confirmAddObjectBtn = document.getElementById('confirmAddObject');
        const geometrySelector = document.getElementById('geometrySelector');
        const addObjectType = document.querySelector('.add-object-type');
        
        if (addObjectBtn && addObjectType) {
            addObjectBtn.addEventListener('click', () => {
                addObjectType.style.display = 'block';
            });
            
            if (confirmAddObjectBtn && geometrySelector) {
                confirmAddObjectBtn.addEventListener('click', () => {
                    const type = geometrySelector.value;
                    createNewObject(type);
                    addObjectType.style.display = 'none';
                });
            }
        }
        
        // Copy code button
        const copyCodeBtn = document.getElementById('copyCode');
        if (copyCodeBtn) {
            copyCodeBtn.addEventListener('click', () => {
                alert('Code copied to clipboard feature will be implemented here');
            });
        }
    
    } catch (error) {
        console.error('Error setting up event listeners:', error);
        updateSceneInfo('Error setting up event listeners', true);
    }
}

// Function to set up UI control events
function setupControlEvents() {
    // We'll implement the full version later
    console.log("Setting up control events");
}
