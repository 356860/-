// UI渲染器 - 负责所有UI元素的渲染和交互
export class UIRenderer {
    constructor(container, callbacks) {
        this.container = container;
        this.callbacks = callbacks || {};
        
        // UI状态
        this.state = {
            isTraining: false,
            exerciseType: 'high_knees',
            showControls: true,
            showScores: true,
            showFeedback: false,
            feedback: { side: 'left', text: '', time: 0 }
        };
        
        // 学生数据
        this.students = {
            left: { name: '学生A', count: 0, character: 'wukong' },
            right: { name: '学生B', count: 0, character: 'feihong' }
        };
        
        // UI元素
        this.elements = {};
        
        // 交互状态
        this.interaction = {
            hoveredButton: null,
            activeButton: null,
            mousePosition: { x: 0, y: 0 }
        };
        
        this.init();
    }
    
    init() {
        console.log('UI渲染器已初始化');
        
        // 设置容器样式
        this.container.style.position = 'relative';
        
        // 创建UI容器
        this.createUIContainer();
        
        // 监听鼠标事件
        this.setupEventListeners();
    }
    
    // 创建UI容器
    createUIContainer() {
        // 创建UI层Canvas
        this.uiCanvas = document.createElement('canvas');
        this.uiCanvas.id = 'uiCanvas';
        this.uiCanvas.style.position = 'absolute';
        this.uiCanvas.style.top = '0';
        this.uiCanvas.style.left = '0';
        this.uiCanvas.style.width = '100%';
        this.uiCanvas.style.height = '100%';
        this.uiCanvas.style.pointerEvents = 'none';
        this.uiCanvas.style.zIndex = '10';
        
        this.container.appendChild(this.uiCanvas);
        this.uiCtx = this.uiCanvas.getContext('2d');
        
        // 创建控制面板容器
        this.controlsContainer = document.createElement('div');
        this.controlsContainer.id = 'controlsContainer';
        this.controlsContainer.style.position = 'absolute';
        this.controlsContainer.style.top = '0';
        this.controlsContainer.style.left = '0';
        this.controlsContainer.style.width = '100%';
        this.controlsContainer.style.height = '100%';
        this.controlsContainer.style.pointerEvents = 'none';
        this.controlsContainer.style.zIndex = '20';
        
        this.container.appendChild(this.controlsContainer);
        
        // 更新尺寸
        this.resize();
        window.addEventListener('resize', () => this.resize());
    }
    
    // 创建UI界面
    createUI() {
        // 清空控制面板
        this.controlsContainer.innerHTML = '';
        
        // 创建顶部控制栏
        this.createTopControls();
        
        // 创建底部计分板
        this.createScoreboard();
        
        // 创建侧边控制面板
        this.createSidePanel();
        
        // 创建反馈区域
        this.createFeedbackArea();
        
        // 初始渲染
        this.render();
    }
    
    // 创建顶部控制栏
    createTopControls() {
        const topBar = document.createElement('div');
        topBar.className = 'top-controls';
        topBar.style.cssText = `
            position: absolute;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            display: flex;
            gap: 10px;
            background: rgba(0, 0, 0, 0.7);
            backdrop-filter: blur(10px);
            border-radius: 12px;
            padding: 12px 20px;
            border: 1px solid rgba(255, 255, 255, 0.1);
            pointer-events: auto;
        `;
        
        // 开始/停止按钮
        const startStopBtn = this.createButton(
            this.state.isTraining ? '停止训练' : '开始训练',
            () => this.toggleTraining(),
            {
                backgroundColor: this.state.isTraining ? '#ef4444' : '#10b981',
                hoverColor: this.state.isTraining ? '#dc2626' : '#059669'
            }
        );
        
        // 重置按钮
        const resetBtn = this.createButton('重置计数', () => {
            if (this.callbacks.onResetCounts) this.callbacks.onResetCounts();
        }, {
            backgroundColor: '#6b7280',
            hoverColor: '#4b5563'
        });
        
        // 动作选择
        const exerciseSelect = document.createElement('select');
        exerciseSelect.className = 'exercise-select';
        exerciseSelect.style.cssText = `
            background: rgba(255, 255, 255, 0.1);
            color: white;
            border: 1px solid rgba(255, 255, 255, 0.2);
            border-radius: 6px;
            padding: 8px 12px;
            font-size: 14px;
            outline: none;
            cursor: pointer;
        `;
        
        exerciseSelect.innerHTML = `
            <option value="high_knees">🏃‍♂️ 高抬腿</option>
            <option value="side_slide">🦀 侧滑步</option>
        `;
        
        exerciseSelect.value = this.state.exerciseType;
        exerciseSelect.onchange = (e) => {
            if (this.callbacks.onChangeExercise) {
                this.callbacks.onChangeExercise(e.target.value);
            }
        };
        
        topBar.appendChild(startStopBtn);
        topBar.appendChild(resetBtn);
        topBar.appendChild(exerciseSelect);
        
        this.controlsContainer.appendChild(topBar);
        this.elements.topBar = topBar;
    }
    
    // 创建计分板
    createScoreboard() {
        const scoreboard = document.createElement('div');
        scoreboard.className = 'scoreboard';
        scoreboard.style.cssText = `
            position: absolute;
            bottom: 20px;
            left: 50%;
            transform: translateX(-50%);
            display: flex;
            gap: 40px;
            background: rgba(0, 0, 0, 0.7);
            backdrop-filter: blur(10px);
            border-radius: 16px;
            padding: 20px 40px;
            border: 1px solid rgba(255, 255, 255, 0.1);
            pointer-events: auto;
            min-width: 400px;
            justify-content: center;
        `;
        
        // 左侧学生计分
        const leftScore = this.createScoreCard('left');
        const rightScore = this.createScoreCard('right');
        
        // VS分隔符
        const vsDivider = document.createElement('div');
        vsDivider.className = 'vs-divider';
        vsDivider.style.cssText = `
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 0 20px;
            color: white;
        `;
        
        const vsText = document.createElement('div');
        vsText.textContent = 'VS';
        vsText.style.cssText = `
            font-size: 24px;
            font-weight: bold;
            color: #fbbf24;
            margin-bottom: 8px;
        `;
        
        const diffText = document.createElement('div');
        diffText.id = 'scoreDiff';
        diffText.textContent = '0';
        diffText.style.cssText = `
            font-size: 18px;
            font-weight: bold;
            color: #94a3b8;
        `;
        
        vsDivider.appendChild(vsText);
        vsDivider.appendChild(diffText);
        
        scoreboard.appendChild(leftScore);
        scoreboard.appendChild(vsDivider);
        scoreboard.appendChild(rightScore);
        
        this.controlsContainer.appendChild(scoreboard);
        this.elements.scoreboard = scoreboard;
        this.elements.leftScore = leftScore;
        this.elements.rightScore = rightScore;
        this.elements.scoreDiff = diffText;
    }
    
    // 创建计分卡
    createScoreCard(side) {
        const student = this.students[side];
        const isLeft = side === 'left';
        
        const card = document.createElement('div');
        card.className = `score-card ${side}`;
        card.style.cssText = `
            display: flex;
            flex-direction: column;
            align-items: center;
            min-width: 150px;
            padding: 15px;
            border-radius: 12px;
            background: ${isLeft ? 'rgba(239, 68, 68, 0.1)' : 'rgba(59, 130, 246, 0.1)'};
            border: 2px solid ${isLeft ? 'rgba(239, 68, 68, 0.3)' : 'rgba(59, 130, 246, 0.3)'};
            transition: all 0.3s;
        `;
        
        // 学生姓名
        const nameInput = document.createElement('input');
        nameInput.type = 'text';
        nameInput.value = student.name;
        nameInput.style.cssText = `
            background: transparent;
            border: none;
            color: white;
            font-size: 18px;
            font-weight: bold;
            text-align: center;
            margin-bottom: 10px;
            outline: none;
            width: 100%;
            border-bottom: 1px solid rgba(255, 255, 255, 0.2);
            padding-bottom: 5px;
        `;
        
        nameInput.onchange = (e) => {
            if (this.callbacks.onChangeStudentName) {
                this.callbacks.onChangeStudentName(side, e.target.value);
            }
        };
        
        // 角色选择
        const characterSelect = document.createElement('select');
        characterSelect.style.cssText = `
            background: rgba(255, 255, 255, 0.1);
            color: white;
            border: 1px solid rgba(255, 255, 255, 0.2);
            border-radius: 6px;
            padding: 5px 10px;
            margin-bottom: 15px;
            font-size: 12px;
            outline: none;
            cursor: pointer;
            width: 100%;
        `;
        
        characterSelect.innerHTML = `
            <option value="wukong">🐵 悟空</option>
            <option value="feihong">🥋 飞鸿</option>
            <option value="warrior">🤖 战士</option>
        `;
        
        characterSelect.value = student.character;
        characterSelect.onchange = (e) => {
            if (this.callbacks.onChangeCharacter) {
                this.callbacks.onChangeCharacter(side, e.target.value);
            }
        };
        
        // 计分显示
        const scoreDisplay = document.createElement('div');
        scoreDisplay.id = `${side}Score`;
        scoreDisplay.textContent = student.count;
        scoreDisplay.style.cssText = `
            font-size: 48px;
            font-weight: bold;
            color: ${isLeft ? '#ef4444' : '#3b82f6'};
            text-shadow: 0 2px 10px rgba(0, 0, 0, 0.5);
            margin: 10px 0;
        `;
        
        // 趋势指示器
        const trendIndicator = document.createElement('div');
        trendIndicator.id = `${side}Trend`;
        trendIndicator.textContent = '↑';
        trendIndicator.style.cssText = `
            font-size: 20px;
            color: #10b981;
            opacity: 0;
            transition: opacity 0.3s;
        `;
        
        card.appendChild(nameInput);
        card.appendChild(characterSelect);
        card.appendChild(scoreDisplay);
        card.appendChild(trendIndicator);
        
        return card;
    }
    
    // 创建侧边面板
    createSidePanel() {
        const sidePanel = document.createElement('div');
        sidePanel.className = 'side-panel';
        sidePanel.style.cssText = `
            position: absolute;
            top: 20px;
            right: 20px;
            display: flex;
            flex-direction: column;
            gap: 10px;
            pointer-events: auto;
        `;
        
        // 导出按钮
        const exportBtn = this.createButton('📥 导出数据', () => {
            if (this.callbacks.onExportData) this.callbacks.onExportData();
        }, {
            backgroundColor: '#8b5cf6',
            hoverColor: '#7c3aed'
        });
        
        // 调试按钮
        const debugBtn = this.createButton('🔧 调试面板', () => {
            if (this.callbacks.onToggleDebug) this.callbacks.onToggleDebug();
        }, {
            backgroundColor: '#6b7280',
            hoverColor: '#4b5563'
        });
        
        // 设置按钮
        const settingsBtn = this.createButton('⚙️ 设置', () => {
            this.toggleSettings();
        }, {
            backgroundColor: '#6b7280',
            hoverColor: '#4b5563'
        });
        
        sidePanel.appendChild(exportBtn);
        sidePanel.appendChild(debugBtn);
        sidePanel.appendChild(settingsBtn);
        
        this.controlsContainer.appendChild(sidePanel);
        this.elements.sidePanel = sidePanel;
    }
    
    // 创建反馈区域
    createFeedbackArea() {
        const feedbackContainer = document.createElement('div');
        feedbackContainer.id = 'feedbackContainer';
        feedbackContainer.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            pointer-events: none;
            z-index: 30;
        `;
        
        this.controlsContainer.appendChild(feedbackContainer);
        this.elements.feedbackContainer = feedbackContainer;
    }
    
    // 创建按钮
    createButton(text, onClick, styles = {}) {
        const button = document.createElement('button');
        button.textContent = text;
        
        const defaultStyles = {
            backgroundColor: '#3b82f6',
            hoverColor: '#2563eb',
            activeColor: '#1d4ed8',
            textColor: '#FFFFFF',
            fontSize: '14px',
            padding: '10px 20px',
            borderRadius: '8px',
            border: 'none',
            cursor: 'pointer',
            transition: 'all 0.2s',
            fontWeight: 'bold'
        };
        
        const mergedStyles = { ...defaultStyles, ...styles };
        
        button.style.cssText = `
            background-color: ${mergedStyles.backgroundColor};
            color: ${mergedStyles.textColor};
            font-size: ${mergedStyles.fontSize};
            padding: ${mergedStyles.padding};
            border-radius: ${mergedStyles.borderRadius};
            border: none;
            cursor: pointer;
            transition: all 0.2s;
            font-weight: ${mergedStyles.fontWeight};
        `;
        
        // 添加交互效果
        button.onmouseenter = () => {
            button.style.backgroundColor = mergedStyles.hoverColor;
            button.style.transform = 'translateY(-2px)';
        };
        
        button.onmouseleave = () => {
            button.style.backgroundColor = mergedStyles.backgroundColor;
            button.style.transform = 'translateY(0)';
        };
        
        button.onmousedown = () => {
            button.style.backgroundColor = mergedStyles.activeColor;
            button.style.transform = 'translateY(0)';
        };
        
        button.onmouseup = () => {
            button.style.backgroundColor = mergedStyles.hoverColor;
            button.style.transform = 'translateY(-2px)';
        };
        
        button.onclick = (e) => {
            e.stopPropagation();
            onClick();
        };
        
        return button;
    }
    
    // 切换训练状态
    toggleTraining() {
        this.state.isTraining = !this.state.isTraining;
        
        if (this.state.isTraining) {
            if (this.callbacks.onStartTraining) this.callbacks.onStartTraining();
        } else {
            if (this.callbacks.onStopTraining) this.callbacks.onStopTraining();
        }
        
        // 更新按钮文本
        if (this.elements.topBar) {
            const button = this.elements.topBar.querySelector('button');
            if (button) {
                button.textContent = this.state.isTraining ? '停止训练' : '开始训练';
                button.style.backgroundColor = this.state.isTraining ? '#ef4444' : '#10b981';
            }
        }
    }
    
    // 显示反馈
    showFeedback(side, text) {
        this.state.showFeedback = true;
        this.state.feedback = {
            side,
            text,
            time: Date.now()
        };
        
        // 创建反馈元素
        const feedback = document.createElement('div');
        feedback.className = 'feedback-popup';
        feedback.textContent = text;
        
        const isLeft = side === 'left';
        feedback.style.cssText = `
            position: absolute;
            ${isLeft ? 'left: 25%' : 'right: 25%'};
            top: 40%;
            transform: translateX(${isLeft ? '-50%' : '50%'}) translateY(-50%);
            background: ${isLeft ? 'rgba(239, 68, 68, 0.9)' : 'rgba(59, 130, 246, 0.9)'};
            color: white;
            padding: 15px 30px;
            border-radius: 50px;
            font-size: 24px;
            font-weight: bold;
            animation: popIn 0.3s ease-out;
            pointer-events: none;
            z-index: 100;
            white-space: nowrap;
        `;
        
        // 添加动画
        const style = document.createElement('style');
        style.textContent = `
            @keyframes popIn {
                0% { transform: translateX(${isLeft ? '-50%' : '50%'}) translateY(-50%) scale(0.5); opacity: 0; }
                70% { transform: translateX(${isLeft ? '-50%' : '50%'}) translateY(-50%) scale(1.1); }
                100% { transform: translateX(${isLeft ? '-50%' : '50%'}) translateY(-50%) scale(1); opacity: 1; }
            }
            @keyframes fadeOut {
                from { opacity: 1; }
                to { opacity: 0; }
            }
        `;
        document.head.appendChild(style);
        
        this.elements.feedbackContainer.appendChild(feedback);
        
        // 3秒后移除
        setTimeout(() => {
            feedback.style.animation = 'fadeOut 0.5s ease-out';
            setTimeout(() => {
                if (feedback.parentNode) {
                    feedback.parentNode.removeChild(feedback);
                }
                document.head.removeChild(style);
            }, 500);
        }, 3000);
    }
    
    // 更新分数
    updateScores(leftScore, rightScore) {
        this.students.left.count = leftScore;
        this.students.right.count = rightScore;
        
        // 更新显示
        if (this.elements.leftScore) {
            const leftDisplay = this.elements.leftScore.querySelector(`#leftScore`);
            if (leftDisplay) leftDisplay.textContent = leftScore;
        }
        
        if (this.elements.rightScore) {
            const rightDisplay = this.elements.rightScore.querySelector(`#rightScore`);
            if (rightDisplay) rightDisplay.textContent = rightScore;
        }
        
        // 更新分数差
        if (this.elements.scoreDiff) {
            const diff = Math.abs(leftScore - rightScore);
            this.elements.scoreDiff.textContent = diff;
            
            // 高亮领先者
            if (leftScore > rightScore) {
                this.elements.leftScore.style.borderColor = 'rgba(239, 68, 68, 0.8)';
                this.elements.rightScore.style.borderColor = 'rgba(59, 130, 246, 0.3)';
            } else if (rightScore > leftScore) {
                this.elements.leftScore.style.borderColor = 'rgba(239, 68, 68, 0.3)';
                this.elements.rightScore.style.borderColor = 'rgba(59, 130, 246, 0.8)';
            } else {
                this.elements.leftScore.style.borderColor = 'rgba(239, 68, 68, 0.3)';
                this.elements.rightScore.style.borderColor = 'rgba(59, 130, 246, 0.3)';
            }
        }
    }
    
    // 更新训练状态
    updateTrainingState(isTraining) {
        this.state.isTraining = isTraining;
        
        // 更新按钮
        if (this.elements.topBar) {
            const button = this.elements.topBar.querySelector('button');
            if (button) {
                button.textContent = isTraining ? '停止训练' : '开始训练';
                button.style.backgroundColor = isTraining ? '#ef4444' : '#10b981';
            }
        }
    }
    
    // 更新动作类型
    updateExerciseType(type) {
        this.state.exerciseType = type;
        
        if (this.elements.topBar) {
            const select = this.elements.topBar.querySelector('.exercise-select');
            if (select) {
                select.value = type;
            }
        }
    }
    
    // 更新学生姓名
    updateStudentNames() {
        // 重新创建UI以更新所有姓名显示
        this.createUI();
    }
    
    // 切换设置面板
    toggleSettings() {
        // 实现设置面板的显示/隐藏
        console.log('打开设置面板');
    }
    
    // 设置事件监听器
    setupEventListeners() {
        // 鼠标移动监听
        this.uiCanvas.addEventListener('mousemove', (e) => {
            const rect = this.uiCanvas.getBoundingClientRect();
            this.interaction.mousePosition = {
                x: e.clientX - rect.left,
                y: e.clientY - rect.top
            };
        });
        
        // 点击监听
        this.uiCanvas.addEventListener('click', (e) => {
            this.handleCanvasClick(e);
        });
    }
    
    // 处理Canvas点击
    handleCanvasClick(e) {
        const rect = this.uiCanvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        // 检查按钮点击
        // 这里可以添加更多交互逻辑
    }
    
    // 调整尺寸
    resize() {
        const rect = this.container.getBoundingClientRect();
        this.uiCanvas.width = rect.width;
        this.uiCanvas.height = rect.height;
        
        // 重新渲染
        this.render();
    }
    
    // 渲染UI
    render() {
        // 清除Canvas
        this.uiCtx.clearRect(0, 0, this.uiCanvas.width, this.uiCanvas.height);
        
        // 这里可以添加Canvas绘制的UI元素
        // 例如：绘制额外的视觉效果、叠加层等
        
        // 渲染指令提示
        this.renderInstructions();
    }
    
    // 渲染使用说明
    renderInstructions() {
        if (!this.state.isTraining) {
            const instructions = [
                '👥 请两位学生站在摄像头前',
                '🏃 选择动作类型',
                '🎯 点击"开始训练"进行计数',
                '📊 实时查看双方成绩'
            ];
            
            const ctx = this.uiCtx;
            const centerX = this.uiCanvas.width / 2;
            const startY = this.uiCanvas.height / 3;
            
            ctx.save();
            
            // 半透明背景
            ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
            ctx.fillRect(centerX - 200, startY - 20, 400, instructions.length * 40 + 40);
            
            // 边框
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
            ctx.lineWidth = 2;
            ctx.strokeRect(centerX - 200, startY - 20, 400, instructions.length * 40 + 40);
            
            // 标题
            ctx.fillStyle = '#FFFFFF';
            ctx.font = 'bold 20px -apple-system, BlinkMacSystemFont, sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('使用说明', centerX, startY + 10);
            
            // 说明文字
            ctx.font = '16px -apple-system, BlinkMacSystemFont, sans-serif';
            instructions.forEach((text, index) => {
                ctx.fillText(text, centerX, startY + 60 + index * 40);
            });
            
            ctx.restore();
        }
    }
}