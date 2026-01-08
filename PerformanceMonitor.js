// 性能监控器
export class PerformanceMonitor {
    constructor() {
        // 性能数据
        this.metrics = {
            fps: 0,
            frameTimes: [],
            detectionTimes: [],
            renderTimes: [],
            memoryUsage: [],
            startTime: Date.now()
        };
        
        // 监控参数
        this.params = {
            sampleSize: 60,          // 样本数量（1秒@60FPS）
            updateInterval: 1000,    // 更新间隔(ms)
            memoryInterval: 5000     // 内存检查间隔
        };
        
        // 状态
        this.state = {
            lastUpdateTime: 0,
            lastMemoryCheck: 0,
            frameCount: 0,
            lastFrameTime: performance.now()
        };
        
        // 性能警告阈值
        this.thresholds = {
            fpsWarning: 25,
            fpsCritical: 15,
            detectionWarning: 50,    // ms
            detectionCritical: 100,  // ms
            memoryWarning: 300,      // MB
            memoryCritical: 500      // MB
        };
        
        // 警告状态
        this.warnings = {
            fps: { level: 'normal', message: '' },
            detection: { level: 'normal', message: '' },
            memory: { level: 'normal', message: '' }
        };
        
        this.init();
    }
    
    init() {
        console.log('性能监控器已初始化');
    }
    
    // 更新FPS
    updateFPS(deltaTime) {
        this.state.frameCount++;
        
        // 记录帧时间
        this.metrics.frameTimes.push(deltaTime);
        if (this.metrics.frameTimes.length > this.params.sampleSize) {
            this.metrics.frameTimes.shift();
        }
        
        // 计算平均FPS
        const now = performance.now();
        if (now - this.state.lastUpdateTime >= this.params.updateInterval) {
            const averageFrameTime = this.metrics.frameTimes.reduce((a, b) => a + b, 0) / this.metrics.frameTimes.length;
            this.metrics.fps = averageFrameTime > 0 ? Math.round(1000 / averageFrameTime) : 0;
            
            // 检查FPS警告
            this.checkFPSWarning();
            
            this.state.lastUpdateTime = now;
            this.state.frameCount = 0;
        }
        
        this.state.lastFrameTime = now;
        return this.metrics.fps;
    }
    
    // 记录检测时间
    recordDetectionStart() {
        this.currentDetectionStart = performance.now();
    }
    
    recordDetectionEnd() {
        if (this.currentDetectionStart) {
            const detectionTime = performance.now() - this.currentDetectionStart;
            this.metrics.detectionTimes.push(detectionTime);
            
            if (this.metrics.detectionTimes.length > this.params.sampleSize) {
                this.metrics.detectionTimes.shift();
            }
            
            // 检查检测时间警告
            this.checkDetectionWarning();
            
            this.currentDetectionStart = null;
        }
    }
    
    // 记录渲染时间
    recordRenderTime(time) {
        this.metrics.renderTimes.push(time);
        
        if (this.metrics.renderTimes.length > this.params.sampleSize) {
            this.metrics.renderTimes.shift();
        }
    }
    
    // 检查内存使用
    checkMemory() {
        const now = Date.now();
        if (now - this.state.lastMemoryCheck >= this.params.memoryInterval) {
            if (performance.memory) {
                const usedMB = performance.memory.usedJSHeapSize / 1024 / 1024;
                this.metrics.memoryUsage.push(usedMB);
                
                if (this.metrics.memoryUsage.length > this.params.sampleSize / 6) {
                    this.metrics.memoryUsage.shift();
                }
                
                // 检查内存警告
                this.checkMemoryWarning();
            }
            
            this.state.lastMemoryCheck = now;
        }
    }
    
    // 检查FPS警告
    checkFPSWarning() {
        if (this.metrics.fps < this.thresholds.fpsCritical) {
            this.warnings.fps = {
                level: 'critical',
                message: `帧率过低: ${this.metrics.fps}FPS`
            };
        } else if (this.metrics.fps < this.thresholds.fpsWarning) {
            this.warnings.fps = {
                level: 'warning',
                message: `帧率较低: ${this.metrics.fps}FPS`
            };
        } else {
            this.warnings.fps = {
                level: 'normal',
                message: `帧率正常: ${this.metrics.fps}FPS`
            };
        }
    }
    
    // 检查检测时间警告
    checkDetectionWarning() {
        if (this.metrics.detectionTimes.length === 0) return;
        
        const avgDetectionTime = this.metrics.detectionTimes.reduce((a, b) => a + b, 0) / this.metrics.detectionTimes.length;
        
        if (avgDetectionTime > this.thresholds.detectionCritical) {
            this.warnings.detection = {
                level: 'critical',
                message: `检测时间过长: ${avgDetectionTime.toFixed(1)}ms`
            };
        } else if (avgDetectionTime > this.thresholds.detectionWarning) {
            this.warnings.detection = {
                level: 'warning',
                message: `检测时间较长: ${avgDetectionTime.toFixed(1)}ms`
            };
        } else {
            this.warnings.detection = {
                level: 'normal',
                message: `检测时间正常: ${avgDetectionTime.toFixed(1)}ms`
            };
        }
    }
    
    // 检查内存警告
    checkMemoryWarning() {
        if (this.metrics.memoryUsage.length === 0) return;
        
        const avgMemory = this.metrics.memoryUsage.reduce((a, b) => a + b, 0) / this.metrics.memoryUsage.length;
        
        if (avgMemory > this.thresholds.memoryCritical) {
            this.warnings.memory = {
                level: 'critical',
                message: `内存使用过高: ${avgMemory.toFixed(1)}MB`
            };
        } else if (avgMemory > this.thresholds.memoryWarning) {
            this.warnings.memory = {
                level: 'warning',
                message: `内存使用较高: ${avgMemory.toFixed(1)}MB`
            };
        } else {
            this.warnings.memory = {
                level: 'normal',
                message: `内存使用正常: ${avgMemory.toFixed(1)}MB`
            };
        }
    }
    
    // 获取性能数据
    getMetrics() {
        const avgDetectionTime = this.metrics.detectionTimes.length > 0 ? 
            this.metrics.detectionTimes.reduce((a, b) => a + b, 0) / this.metrics.detectionTimes.length : 0;
        
        const avgRenderTime = this.metrics.renderTimes.length > 0 ? 
            this.metrics.renderTimes.reduce((a, b) => a + b, 0) / this.metrics.renderTimes.length : 0;
        
        const avgMemory = this.metrics.memoryUsage.length > 0 ? 
            this.metrics.memoryUsage.reduce((a, b) => a + b, 0) / this.metrics.memoryUsage.length : 0;
        
        return {
            fps: this.metrics.fps,
            detectionTime: avgDetectionTime,
            renderTime: avgRenderTime,
            memory: avgMemory,
            sessionDuration: Math.floor((Date.now() - this.metrics.startTime) / 1000)
        };
    }
    
    // 获取警告信息
    getWarnings() {
        const warnings = [];
        
        Object.values(this.warnings).forEach(warning => {
            if (warning.level !== 'normal') {
                warnings.push({
                    level: warning.level,
                    message: warning.message
                });
            }
        });
        
        return warnings;
    }
    
    // 获取整体状态
    getStatus() {
        const metrics = this.getMetrics();
        const warnings = this.getWarnings();
        
        let overallLevel = 'good';
        if (warnings.some(w => w.level === 'critical')) {
            overallLevel = 'critical';
        } else if (warnings.some(w => w.level === 'warning')) {
            overallLevel = 'warning';
        }
        
        return {
            level: overallLevel,
            metrics,
            warnings
        };
    }
    
    // 获取会话时长
    getSessionDuration() {
        return Math.floor((Date.now() - this.metrics.startTime) / 1000);
    }
    
    // 重置监控器
    reset() {
        this.metrics = {
            fps: 0,
            frameTimes: [],
            detectionTimes: [],
            renderTimes: [],
            memoryUsage: [],
            startTime: Date.now()
        };
        
        this.state = {
            lastUpdateTime: 0,
            lastMemoryCheck: 0,
            frameCount: 0,
            lastFrameTime: performance.now()
        };
        
        this.warnings = {
            fps: { level: 'normal', message: '' },
            detection: { level: 'normal', message: '' },
            memory: { level: 'normal', message: '' }
        };
    }
}