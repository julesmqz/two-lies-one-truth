<template>
  <div class="game-view">
    <div v-if="!game" class="loading">
      <p>Loading game...</p>
    </div>

    <div v-else>
      <div class="game-header">
        <h2 class="nes-text is-primary">Game ID: {{ gameId }}</h2>
        <div class="nes-badge">
          <span :class="statusClass">{{ game.status.toUpperCase() }}</span>
        </div>
      </div>

      <!-- LOBBY -->
      <div v-if="game.status === 'lobby'" class="lobby">
        <div class="nes-container with-title">
          <p class="title">Players</p>
          <ul class="nes-list is-disc">
            <li v-for="player in players" :key="player.id">
              {{ player.name }}
              <span v-if="player.isHost" class="nes-text is-error">(Host)</span>
              <span v-if="player.isReady" class="nes-text is-success"> READY</span>
              <span v-else class="nes-text is-warning"> WAITING</span>
            </li>
          </ul>
        </div>

        <div v-if="!me?.isReady" class="nes-container with-title is-rounded mt-4">
          <p class="title">Your Options (2 Lies, 1 Truth)</p>
          <div v-for="(opt, index) in myOptions" :key="index" class="field mb-4">
            <label :for="'opt-'+index">Option {{ index + 1 }}</label>
            <div style="display: flex; align-items: center; gap: 30px;">
              <input type="text" :id="'opt-'+index" class="nes-input" v-model="opt.text" placeholder="Something about you...">
              <button
                type="button"
                class="heart-toggle"
                :aria-pressed="truthIndex === index"
                @click="setTruth(index)"
                :title="truthIndex === index ? 'Selected as Truth' : 'Mark as Truth'"
              >
                <i
                  :class="['nes-icon', 'is-large', 'heart', { 'is-empty': truthIndex !== index }]"
                  aria-hidden="true"
                ></i>
                <span class="visually-hidden">{{ truthIndex === index ? 'Truth selected' : 'Mark as truth' }}</span>
              </button>
            </div>
          </div>
          <button class="nes-btn is-primary" @click="readyUp" :disabled="!canReady">Ready Up</button>
        </div>

        <div v-if="me?.isHost" class="mt-4 nes-container with-title">
          <p class="title">Host Controls</p>
          <div class="field mb-4">
            <label for="timer_field">Slide Timer (seconds, 0 for no timer)</label>
            <input type="number" id="timer_field" class="nes-input" v-model="slideTimer">
          </div>
          <button class="nes-btn is-success" @click="startGame" :disabled="!allReady">Start Game</button>
        </div>
      </div>

      <!-- PLAYING -->
      <div v-else-if="game.status === 'playing'" class="playing">
        <div class="nes-container with-title is-centered">
          <p class="title">Voting Turn: {{ currentTurnPlayer?.name }}</p>

          <div v-if="game.timerEnd" class="mb-4">
            <p class="nes-text is-error">Time Left: {{ timeLeft }}s</p>
          </div>

          <div v-if="isMyTurn">
            <p>Your options are being shown! Wait for others to vote.</p>
          </div>

          <div v-else>
            <p>Pick the TRUTH:</p>
            <div v-for="(opt, index) in currentTurnPlayer?.options" :key="index" class="mb-4">
              <button
                class="nes-btn is-fullwidth"
                :class="me?.votedForIndex === index ? 'is-success' : ''"
                @click="vote(index)"
                :disabled="me?.votedForIndex !== null && me?.votedForIndex !== undefined"
              >
                {{ opt.text }}
              </button>
            </div>
          </div>

          <div v-if="me?.isHost" class="mt-4">
            <button class="nes-btn is-warning" @click="nextTurn">Next Slide / End Game</button>
          </div>
        </div>
      </div>

      <!-- LEADERBOARD -->
      <div v-else-if="game.status === 'leaderboard'" class="leaderboard">
        <div class="nes-container with-title">
          <p class="title">Final Leaderboard</p>
          <div class="nes-table-responsive">
            <table class="nes-table is-bordered is-centered">
              <thead>
                <tr>
                  <th>Player</th>
                  <th>Score</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="player in sortedPlayers" :key="player.id">
                  <td>{{ player.name }}</td>
                  <td>{{ player.score }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
        <button class="nes-btn is-primary mt-4" @click="$router.push('/')">Back to Home</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed, onUnmounted } from 'vue';
import { useRoute } from 'vue-router';
import { gameService } from '../services/gameService';

const route = useRoute();
const gameId = route.params.id;
const playerId = sessionStorage.getItem('playerId');

const game = ref(null);
const players = ref([]);
const myOptions = ref([
  { text: '', isTruth: false },
  { text: '', isTruth: false },
  { text: '', isTruth: false }
]);
const truthIndex = ref(null);
const slideTimer = ref(30);
const timeLeft = ref(0);
let timerInterval = null;

let unsubscribeGame = null;
let unsubscribePlayers = null;

onMounted(() => {
  unsubscribeGame = gameService.subscribeToGame(gameId, (data) => {
    game.value = data;
    if (data?.timerEnd) {
      startLocalTimer(data.timerEnd);
    } else {
      stopLocalTimer();
    }
  });
  unsubscribePlayers = gameService.subscribeToPlayers(gameId, (data) => {
    players.value = data;
  });
});

onUnmounted(() => {
  if (unsubscribeGame) unsubscribeGame();
  if (unsubscribePlayers) unsubscribePlayers();
  stopLocalTimer();
});

function startLocalTimer(timerEnd) {
  stopLocalTimer();
  timerInterval = setInterval(() => {
    const now = Date.now();
    const remaining = Math.max(0, Math.floor((timerEnd - now) / 1000));
    timeLeft.value = remaining;
    if (remaining === 0 && me.value?.isHost) {
      // Auto advance if host? Maybe just stop.
      // For now let's just leave it at 0.
    }
  }, 1000);
}

function stopLocalTimer() {
  if (timerInterval) clearInterval(timerInterval);
}

const me = computed(() => players.value.find(p => p.id === playerId));
const currentTurnPlayer = computed(() => players.value.find(p => p.id === game.value?.currentTurnPlayerId));
const isMyTurn = computed(() => game.value?.currentTurnPlayerId === playerId);

const canReady = computed(() => {
  return myOptions.value.every(o => o.text.trim() !== '') && truthIndex.value !== null;
});

const allReady = computed(() => {
  return players.value.length > 0 && players.value.every(p => p.isReady);
});

const sortedPlayers = computed(() => {
  return [...players.value].sort((a, b) => b.score - a.score);
});

const statusClass = computed(() => {
  if (!game.value) return '';
  switch (game.value.status) {
    case 'lobby': return 'is-warning';
    case 'playing': return 'is-success';
    case 'leaderboard': return 'is-primary';
    default: return '';
  }
});

async function readyUp() {
  const options = myOptions.value.map((opt, index) => ({
    text: opt.text,
    isTruth: index === truthIndex.value
  }));
  await gameService.setReady(gameId, playerId, options);
}

async function startGame() {
  await gameService.startGame(gameId, slideTimer.value);
}

async function nextTurn() {
  await gameService.nextTurn(gameId);
}

async function vote(index) {
  await gameService.submitVote(gameId, playerId, index);
}

function setTruth(index) {
  truthIndex.value = index;
}
</script>

<style scoped>
.game-view {
  max-width: 800px;
  margin: 2rem auto;
  padding: 0 1rem;
}
.game-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
}
.mt-4 { margin-top: 1rem; }
.mb-4 { margin-bottom: 1rem; }
.is-fullwidth { width: 100%; }

/* Heart toggle styles */
.heart-toggle {
  border: none;
  background: transparent;
  padding: 0.25rem 0.5rem;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.heart-toggle:focus {
  outline: 2px solid #209cee; /* NES.css primary-ish */
  outline-offset: 2px;
}
.visually-hidden {
  position: absolute !important;
  height: 1px; width: 1px;
  overflow: hidden;
  clip: rect(1px, 1px, 1px, 1px);
  white-space: nowrap; /* added line */
}
</style>
