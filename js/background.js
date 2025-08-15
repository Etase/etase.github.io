// 优化后的流体几何背景效果
function fluidGeometry() {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d", { alpha: false }); // 禁用透明度提升性能
  canvas.style.position = "fixed";
  canvas.style.top = "0";
  canvas.style.left = "0";
  canvas.style.width = "100%";
  canvas.style.height = "100%";
  canvas.style.zIndex = "-1";
  canvas.style.opacity = "0.7";
  document.body.appendChild(canvas);

  let width = window.innerWidth;
  let height = window.innerHeight;
  let time = 0;
  let mouseX = width / 2;
  let mouseY = height / 2;
  let particles = [];
  let animationId = null;
  let isDarkTheme =
    document.documentElement.getAttribute("data-theme") === "dark";

  // 性能优化：减少粒子数量
  const particleCount = Math.min(Math.floor((width * height) / 15000), 30);

  // 设置画布尺寸
  function resizeCanvas() {
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;

    // 重新初始化粒子
    initParticles();
  }

  // 粒子类
  class Particle {
    constructor() {
      this.reset();
    }

    reset() {
      this.x = Math.random() * width;
      this.y = Math.random() * height;
      this.size = Math.random() * 10 + 5;
      this.speedX = (Math.random() - 0.5) * 0.5;
      this.speedY = (Math.random() - 0.5) * 0.5;
      this.sides = Math.floor(Math.random() * 4) + 3; // 3-6边形
      this.rotation = Math.random() * Math.PI * 2;
      this.rotationSpeed = (Math.random() - 0.5) * 0.02;
      this.pulsePhase = Math.random() * Math.PI * 2;
      this.pulseSpeed = Math.random() * 0.02 + 0.01;
      this.color = `hsl(${Math.random() * 60 + 200}, 70%, 60%)`; // 蓝紫色调
      this.opacity = Math.random() * 0.5 + 0.3;
    }

    update() {
      // 更新位置
      this.x += this.speedX;
      this.y += this.speedY;

      // 边界检查
      if (this.x < 0 || this.x > width) this.speedX *= -1;
      if (this.y < 0 || this.y > height) this.speedY *= -1;

      // 鼠标交互（优化计算）
      const dx = this.x - mouseX;
      const dy = this.y - mouseY;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < 100) {
        const force = (100 - distance) / 100;
        this.x += dx * force * 0.05;
        this.y += dy * force * 0.05;
      }

      // 更新旋转和脉冲
      this.rotation += this.rotationSpeed;
      this.pulsePhase += this.pulseSpeed;
    }

    draw() {
      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.rotate(this.rotation);

      // 脉冲效果
      const pulseFactor = 1 + Math.sin(this.pulsePhase) * 0.2;
      const size = this.size * pulseFactor;

      ctx.fillStyle = this.color;
      ctx.globalAlpha = this.opacity;

      // 绘制多边形（优化路径绘制）
      ctx.beginPath();
      for (let i = 0; i < this.sides; i++) {
        const angle = (i * 2 * Math.PI) / this.sides;
        const x = Math.cos(angle) * size;
        const y = Math.sin(angle) * size;
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.closePath();
      ctx.fill();

      ctx.restore();
    }
  }

  // 初始化粒子
  function initParticles() {
    particles = [];
    for (let i = 0; i < particleCount; i++) {
      particles.push(new Particle());
    }
  }

  // 绘制背景（优化渐变计算）
  function drawBackground() {
    const gradient = ctx.createLinearGradient(0, 0, width, height);

    // 使用缓存的HSL值减少计算
    const hue1 = (time * 0.05) % 360;
    const hue2 = (time * 0.03 + 120) % 360;

    gradient.addColorStop(0, `hsl(${hue1}, 30%, 5%)`);
    gradient.addColorStop(1, `hsl(${hue2}, 30%, 10%)`);

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
  }

  // 绘制连接线（优化距离计算）
  function drawConnections() {
    ctx.strokeStyle = "rgba(100, 150, 255, 0.1)";
    ctx.lineWidth = 0.5;

    // 减少连接线数量
    const maxConnections = Math.min(particles.length * 2, 100);
    let connectionCount = 0;

    for (
      let i = 0;
      i < particles.length && connectionCount < maxConnections;
      i++
    ) {
      for (
        let j = i + 1;
        j < particles.length && connectionCount < maxConnections;
        j++
      ) {
        const dx = particles[i].x - particles[j].x;
        const dy = particles[i].y - particles[j].y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < 150) {
          const opacity = 1 - distance / 150;
          ctx.globalAlpha = opacity * 0.2;
          ctx.beginPath();
          ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(particles[j].x, particles[j].y);
          ctx.stroke();
          connectionCount++;
        }
      }
    }
    ctx.globalAlpha = 1;
  }

  // 动画循环（优化帧率控制）
  function animate() {
    if (!isDarkTheme) {
      animationId = requestAnimationFrame(animate);
      return;
    }

    // 清除画布
    ctx.clearRect(0, 0, width, height);

    // 绘制背景
    drawBackground();

    // 更新和绘制粒子
    particles.forEach((particle) => {
      particle.update();
      particle.draw();
    });

    // 绘制连接线
    drawConnections();

    time += 0.5;
    animationId = requestAnimationFrame(animate);
  }

  // 鼠标移动事件（优化事件处理）
  let mouseMoveTimeout;
  window.addEventListener("mousemove", (e) => {
    if (mouseMoveTimeout) {
      cancelAnimationFrame(mouseMoveTimeout);
    }

    mouseMoveTimeout = requestAnimationFrame(() => {
      mouseX = e.clientX;
      mouseY = e.clientY;
    });
  });

  // 窗口大小调整
  window.addEventListener("resize", resizeCanvas);

  // 主题变化监听
  const observer = new MutationObserver(() => {
    isDarkTheme =
      document.documentElement.getAttribute("data-theme") === "dark";
  });
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-theme"],
  });

  // 页面可见性变化处理
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      cancelAnimationFrame(animationId);
    } else {
      animate();
    }
  });

  // 初始化
  resizeCanvas();
  animate();
}

// 启动效果
fluidGeometry();
