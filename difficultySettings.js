const difficultySettings = {
    easy: {
        name:"Easy",
        color:"#88ff88",
        enemySpawnPeriodMin:1.5,
        enemySpawnPeriodMax:3.0,
        enemySpawnAcceleration:0.997,
        bigEnemyRate:0.07,
        smallMonsterAcceleration: 0.8,
        smallMonsterMaxSpeed: 2.8,
        bigMonsterAcceleration: 0.12,
        bigMonsterMaxSpeed: 1.5,
        bossHealthMax: 1500
    },
    normal:{
        name:"Normal",
        color:"#ffff88",
        enemySpawnPeriodMin:1.0,
        enemySpawnPeriodMax:2.4,
        enemySpawnAcceleration:0.995,
        bigEnemyRate:0.12,
        smallMonsterAcceleration: 1,
        smallMonsterMaxSpeed: 3.2,
        bigMonsterAcceleration: 0.15,
        bigMonsterMaxSpeed: 2,
        bossHealthMax: 2000
    },
    hard:{
        name:"Hard",
        color:"#ff8888",
        enemySpawnPeriodMin:0.8,
        enemySpawnPeriodMax:1.8,
        enemySpawnAcceleration:0.9925,
        bigEnemyRate:0.25,
        smallMonsterAcceleration: 1.2,
        smallMonsterMaxSpeed: 4.5,
        bigMonsterAcceleration: 0.2,
        bigMonsterMaxSpeed: 2.5,
        bossHealthMax: 3000
    }
}