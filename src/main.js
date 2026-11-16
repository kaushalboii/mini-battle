import * as THREE from 'three';
import { WorldScene } from './scene.js';
import { Player } from './entities/player.js';
import { EnemyFleet } from './entities/enemy.js';
import { Projectile } from './entities/projectile.js';
import { ParticleSystem } from './fx/particles.js';
import { sound } from './audio.js';

class MiniBattleGame {
  constructor() {
    this.container = document.getElementById('game-canvas');
    this.world = new WorldScene(this.container);
    this.fx = new ParticleSystem(this.world.scene);

    this.player = new Player(this.world.scene, this.world);
    this.enemyFleet = new EnemyFleet(this.world.scene, this.world);

    // Game State
    this.state = 'PLAYER_AIM'; // 'PLAYER_AIM' | 'CHARGING' | 'PROJECTILE_FLIGHT' | 'RESOLVING' | 'ENEMY_AIM' | 'ENEMY_FLIGHT' | 'ROUND_WON' | 'GAME_OVER'
    this.round = 1;
    this.maxRounds = 3;

    // Stats
    this.shotsFired = 0;
    this.hitsLanded = 0;
    this.score = 0;

    // Wind Vector (affects trajectory)
    this.wind = new THREE.Vector3(0, 0, 0);

    // Selected Weapon
    this.currentWeapon = 'coconut';
    this.ammo = {
      coconut: Infinity,
      pineapple: 3,
      watermelon: 2
    };

    // Power Charge mechanics
    this.isCharging = false;
    this.chargeDir = 1;
    this.chargeSpeed = 75; // % per second

    // Active Projectiles
    this.activeProjectiles = [];

    // Camera follow & shake state
    this.camTrackingTarget = null;
    this.shakeIntensity = 0;
    this.shakeDecay = 4.5;

    // Drag-to-aim state on 3D view
    this.isPointerDragging = false;
    this.previousPointerPos = { x: 0, y: 0 };

    this.bindDomElements();
    this.bindEvents();
    this.startRound(1);

    // Start main game loop
    this.animate = this.animate.bind(this);
    requestAnimationFrame(this.animate);
  }

  bindDomElements() {
    this.dom = {
      roundBadge: document.getElementById('round-badge'),
      turnBanner: document.getElementById('turn-banner'),
      turnText: document.getElementById('turn-text'),
      windVal: document.getElementById('wind-val'),
      btnSound: document.getElementById('btn-sound'),
      btnRestart: document.getElementById('btn-restart'),
      playerHpVal: document.getElementById('player-hp-val'),
      playerHpBar: document.getElementById('player-hp-bar'),
      enemyNameLabel: document.getElementById('enemy-name-label'),
      enemyHpVal: document.getElementById('enemy-hp-val'),
      enemyHpBar: document.getElementById('enemy-hp-bar'),
      sliderElevation: document.getElementById('slider-elevation'),
      valElevation: document.getElementById('val-elevation'),
      sliderYaw: document.getElementById('slider-yaw'),
      valYaw: document.getElementById('val-yaw'),
      btnFire: document.getElementById('btn-fire'),
      powerBar: document.getElementById('power-bar'),
      powerVal: document.getElementById('power-val'),
      toastContainer: document.getElementById('toast-container'),
      roundModal: document.getElementById('round-modal'),
      modalIcon: document.getElementById('modal-icon'),
      modalTitle: document.getElementById('modal-title'),
      modalDesc: document.getElementById('modal-desc'),
      statShots: document.getElementById('stat-shots'),
      statAccuracy: document.getElementById('stat-accuracy'),
      statScore: document.getElementById('stat-score'),
      btnModalNext: document.getElementById('btn-modal-next'),
      countPineapple: document.getElementById('count-pineapple'),
      countWatermelon: document.getElementById('count-watermelon'),
      weaponButtons: document.querySelectorAll('.weapon-btn')
    };
  }

  bindEvents() {
    // 1. Audio toggle & Restart
    this.dom.btnSound.addEventListener('click', () => {
      const isMuted = sound.toggleMute();
      this.dom.btnSound.textContent = isMuted ? '🔇' : '🔊';
    });

    this.dom.btnRestart.addEventListener('click', () => {
      this.resetGame();
    });

    // 2. Weapon selector
    this.dom.weaponButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const weaponType = btn.dataset.weapon;
        if (this.ammo[weaponType] > 0) {
          this.currentWeapon = weaponType;
          this.dom.weaponButtons.forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          sound.ensureContext();
        } else {
          this.showToast('Out of ammo for this weapon!', '#ff7675');
        }
      });
    });

    // 3. Aim Sliders
    this.dom.sliderElevation.addEventListener('input', (e) => {
      this.player.elevation = parseFloat(e.target.value);
      this.dom.valElevation.textContent = `${Math.round(this.player.elevation)}°`;
    });

    this.dom.sliderYaw.addEventListener('input', (e) => {
      this.player.yaw = parseFloat(e.target.value);
      this.dom.valYaw.textContent = `${Math.round(this.player.yaw)}°`;
    });

    // 4. Fire button (Hold to charge & release to fire, or click to fire)
    const startCharge = (e) => {
      e.preventDefault();
      sound.ensureContext();
      if (this.state !== 'PLAYER_AIM') return;
      this.isCharging = true;
      this.state = 'CHARGING';
      this.dom.btnFire.classList.add('charging');
      this.dom.btnFire.textContent = '⚡ CHARGING...';
    };

    const releaseCharge = (e) => {
      e.preventDefault();
      if (this.state === 'CHARGING') {
        this.isCharging = false;
        this.dom.btnFire.classList.remove('charging');
        this.dom.btnFire.textContent = '🚀 HOLD TO FIRE';
        this.firePlayerWeapon();
      }
    };

    this.dom.btnFire.addEventListener('mousedown', startCharge);
    window.addEventListener('mouseup', releaseCharge);
    this.dom.btnFire.addEventListener('touchstart', startCharge, { passive: false });
    window.addEventListener('touchend', releaseCharge);

    // 5. Canvas Drag to Aim
    const canvas = this.container;
    canvas.addEventListener('mousedown', (e) => {
      this.isPointerDragging = true;
      this.previousPointerPos = { x: e.clientX, y: e.clientY };
    });

    window.addEventListener('mousemove', (e) => {
      if (!this.isPointerDragging || this.state !== 'PLAYER_AIM') return;
      const dx = e.clientX - this.previousPointerPos.x;
      const dy = e.clientY - this.previousPointerPos.y;

      // Adjust yaw and elevation
      this.player.yaw = THREE.MathUtils.clamp(this.player.yaw - dx * 0.25, -35, 35);
      this.player.elevation = THREE.MathUtils.clamp(this.player.elevation - dy * 0.2, 12, 65);

      this.dom.sliderYaw.value = this.player.yaw;
      this.dom.valYaw.textContent = `${Math.round(this.player.yaw)}°`;
      this.dom.sliderElevation.value = this.player.elevation;
      this.dom.valElevation.textContent = `${Math.round(this.player.elevation)}°`;

      this.previousPointerPos = { x: e.clientX, y: e.clientY };
    });

    window.addEventListener('mouseup', () => {
      this.isPointerDragging = false;
    });

    // 6. Modal action button
    this.dom.btnModalNext.addEventListener('click', () => {
      this.dom.roundModal.classList.remove('active');
      if (this.round < this.maxRounds) {
        this.startRound(this.round + 1);
      } else {
        this.resetGame();
      }
    });
  }

  generateWind() {
    // Generate gentle crosswind along Z axis
    const zWind = (Math.random() - 0.5) * 6.0;
    this.wind.set(0, 0, zWind);

    const speed = Math.abs(zWind).toFixed(1);
    const arrow = zWind >= 0 ? '➔ (South)' : '⬅ (North)';
    this.dom.windVal.textContent = `${speed} m/s ${arrow}`;
  }

  startRound(roundNumber) {
    this.round = roundNumber;
    this.enemyFleet.setupRound(roundNumber);
    this.player.reset();
    this.generateWind();

    this.activeProjectiles = [];
    this.camTrackingTarget = null;

    // Reset ammo for specials
    this.ammo.pineapple = 3;
    this.ammo.watermelon = 2;
    this.updateAmmoUI();

    // Round badge
    const names = ['SCOUT SKIFF', 'TWIN CORSAIR', 'DREAD BOSS'];
    this.dom.roundBadge.textContent = `ROUND ${this.round}/${this.maxRounds}: ${names[this.round - 1]}`;

    // Update enemy label
    const target = this.enemyFleet.enemies[0];
    this.dom.enemyNameLabel.textContent = `🏴‍☠️ ${target.name.toUpperCase()}`;
    this.updateHealthUI();

    this.setTurn('PLAYER');
    this.showToast(`ROUND ${this.round} START!`, '#00d2ff');
  }

  resetGame() {
    this.dom.roundModal.classList.remove('active');
    this.shotsFired = 0;
    this.hitsLanded = 0;
    this.score = 0;
    this.startRound(1);
  }

  setTurn(turn) {
    if (turn === 'PLAYER') {
      this.state = 'PLAYER_AIM';
      this.dom.turnBanner.className = 'turn-banner player-turn';
      this.dom.turnText.textContent = 'YOUR TURN: AIM & FIRE';
      this.dom.btnFire.disabled = false;
      this.player.setTrajectoryVisible(true);
      this.camTrackingTarget = null;
    } else {
      this.state = 'ENEMY_AIM';
      this.dom.turnBanner.className = 'turn-banner enemy-turn';
      this.dom.turnText.textContent = 'PIRATES AIMING CANNON...';
      this.dom.btnFire.disabled = true;
      this.player.setTrajectoryVisible(false);

      // Enemy AI plans shot after short suspense delay
      setTimeout(() => {
        this.executeEnemyTurn();
      }, 1400);
    }
  }

  updateAmmoUI() {
    this.dom.countPineapple.textContent = this.ammo.pineapple;
    this.dom.countWatermelon.textContent = this.ammo.watermelon;
  }

  updateHealthUI() {
    // Player
    const playerRatio = Math.max(0, this.player.hp / this.player.maxHp);
    this.dom.playerHpBar.style.width = `${playerRatio * 100}%`;
    this.dom.playerHpVal.textContent = `${Math.round(this.player.hp)} / ${this.player.maxHp}`;

    // Enemy
    if (this.enemyFleet.enemies.length > 0) {
      const enemy = this.enemyFleet.enemies[0];
      const enemyRatio = Math.max(0, enemy.hp / enemy.maxHp);
      this.dom.enemyHpBar.style.width = `${enemyRatio * 100}%`;
      this.dom.enemyHpVal.textContent = `${Math.round(enemy.hp)} / ${enemy.maxHp}`;
    }
  }

  showToast(text, color = '#ffffff') {
    const toast = document.createElement('div');
    toast.className = 'game-toast';
    toast.textContent = text;
    toast.style.color = color;
    this.dom.toastContainer.appendChild(toast);
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 1300);
  }

  triggerCameraShake(amount) {
    this.shakeIntensity = Math.max(this.shakeIntensity, amount);
  }

  // Player Fires Weapon
  firePlayerWeapon() {
    if (this.state !== 'PLAYER_AIM' && this.state !== 'CHARGING') return;

    // Check Ammo
    if (this.ammo[this.currentWeapon] <= 0) {
      this.showToast('Out of ammo!', '#ff7675');
      this.currentWeapon = 'coconut';
      this.dom.weaponButtons.forEach(b => b.classList.remove('active'));
      this.dom.weaponButtons[0].classList.add('active');
    }

    if (this.currentWeapon !== 'coconut') {
      this.ammo[this.currentWeapon]--;
      this.updateAmmoUI();
    }

    this.state = 'PROJECTILE_FLIGHT';
    this.shotsFired++;
    this.player.setTrajectoryVisible(false);
    this.dom.btnFire.disabled = true;

    // Spawn Projectile
    const muzzlePos = this.player.getMuzzleWorldPosition();
    const velocity = this.player.getLaunchVelocity();

    // Muzzle FX & Sound
    this.fx.createMuzzleFlash(muzzlePos, velocity.clone().normalize());
    this.player.applyRecoil();
    sound.playCannonFire();
    this.triggerCameraShake(0.35);

    const proj = new Projectile(
      this.world.scene,
      this.world,
      this.currentWeapon,
      muzzlePos,
      velocity,
      true
    );

    this.activeProjectiles.push(proj);
    this.camTrackingTarget = proj;
  }

  // Enemy AI Turn
  executeEnemyTurn() {
    if (this.player.hp <= 0 || this.enemyFleet.enemies.length === 0) return;

    const targetPos = this.player.position.clone();
    const shotData = this.enemyFleet.calculateAIShot(targetPos, this.wind);

    // Muzzle FX
    this.fx.createMuzzleFlash(shotData.origin, shotData.velocity.clone().normalize());
    sound.playCannonFire();
    this.triggerCameraShake(0.3);

    const proj = new Projectile(
      this.world.scene,
      this.world,
      'enemy_ball',
      shotData.origin,
      shotData.velocity,
      false
    );

    this.activeProjectiles.push(proj);
    this.camTrackingTarget = proj;
    this.state = 'ENEMY_FLIGHT';
  }

  // Handle Watermelon Cluster Split
  splitWatermelon(pos, vel) {
    sound.playSplitSound();
    for (let i = -1; i <= 1; i++) {
      const spreadVel = vel.clone();
      spreadVel.z += i * 3.5;
      spreadVel.x += (Math.random() - 0.5) * 2;
      const sub = new Projectile(
        this.world.scene,
        this.world,
        'watermelon',
        pos.clone(),
        spreadVel,
        true
      );
      sub.hasSplit = true; // prevent recursive splitting
      this.activeProjectiles.push(sub);
    }
  }

  // Resolve Impact (Collision against target or water)
  resolveImpact(result, proj) {
    const impactPos = result.position;

    if (result.isPlayerShot) {
      // Check collision against Enemy Fleet
      let hit = false;
      const enemy = this.enemyFleet.enemies[0];

      if (enemy) {
        const dist = impactPos.distanceTo(enemy.hitboxCenter);
        if (dist <= enemy.hitboxRadius + result.blastRadius) {
          hit = true;
          this.hitsLanded++;

          // Critical hit if direct center strike
          const isCritical = dist < enemy.hitboxRadius * 0.45;
          const finalDamage = Math.round(result.damage * (isCritical ? 1.5 : 1.0));

          this.fx.createExplosion(impactPos, isCritical);
          sound.playImpactHit(isCritical);
          this.triggerCameraShake(isCritical ? 0.7 : 0.45);

          const status = this.enemyFleet.takeDamage(finalDamage, impactPos);
          this.updateHealthUI();

          const toastText = isCritical ? `💥 CRITICAL HIT! -${finalDamage}` : `🎯 HIT! -${finalDamage}`;
          this.showToast(toastText, isCritical ? '#ff1744' : '#ffea00');
          this.score += isCritical ? 250 : 150;

          if (status.defeated) {
            setTimeout(() => this.handleRoundWon(), 1200);
            return;
          }
        }
      }

      if (!hit) {
        // Water splash miss
        this.fx.createWaterSplash(impactPos);
        sound.playWaterSplash();
        this.showToast('💦 SPLASH MISS!', '#48dbfb');
      }

      // Transition to Enemy Turn after suspense
      setTimeout(() => {
        if (this.state !== 'ROUND_WON') {
          this.generateWind();
          this.setTurn('ENEMY');
        }
      }, 1600);

    } else {
      // Enemy Shot checking collision with Player
      const dist = impactPos.distanceTo(this.player.position);
      if (dist <= 3.8 + result.blastRadius) {
        // Player got hit!
        const isDead = this.player.takeDamage(result.damage);
        this.fx.createExplosion(impactPos, true);
        sound.playImpactHit(true);
        this.triggerCameraShake(0.65);
        this.updateHealthUI();
        this.showToast(`💥 YOU WERE HIT! -${result.damage}`, '#ff4d4d');

        if (isDead) {
          setTimeout(() => this.handleGameOver(), 1200);
          return;
        }
      } else {
        // Enemy missed
        this.fx.createWaterSplash(impactPos);
        sound.playWaterSplash();
        this.showToast('🛡️ PIRATE SHOT MISSED!', '#00e676');
      }

      // Transition back to Player Turn
      setTimeout(() => {
        if (this.state !== 'GAME_OVER') {
          this.generateWind();
          this.setTurn('PLAYER');
        }
      }, 1600);
    }
  }

  handleRoundWon() {
    this.state = 'ROUND_WON';
    sound.playVictory();
    this.triggerCameraShake(0.5);

    const accuracy = this.shotsFired > 0 ? Math.round((this.hitsLanded / this.shotsFired) * 100) : 100;
    this.dom.statShots.textContent = this.shotsFired;
    this.dom.statAccuracy.textContent = `${accuracy}%`;
    this.dom.statScore.textContent = this.score + this.round * 500;

    if (this.round < this.maxRounds) {
      this.dom.modalIcon.textContent = '🏆';
      this.dom.modalTitle.textContent = `ROUND ${this.round} CLEARED!`;
      this.dom.modalDesc.textContent = 'The pirate vessel was destroyed! Prepare for an escalating challenge in the next reef!';
      this.dom.btnModalNext.textContent = `CONTINUE TO ROUND ${this.round + 1} ➔`;
    } else {
      this.dom.modalIcon.textContent = '👑';
      this.dom.modalTitle.textContent = 'TREASURE REEF LIBERATED!';
      this.dom.modalDesc.textContent = 'Captain Dread-Beard and his entire pirate fleet have been sent to the ocean depths! You are the champion of the reef!';
      this.dom.btnModalNext.textContent = 'PLAY AGAIN 🔄';
    }

    this.dom.roundModal.classList.add('active');
  }

  handleGameOver() {
    this.state = 'GAME_OVER';
    sound.playDefeat();
    this.triggerCameraShake(0.8);

    const accuracy = this.shotsFired > 0 ? Math.round((this.hitsLanded / this.shotsFired) * 100) : 0;
    this.dom.modalIcon.textContent = '💀';
    this.dom.modalTitle.textContent = 'YOUR RAFT WAS SUNK!';
    this.dom.modalDesc.textContent = 'The pirate cannons breached your float tube. The tropical reef has fallen to the pirates!';
    this.dom.statShots.textContent = this.shotsFired;
    this.dom.statAccuracy.textContent = `${accuracy}%`;
    this.dom.statScore.textContent = this.score;
    this.dom.btnModalNext.textContent = 'TRY AGAIN 🔄';

    this.dom.roundModal.classList.add('active');
  }

  // Camera Management
  updateCamera(delta) {
    const cam = this.world.camera;

    if (this.camTrackingTarget && this.camTrackingTarget.active) {
      // Dynamic chase camera following projectile
      const projPos = this.camTrackingTarget.position;
      const targetCamPos = projPos.clone().add(new THREE.Vector3(-14, 7, 0));
      cam.position.lerp(targetCamPos, delta * 5.0);
      cam.lookAt(projPos.clone().add(new THREE.Vector3(6, 0, 0)));
    } else {
      // Return smoothly to default player aiming camera
      cam.position.lerp(this.world.defaultCamPos, delta * 3.5);
      cam.lookAt(this.world.defaultLookTarget);
    }

    // Apply Camera Shake
    if (this.shakeIntensity > 0) {
      const shakeOffset = new THREE.Vector3(
        (Math.random() - 0.5) * this.shakeIntensity,
        (Math.random() - 0.5) * this.shakeIntensity,
        (Math.random() - 0.5) * this.shakeIntensity
      );
      cam.position.add(shakeOffset);
      this.shakeIntensity = Math.max(0, this.shakeIntensity - delta * this.shakeDecay);
    }
  }

  // Main Animation Tick
  animate() {
    requestAnimationFrame(this.animate);

    const delta = Math.min(this.world.clock.getDelta(), 0.1);
    const time = this.world.clock.getElapsedTime();

    // 1. Power meter charge update
    if (this.isCharging && this.state === 'CHARGING') {
      this.player.power += this.chargeDir * this.chargeSpeed * delta;
      if (this.player.power >= 100) {
        this.player.power = 100;
        this.chargeDir = -1;
      } else if (this.player.power <= 15) {
        this.player.power = 15;
        this.chargeDir = 1;
      }

      this.dom.powerBar.style.width = `${this.player.power}%`;
      this.dom.powerVal.textContent = Math.round(this.player.power);
      sound.playChargeTick(this.player.power / 100);
    }

    // 2. Update entities & water
    this.world.updateWater(time);
    this.world.updateClouds(delta);
    this.player.update(time, delta, this.wind);
    this.enemyFleet.update(time, delta);
    this.fx.update(delta);

    // 3. Update active projectiles
    for (let i = this.activeProjectiles.length - 1; i >= 0; i--) {
      const p = this.activeProjectiles[i];
      const result = p.update(delta, this.wind, (pos, vel) => this.splitWatermelon(pos, vel));

      if (result.state === 'water_impact') {
        p.destroy();
        this.activeProjectiles.splice(i, 1);
        this.resolveImpact(result, p);
      } else if (result.state === 'split') {
        this.activeProjectiles.splice(i, 1);
      }
    }

    // 4. Update camera
    this.updateCamera(delta);

    // 5. Render Scene
    this.world.renderer.render(this.world.scene, this.world.camera);
  }
}

// Boot game when DOM is ready
window.addEventListener('DOMContentLoaded', () => {
  new MiniBattleGame();
});

