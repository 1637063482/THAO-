// ==========================================
// fireworks.js — 全屏烟花动画
// 流光拖尾粒子 + 多种爆炸模式 + 加法混合
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

var BURST_TYPES = ['peony', 'willow', 'chrysanthemum', 'ring'];

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
//  火箭 — 多种爆炸模式
// ==================================================================
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
//  单例管理
// ==================================================================
var _timer = null;
var _overlay = null;
var _canvas = null;
var _ctx = null;
var _animId = null;
var _rockets = [];
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

  _rockets = _rockets.filter(function(r) { return r.alive; });
  _animId = requestAnimationFrame(_loop);
}

function _cleanup() {
  _running = false;
  if (_animId) { cancelAnimationFrame(_animId); _animId = null; }
  if (_timer) { clearInterval(_timer); _timer = null; }
  window.removeEventListener('resize', _resize);
  if (_overlay && _overlay.parentNode) {
    _overlay.parentNode.removeChild(_overlay);
  }
  _overlay = null;
  _canvas = null;
  _ctx = null;
  _rockets = [];
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

    // 立即首发
    _spawnRocket();
    // 持续发射
    var interval = Math.max(80, Math.min(150, duration / 35));
    _timer = setInterval(function() { if (_running) _spawnRocket(); }, interval);

    _animId = requestAnimationFrame(_loop);
  }
};
