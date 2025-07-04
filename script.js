// 全局变量
let currentImage = null;
let croppedImages = [];

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
    
    let blocksX, blocksY, totalBlocks;
    
    if (direction === 'horizontal') {
        blocksX = Math.floor(currentImage.width / blockWidth);
        blocksY = Math.floor(currentImage.height / blockHeight);
    } else {
        blocksX = Math.floor(currentImage.width / blockWidth);
        blocksY = Math.floor(currentImage.height / blockHeight);
    }
    
    totalBlocks = blocksX * blocksY;
    
    stats.innerHTML = `
        <strong>裁剪预览</strong><br>
        水平块数: ${blocksX}<br>
        垂直块数: ${blocksY}<br>
        总块数: ${totalBlocks}<br>
        每块尺寸: ${blockWidth} × ${blockHeight}px
    `;
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
    
    // 计算缩放比例
    const scaleX = displayWidth / currentImage.width;
    const scaleY = displayHeight / currentImage.height;
    
    const scaledBlockWidth = blockWidth * scaleX;
    const scaledBlockHeight = blockHeight * scaleY;
    
    ctx.strokeStyle = '#667eea';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    
    // 绘制垂直线
    for (let x = scaledBlockWidth; x < displayWidth; x += scaledBlockWidth) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, displayHeight);
        ctx.stroke();
    }
    
    // 绘制水平线
    for (let y = scaledBlockHeight; y < displayHeight; y += scaledBlockHeight) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(displayWidth, y);
        ctx.stroke();
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
        
        const blocksX = Math.floor(currentImage.width / blockWidth);
        const blocksY = Math.floor(currentImage.height / blockHeight);
        
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = blockWidth;
        canvas.height = blockHeight;
        
        let index = 0;
        
        if (direction === 'horizontal') {
            // 从左到右，从上到下
            for (let y = 0; y < blocksY; y++) {
                for (let x = 0; x < blocksX; x++) {
                    cropSingleImage(ctx, canvas, x * blockWidth, y * blockHeight, blockWidth, blockHeight, index++);
                }
            }
        } else {
            // 从上到下，从左到右
            for (let x = 0; x < blocksX; x++) {
                for (let y = 0; y < blocksY; y++) {
                    cropSingleImage(ctx, canvas, x * blockWidth, y * blockHeight, blockWidth, blockHeight, index++);
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
    ctx.clearRect(0, 0, width, height);
    ctx.drawImage(currentImage, x, y, width, height, 0, 0, width, height);
    
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
    directionSelect.value = 'horizontal';
    showGridInput.checked = true;
    
    // 清除网格
    const ctx = gridCanvas.getContext('2d');
    ctx.clearRect(0, 0, gridCanvas.width, gridCanvas.height);
    
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