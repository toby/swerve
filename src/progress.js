/**
 * Swerve Progress Tracker
 * Handles progress tracking for chunked uploads and large operations
 */
class SwerveProgress {
  constructor(toast) {
    this.toast = toast;
    this.activeOperations = new Map();
  }
  
  startOperation(operationId, title, options = {}) {
    const toastId = this.toast.show('loading', title, 'Preparing...', {
      duration: 0, // Don't auto-hide
      closable: false,
      ...options
    });
    
    this.activeOperations.set(operationId, {
      toastId,
      startTime: Date.now(),
      title,
      chunks: {
        total: 0,
        completed: 0
      }
    });
    
    return toastId;
  }
  
  updateProgress(operationId, completed, total, message = '') {
    const operation = this.activeOperations.get(operationId);
    if (!operation) return;
    
    operation.chunks.completed = completed;
    operation.chunks.total = total;
    
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
    const progressMessage = message || `${completed}/${total} chunks (${percentage}%)`;
    
    this.toast.update(
      operation.toastId,
      'loading',
      operation.title,
      progressMessage
    );
  }
  
  completeOperation(operationId, success = true, message = '') {
    const operation = this.activeOperations.get(operationId);
    if (!operation) return;
    
    const duration = Date.now() - operation.startTime;
    const durationText = duration > 1000 ? `${Math.round(duration / 1000)}s` : `${duration}ms`;
    
    const finalMessage = message || (success ? 
      `Completed in ${durationText}` : 
      'Operation failed');
    
    this.toast.update(
      operation.toastId,
      success ? 'success' : 'error',
      success ? 'Upload Complete' : 'Upload Failed',
      finalMessage,
      { duration: success ? 3000 : 5000 }
    );
    
    this.activeOperations.delete(operationId);
  }
  
  cancelOperation(operationId, message = 'Operation cancelled') {
    const operation = this.activeOperations.get(operationId);
    if (!operation) return;
    
    this.toast.update(
      operation.toastId,
      'warning',
      'Upload Cancelled',
      message,
      { duration: 3000 }
    );
    
    this.activeOperations.delete(operationId);
  }
  
  hasActiveOperations() {
    return this.activeOperations.size > 0;
  }
  
  getActiveOperations() {
    return Array.from(this.activeOperations.keys());
  }
}

// Export for module environments
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { SwerveProgress };
} else if (typeof window !== 'undefined') {
  window.SwerveProgress = SwerveProgress;
}