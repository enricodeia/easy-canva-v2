// Command Manager
// Implements undo/redo functionality using the Command Pattern
class CommandManager {
    constructor(maxHistorySize = 50) {
        // Command stacks
        this.undoStack = [];
        this.redoStack = [];
        this.maxHistorySize = maxHistorySize;
        
        // Event listeners for keyboard shortcuts
        this.setupKeyboardShortcuts();
        
        // UI elements
        this.updateUI();
    }
    
    // Execute a command and add it to the undo stack
    execute(command) {
        // Execute the command
        command.execute();
        
        // Add to undo stack
        this.undoStack.push(command);
        
        // Clear redo stack since we've taken a new action
        this.redoStack = [];
        
        // Limit stack size
        if (this.undoStack.length > this.maxHistorySize) {
            this.undoStack.shift();
        }
        
        // Update UI
        this.updateUI();
    }
    
    // Undo the last command
    undo() {
        if (this.undoStack.length === 0) return;
        
        // Get the last command
        const command = this.undoStack.pop();
        
        // Undo it
        command.undo();
        
        // Add to redo stack
        this.redoStack.push(command);
        
        // Update UI
        this.updateUI();
    }
    
    // Redo the last undone command
    redo() {
        if (this.redoStack.length === 0) return;
        
        // Get the last undone command
        const command = this.redoStack.pop();
        
        // Execute it again
        command.execute();
        
        // Add back to undo stack
        this.undoStack.push(command);
        
        // Update UI
        this.updateUI();
    }
    
    // Clear both stacks
    clear() {
        this.undoStack = [];
        this.redoStack = [];
        
        // Update UI
        this.updateUI();
    }
    
    // Set up keyboard shortcuts
    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (event) => {
            // Ctrl+Z for Undo
            if (event.ctrlKey && event.key === 'z' && !event.shiftKey) {
                event.preventDefault();
                this.undo();
            }
            
            // Ctrl+Shift+Z or Ctrl+Y for Redo
            if ((event.ctrlKey && event.shiftKey && event.key === 'z') || 
                (event.ctrlKey && event.key === 'y')) {
                event.preventDefault();
                this.redo();
            }
        });
    }
    
    // Update UI elements
    updateUI() {
        // Update undo button state
        const undoBtn = document.getElementById('undoBtn');
        if (undoBtn) {
            undoBtn.disabled = this.undoStack.length === 0;
            
            // Update tooltip to show the action that will be undone
            if (this.undoStack.length > 0) {
                const lastCommand = this.undoStack[this.undoStack.length - 1];
                undoBtn.title = `Undo: ${lastCommand.getName()}`;
            } else {
                undoBtn.title = 'Undo (Ctrl+Z)';
            }
        }
        
        // Update redo button state
        const redoBtn = document.getElementById('redoBtn');
        if (redoBtn) {
            redoBtn.disabled = this.redoStack.length === 0;
            
            // Update tooltip to show the action that will be redone
            if (this.redoStack.length > 0) {
                const lastCommand = this.redoStack[this.redoStack.length - 1];
                redoBtn.title = `Redo: ${lastCommand.getName()}`;
            } else {
                redoBtn.title = 'Redo (Ctrl+Y)';
            }
        }
        
        // Update history panel if exists
        this.updateHistoryPanel();
    }
    
    // Update the history panel with command list
    updateHistoryPanel() {
        const historyPanel = document.getElementById('historyPanel');
        if (!historyPanel) return;
        
        // Clear existing list
        historyPanel.innerHTML = '';
        
        // Add commands to list
        this.undoStack.forEach((command, index) => {
            const item = document.createElement('div');
            item.className = 'history-item';
            item.textContent = command.getName();
            
            // Highlight the last command
            if (index === this.undoStack.length - 1) {
                item.classList.add('current');
            }
            
            // Add click handler to undo up to this point
            item.addEventListener('click', () => {
                const count = this.undoStack.length - index - 1;
                for (let i = 0; i < count; i++) {
                    this.undo();
                }
            });
            
            historyPanel.appendChild(item);
        });
        
        // Add undone commands (from redo stack) in disabled state
        this.redoStack.slice().reverse().forEach(command => {
            const item = document.createElement('div');
            item.className = 'history-item disabled';
            item.textContent = command.getName();
            historyPanel.appendChild(item);
        });
        
        // If both stacks are empty, show a message
        if (this.undoStack.length === 0 && this.redoStack.length === 0) {
            const item = document.createElement('div');
            item.className = 'history-empty';
            item.textContent = 'No history yet';
            historyPanel.appendChild(item);
        }
    }
}

// Base Command interface
class Command {
    constructor(name) {
        this.name = name || 'Unknown Action';
    }
    
    execute() {
        console.warn('execute() method must be implemented by subclasses');
    }
    
    undo() {
        console.warn('undo() method must be implemented by subclasses');
    }
    
    getName() {
        return this.name;
    }
}

// AddObjectCommand - Handles creating and deleting objects
class AddObjectCommand extends Command {
    constructor(scene, object, parent, name) {
        super(name || 'Add Object');
        this.scene = scene;
        this.object = object;
        this.parent = parent || scene;
    }
    
    execute() {
        this.parent.add(this.object);
    }
    
    undo() {
        this.parent.remove(this.object);
    }
}

// RemoveObjectCommand - Handles object removal
class RemoveObjectCommand extends Command {
    constructor(scene, object, name) {
        super(name || 'Remove Object');
        this.scene = scene;
        this.object = object;
        this.parent = object.parent;
        this.index = this.parent ? this.parent.children.indexOf(object) : -1;
    }
    
    execute() {
        this.parent.remove(this.object);
    }
    
    undo() {
        if (this.parent) {
            if (this.index === -1) {
                this.parent.add(this.object);
            } else {
                this.parent.children.splice(this.index, 0, this.object);
                this.object.parent = this.parent;
            }
        }
    }
}

// SetPositionCommand - Handles position changes
class SetPositionCommand extends Command {
    constructor(object, newPosition, oldPosition, name) {
        super(name || 'Set Position');
        this.object = object;
        this.oldPosition = oldPosition || object.position.clone();
        this.newPosition = newPosition;
    }
    
    execute() {
        this.object.position.copy(this.newPosition);
    }
    
    undo() {
        this.object.position.copy(this.oldPosition);
    }
}

// SetRotationCommand - Handles rotation changes
class SetRotationCommand extends Command {
    constructor(object, newRotation, oldRotation, name) {
        super(name || 'Set Rotation');
        this.object = object;
        this.oldRotation = oldRotation || object.rotation.clone();
        this.newRotation = newRotation;
    }
    
    execute() {
        this.object.rotation.copy(this.newRotation);
    }
    
    undo() {
        this.object.rotation.copy(this.oldRotation);
    }
}

// SetScaleCommand - Handles scale changes
class SetScaleCommand extends Command {
    constructor(object, newScale, oldScale, name) {
        super(name || 'Set Scale');
        this.object = object;
        this.oldScale = oldScale || object.scale.clone();
        this.newScale = newScale;
    }
    
    execute() {
        this.object.scale.copy(this.newScale);
    }
    
    undo() {
        this.object.scale.copy(this.oldScale);
    }
}

// SetMaterialCommand - Handles material changes
class SetMaterialCommand extends Command {
    constructor(object, newMaterial, oldMaterial, name) {
        super(name || 'Change Material');
        this.object = object;
        this.oldMaterial = oldMaterial || object.material.clone();
        this.newMaterial = newMaterial;
    }
    
    execute() {
        this.object.material = this.newMaterial;
    }
    
    undo() {
        this.object.material = this.oldMaterial;
    }
}

// SetMaterialValueCommand - Handles material property changes
class SetMaterialValueCommand extends Command {
    constructor(object, property, newValue, oldValue, name) {
        super(name || 'Change Material Property');
        this.object = object;
        this.material = object.material;
        this.property = property;
        this.oldValue = oldValue !== undefined ? oldValue : this.material[property];
        this.newValue = newValue;
    }
    
    execute() {
        this.material[this.property] = this.newValue;
        this.material.needsUpdate = true;
    }
    
    undo() {
        this.material[this.property] = this.oldValue;
        this.material.needsUpdate = true;
    }
}

// AddKeyframeCommand - Handles adding keyframes to the animation
class AddKeyframeCommand extends Command {
    constructor(animationManager, keyframe, name) {
        super(name || 'Add Keyframe');
        this.animationManager = animationManager;
        this.keyframe = keyframe;
    }
    
    execute() {
        this.animationManager.keyframes.push(this.keyframe);
        this.animationManager.keyframes.sort((a, b) => a.time - b.time);
        this.animationManager.updateAnimation();
        this.animationManager.updateKeyframesUI();
        this.animationManager.updateCameraPath();
    }
    
    undo() {
        const index = this.animationManager.keyframes.findIndex(k => k.id === this.keyframe.id);
        if (index !== -1) {
            this.animationManager.keyframes.splice(index, 1);
            this.animationManager.updateAnimation();
            this.animationManager.updateKeyframesUI();
            this.animationManager.updateCameraPath();
        }
    }
}

// RemoveKeyframeCommand - Handles removing keyframes
class RemoveKeyframeCommand extends Command {
    constructor(animationManager, keyframe, name) {
        super(name || 'Remove Keyframe');
        this.animationManager = animationManager;
        this.keyframe = keyframe;
        this.index = animationManager.keyframes.findIndex(k => k.id === keyframe.id);
    }
    
    execute() {
        const index = this.animationManager.keyframes.findIndex(k => k.id === this.keyframe.id);
        if (index !== -1) {
            this.animationManager.keyframes.splice(index, 1);
            this.animationManager.updateAnimation();
            this.animationManager.updateKeyframesUI();
            this.animationManager.updateCameraPath();
        }
    }
    
    undo() {
        if (this.index !== -1) {
            this.animationManager.keyframes.splice(this.index, 0, this.keyframe);
            this.animationManager.keyframes.sort((a, b) => a.time - b.time);
            this.animationManager.updateAnimation();
            this.animationManager.updateKeyframesUI();
            this.animationManager.updateCameraPath();
        }
    }
}

// AddPhysicsCommand - Handles adding physics to objects
class AddPhysicsCommand extends Command {
    constructor(physicsManager, object, type, collisionShape, options, name) {
        super(name || 'Add Physics');
        this.physicsManager = physicsManager;
        this.object = object;
        this.type = type;
        this.collisionShape = collisionShape;
        this.options = options;
    }
    
    execute() {
        // Remove existing physics first if any
        if (this.physicsManager.physicsBodies.has(this.object.uuid)) {
            this.physicsManager.removePhysicsFromObject(this.object);
        }
        
        // Add physics
        this.physicsManager.addPhysicsToObject(
            this.object,
            this.type,
            this.collisionShape,
            this.options
        );
    }
    
    undo() {
        this.physicsManager.removePhysicsFromObject(this.object);
    }
}

// RemovePhysicsCommand - Handles removing physics from objects
class RemovePhysicsCommand extends Command {
    constructor(physicsManager, object, originalBody, name) {
        super(name || 'Remove Physics');
        this.physicsManager = physicsManager;
        this.object = object;
        
        // Store original body properties for undo
        if (physicsManager.physicsBodies.has(object.uuid)) {
            const body = physicsManager.physicsBodies.get(object.uuid);
            
            this.originalType = body.mass === 0 ? 'static' :
                                body.type === CANNON.Body.KINEMATIC ? 'kinematic' : 'dynamic';
            
            this.originalShape = body.shapes[0];
            
            this.originalOptions = {
                mass: body.mass,
                friction: body.material ? body.material.friction : 0.3,
                restitution: body.material ? body.material.restitution : 0.3
            };
        } else {
            // No physics to remove
            this.originalType = null;
            this.originalShape = null;
            this.originalOptions = null;
        }
    }
    
    execute() {
        if (this.physicsManager.physicsBodies.has(this.object.uuid)) {
            this.physicsManager.removePhysicsFromObject(this.object);
        }
    }
    
    undo() {
        if (this.originalType && this.originalShape) {
            this.physicsManager.addPhysicsToObject(
                this.object,
                this.originalType,
                this.originalShape,
                this.originalOptions
            );
        }
    }
}

// MultiCommand - Combines multiple commands into one for complex operations
class MultiCommand extends Command {
    constructor(commands, name) {
        super(name || 'Multiple Actions');
        this.commands = commands || [];
    }
    
    add(command) {
        this.commands.push(command);
    }
    
    execute() {
        for (const command of this.commands) {
            command.execute();
        }
    }
    
    undo() {
        for (let i = this.commands.length - 1; i >= 0; i--) {
            this.commands[i].undo();
        }
    }
}
