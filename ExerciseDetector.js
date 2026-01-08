// 动作识别器 - 支持高抬腿和侧滑步
export class ExerciseDetector {
    constructor() {
        // 动作配置
        this.config = {
            high_knees: {
                upRatio: 0.15,      // 抬腿比例阈值
                downRatio: 0.05,    // 下落比例阈值
                minInterval: 150,   // 最小计数间隔(ms)
                speedCompensation: 0.1, // 速度补偿
                side: {
                    left: { up: false, lastCountTime: 0 },
                    right: { up: false, lastCountTime: 0 }
                }
            },
            side_slide: {
                leftThreshold: 0.35,    // 左侧阈值
                rightThreshold: 0.65,   // 右侧阈值
                centerMin: 0.45,        // 中心区域最小
                centerMax: 0.55,        // 中心区域最大
                state: 'center',        // 当前状态
                lastMoveTime: 0,
                minInterval: 300        // 最小移动间隔
            }
        };
        
        // 状态缓存
        this.stateCache = new Map();
    }
    
    // 检测动作
    detectExercise(landmarks, metrics, exerciseType, currentState) {
        if (!landmarks || landmarks.length < 29) {
            return { detected: false, newState: currentState, feedback: '' };
        }
        
        switch (exerciseType) {
            case 'high_knees':
                return this.detectHighKnees(landmarks, metrics, currentState);
                
            case 'side_slide':
                return this.detectSideSlide(landmarks, currentState);
                
            default:
                return { detected: false, newState: currentState, feedback: '' };
        }
    }
    
    // 检测高抬腿
    detectHighKnees(landmarks, metrics, currentState) {
        const config = this.config.high_knees;
        const now = Date.now();
        
        // 计算腿部比例
        const leftHip = landmarks[23];
        const rightHip = landmarks[24];
        const leftKnee = landmarks[25];
        const rightKnee = landmarks[26];
        const leftAnkle = landmarks[27];
        const rightAnkle = landmarks[28];
        
        if (!leftHip || !rightHip || !leftKnee || !rightKnee) {
            return { detected: false, newState: currentState, feedback: '' };
        }
        
        // 计算腿长（髋到踝距离）
        const leftLegLength = Math.sqrt(
            Math.pow(leftHip.x - leftAnkle.x, 2) + 
            Math.pow(leftHip.y - leftAnkle.y, 2)
        );
        
        const rightLegLength = Math.sqrt(
            Math.pow(rightHip.x - rightAnkle.x, 2) + 
            Math.pow(rightHip.y - rightAnkle.y, 2)
        );
        
        // 计算抬腿比例
        const leftLiftRatio = (leftHip.y - leftKnee.y) / leftLegLength;
        const rightLiftRatio = (rightHip.y - rightKnee.y) / rightLegLength;
        
        // 动态调整阈值（考虑速度）
        const timeSinceLastCount = Math.min(
            now - config.side.left.lastCountTime,
            now - config.side.right.lastCountTime
        );
        
        const speedFactor = Math.max(0.7, 1 - (timeSinceLastCount / 1000) * config.speedCompensation);
        const dynamicUpRatio = config.upRatio * speedFactor;
        
        let detected = false;
        let newState = currentState;
        let feedback = '';
        
        // 检测左腿抬腿
        if (!config.side.left.up && leftLiftRatio > dynamicUpRatio) {
            if (now - config.side.left.lastCountTime > config.minInterval) {
                config.side.left.up = true;
                config.side.left.lastCountTime = now;
                detected = true;
                newState = 'up_left';
                feedback = this.getRandomFeedback('high_knees');
            }
        } else if (config.side.left.up && leftLiftRatio < config.downRatio) {
            config.side.left.up = false;
        }
        
        // 检测右腿抬腿
        if (!config.side.right.up && rightLiftRatio > dynamicUpRatio) {
            if (now - config.side.right.lastCountTime > config.minInterval) {
                config.side.right.up = true;
                config.side.right.lastCountTime = now;
                detected = true;
                newState = 'up_right';
                feedback = this.getRandomFeedback('high_knees');
            }
        } else if (config.side.right.up && rightLiftRatio < config.downRatio) {
            config.side.right.up = false;
        }
        
        // 如果双腿都放下，更新状态
        if (!config.side.left.up && !config.side.right.up && newState.includes('up')) {
            newState = 'down';
        }
        
        return { detected, newState, feedback };
    }
    
    // 检测侧滑步
    detectSideSlide(landmarks, currentState) {
        const config = this.config.side_slide;
        const now = Date.now();
        
        // 计算髋部中心水平位置
        const leftHip = landmarks[23];
        const rightHip = landmarks[24];
        
        if (!leftHip || !rightHip) {
            return { detected: false, newState: currentState, feedback: '' };
        }
        
        const hipCenterX = (leftHip.x + rightHip.x) / 2;
        
        let detected = false;
        let newState = config.state;
        let feedback = '';
        
        // 状态机
        if (config.state === 'center' || config.state === 'idle') {
            // 从中间移动到左侧或右侧
            if (hipCenterX < config.leftThreshold && now - config.lastMoveTime > config.minInterval) {
                config.state = 'left';
                config.lastMoveTime = now;
                detected = true;
                newState = 'left';
                feedback = this.getRandomFeedback('side_slide');
            } else if (hipCenterX > config.rightThreshold && now - config.lastMoveTime > config.minInterval) {
                config.state = 'right';
                config.lastMoveTime = now;
                detected = true;
                newState = 'right';
                feedback = this.getRandomFeedback('side_slide');
            }
        } else if (config.state === 'left' || config.state === 'right') {
            // 回到中间区域
            if (hipCenterX > config.centerMin && hipCenterX < config.centerMax) {
                config.state = 'center';
                newState = 'center';
            }
        }
        
        return { detected, newState, feedback };
    }
    
    // 获取随机反馈
    getRandomFeedback(exerciseType) {
        const feedbacks = {
            high_knees: [
                '标准!', '优秀!', '完美!', '加油!', 'Nice!', 
                '快速!', '厉害!', '准确!', '漂亮!', '继续!'
            ],
            side_slide: [
                '侧移!', '滑步!', '流畅!', '标准!', 'Good!', 
                '敏捷!', '迅速!', '准确!', '稳定!', '继续!'
            ]
        };
        
        const list = feedbacks[exerciseType] || feedbacks.high_knees;
        return list[Math.floor(Math.random() * list.length)];
    }
    
    // 重置检测器
    reset(exerciseType) {
        if (exerciseType === 'high_knees') {
            this.config.high_knees.side = {
                left: { up: false, lastCountTime: 0 },
                right: { up: false, lastCountTime: 0 }
            };
        } else if (exerciseType === 'side_slide') {
            this.config.side_slide.state = 'center';
            this.config.side_slide.lastMoveTime = 0;
        }
    }
    
    // 获取配置
    getConfig() {
        return JSON.parse(JSON.stringify(this.config));
    }
}