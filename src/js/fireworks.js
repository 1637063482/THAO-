// ==========================================
// fireworks.js — 全屏烟花动画
// 流光拖尾粒子 + 多种爆炸模式 + 加法混合 + 随机爱心
// ==========================================

var PALETTES = [
  { colors: ['#FFD700','#FFA500','#FFEC8B','#FFC125'], core: '#FFFEF0' },
  { colors: ['#FF2400','#DC143C','#FF4444','#FF6B4A'], core: '#FFFFFF' },
  { colors: ['#FF69B4','#FF1493','#FFB6C1','#FF85A2'], core: '#FFF0F5' },
  { colors: ['#8B5CF6','#A78BFA','#C084FC','#7C3AED'], core: '#EDE9FE' },
  { colors: ['#4ECDC4','#70A1FF','#A29BFE','#7BED9F'], core: '#E8F8FF' },
  { colors: ['#00D2FF','#3A7BD5','#FFD700','#87CEEB'], core: '#FFFFFF' },
  { colors: ['#7FFF00','#00FA9A','#ADFF2F','#32CD32'], core: '#F0FFF0' },
  { colors: ['#E8E8E8','#C0C0C0','#FFFFFF','#F5F5F5'], core: '#FFFFFF' },
];

var BURST_TYPES = ['peony', 'willow', 'chrysanthemum', 'ring', 'heart'];

// ==================================================================
//  流光粒子 — 拖尾折线渲染，非圆点
// ==================================================================
function StreakParticle(x, y, vx, vy, color, size, opts) {
  opts = opts || {};
  this.x = x;
  this.y = y;
  this.vx = vx;
  this.vy = vy;
  this.color = color;
  this.size = size;
  this.opacity = 1;
  this.gravity   = opts.gravity   || 0.022;
  this.friction  = opts.friction  || 0.987;
  this.decay     = opts.decay     || 0.006;
  this.trailLen  = opts.trailLen  || 6;
  this.isCore    = opts.isCore    || false;
  this.history = [{ x: x, y: y }];
}

StreakParticle.prototype.update = function() {
  this.vx *= this.friction;
  this.vy *= this.friction;
  this.vy -= this.gravity;
  this.x += this.vx;
  this.y += this.vy;
  this.opacity -= this.decay;
  this.history.push({ x: this.x, y: this.y });
  if (this.history.length > this.trailLen) this.history.shift();
};

StreakParticle.prototype.draw = function(ctx) {
  var pts = this.history;
  if (pts.length < 2) return;

  ctx.save();
  for (var i = 0; i < pts.length - 1; i++) {
    var t = (i + 1) / pts.length;
    var pw = this.size * (0.35 + t * 0.65);
    var alpha = this.opacity * (0.08 + t * 0.92);

    ctx.beginPath();
    ctx.moveTo(pts[i].x, pts[i].y);
    ctx.lineTo(pts[i + 1].x, pts[i + 1].y);
    ctx.lineWidth = Math.max(0.2, pw);
    ctx.strokeStyle = this.color;
    ctx.globalAlpha = Math.max(0, alpha);
    ctx.lineCap = 'round';
    ctx.stroke();

    // 头部高亮
    if (t > 0.75 && this.opacity > 0.15) {
      ctx.beginPath();
      ctx.arc(pts[i + 1].x, pts[i + 1].y, pw * 0.7, 0, Math.PI * 2);
      ctx.fillStyle = this.isCore ? '#FFFFFF' : this.color;
      ctx.globalAlpha = Math.max(0, this.opacity * (0.3 + t * 0.7));
      ctx.fill();
    }
  }
  ctx.restore();
};

StreakParticle.prototype.isDead = function() {
  return this.opacity <= 0.006 || this.y < -50 || this.x < -60;
};

// ==================================================================
//  星芒爆闪
// ==================================================================
function StarBurst(x, y, intensity) {
  this.x = x;
  this.y = y;
  this.intensity = intensity;
  this.alive = true;
  this.rays = 8 + Math.floor(Math.random() * 8);
  this.angles = [];
  this.lengths = [];
  for (var i = 0; i < this.rays; i++) {
    this.angles.push(Math.random() * Math.PI * 2);
    this.lengths.push(8 + Math.random() * 25 * intensity);
  }
}

StarBurst.prototype.update = function() {
  this.intensity -= 0.06;
  if (this.intensity <= 0) this.alive = false;
};

StarBurst.prototype.draw = function(ctx) {
  if (!this.alive) return;
  ctx.save();
  for (var i = 0; i < this.rays; i++) {
    var a = this.angles[i];
    var len = this.lengths[i] * this.intensity;
    var cx = this.x + Math.cos(a) * len;
    var cy = this.y + Math.sin(a) * len;
    ctx.beginPath();
    ctx.moveTo(this.x, this.y);
    ctx.lineTo(cx, cy);
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = (1.5 + Math.random() * 0.8) * this.intensity;
    ctx.globalAlpha = this.intensity * 0.8;
    ctx.lineCap = 'round';
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx, cy, 1.5 * this.intensity, 0, Math.PI * 2);
    ctx.fillStyle = '#FFFEF0';
    ctx.globalAlpha = this.intensity * 0.5;
    ctx.fill();
  }
  ctx.beginPath();
  ctx.arc(this.x, this.y, 2 * this.intensity, 0, Math.PI * 2);
  ctx.fillStyle = '#FFFFFF';
  ctx.globalAlpha = this.intensity;
  ctx.fill();
  ctx.restore();
};

// ==================================================================
//  爱心工具 — 参数方程心形路径
// ==================================================================
var HEART_POINTS = (function() {
  var pts = [];
  for (var i = 0; i <= 120; i++) {
    var t = (i / 120) * Math.PI * 2;
    var x = 16 * Math.pow(Math.sin(t), 3);
    var y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
    pts.push({ x: x, y: -y }); // y 轴翻转，心尖朝下
  }
  return pts;
})();

function drawHeartPath(ctx, cx, cy, scale, rotation) {
  ctx.save();
  ctx.translate(cx, cy);
  if (rotation) ctx.rotate(rotation);
  ctx.scale(scale / 16, scale / 16);
  ctx.beginPath();
  var p0 = HEART_POINTS[0];
  ctx.moveTo(p0.x, p0.y);
  for (var i = 1; i < HEART_POINTS.length; i++) {
    ctx.lineTo(HEART_POINTS[i].x, HEART_POINTS[i].y);
  }
  ctx.closePath();
  ctx.restore();
}

// ==================================================================
//  漂浮爱心粒子 — 随机位置飘升，心形渲染
// ==================================================================
function HeartParticle(x, y, size, color, opts) {
  opts = opts || {};
  this.x = x;
  this.y = y;
  this.size = size || 8;
  this.color = color || '#FF69B4';
  this.opacity = opts.opacity || 1;
  this.vy = opts.vy || (0.3 + Math.random() * 1.2);
  this.vx = opts.vx || ((Math.random() - 0.5) * 0.8);
  this.rotation = opts.rotation || ((Math.random() - 0.5) * 0.7);
  this.rotationSpeed = (Math.random() - 0.5) * 0.03;
  this.decay = opts.decay || 0.0025;
  this.pulseSpeed = 0.03 + Math.random() * 0.05;
  this.pulseAmp = 0.08 + Math.random() * 0.12;
  this.age = Math.random() * Math.PI * 2;
}

HeartParticle.prototype.update = function() {
  this.age += this.pulseSpeed;
  this.y += this.vy;
  this.x += this.vx;
  this.rotation += this.rotationSpeed;
  this.opacity -= this.decay;
};

HeartParticle.prototype.draw = function(ctx) {
  if (this.opacity <= 0.006) return;
  var pulse = 1 + Math.sin(this.age) * this.pulseAmp;
  var s = this.size * pulse;
  ctx.save();
  ctx.globalAlpha = Math.max(0, this.opacity);
  drawHeartPath(ctx, this.x, this.y, s, this.rotation);
  ctx.fillStyle = this.color;
  ctx.shadowColor = this.color;
  ctx.shadowBlur = s * 0.8;
  ctx.fill();

  // 内层高光
  ctx.globalAlpha = Math.max(0, this.opacity * 0.5);
  drawHeartPath(ctx, this.x, this.y, s * 0.55, this.rotation);
  ctx.fillStyle = '#FFFFFF';
  ctx.shadowBlur = 0;
  ctx.fill();
  ctx.restore();
};

HeartParticle.prototype.isDead = function() {
  return this.opacity <= 0.006 || this.y < -60 || this.x < -60 || this.x > 9999;
};
function Rocket(x, targetY, palette, burstType, screenW, screenH) {
  this.x = x;
  this.y = 0;
  this.targetY = targetY;
  this.palette = palette;
  this.burstType = burstType;
  this.screenW = screenW;
  this.screenH = screenH;
  this.vy = 10 + Math.random() * 6;
  this.vx = (Math.random() - 0.5) * 5;
  this.exploded = false;
  this.particles = [];
  this.starBursts = [];
  this.alive = true;
  this.sparks = [];
  this.age = 0;
}

Rocket.prototype.update = function() {
  this.age++;
  if (!this.exploded) {
    this.x += this.vx;
    this.y += this.vy;
    // 尾焰火花 — 使用该火箭调色盘随机颜色
    var trailColors = this.palette.colors;
    if (Math.random() < 0.6) {
      this.sparks.push({
        x: this.x + (Math.random() - 0.5) * 3,
        y: this.y - (1 + Math.random() * 3),
        vx: (Math.random() - 0.5) * 0.4,
        vy: -Math.random() * 1.2,
        life: 0.5 + Math.random() * 0.5,
        size: 1 + Math.random() * 2,
        color: trailColors[Math.floor(Math.random() * trailColors.length)],
      });
    }
    if (Math.random() < 0.2) {
      this.sparks.push({
        x: this.x + (Math.random() - 0.5) * 5,
        y: this.y - Math.random() * 2,
        vx: (Math.random() - 0.5) * 1.5,
        vy: -Math.random() * 2,
        life: 0.3 + Math.random() * 0.4,
        size: 0.8 + Math.random() * 1.2,
        color: trailColors[Math.floor(Math.random() * trailColors.length)],
      });
    }
    if (this.y >= this.targetY) this._explode();
  } else {
    for (var i = 0; i < this.particles.length; i++) this.particles[i].update();
    for (var j = 0; j < this.starBursts.length; j++) this.starBursts[j].update();
    this.particles = this.particles.filter(function(p) { return !p.isDead(); });
    this.starBursts = this.starBursts.filter(function(s) { return s.alive; });
    if (this.particles.length === 0 && this.starBursts.length === 0) this.alive = false;
  }
  for (var k = 0; k < this.sparks.length; k++) {
    this.sparks[k].life -= 0.025;
    this.sparks[k].x += this.sparks[k].vx;
    this.sparks[k].y += this.sparks[k].vy;
  }
  this.sparks = this.sparks.filter(function(s) { return s.life > 0; });
};

Rocket.prototype._explode = function() {
  this.exploded = true;
  this.starBursts.push(new StarBurst(this.x, this.y, 0.85 + Math.random() * 0.15));
  this.age = 0;
  switch (this.burstType) {
    case 'peony':          this._peony(); break;
    case 'willow':         this._willow(); break;
    case 'chrysanthemum':  this._chrysanthemum(); break;
    case 'ring':           this._ring(); break;
    case 'heart':          this._heart(); break;
    default:               this._peony();
  }
};

// ── 牡丹：球形，外快内慢 ──
Rocket.prototype._peony = function() {
  var colors = this.palette.colors;
  var core = this.palette.core;
  var total = 90 + Math.floor(Math.random() * 40);
  var outer = Math.floor(total * 0.6);
  for (var i = 0; i < outer; i++) {
    var theta = (Math.PI * 2 * i) / outer + (Math.random() - 0.5) * 0.22;
    var speed = 2.0 + Math.random() * 3.0;
    this.particles.push(new StreakParticle(this.x, this.y, Math.cos(theta) * speed, Math.sin(theta) * speed,
      colors[Math.floor(Math.random() * colors.length)], 1.0 + Math.random() * 1.5,
      { gravity: 0.018, friction: 0.983, decay: 0.015, trailLen: 4 }));
  }
  var inner = total - outer;
  for (var j = 0; j < inner; j++) {
    var theta2 = Math.random() * Math.PI * 2;
    var speed2 = 0.5 + Math.random() * 1.0;
    var isCore = j < inner * 0.3;
    this.particles.push(new StreakParticle(this.x, this.y, Math.cos(theta2) * speed2, Math.sin(theta2) * speed2,
      isCore ? core : colors[Math.floor(Math.random() * colors.length)], 1.4 + Math.random() * 2,
      { gravity: 0.012, friction: 0.992, decay: 0.009, trailLen: 4, isCore: isCore }));
  }
};

// ── 垂柳：扇形喷出，强重力拉弧 ──
Rocket.prototype._willow = function() {
  var wColors = ['#FFD700','#FFA500','#FFC125','#FFEC8B','#FFFFFF'];
  var count = 60 + Math.floor(Math.random() * 30);
  for (var i = 0; i < count; i++) {
    var theta = (Math.PI / 2) + (Math.random() - 0.5) * 1.2;
    var speed = 1.5 + Math.random() * 2.5;
    this.particles.push(new StreakParticle(this.x, this.y, Math.cos(theta) * speed, Math.sin(theta) * speed,
      wColors[Math.floor(Math.random() * wColors.length)], 0.7 + Math.random() * 1.1,
      { gravity: 0.035, friction: 0.991, decay: 0.006, trailLen: 8 }));
  }
  for (var j = 0; j < 15; j++) {
    var theta2 = (Math.PI / 2) + (Math.random() - 0.5) * 0.5;
    var speed2 = 0.4 + Math.random() * 0.8;
    this.particles.push(new StreakParticle(this.x, this.y, Math.cos(theta2) * speed2, Math.sin(theta2) * speed2,
      '#FFFFFF', 1 + Math.random() * 1.6,
      { gravity: 0.008, decay: 0.014, trailLen: 3, isCore: true }));
  }
};

// ── 菊花：密集放射长尾 ──
Rocket.prototype._chrysanthemum = function() {
  var colors = this.palette.colors;
  var core = this.palette.core;
  var count = 100 + Math.floor(Math.random() * 40);
  for (var i = 0; i < count; i++) {
    var theta = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.18;
    var speed = 2.0 + Math.random() * 2.5;
    this.particles.push(new StreakParticle(this.x, this.y, Math.cos(theta) * speed, Math.sin(theta) * speed,
      colors[Math.floor(Math.random() * colors.length)], 0.7 + Math.random() * 1.2,
      { gravity: 0.014, friction: 0.987, decay: 0.009, trailLen: 6 }));
  }
  for (var j = 0; j < 25; j++) {
    var theta2 = Math.random() * Math.PI * 2;
    var speed2 = 0.3 + Math.random() * 0.8;
    this.particles.push(new StreakParticle(this.x, this.y, Math.cos(theta2) * speed2, Math.sin(theta2) * speed2,
      core, 2 + Math.random() * 2.5,
      { gravity: 0.006, decay: 0.016, trailLen: 3, isCore: true }));
  }
};

// ── 光环：粒子在窄纬度带 ──
Rocket.prototype._ring = function() {
  var colors = this.palette.colors;
  var count = 80 + Math.floor(Math.random() * 30);
  var ringTilt = (Math.random() - 0.5) * 0.5;
  for (var i = 0; i < count; i++) {
    var azi = (Math.PI * 2 * i) / count;
    var elev = ringTilt + (Math.random() - 0.5) * 0.2;
    var speed = 2.0 + Math.random() * 2.0;
    this.particles.push(new StreakParticle(this.x, this.y,
      Math.cos(azi) * Math.cos(elev) * speed, Math.sin(elev) * speed,
      colors[Math.floor(Math.random() * colors.length)], 0.8 + Math.random() * 1.3,
      { gravity: 0.008, decay: 0.012, trailLen: 4 }));
  }
  this._ringCenterPending = true;
  this._ringCenterAge = this.age;
};

// ── 爱心：粒子沿心形路径喷射，同时混合中心扩散 ──
Rocket.prototype._heart = function() {
  var colors = this.palette.colors;
  var core = this.palette.core;
  var heartScale = 1.0 + Math.random() * 1.5;
  var totalOnPath = 60 + Math.floor(Math.random() * 30);
  // 沿心形路径发射粒子
  for (var i = 0; i < totalOnPath; i++) {
    var idx = Math.floor((i / totalOnPath) * HEART_POINTS.length) % HEART_POINTS.length;
    var hp = HEART_POINTS[idx];
    var jitter = 0.06 + Math.random() * 0.14;
    var speed = 0.8 + Math.random() * 2.2;
    var vx = hp.x * heartScale * speed * (0.008 + Math.random() * 0.006) + (Math.random() - 0.5) * jitter;
    var vy = hp.y * heartScale * speed * (0.008 + Math.random() * 0.006) + (Math.random() - 0.5) * jitter;
    var useCore = Math.random() < 0.15;
    this.particles.push(new StreakParticle(this.x, this.y, vx, vy,
      useCore ? core : colors[Math.floor(Math.random() * colors.length)],
      0.7 + Math.random() * 1.3,
      { gravity: 0.010, friction: 0.989, decay: 0.011, trailLen: 5, isCore: useCore }));
  }
  // 中心填充粒子
  for (var j = 0; j < 30; j++) {
    var theta2 = Math.random() * Math.PI * 2;
    var speed2 = 0.15 + Math.random() * 0.7;
    this.particles.push(new StreakParticle(this.x, this.y,
      Math.cos(theta2) * speed2, Math.sin(theta2) * speed2,
      core, 1.2 + Math.random() * 2.2,
      { gravity: 0.005, decay: 0.014, trailLen: 3, isCore: true }));
  }
  // 生成漂浮爱心
  for (var k = 0; k < 8 + Math.floor(Math.random() * 10); k++) {
    _hearts.push(new HeartParticle(
      this.x + (Math.random() - 0.5) * 60,
      this.y + (Math.random() - 0.5) * 40,
      5 + Math.random() * 14,
      colors[Math.floor(Math.random() * colors.length)],
      { vy: 0.2 + Math.random() * 1.0, vx: (Math.random() - 0.5) * 0.6, decay: 0.003, opacity: 0.9 }
    ));
  }
  this.starBursts.push(new StarBurst(this.x, this.y, 0.6 + Math.random() * 0.3));
};

Rocket.prototype.needsRingCenter = function() {
  return this._ringCenterPending && this.age > this._ringCenterAge + 28;
};

Rocket.prototype.doRingCenter = function() {
  this._ringCenterPending = false;
  var core = this.palette.core;
  for (var i = 0; i < 55; i++) {
    var theta = Math.random() * Math.PI * 2;
    var speed = 0.2 + Math.random() * 1.2;
    this.particles.push(new StreakParticle(this.x, this.y,
      Math.cos(theta) * speed, Math.sin(theta) * speed,
      core, 1 + Math.random() * 1.8,
      { gravity: 0.010, decay: 0.010, trailLen: 3, isCore: true }));
  }
  this.starBursts.push(new StarBurst(this.x, this.y, 0.7));
};

Rocket.prototype.draw = function(ctx) {
  // 尾焰火花（各火箭调色盘随机颜色）
  ctx.save();
  for (var i = 0; i < this.sparks.length; i++) {
    var s = this.sparks[i];
    if (s.life <= 0) continue;
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
    ctx.fillStyle = s.color || '#FFD700';
    ctx.globalAlpha = s.life;
    ctx.fill();
  }
  ctx.restore();
  // 火箭本体
  if (!this.exploded) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(this.x, this.y, 4, 0, Math.PI * 2);
    ctx.fillStyle = '#FFD700';
    ctx.globalAlpha = 0.4;
    ctx.fill();
    ctx.beginPath();
    ctx.arc(this.x, this.y, 2, 0, Math.PI * 2);
    ctx.fillStyle = '#FFFFFF';
    ctx.globalAlpha = 0.9;
    ctx.fill();
    ctx.restore();
  }
  // 星芒
  for (var j = 0; j < this.starBursts.length; j++) this.starBursts[j].draw(ctx);
  // 粒子（加法混合）
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (var k = 0; k < this.particles.length; k++) this.particles[k].draw(ctx);
  ctx.restore();
};

// ==================================================================
//  弹幕系统
// ==================================================================
var BARRAGE_TEXTS = [
  'THAO 真棒！👏', 'THAO 小富婆！💰', 'THAO 继续加油！💪', 'THAO 太厉害了！🌟',
  '积少成多！📈', '理财达人！🎯', '又省一笔！✨', '棒棒哒！💖',
  '财富自由之路！🚀', '开源节流！🏆', '存钱小能手！🐷', '今天也很努力！☀️',
  '记账使我快乐！😊', '小目标达成！🎉', '精打细算！🧮', 'THAO 富婆养成中！👑',
  'THAO 你是最棒的！🌈', '日积月累成大富！💎', 'THAO 记账小天才！🧠',
  '省钱就是赚钱！💵', '每天记账好习惯！📝', 'THAO 财务自由不是梦！🌟',
  '加油加油加油！🔥', 'THAO 财富滚滚来！💸', '坚持就是胜利！🏅',
  'THAO 持家有道！🏠', '小钱变大钱！🪙', '今天又存了一笔！🎊',
  'THAO 未来可期！🌅', '理财让生活更美好！🌸', 'THAO 自律即自由！🦋',
  '每一笔都是积累！📊', 'THAO 越来越富裕！📈', '攒钱让我快乐！😄',
  'THAO 向着目标前进！🎯', '省下的就是赚到的！🤑', 'THAO 今天的努力明天的财富！☀️',
  '记账每一天！📋', 'THAO 财富密码已解锁！🔑', '精打细算过日子！🏡',
  'THAO 存钱大作战！⚔️', '会记账的女生最美！💃', 'THAO 金库日渐丰满！🏦',
  '理财一小步财富一大步！👣', 'THAO 钱生钱不是梦！💭', '今天少花一分明天多赚一块！🪙',
  'THAO 账本越来越厚！📚', '聚沙成塔！⛰️', 'THAO 稳扎稳打！🧱',
  '记账是理财的第一步！🥇', 'THAO 做自己的CFO！💼', '财富自由冲鸭！🦆',
  'THAO 掌控金钱掌控人生！🎮', '每天坚持就是奇迹！✨', 'THAO 离富婆又近了一步！👠',
  '不乱花钱从我做起！🙅', 'THAO 会理财会生活！🌺', '一毛一分都是爱！💕',
  'THAO 帐目清晰心中有数！🧾', '储蓄是最好的投资！📦', 'THAO 积少成多聚沙成塔！🗼',
  '好记性不如烂笔头！✏️', 'THAO 每一笔都值得！💯', '理性消费快乐生活！🛒',
  'THAO 把每一分钱都安排明白！📐', '财富是一个过程！🛤️', 'THAO 一分耕耘一分收获！🌾',
  '记账让我看清消费！🔍', 'THAO 钱包越来越鼓！👛', '存钱会上瘾！😍',
  'THAO 美好的生活从记账开始！🎬', '拒绝月光族！🌙', 'THAO 做金钱的主人！👸',
  '每次记账都是投资自己！💝', 'THAO 月月有余年年有余！🐟', '懂理财的女生最有魅力！💋',
  'THAO 数字背后是自律！📱', '花钱有度存钱有方！🧭', 'THAO 日复一日的坚持！🔄',
  '账本见证成长！🌱', 'THAO 理财路上不孤单！👯', '小账本大智慧！🦉',
  'THAO 今天比昨天更富有！⬆️', '财富偏爱有准备的人！🎁', 'THAO 把消费变成投资！💱',
  '不要小看每一笔小钱！🪶', 'THAO 富有的习惯从记账开始！📿', '钱要花在刀刃上！⚡',
  'THAO 你的努力看得见！👀', '让每一分钱都有意义！💫', 'THAO 在通往财富的路上狂奔！🏃',
  '有钱的感觉真好！😎', 'THAO 精打细算不是抠是智慧！🧘', '记账是种修行！🧿',
  'THAO 每天一小步财务一大步！🚶', '省吃俭用不如精明消费！🎭', 'THAO 给自己一个富裕的未来！🔮',
  '越记越有钱！💹', 'THAO 坚持记账一百天！💯', '会花的女生也会存！👒',
  'THAO 存钱比赚钱更难！🪨', '但 THAO 做到了！✅', 'THAO 厉害了我的姐！🙌',
  '从此走上财富巅峰！⛰️', 'THAO 今日记账明日自由！🕊️', '不积跬步无以至千里！🐾',
  'THAO 每一个数字都是勋章！🎖️', '财富之树需要日日浇灌！🌳', 'THAO 小金库满满当当！🪣',
  '今天也很节约！♻️', 'THAO 你的账本闪闪发光！✨', '存钱让人上瘾！💊',
  'THAO 距离财务自由又近了！📍', '生活因记账而美好！🌻', 'THAO 你的坚持终将美好！🌈',
  '一分钱一分货不乱花！🎯', 'THAO 你不理财财不理你！🤝', '钱是挣出来的也是省出来的！🪡',
  'THAO 做最好的自己！🥇', '今天的克制明天的自由！🦅', 'THAO 理财让生活更从容！🍃',
  '每一笔都是向前的力量！🔋', 'THAO 帐目平衡人生平衡！⚖️', '不乱于心不困于钱！🧘',
  'THAO 让财富成为你的底气！💪', '记下的不只是数字是生活！📖', 'THAO 会记账的女生运气不会差！🍀',
  '积蓄是安全感的来源！🏰', 'THAO 在最好的年纪遇见最好的自己！💐', '钱要用在让自己开心的地方！😊',
  'THAO 财务管理头头是道！📊', '每省一笔钱就多一份自由！🦋', 'THAO 向着小目标冲！🏹',
  '每天都是更好的自己！🌞', 'THAO 富有的女生最自信！💃', '存钱存出安全感！🛡️',
  'THAO 把生活过成想要的样子！🎨', '今天种下财富的种子！🌱', 'THAO 用数字书写传奇！✍️',
  '记账的女人最精致！💍', 'THAO 钱要花得明明白白！🔎', '理性是最好的奢侈品！👜',
  'THAO 你值得更好的生活！🏖️', '开源节流两手抓！🤲', 'THAO 财富自由的路上有你！🚄',
  '生活不会亏待认真记账的人！🎁', 'THAO 让钱包和心情一样美丽！💅', '用记账对抗消费主义！🛡️',
  'THAO 每一天都在变得更富有！📈', '存钱是最简单的投资！🪴', 'THAO 坚持让平凡变得不平凡！⭐',
  '给自己一个财务自由的未来！🗽', 'THAO 看着余额上涨真快乐！📊', '花钱也是一门艺术！🎨',
  'THAO 做朋友圈最会理财的！👑', '记录每一次成长！📏', 'THAO 万丈高楼平地起！🏗️',
  '让记账成为一种习惯！🔄', 'THAO 向钱看向厚赚！💲', '钱包和心灵都要富足！🧠',
  'THAO 精明的女生最可爱！🐰', '用账单书写精彩人生！📜', 'THAO 你的努力时光都看得见！⏳',
  '每分每秒都在进步！⏩', 'THAO 财富自由不再是梦！🌠', '把记账变成一种仪式！🕯️',
  'THAO 你比你想象的更强大！🦁', '建立自己的财务体系！🏛️', 'THAO 细水长流汇成江海！🌊',
  '心中有钱眼里有光！💡', 'THAO 开启财富新篇章！📖', '理性消费从记账开始！🧮',
  'THAO 每一笔都算数！➕', '富有的习惯养成中！🔄', 'THAO 你的坚持终将绽放！🌺',
  '做自己的理财规划师！📋', 'THAO 把时间花在值得的地方！⏰', '记账越多财富越近！🎯',
  'THAO 认真对待每一分钱！💎', '金钱是有灵性的！🧿', 'THAO 日积月累水滴石穿！💧',
  '让财富随时间增长！📈', 'THAO 做独立自主的女生！🗽', '好的习惯受益终生！🌟',
  'THAO 你正在创造奇迹！✨', '账本是通往财富的地图！🗺️', 'THAO 未来会感谢现在努力的自己！🙏',
  '记账让我更懂生活！🏡', 'THAO 智慧和美貌并存！👸', '量入为出适度消费！⚖️',
  'THAO 记录是改变的开始！📝', '每笔账都是对自己的承诺！🤞', 'THAO 加油小富婆冲冲冲！🚀',
];

// 弹幕泳道管理，避免重叠
var _barrageLanes = [];
var _barrageLastLane = -1;

function _spawnBarrage() {
  if (!_running || !_overlay) return;
  var text = BARRAGE_TEXTS[Math.floor(Math.random() * BARRAGE_TEXTS.length)];
  var el = document.createElement('div');
  el.className = 'firework-barrage';
  // 字体大小根据屏幕宽度自适应
  var baseSize = Math.max(13, Math.min(28, _dims.w / 28));
  var fontSize = baseSize + Math.random() * (baseSize * 0.7);
  var colors = ['#FFD700','#FFFFFF','#FF69B4','#FF6B4A','#4ECDC4','#7FFF00','#FFA500','#87CEEB'];
  var color = colors[Math.floor(Math.random() * colors.length)];

  // 泳道分配：小屏 5 道，大屏 8 道
  var laneCount = _dims.w < 640 ? 5 : 8;
  var laneHeight = (_dims.h * 0.65) / laneCount;
  var now = performance.now();
  // 清理过期泳道（3 秒未用）
  for (var i = 0; i < laneCount; i++) {
    if (_barrageLanes[i] && now - _barrageLanes[i] > 3000) _barrageLanes[i] = 0;
  }
  // 选空闲泳道，避免与上次相同
  var free = [];
  for (var j = 0; j < laneCount; j++) {
    if (!_barrageLanes[j] && j !== _barrageLastLane) free.push(j);
  }
  if (free.length === 0) {
    // 全忙则随机
    free = [];
    for (var k = 0; k < laneCount; k++) { if (k !== _barrageLastLane) free.push(k); }
    if (free.length === 0) free = [0, 1, 2, 3, 4, 5, 6, 7];
  }
  var lane = free[Math.floor(Math.random() * free.length)];
  _barrageLanes[lane] = now;
  _barrageLastLane = lane;

  var top = lane * laneHeight + Math.random() * (laneHeight * 0.5);

  el.style.cssText = 'position:absolute;right:-20px;top:' + top + 'px;font-size:' + fontSize + 'px;font-weight:900;color:' + color + ';white-space:nowrap;text-shadow:0 0 10px rgba(0,0,0,0.5),0 0 20px ' + color + ';font-family:"Noto Sans SC","PingFang SC",sans-serif;pointer-events:none;z-index:1;';
  el.textContent = text;
  _overlay.appendChild(el);

  // 速度根据屏幕宽度和 show 时长动态计算，确保弹幕横跨全屏
  var totalFrames = (_duration / 1000) * 60;
  var baseSpeed = (_dims.w + 250) / totalFrames;
  var speed = baseSpeed * (0.8 + Math.random() * 0.4);
  var anim = function() {
    if (!el.parentNode) return;
    var left = parseFloat(el.style.right || '-20');
    left += speed;
    el.style.right = left + 'px';
    if (left > _dims.w + 200) {
      if (el.parentNode) el.parentNode.removeChild(el);
      return;
    }
    requestAnimationFrame(anim);
  };
  requestAnimationFrame(anim);
}

// ==================================================================
//  单例管理
// ==================================================================
var _barrageTimer = null;
var _timer = null;
var _overlay = null;
var _canvas = null;
var _ctx = null;
var _animId = null;
var _rockets = [];
var _hearts = [];
var _heartSpawnTimer = 0;
var _running = false;
var _startTime = 0;
var _duration = 0;
var _dims = { w: 0, h: 0 };

function _resize() {
  _dims.w = window.innerWidth;
  _dims.h = window.innerHeight;
  _canvas.width = _dims.w;
  _canvas.height = _dims.h;
}

function _spawnRocket() {
  if (!_running) return;
  var palette = PALETTES[Math.floor(Math.random() * PALETTES.length)];
  var burstType = BURST_TYPES[Math.floor(Math.random() * BURST_TYPES.length)];
  var x = _dims.w * 0.1 + Math.random() * _dims.w * 0.8;
  var targetY = _dims.h * 0.50 + Math.random() * _dims.h * 0.30;
  _rockets.push(new Rocket(x, targetY, palette, burstType, _dims.w, _dims.h));
  if (_rockets.length > 30) _rockets = _rockets.slice(-30);
}

function _loop(ts) {
  if (!_running) return;
  var elapsed = ts - _startTime;

  // fade out via overlay opacity
  if (elapsed > _duration - 500) {
    _overlay.style.opacity = Math.max(0, 1 - (elapsed - (_duration - 500)) / 500);
  }
  if (elapsed >= _duration) {
    _cleanup();
    return;
  }

  _ctx.clearRect(0, 0, _dims.w, _dims.h);

  // 坐标翻转：y=0 底部, y=h 顶部
  _ctx.save();
  _ctx.translate(0, _dims.h);
  _ctx.scale(1, -1);

  for (var i = 0; i < _rockets.length; i++) {
    _rockets[i].update();
    _rockets[i].draw(_ctx);
    if (_rockets[i].needsRingCenter && _rockets[i].needsRingCenter()) {
      _rockets[i].doRingCenter();
    }
  }
  _ctx.restore();

  // 漂浮爱心：更新与绘制（常规坐标系，无需翻转）
  for (var h = 0; h < _hearts.length; h++) {
    _hearts[h].update();
    _hearts[h].draw(_ctx);
  }
  _hearts = _hearts.filter(function(h) { return !h.isDead(); });

  // 随机生成漂浮爱心（每隔 400~900ms）
  if (ts - _heartSpawnTimer > 400 + Math.random() * 500) {
    _heartSpawnTimer = ts;
    var heartColors = ['#FF69B4','#FF1493','#FF6B4A','#FF4444','#FF85A2','#FFB6C1','#FF2400','#FFD700'];
    _hearts.push(new HeartParticle(
      _dims.w * 0.05 + Math.random() * _dims.w * 0.9,
      -20 - Math.random() * 40,
      6 + Math.random() * 16,
      heartColors[Math.floor(Math.random() * heartColors.length)],
      { vy: 0.4 + Math.random() * 1.5, vx: (Math.random() - 0.5) * 0.7, decay: 0.002 + Math.random() * 0.003, opacity: 0.85 }
    ));
  }

  _rockets = _rockets.filter(function(r) { return r.alive; });
  _animId = requestAnimationFrame(_loop);
}

function _cleanup() {
  _running = false;
  if (_animId) { cancelAnimationFrame(_animId); _animId = null; }
  if (_timer) { clearInterval(_timer); _timer = null; }
  if (_barrageTimer) { clearInterval(_barrageTimer); _barrageTimer = null; }
  window.removeEventListener('resize', _resize);
  if (_overlay && _overlay.parentNode) {
    _overlay.parentNode.removeChild(_overlay);
  }
  _overlay = null;
  _canvas = null;
  _ctx = null;
  _rockets = [];
  _hearts = [];
  _heartSpawnTimer = 0;
  _barrageLanes = [];
  _barrageLastLane = -1;
}

export var Fireworks = {
  launch: function(opts) {
    var duration = (opts && opts.duration) || 6000;
    _cleanup();
    _duration = duration;

    _overlay = document.createElement('div');
    _overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;z-index:2147483647;pointer-events:none;background:rgba(5,5,20,0.52);';
    document.body.appendChild(_overlay);

    _canvas = document.createElement('canvas');
    _canvas.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;';
    _overlay.appendChild(_canvas);
    _ctx = _canvas.getContext('2d');

    _resize();
    window.addEventListener('resize', _resize);

    _running = true;
    _startTime = performance.now();
    _heartSpawnTimer = _startTime;

    // 立即首发
    _spawnRocket();
    // 持续发射
    var interval = Math.max(60, Math.min(120, duration / 45));
    _timer = setInterval(function() { if (_running) _spawnRocket(); }, interval);

    // 🎌 弹幕：先发几条，然后每隔 600~900ms 发一条
    for (var i = 0; i < 3; i++) { setTimeout(function() { _spawnBarrage(); }, i * 200); }
    _barrageTimer = setInterval(function() { if (_running) _spawnBarrage(); }, 600 + Math.random() * 400);

    _animId = requestAnimationFrame(_loop);
  }
};
