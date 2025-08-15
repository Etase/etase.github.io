// 物理流场背景效果 - 自然流体版（性能优化版）
function fluidFlowField() {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d", { alpha: true }); // 修改1：启用透明度
  canvas.style.position = "fixed";
  canvas.style.top = "0";
  canvas.style.left = "0";
  canvas.style.width = "100%";
  canvas.style.height = "100%";
  canvas.style.zIndex = "-1";
  canvas.style.opacity = "0.8";
  document.body.appendChild(canvas);

  let width = window.innerWidth;
  let height = window.innerHeight;
  let time = 0;
  let mouseX = width / 2;
  let mouseY = height / 2;
  let isDarkMode =
    document.documentElement.getAttribute("data-theme") === "dark";

  // 设置canvas尺寸
  function resizeCanvas() {
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;
  }

  resizeCanvas();
  window.addEventListener("resize", resizeCanvas);

  // 监听主题变化
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.attributeName === "data-theme") {
        isDarkMode =
          document.documentElement.getAttribute("data-theme") === "dark";
        // 修改2：主题变化时重置粒子颜色
        particles.forEach((p) => p.reset());
      }
    });
  });

  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-theme"],
  });

  // 简化的噪声函数（优化版）
  function noise(x, y, z) {
    const X = Math.floor(x) & 255;
    const Y = Math.floor(y) & 255;
    const Z = Math.floor(z) & 255;

    x -= Math.floor(x);
    y -= Math.floor(y);
    z -= Math.floor(z);

    const u = fade(x);
    const v = fade(y);
    const w = fade(z);

    const A = p[X] + Y;
    const AA = p[A] + Z;
    const AB = p[A + 1] + Z;
    const B = p[X + 1] + Y;
    const BA = p[B] + Z;
    const BB = p[B + 1] + Z;

    return lerp(
      w,
      lerp(
        v,
        lerp(u, grad(p[AA], x, y, z), grad(p[BA], x - 1, y, z)),
        lerp(u, grad(p[AB], x, y - 1, z), grad(p[BB], x - 1, y - 1, z))
      ),
      lerp(
        v,
        lerp(u, grad(p[AA + 1], x, y, z - 1), grad(p[BA + 1], x - 1, y, z - 1)),
        lerp(
          u,
          grad(p[AB + 1], x, y - 1, z - 1),
          grad(p[BB + 1], x - 1, y - 1, z - 1)
        )
      )
    );
  }

  function fade(t) {
    return t * t * t * (t * (t * 6 - 15) + 10);
  }

  function lerp(t, a, b) {
    return a + t * (b - a);
  }

  function grad(hash, x, y, z) {
    const h = hash & 15;
    const u = h < 8 ? x : y;
    const v = h < 4 ? y : h === 12 || h === 14 ? x : z;
    return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
  }

  // 初始化置换表
  const p = new Array(512);
  const permutation = [
    151, 160, 137, 91, 90, 15, 131, 13, 201, 95, 96, 53, 194, 233, 7, 225, 140,
    36, 103, 30, 69, 142, 8, 99, 37, 240, 21, 10, 23, 190, 6, 148, 247, 120,
    234, 75, 0, 26, 197, 62, 94, 252, 219, 203, 117, 35, 11, 32, 57, 177, 33,
    88, 237, 149, 56, 87, 174, 20, 125, 136, 171, 168, 68, 175, 74, 165, 71,
    134, 139, 48, 27, 166, 77, 146, 158, 231, 83, 111, 229, 122, 60, 211, 133,
    230, 220, 105, 92, 41, 55, 46, 245, 40, 244, 102, 143, 54, 65, 25, 63, 161,
    1, 216, 80, 73, 209, 76, 132, 187, 208, 89, 18, 169, 200, 196, 135, 130,
    116, 188, 159, 86, 164, 100, 109, 198, 173, 186, 3, 64, 52, 217, 226, 250,
    124, 123, 5, 202, 38, 147, 118, 126, 255, 82, 85, 212, 207, 206, 59, 227,
    47, 16, 58, 17, 182, 189, 28, 42, 223, 183, 170, 213, 119, 248, 152, 2, 44,
    154, 163, 70, 221, 153, 101, 155, 167, 43, 172, 9, 129, 22, 39, 253, 19, 98,
    108, 110, 79, 113, 224, 232, 178, 185, 112, 104, 218, 246, 97, 228, 251, 34,
    242, 193, 238, 210, 144, 12, 191, 179, 162, 241, 81, 51, 145, 235, 249, 14,
    239, 107, 49, 192, 214, 31, 181, 199, 106, 157, 184, 84, 204, 176, 115, 121,
    50, 45, 127, 4, 150, 254, 138, 236, 205, 93, 222, 114, 67, 29, 24, 72, 243,
    141, 128, 195, 78, 66, 215, 61, 156, 180,
  ];

  for (let i = 0; i < 256; i++) {
    p[256 + i] = p[i] = permutation[i];
  }

  // 辅助函数：映射值范围
  function map(value, start1, stop1, start2, stop2) {
    return start2 + (stop2 - start2) * ((value - start1) / (stop1 - start1));
  }

  // 流场类（优化版）
  class FlowField {
    constructor() {
      this.scale = 30; // 增加格子大小，减少计算量
      this.cols = Math.floor(width / this.scale) + 1;
      this.rows = Math.floor(height / this.scale) + 1;
      this.field = [];
      this.zoff = 0;
      this.update();
    }

    update() {
      let yoff = 0;
      for (let y = 0; y < this.rows; y++) {
        let xoff = 0;
        for (let x = 0; x < this.cols; x++) {
          const index = x + y * this.cols;
          const angle = noise(xoff, yoff, this.zoff) * Math.PI * 2;
          const v = Vector.fromAngle(angle);
          v.setMag(1);
          this.field[index] = v;
          xoff += 0.1;
        }
        yoff += 0.1;
      }
      this.zoff += 0.01;
    }

    lookup(x, y) {
      const column = Math.floor(x / this.scale);
      const row = Math.floor(y / this.scale);
      const index = column + row * this.cols;
      if (index >= 0 && index < this.field.length) {
        return this.field[index].copy();
      }
      return new Vector(0, 0);
    }
  }

  // 向量类（优化版）
  class Vector {
    constructor(x, y) {
      this.x = x || 0;
      this.y = y || 0;
    }

    static fromAngle(angle) {
      return new Vector(Math.cos(angle), Math.sin(angle));
    }

    copy() {
      return new Vector(this.x, this.y);
    }

    mag() {
      return Math.sqrt(this.x * this.x + this.y * this.y);
    }

    setMag(mag) {
      const len = this.mag();
      if (len > 0) {
        this.x = (this.x / len) * mag;
        this.y = (this.y / len) * mag;
      }
      return this;
    }

    add(v) {
      this.x += v.x;
      this.y += v.y;
      return this;
    }

    mult(n) {
      this.x *= n;
      this.y *= n;
      return this;
    }
  }

  // 粒子类（优化版）
  class Particle {
    constructor() {
      this.reset();
    }

    reset() {
      this.x = Math.random() * width;
      this.y = Math.random() * height;
      this.prevX = this.x;
      this.prevY = this.y;
      this.maxSpeed = 2;
      this.speed = Math.random() * 0.5 + 0.5;
      this.angle = Math.random() * Math.PI * 2;
      this.prevAngle = this.angle;
      this.size = Math.random() * 1.5 + 0.5; // 减小粒子尺寸
      this.life = 1;
      this.decay = Math.random() * 0.005 + 0.002;
      // 修改3：使用当前主题颜色
      this.color = isDarkMode
        ? `hsl(${Math.random() * 60 + 180}, 80%, 60%)`
        : `hsl(${Math.random() * 60 + 20}, 80%, 40%)`;
    }

    update(flowField) {
      // 获取流场力
      const force = flowField.lookup(this.x, this.y);

      // 添加鼠标影响（优化版）
      const dx = mouseX - this.x;
      const dy = mouseY - this.y;
      const mouseDistanceSq = dx * dx + dy * dy; // 使用平方距离避免开方
      const mouseRadiusSq = 100 * 100; // 减小影响半径

      if (mouseDistanceSq < mouseRadiusSq) {
        const strength = 1 - mouseDistanceSq / mouseRadiusSq;
        force.x += dx * strength * 0.02;
        force.y += dy * strength * 0.02;
      }

      // 应用力到角度
      const targetAngle = Math.atan2(force.y, force.x);
      this.angle = this.angle * 0.7 + targetAngle * 0.3;

      // 更新速度
      const targetSpeed = Math.min(this.maxSpeed, force.mag() * 5);
      this.speed = this.speed * 0.9 + targetSpeed * 0.1;

      // 更新位置
      this.prevX = this.x;
      this.prevY = this.y;
      this.x += Math.cos(this.angle) * this.speed;
      this.y += Math.sin(this.angle) * this.speed;

      // 边界检查
      if (this.x < 0 || this.x > width || this.y < 0 || this.y > height) {
        this.reset();
      }

      // 生命周期
      this.life -= this.decay;
      if (this.life <= 0) {
        this.reset();
      }
    }

    draw(ctx) {
      // 修改4：添加线条端点样式
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(this.prevX, this.prevY);
      ctx.lineTo(this.x, this.y);
      ctx.strokeStyle = this.color;
      ctx.lineWidth = this.size * this.life;
      ctx.stroke();
    }
  }

  // 创建流场和粒子（优化版）
  const flowField = new FlowField();
  const particles = [];
  const particleCount = Math.floor((width * height) / 20000); // 减少粒子数量

  for (let i = 0; i < particleCount; i++) {
    particles.push(new Particle());
  }

  // 鼠标移动事件（优化版）
  let mouseMoveTimeout;
  document.addEventListener("mousemove", (e) => {
    // 使用节流减少更新频率
    if (!mouseMoveTimeout) {
      mouseMoveTimeout = setTimeout(() => {
        mouseX = e.clientX;
        mouseY = e.clientY;
        mouseMoveTimeout = null;
      }, 50); // 50ms节流
    }
  });

  // 动画循环（优化版）
  let frameCount = 0;
  function animate() {
    // 修改5：增加清除透明度，使拖尾效果更明显
    ctx.fillStyle = isDarkMode
      ? "rgba(10, 10, 10, 0.1)" // 增加透明度
      : "rgba(245, 245, 245, 0.1)";
    ctx.fillRect(0, 0, width, height);

    // 减少流场更新频率
    if (frameCount % 15 === 0) {
      flowField.update();
    }

    // 批量更新和绘制粒子
    for (let i = 0; i < particles.length; i++) {
      particles[i].update(flowField);
      particles[i].draw(ctx);
    }

    frameCount++;
    time += 0.01;

    requestAnimationFrame(animate);
  }

  // 启动动画
  animate();
}

// 启动效果
fluidFlowField();
