/**
 * scene-manager-enhancer.js
 * Enhances the SceneManager to properly communicate with PhysicsManager
 */

// This function should be called after all managers are initialized
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
        
        // Update hierarchy panel if method exists
        if (typeof this.updateHierarchyPanel === 'function') {
            this.updateHierarchyPanel();
        }
    };
    
    console.log('SceneManager enhanced with physics integration');
}

// Export the function
window.enhanceSceneManager = enhanceSceneManager;
