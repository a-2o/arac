<template>
  <div class="top">
    <div class="bench">
      <div class="slot" v-for="(champion, index) in bench" :key="index">
        <div class="slot-content">
          <div class="empty-slot"></div>
          <img v-if="champion?.iconUrl" :src="champion.iconUrl" class="champion-icon"
            :class="{ 'champion-icon-dimmed': champion.isComplete }" />
          <div class="border"></div>
          <img v-if="champion?.isComplete" :src="'check.svg'" class="checkmark-overlay" />
        </div>
      </div>
    </div>
    <div class="cards" :class="cardsState">
      <div class="slot" v-for="(champion, index) in cards" :key="index">
        <div class="slot-content">
          <div class="empty-slot"></div>
          <img v-if="champion?.iconUrl" :src="champion.iconUrl" class="champion-icon"
            :class="{ 'champion-icon-dimmed': champion.isComplete }" />
          <div class="border"></div>
          <img v-if="champion?.isComplete" :src="'check.svg'" class="checkmark-overlay" />
        </div>
      </div>
    </div>
  </div>

  <div class="left">
    <div class="team">
      <div class="slot" v-for="(teamMate, index) in team" :key="index">
        <div class="slot-content">
          <div class="empty-slot"></div>
          <img v-if="teamMate?.champion.iconUrl" :src="teamMate.champion.iconUrl" class="champion-icon"
            :class="{ 'champion-icon-dimmed': teamMate.champion.isComplete }" />
          <div class="border"></div>
          <img v-if="teamMate?.champion?.isComplete" :src="'check.svg'" class="checkmark-overlay" />
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
export default {
  data() {
    return {
      showCards: false as boolean,
      cardsState: 'sliding-in-fin' as string,

      bench: new Array(10).fill(null) as (Champion | null)[],
      cards: new Array(3).fill(null) as (Champion | null)[],
      team: new Array(5).fill(null) as (TeamMate | null)[],
    };
  },
  created() {
    window.onload = () => {
      // init
    }
    window.electron.onChampionSelected((isUserAction: boolean, teamMates: TeamMate[], benchChampions: Champion[]) => {
      if (isUserAction) {
        this.clearCards();
      }
      for (const [i, champion] of benchChampions.slice(0, 10).entries()) {
        this.bench[i] = champion;
      }
      teamMates.slice(0, 5).forEach(teamMate => {
        this.team[teamMate.cellId % 5] = teamMate;
      });
    });
    window.electron.onCardSelection((cards: Champion[]) => {
      const mappings: number[] = [0, 2, 1];
      cards.slice(0, 3).forEach((champion, i) => {
        this.cards[mappings[i]!] = champion;
      });
      this.cardsOut();
    });
    window.electron.onLobbyDeleted(() => {
      this.clearBench();
      this.clearCards();
      this.clearTeam();
    });
  },
  methods: {
    clearBench() {
      this.bench = new Array(10).fill(null);
    },
    clearCards() {
      this.cards = new Array(3).fill(null);
      this.cardsIn();
    },
    clearTeam() {
      this.team = new Array(5).fill(null);
    },
    cardsIn() {
      this.cardsState = 'sliding-in';
      setTimeout(() => this.cardsState = 'sliding-in-fin', 200);
    },
    cardsOut() {
      this.cardsState = 'sliding-out';
      setTimeout(() => this.cardsState = 'sliding-out-fin', 200);
    },
  },
  computed: {
    // init
  }
};
</script>

<style scoped>
.top {
  display: flex;
  flex-direction: column;
  align-items: center;

  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
}

.left {
  display: flex;
  flex-direction: row;
  align-items: center;

  position: absolute;
  top: 0;
  left: 0;
  height: 100%;
}

.bench {
  display: grid;
  grid-template-columns: repeat(10, 80px);
  gap: 16px;

  padding: 16px;
  background-color: rgb(20, 20, 20);

  border-right: 16px solid #296d98;
  border-bottom: 16px solid #0e2433;
  border-left: 16px solid #45b6fe;

  clip-path: polygon(0 0, 100% 0, 100% 100%, calc(50% + 162px) 100%, calc(50% + 152px) calc(100% - 10px), calc(50% - 152px) calc(100% - 10px), calc(50% - 162px) 100%, 0 100%);
}

.cards {
  display: grid;
  grid-template-columns: repeat(3, 80px);
  gap: 16px;

  position: absolute;
  top: 6px;
  z-index: -20;

  padding: 16px;
  background-color: rgb(20, 20, 20);

  border-right: 10px solid #998100;
  border-bottom: 10px solid #4d4100;
  border-left: 10px solid #ccac00;
}

.cards.sliding-in {
  transform: translateY(0);
  transition: transform 200ms cubic-bezier(0.4, 0.0, 1, 1);
}

.cards.sliding-in-fin {
  transform: translateY(0);
}

.cards.sliding-out {
  transform: translateY(calc(100% - 10px));
  transition: transform 200ms cubic-bezier(0.0, 0.0, 0.2, 1);
}

.cards.sliding-out-fin {
  transform: translateY(calc(100% - 10px));
}

.team {
  display: grid;
  grid-template-rows: repeat(5, 80px);
  gap: 16px;

  padding: 16px;
  background-color: rgb(20, 20, 20);

  border-top: 10px solid #45b6fe;
  border-right: 10px solid #296d98;
  border-bottom: 10px solid #0e2433;
}

.slot {
  width: 80px;
  height: 80px;
}

.slot-content {
  position: relative;
  width: 100%;
  height: 100%;
}

.champion-icon {
  position: absolute;
  width: 100%;
  height: 100%;
  z-index: 20;
}

.champion-icon-dimmed {
  filter: grayscale(50%) brightness(50%);
}

.checkmark-overlay {
  position: absolute;
  transform-origin: center center;
  transform: translate(50%, -50%);
  top: 0;
  right: 0;
  z-index: 40;
}

.border {
  position: absolute;
  width: 80px;
  height: 80px;
  border: 1px solid rgb(94, 94, 94);
  background-color: transparent;
  z-index: 30;
}

.empty-slot {
  position: absolute;
  width: 80px;
  height: 80px;
  background-color: rgb(255, 255, 255, 0.06);
  z-index: 10;
}
</style>
