// 双人姿态追踪器
export class DualPoseTracker {
    constructor() {
        // 追踪状态
        this.trackedPersons = {
            left: { id: 0, landmarks: null, position: null, history: [], lostFrames: 0 },
            right: { id: 1, landmarks: null, position: null, history: [], lostFrames: 0 }
        };
        
        // 追踪参数
        this.params = {
            positionThreshold: 0.1,  // 位置变化阈值
            maxLostFrames: 10,       // 最大丢失帧数
            smoothFactor: 0.3,       // 平滑系数
            minConfidence: 0.5       // 最小置信度
        };
        
        // 性能统计
        this.stats = {
            swaps: 0,
            lostFrames: 0,
            recoveryCount: 0
        };
    }
    
    // 追踪双人姿态
    trackPersons(landmarksArray) {
        if (!landmarksArray || landmarksArray.length === 0) {
            this.handleNoDetection();
            return this.getCurrentPersons();
        }
        
        // 计算每个人的中心位置
        const persons = landmarksArray.map((lm, index) => ({
            landmarks: lm,
            position: this.calculateCenter(lm),
            confidence: this.calculateConfidence(lm)
        }));
        
        // 按位置排序（从左到右）
        persons.sort((a, b) => a.position.x - b.position.x);
        
        // 匹配追踪目标
        return this.matchPersons(persons);
    }
    
    // 计算人体中心位置
    calculateCenter(landmarks) {
        if (!landmarks || landmarks.length < 25) {
            return { x: 0, y: 0 };
        }
        
        // 使用臀部中心作为参考点
        const leftHip = landmarks[23];
        const rightHip = landmarks[24];
        
        return {
            x: (leftHip.x + rightHip.x) / 2,
            y: (leftHip.y + rightHip.y) / 2
        };
    }
    
    // 计算姿态置信度
    calculateConfidence(landmarks) {
        if (!landmarks) return 0;
        
        // 关键点可见性平均值
        let totalVisibility = 0;
        let visiblePoints = 0;
        
        // 检查主要关节点
        const keyPoints = [0, 11, 12, 23, 24, 25, 26, 27, 28];
        keyPoints.forEach(index => {
            if (landmarks[index]) {
                totalVisibility += landmarks[index].visibility || 0.5;
                visiblePoints++;
            }
        });
        
        return visiblePoints > 0 ? totalVisibility / visiblePoints : 0;
    }
    
    // 匹配追踪目标
    matchPersons(persons) {
        // 如果是第一次检测
        if (!this.trackedPersons.left.position || !this.trackedPersons.right.position) {
            return this.initializeTracking(persons);
        }
        
        // 计算距离矩阵
        const distances = {
            leftToLeft: this.calculateDistance(this.trackedPersons.left.position, persons[0]?.position),
            leftToRight: persons[1] ? this.calculateDistance(this.trackedPersons.left.position, persons[1]?.position) : Infinity,
            rightToLeft: this.calculateDistance(this.trackedPersons.right.position, persons[0]?.position),
            rightToRight: persons[1] ? this.calculateDistance(this.trackedPersons.right.position, persons[1]?.position) : Infinity
        };
        
        // 分配追踪目标
        if (persons.length === 1) {
            // 只检测到一个人
            return this.handleSinglePerson(persons[0]);
        } else if (persons.length >= 2) {
            // 检测到至少两个人
            return this.handleMultiplePersons(persons, distances);
        }
        
        return this.getCurrentPersons();
    }
    
    // 初始化追踪
    initializeTracking(persons) {
        if (persons.length >= 2) {
            // 有两个人，按左右分配
            this.trackedPersons.left = {
                ...this.trackedPersons.left,
                landmarks: persons[0].landmarks,
                position: persons[0].position,
                history: [persons[0].position],
                lostFrames: 0
            };
            
            this.trackedPersons.right = {
                ...this.trackedPersons.right,
                landmarks: persons[1].landmarks,
                position: persons[1].position,
                history: [persons[1].position],
                lostFrames: 0
            };
        } else if (persons.length === 1) {
            // 只有一个人，根据位置决定左右
            if (persons[0].position.x < 0.5) {
                this.trackedPersons.left = {
                    ...this.trackedPersons.left,
                    landmarks: persons[0].landmarks,
                    position: persons[0].position,
                    history: [persons[0].position],
                    lostFrames: 0
                };
            } else {
                this.trackedPersons.right = {
                    ...this.trackedPersons.right,
                    landmarks: persons[0].landmarks,
                    position: persons[0].position,
                    history: [persons[0].position],
                    lostFrames: 0
                };
            }
        }
        
        return this.getCurrentPersons();
    }
    
    // 处理单个人
    handleSinglePerson(person) {
        const distanceToLeft = this.calculateDistance(this.trackedPersons.left.position, person.position);
        const distanceToRight = this.calculateDistance(this.trackedPersons.right.position, person.position);
        
        if (distanceToLeft < distanceToRight) {
            // 更接近左侧目标
            this.trackedPersons.left = {
                ...this.trackedPersons.left,
                landmarks: person.landmarks,
                position: this.smoothPosition(this.trackedPersons.left.position, person.position),
                history: [...this.trackedPersons.left.history.slice(-9), person.position],
                lostFrames: 0
            };
            
            // 右侧目标丢失
            this.trackedPersons.right.lostFrames++;
        } else {
            // 更接近右侧目标
            this.trackedPersons.right = {
                ...this.trackedPersons.right,
                landmarks: person.landmarks,
                position: this.smoothPosition(this.trackedPersons.right.position, person.position),
                history: [...this.trackedPersons.right.history.slice(-9), person.position],
                lostFrames: 0
            };
            
            // 左侧目标丢失
            this.trackedPersons.left.lostFrames++;
        }
        
        return this.getCurrentPersons();
    }
    
    // 处理多个人
    handleMultiplePersons(persons, distances) {
        // 使用匈牙利算法思想进行最优匹配
        const costLeftLeft = distances.leftToLeft;
        const costLeftRight = distances.leftToRight;
        const costRightLeft = distances.rightToLeft;
        const costRightRight = distances.rightToRight;
        
        // 计算两种分配方案的总成本
        const costScenario1 = costLeftLeft + costRightRight; // 保持左右
        const costScenario2 = costLeftRight + costRightLeft; // 交换左右
        
        let shouldSwap = false;
        
        if (costScenario2 < costScenario1 * 0.7) {
            // 交换的成本显著更低，可能是两人交叉了
            shouldSwap = true;
            this.stats.swaps++;
        }
        
        // 分配追踪目标
        if (shouldSwap) {
            // 交换分配
            this.trackedPersons.left = {
                ...this.trackedPersons.left,
                landmarks: persons[1].landmarks,
                position: this.smoothPosition(this.trackedPersons.left.position, persons[1].position),
                history: [...this.trackedPersons.left.history.slice(-9), persons[1].position],
                lostFrames: 0
            };
            
            this.trackedPersons.right = {
                ...this.trackedPersons.right,
                landmarks: persons[0].landmarks,
                position: this.smoothPosition(this.trackedPersons.right.position, persons[0].position),
                history: [...this.trackedPersons.right.history.slice(-9), persons[0].position],
                lostFrames: 0
            };
        } else {
            // 保持原分配
            this.trackedPersons.left = {
                ...this.trackedPersons.left,
                landmarks: persons[0].landmarks,
                position: this.smoothPosition(this.trackedPersons.left.position, persons[0].position),
                history: [...this.trackedPersons.left.history.slice(-9), persons[0].position],
                lostFrames: 0
            };
            
            this.trackedPersons.right = {
                ...this.trackedPersons.right,
                landmarks: persons[1].landmarks,
                position: this.smoothPosition(this.trackedPersons.right.position, persons[1].position),
                history: [...this.trackedPersons.right.history.slice(-9), persons[1].position],
                lostFrames: 0
            };
        }
        
        return this.getCurrentPersons();
    }
    
    // 处理无检测情况
    handleNoDetection() {
        this.trackedPersons.left.lostFrames++;
        this.trackedPersons.right.lostFrames++;
        this.stats.lostFrames++;
        
        // 如果丢失帧数过多，重置追踪
        if (this.trackedPersons.left.lostFrames > this.params.maxLostFrames) {
            this.trackedPersons.left.landmarks = null;
            this.trackedPersons.left.position = null;
        }
        
        if (this.trackedPersons.right.lostFrames > this.params.maxLostFrames) {
            this.trackedPersons.right.landmarks = null;
            this.trackedPersons.right.position = null;
        }
    }
    
    // 平滑位置更新
    smoothPosition(oldPos, newPos) {
        if (!oldPos) return newPos;
        
        return {
            x: oldPos.x * (1 - this.params.smoothFactor) + newPos.x * this.params.smoothFactor,
            y: oldPos.y * (1 - this.params.smoothFactor) + newPos.y * this.params.smoothFactor
        };
    }
    
    // 计算两点距离
    calculateDistance(pos1, pos2) {
        if (!pos1 || !pos2) return Infinity;
        
        const dx = pos1.x - pos2.x;
        const dy = pos1.y - pos2.y;
        return Math.sqrt(dx * dx + dy * dy);
    }
    
    // 获取当前追踪状态
    getCurrentPersons() {
        return {
            left: this.trackedPersons.left.lostFrames <= this.params.maxLostFrames ? 
                this.trackedPersons.left : { ...this.trackedPersons.left, landmarks: null },
            right: this.trackedPersons.right.lostFrames <= this.params.maxLostFrames ? 
                this.trackedPersons.right : { ...this.trackedPersons.right, landmarks: null }
        };
    }
    
    // 获取统计信息
    getStats() {
        return { ...this.stats };
    }
    
    // 重置追踪器
    reset() {
        this.trackedPersons = {
            left: { id: 0, landmarks: null, position: null, history: [], lostFrames: 0 },
            right: { id: 1, landmarks: null, position: null, history: [], lostFrames: 0 }
        };
        
        this.stats = {
            swaps: 0,
            lostFrames: 0,
            recoveryCount: 0
        };
    }
}