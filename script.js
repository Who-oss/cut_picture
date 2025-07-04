// 全局变量
let currentImage = null;
let croppedImages = [];

// 网格拖动相关变量
let isDragging = false;
let dragType = null; // 'horizontal' 或 'vertical'
let dragIndex = -1;
let gridOffsets = {
    horizontal: [], // 水平网格线的Y偏移
    vertical: []    // 垂直网格线的X偏移
};

// DOM 元素
const uploadArea = document.getElementById('uploadArea');
const imageInput = document.getElementById('imageInput');
const previewImage = document.getElementById('previewImage');
const gridCanvas = document.getElementById('gridCanvas');
const mainContent = document.getElementById('mainContent');
const resultsSection = document.getElementById('resultsSection');
const imageInfo = document.getElementById('imageInfo');
const stats = document.getElementById('stats');
const resultsInfo = document.getElementById('resultsInfo');
const resultsContainer = document.getElementById('resultsContainer');

// 参数元素
const blockWidthInput = document.getElementById('blockWidth');
const blockHeightInput = document.getElementById('blockHeight');
const directionSelect = document.getElementById('direction');
const showGridInput = document.getElementById('showGrid');

// 初始化
document.addEventListener('DOMContentLoaded', function() {
    setupEventListeners();
});

// 设置事件监听器
function setupEventListeners() {
    // 文件上传事件
    imageInput.addEventListener('change', handleFileSelect);
    
    // 拖拽事件
    uploadArea.addEventListener('dragover', handleDragOver);
    uploadArea.addEventListener('drop', handleDrop);
    uploadArea.addEventListener('dragenter', handleDragEnter);
    uploadArea.addEventListener('dragleave', handleDragLeave);
    
    // 参数变化事件
    blockWidthInput.addEventListener('input', updateGrid);
    blockHeightInput.addEventListener('input', updateGrid);
    directionSelect.addEventListener('change', updateGrid);
    showGridInput.addEventListener('change', updateGrid);
    
    // 预览图片加载事件
    previewImage.addEventListener('load', updateImageInfo);
    
    // 网格拖动事件
    gridCanvas.addEventListener('mousedown', handleGridMouseDown);
    gridCanvas.addEventListener('mousemove', handleGridMouseMove);
    gridCanvas.addEventListener('mouseup', handleGridMouseUp);
    gridCanvas.addEventListener('mouseleave', handleGridMouseUp);
    gridCanvas.style.cursor = 'default';
}

// 处理文件选择
function handleFileSelect(e) {
    const file = e.target.files[0];
    if (file && file.type.startsWith('image/')) {
        loadImage(file);
    }
}

// 拖拽处理
function handleDragOver(e) {
    e.preventDefault();
}

function handleDragEnter(e) {
    e.preventDefault();
    uploadArea.classList.add('dragover');
}

function handleDragLeave(e) {
    e.preventDefault();
    if (!uploadArea.contains(e.relatedTarget)) {
        uploadArea.classList.remove('dragover');
    }
}

function handleDrop(e) {
    e.preventDefault();
    uploadArea.classList.remove('dragover');
    
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
        loadImage(file);
    }
}

// 加载图片
function loadImage(file) {
    const reader = new FileReader();
    reader.onload = function(e) {
        currentImage = new Image();
        currentImage.onload = function() {
            previewImage.src = e.target.result;
            mainContent.style.display = 'grid';
            mainContent.classList.add('fade-in');
            resultsSection.style.display = 'none';
            updateImageInfo();
            updateGrid();
        };
        currentImage.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

// 更新图片信息
function updateImageInfo() {
    if (!currentImage) return;
    
    const info = `
        <strong>文件信息:</strong><br>
        尺寸: ${currentImage.width} × ${currentImage.height} 像素<br>
        比例: ${(currentImage.width / currentImage.height).toFixed(2)}<br>
        文件大小: ${(imageInput.files[0].size / 1024 / 1024).toFixed(2)} MB
    `;
    imageInfo.innerHTML = info;
    
    updateStats();
}

// 更新统计信息
function updateStats() {
    if (!currentImage) return;
    
    const blockWidth = parseInt(blockWidthInput.value);
    const blockHeight = parseInt(blockHeightInput.value);
    const direction = directionSelect.value;
    
    let blocksX, blocksY, totalBlocks, statsContent;
    
    if (direction === 'rows') {
        // 按行裁剪：每行一个块
        blocksY = Math.floor(currentImage.height / blockHeight);
        totalBlocks = blocksY;
        statsContent = `
            <strong>按行裁剪预览</strong><br>
            行数: ${blocksY}<br>
            总块数: ${totalBlocks}<br>
            每块尺寸: ${currentImage.width} × ${blockHeight}px
        `;
    } else if (direction === 'columns') {
        // 按列裁剪：每列一个块
        blocksX = Math.floor(currentImage.width / blockWidth);
        totalBlocks = blocksX;
        statsContent = `
            <strong>按列裁剪预览</strong><br>
            列数: ${blocksX}<br>
            总块数: ${totalBlocks}<br>
            每块尺寸: ${blockWidth} × ${currentImage.height}px
        `;
    } else {
        // 网格裁剪：行×列个块
        blocksX = Math.floor(currentImage.width / blockWidth);
        blocksY = Math.floor(currentImage.height / blockHeight);
        totalBlocks = blocksX * blocksY;
        statsContent = `
            <strong>网格裁剪预览</strong><br>
            水平块数: ${blocksX}<br>
            垂直块数: ${blocksY}<br>
            总块数: ${totalBlocks}<br>
            每块尺寸: ${blockWidth} × ${blockHeight}px
        `;
    }
    
    stats.innerHTML = statsContent;
}

// 更新网格显示
function updateGrid() {
    if (!currentImage || !previewImage.complete) return;
    
    const rect = previewImage.getBoundingClientRect();
    const displayWidth = previewImage.offsetWidth;
    const displayHeight = previewImage.offsetHeight;
    
    gridCanvas.width = displayWidth;
    gridCanvas.height = displayHeight;
    gridCanvas.style.width = displayWidth + 'px';
    gridCanvas.style.height = displayHeight + 'px';
    
    if (!showGridInput.checked) {
        const ctx = gridCanvas.getContext('2d');
        ctx.clearRect(0, 0, gridCanvas.width, gridCanvas.height);
        updateStats();
        return;
    }
    
    const ctx = gridCanvas.getContext('2d');
    ctx.clearRect(0, 0, gridCanvas.width, gridCanvas.height);
    
    const blockWidth = parseInt(blockWidthInput.value);
    const blockHeight = parseInt(blockHeightInput.value);
    const direction = directionSelect.value;
    
    // 计算缩放比例
    const scaleX = displayWidth / currentImage.width;
    const scaleY = displayHeight / currentImage.height;
    
    ctx.strokeStyle = '#667eea';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    
    if (direction === 'rows') {
        // 按行裁剪：只绘制水平线
        const scaledBlockHeight = blockHeight * scaleY;
        for (let i = 1; i < Math.floor(currentImage.height / blockHeight); i++) {
            const y = i * scaledBlockHeight + (gridOffsets.horizontal[i-1] || 0);
            if (y > 0 && y < displayHeight) {
                ctx.beginPath();
                ctx.moveTo(0, y);
                ctx.lineTo(displayWidth, y);
                ctx.stroke();
            }
        }
    } else if (direction === 'columns') {
        // 按列裁剪：只绘制垂直线
        const scaledBlockWidth = blockWidth * scaleX;
        for (let i = 1; i < Math.floor(currentImage.width / blockWidth); i++) {
            const x = i * scaledBlockWidth + (gridOffsets.vertical[i-1] || 0);
            if (x > 0 && x < displayWidth) {
                ctx.beginPath();
                ctx.moveTo(x, 0);
                ctx.lineTo(x, displayHeight);
                ctx.stroke();
            }
        }
    } else {
        // 网格裁剪：绘制完整网格
        const scaledBlockWidth = blockWidth * scaleX;
        const scaledBlockHeight = blockHeight * scaleY;
        
        // 绘制垂直线
        for (let i = 1; i < Math.floor(currentImage.width / blockWidth); i++) {
            const x = i * scaledBlockWidth + (gridOffsets.vertical[i-1] || 0);
            if (x > 0 && x < displayWidth) {
                ctx.beginPath();
                ctx.moveTo(x, 0);
                ctx.lineTo(x, displayHeight);
                ctx.stroke();
            }
        }
        
        // 绘制水平线
        for (let i = 1; i < Math.floor(currentImage.height / blockHeight); i++) {
            const y = i * scaledBlockHeight + (gridOffsets.horizontal[i-1] || 0);
            if (y > 0 && y < displayHeight) {
                ctx.beginPath();
                ctx.moveTo(0, y);
                ctx.lineTo(displayWidth, y);
                ctx.stroke();
            }
        }
    }
    
    updateStats();
}

// 裁剪图片
function cropImages() {
    if (!currentImage) return;
    
    const cropBtn = document.getElementById('cropBtn');
    const originalText = cropBtn.innerHTML;
    cropBtn.innerHTML = '<span class="loading"></span> 裁剪中...';
    cropBtn.disabled = true;
    
    setTimeout(() => {
        const blockWidth = parseInt(blockWidthInput.value);
        const blockHeight = parseInt(blockHeightInput.value);
        const direction = directionSelect.value;
        
        croppedImages = [];
        
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        let index = 0;
        
        if (direction === 'rows') {
            // 按行裁剪：每行一个块
            const blocksY = Math.floor(currentImage.height / blockHeight);
            canvas.width = currentImage.width;
            canvas.height = blockHeight;
            
            for (let y = 0; y < blocksY; y++) {
                let startY = y * blockHeight;
                let endY = (y + 1) * blockHeight;
                
                // 应用网格偏移
                if (y > 0 && gridOffsets.horizontal[y-1]) {
                    startY += gridOffsets.horizontal[y-1] / (gridCanvas.height / currentImage.height);
                }
                if (y < blocksY - 1 && gridOffsets.horizontal[y]) {
                    endY += gridOffsets.horizontal[y] / (gridCanvas.height / currentImage.height);
                }
                
                const actualHeight = Math.max(1, endY - startY);
                canvas.height = actualHeight;
                cropSingleImage(ctx, canvas, 0, startY, currentImage.width, actualHeight, index++);
            }
        } else if (direction === 'columns') {
            // 按列裁剪：每列一个块
            const blocksX = Math.floor(currentImage.width / blockWidth);
            canvas.width = blockWidth;
            canvas.height = currentImage.height;
            
            for (let x = 0; x < blocksX; x++) {
                let startX = x * blockWidth;
                let endX = (x + 1) * blockWidth;
                
                // 应用网格偏移
                if (x > 0 && gridOffsets.vertical[x-1]) {
                    startX += gridOffsets.vertical[x-1] / (gridCanvas.width / currentImage.width);
                }
                if (x < blocksX - 1 && gridOffsets.vertical[x]) {
                    endX += gridOffsets.vertical[x] / (gridCanvas.width / currentImage.width);
                }
                
                const actualWidth = Math.max(1, endX - startX);
                canvas.width = actualWidth;
                cropSingleImage(ctx, canvas, startX, 0, actualWidth, currentImage.height, index++);
            }
        } else {
            // 网格裁剪：行×列个块
            const blocksX = Math.floor(currentImage.width / blockWidth);
            const blocksY = Math.floor(currentImage.height / blockHeight);
            canvas.width = blockWidth;
            canvas.height = blockHeight;
            
            for (let y = 0; y < blocksY; y++) {
                for (let x = 0; x < blocksX; x++) {
                    let startX = x * blockWidth;
                    let endX = (x + 1) * blockWidth;
                    let startY = y * blockHeight;
                    let endY = (y + 1) * blockHeight;
                    
                    // 应用网格偏移
                    if (x > 0 && gridOffsets.vertical[x-1]) {
                        startX += gridOffsets.vertical[x-1] / (gridCanvas.width / currentImage.width);
                    }
                    if (x < blocksX - 1 && gridOffsets.vertical[x]) {
                        endX += gridOffsets.vertical[x] / (gridCanvas.width / currentImage.width);
                    }
                    if (y > 0 && gridOffsets.horizontal[y-1]) {
                        startY += gridOffsets.horizontal[y-1] / (gridCanvas.height / currentImage.height);
                    }
                    if (y < blocksY - 1 && gridOffsets.horizontal[y]) {
                        endY += gridOffsets.horizontal[y] / (gridCanvas.height / currentImage.height);
                    }
                    
                    const actualWidth = Math.max(1, endX - startX);
                    const actualHeight = Math.max(1, endY - startY);
                    canvas.width = actualWidth;
                    canvas.height = actualHeight;
                    cropSingleImage(ctx, canvas, startX, startY, actualWidth, actualHeight, index++);
                }
            }
        }
        
        displayResults();
        
        cropBtn.innerHTML = originalText;
        cropBtn.disabled = false;
    }, 100);
}

// 裁剪单个图片
function cropSingleImage(ctx, canvas, x, y, width, height, index) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(currentImage, x, y, width, height, 0, 0, canvas.width, canvas.height);
    
    const dataURL = canvas.toDataURL('image/png');
    croppedImages.push({
        dataURL: dataURL,
        index: index,
        x: x,
        y: y,
        width: width,
        height: height
    });
}

// 显示裁剪结果
function displayResults() {
    resultsSection.style.display = 'block';
    resultsSection.classList.add('fade-in');
    
    resultsInfo.innerHTML = `
        <strong>裁剪完成！</strong><br>
        成功生成 ${croppedImages.length} 个图片块
    `;
    
    resultsContainer.innerHTML = '';
    
    croppedImages.forEach((item, index) => {
        const resultItem = document.createElement('div');
        resultItem.className = 'result-item';
        resultItem.innerHTML = `
            <img src="${item.dataURL}" alt="图片块 ${index + 1}">
            <div class="item-info">
                块 ${index + 1}<br>
                位置: (${item.x}, ${item.y})<br>
                尺寸: ${item.width}×${item.height}
            </div>
            <button class="btn btn-primary download-btn" onclick="downloadSingle(${index})">
                <i class="fas fa-download"></i> 下载
            </button>
        `;
        resultsContainer.appendChild(resultItem);
    });
    
    // 滚动到结果区域
    resultsSection.scrollIntoView({ behavior: 'smooth' });
}

// 下载单个图片
function downloadSingle(index) {
    const item = croppedImages[index];
    const link = document.createElement('a');
    link.download = `cropped_image_${index + 1}.png`;
    link.href = item.dataURL;
    link.click();
}

// 下载所有图片
function downloadAll() {
    croppedImages.forEach((item, index) => {
        setTimeout(() => {
            const link = document.createElement('a');
            link.download = `cropped_image_${index + 1}.png`;
            link.href = item.dataURL;
            link.click();
        }, index * 200); // 延迟下载，避免浏览器阻止
    });
}

// 打包下载
function downloadZip() {
    if (typeof JSZip === 'undefined') {
        alert('正在加载压缩库，请稍后再试...');
        return;
    }
    
    const zip = new JSZip();
    
    // 转换dataURL为blob的Promise数组
    const promises = croppedImages.map((item, index) => {
        return fetch(item.dataURL)
            .then(response => response.blob())
            .then(blob => {
                zip.file(`cropped_image_${index + 1}.png`, blob);
            });
    });
    
    Promise.all(promises).then(() => {
        zip.generateAsync({ type: 'blob' }).then(content => {
            const link = document.createElement('a');
            link.href = URL.createObjectURL(content);
            link.download = 'cropped_images.zip';
            link.click();
        });
    });
}

// 重置所有
function resetAll() {
    currentImage = null;
    croppedImages = [];
    
    imageInput.value = '';
    previewImage.src = '';
    mainContent.style.display = 'none';
    resultsSection.style.display = 'none';
    
    // 重置参数
    blockWidthInput.value = 200;
    blockHeightInput.value = 200;
    directionSelect.value = 'rows';
    showGridInput.checked = true;
    
    // 清除网格
    const ctx = gridCanvas.getContext('2d');
    ctx.clearRect(0, 0, gridCanvas.width, gridCanvas.height);
    
    // 重置网格偏移
    gridOffsets.horizontal = [];
    gridOffsets.vertical = [];
    
    // 清空信息
    imageInfo.innerHTML = '';
    stats.innerHTML = '';
    resultsInfo.innerHTML = '';
    resultsContainer.innerHTML = '';
}

// 窗口大小改变时更新网格
window.addEventListener('resize', () => {
    if (currentImage && previewImage.complete) {
        setTimeout(updateGrid, 100);
    }
});

// 图片加载完成后更新网格
previewImage.addEventListener('load', () => {
    setTimeout(updateGrid, 100);
});

// 网格拖动处理函数
function handleGridMouseDown(e) {
    if (!currentImage || !showGridInput.checked) return;
    
    const rect = gridCanvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const direction = directionSelect.value;
    const tolerance = 8; // 鼠标捕获网格线的容忍度
    
    // 检查是否点击在网格线附近
    if (direction === 'rows' || direction === 'grid') {
        const blockHeight = parseInt(blockHeightInput.value);
        const scaleY = gridCanvas.height / currentImage.height;
        const scaledBlockHeight = blockHeight * scaleY;
        
        for (let i = 1; i < Math.floor(currentImage.height / blockHeight); i++) {
            const lineY = i * scaledBlockHeight + (gridOffsets.horizontal[i-1] || 0);
            if (Math.abs(y - lineY) < tolerance) {
                isDragging = true;
                dragType = 'horizontal';
                dragIndex = i - 1;
                gridCanvas.style.cursor = 'ns-resize';
                e.preventDefault();
                return;
            }
        }
    }
    
    if (direction === 'columns' || direction === 'grid') {
        const blockWidth = parseInt(blockWidthInput.value);
        const scaleX = gridCanvas.width / currentImage.width;
        const scaledBlockWidth = blockWidth * scaleX;
        
        for (let i = 1; i < Math.floor(currentImage.width / blockWidth); i++) {
            const lineX = i * scaledBlockWidth + (gridOffsets.vertical[i-1] || 0);
            if (Math.abs(x - lineX) < tolerance) {
                isDragging = true;
                dragType = 'vertical';
                dragIndex = i - 1;
                gridCanvas.style.cursor = 'ew-resize';
                e.preventDefault();
                return;
            }
        }
    }
}

function handleGridMouseMove(e) {
    if (!currentImage || !showGridInput.checked) return;
    
    const rect = gridCanvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    if (isDragging) {
        const direction = directionSelect.value;
        
        if (dragType === 'horizontal' && (direction === 'rows' || direction === 'grid')) {
            const blockHeight = parseInt(blockHeightInput.value);
            const scaleY = gridCanvas.height / currentImage.height;
            const scaledBlockHeight = blockHeight * scaleY;
            const baseY = (dragIndex + 1) * scaledBlockHeight;
            
            // 限制拖动范围
            const maxOffset = scaledBlockHeight * 0.8;
            const minOffset = -scaledBlockHeight * 0.8;
            let offset = y - baseY;
            offset = Math.max(minOffset, Math.min(maxOffset, offset));
            
            if (!gridOffsets.horizontal[dragIndex]) {
                gridOffsets.horizontal[dragIndex] = 0;
            }
            gridOffsets.horizontal[dragIndex] = offset;
            
            updateGrid();
            updateStats();
        } else if (dragType === 'vertical' && (direction === 'columns' || direction === 'grid')) {
            const blockWidth = parseInt(blockWidthInput.value);
            const scaleX = gridCanvas.width / currentImage.width;
            const scaledBlockWidth = blockWidth * scaleX;
            const baseX = (dragIndex + 1) * scaledBlockWidth;
            
            // 限制拖动范围
            const maxOffset = scaledBlockWidth * 0.8;
            const minOffset = -scaledBlockWidth * 0.8;
            let offset = x - baseX;
            offset = Math.max(minOffset, Math.min(maxOffset, offset));
            
            if (!gridOffsets.vertical[dragIndex]) {
                gridOffsets.vertical[dragIndex] = 0;
            }
            gridOffsets.vertical[dragIndex] = offset;
            
            updateGrid();
            updateStats();
        }
    } else {
        // 检查鼠标是否悬停在网格线上，改变光标样式
        const direction = directionSelect.value;
        const tolerance = 8;
        let cursor = 'default';
        
        if (direction === 'rows' || direction === 'grid') {
            const blockHeight = parseInt(blockHeightInput.value);
            const scaleY = gridCanvas.height / currentImage.height;
            const scaledBlockHeight = blockHeight * scaleY;
            
            for (let i = 1; i < Math.floor(currentImage.height / blockHeight); i++) {
                const lineY = i * scaledBlockHeight + (gridOffsets.horizontal[i-1] || 0);
                if (Math.abs(y - lineY) < tolerance) {
                    cursor = 'ns-resize';
                    break;
                }
            }
        }
        
        if (cursor === 'default' && (direction === 'columns' || direction === 'grid')) {
            const blockWidth = parseInt(blockWidthInput.value);
            const scaleX = gridCanvas.width / currentImage.width;
            const scaledBlockWidth = blockWidth * scaleX;
            
            for (let i = 1; i < Math.floor(currentImage.width / blockWidth); i++) {
                const lineX = i * scaledBlockWidth + (gridOffsets.vertical[i-1] || 0);
                if (Math.abs(x - lineX) < tolerance) {
                    cursor = 'ew-resize';
                    break;
                }
            }
        }
        
        gridCanvas.style.cursor = cursor;
    }
}

function handleGridMouseUp(e) {
    if (isDragging) {
        isDragging = false;
        dragType = null;
        dragIndex = -1;
        gridCanvas.style.cursor = 'default';
    }
}

// 重置网格偏移
function resetGridOffsets() {
    gridOffsets.horizontal = [];
    gridOffsets.vertical = [];
    updateGrid();
    updateStats();
}

// 全选图片
function selectAllImages() {
    const resultItems = document.querySelectorAll('.result-item img');
    if (resultItems.length === 0) return;
    
    // 创建选择范围
    const selection = window.getSelection();
    const range = document.createRange();
    
    // 选择第一个图片到最后一个图片
    range.setStartBefore(resultItems[0]);
    range.setEndAfter(resultItems[resultItems.length - 1]);
    
    selection.removeAllRanges();
    selection.addRange(range);
    
    // 高亮显示选中的图片
    resultItems.forEach(img => {
        img.parentElement.style.border = '3px solid #667eea';
        img.parentElement.style.boxShadow = '0 0 10px rgba(102, 126, 234, 0.5)';
    });
    
    // 显示成功消息
    showToast('已选中所有图片，您可以使用 Ctrl+C 复制', 'success');
    
    // 3秒后恢复正常样式
    setTimeout(() => {
        resultItems.forEach(img => {
            img.parentElement.style.border = '2px solid transparent';
            img.parentElement.style.boxShadow = '';
        });
    }, 3000);
}

// 复制所有图片到剪贴板
async function copyAllToClipboard() {
    try {
        if (croppedImages.length === 0) {
            showToast('没有可复制的图片', 'error');
            return;
        }
        
        // 转换所有图片为blob
        const blobs = await Promise.all(
            croppedImages.map(async item => {
                const response = await fetch(item.dataURL);
                return await response.blob();
            })
        );
        
        // 使用Clipboard API复制图片
        const clipboardItems = blobs.map(blob => 
            new ClipboardItem({
                [blob.type]: blob
            })
        );
        
        await navigator.clipboard.write(clipboardItems);
        showToast(`已复制 ${croppedImages.length} 张图片到剪贴板`, 'success');
        
    } catch (error) {
        console.error('复制到剪贴板失败:', error);
        showToast('复制失败，您的浏览器可能不支持此功能', 'error');
    }
}

// 显示提示消息
function showToast(message, type = 'info') {
    // 创建提示元素
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
        ${message}
    `;
    
    // 添加到页面
    document.body.appendChild(toast);
    
    // 显示动画
    setTimeout(() => toast.classList.add('show'), 100);
    
    // 自动移除
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => document.body.removeChild(toast), 300);
    }, 3000);
}