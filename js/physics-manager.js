// Physics Manager Class
// Handles physics simulation with Cannon.js integration
class PhysicsManager {
    constructor(sceneManager) {
        // Store references
        this.sceneManager = sceneManager;
        this.scene = sceneManager.scene;
        
        // Cannon.js physics world
        this.world = null;
        
        // Physics settings
        this.gravity = new CANNON.Vec3(0, -9.8, 0);
        this.timeStep = 1/60;
        this.physicsBodies = new Map(); // Map of Three.js UUID to Cannon.js body
        this.debugBodies = new Map(); // Map of Three.js UUID to debug mesh
        
        // Physics state
        this.isRunning = false;
        this.showDebug = false;
        this.lastCallTime = null;
        
        // Load Cannon.js dynamically
        this.loadCannon();
    }
    
    // Load Cannon.js dynamically
    async loadCannon() {
        try {
            // Load the Cannon.js script dynamically
            const cannonScript = document.createElement('script');
            cannonScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/cannon.js/0.6.2/cannon.min.js';
            cannonScript.async = true;
            document.head.appendChild(cannonScript);
            
            // Wait for Cannon.js to load
            cannonScript.onload = () => {
                console.log('Cannon.js loaded successfully');
                this.initPhysicsWorld();
                this.updateUI();
            };
        } catch (error) {
            console.error('Error loading Cannon.js:', error);
            updateSceneInfo('Error loading physics engine', true);
        }
    }
    
    // Initialize physics world
    initPhysicsWorld() {
        if (!window.CANNON) {
            console.error('Cannon.js not loaded');
            return;
        }
        
        // Create a world
        this.world = new CANNON.World();
        this.world.gravity.set(this.gravity.x, this.gravity.y, this.gravity.z);
        
        // Default physics material
        this.defaultMaterial = new CANNON.Material('default');
        
        // Default contact material (how materials interact)
        const defaultContactMaterial = new CANNON.ContactMaterial(
            this.defaultMaterial, 
            this.defaultMaterial, 
            {
                friction: 0.3,
                restitution: 0.3, // "Bounciness"
                contactEquationStiffness: 1e7,
                contactEquationRelaxation: 3
            }
        );
        
        // Add contact material to the world
        this.world.addContactMaterial(defaultContactMaterial);
        this.world.defaultContactMaterial = defaultContactMaterial;
        
        // Create ground physics body if needed
        this.createGround();
        
        console.log('Physics world initialized');
    }
    
    // Create a ground plane
    createGround() {
        // Find ground plane in scene (assuming the existing ground plane has position y = -0.01)
        const groundObj = this.sceneManager.objects.find(obj => 
            obj.object.isObject3D && 
            !obj.type.includes('light') && 
            Math.abs(obj.object.position.y + 0.01) < 0.1 &&
            obj.object.geometry instanceof THREE.PlaneGeometry
        );
        
        if (groundObj) {
            console.log('Found existing ground plane, adding physics');
            this.addPhysicsToObject(groundObj.object, 'static', 'plane');
        } else {
            console.log('No ground plane found, creating physics-only ground');
            // Create a physics-only ground plane
            const groundBody = new CANNON.Body({
                mass: 0, // Static body
                shape: new CANNON.Plane(),
                material: this.defaultMaterial
            });
            
            // Rotate it to make it horizontal (XZ plane)
            groundBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2);
            groundBody.position.set(0, 0, 0);
            
            // Add to world
            this.world.addBody(groundBody);
        }
    }
    
    // Add physics to a Three.js object
    addPhysicsToObject(object, type = 'dynamic', collisionShape = 'auto', options = {}) {
        if (!this.world || !object) return null;
        
        // Check if object already has physics
        if (this.physicsBodies.has(object.uuid)) {
            return this.physicsBodies.get(object.uuid);
        }
        
        // Default options
        const physicsOptions = {
            mass: type === 'static' ? 0 : options.mass || 1,
            friction: options.friction !== undefined ? options.friction : 0.3,
            restitution: options.restitution !== undefined ? options.restitution : 0.3
        };
        
        // Create material for this body
        const bodyMaterial = new CANNON.Material();
        bodyMaterial.friction = physicsOptions.friction;
        bodyMaterial.restitution = physicsOptions.restitution;
        
        // Create a contact material with the default material
        const contactMaterial = new CANNON.ContactMaterial(
            this.defaultMaterial,
            bodyMaterial,
            {
                friction: physicsOptions.friction,
                restitution: physicsOptions.restitution
            }
        );
        this.world.addContactMaterial(contactMaterial);
        
        // Determine shape based on Three.js geometry
        let shape;
        
        if (collisionShape === 'auto') {
            // Auto-determine shape from object geometry
            if (object.geometry instanceof THREE.BoxGeometry) {
                // Box shape
                const box = object.geometry;
                const sx = object.scale.x * (box.parameters.width || 1);
                const sy = object.scale.y * (box.parameters.height || 1);
                const sz = object.scale.z * (box.parameters.depth || 1);
                shape = new CANNON.Box(new CANNON.Vec3(sx / 2, sy / 2, sz / 2));
            } 
            else if (object.geometry instanceof THREE.SphereGeometry) {
                // Sphere shape
                const sphere = object.geometry;
                const radius = object.scale.x * (sphere.parameters.radius || 0.5);
                shape = new CANNON.Sphere(radius);
            } 
            else if (object.geometry instanceof THREE.CylinderGeometry) {
                // Cylinder shape
                const cylinder = object.geometry;
                const radiusTop = object.scale.x * (cylinder.parameters.radiusTop || 0.5);
                const radiusBottom = object.scale.x * (cylinder.parameters.radiusBottom || 0.5);
                const height = object.scale.y * (cylinder.parameters.height || 1);
                // Cannon.js uses a special orientation for cylinders
                const segments = 8; // Approximation segments
                shape = new CANNON.Cylinder(radiusTop, radiusBottom, height, segments);
            } 
            else if (object.geometry instanceof THREE.PlaneGeometry) {
                // Plane shape
                shape = new CANNON.Plane();
            } 
            else {
                // Fallback to box shape
                console.warn('Unsupported geometry type, using box shape');
                const boundingBox = new THREE.Box3().setFromObject(object);
                const size = boundingBox.getSize(new THREE.Vector3());
                shape = new CANNON.Box(new CANNON.Vec3(size.x / 2, size.y / 2, size.z / 2));
            }
        } else {
            // User-specified shape
            switch (collisionShape) {
                case 'box':
                    const boundingBox = new THREE.Box3().setFromObject(object);
                    const size = boundingBox.getSize(new THREE.Vector3());
                    shape = new CANNON.Box(new CANNON.Vec3(size.x / 2, size.y / 2, size.z / 2));
                    break;
                case 'sphere':
                    const boundingSphere = new THREE.Sphere();
                    new THREE.Box3().setFromObject(object).getBoundingSphere(boundingSphere);
                    shape = new CANNON.Sphere(boundingSphere.radius);
                    break;
                case 'cylinder':
                    const boundingBox2 = new THREE.Box3().setFromObject(object);
                    const size2 = boundingBox2.getSize(new THREE.Vector3());
                    const radius = Math.max(size2.x, size2.z) / 2;
                    const height = size2.y;
                    const segments = 8;
                    shape = new CANNON.Cylinder(radius, radius, height, segments);
                    break;
                case 'plane':
                    shape = new CANNON.Plane();
                    break;
                case 'compound':
                    // For compound shapes, we'd need more complex logic based on the object structure
                    // This is a simplified version that creates a compound shape from child meshes
                    shape = this.createCompoundShape(object);
                    break;
                default:
                    console.warn('Unknown collision shape:', collisionShape);
                    const bb = new THREE.Box3().setFromObject(object);
                    const sz = bb.getSize(new THREE.Vector3());
                    shape = new CANNON.Box(new CANNON.Vec3(sz.x / 2, sz.y / 2, sz.z / 2));
            }
        }
        
        // Create body configuration
        const bodyConfig = {
            mass: physicsOptions.mass,
            shape: shape,
            material: bodyMaterial
        };
        
        // For cylinders, we need to properly align them
        if (shape instanceof CANNON.Cylinder) {
            // The physics shape is aligned differently than the visual cylinder
            bodyConfig.fixedRotation = options.fixedRotation || false;
            
            // Use quaternion to fix orientation
            const quat = new CANNON.Quaternion();
            quat.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), Math.PI / 2);
            bodyConfig.quaternion = quat;
        }
        
        // Create body
        const body = new CANNON.Body(bodyConfig);
        
        // Set initial position and rotation from Three.js object
        body.position.set(
            object.position.x,
            object.position.y,
            object.position.z
        );
        
        // Set rotation - need to convert Three.js Euler to Cannon.js Quaternion
        // If the object has a parent with rotation, we need the world quaternion
        if (object.parent && object.parent !== this.scene) {
            const worldQuat = new THREE.Quaternion();
            object.getWorldQuaternion(worldQuat);
            body.quaternion.set(worldQuat.x, worldQuat.y, worldQuat.z, worldQuat.w);
        } else {
            // If it's a top-level object, just use its own quaternion
            body.quaternion.set(
                object.quaternion.x,
                object.quaternion.y,
                object.quaternion.z,
                object.quaternion.w
            );
        }
        
        // Special handling for specific shapes
        if (shape instanceof CANNON.Plane && collisionShape === 'plane') {
            // Rotate plane to be horizontal if it's a ground plane
            body.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2);
            
            // If the plane has rotation, apply it
            if (object.rotation.x !== 0 || object.rotation.y !== 0 || object.rotation.z !== 0) {
                const q = new CANNON.Quaternion();
                q.setFromEuler(object.rotation.x, object.rotation.y, object.rotation.z, 'XYZ');
                body.quaternion = q.mult(body.quaternion);
            }
        }
        
        // Set additional properties
        if (type === 'kinematic') {
            body.type = CANNON.Body.KINEMATIC;
        }
        
        if (options.linearDamping !== undefined) {
            body.linearDamping = options.linearDamping;
        }
        
        if (options.angularDamping !== undefined) {
            body.angularDamping = options.angularDamping;
        }
        
        // Add body to world
        this.world.addBody(body);
        
        // Store reference to the body
        this.physicsBodies.set(object.uuid, body);
        
        // Create debug visualization if enabled
        if (this.showDebug) {
            this.createDebugMesh(object, body, shape);
        }
        
        return body;
    }
    
    // Create a compound shape from an object with children
    createCompoundShape(object) {
        const compoundShape = new CANNON.Compound();
        
        // Get all mesh children
        const meshes = [];
        object.traverse(child => {
            if (child.isMesh) {
                meshes.push(child);
            }
        });
        
        if (meshes.length === 0) {
            // No mesh children, use own geometry if available
            if (object.isMesh) {
                meshes.push(object);
            } else {
                console.warn('No meshes found for compound shape, falling back to box');
                // Fallback to a single box for the whole object
                const boundingBox = new THREE.Box3().setFromObject(object);
                const size = boundingBox.getSize(new THREE.Vector3());
                return new CANNON.Box(new CANNON.Vec3(size.x / 2, size.y / 2, size.z / 2));
            }
        }
        
        // Add shapes for each mesh
        meshes.forEach(mesh => {
            let shape;
            let offset = new CANNON.Vec3();
            
            // Get world position relative to the parent object
            const worldPos = new THREE.Vector3();
            mesh.getWorldPosition(worldPos);
            
            // Convert to local space relative to the parent
            const localPos = worldPos.clone().sub(object.position);
            offset.set(localPos.x, localPos.y, localPos.z);
            
            // Determine shape based on mesh geometry
            if (mesh.geometry instanceof THREE.BoxGeometry) {
                const box = mesh.geometry;
                const sx = mesh.scale.x * (box.parameters.width || 1);
                const sy = mesh.scale.y * (box.parameters.height || 1);
                const sz = mesh.scale.z * (box.parameters.depth || 1);
                shape = new CANNON.Box(new CANNON.Vec3(sx / 2, sy / 2, sz / 2));
            } 
            else if (mesh.geometry instanceof THREE.SphereGeometry) {
                const sphere = mesh.geometry;
                const radius = mesh.scale.x * (sphere.parameters.radius || 0.5);
                shape = new CANNON.Sphere(radius);
            } 
            else if (mesh.geometry instanceof THREE.CylinderGeometry) {
                const cylinder = mesh.geometry;
                const radiusTop = mesh.scale.x * (cylinder.parameters.radiusTop || 0.5);
                const radiusBottom = mesh.scale.x * (cylinder.parameters.radiusBottom || 0.5);
                const height = mesh.scale.y * (cylinder.parameters.height || 1);
                const segments = 8;
                shape = new CANNON.Cylinder(radiusTop, radiusBottom, height, segments);
                
                // Adjust orientation for cylinders
                const q = new CANNON.Quaternion();
                q.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), Math.PI / 2);
                compoundShape.addChild(shape, offset, q);
                return; // Skip the default addChild call below
            } 
            else {
                // Fallback to box shape
                const boundingBox = new THREE.Box3().setFromObject(mesh);
                const size = boundingBox.getSize(new THREE.Vector3());
                shape = new CANNON.Box(new CANNON.Vec3(size.x / 2, size.y / 2, size.z / 2));
            }
            
            // Add the shape to the compound shape
            compoundShape.addChild(shape, offset);
        });
        
        return compoundShape;
    }
    
    // Create a debug visualization mesh for a physics body
    createDebugMesh(object, body, shape) {
        let debugMesh;
        
        // Different visualization based on shape type
        if (shape instanceof CANNON.Box) {
            const geometry = new THREE.BoxGeometry(
                shape.halfExtents.x * 2,
                shape.halfExtents.y * 2,
                shape.halfExtents.z * 2
            );
            const material = new THREE.MeshBasicMaterial({
                color: 0x00ff00,
                wireframe: true,
                transparent: true,
                opacity: 0.5
            });
            debugMesh = new THREE.Mesh(geometry, material);
        } 
        else if (shape instanceof CANNON.Sphere) {
            const geometry = new THREE.SphereGeometry(shape.radius, 16, 16);
            const material = new THREE.MeshBasicMaterial({
                color: 0x00ff00,
                wireframe: true,
                transparent: true,
                opacity: 0.5
            });
            debugMesh = new THREE.Mesh(geometry, material);
        } 
        else if (shape instanceof CANNON.Cylinder) {
            const geometry = new THREE.CylinderGeometry(
                shape.radiusTop,
                shape.radiusBottom,
                shape.height,
                16
            );
            const material = new THREE.MeshBasicMaterial({
                color: 0x00ff00,
                wireframe: true,
                transparent: true,
                opacity: 0.5
            });
            debugMesh = new THREE.Mesh(geometry, material);
            
            // Rotate to match Cannon.js orientation
            debugMesh.rotation.x = Math.PI / 2;
        } 
        else if (shape instanceof CANNON.Plane) {
            // For planes, use a large square
            const geometry = new THREE.PlaneGeometry(100, 100, 10, 10);
            const material = new THREE.MeshBasicMaterial({
                color: 0x00ff00,
                wireframe: true,
                transparent: true,
                opacity: 0.5,
                side: THREE.DoubleSide
            });
            debugMesh = new THREE.Mesh(geometry, material);
            
            // Rotate to match Cannon.js plane orientation
            debugMesh.rotation.x = -Math.PI / 2;
        } 
        else if (shape instanceof CANNON.Compound) {
            // For compound shapes, create a group with a mesh for each part
            debugMesh = new THREE.Group();
            
            shape.childShapes.forEach(childShape => {
                let childDebugMesh;
                const s = childShape.shape;
                
                if (s instanceof CANNON.Box) {
                    const geometry = new THREE.BoxGeometry(
                        s.halfExtents.x * 2,
                        s.halfExtents.y * 2,
                        s.halfExtents.z * 2
                    );
                    const material = new THREE.MeshBasicMaterial({
                        color: 0x00ff00,
                        wireframe: true,
                        transparent: true,
                        opacity: 0.5
                    });
                    childDebugMesh = new THREE.Mesh(geometry, material);
                } 
                else if (s instanceof CANNON.Sphere) {
                    const geometry = new THREE.SphereGeometry(s.radius, 16, 16);
                    const material = new THREE.MeshBasicMaterial({
                        color: 0x00ff00,
                        wireframe: true,
                        transparent: true,
                        opacity: 0.5
                    });
                    childDebugMesh = new THREE.Mesh(geometry, material);
                } 
                else if (s instanceof CANNON.Cylinder) {
                    const geometry = new THREE.CylinderGeometry(
                        s.radiusTop,
                        s.radiusBottom,
                        s.height,
                        16
                    );
                    const material = new THREE.MeshBasicMaterial({
                        color: 0x00ff00,
                        wireframe: true,
                        transparent: true,
                        opacity: 0.5
                    });
                    childDebugMesh = new THREE.Mesh(geometry, material);
                    
                    // Apply the orientation quaternion for cylinders
                    const q = childShape.quaternion;
                    childDebugMesh.quaternion.set(q.x, q.y, q.z, q.w);
                } 
                else {
                    console.warn('Unsupported shape type in compound:', s);
                    return;
                }
                
                // Position the child mesh
                const offset = childShape.offset;
                childDebugMesh.position.set(offset.x, offset.y, offset.z);
                
                // Add to group
                debugMesh.add(childDebugMesh);
            });
        } 
        else {
            console.warn('Unsupported shape type for debug visualization:', shape);
            return;
        }
        
        // Set initial position and rotation
        debugMesh.position.copy(object.position);
        debugMesh.quaternion.copy(object.quaternion);
        
        // Add to scene
        this.scene.add(debugMesh);
        
        // Store reference
        this.debugBodies.set(object.uuid, debugMesh);
        
        // Initially hide debug mesh if debug is not enabled
        debugMesh.visible = this.showDebug;
        
        return debugMesh;
    }
    
    // Remove physics from an object
    removePhysicsFromObject(object) {
        if (!this.world || !object) return;
        
        // Get the physics body
        const body = this.physicsBodies.get(object.uuid);
        if (!body) return;
        
        // Remove from world
        this.world.removeBody(body);
        
        // Remove from Map
        this.physicsBodies.delete(object.uuid);
        
        // Remove debug visualization if it exists
        const debugMesh = this.debugBodies.get(object.uuid);
        if (debugMesh) {
            this.scene.remove(debugMesh);
            this.debugBodies.delete(object.uuid);
        }
    }
    
    // Update physics for all objects
    updatePhysics(deltaTime) {
        if (!this.world || !this.isRunning) return;
        
        // Skip if delta time is too large (e.g., after tab switching)
        if (deltaTime > 0.1) deltaTime = 0.1;
        
        // Step the physics world
        this.world.step(this.timeStep, deltaTime, 3);
        
        // Update Three.js objects from Cannon.js bodies
        this.physicsBodies.forEach((body, uuid) => {
            const object = this.sceneManager.getObjectByUUID(uuid);
            if (!object) return;
            
            // Update position
            object.position.set(
                body.position.x,
                body.position.y,
                body.position.z
            );
            
            // Update rotation
            object.quaternion.set(
                body.quaternion.x,
                body.quaternion.y,
                body.quaternion.z,
                body.quaternion.w
            );
            
            // Update debug visualization if enabled
            const debugMesh = this.debugBodies.get(uuid);
            if (debugMesh && this.showDebug) {
                debugMesh.position.copy(object.position);
                debugMesh.quaternion.copy(object.quaternion);
            }
        });
    }
    
    // Start physics simulation
    start() {
        if (!this.world) return;
        
        this.isRunning = true;
        this.lastCallTime = performance.now() / 1000;
        
        // Update UI
        const toggleBtn = document.getElementById('togglePhysics');
        if (toggleBtn) {
            toggleBtn.textContent = 'Pause';
        }
        
        console.log('Physics simulation started');
    }
    
    // Pause physics simulation
    pause() {
        this.isRunning = false;
        
        // Update UI
        const toggleBtn = document.getElementById('togglePhysics');
        if (toggleBtn) {
            toggleBtn.textContent = 'Start';
        }
        
        console.log('Physics simulation paused');
    }
    
    // Toggle physics simulation
    toggle() {
        if (this.isRunning) {
            this.pause();
        } else {
            this.start();
        }
    }
    
    // Reset physics world to initial state
    reset() {
        if (!this.world) return;
        
        // Pause simulation
        this.pause();
        
        // Remove all bodies except ground (fixed bodies with mass 0)
        const bodiesToRemove = [];
        this.world.bodies.forEach(body => {
            if (body.mass !== 0) {
                bodiesToRemove.push(body);
            }
        });
        
        bodiesToRemove.forEach(body => {
            this.world.removeBody(body);
        });
        
        // Reset all object positions and rotations to their initial values
        this.physicsBodies.forEach((body, uuid) => {
            // Remove from Map and world
            this.physicsBodies.delete(uuid);
            this.world.removeBody(body);
            
            // Remove debug visualization if it exists
            const debugMesh = this.debugBodies.get(uuid);
            if (debugMesh) {
                this.scene.remove(debugMesh);
                this.debugBodies.delete(uuid);
            }
        });
        
        // Clear all Maps
        this.physicsBodies.clear();
        this.debugBodies.clear();
        
        // Re-create ground
        this.createGround();
        
        console.log('Physics world reset');
    }
    
    // Set gravity
    setGravity(x, y, z) {
        if (!this.world) return;
        
        this.gravity.set(x, y, z);
        this.world.gravity.set(x, y, z);
        
        console.log(`Gravity set to (${x}, ${y}, ${z})`);
    }
    
    // Toggle debug visualization
    toggleDebug(show) {
        this.showDebug = show;
        
        // Update visibility of all debug meshes
        this.debugBodies.forEach((mesh, uuid) => {
            mesh.visible = show;
        });
        
        // If debug is now enabled, create missing debug meshes
        if (show) {
            this.physicsBodies.forEach((body, uuid) => {
                if (!this.debugBodies.has(uuid)) {
                    const object = this.sceneManager.getObjectByUUID(uuid);
                    if (object) {
                        this.createDebugMesh(object, body, body.shapes[0]);
                    }
                }
            });
        }
        
        console.log(`Debug visualization ${show ? 'enabled' : 'disabled'}`);
    }
    
    // Run a physics preset
    runPreset(presetName) {
        if (!this.world) return;
        
        // Reset the physics world first
        this.reset();
        
        switch (presetName) {
            case 'dropTest':
                this.runDropTestPreset();
                break;
            case 'domino':
                this.runDominoPreset();
                break;
            case 'ragdoll':
                this.runRagdollPreset();
                break;
            default:
                console.warn('Unknown preset:', presetName);
        }
    }
    
    // Drop Test Preset - Creates and drops various objects
    runDropTestPreset() {
        // Make sure physics is initialized
        if (!this.world) return;
        
        // Start at a higher position
        const startHeight = 5;
        const spacing = 1.5;
        
        // Create a box
        const boxGeometry = new THREE.BoxGeometry();
        const boxMaterial = new THREE.MeshStandardMaterial({ color: 0x3d7eff });
        const box = new THREE.Mesh(boxGeometry, boxMaterial);
        box.position.set(-spacing, startHeight, 0);
        box.scale.set(1, 1, 1);
        this.scene.add(box);
        this.sceneManager.addObject(box, 'Drop Box');
        
        // Create a sphere
        const sphereGeometry = new THREE.SphereGeometry(0.5, 32, 32);
        const sphereMaterial = new THREE.MeshStandardMaterial({ color: 0xff5c5c });
        const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
        sphere.position.set(0, startHeight, 0);
        this.scene.add(sphere);
        this.sceneManager.addObject(sphere, 'Drop Sphere');
        
        // Create a cylinder
        const cylinderGeometry = new THREE.CylinderGeometry(0.5, 0.5, 1, 32);
        const cylinderMaterial = new THREE.MeshStandardMaterial({ color: 0x5cff7d });
        const cylinder = new THREE.Mesh(cylinderGeometry, cylinderMaterial);
        cylinder.position.set(spacing, startHeight, 0);
        this.scene.add(cylinder);
        this.sceneManager.addObject(cylinder, 'Drop Cylinder');
        
        // Add physics to all objects
        this.addPhysicsToObject(box, 'dynamic', 'box', { mass: 1, restitution: 0.5 });
        this.addPhysicsToObject(sphere, 'dynamic', 'sphere', { mass: 1, restitution: 0.7 });
        this.addPhysicsToObject(cylinder, 'dynamic', 'cylinder', { mass: 1, restitution: 0.3 });
        
        // Start the simulation
        this.start();
        
        console.log('Drop test preset started');
    }
    
    // Domino Preset - Creates a domino effect
    runDominoPreset() {
        // Make sure physics is initialized
        if (!this.world) return;
        
        // Domino dimensions
        const dominoWidth = 0.1;
        const dominoHeight = 1;
        const dominoDepth = 0.5;
        const dominoSpacing = 0.3;
        const numDominoes = 10;
        
        // Create dominoes
        for (let i = 0; i < numDominoes; i++) {
            const dominoGeometry = new THREE.BoxGeometry(dominoWidth, dominoHeight, dominoDepth);
            const dominoMaterial = new THREE.MeshStandardMaterial({ 
                color: new THREE.Color().setHSL(i / numDominoes, 0.8, 0.5) 
            });
            const domino = new THREE.Mesh(dominoGeometry, dominoMaterial);
            
            // Position each domino in a row with slight offset
            domino.position.set(
                i * (dominoWidth + dominoSpacing), 
                dominoHeight / 2, // Position at half height so bottom is at y=0
                0
            );
            
            this.scene.add(domino);
            this.sceneManager.addObject(domino, `Domino ${i+1}`);
            
            // Add physics
            this.addPhysicsToObject(domino, 'dynamic', 'box', {
                mass: 1,
                friction: 0.5,
                restitution: 0.1
            });
        }
        
        // Create a pusher cube that will start the chain reaction
        const pusherGeometry = new THREE.BoxGeometry(0.2, 0.2, 0.2);
        const pusherMaterial = new THREE.MeshStandardMaterial({ color: 0xff0000 });
        const pusher = new THREE.Mesh(pusherGeometry, pusherMaterial);
        
        // Position the pusher above and behind the first domino
        pusher.position.set(-dominoSpacing, dominoHeight + 0.5, 0);
        
        this.scene.add(pusher);
        this.sceneManager.addObject(pusher, 'Pusher');
        
        // Add physics to pusher with higher mass
        const pusherBody = this.addPhysicsToObject(pusher, 'dynamic', 'box', {
            mass: 5, // Higher mass for more impact
            friction: 0.5,
            restitution: 0.2
        });
        
        // Apply an impulse to the pusher to start the reaction after a short delay
        setTimeout(() => {
            if (pusherBody && this.isRunning) {
                pusherBody.applyImpulse(
                    new CANNON.Vec3(5, 0, 0), // Impulse in +X direction
                    new CANNON.Vec3(0, 0, 0)  // Application point (body center)
                );
            }
        }, 500);
        
        // Start the simulation
        this.start();
        
        console.log('Domino preset started');
    }
    
    // Ragdoll Preset - Creates a simple ragdoll character
    runRagdollPreset() {
        // Make sure physics is initialized
        if (!this.world) return;
        
        // Create a ragdoll group to hold all parts
        const ragdollGroup = new THREE.Group();
        ragdollGroup.position.set(0, 3, 0);
        this.scene.add(ragdollGroup);
        this.sceneManager.addObject(ragdollGroup, 'Ragdoll');
        
        // Torso
        const torsoGeometry = new THREE.BoxGeometry(0.6, 1, 0.4);
        const torsoMaterial = new THREE.MeshStandardMaterial({ color: 0x3d7eff });
        const torso = new THREE.Mesh(torsoGeometry, torsoMaterial);
        torso.position.set(0, 0.5, 0);
        ragdollGroup.add(torso);
        
        // Head
        const headGeometry = new THREE.SphereGeometry(0.25, 32, 32);
        const headMaterial = new THREE.MeshStandardMaterial({ color: 0xffcc00 });
        const head = new THREE.Mesh(headGeometry, headMaterial);
        head.position.set(0, 1.25, 0);
        ragdollGroup.add(head);
        
        // Arms
        const armGeometry = new THREE.BoxGeometry(0.2, 0.6, 0.2);
        const armMaterial = new THREE.MeshStandardMaterial({ color: 0x3d7eff });
        
        // Left Arm
        const leftArm = new THREE.Mesh(armGeometry, armMaterial);
        leftArm.position.set(-0.4, 0.5, 0);
        ragdollGroup.add(leftArm);
        
        // Right Arm
        const rightArm = new THREE.Mesh(armGeometry, armMaterial);
        rightArm.position.set(0.4, 0.5, 0);
        ragdollGroup.add(rightArm);
        
        // Legs
        const legGeometry = new THREE.BoxGeometry(0.2, 0.8, 0.2);
        const legMaterial = new THREE.MeshStandardMaterial({ color: 0x3d7eff });
        
        // Left Leg
        const leftLeg = new THREE.Mesh(legGeometry, legMaterial);
        leftLeg.position.set(-0.2, -0.4, 0);
        ragdollGroup.add(leftLeg);
        
        // Right Leg
        const rightLeg = new THREE.Mesh(legGeometry, legMaterial);
        rightLeg.position.set(0.2, -0.4, 0);
        ragdollGroup.add(rightLeg);
        
        // Add physics to all parts
        const torsoPhy = this.addPhysicsToObject(torso, 'dynamic', 'box', { mass: 3 });
        const headPhy = this.addPhysicsToObject(head, 'dynamic', 'sphere', { mass: 1 });
        const leftArmPhy = this.addPhysicsToObject(leftArm, 'dynamic', 'box', { mass: 1 });
        const rightArmPhy = this.addPhysicsToObject(rightArm, 'dynamic', 'box', { mass: 1 });
        const leftLegPhy = this.addPhysicsToObject(leftLeg, 'dynamic', 'box', { mass: 1 });
        const rightLegPhy = this.addPhysicsToObject(rightLeg, 'dynamic', 'box', { mass: 1 });
        
        // Create constraints between parts
        
        // Head to torso
        const headJoint = new CANNON.PointToPointConstraint(
            torsoPhy,
            new CANNON.Vec3(0, 0.5, 0),
            headPhy,
            new CANNON.Vec3(0, -0.25, 0)
        );
        this.world.addConstraint(headJoint);
        
        // Arms to torso
        const leftArmJoint = new CANNON.PointToPointConstraint(
            torsoPhy,
            new CANNON.Vec3(-0.3, 0.3, 0),
            leftArmPhy,
            new CANNON.Vec3(0, 0.3, 0)
        );
        this.world.addConstraint(leftArmJoint);
        
        const rightArmJoint = new CANNON.PointToPointConstraint(
            torsoPhy,
            new CANNON.Vec3(0.3, 0.3, 0),
            rightArmPhy,
            new CANNON.Vec3(0, 0.3, 0)
        );
        this.world.addConstraint(rightArmJoint);
        
        // Legs to torso
        const leftLegJoint = new CANNON.PointToPointConstraint(
            torsoPhy,
            new CANNON.Vec3(-0.2, -0.5, 0),
            leftLegPhy,
            new CANNON.Vec3(0, 0.4, 0)
        );
        this.world.addConstraint(leftLegJoint);
        
        const rightLegJoint = new CANNON.PointToPointConstraint(
            torsoPhy,
            new CANNON.Vec3(0.2, -0.5, 0),
            rightLegPhy,
            new CANNON.Vec3(0, 0.4, 0)
        );
        this.world.addConstraint(rightLegJoint);
        
        // Create a platform for the ragdoll to fall onto
        const platformGeometry = new THREE.BoxGeometry(3, 0.2, 3);
        const platformMaterial = new THREE.MeshStandardMaterial({ color: 0x999999 });
        const platform = new THREE.Mesh(platformGeometry, platformMaterial);
        platform.position.set(0, -1, 0);
        this.scene.add(platform);
        this.sceneManager.addObject(platform, 'Platform');
        this.addPhysicsToObject(platform, 'static', 'box');
        
        // Start the simulation
        this.start();
        
        console.log('Ragdoll preset started');
    }
    
    // Update UI elements
    updateUI() {
        // Gravity inputs
        ['X', 'Y', 'Z'].forEach(axis => {
            const gravityInput = document.getElementById(`gravity${axis}`);
            if (gravityInput) {
                gravityInput.value = this.gravity[axis.toLowerCase()];
                gravityInput.addEventListener('input', (e) => {
                    this.gravity[axis.toLowerCase()] = parseFloat(e.target.value);
                    if (this.world) {
                        this.world.gravity[axis.toLowerCase()] = parseFloat(e.target.value);
                    }
                });
            }
        });
        
        // Debug visualization toggle
        const debugCheckbox = document.getElementById('showPhysicsDebug');
        if (debugCheckbox) {
            debugCheckbox.checked = this.showDebug;
            debugCheckbox.addEventListener('change', (e) => {
                this.toggleDebug(e.target.checked);
            });
        }
        
        // Physics type dropdown
        const physicsTypeSelect = document.getElementById('physicsType');
        if (physicsTypeSelect) {
            physicsTypeSelect.addEventListener('change', (e) => {
                if (this.sceneManager.selectedObject) {
                    const object = this.sceneManager.selectedObject.object;
                    
                    // If object already has physics, remove it
                    if (this.physicsBodies.has(object.uuid)) {
                        this.removePhysicsFromObject(object);
                    }
                    
                    // Get physics property values
                    const collisionShape = document.getElementById('collisionShape').value;
                    const mass = parseFloat(document.getElementById('mass').value);
                    const friction = parseFloat(document.getElementById('friction').value);
                    const restitution = parseFloat(document.getElementById('restitution').value);
                    
                    // Add physics with new type
                    this.addPhysicsToObject(object, e.target.value, collisionShape, {
                        mass: mass,
                        friction: friction,
                        restitution: restitution
                    });
                }
            });
        }
        
        // Collision shape dropdown
        const collisionShapeSelect = document.getElementById('collisionShape');
        if (collisionShapeSelect) {
            collisionShapeSelect.addEventListener('change', (e) => {
                if (this.sceneManager.selectedObject) {
                    const object = this.sceneManager.selectedObject.object;
                    
                    // If object already has physics, remove it
                    if (this.physicsBodies.has(object.uuid)) {
                        this.removePhysicsFromObject(object);
                    }
                    
                    // Get physics property values
                    const physicsType = document.getElementById('physicsType').value;
                    const mass = parseFloat(document.getElementById('mass').value);
                    const friction = parseFloat(document.getElementById('friction').value);
                    const restitution = parseFloat(document.getElementById('restitution').value);
                    
                    // Add physics with new shape
                    this.addPhysicsToObject(object, physicsType, e.target.value, {
                        mass: mass,
                        friction: friction,
                        restitution: restitution
                    });
                }
            });
        }
        
        // Apply physics button
        const applyPhysicsBtn = document.getElementById('applyPhysics');
        if (applyPhysicsBtn) {
            applyPhysicsBtn.addEventListener('click', () => {
                if (this.sceneManager.selectedObject) {
                    const object = this.sceneManager.selectedObject.object;
                    
                    // If object already has physics, remove it
                    if (this.physicsBodies.has(object.uuid)) {
                        this.removePhysicsFromObject(object);
                    }
                    
                    // Get physics property values
                    const physicsType = document.getElementById('physicsType').value;
                    const collisionShape = document.getElementById('collisionShape').value;
                    const mass = parseFloat(document.getElementById('mass').value);
                    const friction = parseFloat(document.getElementById('friction').value);
                    const restitution = parseFloat(document.getElementById('restitution').value);
                    
                    // Add physics
                    this.addPhysicsToObject(object, physicsType, collisionShape, {
                        mass: mass,
                        friction: friction,
                        restitution: restitution
                    });
                    
                    // Start physics if not already running
                    if (!this.isRunning) {
                        this.start();
                    }
                    
                    updateSceneInfo('Physics applied to object', false, 'success');
                } else {
                    updateSceneInfo('No object selected', true);
                }
            });
        }
        
        // Toggle physics button
        const togglePhysicsBtn = document.getElementById('togglePhysics');
        if (togglePhysicsBtn) {
            togglePhysicsBtn.addEventListener('click', () => {
                this.toggle();
            });
        }
        
        // Reset physics button
        const resetPhysicsBtn = document.getElementById('resetPhysics');
        if (resetPhysicsBtn) {
            resetPhysicsBtn.addEventListener('click', () => {
                this.reset();
                updateSceneInfo('Physics reset', false, 'success');
            });
        }
        
        // Preset buttons
        const presetBtns = document.querySelectorAll('.preset-btn');
        if (presetBtns.length) {
            presetBtns.forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const preset = e.target.dataset.preset;
                    this.runPreset(preset);
                    updateSceneInfo(`Running ${preset} preset`, false, 'success');
                });
            });
        }
    }
    
    // Handle object selection change
    onObjectSelected(object) {
        // Update physics properties panel
        const objectPhysicsPanel = document.getElementById('objectPhysicsProperties');
        if (!objectPhysicsPanel) return;
        
        if (!object) {
            objectPhysicsPanel.classList.add('disabled');
            document.querySelector('.selected-name').textContent = 'No selection';
            return;
        }
        
        // Enable panel
        objectPhysicsPanel.classList.remove('disabled');
        
        // Update object name
        const selectedName = document.querySelector('.selected-name');
        if (selectedName) {
            selectedName.textContent = object.name || 'Selected Object';
        }
        
        // Check if object has physics
        const hasPhysics = this.physicsBodies.has(object.object.uuid);
        
        // Update physics type dropdown
        const physicsTypeSelect = document.getElementById('physicsType');
        if (physicsTypeSelect) {
            if (hasPhysics) {
                const body = this.physicsBodies.get(object.object.uuid);
                if (body.mass === 0) {
                    physicsTypeSelect.value = 'static';
                } else if (body.type === CANNON.Body.KINEMATIC) {
                    physicsTypeSelect.value = 'kinematic';
                } else {
                    physicsTypeSelect.value = 'dynamic';
                }
            } else {
                physicsTypeSelect.value = 'dynamic';
            }
        }
        
        // Update collision shape dropdown
        const collisionShapeSelect = document.getElementById('collisionShape');
        if (collisionShapeSelect) {
            if (hasPhysics) {
                const body = this.physicsBodies.get(object.object.uuid);
                const shape = body.shapes[0];
                
                if (shape instanceof CANNON.Box) {
                    collisionShapeSelect.value = 'box';
                } else if (shape instanceof CANNON.Sphere) {
                    collisionShapeSelect.value = 'sphere';
                } else if (shape instanceof CANNON.Cylinder) {
                    collisionShapeSelect.value = 'cylinder';
                } else if (shape instanceof CANNON.Plane) {
                    collisionShapeSelect.value = 'plane';
                } else if (shape instanceof CANNON.Compound) {
                    collisionShapeSelect.value = 'compound';
                } else {
                    collisionShapeSelect.value = 'auto';
                }
            } else {
                collisionShapeSelect.value = 'auto';
            }
        }
        
        // Update mass input
        const massInput = document.getElementById('mass');
        if (massInput) {
            if (hasPhysics) {
                const body = this.physicsBodies.get(object.object.uuid);
                massInput.value = body.mass;
            } else {
                massInput.value = 1;
            }
        }
        
        // Update friction input
        const frictionInput = document.getElementById('friction');
        if (frictionInput) {
            if (hasPhysics) {
                const body = this.physicsBodies.get(object.object.uuid);
                if (body.material) {
                    frictionInput.value = body.material.friction || 0.3;
                } else {
                    frictionInput.value = 0.3;
                }
            } else {
                frictionInput.value = 0.3;
            }
        }
        
        // Update restitution input
        const restitutionInput = document.getElementById('restitution');
        if (restitutionInput) {
            if (hasPhysics) {
                const body = this.physicsBodies.get(object.object.uuid);
                if (body.material) {
                    restitutionInput.value = body.material.restitution || 0.3;
                } else {
                    restitutionInput.value = 0.3;
                }
            } else {
                restitutionInput.value = 0.3;
            }
        }
    }
    
    // Callback for animation frame
    animate(currentTime) {
        if (!this.world || !this.isRunning) return;
        
        // Calculate time since last call
        if (this.lastCallTime === null) {
            this.lastCallTime = currentTime / 1000;
            return;
        }
        
        const delta = currentTime / 1000 - this.lastCallTime;
        this.lastCallTime = currentTime / 1000;
        
        // Update physics
        this.updatePhysics(delta);
    }
}
