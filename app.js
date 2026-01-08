// 主应用入口
import { DualPoseTracker } from './core/DualPoseTracker.js';
import { ExerciseDetector } from './core/ExerciseDetector.js';
import { PerformanceMonitor } from './core/PerformanceMonitor.js';
import { CanvasRenderer } from './rendering/CanvasRenderer.js';
import { AvatarSystem } from './rendering/AvatarSystem.js';
import { UIRenderer } from './rendering/UIRenderer.js';
import { StudentManager } from './components/StudentManager.js';
import { ScoreManager } from './components/ScoreManager.js';
import { ExerciseManager } from './components/ExerciseManager.js';
import { AudioManager } from './utils/AudioManager.js';
import { DataExporter } from './utils/DataExporter.js';

class DualPEAssistant {
    constructor() {
        // 系统状态
        this.state = {
            isInitialized: false,
            isRunning: false,
            isTraining: false,
            exerciseType: 'high_knees',
            qualityMode: 'auto'
        };
        
        // 学生数据
        this.students = {
            left: { id: 1, name: '学生A', count: 0, character: 'wukong', color: '#FF6B6B' },
            right: { id: 2, name: '学生B', count: 0, character: 'feihong', color: '#4ECDC4' }
        };
        
        // 检测数据
        this.detectionData = {
            left: { landmarks: null, metrics: {}, poseState: 'idle' },
            right: { landmarks: null, metrics: {}, poseState: 'idle' }
        };
        
        // 性能数据
        this.performance = {
            fps: 0,
            detectionTime: 0,
            renderTime: 0,
            memory: 0
        };
        
        // 组件实例
        this.components = {};
        
        // DOM元素
        this.domElements = {};
        
        this.init();
    }
    
    async init() {
        console.log('正在初始化双人AI体育课助教系统...');
        
        // 获取DOM元素
        this.domElements = {
            video: document.getElementById('videoElement'),
            canvas: document.getElementById('mainCanvas'),
            app: document.getElementById('app'),
            debugPanel: document.getElementById('debugPanel'),
            debugStatus: document.getElementById('debugStatus'),
            debugFPS: document.getElementById('debugFPS'),
            debugDetectionTime: document.getElementById('debugDetectionTime'),
            debugRenderTime: document.getElementById('debugRenderTime'),
            debugMemory: document.getElementById('debugMemory')
        };
        
        // 初始化组件
        await this.initComponents();
        
        // 设置Canvas尺寸
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());
        
        // 初始化MediaPipe
        await this.initMediaPipe();
        
        // 启动主循环
        this.startMainLoop();
        
        // 显示系统已就绪
        this.state.isInitialized = true;
        console.log('系统初始化完成！');
        
        // 更新调试面板
        this.updateDebugPanel();
        
        // 通知UI渲染器创建界面
        if (this.components.uiRenderer) {
            this.components.uiRenderer.createUI();
        }
    }
    
    async initComponents() {
        try {
            // 初始化核心组件
            this.components.performanceMonitor = new PerformanceMonitor();
            this.components.dualPoseTracker = new DualPoseTracker();
            this.components.exerciseDetector = new ExerciseDetector();
            
            // 初始化渲染组件
            this.components.canvasRenderer = new CanvasRenderer(this.domElements.canvas);
            this.components.avatarSystem = new AvatarSystem();
            this.components.uiRenderer = new UIRenderer(this.domElements.app, {
                students: this.students,
                state: this.state,
                onStartTraining: () => this.startTraining(),
                onStopTraining: () => this.stopTraining(),
                onResetCounts: () => this.resetCounts(),
                onChangeExercise: (type) => this.changeExercise(type),
                onChangeCharacter: (side, character) => this.changeCharacter(side, character),
                onChangeStudentName: (side, name) => this.changeStudentName(side, name),
                onExportData: () => this.exportData(),
                onToggleDebug: () => this.toggleDebugPanel()
            });
            
            // 初始化管理组件
            this.components.studentManager = new StudentManager();
            this.components.scoreManager = new ScoreManager();
            this.components.exerciseManager = new ExerciseManager();
            
            // 初始化工具组件
            this.components.audioManager = new AudioManager();
            this.components.dataExporter = new DataExporter();
            
            console.log('所有组件初始化完成');
        } catch (error) {
            console.error('组件初始化失败:', error);
            throw error;
        }
    }
    
    async initMediaPipe() {
        console.log('正在初始化MediaPipe...');
        
        return new Promise((resolve, reject) => {
            try {
                this.pose = new window.Pose({
                    locateFile: (file) => {
                        return `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`;
                    }
                });
                
                // 配置双人模式
                this.pose.setOptions({
                    modelComplexity: 1,
                    smoothLandmarks: true,
                    minDetectionConfidence: 0.5,
                    minTrackingConfidence: 0.5,
                    enableSegmentation: false,
                    smoothSegmentation: true,
                    numPoses: 2  // 关键：设置为2人
                });
                
                // 设置回调
                this.pose.onResults((results) => {
                    this.handlePoseResults(results);
                });
                
                // 初始化摄像头
                this.camera = new window.Camera(this.domElements.video, {
                    onFrame: async () => {
                        if (this.state.isRunning && this.pose) {
                            try {
                                await this.pose.send({ image: this.domElements.video });
                            } catch (error) {
                                console.warn('姿态检测出错:', error);
                            }
                        }
                    },
                    width: 640,
                    height: 480
                });
                
                // 启动摄像头
                this.camera.start().then(() => {
                    console.log('摄像头启动成功');
                    this.state.isRunning = true;
                    resolve();
                }).catch(reject);
                
            } catch (error) {
                console.error('MediaPipe初始化失败:', error);
                reject(error);
            }
        });
    }
    
    handlePoseResults(results) {
        const startTime = performance.now();
        
        // 记录检测开始时间
        if (this.components.performanceMonitor) {
            this.components.performanceMonitor.recordDetectionStart();
        }
        
        if (results.poseLandmarks && results.poseLandmarks.length >= 1) {
            // 使用双人追踪器处理
            const trackedPersons = this.components.dualPoseTracker.trackPersons(results.poseLandmarks);
            
            // 更新检测数据
            if (trackedPersons.left && trackedPersons.left.landmarks) {
                this.detectionData.left.landmarks = trackedPersons.left.landmarks;
                
                // 计算身体比例
                this.detectionData.left.metrics = this.calculateBodyMetrics(trackedPersons.left.landmarks);
                
                // 如果是训练模式，进行动作识别
                if (this.state.isTraining) {
                    const detectionResult = this.components.exerciseDetector.detectExercise(
                        trackedPersons.left.landmarks,
                        this.detectionData.left.metrics,
                        this.state.exerciseType,
                        this.detectionData.left.poseState
                    );
                    
                    if (detectionResult.detected) {
                        // 更新状态
                        this.detectionData.left.poseState = detectionResult.newState;
                        
                        // 增加计数
                        this.students.left.count++;
                        
                        // 播放声音反馈
                        this.components.audioManager.playCountSound();
                        
                        // 显示视觉反馈
                        this.showFeedback('left', detectionResult.feedback);
                    }
                }
            }
            
            if (trackedPersons.right && trackedPersons.right.landmarks) {
                this.detectionData.right.landmarks = trackedPersons.right.landmarks;
                this.detectionData.right.metrics = this.calculateBodyMetrics(trackedPersons.right.landmarks);
                
                if (this.state.isTraining) {
                    const detectionResult = this.components.exerciseDetector.detectExercise(
                        trackedPersons.right.landmarks,
                        this.detectionData.right.metrics,
                        this.state.exerciseType,
                        this.detectionData.right.poseState
                    );
                    
                    if (detectionResult.detected) {
                        this.detectionData.right.poseState = detectionResult.newState;
                        this.students.right.count++;
                        this.components.audioManager.playCountSound();
                        this.showFeedback('right', detectionResult.feedback);
                    }
                }
            }
            
            // 更新UI
            if (this.components.uiRenderer) {
                this.components.uiRenderer.updateScores(
                    this.students.left.count,
                    this.students.right.count
                );
            }
        }
        
        // 记录检测时间
        const detectionTime = performance.now() - startTime;
        this.performance.detectionTime = detectionTime;
        
        if (this.components.performanceMonitor) {
            this.components.performanceMonitor.recordDetectionEnd();
        }
    }
    
    calculateBodyMetrics(landmarks) {
        if (!landmarks || landmarks.length < 29) {
            return { legLength: 0.2, torsoLength: 0.15, overallHeight: 0.6 };
        }
        
        // 计算腿长（髋到踝）
        const leftLeg = Math.sqrt(
            Math.pow(landmarks[23].x - landmarks[27].x, 2) +
            Math.pow(landmarks[23].y - landmarks[27].y, 2)
        );
        
        const rightLeg = Math.sqrt(
            Math.pow(landmarks[24].x - landmarks[28].x, 2) +
            Math.pow(landmarks[24].y - landmarks[28].y, 2)
        );
        
        const legLength = (leftLeg + rightLeg) / 2;
        
        // 计算躯干长度（肩到髋）
        const shoulderCenter = {
            x: (landmarks[11].x + landmarks[12].x) / 2,
            y: (landmarks[11].y + landmarks[12].y) / 2
        };
        
        const hipCenter = {
            x: (landmarks[23].x + landmarks[24].x) / 2,
            y: (landmarks[23].y + landmarks[24].y) / 2
        };
        
        const torsoLength = Math.sqrt(
            Math.pow(shoulderCenter.x - hipCenter.x, 2) +
            Math.pow(shoulderCenter.y - hipCenter.y, 2)
        );
        
        // 计算整体高度（鼻到脚）
        const nose = landmarks[0];
        const leftAnkle = landmarks[27];
        const rightAnkle = landmarks[28];
        const lowestAnkle = Math.max(leftAnkle.y, rightAnkle.y);
        
        const overallHeight = Math.abs(nose.y - lowestAnkle);
        
        return {
            legLength,
            torsoLength,
            overallHeight,
            lastUpdate: Date.now()
        };
    }
    
    startMainLoop() {
        let lastTime = 0;
        const fpsUpdateInterval = 500; // 每500ms更新一次FPS
        
        const render = (currentTime) => {
            // 计算帧时间
            const deltaTime = currentTime - lastTime;
            lastTime = currentTime;
            
            // 更新FPS
            if (this.components.performanceMonitor) {
                this.performance.fps = this.components.performanceMonitor.updateFPS(deltaTime);
            }
            
            // 更新性能数据
            this.updatePerformanceData();
            
            // 渲染场景
            this.renderScene();
            
            // 递归调用
            requestAnimationFrame(render);
        };
        
        requestAnimationFrame(render);
    }
    
    renderScene() {
        const startTime = performance.now();
        
        // 清除画布
        this.components.canvasRenderer.clear();
        
        // 渲染背景
        this.components.canvasRenderer.renderBackground();
        
        // 渲染骨架
        if (this.detectionData.left.landmarks) {
            this.components.canvasRenderer.renderSkeleton(
                this.detectionData.left.landmarks,
                this.students.left.color,
                'left'
            );
        }
        
        if (this.detectionData.right.landmarks) {
            this.components.canvasRenderer.renderSkeleton(
                this.detectionData.right.landmarks,
                this.students.right.color,
                'right'
            );
        }
        
        // 渲染角色
        if (this.detectionData.left.landmarks) {
            this.components.avatarSystem.renderAvatar(
                this.components.canvasRenderer.ctx,
                this.detectionData.left.landmarks,
                this.students.left.character,
                'left'
            );
        }
        
        if (this.detectionData.right.landmarks) {
            this.components.avatarSystem.renderAvatar(
                this.components.canvasRenderer.ctx,
                this.detectionData.right.landmarks,
                this.students.right.character,
                'right'
            );
        }
        
        // 渲染UI
        if (this.components.uiRenderer) {
            this.components.uiRenderer.render();
        }
        
        // 记录渲染时间
        this.performance.renderTime = performance.now() - startTime;
    }
    
    updatePerformanceData() {
        // 更新内存使用
        if (performance.memory) {
            this.performance.memory = Math.round(performance.memory.usedJSHeapSize / 1024 / 1024);
        }
        
        // 更新调试面板
        this.updateDebugPanel();
        
        // 自动调整质量
        this.autoAdjustQuality();
    }
    
    updateDebugPanel() {
        if (!this.domElements.debugPanel || this.domElements.debugPanel.classList.contains('hidden')) {
            return;
        }
        
        this.domElements.debugStatus.textContent = this.state.isTraining ? '训练中' : '待机中';
        this.domElements.debugFPS.textContent = Math.round(this.performance.fps);
        this.domElements.debugDetectionTime.textContent = this.performance.detectionTime.toFixed(1) + 'ms';
        this.domElements.debugRenderTime.textContent = this.performance.renderTime.toFixed(1) + 'ms';
        this.domElements.debugMemory.textContent = this.performance.memory + 'MB';
    }
    
    autoAdjustQuality() {
        if (this.state.qualityMode !== 'auto') return;
        
        // 根据性能自动调整质量
        if (this.performance.fps < 20) {
            // 帧率过低，降低质量
            this.setQuality('low');
        } else if (this.performance.fps < 30) {
            this.setQuality('medium');
        } else {
            this.setQuality('high');
        }
    }
    
    setQuality(level) {
        if (this.currentQuality === level) return;
        
        this.currentQuality = level;
        
        switch (level) {
            case 'low':
                if (this.pose) {
                    this.pose.setOptions({ modelComplexity: 0 });
                }
                this.components.canvasRenderer.setRenderQuality('low');
                break;
                
            case 'medium':
                if (this.pose) {
                    this.pose.setOptions({ modelComplexity: 1 });
                }
                this.components.canvasRenderer.setRenderQuality('medium');
                break;
                
            case 'high':
                if (this.pose) {
                    this.pose.setOptions({ modelComplexity: 1 });
                }
                this.components.canvasRenderer.setRenderQuality('high');
                break;
        }
        
        console.log(`质量模式已切换到: ${level}`);
    }
    
    resizeCanvas() {
        const canvas = this.domElements.canvas;
        const container = this.domElements.app;
        
        canvas.width = container.clientWidth;
        canvas.height = container.clientHeight;
        
        if (this.components.canvasRenderer) {
            this.components.canvasRenderer.setSize(canvas.width, canvas.height);
        }
    }
    
    startTraining() {
        this.state.isTraining = true;
        console.log('开始训练');
        
        // 重置计数状态
        this.detectionData.left.poseState = 'idle';
        this.detectionData.right.poseState = 'idle';
        
        // 播放开始音效
        this.components.audioManager.playStartSound();
        
        // 更新UI
        if (this.components.uiRenderer) {
            this.components.uiRenderer.updateTrainingState(true);
        }
    }
    
    stopTraining() {
        this.state.isTraining = false;
        console.log('停止训练');
        
        // 播放停止音效
        this.components.audioManager.playStopSound();
        
        // 更新UI
        if (this.components.uiRenderer) {
            this.components.uiRenderer.updateTrainingState(false);
        }
    }
    
    resetCounts() {
        this.students.left.count = 0;
        this.students.right.count = 0;
        console.log('计数已重置');
        
        // 播放重置音效
        this.components.audioManager.playResetSound();
        
        // 更新UI
        if (this.components.uiRenderer) {
            this.components.uiRenderer.updateScores(0, 0);
        }
    }
    
    changeExercise(type) {
        this.state.exerciseType = type;
        console.log(`切换到动作: ${type}`);
        
        // 重置检测状态
        this.detectionData.left.poseState = 'idle';
        this.detectionData.right.poseState = 'idle';
        
        // 更新UI
        if (this.components.uiRenderer) {
            this.components.uiRenderer.updateExerciseType(type);
        }
    }
    
    changeCharacter(side, character) {
        if (this.students[side]) {
            this.students[side].character = character;
            console.log(`${side}学生角色已切换为: ${character}`);
        }
    }
    
    changeStudentName(side, name) {
        if (this.students[side] && name.trim()) {
            this.students[side].name = name.trim();
            console.log(`${side}学生姓名已更新为: ${name}`);
            
            // 更新UI
            if (this.components.uiRenderer) {
                this.components.uiRenderer.updateStudentNames();
            }
        }
    }
    
    showFeedback(side, message) {
        if (this.components.uiRenderer) {
            this.components.uiRenderer.showFeedback(side, message);
        }
    }
    
    exportData() {
        const data = {
            timestamp: new Date().toISOString(),
            exerciseType: this.state.exerciseType,
            students: {
                left: { ...this.students.left },
                right: { ...this.students.right }
            },
            sessionDuration: this.components.performanceMonitor ? 
                this.components.performanceMonitor.getSessionDuration() : 0
        };
        
        this.components.dataExporter.exportAsCSV(data);
    }
    
    toggleDebugPanel() {
        const panel = this.domElements.debugPanel;
        if (panel) {
            panel.classList.toggle('hidden');
        }
    }
    
    // 获取系统状态（供外部使用）
    getSystemStatus() {
        return {
            state: { ...this.state },
            students: { ...this.students },
            performance: { ...this.performance },
            detection: {
                left: this.detectionData.left.landmarks ? '检测中' : '未检测',
                right: this.detectionData.right.landmarks ? '检测中' : '未检测'
            }
        };
    }
}

// 全局访问
window.DualPEAssistant = DualPEAssistant;

// 初始化应用
window.initApp = function() {
    window.app = new DualPEAssistant();
};

export { DualPEAssistant };