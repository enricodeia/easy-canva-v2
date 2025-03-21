// Wait for the DOM to be fully loaded before running any code
document.addEventListener('DOMContentLoaded', function() {
    initEditor();
});


function enhanceSceneManager(sceneManager) {
    if (!sceneManager) {
        console.error('SceneManager not provided to enhancer');
        return;
    }
    
    // Store the original selectObject method
    const originalSelectObject = sceneManager.selectObject;
    
    // Replace with enhanced version
    sceneManager.selectObject = function(id) {
        // Call the original method first
        originalSelectObject.call(this, id);
        
        // Update physics panel if physicsManager exists
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
    };
    
    console.log('SceneManager enhanced with physics integration');
}


// Main initialization function
function initEditor() {
    // Scene manager to keep track of all objects and their properties
    class SceneManager {
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
        
        // Handle canvas click for object selection
        handleCanvasClick(event) {
            // Calculate mouse position in normalized device coordinates (-1 to +1)
            const rect = renderer.domElement.getBoundingClientRect();
            this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
            this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
            
            // Update the picking ray
            this.raycaster.setFromCamera(this.mouse, camera);
            
            // Get intersections (ignore helpers and non-mesh objects)
            const intersectables = this.objects
                .filter(obj => obj.visible)
                .map(obj => obj.object);
            
            const intersects = this.raycaster.intersectObjects(intersectables, true);
            
            if (intersects.length > 0) {
                // Find the actual top-level object that was intersected
                let selectedObject = intersects[0].object;
                
                // Navigate up to find parent that is in our object list
                while (selectedObject && !this.objects.some(obj => obj.object === selectedObject)) {
                    selectedObject = selectedObject.parent;
                }
                
                if (selectedObject) {
                    const clickedObj = this.objects.find(obj => obj.object === selectedObject);
                    if (clickedObj) {
                        this.selectObject(clickedObj.id);
                        return;
                    }
                }
            }
            
            // If no object was clicked, deselect current selection
            this.selectObject(null);
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

    // Create scene manager
    const sceneManager = new SceneManager();

    // Create instances of other managers
    const commandManager = new CommandManager();
    const animationManager = new AnimationManager(sceneManager, camera, orbitControls);
    const physicsManager = new PhysicsManager(sceneManager);
    
    // Connect the managers
    sceneManager.animationManager = animationManager;
    sceneManager.physicsManager = physicsManager;
    sceneManager.commandManager = commandManager;
    sceneManager.scene = scene; // Add a reference to the scene
    
    // Apply the enhancement to connect SceneManager and PhysicsManager
    enhanceSceneManager(sceneManager);

    // Orbit controls for camera
    const orbitControls = new THREE.OrbitControls(camera, renderer.domElement);
    orbitControls.enableDamping = true;
    orbitControls.dampingFactor = 0.05;

    // Setup lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(5, 5, 5);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 1024;
    directionalLight.shadow.mapSize.height = 1024;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 50;
    directionalLight.shadow.camera.left = -10;
    directionalLight.shadow.camera.right = 10;
    directionalLight.shadow.camera.top = 10;
    directionalLight.shadow.camera.bottom = -10;
    scene.add(directionalLight);

    // Add directional light to the scene manager
    sceneManager.addLight(directionalLight, 'Main Directional Light', 'light-directional');

    // Create grid helper (visible in scene)
    const gridSize = 20;
    const gridDivisions = 20;
    const gridHelper = new THREE.GridHelper(gridSize, gridDivisions, 0x444444, 0x222222);
    scene.add(gridHelper);

    // Create transparent ground plane
    const groundGeometry = new THREE.PlaneGeometry(gridSize, gridSize, gridDivisions, gridDivisions);
    const groundMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x222222,
        roughness: 1,
        metalness: 0,
        transparent: true,
        opacity: 0.2,
        wireframe: false
    });

    // Add a simple texture for the grid
    const textureLoader = new THREE.TextureLoader();
    const groundTexture = textureLoader.load('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==');
    groundMaterial.map = groundTexture;
    groundMaterial.map.repeat.set(gridSize, gridSize);
    groundMaterial.map.wrapS = THREE.RepeatWrapping;
    groundMaterial.map.wrapT = THREE.RepeatWrapping;

    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.01;
    ground.receiveShadow = true;
    scene.add(ground);

    // Add a cube as initial object
    const boxGeometry = new THREE.BoxGeometry();
    const boxMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x3d7eff, // Use theme color
        metalness: 0,
        roughness: 1
    });
    const boxMesh = new THREE.Mesh(boxGeometry, boxMaterial);
    boxMesh.castShadow = true;
    boxMesh.receiveShadow = true;
    scene.add(boxMesh);
    
    // Add it to scene manager
    const boxObj = sceneManager.addObject(boxMesh, 'Box');
    
    // RGBELoader for HDR environment maps
    const rgbeLoader = new THREE.RGBELoader();
    
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
    
    // Create event listeners with proper error handling
    function setupEventListeners() {
        try {
            // Canvas click event for object selection
            if (renderer && renderer.domElement) {
                renderer.domElement.addEventListener('click', (event) => {
                    sceneManager.handleCanvasClick(event);
                });
            } else {
                console.warn('Renderer or domElement not available for click events');
            }
            
            // Object creation
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
                } else {
                    console.warn('Confirm add object button or geometry selector not found');
                }
            } else {
                console.warn('Add object button or add object type container not found');
            }
            
            // Import model button
            const importModelBtn = document.getElementById('importModelBtn');
            const importModel = document.getElementById('importModel');
            
            if (importModelBtn && importModel) {
                importModelBtn.addEventListener('click', () => {
                    importModel.click();
                });
                
                importModel.addEventListener('change', handleModelImport);
            } else {
                console.warn('Import model button or file input not found');
            }
            
            // Add texture button
            const addTextureBtn = document.getElementById('addTexture');
            if (addTextureBtn) {
                addTextureBtn.addEventListener('click', () => {
                    if (!sceneManager.selectedObject) {
                        updateSceneInfo('Please select an object first', true);
                        return;
                    }
                    
                    // Create a file input for texture upload
                    const input = document.createElement('input');
                    input.type = 'file';
                    input.accept = 'image/*';
                    input.style.display = 'none';
                    document.body.appendChild(input);
                    
                    input.addEventListener('change', (e) => {
                        if (e.target.files.length) {
                            sceneManager.addTexture(e.target.files[0]);
                        }
                        document.body.removeChild(input);
                    });
                    
                    input.click();
                });
            } else {
                console.warn('Add texture button not found');
            }
            
            // HDR environment map upload and delete
            const hdrUpload = document.getElementById('hdrUpload');
            const deleteHdrBtn = document.getElementById('deleteHdr');
            
            if (hdrUpload) {
                hdrUpload.addEventListener('change', (e) => {
                    if (e.target.files.length) {
                        sceneManager.loadHDREnvironment(e.target.files[0]);
                    }
                });
            } else {
                console.warn('HDR upload input not found');
            }
            
            if (deleteHdrBtn) {
                deleteHdrBtn.addEventListener('click', () => {
                    sceneManager.removeHDREnvironment();
                });
            } else {
                console.warn('Delete HDR button not found');
            }
            
            // Change geometry type
            const changeGeometryType = document.getElementById('changeGeometryType');
            if (changeGeometryType) {
                changeGeometryType.addEventListener('change', (e) => {
                    if (sceneManager.selectedObject && !sceneManager.selectedObject.type.includes('light')) {
                        sceneManager.changeGeometry(e.target.value);
                    }
                });
            } else {
                console.warn('Change geometry type selector not found');
            }
            
            // Set up other control events
            setupControlEvents();
            
        } catch (error) {
            console.error('Error setting up event listeners:', error);
            updateSceneInfo('Error setting up application controls', true);
        }
    }
    
    // Function to set up control event listeners with error handling
    function setupControlEvents() {
        try {
            // Material controls
            const objectColor = document.getElementById('objectColor');
            const metalness = document.getElementById('metalness');
            const roughness = document.getElementById('roughness');
            const wireframe = document.getElementById('wireframe');
            
            if (objectColor) {
                objectColor.addEventListener('input', (e) => {
                    if (!sceneManager.selectedObject) return;
                    if (sceneManager.selectedObject.object.material) {
                        sceneManager.selectedObject.object.material.color.set(e.target.value);
                    }
                });
            }
            
            if (metalness) {
                metalness.addEventListener('input', (e) => {
                    if (!sceneManager.selectedObject) return;
                    if (sceneManager.selectedObject.object.material) {
                        sceneManager.selectedObject.object.material.metalness = parseFloat(e.target.value);
                    }
                });
            }
            
            if (roughness) {
                roughness.addEventListener('input', (e) => {
                    if (!sceneManager.selectedObject) return;
                    if (sceneManager.selectedObject.object.material) {
                        sceneManager.selectedObject.object.material.roughness = parseFloat(e.target.value);
                    }
                });
            }
            
            if (wireframe) {
                wireframe.addEventListener('change', (e) => {
                    if (!sceneManager.selectedObject) return;
                    if (sceneManager.selectedObject.object.material) {
                        sceneManager.selectedObject.object.material.wireframe = e.target.checked;
                    }
                });
            }
            
            // Position, rotation, scale controls
            ['X', 'Y', 'Z'].forEach(axis => {
                const positionInput = document.getElementById(`position${axis}`);
                const rotateInput = document.getElementById(`rotate${axis}`);
                const scaleInput = document.getElementById(`scale${axis}`);
                
                if (positionInput) {
                    positionInput.addEventListener('input', (e) => {
                        if (!sceneManager.selectedObject) return;
                        const value = parseFloat(e.target.value);
                        if (!isNaN(value)) {
                            sceneManager.selectedObject.object.position[axis.toLowerCase()] = value;
                        }
                    });
                }
                
                if (rotateInput) {
                    rotateInput.addEventListener('input', (e) => {
                        if (!sceneManager.selectedObject) return;
                        const valueDegrees = parseFloat(e.target.value);
                        if (!isNaN(valueDegrees)) {
                            // Convert degrees to radians for Three.js
                            const valueRadians = valueDegrees * (Math.PI/180);
                            sceneManager.selectedObject.object.rotation[axis.toLowerCase()] = valueRadians;
                        }
                    });
                }
                
                if (scaleInput) {
                    scaleInput.addEventListener('input', (e) => {
                        if (!sceneManager.selectedObject) return;
                        const value = parseFloat(e.target.value);
                        if (!isNaN(value) && value > 0) {
                            sceneManager.selectedObject.object.scale[axis.toLowerCase()] = value;
                        }
                    });
                }
            });
            
            // Light controls
            const lightIntensity = document.getElementById('lightIntensity');
            const lightColor = document.getElementById('lightColor');
            const lightDistance = document.getElementById('lightDistance');
            const lightCastShadow = document.getElementById('lightCastShadow');
            const lightAngle = document.getElementById('lightAngle');
            const lightPenumbra = document.getElementById('lightPenumbra');
            
            if (lightIntensity) {
                lightIntensity.addEventListener('input', (e) => {
                    if (!sceneManager.selectedObject || !sceneManager.selectedObject.type.includes('light')) return;
                    const value = parseFloat(e.target.value);
                    if (!isNaN(value)) {
                        sceneManager.selectedObject.object.intensity = value;
                    }
                });
            }
            
            if (lightColor) {
                lightColor.addEventListener('input', (e) => {
                    if (!sceneManager.selectedObject || !sceneManager.selectedObject.type.includes('light')) return;
                    sceneManager.selectedObject.object.color.set(e.target.value);
                    sceneManager.updateLightsPanel();
                });
            }
            
            if (lightDistance) {
                lightDistance.addEventListener('input', (e) => {
                    if (!sceneManager.selectedObject || !sceneManager.selectedObject.type.includes('light')) return;
                    if (sceneManager.selectedObject.object.distance !== undefined) {
                        const value = parseFloat(e.target.value);
                        if (!isNaN(value)) {
                            sceneManager.selectedObject.object.distance = value;
                        }
                    }
                });
            }
            
            if (lightCastShadow) {
                lightCastShadow.addEventListener('change', (e) => {
                    if (!sceneManager.selectedObject || !sceneManager.selectedObject.type.includes('light')) return;
                    if (sceneManager.selectedObject.object.castShadow !== undefined) {
                        sceneManager.selectedObject.object.castShadow = e.target.checked;
                    }
                });
            }
            
            if (lightAngle) {
                lightAngle.addEventListener('input', (e) => {
                    if (!sceneManager.selectedObject || sceneManager.selectedObject.type !== 'light-spot') return;
                    const valueDegrees = parseFloat(e.target.value);
                    if (!isNaN(valueDegrees)) {
                        const valueRadians = THREE.MathUtils.degToRad(valueDegrees);
                        sceneManager.selectedObject.object.angle = valueRadians;
                    }
                });
            }
            
            if (lightPenumbra) {
                lightPenumbra.addEventListener('input', (e) => {
                    if (!sceneManager.selectedObject || sceneManager.selectedObject.type !== 'light-spot') return;
                    const value = parseFloat(e.target.value);
                    if (!isNaN(value)) {
                        sceneManager.selectedObject.object.penumbra = value;
                    }
                });
            }
            
            // Camera type toggle
            const cameraType = document.getElementById('cameraType');
            if (cameraType) {
                cameraType.addEventListener('change', (e) => {
                    if (e.target.value === 'perspective') {
                        camera = perspectiveCamera;
                    } else {
                        camera = orthographicCamera;
                    }
                    
                    // Update camera position and controls
                    camera.position.copy(orbitControls.object.position);
                    camera.lookAt(cameraTarget);
                    orbitControls.object = camera;
                    
                    updateSceneInfo(`Switched to ${e.target.value} camera`, false, 'success');
                });
            }
            
            // Camera controls
            ['X', 'Y', 'Z'].forEach(axis => {
                const cameraInput = document.getElementById(`camera${axis}`);
                const targetInput = document.getElementById(`target${axis}`);
                
                if (cameraInput) {
                    cameraInput.addEventListener('input', (e) => {
                        const value = parseFloat(e.target.value);
                        if (!isNaN(value)) {
                            camera.position[axis.toLowerCase()] = value;
                            orbitControls.update();
                        }
                    });
                }
                
                if (targetInput) {
                    targetInput.addEventListener('input', (e) => {
                        const value = parseFloat(e.target.value);
                        if (!isNaN(value)) {
                            cameraTarget[axis.toLowerCase()] = value;
                            camera.lookAt(cameraTarget);
                            orbitControls.target.copy(cameraTarget);
                            orbitControls.update();
                        }
                    });
                }
            });
            
            // Fog controls
            const fogToggle = document.getElementById('fog');
            const fogDensity = document.getElementById('fogDensity');
            const fogColor = document.getElementById('fogColor');
            
            if (fogToggle) {
                fogToggle.addEventListener('change', (e) => {
                    if (e.target.checked) {
                        const density = fogDensity ? parseFloat(fogDensity.value) : 0.01;
                        const color = fogColor ? new THREE.Color(fogColor.value) : new THREE.Color(0x111111);
                        scene.fog = new THREE.FogExp2(color, density);
                    } else {
                        scene.fog = null;
                    }
                });
            }
            
            if (fogDensity) {
                fogDensity.addEventListener('input', (e) => {
                    if (scene.fog && scene.fog instanceof THREE.FogExp2) {
                        scene.fog.density = parseFloat(e.target.value);
                    }
                });
            }
            
            if (fogColor) {
                fogColor.addEventListener('input', (e) => {
                    if (scene.fog) {
                        scene.fog.color.set(e.target.value);
                    }
                });
            }
            
            // Grid and ground controls
            const showGrid = document.getElementById('showGrid');
            const showGroundPlane = document.getElementById('showGroundPlane');
            const gridSizeInput = document.getElementById('gridSize');
            const gridDivisionsInput = document.getElementById('gridDivisions');
            
            if (showGrid) {
                showGrid.addEventListener('change', (e) => {
                    gridHelper.visible = e.target.checked;
                });
            }
            
            if (showGroundPlane) {
                showGroundPlane.addEventListener('change', (e) => {
                    ground.visible = e.target.checked;
                });
            }
            
            // Ambient light controls
            const ambientIntensity = document.getElementById('ambientIntensity');
            const ambientColor = document.getElementById('ambientColor');
            
            if (ambientIntensity) {
                ambientIntensity.addEventListener('input', (e) => {
                    ambientLight.intensity = parseFloat(e.target.value);
                });
            }
            
            if (ambientColor) {
                ambientColor.addEventListener('input', (e) => {
                    ambientLight.color.set(e.target.value);
                });
            }
            
            // Shadow controls
            const enableShadows = document.getElementById('enableShadows');
            const shadowQuality = document.getElementById('shadowQuality');
            
            if (enableShadows) {
                enableShadows.addEventListener('change', (e) => {
                    renderer.shadowMap.enabled = e.target.checked;
                    
                    // Update all objects to match shadow setting
                    sceneManager.objects.forEach(obj => {
                        if (obj.object.isMesh) {
                            obj.object.castShadow = e.target.checked;
                            obj.object.receiveShadow = e.target.checked;
                        } else if (obj.type.includes('light')) {
                            if (obj.object.castShadow !== undefined) {
                                obj.object.castShadow = e.target.checked;
                            }
                        }
                    });
                });
            }
            
            if (shadowQuality) {
                shadowQuality.addEventListener('change', (e) => {
                    let mapSize;
                    switch (e.target.value) {
                        case 'low':
                            mapSize = 512;
                            break;
                        case 'medium':
                            mapSize = 1024;
                            break;
                        case 'high':
                            mapSize = 2048;
                            break;
                        default:
                            mapSize = 1024;
                    }
                    
                    // Update shadow map quality for all lights
                    sceneManager.lights.forEach(light => {
                        if (light.object.shadow) {
                            light.object.shadow.mapSize.width = mapSize;
                            light.object.shadow.mapSize.height = mapSize;
                        }
                    });
                    
                    updateSceneInfo(`Shadow quality set to ${e.target.value}`, false, 'success');
                });
            }
            
            // Environment map intensity
            const envMapIntensity = document.getElementById('envMapIntensity');
            if (envMapIntensity) {
                envMapIntensity.addEventListener('input', (e) => {
                    const value = parseFloat(e.target.value);
                    if (!isNaN(value)) {
                        // Apply to all materials
                        sceneManager.objects.forEach(obj => {
                            if (obj.object.material && !obj.type.includes('light')) {
                                obj.object.material.envMapIntensity = value;
                            }
                        });
                    }
                });
            }
            
            // Export buttons
            const exportSceneBtn = document.getElementById('exportScene');
            const copyCodeBtn = document.getElementById('copyCode');
            
            if (exportSceneBtn) {
                exportSceneBtn.addEventListener('click', exportScene);
            } else {
                console.warn('Export scene button not found');
            }
            
            if (copyCodeBtn) {
                copyCodeBtn.addEventListener('click', generateAndCopyCode);
            } else {
                console.warn('Copy code button not found');
            }
            
        } catch (error) {
            console.error('Error setting up control events:', error);
            updateSceneInfo('Error setting up control events', true);
        }
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
                        sceneManager.addLight(object, 'Point Light', 'light-point');
                        break;
                    case 'light-spot':
                        const spotLight = new THREE.SpotLight(0xffffff, 1, 100, Math.PI/4, 0.2);
                        spotLight.position.set(0, 5, 0);
                        spotLight.castShadow = true;
                        object = spotLight;
                        scene.add(object);
                        sceneManager.addLight(object, 'Spot Light', 'light-spot');
                        break;
                    case 'light-area':
                        // Three.js doesn't have an area light in the core library,
                        // but we can simulate it with a DirectionalLight
                        const rectLight = new THREE.DirectionalLight(0xffffff, 1);
                        rectLight.position.set(0, 5, 0);
                        rectLight.castShadow = true;
                        object = rectLight;
                        scene.add(object);
                        sceneManager.addLight(object, 'Directional Light', 'light-area');
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
                const objData = sceneManager.addObject(
                    object, 
                    type.charAt(0).toUpperCase() + type.slice(1)
                );
                
                // Select the new object
                sceneManager.selectObject(objData.id);
                
                updateSceneInfo(`Added new ${type}`, false, 'success');
            }
            
            return object;
        } catch (error) {
            console.error('Error creating new object:', error);
            updateSceneInfo(`Error creating ${type}`, true);
            return null;
        }
    }
    
    // Function to handle model import
    function handleModelImport(event) {
        try {
            const file = event.target.files[0];
            if (!file) return;
            
            updateSceneInfo(`Importing model: ${file.name}...`);
            
            const url = URL.createObjectURL(file);
            
            // Create GLTF loader
            const gltfLoader = new THREE.GLTFLoader();
            
            gltfLoader.load(url, 
                // Success callback
                (gltf) => {
                    const model = gltf.scene;
                    
                    // Center the model
                    const box = new THREE.Box3().setFromObject(model);
                    const center = box.getCenter(new THREE.Vector3());
                    model.position.sub(center);
                    
                    // Normalize scale
                    const size = box.getSize(new THREE.Vector3());
                    const maxDim = Math.max(size.x, size.y, size.z);
                    if (maxDim > 2) {
                        const scale = 2 / maxDim;
                        model.scale.set(scale, scale, scale);
                    }
                    
                    // Apply shadows
                    model.traverse((node) => {
                        if (node.isMesh) {
                            node.castShadow = true;
                            node.receiveShadow = true;
                        }
                    });
                    
                    scene.add(model);
                    
                    // Add to scene manager
                    const objData = sceneManager.addObject(
                        model, 
                        file.name.split('.')[0] || 'Imported Model'
                    );
                    
                    // Select the new model
                    sceneManager.selectObject(objData.id);
                    
                    // Clean up URL
                    URL.revokeObjectURL(url);
                    
                    updateSceneInfo(`Model ${file.name} imported successfully`, false, 'success');
                }, 
                // Progress callback
                (xhr) => {
                    const percent = (xhr.loaded / xhr.total * 100).toFixed(0);
                    updateSceneInfo(`Loading model: ${percent}%`);
                },
                // Error callback
                (error) => {
                    console.error('Error loading model:', error);
                    updateSceneInfo('Error loading model', true);
                    URL.revokeObjectURL(url);
                }
            );
            
            // Reset file input
            event.target.value = '';
        } catch (error) {
            console.error('Error handling model import:', error);
            updateSceneInfo('Error importing model', true);
        }
    }
    
    // Function to export scene as JSON
    function exportScene() {
        try {
            const sceneJson = scene.toJSON();
            const jsonString = JSON.stringify(sceneJson, null, 2);
            const blob = new Blob([jsonString], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = 'scene.json';
            a.click();
            
            URL.revokeObjectURL(url);
            
            updateSceneInfo('Scene exported as JSON', false, 'success');
        } catch (error) {
            console.error('Error exporting scene:', error);
            updateSceneInfo('Error exporting scene', true);
        }
    }
    
    // Function to generate and copy Three.js code
    function generateAndCopyCode() {
        try {
            // Generate code for scene setup
            let code = `// Three.js Scene exported from 3D Scene Editor\n\n`;
            code += `// Create scene\n`;
            code += `const scene = new THREE.Scene();\n`;
            code += `scene.background = new THREE.Color(0x${scene.background.getHexString()});\n\n`;
            
            // Add renderer code
            code += `// Renderer setup\n`;
            code += `const renderer = new THREE.WebGLRenderer({ antialias: true });\n`;
            code += `renderer.setSize(window.innerWidth, window.innerHeight);\n`;
            code += `renderer.setPixelRatio(window.devicePixelRatio);\n`;
            code += `renderer.shadowMap.enabled = ${renderer.shadowMap.enabled};\n`;
            code += `renderer.shadowMap.type = THREE.PCFSoftShadowMap;\n`;
            code += `renderer.toneMapping = THREE.ACESFilmicToneMapping;\n`;
            code += `renderer.toneMappingExposure = 1;\n`;
            code += `document.body.appendChild(renderer.domElement);\n\n`;
            
            // Add camera code
            code += `// Camera setup\n`;
            if (camera === perspectiveCamera) {
                code += `const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);\n`;
            } else {
                code += `const camera = new THREE.OrthographicCamera(-5, 5, 5, -5, 0.1, 1000);\n`;
            }
            code += `camera.position.set(${camera.position.x.toFixed(2)}, ${camera.position.y.toFixed(2)}, ${camera.position.z.toFixed(2)});\n`;
            code += `camera.lookAt(${cameraTarget.x.toFixed(2)}, ${cameraTarget.y.toFixed(2)}, ${cameraTarget.z.toFixed(2)});\n\n`;
            
            // Add orbit controls
            code += `// Orbit controls\n`;
            code += `const controls = new THREE.OrbitControls(camera, renderer.domElement);\n`;
            code += `controls.enableDamping = true;\n`;
            code += `controls.dampingFactor = 0.05;\n\n`;
            
            // Add ambient light
            code += `// Ambient light\n`;
            code += `const ambientLight = new THREE.AmbientLight(0x${ambientLight.color.getHexString()}, ${ambientLight.intensity});\n`;
            code += `scene.add(ambientLight);\n\n`;
            
            // Add all other objects
            code += `// Scene objects\n`;
            sceneManager.objects.forEach(obj => {
                if (obj.type.includes('light')) {
                    // Add light code
                    const light = obj.object;
                    
                    code += `// ${obj.name}\n`;
                    if (obj.type === 'light-directional') {
                        code += `const ${obj.id} = new THREE.DirectionalLight(0x${light.color.getHexString()}, ${light.intensity});\n`;
                    } else if (obj.type === 'light-point') {
                        code += `const ${obj.id} = new THREE.PointLight(0x${light.color.getHexString()}, ${light.intensity}, ${light.distance});\n`;
                    } else if (obj.type === 'light-spot') {
                        code += `const ${obj.id} = new THREE.SpotLight(0x${light.color.getHexString()}, ${light.intensity}, ${light.distance}, ${light.angle.toFixed(4)}, ${light.penumbra});\n`;
                    }
                    
                    code += `${obj.id}.position.set(${light.position.x.toFixed(2)}, ${light.position.y.toFixed(2)}, ${light.position.z.toFixed(2)});\n`;
                    
                    if (light.castShadow) {
                        code += `${obj.id}.castShadow = true;\n`;
                        if (light.shadow) {
                            code += `${obj.id}.shadow.mapSize.width = ${light.shadow.mapSize.width};\n`;
                            code += `${obj.id}.shadow.mapSize.height = ${light.shadow.mapSize.height};\n`;
                        }
                    }
                    
                    code += `scene.add(${obj.id});\n\n`;
                } else {
                    // Add mesh code
                    const mesh = obj.object;
                    
                    code += `// ${obj.name}\n`;
                    code += `const ${obj.id}_material = new THREE.MeshStandardMaterial({\n`;
                    code += `  color: 0x${mesh.material.color.getHexString()},\n`;
                    code += `  metalness: ${mesh.material.metalness},\n`;
                    code += `  roughness: ${mesh.material.roughness},\n`;
                    
                    if (mesh.material.wireframe) {
                        code += `  wireframe: true,\n`;
                    }
                    
                    code += `});\n`;
                    
                    // Determine geometry type
                    if (mesh.geometry instanceof THREE.BoxGeometry) {
                        code += `const ${obj.id}_geometry = new THREE.BoxGeometry();\n`;
                    } else if (mesh.geometry instanceof THREE.SphereGeometry) {
                        code += `const ${obj.id}_geometry = new THREE.SphereGeometry(0.5, 32, 32);\n`;
                    } else if (mesh.geometry instanceof THREE.CylinderGeometry) {
                        code += `const ${obj.id}_geometry = new THREE.CylinderGeometry(0.5, 0.5, 1, 32);\n`;
                    } else if (mesh.geometry instanceof THREE.TorusGeometry) {
                        code += `const ${obj.id}_geometry = new THREE.TorusGeometry(0.5, 0.2, 16, 32);\n`;
                    } else if (mesh.geometry instanceof THREE.PlaneGeometry) {
                        code += `const ${obj.id}_geometry = new THREE.PlaneGeometry(1, 1);\n`;
                    } else {
                        code += `// Complex or custom geometry\n`;
                        code += `const ${obj.id}_geometry = new THREE.BoxGeometry();\n`;
                    }
                    
                    code += `const ${obj.id} = new THREE.Mesh(${obj.id}_geometry, ${obj.id}_material);\n`;
                    code += `${obj.id}.position.set(${mesh.position.x.toFixed(2)}, ${mesh.position.y.toFixed(2)}, ${mesh.position.z.toFixed(2)});\n`;
                    code += `${obj.id}.rotation.set(${mesh.rotation.x.toFixed(4)}, ${mesh.rotation.y.toFixed(4)}, ${mesh.rotation.z.toFixed(4)});\n`;
                    code += `${obj.id}.scale.set(${mesh.scale.x.toFixed(2)}, ${mesh.scale.y.toFixed(2)}, ${mesh.scale.z.toFixed(2)});\n`;
                    
                    if (mesh.castShadow) {
                        code += `${obj.id}.castShadow = true;\n`;
                    }
                    
                    if (mesh.receiveShadow) {
                        code += `${obj.id}.receiveShadow = true;\n`;
                    }
                    
                    code += `scene.add(${obj.id});\n\n`;
                }
            });
            
            // Add animation loop
            code += `// Animation loop\n`;
            code += `function animate() {\n`;
            code += `  requestAnimationFrame(animate);\n`;
            code += `  controls.update();\n`;
            code += `  renderer.render(scene, camera);\n`;
            code += `}\n\n`;
            code += `animate();\n\n`;
            
            // Add window resize handler
            code += `// Window resize handler\n`;
            code += `window.addEventListener('resize', () => {\n`;
            code += `  camera.aspect = window.innerWidth / window.innerHeight;\n`;
            code += `  camera.updateProjectionMatrix();\n`;
            code += `  renderer.setSize(window.innerWidth, window.innerHeight);\n`;
            code += `});\n`;
            
            // Copy to clipboard
            navigator.clipboard.writeText(code)
                .then(() => {
                    updateSceneInfo('Three.js code copied to clipboard!', false, 'success');
                })
                .catch(err => {
                    console.error('Could not copy text: ', err);
                    // Fallback
                    const textarea = document.createElement('textarea');
                    textarea.value = code;
                    document.body.appendChild(textarea);
                    textarea.select();
                    document.execCommand('copy');
                    document.body.removeChild(textarea);
                    updateSceneInfo('Three.js code copied to clipboard!', false, 'success');
                });
        } catch (error) {
            console.error('Error generating code:', error);
            updateSceneInfo('Error generating Three.js code', true);
        }
    }
    
    // Animation loop
    function animate() {
        requestAnimationFrame(animate);
        orbitControls.update();
        renderer.render(scene, camera);
    }
    
    // Window resize handler
    window.addEventListener('resize', () => {
        const width = window.innerWidth - 320;
        const height = window.innerHeight;
        
        // Update camera aspect ratio and projection matrix
        if (camera === perspectiveCamera) {
            perspectiveCamera.aspect = width / height;
            perspectiveCamera.updateProjectionMatrix();
        } else {
            // Update orthographic camera frustum
            orthographicCamera.left = -5 * (width / height);
            orthographicCamera.right = 5 * (width / height);
            orthographicCamera.updateProjectionMatrix();
        }
        
        // Update renderer size
        renderer.setSize(width, height);
    });
    
    // Set up the UI components
    setupTabs();
    setupEventListeners();
    
    // Select the initial object
    sceneManager.selectObject(boxObj.id);
    
    // Start animation loop
    animate();
    
    // Show ready message
    updateSceneInfo('3D Scene Editor ready. Click on objects to select them');
}
