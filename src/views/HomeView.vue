<template>
  <div class="home">
    <header class="header">
      <h1 class="nes-text is-primary">Two Lies, One Truth</h1>
    </header>

    <div class="nes-container with-title is-centered">
      <p class="title">Welcome</p>
      
      <div class="field">
        <label for="name_field">Your Name</label>
        <input type="text" id="name_field" class="nes-input" v-model="name" placeholder="Enter your name">
      </div>

      <div class="actions">
        <button type="button" class="nes-btn is-primary" @click="createNewGame" :disabled="!name">Create New Game</button>
        <div class="separator">OR</div>
        <div class="field">
          <label for="game_id_field">Game ID</label>
          <input type="text" id="game_id_field" class="nes-input" v-model="gameId" placeholder="Enter Game ID">
        </div>
        <button type="button" class="nes-btn is-success" @click="joinExistingGame" :disabled="!name || !gameId">Join Game</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { gameService } from '../services/gameService';

const name = ref('');
const gameId = ref('');
const router = useRouter();

async function createNewGame() {
  try {
    const { gameId, playerId } = await gameService.createGame(name.value);
    sessionStorage.setItem('playerId', playerId);
    router.push({ name: 'game', params: { id: gameId } });
  } catch (error) {
    alert('Error creating game: ' + error.message);
  }
}

async function joinExistingGame() {
  try {
    const playerId = await gameService.joinGame(gameId.value, name.value);
    sessionStorage.setItem('playerId', playerId);
    router.push({ name: 'game', params: { id: gameId.value } });
  } catch (error) {
    alert('Error joining game: ' + error.message);
  }
}
</script>

<style scoped>
.home {
  max-width: 600px;
  margin: 2rem auto;
  padding: 0 1rem;
}
.header {
  text-align: center;
  margin-bottom: 2rem;
}
.field {
  margin-bottom: 1.5rem;
}
.actions {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
.separator {
  text-align: center;
  margin: 0.5rem 0;
  font-weight: bold;
}
</style>
