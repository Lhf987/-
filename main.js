// 地图初始化
let map = null;
let marker = null;
let polyline = null;

// 存储图表实例的全局变量
let heartRateChart = null;
let groundTimeChart = null;

// 在全局变量区域添加
let mouseTool = null;
let geofence = null;
let isDrawing = false;
let warningAlert = null;
let circle = null;
let clickListener = null; // 存储点击事件监听器
let FENCE_RADIUS = 200; // 安全区域半径（米）

// 添加全局变量
let locationUpdateInterval = null; // 添加位置更新定时器变量

// 初始化函数
function initMap() {
    // 确保地图容器存在
    const mapContainer = document.getElementById('map-container');
    if (!mapContainer) {
        console.error('找不到地图容器');
        return;
    }

    try {
        // 初始化地图，禁用双击缩放
        map = new AMap.Map('map-container', {
            zoom: 15,
            center: [113.269773, 35.189266],
            viewMode: '2D',
            doubleClickZoom: false  // 禁用双击缩放
        });

        // 等待地图加载完成后再初始化其他功能
        map.on('complete', () => {
            console.log('地图加载完成');

            // 初始化标记点和轨迹线
            initMarker();
            initPolyline();

            // 初始化地图控件
            initMapControls();

            // 初始化电子栅栏控制
            initGeofenceControls();
        });

    } catch (error) {
        console.error('地图初始化失败:', error);
    }
}

// 添加初始化标记点函数
function initMarker() {
    // 自定义标记点样式
    const markerContent = `
        <div class="custom-marker">
            <div class="marker-pulse"></div>
            <div class="marker-icon">
                <i class="fas fa-map-marker-alt"></i>
            </div>
        </div>
    `;

    // 创建自定义标记
    marker = new AMap.Marker({
        position: [113.269773, 35.189266],
        content: markerContent,
        anchor: 'bottom-center',
        offset: new AMap.Pixel(0, 0)
    });

    // 将标记添加到地图
    marker.setMap(map);
}

// 添加初始化轨迹线函数
function initPolyline() {
    try {
        polyline = new AMap.Polyline({
            path: [[113.269773, 35.189266]],  // 初始位置
            strokeColor: "#3366FF",
            strokeWeight: 6,
            strokeOpacity: 0.8,
            strokeStyle: "solid",
            lineJoin: 'round',
            lineCap: 'round',
            showDir: true,
            dirColor: '#3366FF'
        });

        // 将轨迹线添加到地图
        polyline.setMap(map);
    } catch (error) {
        console.error('初始化轨迹线失败:', error);
    }
}

// 添加初始化地图控件函数
function initMapControls() {
    // 添加地图控件事件
    document.getElementById('zoomIn').addEventListener('click', () => {
        const currentZoom = map.getZoom();
        if (currentZoom < 18) {
            map.setZoom(currentZoom + 1);
        }
    });

    document.getElementById('zoomOut').addEventListener('click', () => {
        const currentZoom = map.getZoom();
        if (currentZoom > 3) {
            map.setZoom(currentZoom - 1);
        }
    });

    document.getElementById('locate').addEventListener('click', () => {
        const loadingOverlay = document.querySelector('.loading-overlay');
        if (loadingOverlay) {
            loadingOverlay.style.display = 'flex';
        }

        // 重置地图视角到当前位置
        if (marker) {
            const position = marker.getPosition();
            map.setZoomAndCenter(15, position, false, {
                duration: 800,
                easing: 'ease-in-out'
            });
        }

        setTimeout(() => {
            if (loadingOverlay) {
                loadingOverlay.style.display = 'none';
            }
        }, 500);
    });
}

// 修改电子栅栏控制函数
function initGeofenceControls() {
    const drawFenceBtn = document.getElementById('drawFenceBtn');
    const clearFenceBtn = document.getElementById('clearFenceBtn');

    if (!drawFenceBtn || !clearFenceBtn) {
        console.error('找不到电子栅栏按钮');
        return;
    }

    // 添加设置安全区域事件监听器
    drawFenceBtn.addEventListener('click', () => {
        console.log('点击设置安全区域按钮');

        // 如果正在绘制，则停止绘制
        if (isDrawing) {
            stopDrawing();
            return;
        }

        // 开始绘制
        startDrawing();
    });

    // 添加清除区域事件监听器
    clearFenceBtn.addEventListener('click', () => {
        console.log('点击清除区域按钮');
        clearFence();
    });
}

// 修改开始绘制函数
function startDrawing() {
    if (!map) {
        console.error('地图未初始化');
        return;
    }

    console.log('开始绘制模式');
    isDrawing = true;

    // 更新按钮状态
    const drawFenceBtn = document.getElementById('drawFenceBtn');
    if (drawFenceBtn) {
        drawFenceBtn.style.opacity = '0.6';
        drawFenceBtn.innerHTML = '<i class="fas fa-times"></i> 取消设置';
    }

    // 改变鼠标样式
    map.setDefaultCursor('crosshair');

    // 移除可能存在的旧监听器
    if (clickListener) {
        map.off('click', clickListener);
    }

    // 创建新的点击事件监听器
    clickListener = function (e) {
        // 移除 e.preventDefault() 调用，因为高德地图的事件对象没有这个方法
        if (!isDrawing) return;

        console.log('地图点击事件触发', e.lnglat);
        createCircleFence(e.lnglat);
        stopDrawing();
    };

    // 绑定点击事件
    map.on('click', clickListener);
}

// 修改创建圆形围栏函数
function createCircleFence(center) {
    console.log('创建圆形围栏', center);

    try {
        // 清除已有的围栏
        clearFence();

        const lng = parseFloat(center.lng || center.getLng());
        const lat = parseFloat(center.lat || center.getLat());

        console.log('使用的经纬度:', lng, lat);

        // 创建圆形围栏，添加新的样式
        const circleOptions = {
            center: new AMap.LngLat(lng, lat),
            radius: FENCE_RADIUS,
            strokeColor: "#4CAF50",
            strokeWeight: 2,
            strokeOpacity: 0.8,
            fillColor: '#4CAF50',
            fillOpacity: 0.2,
            zIndex: 50,
            strokeStyle: 'dashed', // 添加虚线样式
            strokeDasharray: [5, 5] // 设置虚线间隔
        };

        circle = new AMap.Circle(circleOptions);
        circle.setMap(map);
        geofence = circle;

        console.log('围栏创建成功');

        // 调整地图视野以更好地显示围栏
        const bounds = circle.getBounds();
        map.setBounds(bounds, {
            padding: [50, 50, 50, 50]
        });

        // 自动调整缩放级别以确保围栏完全可见
        const zoom = map.getZoom();
        if (zoom < 15) { // 如果缩放级别太小
            map.setZoom(15);
        } else if (zoom > 17) { // 如果缩放级别太大
            map.setZoom(17);
        }

        startGeofenceMonitoring();

    } catch (error) {
        console.error('创建围栏失败:', error);
        console.error('错误详情:', error.stack);
    }
}

// 修改清除围栏函数
function clearFence() {
    console.log('清除围栏');

    try {
        // 停止绘制模式
        stopDrawing();

        // 清除圆形围栏
        if (circle) {
            circle.setMap(null);
            map.remove(circle);
            circle = null;
        }

        // 清除电子围栏对象
        geofence = null;

        // 重置状态
        updateFenceStatus(true);
        hideWarningAlert();

    } catch (error) {
        console.error('清除围栏失败:', error);
    }
}

// 修��停止绘制函数
function stopDrawing() {
    console.log('停止绘制模式');
    isDrawing = false;

    // 更新按钮状态
    const drawFenceBtn = document.getElementById('drawFenceBtn');
    if (drawFenceBtn) {
        drawFenceBtn.style.opacity = '1';
        drawFenceBtn.innerHTML = '<i class="fas fa-circle"></i> 设置安全区域';
    }

    // 恢复默认鼠标样式
    if (map) {
        map.setDefaultCursor('');
    }

    // 移除点击事件监听器
    if (clickListener) {
        map.off('click', clickListener);
        clickListener = null;
    }
}

// 修改位置监测函数
function startGeofenceMonitoring() {
    if (!geofence || !marker) {
        console.log('无法开始监测：围栏或标记点不存在');
        return;
    }

    console.log('开始位置监测');

    // 清除可能存在的旧监测定时器
    if (window.geofenceMonitorInterval) {
        clearInterval(window.geofenceMonitorInterval);
    }

    // 开始新的监测
    window.geofenceMonitorInterval = setInterval(() => {
        if (!geofence || !marker) {
            clearInterval(window.geofenceMonitorInterval);
            return;
        }

        try {
            const position = marker.getPosition();
            const center = geofence.getCenter();
            const distance = AMap.GeometryUtil.distance(
                [position.getLng(), position.getLat()],
                [center.getLng(), center.getLat()]
            );
            const isInside = distance <= geofence.getRadius();

            console.log('位置监测:', isInside ? '在区域内' : '在区域外');

            updateFenceStatus(isInside);

            if (!isInside) {
                showWarningAlert();
            } else {
                hideWarningAlert();
            }
        } catch (error) {
            console.error('位置监测出错:', error);
        }
    }, 1000);
}

// 在页面卸载时清理定时器
window.addEventListener('beforeunload', () => {
    if (window.geofenceMonitorInterval) {
        clearInterval(window.geofenceMonitorInterval);
    }
    if (locationUpdateInterval) {
        clearInterval(locationUpdateInterval);
    }
});

// 更新栅栏状态显示
function updateFenceStatus(isInside) {
    const statusDot = document.querySelector('.status-dot');
    const statusText = document.querySelector('.status-text');

    if (isInside) {
        statusDot.classList.remove('warning');
        statusText.textContent = '安全区域内';
        statusText.style.color = '#333';
    } else {
        statusDot.classList.add('warning');
        statusText.textContent = '已离开安全区域！';
        statusText.style.color = '#ff4081';
    }
}

// 显示警告提示
function showWarningAlert() {
    if (warningAlert) return;

    warningAlert = document.createElement('div');
    warningAlert.className = 'warning-alert';
    warningAlert.innerHTML = `
        <i class="fas fa-exclamation-triangle"></i>
        <span>警告：监护对象已离开安全区域！</span>
    `;

    document.body.appendChild(warningAlert);

    // 播放警告音效
    playWarningSound();
}

// 隐藏警告提示
function hideWarningAlert() {
    if (warningAlert) {
        warningAlert.remove();
        warningAlert = null;
    }
}

// 播放警告音效
function playWarningSound() {
    const audio = new Audio('data:audio/wav;base64,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qJrx4KOQjahZxWbcZgztj2c49nKmkId44S71j0c8eV9yDK6uPRzx5X18eDvjvQ6yKo9ZSS6l//8elePK/Lf//IInrOF/FvDoADYAGBMGb7FtErm5MXMlmPAJQVgWta7Zx2go+8xJ0UiCb8LHHdftWyLJE0QIAIsI+UbXu67dZMjmgDGCGl1H+vpF4NSDckSIkk7Vd+sxEhBQMRU8j/12UIRhzSaUdQ+rQU5kGeFxm+hb1oh6pWWmv3uvmReDl0UnvtapVaIzo1jZbf/pD6ElLqSX+rUmOQNpJFa/r+sa4e/pBlAABoAAAAA3CUgShLdGIxsY7AUABPRrgCABdDuQ5GC7DqPQCgbbJUAoRSUj+NIEig0YfyWUho1VBBBA//uQZB4ABZx5zfMakeAAAAmwAAAAF5F3P0w9GtAAACfAAAAAwLhMDmAYWMgVEG1U0FIGCBgXBXAtfMH10000EEEEEECUBYln03TTTdNBDZopopYvrTTdNa325mImNg3TTPV9q3pmY0xoO6bv3r00y+IDGid/9aaaZTGMuj9mpu9Mpio1dXrr5HERTZSmqU36A3CumzN/9Robv/Xx4v9ijkSRSNLQhAWumap82WRSBUqXStV/YcS+XVLnSS+WLDroqArFkMEsAS+eWmrUzrO0oEmE40RlMZ5+ODIkAyKAGUwZ3mVKmcamcJnMW26MRPgUw6j+LkhyHGVGYjSUUKNpuJUQoOIAyDvEyG8S5yfK6dhZc0Tx1KI/gviKL6qvvFs1+bWtaz58uUNnryq6kt5RzOCkPWlVqVX2a/EEBUdU1KrXLf40GoiiFXK///qpoiDXrOgqDR38JB0bw7SoL+ZB9o1RCkQjQ2CBYZKd/+VJxZRRZlqSkKiws0WFxUyCwsKiMy7hUVFhIaCrNQsKkTIsLivwKKigsj8XYlwt/WKi2N4d//uQRCSAAjURNIHpMZBGYiaQPSYyAAABLAAAAAAAACWAAAAApUF/Mg+0aohSIRobBAsMlO//Kk4soosy1JSFRYWaLC4qZBYWFRGZdwqKiwkNBVmoWFSJkWFxX4FFRQWR+LsS4W/rFRb/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////VEFHAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAU291bmRib3kuZGUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAMjAwNGh0dHA6Ly93d3cuc291bmRib3kuZGUAAAAAAAAAACU=');
    audio.play();
}

// 更新位置信息函数优化
function updateLocation(position) {
    if (!marker || !map || !polyline) {
        console.log('更新位置失败：组件未初始化');
        return;
    }

    try {
        const { longitude, latitude } = position;

        // 验证经纬度是否有效
        if (!isValidCoordinate(longitude, latitude)) {
            console.error('无效的坐标:', longitude, latitude);
            return;
        }

        const newPos = [longitude, latitude];

        // 平滑移动标记点
        marker.moveTo(newPos, {
            duration: 1000,
            delay: 0
        });

        // 更新轨迹
        let path = polyline.getPath();
        if (!Array.isArray(path)) {
            path = [];
        }

        if (path.length > 0) {
            const lastPos = path[path.length - 1];
            // 验证最后一个点的坐标
            if (Array.isArray(lastPos) && lastPos.length === 2) {
                if (path.length > 100) {
                    path = path.slice(-100);
                }

                // 创建过渡画点
                const steps = 5;
                for (let i = 1; i <= steps; i++) {
                    const progress = i / steps;
                    const interpolatedLng = lastPos[0] + (newPos[0] - lastPos[0]) * progress;
                    const interpolatedLat = lastPos[1] + (newPos[1] - lastPos[1]) * progress;

                    // 验证插值坐标
                    if (isValidCoordinate(interpolatedLng, interpolatedLat)) {
                        path.push([interpolatedLng, interpolatedLat]);
                    }
                }
            }
        } else {
            path = [newPos];
        }

        // 设置新的路径
        polyline.setPath(path);

        // 平滑移动地图中心
        map.setCenter(newPos, true, {
            duration: 1000,
            easing: 'ease-in-out'
        });

        // 如果有电子围栏，检查位置
        if (geofence) {
            const isInside = geofence.contains(newPos);
            updateFenceStatus(isInside);
            if (!isInside) {
                showWarningAlert();
            } else {
                hideWarningAlert();
            }
        }

    } catch (error) {
        console.error('更新位置时出错:', error);
    }
}

// 添加坐标验证函数
function isValidCoordinate(lng, lat) {
    return (
        typeof lng === 'number' &&
        typeof lat === 'number' &&
        !isNaN(lng) &&
        !isNaN(lat) &&
        lng >= -180 &&
        lng <= 180 &&
        lat >= -90 &&
        lat <= 90
    );
}

// 修改模拟位置更新函数
function simulateLocationUpdate() {
    console.log('开始模拟位置更新');

    // 清除可能存在的旧定时器
    if (locationUpdateInterval) {
        clearInterval(locationUpdateInterval);
    }

    // 初始位置
    const basePosition = {
        longitude: 113.269773,
        latitude: 35.189266
    };

    // 立即更新一次位置
    updateLocation(basePosition);

    // 设置定时更新
    locationUpdateInterval = setInterval(() => {
        try {
            // 减小随机偏移量，使移动范围更合理
            const randomOffset = 0.0002; // 从0.0005改为0.0002
            const mockPosition = {
                longitude: basePosition.longitude + (Math.random() * 2 - 1) * randomOffset,
                latitude: basePosition.latitude + (Math.random() * 2 - 1) * randomOffset
            };

            if (isValidCoordinate(mockPosition.longitude, mockPosition.latitude)) {
                console.log('模拟位置更新:', mockPosition);
                updateLocation(mockPosition);
            } else {
                console.error('生成了无效的模拟坐标');
            }
        } catch (error) {
            console.error('模拟位置更新出错:', error);
        }
    }, 5000);
}

// 添加标记点和轨迹线的样式
const markerStyle = document.createElement('style');
markerStyle.textContent = `
    .custom-marker {
        position: relative;
        width: 32px;
        height: 32px;
    }

    .marker-icon {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        color: #ff4081;
        font-size: 32px;
        filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));
        z-index: 2;
    }

    .marker-pulse {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: 16px;
        height: 16px;
        background: rgba(255, 64, 129, 0.3);
        border-radius: 50%;
        animation: pulse 1.5s ease-in-out infinite;
    }

    @keyframes pulse {
        0% {
            transform: translate(-50%, -50%) scale(1);
            opacity: 1;
        }
        100% {
            transform: translate(-50%, -50%) scale(3);
            opacity: 0;
        }
    }
`;
document.head.appendChild(markerStyle);

// 页面加载时初始化
document.addEventListener('DOMContentLoaded', () => {
    try {
        // 初始化页面切换功能
        initPageSwitching();

        // 初始化地图
        initMap();

        // 确保地图加载完成后再启动位置模拟
        if (map) {
            map.on('complete', () => {
                simulateLocationUpdate();
            });
        }

        // 初始化健康监测图表
        initHeartRateChart();
        initGroundTimeChart();

        // 初始化智能助手
        const voiceAssistant = new VoiceAssistant();

    } catch (error) {
        console.error('初始化失败:', error);
        alert('页面加载失败，请刷新重试');
    }
});

// 修改页面切换初始化函数
function initPageSwitching() {
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        item.addEventListener('click', () => {
            const pageId = item.dataset.page;
            if (pageId) {
                // 隐藏所有页面
                document.querySelectorAll('.page').forEach(page => {
                    page.style.display = 'none';
                });

                // 显示选中的页面
                const targetPage = document.getElementById(pageId);
                if (targetPage) {
                    targetPage.style.display = 'block';
                }

                // 更新导航项状态
                navItems.forEach(nav => nav.classList.remove('active'));
                item.classList.add('active');

                // 如果切换到地图页面，重新调整地图大小
                if (pageId === 'map-page' && map) {
                    setTimeout(() => {
                        map.resize();
                    }, 100);
                }
            }
        });
    });
}

// 页面卸载时清理
window.addEventListener('beforeunload', () => {
    if (locationUpdateInterval) {
        clearInterval(locationUpdateInterval);
    }
});

// 修改心率图表初始化函数
function initHeartRateChart() {
    // 如果已存在实例，先销毁
    if (heartRateChart) {
        heartRateChart.dispose();
    }

    const chartContainer = document.getElementById('heart-rate-chart');
    if (!chartContainer) return;

    // 确保容器有正确的尺寸
    chartContainer.style.width = '100%';
    chartContainer.style.height = '220px';

    heartRateChart = echarts.init(chartContainer);
    const option = {
        grid: {
            top: 20,
            right: 20, // 增加右边距
            bottom: 20,
            left: 40,  // 增加左边距
            containLabel: true
        },
        xAxis: {
            type: 'category',
            data: ['0', '3', '6', '9', '12', '15', '18', '21', '24'],
            boundaryGap: false,
            axisLine: {
                lineStyle: {
                    color: '#999'
                }
            },
            axisLabel: {
                fontSize: 12,
                color: '#666'
            }
        },
        yAxis: {
            type: 'value',
            min: 50,
            max: 150,
            interval: 20,
            axisLine: {
                show: false
            },
            axisLabel: {
                fontSize: 12,
                color: '#666'
            },
            splitLine: {
                lineStyle: {
                    color: '#eee'
                }
            }
        },
        series: [{
            data: [85, 115, 55, 75, 95, 85, 90, 140, 72],
            type: 'line',
            smooth: true,
            symbolSize: 6,
            lineStyle: {
                width: 2,
                color: '#ff4081'
            },
            itemStyle: {
                color: '#ff4081',
                borderWidth: 2,
                borderColor: '#fff'
            },
            areaStyle: {
                color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [{
                    offset: 0,
                    color: 'rgba(255, 64, 129, 0.2)'
                }, {
                    offset: 1,
                    color: 'rgba(255, 64, 129, 0)'
                }])
            }
        }]
    };
    heartRateChart.setOption(option);
}

// 修改触地时间图表初始化函数
function initGroundTimeChart() {
    // 如果已存在实例，先销毁
    if (groundTimeChart) {
        groundTimeChart.dispose();
    }

    const chartContainer = document.getElementById('ground-time-chart');
    if (!chartContainer) return;

    // 确保容器有正确的尺寸
    chartContainer.style.width = '100%';
    chartContainer.style.height = '150px';

    groundTimeChart = echarts.init(chartContainer);

    // 生成更真实的数据
    const baseValue = 500;
    const data = Array.from({ length: 48 }, (_, i) => {
        return [
            i * 0.5,
            baseValue + Math.random() * 100 - 50
        ];
    });

    const option = {
        grid: {
            top: 10,
            right: 20, // 增加右边距
            bottom: 20,
            left: 40,  // 增加左边距
            containLabel: true
        },
        xAxis: {
            type: 'value',
            min: 0,
            max: 24,
            interval: 3,
            axisLine: {
                lineStyle: {
                    color: '#999'
                }
            },
            axisLabel: {
                fontSize: 12,
                color: '#666'
            },
            splitLine: {
                show: false
            }
        },
        yAxis: {
            type: 'value',
            min: 400,
            max: 600,
            interval: 50,
            axisLine: {
                show: false
            },
            axisLabel: {
                fontSize: 12,
                color: '#666'
            },
            splitLine: {
                lineStyle: {
                    color: '#eee',
                    type: 'dashed'
                }
            }
        },
        series: [{
            type: 'scatter',
            symbolSize: 8,
            data: data,
            itemStyle: {
                color: '#4CAF50',
                opacity: 0.7
            }
        }, {
            type: 'line',
            smooth: true,
            showSymbol: false,
            data: data,
            lineStyle: {
                width: 1,
                color: '#4CAF50',
                opacity: 0.3
            }
        }]
    };
    groundTimeChart.setOption(option);
}

// 添加窗口大小改变时的处理函数
function handleResize() {
    if (heartRateChart) {
        heartRateChart.resize();
    }
    if (groundTimeChart) {
        groundTimeChart.resize();
    }
}

// 添加窗口大小改变事件监听
window.addEventListener('resize', handleResize);

// 语音助手功能
class VoiceAssistant {
    constructor() {
        this.chatContainer = document.getElementById('chatContainer');
        this.messageInput = document.getElementById('messageInput');
        this.sendButton = document.getElementById('sendButton');
        this.quickReplyButtons = document.querySelectorAll('.quick-reply-btn');

        // 初始化事件监听
        this.initializeAssistant();
    }

    initializeAssistant() {
        // 发送按钮点击事件
        this.sendButton.addEventListener('click', () => {
            this.handleUserInput();
        });

        // 输入框回车事件
        this.messageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.handleUserInput();
            }
        });

        // 快捷回复按钮事件
        this.quickReplyButtons.forEach(button => {
            button.addEventListener('click', () => {
                const text = button.textContent;
                this.addMessage(text, 'user');
                this.processUserInput(text);
            });
        });
    }

    addMessage(text, type) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `chat-message ${type}-message`;

        const bubble = document.createElement('div');
        bubble.className = 'message-bubble';
        bubble.textContent = text;

        messageDiv.appendChild(bubble);
        this.chatContainer.appendChild(messageDiv);
        this.chatContainer.scrollTop = this.chatContainer.scrollHeight;
    }

    async handleUserInput() {
        const text = this.messageInput.value.trim();
        if (!text) return;

        // 显示用户消息
        this.addMessage(text, 'user');

        // 清空输入框
        this.messageInput.value = '';

        // 处理用户输入
        await this.processUserInput(text);
    }

    async processUserInput(text) {
        // 显示正在输入状态
        this.addMessage('正在思考...', 'assistant');

        let response;
        // 根据关键词处理简单问题
        if (text.includes('几点') || text.includes('时间')) {
            const now = new Date();
            response = `现在是${now.getHours()}点${now.getMinutes()}分。`;
        } else if (text.includes('天气')) {
            response = '今天天气晴朗，气温7-14度，建议穿外套出门。';
        } else if (text.includes('穿')) {
            response = '今天天气转凉，建议穿长袖外套，注意保暖。';
        } else {
            response = '抱歉，我现在还不能理解这个问题。请试试其他问题，比如问我时间或天气。';
        }

        // 移除"正在思考"消息
        this.chatContainer.removeChild(this.chatContainer.lastChild);

        // 显示助手回复
        this.addMessage(response, 'assistant');

        // 语音播报回复
        this.speak(response);
    }

    speak(text) {
        if ('speechSynthesis' in window) {
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = 'zh-CN';
            utterance.rate = 0.9;
            utterance.pitch = 1;
            utterance.volume = 1;
            speechSynthesis.speak(utterance);
        }
    }
}

// 添加外出时更新函数
function updateOutdoorTime() {
    // 获取当前时间
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();

    // 模拟最近一次外出时间（假设是2小时前）
    const lastOutStart = new Date(now);
    lastOutStart.setHours(currentHour - 2);
    const lastOutEnd = new Date(lastOutStart);
    lastOutEnd.setMinutes(lastOutStart.getMinutes() + 75); // 外出持续75分钟

    // 格式化时间显示
    const formatTime = (date) => {
        return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
    };

    // 更新最近一次外出时间显示
    const lastOutTimeStr = `${formatTime(lastOutStart)}-${formatTime(lastOutEnd)}`;
    document.querySelector('.stat-value:first-child').textContent = lastOutTimeStr;

    // 模拟本周数据
    const weeklyData = [2.5, 3.0, 2.8, 2.3, 3.2, 2.6, 2.8];
    const weeklyAverage = weeklyData.reduce((a, b) => a + b, 0) / weeklyData.length;

    // 更新本周平均时间显示
    document.querySelector('.stat-value:last-child').textContent =
        `${weeklyAverage.toFixed(1)}小时/天`;

    // 更新今日外出时间
    const todayOutdoorHours = weeklyData[6]; // 使用今天的数
    document.querySelector('.time-circle .time-value').textContent =
        todayOutdoorHours.toFixed(1);
}

// 添加定时更新功能（每分钟更新一次）
setInterval(updateOutdoorTime, 60000);

// 添加标记点动画样式
const style = document.createElement('style');
style.textContent = `
    @keyframes bounce {
        0%, 100% { transform: translateY(0); }
        50% { transform: translateY(-10px); }
    }
`;
document.head.appendChild(style); 