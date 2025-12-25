<template>
  <div class="game-view">
    <!-- JOIN MODAL -->
    <div v-if="showJoinModal" class="modal-overlay">
      <div class="nes-container with-title is-rounded is-centered modal-content">
        <p class="title">Unirse</p>
        <p>Ingresa tu nombre:</p>
        <div class="field mb-4">
          <input type="text" v-model="newPlayerName" class="nes-input" placeholder="P.e. Negrito Santo"
                 @keyup.enter="joinGame">
        </div>
        <button class="nes-btn is-primary" @click="joinGame" :disabled="!newPlayerName.trim()">Unirse</button>
      </div>
    </div>

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
        <div v-if="editingPlayerId" class="nes-container with-title is-rounded mt-4">
          <p class="title">Editando a {{ editingPlayerName }}</p>

          <div v-for="(opt, index) in myOptions" :key="index" class="field mb-4">
            <div style="display: flex; align-items: center; gap: 30px;">
              <label :for="'opt-'+index" style="flex:1;">Opción {{ index + 1 }}</label>
              <button
                type="button"
                class="heart-toggle"
                :aria-pressed="truthIndex === index"
                @click="setTruth(index)"
                :title="truthIndex === index ? 'Selected as Truth' : 'Mark as Truth'"
              >
                <i
                  :class="['nes-icon', 'is-medium', 'heart', { 'is-empty': truthIndex !== index }]"
                  aria-hidden="true"
                ></i>
                <span class="visually-hidden">{{ truthIndex === index ? 'Truth selected' : 'Mark as truth' }}</span>
              </button>
            </div>
            <textarea type="text" :id="'opt-'+index" class="nes-input" v-model="opt.text"
                      placeholder="Algo sobre ti..."></textarea>
          </div>
          <div class="actions">
            <button class="nes-btn is-primary" @click="saveOptions" :disabled="!canReady">Guardar</button>
            <button class="nes-btn" @click="cancelEdit">Cancelar</button>
          </div>
        </div>

        <div v-else-if="!me?.isReady" class="nes-container with-title is-rounded mt-4">
          <p class="title">Tus opciones</p>

          <div v-for="(opt, index) in myOptions" :key="index" class="field mb-4">
            <div style="display: flex; align-items: center; gap: 30px;">
              <label :for="'opt-'+index" style="flex:1;">Opción {{ index + 1 }}</label>
              <button
                type="button"
                class="heart-toggle"
                :aria-pressed="truthIndex === index"
                @click="setTruth(index)"
                :title="truthIndex === index ? 'Selected as Truth' : 'Mark as Truth'"
              >
                <i
                  :class="['nes-icon', 'is-medium', 'heart', { 'is-empty': truthIndex !== index }]"
                  aria-hidden="true"
                ></i>
                <span class="visually-hidden">{{ truthIndex === index ? 'Truth selected' : 'Mark as truth' }}</span>
              </button>
            </div>
            <textarea type="text" :id="'opt-'+index" class="nes-input" v-model="opt.text"
                      placeholder="Algo sobre ti..."></textarea>
          </div>
          <div class="actions">
            <button class="nes-btn is-primary" @click="readyUp" :disabled="!canReady">Listo</button>
          </div>
        </div>

        <div class="nes-container with-title mt-4">
          <p class="title">Players</p>
          <ul class="nes-list is-disc">
            <li v-for="player in players" :key="player.id">
              <span 
                :class="{ 'clickable-name': canEdit(player) }" 
                @click="canEdit(player) && startEditing(player)"
                :title="canEdit(player) ? 'Click to edit' : ''"
              >
                {{ player.name }}
              </span>
              <span v-if="player.isHost" class="nes-text is-error">(Host)</span>
              <span v-if="player.isReady" class="nes-text is-success"> READY</span>
              <span v-else class="nes-text is-warning"> WAITING</span>
            </li>
          </ul>
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
        <div class="nes-container with-title is-centered mt-4">
          <p class="title">{{ currentTurnPlayer?.name }}</p>

          <div v-if="game.timerEnd" class="mb-4">
            <p class="nes-text is-error">Resta: {{ timeLeft }}s</p>
          </div>

          <div v-if="game.showResults" class="results mb-4">
            <div class="nes-container is-rounded">
              <p class="nes-text is-success">La verdad era:</p>
              <p class="nes-text is-success">{{
                  currentTurnPlayer?.options[truthIndexForCurrentPlayer]?.text }}</p>
              <p class="nes-text is-primary">{{ correctPercentage }}% le atinaron</p>
            </div>
          </div>

          <div class="mb-4">
            <p class="nes-text is-primary">Votos: {{ votesCount }} / {{ totalVoters }}</p>
          </div>

          <div v-if="isMyTurn">
            <p>Tus opciones están mostrándose. Espera a que otros voten.</p>
          </div>

          <div v-else>
            <p>Escoje la VERDAD:</p>
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
            <button v-if="!game.showResults" class="nes-btn is-warning" @click="revealResults">Reveal Results</button>
            <button v-else class="nes-btn is-warning" @click="nextTurn">Next Slide / End Game</button>
          </div>
        </div>
      </div>

      <!-- LEADERBOARD -->
      <div v-else-if="game.status === 'leaderboard'" class="leaderboard">
        <div class="nes-container with-title mt-4">
          <p class="title">Leaderboard</p>
          <section class="icon-list is-centered">
            <i class="nes-icon trophy is-large"></i>
          </section>
          <div class="nes-table-responsive">
            <table class="nes-table is-bordered is-centered">
              <thead>
                <tr>
                  <th>Jugador</th>
                  <th>Score</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="player in sortedPlayers" :key="player.id">
                  <td>{{ player.name }}</td>
                  <td>
                    <small>{{ player.score }}</small>
                    <i class="nes-icon close is-small" v-if="player.score === 0"></i>
                    <i class="nes-icon coin is-small" v-if="player.score > 0"></i>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
        <button class="nes-btn is-primary mt-4" @click="$router.push('/')">Regresar</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed, onUnmounted, watch } from 'vue';
import { useRoute } from 'vue-router';
import { gameService } from '../services/gameService';

const route = useRoute();
const gameId = route.params.id;
const currentPlayerId = ref(sessionStorage.getItem('playerId'));
const showJoinModal = ref(false);
const newPlayerName = ref(sessionStorage.getItem('playerName') || '');

const game = ref(null);
const players = ref([]);
const myOptions = ref([
  { text: '', isTruth: false },
  { text: '', isTruth: false },
  { text: '', isTruth: false }
]);
const truthIndex = ref(null);
const editingPlayerId = ref(null);
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

const me = computed(() => players.value.find(p => p.id === currentPlayerId.value));

const isJoining = ref(false);

// If players are loaded and I'm not among them, I need to join
watch([players, game], ([newPlayers, newGame]) => {
  if (newGame && newPlayers.length > 0 && !me.value && !showJoinModal.value && !isJoining.value) {
    if (newPlayerName.value) {
      joinGame();
    } else {
      showJoinModal.value = true;
    }
  }
}, { immediate: true });

// Sync myOptions when me is first loaded and not already editing
watch(me, (newMe) => {
  if (newMe && !editingPlayerId.value && !newMe.isReady && myOptions.value.every(o => o.text === '')) {
    resetToMyOptions();
  }
}, { immediate: true });

async function joinGame() {
  if (!newPlayerName.value.trim()) return;
  if (isJoining.value) return;
  isJoining.value = true;
  try {
    const id = await gameService.joinGame(gameId, newPlayerName.value.trim());
    sessionStorage.setItem('playerId', id);
    sessionStorage.setItem('playerName', newPlayerName.value.trim());
    currentPlayerId.value = id;
    showJoinModal.value = false;
  } catch (error) {
    console.error('Error joining game:', error);
    alert('Failed to join game. Please check the Game ID.');
  } finally {
    isJoining.value = false;
  }
}

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

const editingPlayerName = computed(() => {
  const p = players.value.find(p => p.id === editingPlayerId.value);
  return p ? p.name : '';
});

function canEdit(player) {
  if (!me.value) return false;
  return me.value.isHost || player.id === currentPlayerId.value;
}

function startEditing(player) {
  editingPlayerId.value = player.id;
  if (player.options && player.options.length === 3) {
    myOptions.value = player.options.map(o => ({ text: o.text, isTruth: o.isTruth }));
    truthIndex.value = player.options.findIndex(o => o.isTruth);
  } else {
    myOptions.value = [
      { text: '', isTruth: false },
      { text: '', isTruth: false },
      { text: '', isTruth: false }
    ];
    truthIndex.value = null;
  }
  // If editing someone else (host) or self, we might want to mark them as not ready
  // to prevent game start, but actually the requirement says "edit after player is ready".
  // If we don't set isReady to false, the host could start the game while someone is editing.
  gameService.setNotReady(gameId, player.id);
}

function cancelEdit() {
  editingPlayerId.value = null;
  // Reset myOptions to my own options if I was editing someone else? 
  // Actually, myOptions is used for the "Ready" form too.
  resetToMyOptions();
}

function resetToMyOptions() {
  if (me.value && me.value.options && me.value.options.length === 3) {
    myOptions.value = me.value.options.map(o => ({ text: o.text, isTruth: o.isTruth }));
    truthIndex.value = me.value.options.findIndex(o => o.isTruth);
  } else {
    myOptions.value = [
      { text: '', isTruth: false },
      { text: '', isTruth: false },
      { text: '', isTruth: false }
    ];
    truthIndex.value = null;
  }
}

async function saveOptions() {
  const options = myOptions.value.map((opt, index) => ({
    text: opt.text,
    isTruth: index === truthIndex.value
  }));
  await gameService.setReady(gameId, editingPlayerId.value, options);
  editingPlayerId.value = null;
  resetToMyOptions();
}

const currentTurnPlayer = computed(() => players.value.find(p => p.id === game.value?.currentTurnPlayerId));
const isMyTurn = computed(() => game.value?.currentTurnPlayerId === currentPlayerId.value);

const votesCount = computed(() => {
  return players.value.filter(p => p.id !== game.value?.currentTurnPlayerId && p.votedForIndex !== null && p.votedForIndex !== undefined).length;
});

const totalVoters = computed(() => {
  return players.value.length - 1;
});

const truthIndexForCurrentPlayer = computed(() => {
  return currentTurnPlayer.value?.options.findIndex(o => o.isTruth);
});

const correctPercentage = computed(() => {
  if (totalVoters.value === 0) return 0;
  const correctVotes = players.value.filter(p => p.id !== game.value?.currentTurnPlayerId && p.votedForIndex === truthIndexForCurrentPlayer.value).length;
  return Math.round((correctVotes / totalVoters.value) * 100);
});

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
  await gameService.setReady(gameId, currentPlayerId.value, options);
  editingPlayerId.value = null;
}

async function startGame() {
  await gameService.startGame(gameId, slideTimer.value);
}

async function revealResults() {
  await gameService.revealResults(gameId);
}

async function nextTurn() {
  await gameService.nextTurn(gameId);
}

async function vote(index) {
  await gameService.submitVote(gameId, currentPlayerId.value, index);
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
.mt-4 { margin-top: 1rem; }
.mb-4 { margin-bottom: 1rem; }
.is-fullwidth { width: 100%; }
.clickable-name {
  cursor: pointer;
  text-decoration: underline;
  text-underline-offset: 4px;
}
.clickable-name:hover {
  color: #209cee;
}
.actions {
  display: flex;
  gap: 1rem;
  margin-top: 1rem;
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.7);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal-content {
  background-color: white;
  width: 90%;
  max-width: 500px;
}

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
