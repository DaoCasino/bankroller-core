DCLib.defineDAppLogic('slot_game', function () {
  const S_ROWS = 3
  const S_COLS = 5

  const S_SYMBOLS = Object.freeze({
      Nine    : '0'  ,
      Ten     : '1'  ,
      Jack    : '2'  ,
      Queen   : '3'  ,
      King    : '4'  ,
      Ace     : '5'  ,
      Wild    : '6'  ,
      Airdrop : '7'  ,
      Unicorn : '8'  ,
      Lambo   : '9'  ,
      Dao     : '10' ,
      Bonus   : '11'
  })

  const S_SYMBOLS_NAMES = [
    S_SYMBOLS.Nine,
    S_SYMBOLS.Ten,
    S_SYMBOLS.Jack,
    S_SYMBOLS.Queen,
    S_SYMBOLS.King,
    S_SYMBOLS.Ace,
    S_SYMBOLS.Wild,
    S_SYMBOLS.Airdrop,
    S_SYMBOLS.Unicorn,
    S_SYMBOLS.Lambo,
    S_SYMBOLS.Dao,
    S_SYMBOLS.Bonus
  ]

  const S_BASE_REELS = [
    [S_SYMBOLS.King    , S_SYMBOLS.King    , S_SYMBOLS.King    , S_SYMBOLS.Unicorn , S_SYMBOLS.Lambo]   ,
    [S_SYMBOLS.Ten     , S_SYMBOLS.Queen   , S_SYMBOLS.Queen   , S_SYMBOLS.Lambo   , S_SYMBOLS.Lambo]   ,
    [S_SYMBOLS.Jack    , S_SYMBOLS.Nine    , S_SYMBOLS.Jack    , S_SYMBOLS.Dao     , S_SYMBOLS.Dao]     ,
    [S_SYMBOLS.Nine    , S_SYMBOLS.Jack    , S_SYMBOLS.Airdrop , S_SYMBOLS.Airdrop , S_SYMBOLS.Airdrop] ,
    [S_SYMBOLS.Airdrop , S_SYMBOLS.Ace     , S_SYMBOLS.Wild    , S_SYMBOLS.Ace     , S_SYMBOLS.Ace]     ,
    [S_SYMBOLS.King    , S_SYMBOLS.King    , S_SYMBOLS.Wild    , S_SYMBOLS.Nine    , S_SYMBOLS.Nine]    ,
    [S_SYMBOLS.Nine    , S_SYMBOLS.Queen   , S_SYMBOLS.Wild    , S_SYMBOLS.Queen   , S_SYMBOLS.Queen]   ,
    [S_SYMBOLS.Jack    , S_SYMBOLS.Jack    , S_SYMBOLS.Jack    , S_SYMBOLS.Jack    , S_SYMBOLS.Jack]    ,
    [S_SYMBOLS.Ten     , S_SYMBOLS.Bonus   , S_SYMBOLS.Ten     , S_SYMBOLS.Ten     , S_SYMBOLS.Ten]     ,
    [S_SYMBOLS.Unicorn , S_SYMBOLS.Nine    , S_SYMBOLS.Nine    , S_SYMBOLS.Nine    , S_SYMBOLS.Nine]    ,
    [S_SYMBOLS.Dao     , S_SYMBOLS.Jack    , S_SYMBOLS.Unicorn , S_SYMBOLS.King    , S_SYMBOLS.Unicorn] ,
    [S_SYMBOLS.Queen   , S_SYMBOLS.Unicorn , S_SYMBOLS.Lambo   , S_SYMBOLS.Queen   , S_SYMBOLS.Lambo]   ,
    [S_SYMBOLS.Jack    , S_SYMBOLS.Nine    , S_SYMBOLS.Dao     , S_SYMBOLS.Jack    , S_SYMBOLS.Dao]     ,
    [S_SYMBOLS.Ace     , S_SYMBOLS.Jack    , S_SYMBOLS.Airdrop , S_SYMBOLS.Airdrop , S_SYMBOLS.Airdrop] ,
    [S_SYMBOLS.Airdrop , S_SYMBOLS.Ace     , S_SYMBOLS.Bonus   , S_SYMBOLS.Ace     , S_SYMBOLS.Ace]     ,
    [S_SYMBOLS.Dao     , S_SYMBOLS.King    , S_SYMBOLS.King    , S_SYMBOLS.King    , S_SYMBOLS.King]    ,
    [S_SYMBOLS.Queen   , S_SYMBOLS.Nine    , S_SYMBOLS.Nine    , S_SYMBOLS.Queen   , S_SYMBOLS.Queen]   ,
    [S_SYMBOLS.Jack    , S_SYMBOLS.Jack    , S_SYMBOLS.Jack    , S_SYMBOLS.Jack    , S_SYMBOLS.Jack]    ,
    [S_SYMBOLS.Ten     , S_SYMBOLS.Ten     , S_SYMBOLS.Ten     , S_SYMBOLS.Nine    , S_SYMBOLS.Ten]     ,
    [S_SYMBOLS.Nine    , S_SYMBOLS.Nine    , S_SYMBOLS.Nine    , S_SYMBOLS.Nine    , S_SYMBOLS.Bonus]   ,
    [S_SYMBOLS.Unicorn , S_SYMBOLS.Bonus   , S_SYMBOLS.Wild    , S_SYMBOLS.Wild    , S_SYMBOLS.Unicorn] ,
    [S_SYMBOLS.Lambo   , S_SYMBOLS.Queen   , S_SYMBOLS.Wild    , S_SYMBOLS.Wild    , S_SYMBOLS.Lambo]   ,
    [S_SYMBOLS.Dao     , S_SYMBOLS.Jack    , S_SYMBOLS.Wild    , S_SYMBOLS.Wild    , S_SYMBOLS.Dao]     ,
    [S_SYMBOLS.Bonus   , S_SYMBOLS.Ten     , S_SYMBOLS.Airdrop , S_SYMBOLS.Airdrop , S_SYMBOLS.Airdrop] ,
    [S_SYMBOLS.Queen   , S_SYMBOLS.Ace     , S_SYMBOLS.Bonus   , S_SYMBOLS.Ace     , S_SYMBOLS.Ace]     ,
    [S_SYMBOLS.King    , S_SYMBOLS.Bonus   , S_SYMBOLS.King    , S_SYMBOLS.King    , S_SYMBOLS.Wild]    ,
    [S_SYMBOLS.Airdrop , S_SYMBOLS.Queen   , S_SYMBOLS.Nine    , S_SYMBOLS.Queen   , S_SYMBOLS.Queen]   ,
    [S_SYMBOLS.Jack    , S_SYMBOLS.Jack    , S_SYMBOLS.Jack    , S_SYMBOLS.Jack    , S_SYMBOLS.Jack]    ,
    [S_SYMBOLS.Ten     , S_SYMBOLS.Ten     , S_SYMBOLS.Ten     , S_SYMBOLS.Ten     , S_SYMBOLS.Ten]     ,
    [S_SYMBOLS.Unicorn , S_SYMBOLS.Nine    , S_SYMBOLS.Nine    , S_SYMBOLS.Nine    , S_SYMBOLS.Nine]    ,
    [S_SYMBOLS.King    , S_SYMBOLS.Ten     , S_SYMBOLS.Bonus   , S_SYMBOLS.Wild    , S_SYMBOLS.Unicorn] ,
    [S_SYMBOLS.Unicorn , S_SYMBOLS.Jack    , S_SYMBOLS.Queen   , S_SYMBOLS.Wild    , S_SYMBOLS.Lambo]   ,
    [S_SYMBOLS.Jack    , S_SYMBOLS.Ten     , S_SYMBOLS.Jack    , S_SYMBOLS.Wild    , S_SYMBOLS.Dao]     ,
    [S_SYMBOLS.Nine    , S_SYMBOLS.Airdrop , S_SYMBOLS.Airdrop , S_SYMBOLS.Airdrop , S_SYMBOLS.Airdrop] ,
    [S_SYMBOLS.Wild    , S_SYMBOLS.Ace     , S_SYMBOLS.Ace     , S_SYMBOLS.Ace     , S_SYMBOLS.Ace]     ,
    [S_SYMBOLS.Unicorn , S_SYMBOLS.Wild    , S_SYMBOLS.King    , S_SYMBOLS.King    , S_SYMBOLS.Nine]    ,
    [S_SYMBOLS.Queen   , S_SYMBOLS.Wild    , S_SYMBOLS.Queen   , S_SYMBOLS.Queen   , S_SYMBOLS.Queen]   ,
    [S_SYMBOLS.Jack    , S_SYMBOLS.Wild    , S_SYMBOLS.Jack    , S_SYMBOLS.Jack    , S_SYMBOLS.Jack]    ,
    [S_SYMBOLS.Wild    , S_SYMBOLS.Ten     , S_SYMBOLS.Ten     , S_SYMBOLS.Ten     , S_SYMBOLS.Ten]     ,
    [S_SYMBOLS.Nine    , S_SYMBOLS.Nine    , S_SYMBOLS.Nine    , S_SYMBOLS.Nine    , S_SYMBOLS.Nine]    ,
    [S_SYMBOLS.Unicorn , S_SYMBOLS.Unicorn , S_SYMBOLS.Unicorn , S_SYMBOLS.Unicorn , S_SYMBOLS.Unicorn] ,
    [S_SYMBOLS.Lambo   , S_SYMBOLS.Lambo   , S_SYMBOLS.Lambo   , S_SYMBOLS.Lambo   , S_SYMBOLS.Lambo]   ,
    [S_SYMBOLS.Dao     , S_SYMBOLS.Dao     , S_SYMBOLS.Dao     , S_SYMBOLS.Dao     , S_SYMBOLS.Dao]     ,
    [S_SYMBOLS.Airdrop , S_SYMBOLS.Nine    , S_SYMBOLS.Airdrop , S_SYMBOLS.Airdrop , S_SYMBOLS.Airdrop] ,
    [S_SYMBOLS.Unicorn , S_SYMBOLS.Ace     , S_SYMBOLS.Ace     , S_SYMBOLS.Ace     , S_SYMBOLS.Ace]     ,
    [S_SYMBOLS.King    , S_SYMBOLS.Wild    , S_SYMBOLS.King    , S_SYMBOLS.King    , S_SYMBOLS.King]    ,
    [S_SYMBOLS.Queen   , S_SYMBOLS.Wild    , S_SYMBOLS.Queen   , S_SYMBOLS.Queen   , S_SYMBOLS.Queen]   ,
    [S_SYMBOLS.Wild    , S_SYMBOLS.Wild    , S_SYMBOLS.Jack    , S_SYMBOLS.Jack    , S_SYMBOLS.Jack]    ,
    [S_SYMBOLS.Ten     , S_SYMBOLS.Ten     , S_SYMBOLS.Ten     , S_SYMBOLS.Nine    , S_SYMBOLS.Ten]     ,
    [S_SYMBOLS.Nine    , S_SYMBOLS.Nine    , S_SYMBOLS.Nine    , S_SYMBOLS.Nine    , S_SYMBOLS.Nine]    ,
    [S_SYMBOLS.Unicorn , S_SYMBOLS.King    , S_SYMBOLS.Wild    , S_SYMBOLS.Wild    , S_SYMBOLS.Unicorn] ,
    [S_SYMBOLS.Lambo   , S_SYMBOLS.Queen   , S_SYMBOLS.Wild    , S_SYMBOLS.Wild    , S_SYMBOLS.Lambo]   ,
    [S_SYMBOLS.Dao     , S_SYMBOLS.Nine    , S_SYMBOLS.Wild    , S_SYMBOLS.Wild    , S_SYMBOLS.Dao]     ,
    [S_SYMBOLS.Airdrop , S_SYMBOLS.Airdrop , S_SYMBOLS.Airdrop , S_SYMBOLS.Airdrop , S_SYMBOLS.Bonus]   ,
    [S_SYMBOLS.Dao     , S_SYMBOLS.Ace     , S_SYMBOLS.Nine    , S_SYMBOLS.Ace     , S_SYMBOLS.Ace]     ,
    [S_SYMBOLS.King    , S_SYMBOLS.Wild    , S_SYMBOLS.King    , S_SYMBOLS.King    , S_SYMBOLS.Wild]    ,
    [S_SYMBOLS.Queen   , S_SYMBOLS.Wild    , S_SYMBOLS.Queen   , S_SYMBOLS.Bonus   , S_SYMBOLS.Queen]   ,
    [S_SYMBOLS.Jack    , S_SYMBOLS.Wild    , S_SYMBOLS.Jack    , S_SYMBOLS.Jack    , S_SYMBOLS.Nine]    ,
    [S_SYMBOLS.Unicorn , S_SYMBOLS.Ten     , S_SYMBOLS.Ten     , S_SYMBOLS.Ten     , S_SYMBOLS.Ten]     ,
    [S_SYMBOLS.Nine    , S_SYMBOLS.Nine    , S_SYMBOLS.Nine    , S_SYMBOLS.Nine    , S_SYMBOLS.Nine]    ,
    [S_SYMBOLS.King    , S_SYMBOLS.King    , S_SYMBOLS.Unicorn , S_SYMBOLS.Unicorn , S_SYMBOLS.Unicorn] ,
    [S_SYMBOLS.Unicorn , S_SYMBOLS.Bonus   , S_SYMBOLS.Lambo   , S_SYMBOLS.Lambo   , S_SYMBOLS.Lambo]   ,
    [S_SYMBOLS.Jack    , S_SYMBOLS.Jack    , S_SYMBOLS.Dao     , S_SYMBOLS.Dao     , S_SYMBOLS.Dao]     ,
    [S_SYMBOLS.Nine    , S_SYMBOLS.Unicorn , S_SYMBOLS.Airdrop , S_SYMBOLS.Bonus   , S_SYMBOLS.Airdrop] ,
    [S_SYMBOLS.Airdrop , S_SYMBOLS.Ace     , S_SYMBOLS.Ace     , S_SYMBOLS.Ace     , S_SYMBOLS.Ace]     ,
    [S_SYMBOLS.Unicorn , S_SYMBOLS.King    , S_SYMBOLS.King    , S_SYMBOLS.Wild    , S_SYMBOLS.Nine]    ,
    [S_SYMBOLS.Queen   , S_SYMBOLS.Nine    , S_SYMBOLS.Queen   , S_SYMBOLS.Wild    , S_SYMBOLS.Queen]   ,
    [S_SYMBOLS.Jack    , S_SYMBOLS.Unicorn , S_SYMBOLS.Jack    , S_SYMBOLS.Wild    , S_SYMBOLS.Jack]    ,
    [S_SYMBOLS.Bonus   , S_SYMBOLS.Ten     , S_SYMBOLS.Ten     , S_SYMBOLS.Ten     , S_SYMBOLS.Bonus]   ,
    [S_SYMBOLS.Nine    , S_SYMBOLS.Bonus   , S_SYMBOLS.Nine    , S_SYMBOLS.Nine    , S_SYMBOLS.Nine]    ,
    [S_SYMBOLS.Unicorn , S_SYMBOLS.Unicorn , S_SYMBOLS.Unicorn , S_SYMBOLS.Unicorn , S_SYMBOLS.Unicorn] ,
    [S_SYMBOLS.Lambo   , S_SYMBOLS.Lambo   , S_SYMBOLS.Lambo   , S_SYMBOLS.Lambo   , S_SYMBOLS.Lambo]   ,
    [S_SYMBOLS.Dao     , S_SYMBOLS.Dao     , S_SYMBOLS.Dao     , S_SYMBOLS.Dao     , S_SYMBOLS.Dao]     ,
    [S_SYMBOLS.Nine    , S_SYMBOLS.Nine    , S_SYMBOLS.Airdrop , S_SYMBOLS.Airdrop , S_SYMBOLS.Airdrop] ,
    [S_SYMBOLS.Airdrop , S_SYMBOLS.Ace     , S_SYMBOLS.Wild    , S_SYMBOLS.Bonus   , S_SYMBOLS.Ace]     ,
    [S_SYMBOLS.Unicorn , S_SYMBOLS.King    , S_SYMBOLS.Wild    , S_SYMBOLS.King    , S_SYMBOLS.Wild]    ,
    [S_SYMBOLS.Airdrop , S_SYMBOLS.Nine    , S_SYMBOLS.Wild    , S_SYMBOLS.Queen   , S_SYMBOLS.Queen]   ,
    [S_SYMBOLS.Jack    , S_SYMBOLS.Bonus   , S_SYMBOLS.Bonus   , S_SYMBOLS.Jack    , S_SYMBOLS.Jack]    ,
    [S_SYMBOLS.Unicorn , S_SYMBOLS.Ten     , S_SYMBOLS.Nine    , S_SYMBOLS.Ten     , S_SYMBOLS.Ten]     ,
    [S_SYMBOLS.Nine    , S_SYMBOLS.Nine    , S_SYMBOLS.Nine    , S_SYMBOLS.Nine    , S_SYMBOLS.Nine]
  ];

  const S_LINES = [
    [[1, 0], [1, 1], [1, 2], [1, 3], [1, 4]],
    [[0, 0], [0, 1], [0, 2], [0, 3], [0, 4]],
    [[2, 0], [2, 1], [2, 2], [2, 3], [2, 4]],
    [[0, 0], [1, 1], [2, 2], [1, 3], [0, 4]],
    [[2, 0], [1, 1], [0, 2], [1, 3], [2, 4]],
    [[0, 0], [0, 1], [1, 2], [2, 3], [2, 4]],
    [[2, 0], [2, 1], [1, 2], [0, 3], [0, 4]],
    [[1, 0], [2, 1], [2, 2], [2, 3], [1, 4]],
    [[1, 0], [0, 1], [0, 2], [0, 3], [1, 4]],
    [[0, 0], [1, 1], [1, 2], [1, 3], [0, 4]],
    [[2, 0], [1, 1], [1, 2], [1, 3], [2, 4]],
    [[1, 0], [0, 1], [1, 2], [2, 3], [1, 4]],
    [[1, 0], [2, 1], [1, 2], [0, 3], [1, 4]],
    [[0, 0], [1, 1], [0, 2], [1, 3], [0, 4]],
    [[2, 0], [1, 1], [2, 2], [1, 3], [2, 4]],
    [[1, 0], [1, 1], [2, 2], [1, 3], [1, 4]],
    [[1, 0], [1, 1], [0, 2], [1, 3], [1, 4]],
    [[0, 0], [2, 1], [0, 2], [2, 3], [0, 4]],
    [[2, 0], [0, 1], [2, 2], [0, 3], [2, 4]],
    [[1, 0], [0, 1], [2, 2], [0, 3], [1, 4]]
  ];

  const S_PAYTABLE = [
    [4   , 3   , 2]  ,
    [5   , 4   , 3]  ,
    [7   , 5   , 4]  ,
    [11  , 8   , 6]  ,
    [13  , 9   , 7]  ,
    [15  , 12  , 8]  ,
    [75  , 25  , 10] ,
    [100 , 35  , 15] ,
    [200 , 50  , 20] ,
    [250 , 60  , 25] ,
    [400 , 300 , 70]
  ];

  const S_BONUS = [
    [
      [3  , 2  , 2    , 4    , 4]    ,
      [12 , 15 , null , null , null] ,
      [20 , 23 , 25   , null , null]
    ],
    [
      [1  , 2  , 2    , 2    , 4]    ,
      [9  , 11 , 16   , null , null] ,
      [20 , 17 , null , null , null]
    ]
  ];


  class Slot {
    constructor() {
      this.lines = [0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19]
    }

    _getPaytableEntry(symbols, line) {
      let first = null;
      let count = 0;
      for(let i = 0; i < line.length; i++) {
        // ATTENTION: symbols contain columns, not rows!
        const row = line[i][1];
        const col = line[i][0];
        const current = symbols[row][col];

        if(current === S_SYMBOLS.Wild) {
          ++count;
          continue;
        }

        if(!first) {
          first = current;
          ++count;
          continue;
        }

        if(first === current) {
          ++count;
          continue;
        }

        break;
      }

      if(!first)
        first = S_SYMBOLS.Wild;

      if(first === S_SYMBOLS.Bonus)
        return null;

      if(count < 3)
        return null;

      return { symbol: first, count: count };
    }

    // 3, 4, or 5 bonus symbols anywhere on the reels start
    // the bonus with a multiplier of 1, 3 or 10 respectively
    _getBaseBonusMultiplier(symbols) {
      let count = 0;
      for(let col = 0; col < S_COLS; col++) {
        for(let row = 0; row < S_ROWS; row++) {
          if (symbols[col][row] === S_SYMBOLS.Bonus)
            ++count;
        }
      }

      if (count < 3)
        return 0;

      if (count < 4)
        return 1;

      if (count < 5)
        return 3;

      return 10;
    }

    _getFinalBonusMultiplier(bonus) {
      let result = 1;

      for (let i=0; i<bonus.length; i++) 
        result += bonus[i];
   
      return result;
    }

    // randoms - массив из 9 случайных чисел, порядок важен
    spin(bet, randoms) {
      const reels   = S_BASE_REELS;
      const offsets = randoms.slice(0,5)
      const symbols = [];

      for(let col = 0; col < S_COLS; col++) {
        const offset = offsets[col];
        let reel = [];
        for(let row = 0; row < S_ROWS; row++)
          reel.push(reels[(offset + row) % reels.length][col]);
        symbols.push(reel);
      }

      let winLines = [];
      let win = 0;

      for(let line = 0; line < this.lines.length; line++) {
        const entry = this._getPaytableEntry(symbols, S_LINES[this.lines[line]]);
        if(entry) {
          win += bet * S_PAYTABLE[entry.symbol][S_COLS - entry.count];
          winLines.push([line, entry.count]);
        }
      }

      let bonus = null;
      const bonusBaseMultiplier = this._getBaseBonusMultiplier(symbols);

      if(bonusBaseMultiplier) {
        const scenarioNumber  = randoms[6]
        const scenario        = S_BONUS[scenarioNumber];
        const scenarioOffsets = randoms.slice(-3)
        let results           = [];

        for(let i = 0; i < scenarioOffsets.length; i++) {
          const result = scenario[i][scenarioOffsets[i]];
          if(!result) 
            break;
          results.push(result);
        }

        const bonusFinalMultiplier = this._getFinalBonusMultiplier(results);

        bonus = {
          scenario        : scenario,
          results         : results,
          baseMultiplier  : bonusBaseMultiplier,
          finalMultiplier : bonusFinalMultiplier
        };

        win += bet * bonusBaseMultiplier * bonusFinalMultiplier;
      }

      return {symbols:symbols, winLines:winLines, win:win, bonus:bonus, offsets:offsets}
    }
  }

  let history = []
  const slotGame = new Slot()
  const Game = function(bet, rnd_hash){
    // Генерируем 9 случайных чисел из полученного хеша 
    let randoms = []
    
    const parts = DCLib.Utils.remove0x(rnd_hash).match(/.{1,6}/g)
    
    // 5 в диапазоне от 0 до 79 включительно  - по 1  на каждый reel
    randoms.push( DCLib.numFromHash(parts[0], 0, 79) )
    randoms.push( DCLib.numFromHash(parts[1], 0, 79) )
    randoms.push( DCLib.numFromHash(parts[2], 0, 79) )
    randoms.push( DCLib.numFromHash(parts[3], 0, 79) )
    randoms.push( DCLib.numFromHash(parts[4], 0, 79) )
    
    // 1 в диапазоне от 0 до 1 включительно  - для выбора сценария бонуса
    randoms.push( DCLib.numFromHash(parts[5], 0, 1) )

    // 3 в диапазоне от 0 до 4 включительно - для выбора результата раунда бонусной игры
    randoms.push( DCLib.numFromHash(parts[6], 0, 4) )
    randoms.push( DCLib.numFromHash(parts[7], 0, 4) )
    randoms.push( DCLib.numFromHash(parts[8], 0, 4) )
   
    let res = slotGame.spin(bet, randoms)

    this.payChannel.addTX(res.win)

    history.push(res)
    history.splice(-100)

    return res
  }

  return {
    Game    : Game,
    history : history
  }
})
