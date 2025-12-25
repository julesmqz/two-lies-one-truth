import { db } from '../firebase';
import { 
  collection, 
  doc, 
  setDoc, 
  updateDoc, 
  onSnapshot, 
  getDoc, 
  addDoc, 
  query, 
  where,
  getDocs,
  increment,
  writeBatch
} from 'firebase/firestore';

export const gameService = {
  async createGame(hostName) {
    const generateGameId = () => {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      let result = '';
      for (let i = 0; i < 6; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return result;
    };

    let gameId = generateGameId();
    let gameRef = doc(db, 'games', gameId);
    let gameSnap = await getDoc(gameRef);

    // Basic collision avoidance
    while (gameSnap.exists()) {
      gameId = generateGameId();
      gameRef = doc(db, 'games', gameId);
      gameSnap = await getDoc(gameRef);
    }

    await setDoc(gameRef, {
      status: 'lobby',
      currentTurnPlayerId: null,
      createdAt: new Date(),
    });
    
    const hostRef = doc(collection(db, `games/${gameId}/players`));
    await setDoc(hostRef, {
      name: hostName,
      isReady: false,
      options: [],
      score: 0,
      isHost: true
    });
    
    return { gameId: gameId, playerId: hostRef.id };
  },

  async joinGame(gameId, playerName) {
    const gameDoc = await getDoc(doc(db, 'games', gameId));
    if (!gameDoc.exists()) throw new Error('Game not found');
    
    const playerRef = doc(collection(db, `games/${gameId}/players`));
    await setDoc(playerRef, {
      name: playerName,
      isReady: false,
      options: [],
      score: 0,
      isHost: false
    });
    
    return playerRef.id;
  },

  async setReady(gameId, playerId, options) {
    const playerRef = doc(db, `games/${gameId}/players`, playerId);
    await updateDoc(playerRef, {
      options: options,
      isReady: true
    });
  },

  async setNotReady(gameId, playerId) {
    const playerRef = doc(db, `games/${gameId}/players`, playerId);
    await updateDoc(playerRef, {
      isReady: false
    });
  },

  async startGame(gameId, slideTimer = 0) {
    const playersSnap = await getDocs(collection(db, `games/${gameId}/players`));
    const players = playersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    if (players.length < 1) throw new Error('Not enough players');
    
    await updateDoc(doc(db, 'games', gameId), {
      status: 'playing',
      currentTurnPlayerId: players[0].id,
      turnIndex: 0,
      slideTimer: slideTimer,
      timerEnd: slideTimer > 0 ? Date.now() + slideTimer * 1000 : null,
      showResults: false
    });
  },

  async revealResults(gameId) {
    await updateDoc(doc(db, 'games', gameId), {
      showResults: true,
      timerEnd: null
    });
  },

  async nextTurn(gameId) {
    const gameSnap = await getDoc(doc(db, 'games', gameId));
    const gameData = gameSnap.data();
    
    const playersSnap = await getDocs(collection(db, `games/${gameId}/players`));
    const players = playersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    // Calculate scores for the turn that just ended
    const currentPlayer = players.find(p => p.id === gameData.currentTurnPlayerId);
    const truthIndex = currentPlayer.options.findIndex(o => o.isTruth);
    
    const batch = writeBatch(db);
    
    players.forEach(player => {
      if (player.id !== currentPlayer.id && player.votedForIndex === truthIndex) {
        batch.update(doc(db, `games/${gameId}/players`, player.id), {
          score: increment(3)
        });
      }
      // Reset voting status for next turn
      batch.update(doc(db, `games/${gameId}/players`, player.id), {
        votedForIndex: null
      });
    });

    const nextIndex = gameData.turnIndex + 1;
    if (nextIndex < players.length) {
      batch.update(doc(db, 'games', gameId), {
        currentTurnPlayerId: players[nextIndex].id,
        turnIndex: nextIndex,
        timerEnd: gameData.slideTimer > 0 ? Date.now() + gameData.slideTimer * 1000 : null,
        showResults: false
      });
    } else {
      batch.update(doc(db, 'games', gameId), {
        status: 'leaderboard',
        showResults: false
      });
    }
    
    await batch.commit();
  },

  async submitVote(gameId, playerId, optionIndex) {
    const playerRef = doc(db, `games/${gameId}/players`, playerId);
    await updateDoc(playerRef, {
      votedForIndex: optionIndex
    });
  },

  subscribeToGame(gameId, callback) {
    return onSnapshot(doc(db, 'games', gameId), (doc) => {
      callback(doc.data());
    });
  },

  subscribeToPlayers(gameId, callback) {
    return onSnapshot(collection(db, `games/${gameId}/players`), (snapshot) => {
      const players = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      callback(players);
    });
  }
};
