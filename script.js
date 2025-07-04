// 全局变量
let currentImage = null;
let croppedImages = [];

// 边界数组驱动系统
let boundariesX = []; // 垂直分割线的X坐标 [0, x1, x2, ..., imageWidth]
let boundariesY = []; // 水平分割线的Y坐标 [0, y1, y2, ..., imageHeight]
const MIN_SLICE = 5;  // 最小块尺寸

// 网格拖动相关变量
let isDragging = false;
let dragType = null; // 'horizontal' 或 'vertical'
let dragIndex = -1;  // 拖动的边界索引

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
const validationWarning = document.getElementById('validationWarning');
const warningText = document.getElementById('warningText');

// 参数元素
const directionSelect = document.getElementById('direction');
const showGridInput = document.getElementById('showGrid');

// 按行模式参数
const rowCountInput = document.getElementById('rowCount');
const rowHeightInput = document.getElementById('rowHeight');

// 按列模式参数
const colCountInput = document.getElementById('colCount');
const colWidthInput = document.getElementById('colWidth');

// 网格模式参数
const blockWidthInput = document.getElementById('blockWidth');
const blockHeightInput = document.getElementById('blockHeight');

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
    directionSelect.addEventListener('change', onDirectionChange);
    showGridInput.addEventListener('change', updateGrid);
    
    // 按行模式参数
    rowCountInput.addEventListener('input', updateFromInputs);
    rowHeightInput.addEventListener('input', updateFromInputs);
    
    // 按列模式参数
    colCountInput.addEventListener('input', updateFromInputs);
    colWidthInput.addEventListener('input', updateFromInputs);
    
    // 网格模式参数
    blockWidthInput.addEventListener('input', updateFromInputs);
    blockHeightInput.addEventListener('input', updateFromInputs);
    
    // 预览图片加载事件
    previewImage.addEventListener('load', updateImageInfo);
    
    // 网格拖动事件
    gridCanvas.addEventListener('mousedown', handleGridMouseDown);
    gridCanvas.addEventListener('mousemove', handleGridMouseMove);
    gridCanvas.addEventListener('mouseup', handleGridMouseUp);
    gridCanvas.addEventListener('mouseleave', handleGridMouseUp);
}

// 方向改变处理
function onDirectionChange() {
    const direction = directionSelect.value;
    
    // 隐藏所有参数组
    document.querySelectorAll('.rows-params').forEach(el => el.style.display = 'none');
    document.querySelectorAll('.cols-params').forEach(el => el.style.display = 'none');
    document.querySelectorAll('.grid-params').forEach(el => el.style.display = 'none');
    
    // 显示对应参数组
    if (direction === 'rows') {
        document.querySelectorAll('.rows-params').forEach(el => el.style.display = 'block');
    } else if (direction === 'columns') {
        document.querySelectorAll('.cols-params').forEach(el => el.style.display = 'block');
    } else {
        document.querySelectorAll('.grid-params').forEach(el => el.style.display = 'block');
    }
    
    updateFromInputs();
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
            
            // 初始化边界
            initializeBoundaries();
            updateImageInfo();
            updateGrid();
        };
        currentImage.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

// 初始化边界数组
function initializeBoundaries() {
    if (!currentImage) return;
    
    const direction = directionSelect.value;
    
    boundariesX = [0, currentImage.width];
    boundariesY = [0, currentImage.height];
    
    if (direction === 'rows') {
        // 按行：根据行数和行高计算水平边界
        const count = Math.max(1, parseInt(rowCountInput.value));
        const height = Math.max(MIN_SLICE, parseInt(rowHeightInput.value));
        
        boundariesY = [0];
        for (let i = 1; i < count; i++) {
            boundariesY.push(Math.min(i * height, currentImage.height - MIN_SLICE));
        }
        boundariesY.push(currentImage.height);
        
    } else if (direction === 'columns') {
        // 按列：根据列数和列宽计算垂直边界
        const count = Math.max(1, parseInt(colCountInput.value));
        const width = Math.max(MIN_SLICE, parseInt(colWidthInput.value));
        
        boundariesX = [0];
        for (let i = 1; i < count; i++) {
            boundariesX.push(Math.min(i * width, currentImage.width - MIN_SLICE));
        }
        boundariesX.push(currentImage.width);
        
    } else {
        // 网格：根据块宽高计算边界
        const blockWidth = Math.max(MIN_SLICE, parseInt(blockWidthInput.value));
        const blockHeight = Math.max(MIN_SLICE, parseInt(blockHeightInput.value));
        
        // 计算垂直边界
        boundariesX = [0];
        for (let x = blockWidth; x < currentImage.width - MIN_SLICE; x += blockWidth) {
            boundariesX.push(x);
        }
        boundariesX.push(currentImage.width);
        
        // 计算水平边界
        boundariesY = [0];
        for (let y = blockHeight; y < currentImage.height - MIN_SLICE; y += blockHeight) {
            boundariesY.push(y);
        }
        boundariesY.push(currentImage.height);
    }
}

// 从输入更新边界
function updateFromInputs() {
    if (!currentImage) return;
    
    initializeBoundaries();
    validateInputs();
    updateGrid();
    updateStats();
}

// 验证输入
function validateInputs() {
    if (!currentImage) return;
    
    const direction = directionSelect.value;
    let isValid = true;
    let warning = '';
    
    if (direction === 'rows') {
        const count = parseInt(rowCountInput.value);
        const height = parseInt(rowHeightInput.value);
        const totalHeight = count * height;
        
        if (totalHeight > currentImage.height + MIN_SLICE) {
            isValid = false;
            warning = `总高度 ${totalHeight}px 超出图片高度 ${currentImage.height}px`;
        } else if (height < MIN_SLICE) {
            isValid = false;
            warning = `行高不能小于 ${MIN_SLICE}px`;
        }
        
    } else if (direction === 'columns') {
        const count = parseInt(colCountInput.value);
        const width = parseInt(colWidthInput.value);
        const totalWidth = count * width;
        
        if (totalWidth > currentImage.width + MIN_SLICE) {
            isValid = false;
            warning = `总宽度 ${totalWidth}px 超出图片宽度 ${currentImage.width}px`;
        } else if (width < MIN_SLICE) {
            isValid = false;
            warning = `列宽不能小于 ${MIN_SLICE}px`;
        }
    }
    
    // 显示或隐藏警告
    if (isValid) {
        validationWarning.style.display = 'none';
        document.getElementById('cropBtn').disabled = false;
    } else {
        validationWarning.style.display = 'block';
        warningText.textContent = warning;
        document.getElementById('cropBtn').disabled = true;
    }
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
    
    // 触发方向改变以显示正确的参数组
    onDirectionChange();
}

// 更新统计信息
function updateStats() {
    if (!currentImage || boundariesX.length < 2 || boundariesY.length < 2) return;
    
    const direction = directionSelect.value;
    const blocksX = boundariesX.length - 1;
    const blocksY = boundariesY.length - 1;
    
    let statsContent = '';
    
    if (direction === 'rows') {
        statsContent = `
            <strong>按行裁剪预览</strong><br>
            行数: ${blocksY}<br>
            总块数: ${blocksY}<br>
            平均块高: ${Math.round((boundariesY[boundariesY.length-1] - boundariesY[0]) / blocksY)}px
        `;
    } else if (direction === 'columns') {
        statsContent = `
            <strong>按列裁剪预览</strong><br>
            列数: ${blocksX}<br>
            总块数: ${blocksX}<br>
            平均块宽: ${Math.round((boundariesX[boundariesX.length-1] - boundariesX[0]) / blocksX)}px
        `;
    } else {
        const totalBlocks = blocksX * blocksY;
        statsContent = `
            <strong>网格裁剪预览</strong><br>
            水平块数: ${blocksX}<br>
            垂直块数: ${blocksY}<br>
            总块数: ${totalBlocks}
        `;
    }
    
    stats.innerHTML = statsContent;
}

// 更新网格显示
function updateGrid() {
    if (!currentImage || !previewImage.complete) return;
    
    const displayWidth = previewImage.offsetWidth;
    const displayHeight = previewImage.offsetHeight;
    
    gridCanvas.width = displayWidth;
    gridCanvas.height = displayHeight;
    gridCanvas.style.width = displayWidth + 'px';
    gridCanvas.style.height = displayHeight + 'px';
    
    if (!showGridInput.checked) {
        const ctx = gridCanvas.getContext('2d');
        ctx.clearRect(0, 0, gridCanvas.width, gridCanvas.height);
        return;
    }
    
    const ctx = gridCanvas.getContext('2d');
    ctx.clearRect(0, 0, gridCanvas.width, gridCanvas.height);
    
    const direction = directionSelect.value;
    const scaleX = displayWidth / currentImage.width;
    const scaleY = displayHeight / currentImage.height;
    
    ctx.strokeStyle = '#667eea';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    
    // 绘制边界线
    if (direction === 'rows' || direction === 'grid') {
        // 绘制水平线（不包括首尾）
        for (let i = 1; i < boundariesY.length - 1; i++) {
            const y = boundariesY[i] * scaleY;
            if (y > 0 && y < displayHeight) {
                ctx.beginPath();
                ctx.moveTo(0, y);
                ctx.lineTo(displayWidth, y);
                ctx.stroke();
            }
        }
    }
    
    if (direction === 'columns' || direction === 'grid') {
        // 绘制垂直线（不包括首尾）
        for (let i = 1; i < boundariesX.length - 1; i++) {
            const x = boundariesX[i] * scaleX;
            if (x > 0 && x < displayWidth) {
                ctx.beginPath();
                ctx.moveTo(x, 0);
                ctx.lineTo(x, displayHeight);
                ctx.stroke();
            }
        }
    }
}

// 网格拖动处理函数
function handleGridMouseDown(e) {
    if (!currentImage || !showGridInput.checked) return;
    
    const rect = gridCanvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const direction = directionSelect.value;
    const tolerance = 10;
    const scaleX = gridCanvas.width / currentImage.width;
    const scaleY = gridCanvas.height / currentImage.height;
    
    // 检查水平线
    if (direction === 'rows' || direction === 'grid') {
        for (let i = 1; i < boundariesY.length - 1; i++) {
            const lineY = boundariesY[i] * scaleY;
            if (Math.abs(y - lineY) < tolerance) {
                isDragging = true;
                dragType = 'horizontal';
                dragIndex = i;
                gridCanvas.style.cursor = 'ns-resize';
                e.preventDefault();
                return;
            }
        }
    }
    
    // 检查垂直线
    if (direction === 'columns' || direction === 'grid') {
        for (let i = 1; i < boundariesX.length - 1; i++) {
            const lineX = boundariesX[i] * scaleX;
            if (Math.abs(x - lineX) < tolerance) {
                isDragging = true;
                dragType = 'vertical';
                dragIndex = i;
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
        const scaleX = gridCanvas.width / currentImage.width;
        const scaleY = gridCanvas.height / currentImage.height;
        
        if (dragType === 'horizontal') {
            // 拖动水平线
            const newY = y / scaleY;
            const minY = boundariesY[dragIndex - 1] + MIN_SLICE;
            const maxY = boundariesY[dragIndex + 1] - MIN_SLICE;
            
            boundariesY[dragIndex] = Math.max(minY, Math.min(maxY, newY));
            updateGrid();
            updateStats();
            
        } else if (dragType === 'vertical') {
            // 拖动垂直线
            const newX = x / scaleX;
            const minX = boundariesX[dragIndex - 1] + MIN_SLICE;
            const maxX = boundariesX[dragIndex + 1] - MIN_SLICE;
            
            boundariesX[dragIndex] = Math.max(minX, Math.min(maxX, newX));
            updateGrid();
            updateStats();
        }
    } else {
        // 检查鼠标悬停，改变光标
        const direction = directionSelect.value;
        const tolerance = 10;
        const scaleX = gridCanvas.width / currentImage.width;
        const scaleY = gridCanvas.height / currentImage.height;
        let cursor = 'default';
        
        // 检查水平线
        if (direction === 'rows' || direction === 'grid') {
            for (let i = 1; i < boundariesY.length - 1; i++) {
                const lineY = boundariesY[i] * scaleY;
                if (Math.abs(y - lineY) < tolerance) {
                    cursor = 'ns-resize';
                    break;
                }
            }
        }
        
        // 检查垂直线
        if (cursor === 'default' && (direction === 'columns' || direction === 'grid')) {
            for (let i = 1; i < boundariesX.length - 1; i++) {
                const lineX = boundariesX[i] * scaleX;
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

// 裁剪图片
function cropImages() {
    if (!currentImage) return;
    
    const cropBtn = document.getElementById('cropBtn');
    const originalText = cropBtn.innerHTML;
    cropBtn.innerHTML = '<span class="loading"></span> 裁剪中...';
    cropBtn.disabled = true;
    
    setTimeout(() => {
        croppedImages = [];
        
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        let index = 0;
        
        // 遍历所有区域进行裁剪
        for (let yi = 0; yi < boundariesY.length - 1; yi++) {
            for (let xi = 0; xi < boundariesX.length - 1; xi++) {
                const x = Math.round(boundariesX[xi]);
                const y = Math.round(boundariesY[yi]);
                const w = Math.round(boundariesX[xi + 1] - boundariesX[xi]);
                const h = Math.round(boundariesY[yi + 1] - boundariesY[yi]);
                
                if (w > 0 && h > 0) {
                    canvas.width = w;
                    canvas.height = h;
                    
                    ctx.clearRect(0, 0, w, h);
                    ctx.drawImage(currentImage, x, y, w, h, 0, 0, w, h);
                    
                    const dataURL = canvas.toDataURL('image/png');
                    croppedImages.push({
                        dataURL: dataURL,
                        index: index,
                        x: x,
                        y: y,
                        width: w,
                        height: h
                    });
                    index++;
                }
            }
        }
        
        displayResults();
        
        cropBtn.innerHTML = originalText;
        cropBtn.disabled = false;
    }, 100);
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
            <div class="item-actions">
                <button class="btn btn-secondary download-btn" onclick="copySingleImageToClipboard(${index})">
                    <i class="fas fa-copy"></i> 复制
                </button>
                <button class="btn btn-primary download-btn" onclick="downloadSingle(${index})">
                    <i class="fas fa-download"></i> 下载
                </button>
            </div>
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
        }, index * 200);
    });
}

// 打包下载
function downloadZip() {
    if (typeof JSZip === 'undefined') {
        alert('正在加载压缩库，请稍后再试...');
        return;
    }
    
    const zip = new JSZip();
    
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

// 重置网格偏移
function resetGridOffsets() {
    initializeBoundaries();
    updateGrid();
    updateStats();
}

// 全选图片
function selectAllImages() {
    const resultItems = document.querySelectorAll('.result-item img');
    if (resultItems.length === 0) return;
    
    const selection = window.getSelection();
    const range = document.createRange();
    
    range.setStartBefore(resultItems[0]);
    range.setEndAfter(resultItems[resultItems.length - 1]);
    
    selection.removeAllRanges();
    selection.addRange(range);
    
    resultItems.forEach(img => {
        img.parentElement.style.border = '3px solid #667eea';
        img.parentElement.style.boxShadow = '0 0 10px rgba(102, 126, 234, 0.5)';
    });
    
    showToast('已选中所有图片，您可以使用 Ctrl+C 复制', 'success');
    
    setTimeout(() => {
        resultItems.forEach(img => {
            img.parentElement.style.border = '2px solid transparent';
            img.parentElement.style.boxShadow = '';
        });
    }, 3000);
}

// 复制当前选择的图片到剪贴板
async function copyAllToClipboard() {
    try {
        if (croppedImages.length === 0) {
            showToast('没有可复制的图片', 'error');
            return;
        }
        
        if (croppedImages.length === 1) {
            await copySingleImageToClipboard(0);
            return;
        }
        
        await copyMergedImageToClipboard();
        
    } catch (error) {
        console.error('复制到剪贴板失败:', error);
        showToast('复制失败，请尝试单独复制图片', 'error');
    }
}

// 复制单张图片到剪贴板
async function copySingleImageToClipboard(index) {
    try {
        const item = croppedImages[index];
        const response = await fetch(item.dataURL);
        const blob = await response.blob();
        
        const clipboardItem = new ClipboardItem({
            [blob.type]: blob
        });
        
        await navigator.clipboard.write([clipboardItem]);
        showToast(`图片 ${index + 1} 已复制到剪贴板`, 'success');
        
    } catch (error) {
        console.error('复制单张图片失败:', error);
        showToast('复制失败，您的浏览器可能不支持此功能', 'error');
    }
}

// 复制合并后的图片到剪贴板
async function copyMergedImageToClipboard() {
    try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        const maxHeight = Math.max(...croppedImages.map(item => item.height));
        const totalWidth = croppedImages.reduce((sum, item) => sum + item.width, 0);
        
        canvas.width = totalWidth;
        canvas.height = maxHeight;
        
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        let currentX = 0;
        for (let i = 0; i < croppedImages.length; i++) {
            const img = new Image();
            await new Promise((resolve) => {
                img.onload = () => {
                    ctx.drawImage(img, currentX, 0, croppedImages[i].width, croppedImages[i].height);
                    currentX += croppedImages[i].width;
                    resolve();
                };
                img.src = croppedImages[i].dataURL;
            });
        }
        
        canvas.toBlob(async (blob) => {
            const clipboardItem = new ClipboardItem({
                [blob.type]: blob
            });
            
            await navigator.clipboard.write([clipboardItem]);
            showToast(`已复制合并图片到剪贴板 (${croppedImages.length} 张图片)`, 'success');
        });
        
    } catch (error) {
        console.error('复制合并图片失败:', error);
        showToast('复制失败，请尝试单独下载图片', 'error');
    }
}

// 显示提示消息
function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
        ${message}
    `;
    
    document.body.appendChild(toast);
    
    setTimeout(() => toast.classList.add('show'), 100);
    
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => document.body.removeChild(toast), 300);
    }, 3000);
}

// 重置所有
function resetAll() {
    currentImage = null;
    croppedImages = [];
    boundariesX = [];
    boundariesY = [];
    
    imageInput.value = '';
    previewImage.src = '';
    mainContent.style.display = 'none';
    resultsSection.style.display = 'none';
    
    // 重置参数
    directionSelect.value = 'rows';
    rowCountInput.value = 3;
    rowHeightInput.value = 100;
    colCountInput.value = 3;
    colWidthInput.value = 100;
    blockWidthInput.value = 200;
    blockHeightInput.value = 200;
    showGridInput.checked = true;
    
    // 隐藏警告
    validationWarning.style.display = 'none';
    
    // 清除网格
    const ctx = gridCanvas.getContext('2d');
    ctx.clearRect(0, 0, gridCanvas.width, gridCanvas.height);
    
    // 清空信息
    imageInfo.innerHTML = '';
    stats.innerHTML = '';
    resultsInfo.innerHTML = '';
    resultsContainer.innerHTML = '';
    
    // 触发方向改变
    onDirectionChange();
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