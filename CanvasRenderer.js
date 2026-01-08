// Canvas渲染器
export class CanvasRenderer {
    constructor(canvasElement) {
        this.canvas = canvasElement;
        this.ctx = canvasElement.getContext('2d');
        
        // 渲染状态
        this.state = {
            width: 0,
            height: 0,
            scale: 1,
            offsetX: 0,
            offsetY: 0,
            quality: 'high',
            showSkeleton: true,
            showAvatars: true,
            showGrid: true
        };
        
        // 缓存
        this.cache = {
            background: null,
            grid: null
        };
        
        // 颜色配置
        this.colors = {
            background: '#1a1a2e',
            grid: 'rgba(255, 255, 255, 0.05)',
            skeleton: {
                left: '#FF6B6B',
                right: '#4ECDC4',
                joint: 'rgba(255, 255, 255, 0.9)',
                connection: 'rgba(255, 255, 255, 0.6)'
            },
            text: {
                primary: '#FFFFFF',
                secondary: '#CCCCCC',
                highlight: '#FFD700'
            }
        };
        
        // 骨架连接定义
        this.skeletonConnections = [
            // 身体核心
            [11, 12],  // 肩膀
            [11, 23], [12, 24],  // 肩到髋
            [23, 24],  // 髋部
            
            // 左臂
            [11, 13], [13, 15],
            
            // 右臂
            [12, 14], [14, 16],
            
            // 左腿
            [23, 25], [25, 27],
            
            // 右腿
            [24, 26], [26, 28]
        ];
        
        this.init();
    }
    
    init() {
        console.log('Canvas渲染器已初始化');
        this.setSize(this.canvas.width, this.canvas.height);
    }
    
    // 设置尺寸
    setSize(width, height) {
        this.state.width = width;
        this.state.height = height;
        
        // 更新Canvas尺寸
        this.canvas.width = width;
        this.canvas.height = height;
        
        // 计算缩放和偏移
        this.calculateViewport();
        
        // 清除缓存
        this.cache.background = null;
        this.cache.grid = null;
    }
    
    // 计算视口
    calculateViewport() {
        // 保持16:9的显示比例，居中显示
        const targetAspect = 16 / 9;
        const currentAspect = this.state.width / this.state.height;
        
        if (currentAspect > targetAspect) {
            // 宽度太宽，上下加黑边
            this.state.scale = this.state.height / 9;
            this.state.offsetX = (this.state.width - 16 * this.state.scale) / 2;
            this.state.offsetY = 0;
        } else {
            // 高度太高，左右加黑边
            this.state.scale = this.state.width / 16;
            this.state.offsetX = 0;
            this.state.offsetY = (this.state.height - 9 * this.state.scale) / 2;
        }
    }
    
    // 清除画布
    clear() {
        this.ctx.clearRect(0, 0, this.state.width, this.state.height);
    }
    
    // 渲染背景
    renderBackground() {
        // 绘制纯色背景
        this.ctx.fillStyle = this.colors.background;
        this.ctx.fillRect(0, 0, this.state.width, this.state.height);
        
        // 绘制网格（如果需要）
        if (this.state.showGrid) {
            this.renderGrid();
        }
        
        // 绘制分割线
        this.renderDivider();
    }
    
    // 渲染网格
    renderGrid() {
        // 使用缓存
        if (!this.cache.grid) {
            this.cache.grid = this.createGridTexture();
        }
        
        this.ctx.drawImage(this.cache.grid, 0, 0, this.state.width, this.state.height);
    }
    
    // 创建网格纹理
    createGridTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = this.state.width;
        canvas.height = this.state.height;
        const ctx = canvas.getContext('2d');
        
        const gridSize = 40;
        const lineWidth = 1;
        
        ctx.strokeStyle = this.colors.grid;
        ctx.lineWidth = lineWidth;
        
        // 垂直线
        for (let x = 0; x <= this.state.width; x += gridSize) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, this.state.height);
            ctx.stroke();
        }
        
        // 水平线
        for (let y = 0; y <= this.state.height; y += gridSize) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(this.state.width, y);
            ctx.stroke();
        }
        
        return canvas;
    }
    
    // 渲染分割线
    renderDivider() {
        const centerX = this.state.width / 2;
        
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        this.ctx.lineWidth = 2;
        this.ctx.setLineDash([10, 5]);
        
        this.ctx.beginPath();
        this.ctx.moveTo(centerX, 0);
        this.ctx.lineTo(centerX, this.state.height);
        this.ctx.stroke();
        
        this.ctx.setLineDash([]);
    }
    
    // 渲染骨架
    renderSkeleton(landmarks, color, side = 'left') {
        if (!this.state.showSkeleton || !landmarks) return;
        
        const ctx = this.ctx;
        const scale = this.state.scale;
        const offsetX = side === 'left' ? this.state.offsetX : this.state.offsetX + 8 * scale;
        const offsetY = this.state.offsetY;
        
        // 保存上下文状态
        ctx.save();
        
        // 设置裁剪区域（左侧或右侧）
        const clipX = side === 'left' ? 0 : this.state.width / 2;
        const clipWidth = this.state.width / 2;
        
        ctx.beginPath();
        ctx.rect(clipX, 0, clipWidth, this.state.height);
        ctx.clip();
        
        // 绘制连接线
        ctx.strokeStyle = color + 'CC'; // 添加透明度
        ctx.lineWidth = 4 * (scale / 100);
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        
        ctx.beginPath();
        this.skeletonConnections.forEach(([start, end]) => {
            if (landmarks[start] && landmarks[end] && 
                landmarks[start].visibility > 0.3 && landmarks[end].visibility > 0.3) {
                
                const startX = landmarks[start].x * 16 * scale + offsetX;
                const startY = landmarks[start].y * 9 * scale + offsetY;
                const endX = landmarks[end].x * 16 * scale + offsetX;
                const endY = landmarks[end].y * 9 * scale + offsetY;
                
                ctx.moveTo(startX, startY);
                ctx.lineTo(endX, endY);
            }
        });
        ctx.stroke();
        
        // 绘制关节点
        landmarks.forEach((point, index) => {
            if (index > 10 && point.visibility > 0.3) { // 只绘制主要关节点
                const x = point.x * 16 * scale + offsetX;
                const y = point.y * 9 * scale + offsetY;
                const radius = 6 * (scale / 100);
                
                // 外圈
                ctx.fillStyle = this.colors.skeleton.joint;
                ctx.beginPath();
                ctx.arc(x, y, radius, 0, Math.PI * 2);
                ctx.fill();
                
                // 内圈
                ctx.fillStyle = color;
                ctx.beginPath();
                ctx.arc(x, y, radius * 0.6, 0, Math.PI * 2);
                ctx.fill();
            }
        });
        
        // 恢复上下文
        ctx.restore();
    }
    
    // 渲染文本
    renderText(text, x, y, options = {}) {
        const ctx = this.ctx;
        const {
            size = 16,
            color = this.colors.text.primary,
            align = 'left',
            baseline = 'top',
            bold = false,
            shadow = true
        } = options;
        
        ctx.save();
        
        // 设置文本样式
        ctx.font = `${bold ? 'bold ' : ''}${size}px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`;
        ctx.fillStyle = color;
        ctx.textAlign = align;
        ctx.textBaseline = baseline;
        
        // 添加阴影
        if (shadow) {
            ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
            ctx.shadowBlur = 4;
            ctx.shadowOffsetX = 2;
            ctx.shadowOffsetY = 2;
        }
        
        // 绘制文本
        ctx.fillText(text, x, y);
        
        // 清除阴影
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
        
        ctx.restore();
    }
    
    // 渲染进度条
    renderProgressBar(x, y, width, height, progress, options = {}) {
        const ctx = this.ctx;
        const {
            backgroundColor = 'rgba(255, 255, 255, 0.1)',
            fillColor = '#4CAF50',
            borderColor = 'rgba(255, 255, 255, 0.3)',
            borderRadius = 4
        } = options;
        
        ctx.save();
        
        // 绘制背景
        ctx.fillStyle = backgroundColor;
        this.roundRect(ctx, x, y, width, height, borderRadius);
        ctx.fill();
        
        // 绘制边框
        ctx.strokeStyle = borderColor;
        ctx.lineWidth = 1;
        this.roundRect(ctx, x, y, width, height, borderRadius);
        ctx.stroke();
        
        // 绘制进度
        const fillWidth = Math.max(0, Math.min(width * progress, width));
        if (fillWidth > 0) {
            ctx.fillStyle = fillColor;
            this.roundRect(ctx, x, y, fillWidth, height, borderRadius);
            ctx.fill();
        }
        
        ctx.restore();
    }
    
    // 圆角矩形
    roundRect(ctx, x, y, width, height, radius) {
        if (width < 2 * radius) radius = width / 2;
        if (height < 2 * radius) radius = height / 2;
        
        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.arcTo(x + width, y, x + width, y + height, radius);
        ctx.arcTo(x + width, y + height, x, y + height, radius);
        ctx.arcTo(x, y + height, x, y, radius);
        ctx.arcTo(x, y, x + width, y, radius);
        ctx.closePath();
    }
    
    // 渲染按钮
    renderButton(x, y, width, height, text, options = {}) {
        const ctx = this.ctx;
        const {
            backgroundColor = 'rgba(59, 130, 246, 0.8)',
            hoverColor = 'rgba(37, 99, 235, 0.9)',
            activeColor = 'rgba(29, 78, 216, 1)',
            textColor = '#FFFFFF',
            fontSize = 14,
            borderRadius = 8,
            isHovered = false,
            isActive = false
        } = options;
        
        ctx.save();
        
        // 确定颜色
        let color = backgroundColor;
        if (isActive) color = activeColor;
        else if (isHovered) color = hoverColor;
        
        // 绘制背景
        ctx.fillStyle = color;
        this.roundRect(ctx, x, y, width, height, borderRadius);
        ctx.fill();
        
        // 绘制边框
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.lineWidth = 1;
        this.roundRect(ctx, x, y, width, height, borderRadius);
        ctx.stroke();
        
        // 绘制文本
        ctx.fillStyle = textColor;
        ctx.font = `bold ${fontSize}px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, x + width / 2, y + height / 2);
        
        // 添加阴影
        ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
        ctx.shadowBlur = 6;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 2;
        this.roundRect(ctx, x, y, width, height, borderRadius);
        ctx.stroke();
        
        ctx.restore();
    }
    
    // 设置渲染质量
    setRenderQuality(quality) {
        this.state.quality = quality;
        
        switch (quality) {
            case 'low':
                this.state.showSkeleton = false;
                this.state.showGrid = false;
                this.canvas.style.imageRendering = 'pixelated';
                break;
                
            case 'medium':
                this.state.showSkeleton = true;
                this.state.showGrid = false;
                this.canvas.style.imageRendering = 'auto';
                break;
                
            case 'high':
                this.state.showSkeleton = true;
                this.state.showGrid = true;
                this.canvas.style.imageRendering = 'auto';
                break;
        }
    }
    
    // 获取Canvas上下文
    getContext() {
        return this.ctx;
    }
    
    // 获取Canvas尺寸
    getSize() {
        return {
            width: this.state.width,
            height: this.state.height
        };
    }
}